import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Sparkles, HeartHandshake, BookOpen } from "lucide-react";

const CANONICAL = "https://pure-heartify.lovable.app/digital-purification";

const STEPS = [
  {
    title: "1. Make a sincere intention (niyyah)",
    body: "The Prophet ﷺ said actions are by intentions (Bukhari). Frame this as an act of worship — you are protecting your heart, hearing, and sight, which are amanah from Allah. Say, quietly, that you are stopping haram content-consumption for His sake and no one else's.",
  },
  {
    title: "2. Delete the doorways, not just the content",
    body: "Uninstall the apps that repeatedly lead to lapses (short-form video apps, adult sites, algorithmic feeds). Sign out on every browser, revoke saved passwords, and enable a content-filter DNS such as CleanBrowsing or AdGuard family so the same doorway does not reopen at 2am.",
  },
  {
    title: "3. Replace, don't just remove",
    body: "The nafs cannot tolerate a vacuum. Load your phone home screen with halal alternatives — Heartify for video and audio, a Qur'an app, an Adhkar app, a hadith reader. Every time the old urge appears, the halal replacement should be one tap away.",
  },
  {
    title: "4. Rebuild wudu + salah as the anchor",
    body: "The five prayers act as a daily wash for the heart (Muslim). Pray on time, in a clean spot, with even two rak'ahs of qiyam al-layl if you can. Sins lose their taste when the tongue is heavy with dhikr and the forehead is regularly on the ground.",
  },
  {
    title: "5. Fast the Mondays and Thursdays",
    body: "The Prophet ﷺ prescribed fasting for the youth who cannot yet marry (Bukhari) because it breaks desire at the root. Even two days a week resets appetite for haram imagery. Pair it with reduced screen time after Maghrib.",
  },
  {
    title: "6. Guard the eyes on the first glance",
    body: "The Prophet ﷺ told Ali: 'the first glance is for you, the second is against you' (Abu Dawud). Practise a physical habit — look at the ground, close the app, put the phone face-down — so the reflex fires before the nafs does.",
  },
  {
    title: "7. Sit with people whose company raises you",
    body: "Loneliness is fuel for relapse. Join a halaqah, a masjid youth circle, or an online accountability partner from a trusted community. The gathering of the righteous is described in the hadith of the angels seeking out circles of dhikr (Bukhari).",
  },
  {
    title: "8. Do not despair when you slip",
    body: "Iblis's biggest weapon after a slip is despair. Renew wudu, pray two rak'ahs of tawbah, and continue. Allah says He forgives all sins for those who turn to Him (Zumar 39:53). A relapse is a data point, not a verdict.",
  },
];

const FAQ = [
  {
    q: "How do I stop watching bad videos Islamically?",
    a: "Combine outer and inner steps: uninstall the app, install a DNS-level content filter, replace the habit with Qur'an and dhikr, pray the fard prayers on time, fast Mondays and Thursdays, and sit with righteous company. When you slip, make wudu and pray two rak'ahs of tawbah instead of despairing.",
  },
  {
    q: "Is watching haram content a major sin?",
    a: "Repeatedly seeking out haram imagery — nudity, violence, mockery of the deen — is classified by scholars as a major sin because it breaks the command to lower the gaze (24:30-31) and hardens the heart. A single involuntary glance is forgiven; deliberate return is what must be stopped.",
  },
  {
    q: "Does music count as haram content?",
    a: "The majority position across the four madhahib is that instrumental music is impermissible, based on the hadith in Bukhari 5590 and Qur'an 31:6. Heartify is built on this majority view: no music, ever, across every video and audio track.",
  },
  {
    q: "What du'a helps me quit haram content?",
    a: "The Prophet ﷺ taught: 'Allahumma inni a'udhu bika min munkarati'l-akhlaqi wa'l-a'mali wa'l-ahwa' — O Allah, I seek refuge in You from evil character, evil deeds, and evil desires' (Tirmidhi). Recite it after every fard prayer for forty days.",
  },
];

export default function DigitalPurification() {
  return (
    <>
      <Helmet>
        <title>How to Stop Watching Bad Videos Islamically — A Digital Purification Guide | Heartify</title>
        <meta
          name="description"
          content="A scholar-guided, eight-step Islamic roadmap for stopping haram content consumption — lower the gaze, replace the habit, and rebuild the heart with Qur'an, prayer, and righteous company."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="How to Stop Watching Bad Videos Islamically" />
        <meta
          property="og:description"
          content="An eight-step Islamic roadmap for digital purification — combining outer discipline (filters, replacements) with inner reform (salah, fasting, dhikr)."
        />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "How to Stop Watching Bad Videos Islamically — A Digital Purification Guide",
          description:
            "A scholar-guided, eight-step Islamic roadmap for stopping haram content consumption.",
          author: { "@type": "Organization", name: "Heartify" },
          publisher: { "@type": "Organization", name: "Heartify", logo: { "@type": "ImageObject", url: "https://pure-heartify.lovable.app/app-icon-1024.png" } },
          mainEntityOfPage: CANONICAL,
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        })}</script>
      </Helmet>

      <main className="container mx-auto max-w-3xl px-4 py-10">
        <header className="mb-8 flex items-start gap-3">
          <ShieldCheck className="mt-1 h-8 w-8 shrink-0 text-primary" />
          <div>
            <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
              Digital purification
            </p>
            <h1 className="mt-1 text-title font-bold leading-tight md:text-title">
              How to stop watching bad videos Islamically — a scholar-guided roadmap
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              A supportive, step-by-step guide for anyone trying to clean up their
              digital habits for the sake of Allah. No shaming. No prosperity-preaching.
              Just outer discipline, inner reform, and halal replacements that actually stick.
            </p>
          </div>
        </header>

        <section aria-labelledby="steps" className="mb-10 space-y-4">
          <h2 id="steps" className="flex items-center gap-2 text-heading font-semibold">
            <Sparkles className="h-5 w-5 text-primary" /> The eight steps
          </h2>
          {STEPS.map((s) => (
            <Card key={s.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base leading-snug">{s.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-foreground/80">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section aria-labelledby="replace" className="mb-10">
          <h2 id="replace" className="mb-3 flex items-center gap-2 text-heading font-semibold">
            <HeartHandshake className="h-5 w-5 text-primary" /> Replace with Heartify
          </h2>
          <Card>
            <CardContent className="space-y-3 py-5 text-sm text-foreground/80">
              <p>
                Every video on Heartify has been reviewed against a strict, scholar-guided
                moderation pipeline — no music, no women on camera, no ambiguous imagery.
                It exists precisely so the halal alternative is one tap away when the old
                urge returns.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild size="sm"><Link to="/browse">Browse halal videos</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to="/quran">Open the Qur'an</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to="/dhikr">Start dhikr</Link></Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="faq" className="mb-10">
          <h2 id="faq" className="mb-3 flex items-center gap-2 text-heading font-semibold">
            <BookOpen className="h-5 w-5 text-primary" /> Frequently asked
          </h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <Card key={f.q}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base leading-snug">{f.q}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-foreground/80">{f.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <p className="text-center text-micro text-muted-foreground">
          For personal circumstances, please consult a qualified local scholar.
        </p>
      </main>
    </>
  );
}
