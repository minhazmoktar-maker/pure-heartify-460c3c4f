import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUp,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from "lucide-react";
import { useSupportAgent, type SupportMessage } from "@/hooks/useSupportAgent";
import { useLocale } from "@/contexts/LocaleContext";
import Logomark from "@/components/Logomark";
import { cn } from "@/lib/utils";

const STARTERS = [
  "I can't sign in to my account",
  "Why was my video removed?",
  "How do I turn on prayer reminders?",
  "How do I delete my account and data?",
  "Why does this video not play?",
  "What content is allowed on Heartify?",
];

function Avatar({ role }: { role: SupportMessage["role"] }) {
  if (role === "user") {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <UserRound aria-hidden className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
      <Logomark size={18} className="h-[18px] w-[18px]" title="Heartify assistant" />
    </span>
  );
}

/** Why an answer was wrong — kept short so it maps cleanly onto FAQ drafts. */
const WRONG_REASONS: { id: string; label: string }[] = [
  { id: "wrong_answer", label: "Answered the wrong thing" },
  { id: "incomplete", label: "Incomplete" },
  { id: "outdated", label: "Out of date" },
  { id: "not_my_language", label: "Wrong language" },
  { id: "needs_human", label: "I need a person" },
];

function FeedbackRow({
  messageId,
  onRate,
}: {
  messageId: string;
  onRate: (id: string, helpful: boolean, reason?: string) => Promise<boolean>;
}) {
  const [given, setGiven] = useState<null | boolean>(null);
  const [asking, setAsking] = useState(false);
  if (messageId.startsWith("local-")) return null;

  if (given !== null) {
    return (
      <p className="mt-2 text-micro text-muted-foreground" role="status">
        {given
          ? "Thank you — this helps us improve the answers."
          : "Thanks — we've logged this so a better answer gets written."}
      </p>
    );
  }

  if (asking) {
    return (
      <div className="mt-2 space-y-1.5">
        <p className="text-micro text-muted-foreground">What went wrong?</p>
        <div className="flex flex-wrap gap-1.5">
          {WRONG_REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={async () => { if (await onRate(messageId, false, r.id)) setGiven(false); }}
              className="min-h-11 rounded-full border border-border bg-background px-3 text-micro text-foreground transition-colors hover:bg-muted"
            >
              {r.label}
            </button>
          ))}
          <button
            type="button"
            onClick={async () => { if (await onRate(messageId, false)) setGiven(false); }}
            className="min-h-11 rounded-full px-3 text-micro text-muted-foreground underline transition-colors hover:text-foreground"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-1">
      <span className="text-micro text-muted-foreground">Was this helpful?</span>
      <button
        type="button"
        aria-label="This answer was helpful"
        onClick={async () => { if (await onRate(messageId, true)) setGiven(true); }}
        className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
      >
        <ThumbsUp aria-hidden className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="This answer was not helpful"
        onClick={() => setAsking(true)}
        className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
      >
        <ThumbsDown aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}


function Bubble({
  message,
  onRate,
  signedIn,
}: {
  message: SupportMessage;
  onRate: (id: string, helpful: boolean) => Promise<boolean>;
  signedIn: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <Avatar role={message.role} />
      <div className={cn("min-w-0 max-w-[85%] space-y-2", isUser && "text-right")}>
        <div
          className={cn(
            "inline-block rounded-card px-3.5 py-2.5 text-sm leading-relaxed",
            isUser ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground shadow-sm",
            message.failed && "border border-destructive/40 bg-destructive/5 text-foreground",
          )}
        >
          {message.pending ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              <span className="sr-only" role="status">Assistant is thinking</span>
              Thinking…
            </span>
          ) : (
            <span className="whitespace-pre-wrap">{message.content}</span>
          )}
        </div>

        {!isUser && !!message.actions?.length && (
          <div className="flex flex-wrap gap-2">
            {message.actions.map((a) => (
              <Link
                key={a.route}
                to={a.route}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-micro font-medium text-foreground transition-colors hover:bg-muted"
              >
                {a.label}
                <ExternalLink aria-hidden className="h-3 w-3" />
              </Link>
            ))}
          </div>
        )}

        {!isUser && !!message.sources?.length && (
          <p className="text-micro text-muted-foreground">
            Based on:{" "}
            {message.sources.map((s, i) => (
              <span key={s.slug}>
                {i > 0 && ", "}
                {s.url ? (
                  <Link to={s.url} className="underline decoration-dotted hover:text-foreground">
                    {s.title}
                  </Link>
                ) : (
                  s.title
                )}
              </span>
            ))}
          </p>
        )}

        {!isUser && message.escalated && (
          <p className="rounded-card bg-muted/60 px-3 py-2 text-micro text-muted-foreground">
            This one needs a person. Our team has been notified —{" "}
            <Link to="/contact" className="font-medium text-foreground underline">
              add details on the Contact page
            </Link>{" "}
            so they can reach you.
          </p>
        )}

        {!isUser && !message.pending && !message.failed && (
          <FeedbackRow messageId={message.id} onRate={onRate} signedIn={signedIn} />
        )}
      </div>
    </div>
  );
}

/**
 * The Help assistant conversation surface. Mobile-first: full-height column,
 * sticky composer above the safe area, 44px targets, and no layout shift when
 * answers stream in.
 */
export default function SupportChat() {
  const { locale } = useLocale();
  const { messages, sending, error, send, rate, reset, signedIn } = useSupportAgent(locale);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const starters = useMemo(() => STARTERS.slice(0, 6), []);
  const empty = messages.length === 0;

  return (
    <div className="flex min-h-[70dvh] flex-col">
      <div className="flex-1 space-y-4 pb-4" aria-live="polite">
        {empty ? (
          <div className="space-y-5 py-4">
            <div className="flex items-start gap-3 rounded-card bg-card p-4 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Sparkles aria-hidden className="h-4 w-4 text-primary" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Ask the Help assistant</p>
                <p className="text-sm text-muted-foreground">
                  It answers from Heartify's own help articles and policies — your account, content rules,
                  playback, reminders, privacy and more. If it can't resolve something, it hands you to our team.
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-2 text-micro font-semibold uppercase tracking-wide text-muted-foreground">
                Common questions
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {starters.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="min-h-11 rounded-card border border-border bg-background px-3.5 py-2.5 text-start text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <p className="flex items-start gap-2 text-micro text-muted-foreground">
              <ShieldCheck aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Never share your password, a one-time code, or card details here. The assistant will never ask for them.
            </p>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <Bubble key={m.id} message={m} onRate={rate} signedIn={signedIn} />
            ))}
            <div ref={endRef} />
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="mb-2 rounded-card border border-destructive/40 bg-destructive/5 px-3 py-2 text-micro text-foreground">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = draft;
          setDraft("");
          void send(text);
        }}
        className="sticky bottom-0 flex items-end gap-2 border-t border-border bg-background/95 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-3 backdrop-blur"
      >
        <label htmlFor="support-draft" className="sr-only">Describe your problem</label>
        <textarea
          id="support-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const text = draft;
              setDraft("");
              void send(text);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Describe your problem…"
          className="field-input max-h-32 min-h-11 w-full resize-y"
        />
        {!empty && (
          <button
            type="button"
            onClick={reset}
            aria-label="Start a new conversation"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw aria-hidden className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
        >
          {sending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <ArrowUp aria-hidden className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
