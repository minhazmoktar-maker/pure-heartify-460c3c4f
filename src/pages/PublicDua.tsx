import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Heart, Loader2, Share2, Sparkles, MessageCircleOff } from "lucide-react";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import { formatDistanceToNow } from "date-fns";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";
import { toast } from "sonner";

interface PublicDua {
  id: string;
  body: string;
  is_anonymous: boolean;
  ameen_count: number;
  created_at: string;
  author_handle: string | null;
}

const FP_KEY = "heartify.anon.fp";
function getFingerprint(): string {
  try {
    let fp = localStorage.getItem(FP_KEY);
    if (!fp) {
      fp = crypto.randomUUID().replace(/-/g, "") + Date.now().toString(36);
      localStorage.setItem(FP_KEY, fp);
    }
    return fp;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2, 18) + Date.now().toString(36);
  }
}

function ameenedKey(id: string) { return `heartify.ameened.${id}`; }

export default function PublicDuaPage() {
  const { id } = useParams<{ id: string }>();
  const [dua, setDua] = useState<PublicDua | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [ameened, setAmeened] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data, error } = await supabase.rpc("get_public_dua", { _id: id });
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setNotFound(true);
      } else {
        setDua(Array.isArray(data) ? (data[0] as PublicDua) : (data as PublicDua));
      }
      try { setAmeened(!!localStorage.getItem(ameenedKey(id))); } catch { /* noop */ }
      setLoading(false);
    })();
  }, [id]);

  const url = typeof window !== "undefined" ? `${window.location.origin}/d/${id}` : "";

  const onShare = async () => {
    if (!dua) return;
    await shareContent({
      kind: "dua",
      refId: dua.id,
      title: `Say Āmīn to this du'a · Heartify`,
      text: `🤲 ${dua.body.slice(0, 140)}${dua.body.length > 140 ? "…" : ""}\nSay Āmīn:`,
      url,
    });
    await track("dua.shared", { id: dua.id, ameened });
  };

  const onAmeen = async () => {
    if (!dua || ameened || busy) return;
    setBusy(true);
    // optimistic
    setDua({ ...dua, ameen_count: dua.ameen_count + 1 });
    setAmeened(true);
    try { localStorage.setItem(ameenedKey(dua.id), "1"); } catch { /* noop */ }
    const fp = getFingerprint();
    const { data, error } = await supabase.rpc("add_anon_ameen", { _dua_id: dua.id, _fp: fp });
    if (error) {
      // rollback
      setDua((d) => (d ? { ...d, ameen_count: Math.max(0, d.ameen_count - 1) } : d));
      setAmeened(false);
      try { localStorage.removeItem(ameenedKey(dua.id)); } catch { /* noop */ }
      toast.error("Could not record your Āmīn. Please try again.");
    } else if (typeof data === "number") {
      setDua((d) => (d ? { ...d, ameen_count: data } : d));
      await track("dua.ameen_anon", { id: dua.id });
      toast.success("Āmīn 🤲 — share so more can join");
      // auto-open share sheet on mobile natives; harmless on desktop
      setTimeout(() => { onShare(); }, 350);
    }
    setBusy(false);
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        type="article"
        title={dua ? `Say Āmīn to this du'a · Heartify` : "Du'a — Heartify"}
        description={dua ? dua.body.slice(0, 150) : "Community du'a on Heartify."}
        path={`/d/${id ?? ""}`}
      />
      <main className="container mx-auto max-w-xl px-4 py-16">
        {loading ? (
          <PageSkeleton variant="detail" />
        ) : notFound || !dua ? (
          <EmptyState
            icon={MessageCircleOff}
            title="Du'a not found"
            description="This du'a may have been removed by its author. Open the community wall to add your Āmīn to other supplications."
            actionLabel="Open Du'a Wall"
            actionHref="/dua-wall"
          />
        ) : (
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardContent className="space-y-6 py-8">
              <p className="whitespace-pre-wrap text-heading leading-relaxed text-foreground">{dua.body}</p>

              <div className="flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
                <span>
                  {dua.is_anonymous ? "Anonymous" : dua.author_handle ? `@${dua.author_handle}` : "Community member"}
                  {" · "}{formatDistanceToNow(new Date(dua.created_at), { addSuffix: true })}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <Heart className={`h-4 w-4 ${ameened ? "fill-primary text-primary" : "text-primary"}`} aria-hidden />
                  {dua.ameen_count.toLocaleString()}
                </span>
              </div>

              <div className="rounded-card border border-primary/30 bg-primary/5 p-4 text-center space-y-3">
                <div className="text-sm text-muted-foreground inline-flex items-center gap-1.5 justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {dua.ameen_count === 0
                    ? "Be the first to say Āmīn"
                    : `${dua.ameen_count.toLocaleString()} ${dua.ameen_count === 1 ? "person has" : "people have"} said Āmīn`}
                </div>
                <Button
                  onClick={onAmeen}
                  disabled={ameened || busy}
                  size="lg"
                  className="w-full text-heading h-14"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : ameened ? "Āmīn 🤲 recorded" : "🤲 Say Āmīn"}
                </Button>
                {ameened && (
                  <p className="text-micro text-muted-foreground">
                    Share so more brothers &amp; sisters can say Āmīn — every share may bring reward.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={onShare} className="flex-1" variant={ameened ? "default" : "outline"}>
                  <Share2 className="h-4 w-4 mr-2" /> Share this du'a
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/signup">Post your own du'a</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
