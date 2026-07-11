import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Crown,
  Download,
  Heart,
  Infinity as InfinityIcon,
  Loader2,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import HouseholdPanel from "@/components/plus/HouseholdPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { celebrateUpgrade } from "@/lib/celebrate";
import { useEntitlement } from "@/hooks/useEntitlement";
import { useAuth } from "@/contexts/AuthContext";
import { usePlusWaitlist, type PreferredTier } from "@/hooks/usePlusWaitlist";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import { currencyForCountry, formatCurrency } from "@/lib/intl";


interface Tier {
  id: PreferredTier | "free";
  name: string;
  tagline: string;
  /** Base price in USD. Rendered in the user's locale/currency at display time. */
  priceUsd: number;
  period: string;
  periodShort: string;
  highlight?: boolean;
  cta: string;
  icon: typeof Sparkles;
  bullets: { text: string; strong?: boolean }[];
}


const TIERS: Tier[] = [
  {
    id: "free",
    name: "Heartify",
    tagline: "Everything you need to stay steadfast, forever free.",
    priceUsd: 0,
    period: "always",
    periodShort: "always",
    cta: "Continue with Free",
    icon: Heart,
    bullets: [
      { text: "Full curated halal video & audio catalog" },
      { text: "Prayer times, Qibla, Adhan reminders" },
      { text: "Daily dhikr, streaks, weekly recap" },
      { text: "Up to 5 offline audio downloads" },
      { text: "Bookmark, share & report content" },
    ],
  },
  {
    id: "plus",
    name: "Heartify+",
    tagline: "For the seeker who wants depth without limits.",
    priceUsd: 4.99,
    period: "per month",
    periodShort: "mo",
    highlight: true,
    cta: "Join the Heartify+ waitlist",
    icon: Sparkles,
    bullets: [
      { text: "Unlimited offline library on up to 5 devices", strong: true },
      { text: "HD video & lossless, gapless Qur'an audio", strong: true },
      { text: "Exclusive reciter catalog (Sudais, Al‑Afasy, Al‑Ghamdi…)", strong: true },
      { text: "Guided Khatm programs with streak protection" },
      { text: "Scholarship courses & premium series" },
      { text: "Ad‑free forever, no interruptions between recitations" },
      { text: "Early access to new features & Kids Mode" },
    ],
  },
  {
    id: "family",
    name: "Heartify+ Family",
    tagline: "One barakah for the whole household.",
    priceUsd: 8.99,
    period: "per month · up to 6 seats",
    periodShort: "mo",
    cta: "Join the Family waitlist",
    icon: Users,
    bullets: [
      { text: "Everything in Heartify+, for 6 family members", strong: true },
      { text: "Kids Mode with strict halal filters & no video autoplay", strong: true },
      { text: "Per‑seat streaks, dhikr goals & progress dashboards" },
      { text: "Shared Khatm groups & family duʿā wall" },
      { text: "Parental oversight from a single account" },
    ],
  },
  {
    id: "lifetime",
    name: "Heartify+ Lifetime",
    tagline: "One sadaqah jāriyah, forever access.",
    priceUsd: 149,
    period: "one‑time · counts as sadaqah",
    periodShort: "one‑time",
    cta: "Reserve Lifetime access",
    icon: Crown,
    bullets: [
      { text: "All Heartify+ features, forever", strong: true },
      { text: "Proceeds fund free access for students of knowledge" },
      { text: "Founding‑member badge on your profile" },
      { text: "Priority feature requests & direct feedback line" },
    ],
  },
];


