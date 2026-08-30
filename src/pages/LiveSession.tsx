import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Radio, Send, Users, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  useLiveSession,
  useLiveMessages,
  useSendLiveMessage,
  useJoinLiveSession,
  useLeaveLiveSession,
} from "@/hooks/useLiveSessions";

const KIND_LABEL: Record<string, string> = {
  study_circle: "Study circle",
  qa: "Live Q&A",
  watch_party: "Watch party",
};

export default function LiveSession() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: session, isLoading } = useLiveSession(id);
  const { data: messages } = useLiveMessages(id);
  const send = useSendLiveMessage(id);
  const join = useJoinLiveSession();
  const leave = useLeaveLiveSession();
  const [body, setBody] = useState("");
  const [asQuestion, setAsQuestion] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Realtime chat — one channel per session, torn down on unmount.
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`live-session-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_session_messages",
          filter: `session_id=eq.${id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["live-messages", id] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_session_participants",
          filter: `session_id=eq.${id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["live-session", id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <main className="mx-auto max-w-[820px] px-4 py-8 md:px-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <main className="mx-auto max-w-[720px] px-4 py-16 text-center md:px-6">
          <h1 className="text-2xl font-semibold text-foreground">Session not found</h1>
          <Link
            to="/live"
            className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Back to live sessions
          </Link>
        </main>
      </div>
    );
  }

  function submit() {
    const text = body.trim();
    if (!text) return;
    send.mutate(
      { body: text, isQuestion: asQuestion },
      {
        onSuccess: () => setBody(""),
        onError: () => toast.error("Join the session to post"),
      },
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title={`${session.title} — Heartify Live`}
        description={session.description ?? "A live Heartify learning session."}
        path={`/live/${session.id}`}
      />
      <Navbar />
      <main className="mx-auto flex max-w-[820px] flex-col px-4 pb-28 pt-6 md:px-6 md:pt-10">
        <nav aria-label="Breadcrumb" className="text-micro text-muted-foreground">
          <Link to="/live" className="hover:text-foreground">
            Live
          </Link>
          <span className="px-1.5">/</span>
          <span>{KIND_LABEL[session.kind] ?? session.kind}</span>
        </nav>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {session.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-micro text-muted-foreground">
          {session.status === "live" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
              <Radio className="h-3 w-3" aria-hidden /> Live now
            </span>
          ) : (
            <span>{new Date(session.scheduled_at).toLocaleString()}</span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {session.participant_count}/{session.max_participants}
          </span>
        </div>
        {session.description ? (
          <p className="mt-3 text-sm text-muted-foreground">{session.description}</p>
        ) : null}

        {session.video_id ? (
          <Link
            to={`/watch/${session.video_id}`}
            className="mt-4 inline-flex min-h-[44px] w-fit items-center rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground"
          >
            Open the session video
          </Link>
        ) : null}

        {user ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              className="min-h-[44px] rounded-full"
              disabled={join.isPending}
              onClick={() =>
                join.mutate(session.id, {
                  onSuccess: () => toast.success("You're in"),
                  onError: (e) =>
                    toast.error(e.message === "full" ? "This session is full" : "Could not join"),
                })
              }
            >
              Join session
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] rounded-full"
              disabled={leave.isPending}
              onClick={() => leave.mutate(session.id)}
            >
              Leave
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            <Link to="/auth" className="underline">
              Sign in
            </Link>{" "}
            to join the conversation.
          </p>
        )}

        <section aria-label="Session conversation" className="mt-6">
          <div className="max-h-[52vh] space-y-2 overflow-y-auto rounded-2xl border border-border bg-card p-3">
            {(messages ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No messages yet — say salaam.
              </p>
            ) : (
              (messages ?? []).map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    m.is_question ? "bg-primary/10 text-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  {m.is_question ? (
                    <span className="me-1 inline-flex align-middle text-primary">
                      <HelpCircle className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  ) : null}
                  <span className="break-words">{m.body}</span>
                  <span className="ms-2 text-micro text-muted-foreground">
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          {user ? (
            <form
              className="mt-3 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <Input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={asQuestion ? "Ask a question…" : "Write a message…"}
                aria-label="Message"
                maxLength={1000}
              />
              <Button
                type="button"
                variant={asQuestion ? "default" : "outline"}
                aria-pressed={asQuestion}
                aria-label="Send as question"
                className="h-11 w-11 shrink-0 rounded-full p-0"
                onClick={() => setAsQuestion((v) => !v)}
              >
                <HelpCircle className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                type="submit"
                aria-label="Send"
                className="h-11 w-11 shrink-0 rounded-full p-0"
                disabled={send.isPending || !body.trim()}
              >
                <Send className="h-4 w-4" aria-hidden />
              </Button>
            </form>
          ) : null}
        </section>
      </main>
    </div>
  );
}
