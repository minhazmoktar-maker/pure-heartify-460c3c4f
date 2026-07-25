import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, Moon, Star, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HIJRI_MONTHS } from "@/data/hijriMonths";

/**
 * 2026 Hijri Calendar & Event Guide
 * SEO-focused programmatic page targeting "islamic calendar 2026",
 * "hijri date today", "muslim holidays 2026". Content is evergreen where
 * possible; Gregorian equivalents are approximate (moon sighting confirms).
 */

type KeyDate = {
  event: string;
  hijri: string;
  gregorianApprox: string;
  significance: string;
  category: "fast" | "eid" | "hajj" | "sacred" | "night";
};

const KEY_DATES_2026: KeyDate[] = [
  { event: "Islamic New Year (1 Muharram 1448)", hijri: "1 Muharram 1448", gregorianApprox: "≈ June 15, 2026", significance: "Start of the new Hijri year.", category: "sacred" },
  { event: "Day of ʿĀshūrāʾ", hijri: "10 Muharram 1448", gregorianApprox: "≈ June 24, 2026", significance: "Recommended fast; the day Allah saved Musa ﷺ.", category: "fast" },
  { event: "Mawlid observance (varies)", hijri: "12 Rabiʿ al-Awwal 1447", gregorianApprox: "≈ September 4, 2026", significance: "Observed by some communities as the Prophet's ﷺ birth month.", category: "sacred" },
  { event: "First night of Ramadan 1447", hijri: "1 Ramadan 1447", gregorianApprox: "≈ February 17, 2026", significance: "Start of the month of fasting and the Qur'an.", category: "fast" },
  { event: "Laylat al-Qadr (odd nights)", hijri: "21, 23, 25, 27, 29 Ramadan 1447", gregorianApprox: "≈ March 9 – 17, 2026", significance: "The Night of Decree — better than a thousand months.", category: "night" },
  { event: "ʿĪd al-Fiṭr", hijri: "1 Shawwāl 1447", gregorianApprox: "≈ March 20, 2026", significance: "Celebration marking the end of Ramadan.", category: "eid" },
  { event: "Six fasts of Shawwāl", hijri: "2–29 Shawwāl 1447", gregorianApprox: "≈ March 21 – April 16, 2026", significance: "Recommended fasts equal in reward to fasting the whole year.", category: "fast" },
  { event: "First ten days of Dhū al-Ḥijjah", hijri: "1–10 Dhū al-Ḥijjah 1447", gregorianApprox: "≈ May 17 – 26, 2026", significance: "The most beloved days of the year for righteous deeds.", category: "hajj" },
  { event: "Day of ʿArafah", hijri: "9 Dhū al-Ḥijjah 1447", gregorianApprox: "≈ May 25, 2026", significance: "Fasting expiates sins of the past and coming year (for non-pilgrims).", category: "fast" },
  { event: "ʿĪd al-Aḍḥā", hijri: "10 Dhū al-Ḥijjah 1447", gregorianApprox: "≈ May 26, 2026", significance: "Festival of Sacrifice, commemorating Ibrahim ﷺ.", category: "eid" },
  { event: "Days of Tashrīq", hijri: "11–13 Dhū al-Ḥijjah 1447", gregorianApprox: "≈ May 27 – 29, 2026", significance: "Days of eating, drinking, and remembrance of Allah.", category: "hajj" },
];

const MONTH_GREG_2026: Record<string, string> = {
  "muharram": "≈ June 2026 (1448)",
  "safar": "≈ July 2026",
  "rabi-al-awwal": "≈ August–September 2026",
  "rabi-al-thani": "≈ September–October 2026",
  "jumada-al-awwal": "≈ October–November 2026",
  "jumada-al-thani": "≈ November–December 2026",
  "rajab": "≈ December 2026 – January 2027",
  "shaban": "≈ January–February 2026 (1447)",
  "ramadan": "≈ February 17 – March 18, 2026",
  "shawwal": "≈ March 20 – April 17, 2026",
  "dhu-al-qadah": "≈ April 18 – May 16, 2026",
  "dhu-al-hijjah": "≈ May 17 – June 14, 2026",
};

const CATEGORY_LABEL: Record<KeyDate["category"], string> = {
  fast: "Fast",
  eid: "ʿĪd",
  hajj: "Ḥajj",
  sacred: "Sacred",
  night: "Night",
};