const COMPARISON: {
  section: string;
  rows: { label: string; free: string | boolean; plus: string | boolean }[];
}[] = [
  {
    section: "Content",
    rows: [
      { label: "Curated halal video & audio catalog", free: true, plus: true },
      { label: "Exclusive reciter catalog (full mus'haf)", free: false, plus: true },
      { label: "HD video streaming", free: "SD", plus: "HD" },
      { label: "Lossless, gapless Qur'an audio", free: false, plus: true },
      { label: "Scholarship courses & premium series", free: false, plus: true },
    ],
  },
  {
    section: "Offline & Devices",
    rows: [
      { label: "Offline audio downloads", free: "5 tracks", plus: "Unlimited" },
      { label: "Devices per account", free: "1", plus: "5" },
      { label: "Background listening", free: true, plus: true },
    ],
  },
  {
    section: "Worship tools",
    rows: [
      { label: "Prayer times, Qibla, Adhan reminders", free: true, plus: true },
      { label: "Daily dhikr, streaks, weekly recap", free: true, plus: true },
      { label: "Guided Khatm programs", free: "Basic", plus: "Guided + streak protection" },
      { label: "Kids Mode (Family tier only)", free: false, plus: "Family" },
    ],
  },
  {
    section: "Experience",
    rows: [
      { label: "Ads / interruptions", free: "None (already free)", plus: "None" },
      { label: "Early access to new features", free: false, plus: true },
      { label: "Founding‑member badge", free: false, plus: "Lifetime tier" },
    ],
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "When does Heartify+ launch?",
    a: "We're finalising the exclusive reciter licensing and payment processor. Waitlist members get priority access and a founding‑member discount at launch.",
  },
  {
    q: "Will free features be taken away?",
    a: "No. Everything currently available on Heartify stays free forever — including prayer times, streaks, dhikr, curated video, and up to 5 offline audio downloads. Heartify+ only adds new value on top.",
  },
  {
    q: "Is Heartify+ halal?",
    a: "Every reciter, teacher and course goes through the same moderation pipeline as our free catalog. Nothing paid for with your subscription contains music, non‑mahram voices in songs, or content flagged by our reviewers.",
  },
  {
    q: "How does the Family plan work?",
    a: "One primary account, up to 6 seats. Each seat has their own streaks, bookmarks and progress. Kids seats can be locked to Kids Mode with strict filters and no video autoplay.",
  },
  {
    q: "Do you offer regional pricing?",
    a: "Yes — at launch, Heartify+ is available at purchasing‑power‑adjusted prices in 40+ countries, so the price is fair whether you're in Karachi, Cairo, London, or Kuala Lumpur.",
  },
  {
    q: "Can I cancel any time?",
    a: "Any time, no questions asked. Your account keeps everything from the free tier, including your streak, bookmarks, and history.",
  },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true)
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary" aria-label="Included">
        <Check className="h-3.5 w-3.5" aria-hidden />
      </span>
    );
  if (value === false)
    return <span className="text-xs text-muted-foreground" aria-label="Not included">—</span>;
  return <span className="text-xs font-medium text-foreground">{value}</span>;
}

