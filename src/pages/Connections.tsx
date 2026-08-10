import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Swords, UserPlus, Users, Trophy, Loader2, Flame, AlertTriangle } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import EmptyState from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import MemberAvatar from "@/components/social/MemberAvatar";
import ConnectionCard from "@/components/social/ConnectionCard";
import SearchUserCard from "@/components/social/SearchUserCard";
import ChallengeCard from "@/components/social/ChallengeCard";
import CreateChallengeDialog from "@/components/social/CreateChallengeDialog";
import ReportUserDialog from "@/components/social/ReportUserDialog";
import {
  useChallenges,
  useConnections,
  useDebounced,
  useFriendsLeaderboard,
  useMyProgress,
  useUserSearch,
} from "@/hooks/useSocial";

type Metric = "minutes" | "doses" | "days" | "streak";

const METRICS: { id: Metric; label: string; unit: string }[] = [
  { id: "minutes", label: "Minutes", unit: "min" },
  { id: "doses", label: "Daily Doses", unit: "doses" },
  { id: "days", label: "Learning days", unit: "days" },
  { id: "streak", label: "Streak", unit: "days" },
];

/**
 * Heartify Connections & Accountability.
 *
 * Intentionally NOT a social feed: no posts, no likes, no follower counts,
 * no infinite scroll. Four calm tabs — your circle, requests, challenges,
 * and a private friends leaderboard.
 */
