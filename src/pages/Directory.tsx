import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ShieldCheck, GraduationCap, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import FollowButton from "@/components/FollowButton";
import { supabase } from "@/integrations/supabase/client";

interface DirectoryChannel {
  channel_id: string;
  title: string | null;
  handle: string | null;
  category: string | null;
  trust_tier: string | null;
  consistency_score: number | null;
  video_count: number;
  thumbnail_url: string | null;
}

const TIER_TONE: Record<string, string> = {
  A: "bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]",
  B: "bg-emerald-500/15 text-emerald-600",
  C: "bg-primary/10 text-primary",
};

/**
 * Public Muslim directory — every approved channel and teacher on Heartify,
 * with its review tier, how much reviewed material it has, and a one-tap
 * follow that turns on new-upload notifications.
 */
export default function Directory() {
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["directory-channels", q],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DirectoryChannel[]> => {
      const { data, error } = await supabase.rpc("list_directory_channels", {
        _q: q.trim() || null,
        _limit: 60,
        _offset: 0,
      });
      if (error) throw error;
      return (data as unknown as DirectoryChannel[]) ?? [];
    },
  });

  const channels = useMemo(() => data ?? [], [data]);

  return (
    <div className="min-h-dvh bg-background pb-28">
      <SEO
        title="Muslim Directory — Scholars & Halal Channels | Heartify"
        description="A directory of reviewed Islamic scholars and halal channels. See how each one was reviewed, follow them, and get notified when they publish something new."
        path="/directory"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Muslim directory of scholars and halal channels",
          url: "https://heartifyapp.com/directory",
          description:
            "Reviewed Islamic scholars and halal video channels on Heartify, with trust tiers and follow notifications.",
        }}
      />
      <Navbar />

      <header className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-[1100px] px-4 py-8 md:px-6">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" aria-hidden="true" />
            <h1 className="text-title font-bold">Muslim directory</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every teacher and channel whose material passed Heartify's review. Follow one
            and you'll be notified when it publishes something new — nothing else.
          </p>
          <div className="relative mt-5 max-w-xl">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search teachers and channels…"
              aria-label="Search the Muslim directory"
              className="ps-9"
            />
          </div>
          <nav className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link to="/scholars" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border/60 px-4 hover:bg-card">
              <GraduationCap className="h-4 w-4" aria-hidden="true" /> Classical scholars
            </Link>
            <Link to="/channel-trust" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border/60 px-4 hover:bg-card">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> How tiers are decided
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-4 py-8 md:px-6">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-card" />
            ))}
          </div>
        ) : channels.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teachers or channels match that search.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {channels.map((c) => (
              <li key={c.channel_id}>
                <Card className="flex h-full items-start gap-3 overflow-hidden p-4">
                  {c.thumbnail_url ? (
                    <img
                      src={c.thumbnail_url}
                      alt={`Latest reviewed video from ${c.title ?? "this channel"}`}
                      loading="lazy"
                      className="h-16 w-24 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="grid h-16 w-24 shrink-0 place-items-center rounded-md bg-muted">
                      <GraduationCap className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="truncate text-sm font-semibold text-foreground">
                        {c.title ?? c.handle ?? "Channel"}
                      </h2>
                      {c.trust_tier && (
                        <Badge className={TIER_TONE[c.trust_tier] ?? "bg-muted text-muted-foreground"}>
                          Tier {c.trust_tier}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[c.category, `${c.video_count} reviewed video${c.video_count === 1 ? "" : "s"}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="mt-3">
                      <FollowButton channelId={c.channel_id} channelTitle={c.title ?? undefined} />
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