export default function HeartifyPlus() {
  const { user } = useAuth();
  const { isPremium, entitlement, loading: entLoading } = useEntitlement();
  const { alreadyOnList, join } = usePlusWaitlist();

  const [email, setEmail] = useState(user?.email ?? "");
  const [tier, setTier] = useState<PreferredTier>("plus");
  const [submitting, setSubmitting] = useState(false);

  const emailValid = useMemo(
    () => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()),
    [email],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || submitting) return;
    setSubmitting(true);
    const res = await join({ email, preferredTier: tier, source: "plus_page" });
    setSubmitting(false);
    if (res.ok) {
      celebrateUpgrade();
      toast.success("You're on the waitlist — we'll email you at launch, in shāʾ Allāh.");
    } else {
      toast.error(res.error ?? "Could not add you to the waitlist. Try again.");
    }
  };

  const handleTierCTA = (tierId: Tier["id"]) => {
    if (tierId === "free") return;
    setTier(tierId);
    const el = document.getElementById("waitlist");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Heartify+ — Halal streaming without limits"
        description="Unlimited offline Qur'an audio, exclusive reciters, guided Khatm programs, family seats & Kids Mode. Every feature 100% halal."
        path="/plus"
      />
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to home
        </Link>

        {/* Hero */}
        <header className="relative overflow-hidden rounded-3xl border border-[hsl(var(--gold))]/30 bg-gradient-to-br from-[hsl(var(--emerald-dark))] via-[hsl(var(--emerald-dark))] to-[hsl(153_45%_16%)] p-8 text-[hsl(var(--cream))] md:p-12">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[hsl(var(--gold))]/20 blur-3xl" aria-hidden />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--gold))]/40 bg-[hsl(var(--gold))]/10 px-3 py-1 text-xs font-medium text-[hsl(var(--gold))]">
              <Sparkles className="h-3 w-3" aria-hidden />
              Introducing Heartify+
            </span>
            <h1 className="mt-4 font-heading text-3xl font-bold md:text-5xl">
              Halal streaming, without limits.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[hsl(var(--cream))]/80 md:text-base">
              The full Qur'an from your favourite reciters. Guided Khatm programs. Family
              seats with Kids Mode. Offline everywhere. No music, no ads, no compromise.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-[hsl(var(--cream))]/80">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> 100% halal, always
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1">
                <InfinityIcon className="h-3.5 w-3.5" aria-hidden /> Unlimited offline
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1">
                <Users className="h-3.5 w-3.5" aria-hidden /> Family & Kids Mode
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1">
                <Star className="h-3.5 w-3.5" aria-hidden /> Founding‑member perks
              </span>
            </div>

            {!entLoading && isPremium ? (
              <div className="mt-8 inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--gold))]/50 bg-[hsl(var(--gold))]/10 px-4 py-3 text-sm text-[hsl(var(--cream))]">
                <Crown className="h-4 w-4 text-[hsl(var(--gold))]" aria-hidden />
                You're already a Heartify+ member — jazākum Allāhu khayran.
                {entitlement.expiresAt && (
                  <span className="text-[hsl(var(--cream))]/70">
                    Renews {new Date(entitlement.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            ) : (
              <a
                href="#tiers"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--gold))] px-5 py-2.5 text-sm font-semibold text-[hsl(var(--emerald-dark))] transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--emerald-dark))]"
              >
                See plans
              </a>
            )}
          </div>
        </header>

        {/* Tiers */}
        <section id="tiers" className="mt-12">
          <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
            Choose your plan
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Free stays free — forever. Heartify+ adds depth for those who want more.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {TIERS.map((t) => {
              const Icon = t.icon;
              return (
                <article
                  key={t.id}
                  className={cn(
                    "flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md",
                    t.highlight
                      ? "border-[hsl(var(--gold))] ring-2 ring-[hsl(var(--gold))]/40"
                      : "border-border",
                  )}
                >
                  {t.highlight && (
                    <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-[hsl(var(--gold))]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--gold))]">
                      Most loved
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full",
                        t.highlight
                          ? "bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <h3 className="font-heading text-lg font-semibold text-foreground">
                      {t.name}
                    </h3>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{t.tagline}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-heading text-3xl font-bold text-foreground">
                      {t.price}
                    </span>
                    <span className="text-xs text-muted-foreground">/ {t.period}</span>
                  </div>
                  <ul className="mt-4 flex-1 space-y-2">
                    {t.bullets.map((b) => (
                      <li key={b.text} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                        <span
                          className={cn(
                            "leading-5",
                            b.strong ? "font-medium text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {b.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6"
                    variant={t.highlight ? "default" : "outline"}
                    onClick={() => handleTierCTA(t.id)}
                    disabled={t.id === "free"}
                    aria-label={t.cta}
                  >
                    {t.id === "free" ? "You're on Free" : t.cta}
                  </Button>
                </article>
              );
            })}
          </div>
        </section>

        {/* Comparison */}
        <section className="mt-16">
          <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
            Free vs. Heartify+
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Everything on the left stays free, forever. The right adds what serious seekers ask for.
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Feature</th>
                  <th scope="col" className="px-4 py-3 font-medium">Free</th>
                  <th scope="col" className="px-4 py-3 font-medium text-[hsl(var(--gold))]">
                    Heartify+
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.flatMap((sec) => [
                  <tr key={`sec-${sec.section}`} className="bg-muted/20">
                    <td colSpan={3} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {sec.section}
                    </td>
                  </tr>,
                  ...sec.rows.map((r) => (
                    <tr key={`${sec.section}-${r.label}`} className="border-t border-border/60">
                      <th scope="row" className="px-4 py-3 font-normal text-foreground">
                        {r.label}
                      </th>
                      <td className="px-4 py-3"><Cell value={r.free} /></td>
                      <td className="px-4 py-3"><Cell value={r.plus} /></td>
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
        </section>

        {/* Family seats */}
        <section id="family" className="mt-16">
          <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
            Family seats
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Share one Heartify+ plan with up to 5 family members. Each seat gets their own account, streaks, and history — nothing is mixed together.
          </p>
          <div className="mt-6">
            <HouseholdPanel />
          </div>
        </section>

        {/* Waitlist */}
        <section
          id="waitlist"
          className="mt-16 overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-10"
        >
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" aria-hidden /> Founding members
              </span>
              <h2 className="mt-3 font-heading text-2xl font-bold text-foreground md:text-3xl">
                Join the Heartify+ waitlist
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Get early access at launch, plus a permanent founding‑member discount.
                We'll only email you about Heartify+ — nothing else.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Download className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Full offline library on up to 5 devices at launch
                </li>
                <li className="flex items-start gap-2">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Family seats with Kids Mode ready on day one
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  100% halal — same moderation pipeline as the free tier
                </li>
              </ul>
            </div>

            {alreadyOnList ? (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary" aria-hidden>
                  <Check className="h-6 w-6" />
                </span>
                <p className="mt-3 font-heading text-lg font-semibold text-foreground">
                  You're on the list
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  We'll email you the moment Heartify+ opens, in shāʾ Allāh.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-4 rounded-2xl border border-border bg-background/60 p-5"
                aria-label="Heartify Plus waitlist signup"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="waitlist-email">Email</Label>
                  <Input
                    id="waitlist-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    aria-invalid={email.length > 0 && !emailValid}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="waitlist-tier">Which plan are you interested in?</Label>
                  <select
                    id="waitlist-tier"
                    value={tier}
                    onChange={(e) => setTier(e.target.value as PreferredTier)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="plus">Heartify+ ($4.99 / month)</option>
                    <option value="family">Heartify+ Family ($8.99 / month)</option>
                    <option value="lifetime">Heartify+ Lifetime ($149 one‑time)</option>
                  </select>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!emailValid || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Adding you…
                    </>
                  ) : (
                    "Reserve my spot"
                  )}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  By joining you agree to receive one email at launch. No spam, unsubscribe any time.
                </p>
              </form>
            )}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-16">
          <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
            Frequently asked
          </h2>
          <div className="mt-4 rounded-2xl border border-border bg-card">
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((f, i) => (
                <AccordionItem key={f.q} value={`faq-${i}`} className="px-4">
                  <AccordionTrigger className="text-left text-sm font-medium">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Heartify+ is under active development. Pricing shown reflects launch pricing and
          may vary by region. Your free experience is guaranteed to remain free.
        </p>
      </main>
    </div>
  );
}
