import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollText, Share2 } from "lucide-react";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

const COLLECTIONS: Record<string, { slug: string; label: string }> = {
  bukhari: { slug: "bukhari", label: "Sahih al-Bukhari" },
  muslim: { slug: "muslim", label: "Sahih Muslim" },
  abudawud: { slug: "abudawud", label: "Sunan Abi Dawud" },
  tirmidhi: { slug: "tirmidhi", label: "Jami' at-Tirmidhi" },
  nasai: { slug: "nasai", label: "Sunan an-Nasa'i" },
  ibnmajah: { slug: "ibnmajah", label: "Sunan Ibn Majah" },
  malik: { slug: "malik", label: "Muwatta Malik" },
  nawawi: { slug: "nawawi", label: "40 Hadith Nawawi" },
  qudsi: { slug: "qudsi", label: "40 Hadith Qudsi" },
};

interface HadithPayload {
  hadithnumber: number;
  arabicnumber?: number;
  text: string;
  grades?: { name: string; grade: string }[];
}

async function fetchEdition(edition: string, number: number): Promise<HadithPayload | null> {
  try {
    const res = await fetch(
      `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${edition}/${number}.min.json`
    );
    if (!res.ok) return null;
    const body = await res.json();
    const h = body?.hadiths?.[0];
    return h ? (h as HadithPayload) : null;
  } catch {
    return null;
  }
}

export default function PublicHadith() {
  const { collection = "bukhari", number = "1" } = useParams();
  const col = COLLECTIONS[collection.toLowerCase()] ?? COLLECTIONS.bukhari;
  const num = Math.max(1, parseInt(number, 10) || 1);
  const [arabic, setArabic] = useState<HadithPayload | null>(null);
  const [english, setEnglish] = useState<HadithPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setNotFound(false);
      const [ar, en] = await Promise.all([
        fetchEdition(`ara-${col.slug}`, num),
        fetchEdition(`eng-${col.slug}`, num),
      ]);
      if (!mounted) return;
      if (!ar && !en) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setArabic(ar);
      setEnglish(en);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [col.slug, num]);

  const ref = `${col.label} ${num}`;
  const excerpt = english?.text ? english.text.replace(/\s+/g, " ").slice(0, 140) : "A hadith from the Sunnah";
  const url = `${window.location.origin}/hadith/${col.slug}/${num}`;

  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `${col.slug}:${num}`,
      title: `${ref} — Heartify`,
      text: `📜 ${ref}: "${excerpt}${excerpt.length >= 140 ? "…" : ""}"`,
      url,
    });
    await track("hadith.shared", { collection: col.slug, number: num });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title={`${ref} — Heartify`}
        description={`${ref}: ${excerpt}${excerpt.length >= 140 ? "…" : ""}`}
        path={`/hadith/${col.slug}/${num}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : notFound ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <h1 className="text-xl font-semibold">Hadith not found</h1>
              <p className="text-sm text-muted-foreground">
                {col.label} #{num} could not be loaded.
              </p>
              <Button asChild variant="outline">
                <Link to="/hadith">Browse the Hadith library</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
              <CardContent className="pt-8 pb-8 space-y-6">
                <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <ScrollText className="h-4 w-4 text-primary" />
                    {col.label} · #{num}
                  </span>
                  {english?.grades?.[0]?.grade && (
                    <span className="normal-case tracking-normal text-primary/80">
                      {english.grades[0].grade}
                    </span>
                  )}
                </div>

                {arabic?.text && (
                  <p
                    dir="rtl"
                    lang="ar"
                    className="text-2xl md:text-3xl leading-loose text-right"
                    style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
                  >
                    {arabic.text}
                  </p>
                )}

                {english?.text && (
                  <p className="text-base md:text-lg leading-relaxed text-muted-foreground border-l-2 border-primary/40 pl-4 whitespace-pre-line">
                    {english.text}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/hadith">Read more hadith</Link>
              </Button>
              <Button variant="outline" onClick={onShare}>
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
              <Button asChild variant="ghost">
                <Link to="/signup">Join Heartify</Link>
              </Button>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Source: fawazahmed0/hadith-api (public domain compilation)
            </p>
          </>
        )}
      </main>
    </div>
  );
}
