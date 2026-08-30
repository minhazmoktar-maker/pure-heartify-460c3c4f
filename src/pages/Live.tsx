import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users, Radio, MessageCircleQuestion, PlayCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useLiveSessions,
  useJoinLiveSession,
  useCreateLiveSession,
  type LiveKind,
} from "@/hooks/useLiveSessions";

const KINDS: { id: LiveKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "study_circle", label: "Study circles" },
  { id: "qa", label: "Live Q&A" },
  { id: "watch_party", label: "Watch parties" },
];

function KindIcon({ kind }: { kind: string }) {
  if (kind === "qa") return <MessageCircleQuestion className="h-4 w-4" aria-hidden />;
  if (kind === "watch_party") return <PlayCircle className="h-4 w-4" aria-hidden />;
  return <Users className="h-4 w-4" aria-hidden />;
}

export default function Live() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<LiveKind | "all">("all");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<LiveKind>("study_circle");
  const [when, setWhen] = useState("");

  const { data, isLoading } = useLiveSessions(filter === "all" ? undefined : filter);
  const join = useJoinLiveSession();
  const create = useCreateLiveSession();

  const sessions = data ?? [];

  function submit() {
    if (!title.trim()) {
      toast.error("Give your session a title");
      return;
    }
    create.mutate(
      {
        title: title.trim(),
        kind,
        description: description.trim() || undefined,
        scheduledAt: when ? new Date(when).toISOString() : new Date().toISOString(),
      },
      {
        onSuccess: () => {
          toast.success("Session created");
          setCreating(false);
          setTitle("");
          setDescription("");
          setWhen("");
        },
        onError: () => toast.error("Could not create the session"),
      },
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Live study circles and Q&A — Heartify"
        description="Join live study circles, scholar Q&A sessions, and watch parties with the Heartify community."
        path="/live"
      />
      <Navbar />
      <main className="mx-auto max-w-[820px] px-4 pb-28 pt-6 md:px-6 md:pt-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Live together</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
          Study circles, scholar Q&amp;A, and watch parties — learn with others, in real time.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setFilter(k.id)}
              aria-pressed={filter === k.id}
              className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-medium transition-colors ${
                filter === k.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {k.label}
            </button>
          ))}
          {user ? (
            <Button
              type="button"
              variant="outline"
              className="ms-auto min-h-[44px] rounded-full"
              onClick={() => setCreating((v) => !v)}
            >
              <Plus className="me-1 h-4 w-4" aria-hidden />
              Host a session
            </Button>
          ) : null}
        </div>

        {creating ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Session title"
              aria-label="Session title"
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will you cover?"
              aria-label="Session description"
              rows={3}
            />
            <div className="flex flex-wrap gap-2">
              {(["study_circle", "qa", "watch_party"] as LiveKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  aria-pressed={kind === k}
                  className={`inline-flex min-h-[44px] items-center gap-1 rounded-full px-4 text-sm ${
                    kind === k ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  <KindIcon kind={k} />
                  {KINDS.find((x) => x.id === k)?.label}
                </button>
              ))}
            </div>
            <Input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              aria-label="Scheduled time"
            />
            <Button
              type="button"
              className="min-h-[44px] w-full rounded-full"
              onClick={submit}
              disabled={create.isPending}
            >
              {create.isPending ? "Creating…" : "Create session"}
            </Button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-center">
            <Radio className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-sm text-muted-foreground">
              No sessions scheduled yet.{" "}
              {user ? "Host the first one." : (
                <Link to="/auth" className="underline">
                  Sign in
                </Link>
              )}
            </p>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {sessions.map((s) => (
              <li key={s.id}>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2 text-micro text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                      <KindIcon kind={s.kind} />
                      {KINDS.find((k) => k.id === s.kind)?.label}
                    </span>
                    {s.status === "live" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                        <Radio className="h-3 w-3" aria-hidden />
                        Live now
                      </span>
                    ) : (
                      <span>{new Date(s.scheduled_at).toLocaleString()}</span>
                    )}
                    <span>
                      {s.participant_count}/{s.max_participants} joined
                    </span>
                  </div>
                  <h2 className="mt-2 text-base font-semibold text-foreground">{s.title}</h2>
                  {s.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      to={`/live/${s.id}`}
                      className="inline-flex min-h-[44px] items-center rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground"
                    >
                      Open session
                    </Link>
                    {!s.is_joined && user ? (
                      <Button
                        type="button"
                        className="min-h-[44px] rounded-full"
                        disabled={join.isPending}
                        onClick={() =>
                          join.mutate(s.id, {
                            onSuccess: () => toast.success("You're in"),
                            onError: (e) =>
                              toast.error(
                                e.message === "full" ? "This session is full" : "Could not join",
                              ),
                          })
                        }
                      >
                        Join
                      </Button>
                    ) : null}
                    {s.host_name ? (
                      <span className="text-micro text-muted-foreground">
                        Hosted by {s.host_name}
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