export default function Connections() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "circle";
  const setTab = (t: string) => setParams((p) => {
    const next = new URLSearchParams(p);
    next.set("tab", t);
    return next;
  }, { replace: true });

  const {
    connections,
    loadingConnections,
    connectionsError,
    refetchConnections,
    incoming,
    outgoing,
    loadingRequests,
    requestsError,
    refetchRequests,
    sendRequest,
    respond,
    remove,
    blockUser,
  } = useConnections();
  const {
    invites,
    active,
    finished,
    loading: loadingChallenges,
    error: challengesError,
    refetch: refetchChallenges,
    respond: respondChallenge,
    leave,
  } = useChallenges();

  const { data: progress } = useMyProgress();

  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 300);
  const search = useUserSearch(debounced);

  const [metric, setMetric] = useState<Metric>("minutes");
  const leaderboard = useFriendsLeaderboard(metric);
  const metricMeta = METRICS.find((m) => m.id === metric)!;

  const [challengeOpen, setChallengeOpen] = useState(false);
  const [presetHandle, setPresetHandle] = useState<string | null>(null);
  const [reportHandle, setReportHandle] = useState<string | null>(null);

  const pendingCount = incoming.length + invites.length;
  const activeChallenges = useMemo(() => [...invites, ...active], [invites, active]);

  if (!user) {
    return (
      <div className="min-h-dvh bg-background">
        <SEO title="Your Circle — Heartify" description="Connect with friends and stay accountable on Heartify." path="/connections" />
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-12 md:px-6">
          <EmptyState
            icon={Users}
            title="Sign in to build your circle"
            description="Connect with friends, share verified progress, and keep each other consistent."
            actionLabel="Sign in"
            actionHref="/login"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Your Circle — Heartify"
        description="Connect with friends, run private accountability challenges, and stay consistent together on Heartify."
        path="/connections"
      />
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-6 pb-28 md:px-6 md:py-8">
        <header className="mb-5">
          <h1 className="flex items-center gap-2 text-title font-bold">
            <Users className="h-7 w-7 text-primary" aria-hidden />
            Your Circle
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A small, private circle for accountability — never a feed to scroll.
          </p>
        </header>

        {progress && (
          <Card className="mb-5">
            <CardContent className="grid grid-cols-4 gap-2 py-4 text-center">
              <Stat label="min today" value={progress.today.minutes} />
              <Stat label="min / week" value={progress.week.minutes} />
              <Stat label="doses / week" value={progress.week.doses} />
              <Stat label="day streak" value={progress.current_streak} />
            </CardContent>
          </Card>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="circle" className="min-h-11">Circle</TabsTrigger>
            <TabsTrigger value="requests" className="min-h-11 gap-1">
              Requests
              {pendingCount > 0 && <Badge className="h-4 px-1 text-[10px]">{pendingCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="challenges" className="min-h-11">Challenges</TabsTrigger>
            <TabsTrigger value="find" className="min-h-11">Find</TabsTrigger>
          </TabsList>

          {/* ---------------- Circle ---------------- */}
          <TabsContent value="circle" className="mt-4 space-y-4">
            {loadingConnections ? (
              <ListSkeleton />
            ) : connectionsError ? (
              <EmptyState
                icon={AlertTriangle}
                title="Couldn't load your circle"
                description="Check your connection and try again."
                actionLabel="Retry"
                onAction={() => void refetchConnections()}
              />
            ) : connections.length === 0 ? (

              <EmptyState
                icon={UserPlus}
                title="No connections yet"
                description="Consistency is easier with company. Find a friend by username and invite them to keep you accountable."
                actionLabel="Find friends"
                onAction={() => setTab("find")}
              />
            ) : (
              <>
                <div className="space-y-3">
                  {connections.map((row) => (
                    <ConnectionCard
                      key={row.connection_id}
                      row={row}
                      onRemove={() => remove.mutate(row.connection_id)}
                      onBlock={() => blockUser.mutate(row.user_handle)}
                      onReport={() => setReportHandle(row.user_handle)}
                      onChallenge={() => {
                        setPresetHandle(row.user_handle);
                        setChallengeOpen(true);
                      }}
                    />
                  ))}
                </div>

                <section className="pt-2">
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Trophy className="h-4 w-4 text-yellow-500" aria-hidden /> Friends leaderboard
                  </h2>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {METRICS.map((m) => (
                      <Button
                        key={m.id}
                        size="sm"
                        variant={metric === m.id ? "default" : "outline"}
                        className="min-h-11"
                        onClick={() => setMetric(m.id)}
                        aria-pressed={metric === m.id}
                      >
                        {m.label}
                      </Button>
                    ))}
                  </div>
                  <Card>
                    <CardContent className="py-3">
                      {leaderboard.isLoading ? (
                        <Skeleton className="h-24 w-full" />
                      ) : (leaderboard.data ?? []).length === 0 ? (
                        <p className="py-2 text-center text-sm text-muted-foreground">
                          Nobody in your circle shares progress yet.
                        </p>
                      ) : (
                        <ol className="divide-y">
                          {(leaderboard.data ?? []).map((r, i) => (
                            <li key={r.user_handle} className="flex items-center gap-3 py-2">
                              <span className="w-5 shrink-0 text-center font-mono text-micro text-muted-foreground">
                                {i + 1}
                              </span>
                              <MemberAvatar url={r.avatar_url} name={r.display_name || r.user_handle} size="sm" />
                              <span className={`min-w-0 flex-1 truncate text-sm ${r.is_me ? "font-semibold" : ""}`}>
                                {r.is_me ? "You" : r.display_name || `@${r.user_handle}`}
                              </span>
                              <span className="shrink-0 font-mono text-micro">
                                {r.score.toLocaleString()} {metricMeta.unit}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </CardContent>
                  </Card>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Ranked from verified Heartify activity. Only members who share progress appear here.
                  </p>
                </section>
              </>
            )}
          </TabsContent>

          {/* ---------------- Requests ---------------- */}
          <TabsContent value="requests" className="mt-4 space-y-5">
            {loadingRequests ? (
              <ListSkeleton />
            ) : requestsError ? (
              <EmptyState
                icon={AlertTriangle}
                title="Couldn't load requests"
                description="Check your connection and try again."
                actionLabel="Retry"
                onAction={() => void refetchRequests()}
              />
            ) : incoming.length === 0 && outgoing.length === 0 && invites.length === 0 ? (

              <EmptyState
                icon={UserPlus}
                title="No pending requests"
                description="When someone invites you to connect or join a challenge, it will appear here."
              />
            ) : (
              <>
                {invites.length > 0 && (
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Challenge invites
                    </h2>
                    {invites.map((c) => (
                      <ChallengeCard
                        key={c.id}
                        challenge={c}
                        onRespond={(accept) => respondChallenge.mutate({ id: c.id, accept })}
                      />
                    ))}
                  </section>
                )}

                {incoming.length > 0 && (
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Wants to connect
                    </h2>
                    {incoming.map((r) => (
                      <Card key={r.connection_id}>
                        <CardContent className="flex items-center gap-3 py-4">
                          <MemberAvatar url={r.avatar_url} name={r.display_name || r.user_handle} size="sm" />
                          <div className="min-w-0 flex-1">
                            <Link to={`/u/${r.user_handle}`} className="block truncate font-medium hover:underline">
                              {r.display_name || `@${r.user_handle}`}
                            </Link>
                            <p className="truncate font-mono text-micro text-muted-foreground">@{r.user_handle}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="min-h-11"
                              onClick={() => respond.mutate({ id: r.connection_id, accept: true })}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-11"
                              onClick={() => respond.mutate({ id: r.connection_id, accept: false })}
                            >
                              Decline
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </section>
                )}

                {outgoing.length > 0 && (
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sent</h2>
                    {outgoing.map((r) => (
                      <Card key={r.connection_id}>
                        <CardContent className="flex items-center gap-3 py-4">
                          <MemberAvatar url={r.avatar_url} name={r.display_name || r.user_handle} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{r.display_name || `@${r.user_handle}`}</p>
                            <p className="truncate font-mono text-micro text-muted-foreground">@{r.user_handle}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="min-h-11 text-muted-foreground"
                            onClick={() => respond.mutate({ id: r.connection_id, accept: false })}
                          >
                            Cancel
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </section>
                )}
              </>
            )}
          </TabsContent>

          {/* ---------------- Challenges ---------------- */}
          <TabsContent value="challenges" className="mt-4 space-y-4">
            <Button
              className="min-h-11 w-full gap-2"
              onClick={() => {
                setPresetHandle(null);
                setChallengeOpen(true);
              }}
            >
              <Swords className="h-4 w-4" aria-hidden /> Create a challenge
            </Button>

            {loadingChallenges ? (
              <ListSkeleton />
            ) : challengesError ? (
              <EmptyState
                icon={AlertTriangle}
                title="Couldn't load challenges"
                description="Check your connection and try again."
                actionLabel="Retry"
                onAction={() => void refetchChallenges()}
              />
            ) : activeChallenges.length === 0 && finished.length === 0 ? (

              <EmptyState
                icon={Swords}
                title="No challenges yet"
                description="Set a shared goal with a friend — Daily Doses, learning minutes, or learning days. Progress is measured automatically."
              />
            ) : (
              <>
                {activeChallenges.map((c) => (
                  <ChallengeCard
                    key={c.id}
                    challenge={c}
                    onRespond={c.my_state === "invited" ? (accept) => respondChallenge.mutate({ id: c.id, accept }) : undefined}
                    onLeave={() => leave.mutate(c.id)}
                  />
                ))}
                {finished.length > 0 && (
                  <section className="space-y-3 pt-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Finished</h2>
                    {finished.map((c) => (
                      <ChallengeCard key={c.id} challenge={c} />
                    ))}
                  </section>
                )}
              </>
            )}
          </TabsContent>

          {/* ---------------- Find ---------------- */}
          <TabsContent value="find" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or @username"
                aria-label="Search Heartify members"
                autoComplete="off"
                className="h-12 pl-9"
              />
              {search.isFetching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
              )}
            </div>

            {debounced.trim().length < 2 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters. Members who opted out of discovery won't appear.
              </p>
            ) : search.isError ? (
              <EmptyState
                icon={AlertTriangle}
                title="Search unavailable"
                description="Check your connection and try again."
                actionLabel="Retry"
                onAction={() => void search.refetch()}
              />
            ) : search.isLoading ? (
              <ListSkeleton />
            ) : (search.data ?? []).length === 0 ? (

              <EmptyState icon={Search} title="No members found" description="Try their exact username instead." />
            ) : (
              <div className="space-y-3">
                {(search.data ?? []).map((row) => (
                  <SearchUserCard
                    key={row.handle}
                    row={row}
                    pending={sendRequest.isPending}
                    onConnect={() => sendRequest.mutate(row.handle)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <Flame className="h-3 w-3 text-orange-500" aria-hidden />
          Heartify has no likes, followers, or public feeds. Your circle exists only to help you stay consistent.
        </p>
      </main>

      <CreateChallengeDialog
        open={challengeOpen}
        onOpenChange={setChallengeOpen}
        connections={connections}
        presetHandle={presetHandle}
      />
      <ReportUserDialog handle={reportHandle} open={!!reportHandle} onOpenChange={(v) => !v && setReportHandle(null)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-heading font-bold">{value.toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-card" />
      ))}
    </div>
  );
}
