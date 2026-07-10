import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Heart, Loader2, Send, Share2, Trash2, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Navbar from "@/components/Navbar";
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
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Community Du'a Wall — Heartify</title>
        <meta name="description" content="Share du'a requests and say Ameen to lift each other in prayer." />
      </Helmet>
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 pb-24 pt-24">
        <header className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" /> Community</div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Du'a Wall</h1>
          <p className="mt-1 text-muted-foreground">Share what you're praying for. Say Ameen to lift each other before Allah.</p>
        </header>

        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Post a du'a</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!user ? (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">
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
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : duas.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No du'as yet — be the first to share.</CardContent></Card>
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
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
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
