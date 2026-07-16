import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Share2, ChevronLeft, ChevronRight, BookX } from "lucide-react";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export default function PublicSurah() {
  const { number = "1" } = useParams();
  const n = Math.max(1, Math.min(114, parseInt(number, 10) || 1));
  const [meta, setMeta] = useState<SurahMeta | null>(null);
  const [firstAyahs, setFirstAyahs] = useState<{ ar: string; en: string; num: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const [arRes, enRes] = await Promise.all([
          fetch(`https://api.alquran.cloud/v1/surah/${n}/quran-uthmani`),
          fetch(`https://api.alquran.cloud/v1/surah/${n}/en.sahih`),
        ]);
        const arBody = await arRes.json();
        const enBody = await enRes.json();
        if (!mounted) return;
        if (arBody.code !== 200 || enBody.code !== 200) {
          setNotFound(true);
        } else {
          const s = arBody.data;
          setMeta({
            number: s.number,
            name: s.name,
            englishName: s.englishName,
            englishNameTranslation: s.englishNameTranslation,
            numberOfAyahs: s.numberOfAyahs,
            revelationType: s.revelationType,
          });
          const arA = s.ayahs.slice(0, 5);
          const enA = enBody.data.ayahs.slice(0, 5);
          setFirstAyahs(arA.map((a: any, i: number) => ({ ar: a.text, en: enA[i]?.text ?? "", num: a.numberInSurah })));
        }
      } catch {
        if (mounted) setNotFound(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [n]);

  const prev = n > 1 ? n - 1 : null;
  const next = n < 114 ? n + 1 : null;
  const title = meta ? `Sūrah ${meta.englishName} (${meta.englishNameTranslation})` : `Sūrah ${n}`;
  const url = `${window.location.origin}/surah/${n}`;

  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `surah:${n}`,
      title: `${title} — Heartify`,
      text: meta ? `📖 ${title} · ${meta.numberOfAyahs} verses · ${meta.revelationType}` : title,
      url,
    });
    await track("surah.shared", { n });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        type="article"
        title={`${title} — Heartify`}
        description={meta ? `Read Sūrah ${meta.englishName} (${meta.englishNameTranslation}), ${meta.revelationType}, ${meta.numberOfAyahs} verses.` : `Sūrah ${n} of the Noble Qur'an.`}
        path={`/surah/${n}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        {loading ? (
          <PageSkeleton variant="detail" />
        ) : notFound || !meta ? (
          <EmptyState
            icon={BookX}
            title="Sūrah not found"
            description={`Sūrah ${n} could not be loaded. Return to the Qur'an index to pick another chapter.`}
            actionLabel="Browse the Qur'an"
            actionHref="/quran"
          />
        ) : (
          <>
            <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
              <CardContent className="pt-10 pb-10 space-y-4 text-center">
                <div className="inline-flex items-center gap-1.5 text-micro uppercase tracking-widest text-muted-foreground">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Sūrah {meta.number} of 114 · {meta.revelationType}
                </div>
                <p dir="rtl" lang="ar" className="text-display md:text-display text-primary" style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}>
                  {meta.name}
                </p>
                <h1 className="text-title md:text-display font-semibold">{meta.englishName}</h1>
                <p className="text-base text-muted-foreground">{meta.englishNameTranslation} · {meta.numberOfAyahs} verses</p>
              </CardContent>
            </Card>

            {firstAyahs.length > 0 && (
              <Card className="mt-6">
                <CardContent className="pt-6 space-y-5">
                  <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Opening verses</h2>
                  {firstAyahs.map((a) => (
                    <div key={a.num} className="space-y-2 border-b border-border/40 pb-4 last:border-none last:pb-0">
                      <p dir="rtl" lang="ar" className="text-title leading-loose text-right" style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}>
                        {a.ar}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <Link to={`/ayah/${n}/${a.num}`} className="hover:underline">{n}:{a.num}</Link> — {a.en}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg"><Link to={`/quran/${n}`}>Read full sūrah</Link></Button>
              <Button variant="outline" onClick={onShare}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
              <Button asChild variant="ghost"><Link to="/signup">Join Heartify</Link></Button>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Button asChild variant="ghost" size="sm" disabled={!prev}>
                <Link to={prev ? `/surah/${prev}` : "#"}><ChevronLeft className="h-4 w-4 mr-1" /> Previous sūrah</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" disabled={!next}>
                <Link to={next ? `/surah/${next}` : "#"}>Next sūrah <ChevronRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
