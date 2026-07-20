// Creator "Claim your channel" — funnel entry for scholars/institutions who
// discover their content on Heartify. Shows live stats (approved status,
// videos in pool, average trust) when the channel is already indexed, and
// captures a claim request into `contact_messages` (kind='channel_claim').

import { useMemo, useState } from "react";
import { ArrowLeft, Loader2, ShieldCheck, Youtube, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function normalizeHandle(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  // strip URL to bare @handle or channel id
  const m = t.match(/(?:youtube\.com\/)?(@[A-Za-z0-9._-]+|channel\/UC[\w-]{20,})/);
  if (m) return m[1].startsWith("channel/") ? m[1].slice(8) : m[1];
  if (t.startsWith("@") || t.startsWith("UC")) return t;
  return t;
}

interface Stats {
  approved: boolean;
  channelId?: string;
  videos: number;
  trust?: number | null;
}

export default function ClaimChannel() {
  const { user } = useAuth();
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [name, setName] = useState("");
  const [proof, setProof] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const normalized = useMemo(() => normalizeHandle(handle), [handle]);

  async function lookup() {
    if (!normalized) return;
    setChecking(true);
    setStats(null);
    try {
      const isChannelId = normalized.startsWith("UC");
      const base = supabase
        .from("approved_channels")
        .select("youtube_channel_id,consistency_score")
        .limit(1);
      const { data: ac } = isChannelId
        ? await base.eq("youtube_channel_id", normalized)
        : await base.or(`handle.eq.${normalized},handle.eq.${normalized.replace(/^@/, "")}`);
      const approved = !!(ac && ac.length);
      const channelId = ac?.[0]?.youtube_channel_id;
      const trust = ac?.[0]?.consistency_score ?? null;
      let videos = 0;
      if (channelId) {
        const { count } = await supabase
          .from("curated_videos")
          .select("id", { count: "exact", head: true })
          .eq("channel_id", channelId);
        videos = count ?? 0;
      }
      setStats({ approved, channelId, videos, trust });
    } catch {
      setStats({ approved: false, videos: 0 });
    } finally {
      setChecking(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!normalized || !email.trim() || !name.trim()) {
      toast.error("Fill in channel, name, and email");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("contact_messages").insert({
        user_id: user?.id ?? null,
        name: name.trim(),
        email: email.trim(),
        topic: "channel_claim",
        message: `Channel: ${normalized}\nProof / verification: ${proof || "(none provided)"}`,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Claim submitted — we'll email you within 3 business days");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit claim");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Claim your channel — Heartify for Creators"
        description="Are you the creator or institution behind a channel on Heartify? Claim it to unlock analytics, verified status, and revenue share."
        path="/claim-channel"
      />
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <header className="mt-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <h1 className="text-title font-bold">Claim your channel</h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            If you're the scholar, teacher, or institution behind a channel Heartify features,
            claim it to unlock analytics, verified status, and (soon) revenue share.
          </p>
        </header>

        <Card className="mt-6 p-5">
          <label className="text-sm font-medium">YouTube channel URL, handle, or ID</label>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <Youtube className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@YaqeenInstitute or youtube.com/@…"
                className="pl-9"
              />
            </div>
            <Button variant="outline" disabled={!normalized || checking} onClick={lookup}>
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Look up"}
            </Button>
          </div>

          {stats && (
            <div className="mt-4 rounded-card border border-border bg-background/50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={stats.approved ? "default" : "secondary"}>
                  {stats.approved ? "Approved on Heartify" : "Not yet approved"}
                </Badge>
                <Badge variant="outline">{stats.videos} videos in pool</Badge>
                {stats.trust != null && (
                  <Badge variant="outline">Trust {Math.round((stats.trust ?? 0) * 100)}%</Badge>
                )}
              </div>
              {!stats.approved && (
                <p className="mt-2 text-sm text-muted-foreground">
                  We haven't indexed this channel yet. Submitting a claim will fast-track it for moderator review.
                </p>
              )}
            </div>
          )}
        </Card>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Your name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="mt-1" required />
          </div>
          <div>
            <label className="text-sm font-medium">Contact email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1" required />
          </div>
          <div>
            <label className="text-sm font-medium">Proof of ownership</label>
            <Textarea
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              placeholder="Link to a video description, tweet, or website page that mentions Heartify — or an email from your channel's official address."
              rows={4}
              className="mt-1"
            />
            <p className="mt-1 text-micro text-muted-foreground">
              We verify ownership before granting creator access.
            </p>
          </div>
          <Button type="submit" disabled={submitting || submitted} className="w-full">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {submitted ? "Submitted — check your inbox" : "Submit claim"}
          </Button>
        </form>
      </div>
    </div>
  );
}
