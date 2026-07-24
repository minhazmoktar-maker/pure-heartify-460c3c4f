import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Flame, Heart, Loader2, MessageCircle, Send, Share2, Sparkles, Trash2, Users } from "lucide-react";
import SocialProofChip from "@/components/SocialProofChip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import Navbar from "@/components/Navbar";
import SectionHeader from "@/components/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { shareContent } from "@/lib/share";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import ShareImageButton from "@/components/ShareImageButton";
import EmptyState from "@/components/EmptyState";
import PageSkeleton from "@/components/PageSkeleton";

type Dua = {
  id: string;
  user_id: string | null;
  body: string;
  is_anonymous: boolean;
  ameen_count: number;
  created_at: string;
};

export default function DuaWall() {
  const { user } = useAuth();
  const [duas, setDuas] = useState<Dua[]>([]);
  const [myAmeens, setMyAmeens] = useState<Set<string>>(new Set());
  const [myOwnIds, setMyOwnIds] = useState<Set<string>>(new Set());
  const [body, setBody] = useState("");
  const [anon, setAnon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [tab, setTab] = useState<"recent" | "trending">("recent");

  // "Trending" ranks du'as posted in the last 7 days by Ameen count, tiebreak
  // by recency. "Recent" preserves the RPC's newest-first order.
  const orderedDuas = useMemo(() => {
    if (tab === "recent") return duas;
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return [...duas]
      .filter((d) => new Date(d.created_at).getTime() >= cutoff)
      .sort((a, b) => {
        if (b.ameen_count !== a.ameen_count) return b.ameen_count - a.ameen_count;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [duas, tab]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_dua_wall", { _limit: 100 });
    if (error) toast.error(error.message);
    setDuas((data ?? []) as Dua[]);
    if (user) {
      const ids = ((data ?? []) as Dua[]).map((d) => d.id);
      if (ids.length) {
        const [{ data: mine }, { data: own }] = await Promise.all([
          supabase.from("dua_ameens").select("dua_id").eq("user_id", user.id).in("dua_id", ids),
          supabase.from("dua_requests").select("id").eq("user_id", user.id).in("id", ids),
        ]);
        setMyAmeens(new Set((mine ?? []).map((r) => r.dua_id)));
        setMyOwnIds(new Set((own ?? []).map((r) => r.id)));
      }
    } else {
      setMyAmeens(new Set());
      setMyOwnIds(new Set());
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const post = async () => {
    if (!user) return toast.error("Sign in to post a du'a");
    const text = body.trim();
    if (text.length < 3) return toast.error("Du'a is too short");
    setPosting(true);
    const { error } = await supabase.from("dua_requests").insert({ user_id: user.id, body: text, is_anonymous: anon });
    setPosting(false);
    if (error) return toast.error(error.message);
    setBody(""); setAnon(false);
    toast.success("Du'a posted — may Allah accept it");
    load();
  };

  const toggleAmeen = async (d: Dua) => {
    if (!user) return toast.error("Sign in to say Ameen");
    const has = myAmeens.has(d.id);
    // optimistic
    setMyAmeens((s) => { const n = new Set(s); has ? n.delete(d.id) : n.add(d.id); return n; });
    setDuas((arr) => arr.map((x) => x.id === d.id ? { ...x, ameen_count: x.ameen_count + (has ? -1 : 1) } : x));
    const { error } = has
      ? await supabase.from("dua_ameens").delete().eq("dua_id", d.id).eq("user_id", user.id)
      : await supabase.from("dua_ameens").insert({ dua_id: d.id, user_id: user.id });
    if (error) { toast.error(error.message); load(); }
  };

  const remove = async (d: Dua) => {
    if (!user || !myOwnIds.has(d.id)) return;
    const { error } = await supabase.from("dua_requests").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    setDuas((arr) => arr.filter((x) => x.id !== d.id));
    toast.success("Removed");
  };

  return (
    <div className="min-h-dvh bg-background">
      <Helmet>
        <title>Community Du'a Wall — Heartify</title>
        <meta name="description" content="Share du'a requests and say Ameen to lift each other in prayer." />
      </Helmet>
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 pb-24 pt-24">
        <SectionHeader
          as="h1"
          title="Du'a Wall"
          description="Share what you're praying for. Say Ameen to lift each other before Allah."
          icon={Users}
          className="mb-4"
        />

        {/* Social proof — surfaces today's activity so newcomers feel the ummah at work. */}
        {!loading && duas.length > 0 && (() => {
          const nowMs = Date.now();
          const dayMs = 24 * 60 * 60 * 1000;
          const todays = duas.filter((d) => nowMs - new Date(d.created_at).getTime() < dayMs);
          const totalAmeens = duas.reduce((sum, d) => sum + (d.ameen_count || 0), 0);
          const todayAmeens = todays.reduce((sum, d) => sum + (d.ameen_count || 0), 0);
          return (
            <div className="mb-4 flex flex-wrap gap-2">
              <SocialProofChip icon={Sparkles} tone="primary" label={`${todays.length} du'a${todays.length === 1 ? "" : "s"} today`} />
              <SocialProofChip icon={Heart} tone="success" label={`${todayAmeens.toLocaleString()} Ameens today`} />
              <SocialProofChip icon={MessageCircle} label={`${totalAmeens.toLocaleString()} Ameens all-time`} />
            </div>
          );
        })()}

        <Tabs value={tab} onValueChange={(v) => setTab(v as "recent" | "trending")} className="mb-4">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto">
            <TabsTrigger value="recent" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />Recent</TabsTrigger>
            <TabsTrigger value="trending" className="gap-1.5"><Flame className="h-3.5 w-3.5" />Trending</TabsTrigger>
          </TabsList>
        </Tabs>



        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Post a du'a</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!user ? (
              <div className="rounded-card border p-4 text-sm text-muted-foreground">
                <Link to="/login" className="text-primary underline">Sign in</Link> to post a du'a or say Ameen.
              </div>
            ) : (
              <>
                <Textarea
                  rows={3}
                  maxLength={1000}
                  placeholder="e.g. Please make du'a for my mother's health…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={anon} onCheckedChange={(v) => setAnon(!!v)} />
                    Post anonymously
                  </label>
                  <Button onClick={post} disabled={posting || body.trim().length < 3}>
                    {posting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Post du'a
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <PageSkeleton variant="list" className="max-w-none px-0" />
        ) : duas.length === 0 ? (
          <EmptyState icon={Heart} title="No du'as yet" description="Be the first to share a du'a and let the ummah say āmīn." />
        ) : (
          <ul className="space-y-3">
            {duas.map((d) => {
              const mine = myOwnIds.has(d.id);
              const said = myAmeens.has(d.id);
              return (
                <li key={d.id}>
                  <Card>
                    <CardContent className="space-y-3 py-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{d.body}</p>
                      <div className="flex items-center justify-between text-micro text-muted-foreground">
                        <span>{d.is_anonymous || !mine ? (d.is_anonymous ? "Anonymous" : "Community member") : "You"} · {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1">
                            <Heart className={`h-3 w-3 ${said ? "fill-primary text-primary" : ""}`} />
                            {d.ameen_count}
                          </Badge>
                          <Button size="sm" variant={said ? "default" : "outline"} onClick={() => toggleAmeen(d)}>
                            {said ? "Ameen ✓" : "Ameen"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="Share du'a"
                            onClick={() =>
                              shareContent({
                                kind: "dua",
                                refId: d.id,
                                title: "A du'a on Heartify",
                                text: d.body.slice(0, 140),
                                url: `${window.location.origin}/d/${d.id}`,
                              })
                            }
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          {mine && (
                            <Button size="sm" variant="ghost" onClick={() => remove(d)} aria-label="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <WhatsAppShareButton
                          message={`Please make du'a: ${d.body.slice(0, 200)}`}
                          url={`${window.location.origin}/d/${d.id}`}
                        />
                        <ShareImageButton
                          input={{
                            variant: "dua",
                            kicker: "A du'a on Heartify",
                            translation: d.body,
                            attribution: d.is_anonymous ? "— Anonymous" : "— Shared with the ummah",
                          }}
                          meta={{
                            title: "A du'a on Heartify",
                            text: d.body.slice(0, 140),
                            url: `${window.location.origin}/d/${d.id}`,
                          }}
                          label="Share as image"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
