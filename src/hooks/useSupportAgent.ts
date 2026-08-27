import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sanitizeActions, type SupportAction } from "@/lib/support/actions";
import { track } from "@/lib/analytics";

export interface SupportSource {
  slug: string;
  title: string;
  url?: string | null;
}

export interface SupportMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SupportSource[];
  actions?: SupportAction[];
  confidence?: number;
  grounded?: boolean;
  escalated?: boolean;
  pending?: boolean;
  failed?: boolean;
}

const ANON_KEY_STORAGE = "heartify.support.anonKey";
const CONV_STORAGE = "heartify.support.conversationId";

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode — the chat still works, it just won't resume */
  }
}

/** Opaque per-device key so signed-out visitors keep their own thread. */
function getAnonKey(): string {
  const existing = readStorage(ANON_KEY_STORAGE);
  if (existing && existing.length >= 8) return existing;
  const fresh = crypto.randomUUID().replace(/-/g, "");
  writeStorage(ANON_KEY_STORAGE, fresh);
  return fresh;
}

let uid = 0;
const nextId = () => `local-${++uid}`;

/**
 * Drives the Help assistant conversation: sends turns to the `support-agent`
 * edge function, keeps optimistic local state, and restores the last thread.
 */
export function useSupportAgent(locale = "en") {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationId = useRef<string | null>(null);
  const restored = useRef(false);

  // Resume an existing signed-in thread so context survives a reload.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const stored = readStorage(CONV_STORAGE);
    if (!stored || !user) return;
    conversationId.current = stored;
    (async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("id, role, content, sources, actions, confidence, grounded")
        .eq("conversation_id", stored)
        .order("created_at", { ascending: true })
        .limit(30);
      if (!data?.length) return;
      setMessages(
        data
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            sources: Array.isArray(m.sources) ? (m.sources as unknown as SupportSource[]) : [],
            actions: sanitizeActions(m.actions),
            confidence: m.confidence ?? undefined,
            grounded: m.grounded ?? undefined,
          })),
      );
    })();
  }, [user]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || sending) return;

      const optimisticId = nextId();
      const pendingId = nextId();
      setError(null);
      setSending(true);
      setMessages((prev) => [
        ...prev,
        { id: optimisticId, role: "user", content: question },
        { id: pendingId, role: "assistant", content: "", pending: true },
      ]);

      try {
        const { data, error: fnError } = await supabase.functions.invoke("support-agent", {
          body: {
            message: question,
            locale,
            conversation_id: conversationId.current ?? undefined,
            anon_key: user ? undefined : getAnonKey(),
          },
        });

        if (fnError) {
          // Read the real failure text — invoke() only reports "non-2xx".
          let detail = fnError.message;
          const ctx = (fnError as { context?: Response }).context;
          if (ctx && typeof ctx.text === "function") {
            try {
              const parsed = JSON.parse(await ctx.text());
              if (typeof parsed?.error === "string") detail = parsed.error;
            } catch {
              /* keep the generic message */
            }
          }
          throw new Error(detail);
        }

        const payload = data as {
          conversation_id?: string;
          message_id?: string;
          answer?: string;
          sources?: SupportSource[];
          actions?: unknown;
          confidence?: number;
          grounded?: boolean;
          escalated?: boolean;
          topic?: string;
        };

        if (payload?.conversation_id) {
          conversationId.current = payload.conversation_id;
          writeStorage(CONV_STORAGE, payload.conversation_id);
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? {
                  id: payload.message_id ?? pendingId,
                  role: "assistant",
                  content: payload.answer ?? "",
                  sources: Array.isArray(payload.sources) ? payload.sources : [],
                  actions: sanitizeActions(payload.actions),
                  confidence: payload.confidence,
                  grounded: payload.grounded,
                  escalated: payload.escalated,
                }
              : m,
          ),
        );

        void track("support_agent_answered", {
          topic: payload.topic ?? "other",
          grounded: !!payload.grounded,
          escalated: !!payload.escalated,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Something went wrong.";
        setError(message);
        setMessages((prev) =>
          prev.map((m) => (m.id === pendingId ? { ...m, pending: false, failed: true, content: message } : m)),
        );
      } finally {
        setSending(false);
      }
    },
    [locale, sending, user],
  );

  /**
   * Records whether an answer was right. A negative rating is a knowledge
   * signal: the backend opens a knowledge gap and queues a suggested FAQ draft
   * for that answer's category. Works for signed-out visitors too, scoped to
   * the device key that owns the thread.
   */
  const rate = useCallback(
    async (messageId: string, helpful: boolean, reason?: string) => {
      if (messageId.startsWith("local-")) return false;
      const { error: rpcError } = await supabase.rpc("support_feedback_submit", {
        p_message_id: messageId,
        p_helpful: helpful,
        p_reason: reason ?? null,
        p_comment: null,
        p_anon_key: user ? null : getAnonKey(),
      });
      if (rpcError) {
        console.warn("[support] feedback failed", rpcError.message);
        return false;
      }
      void track("support_agent_feedback", { helpful, reason: reason ?? "none" });
      return true;
    },
    [user],
  );


  const reset = useCallback(() => {
    conversationId.current = null;
    try {
      localStorage.removeItem(CONV_STORAGE);
    } catch {
      /* ignore */
    }
    setMessages([]);
    setError(null);
  }, []);

  return { messages, sending, error, send, rate, reset, signedIn: !!user };
}