export default function HijriCalendar2026() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "2026 Hijri Calendar & Islamic Event Guide (1447–1448 AH)",
    description:
      "A complete month-by-month guide to the Islamic calendar for 2026, including Ramadan, Eid, the Day of Arafah, and every key spiritual date in the 1447–1448 AH years.",
    author: { "@type": "Organization", name: "Heartify" },
    publisher: { "@type": "Organization", name: "Heartify" },
    datePublished: "2026-01-01",
    dateModified: new Date().toISOString().slice(0, 10),
    mainEntityOfPage: "https://pure-heartify.lovable.app/guides/islamic-calendar-2026",
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is today's date in the Muslim calendar?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Today's Hijri date depends on your local moon sighting. In 2026 (Gregorian), the Islamic year moves from 1447 AH into 1448 AH around June 15, 2026. Use a verified local moon-sighting authority for the exact day.",
        },
      },
      {
        "@type": "Question",
        name: "When is Ramadan 2026?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ramadan 1447 AH is expected to begin around February 17, 2026, and end around March 18, 2026, subject to local moon sighting.",
        },
      },
      {
        "@type": "Question",
        name: "When is Eid al-Fitr and Eid al-Adha in 2026?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Eid al-Fitr is expected around March 20, 2026 (1 Shawwāl 1447). Eid al-Adha is expected around May 26, 2026 (10 Dhū al-Ḥijjah 1447).",
        },
      },
      {
        "@type": "Question",
        name: "When is the Day of Arafah 2026?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The Day of Arafah falls on 9 Dhū al-Ḥijjah 1447, expected around May 25, 2026. Fasting on this day expiates the sins of the past and coming year for non-pilgrims.",
        },
      },
    ],
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEO
        title="Islamic Calendar 2026 — Complete Hijri Guide (1447–1448 AH)"
        description="Month-by-month 2026 Hijri calendar with Ramadan, Eid al-Fitr, Eid al-Adha, and the Day of Arafah. Plan your Gregorian year around the Islamic months."
        path="/guides/islamic-calendar-2026"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8 space-y-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Heartify
        </Link>

        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-card bg-primary/10">
              <CalendarDays className="h-6 w-6 text-primary" aria-hidden />
            </div>
            <Badge variant="secondary">Guide · 1447–1448 AH</Badge>
          </div>
          <h1 className="font-heading text-display font-bold text-foreground leading-tight">
            Islamic Calendar 2026 — Complete Hijri Guide
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            A planning resource for the global Ummah: align your Gregorian
            schedule with the Islamic year. Month-by-month coverage of
            <strong className="text-foreground"> 1447 AH → 1448 AH</strong>,
            with Ramadan, ʿĪd al-Fiṭr, the Day of ʿArafah, Ḥajj, and every
            sacred night.
          </p>
          <p className="text-sm text-muted-foreground">
            Note: The Islamic calendar is lunar. All Gregorian dates below are
            astronomical estimates — the actual day depends on local moon
            sighting.
          </p>
        </header>

        {/* Key dates at a glance */}
        <section aria-labelledby="key-dates" className="space-y-3">
          <h2 id="key-dates" className="font-heading text-title font-bold text-foreground flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" aria-hidden /> Key Islamic dates in 2026
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {KEY_DATES_2026.map((d) => (
              <Card key={d.event} className="border-border/60">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {d.event}
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0 text-xs">{CATEGORY_LABEL[d.category]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="text-foreground font-medium">{d.hijri}</div>
                  <div className="text-muted-foreground">{d.gregorianApprox}</div>
                  <p className="pt-1 text-muted-foreground">{d.significance}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Month by month */}
        <section aria-labelledby="months" className="space-y-3">
          <h2 id="months" className="font-heading text-title font-bold text-foreground flex items-center gap-2">
            <Moon className="h-5 w-5 text-primary" aria-hidden /> The 12 Hijri months — 1447 → 1448 AH
          </h2>
          <p className="text-muted-foreground">
            The Islamic year has 12 lunar months totaling roughly 354 days, so
            each month shifts about 10–11 days earlier in the Gregorian year.
            Below is each month with its meaning, spiritual weight, and its
            approximate Gregorian window in 2026.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {HIJRI_MONTHS.map((m) => (
              <Card key={m.slug} className="border-border/60">
                <CardHeader className="pb-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <CardTitle className="text-base font-semibold">
                      {m.n}. {m.en}
                    </CardTitle>
                    <span className="font-arabic text-lg text-foreground" dir="rtl">{m.ar}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{m.translit} · {m.meaning}</p>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  <p className="text-muted-foreground">{m.summary}</p>
                  <p className="pt-1 text-xs text-foreground/70">
                    <span className="font-medium">2026:</span> {MONTH_GREG_2026[m.slug]}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Planning */}
        <section aria-labelledby="planning" className="space-y-3">
          <h2 id="planning" className="font-heading text-title font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden /> Plan your 2026 with the Ummah
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              <strong className="text-foreground">February — pre-Ramadan.</strong>{" "}
              Sha'bān is the runway to Ramadan. Increase voluntary fasting,
              settle debts, and set a clear Qur'an plan.
            </p>
            <p>
              <strong className="text-foreground">March — Ramadan &amp; ʿĪd al-Fiṭr.</strong>{" "}
              Ramadan 1447 covers most of March. Aim for one juzʾ per day, seek
              Laylat al-Qadr in the last ten nights, and give Zakāt al-Fiṭr
              before ʿĪd prayer.
            </p>
            <p>
              <strong className="text-foreground">May — Ḥajj season &amp; ʿĪd al-Aḍḥā.</strong>{" "}
              The first ten days of Dhū al-Ḥijjah are the most beloved days of
              the year. Fast the Day of ʿArafah (≈ May 25) and offer the
              qurbānī on ʿĪd al-Aḍḥā (≈ May 26).
            </p>
            <p>
              <strong className="text-foreground">June — new Hijri year.</strong>{" "}
              1448 AH begins around June 15. Muharram is one of the four sacred
              months; fast ʿĀshūrāʾ (10th) and the day before.
            </p>
          </div>
        </section>

        {/* Today */}
        <section aria-labelledby="today" className="rounded-card border border-border bg-card p-6 space-y-2">
          <h2 id="today" className="font-heading text-heading font-semibold text-foreground">
            Today's date in the Muslim calendar
          </h2>
          <p className="text-muted-foreground">
            Heartify shows today's Hijri date on the home screen and inside the
            Prayer &amp; Adhan view. Because the month begins with a confirmed
            moon sighting, the exact day can vary by region — always defer to
            your local moon-sighting authority.
          </p>
          <div className="pt-2">
            <Link
              to="/adhan-iqamah"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Open prayer times &amp; today's Hijri date →
            </Link>
          </div>
        </section>

        <footer className="pt-4 text-xs text-muted-foreground border-t border-border">
          Last reviewed {new Date().toISOString().slice(0, 10)}. Gregorian dates
          are astronomical estimates; local moon sighting is authoritative.
        </footer>
      </main>
    </div>
  );
}
