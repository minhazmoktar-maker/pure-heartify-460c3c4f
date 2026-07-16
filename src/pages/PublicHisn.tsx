import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import EmptyState from "@/components/EmptyState";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Share2, MessageCircleOff } from "lucide-react";
import { HISNUL_DUAS } from "@/data/hisnul";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

export default function PublicHisn() {
  const { id = "" } = useParams();
  const dua = HISNUL_DUAS.find((d) => d.id === id);
  const url = `${window.location.origin}/hisn/${id}`;

  const onShare = async () => {
    if (!dua) return;
    await shareContent({
      kind: "badge_earned",
      refId: `hisn:${dua.id}`,
      title: `${dua.title} — Heartify`,
      text: `🛡️ ${dua.title}\n${dua.translit}`,
      url,
    });
    await track("hisn.shared", { id: dua.id });
  };

  if (!dua) {
    return (
      <div className="min-h-dvh bg-background">
        <SEO type="article" title="Du'ā not found — Heartify" description="This du'ā could not be found." path={`/hisn/${id}`} />
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <EmptyState
            icon={MessageCircleOff}
            title="Du'ā not found"
            description="This du'ā could not be found. Open Ḥiṣnul-Muslim to find authentic supplications for every moment."
            actionLabel="Open the Fortress"
            actionHref="/hisnul"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        type="article"
        title={`${dua.title} — Heartify`}
        description={`${dua.title}: ${dua.english}`}
        path={`/hisn/${dua.id}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="flex items-center justify-between text-micro uppercase tracking-widest text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" /> Hisn al-Muslim
              </span>
              {dua.count && <span>Repeat × {dua.count}</span>}
            </div>
            <h1 className="text-title md:text-title font-semibold">{dua.title}</h1>
            <p dir="rtl" lang="ar" className="text-title md:text-title leading-loose text-right" style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}>
              {dua.arabic}
            </p>
            <p className="text-base italic text-foreground/80">{dua.translit}</p>
            <p className="text-base leading-relaxed text-muted-foreground border-l-2 border-primary/40 pl-4">
              {dua.english}
            </p>
            <p className="text-micro text-muted-foreground">{dua.ref}</p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg"><Link to="/hisnul">Open the Fortress</Link></Button>
          <Button variant="outline" onClick={onShare}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
          <Button asChild variant="ghost"><Link to="/signup">Join Heartify</Link></Button>
        </div>
      </main>
    </div>
  );
}
