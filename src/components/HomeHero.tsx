import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Compass, MapPin, Play, Headphones, Search, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSurface } from "@/hooks/useSurface";
import {
  computePrayerTimes,
  formatCountdown,
  formatTime,
  loadSettings,
  nextPrayer,
  type PrayerSettings,
  type PrayerSlot,
} from "@/lib/prayerTimes";

type Ayah = { arabic: string; english: string; ref: string };

const FALLBACK_AYAH: Ayah = {
  arabic: "إِنَّ مَعَ ٱلْعُسْرِ يُسْرًۭا",
  english: "Indeed, with hardship comes ease.",
  ref: "Qur'an 94:6",
};

function readLastAudio(): { title: string; href: string } | null {
  try {
    const raw = localStorage.getItem("heartify:lastAudio");
    if (!raw) return null;
    const j = JSON.parse(raw);
    if (j && typeof j.title === "string" && typeof j.href === "string") return j;
  } catch { /* noop */ }
  return null;
}

function firstName(email?: string | null): string | null {
  if (!email) return null;
  const raw = email.split("@")[0] ?? "";
  const clean = raw.replace(/[._-]+/g, " ").trim();
  if (!clean) return null;
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * HomeHero — the ONE collapsed hero card.
 * Stack: greeting · next salah · today's ayah, inside a single elevated card.
 * When a signed-in user has an active continue-watching item, that becomes
 * the resume hero (one-tap resume) and this card slides beneath as a strip.
 * Persistent search pill sits on top so search is one tap from Home.
 */
export default function HomeHero() {
  const { user } = useAuth();
  const name = useMemo(
    () => (user?.user_metadata?.full_name as string | undefined) ?? firstName(user?.email),
    [user],
  );

  const [settings, setSettings] = useState<PrayerSettings | null>(null);
  const [now, setNow] = useState(new Date());
  useEffect(() => { setSettings(loadSettings()); }, []);
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const slots: PrayerSlot[] = useMemo(() => {
    if (!settings?.location) return [];
    return computePrayerTimes(settings.location, now, settings.method, settings.madhab);
  }, [settings, now]);
  const next = useMemo(() => nextPrayer(slots, now), [slots, now]);
  const approx = settings?.location?.approximate;

  // Resume hero — only for signed-in with an active continue-watching item
  const { items: continueItems } = useSurface("continue_watching", {
    enabled: !!user,
    getExcludeIds: () => [],
  });
  const resume = continueItems?.[0];

  const lastAudio = typeof window !== "undefined" ? readLastAudio() : null;
  const greetingName = name ? `, ${name}` : "";

  return (
    <section className="mx-auto max-w-[1800px] px-4 pt-3 md:px-6" aria-label="Home">
      {/* Persistent search pill — YouTube/Spotify/Apple Podcasts pattern.
          Always one tap away regardless of scroll position. */}
      <Link
        to="/search"
        aria-label="Search halal content"
        className="mb-3 flex h-11 w-full items-center gap-3 rounded-pill border border-border bg-card px-4 text-sm text-muted-foreground shadow-e1 transition-colors hover:bg-secondary md:hidden"
      >
        <Search className="h-4 w-4" aria-hidden />
        <span className="truncate">Search halal content…</span>
      </Link>

      {/* Resume-in-1-tap — supersedes the greeting card when active */}
      {resume ? (
        <Link
          to={`/watch/${resume.id}`}
          className="mb-3 flex items-center gap-3 rounded-card border border-border bg-card p-3 shadow-e1 transition-transform hover:-translate-y-0.5"
          aria-label={`Resume watching ${resume.title}`}
        >
          <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md bg-muted">
            <img
              src={resume.thumbnailUrl}
              alt=""
              loading="eager"
              decoding="async"
              width={224}
              height={128}
              className="h-full w-full object-cover"
              {...({ fetchpriority: "high" } as { fetchpriority: string })}
            />

            <div className="absolute inset-0 grid place-items-center bg-black/25">
              <Play className="h-6 w-6 fill-white text-white" aria-hidden />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-micro font-semibold uppercase tracking-wide text-primary">Resume</p>
            <h2 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
              {resume.title}
            </h2>
            <p className="mt-0.5 truncate text-micro text-muted-foreground">{resume.channelTitle}</p>
          </div>
        </Link>
      ) : null}

      {/* THE collapsed hero card — salaam · next salah · today's ayah stacked */}
      <div className="rounded-card border border-border bg-card p-4 shadow-e1 md:p-5">
        {/* Greeting row */}
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm text-muted-foreground">
            <span lang="ar" dir="rtl" className="font-quran text-foreground">السلام عليكم</span>
            <span className="text-foreground">{greetingName}</span>
          </p>
          {lastAudio ? (
            <Link
              to={lastAudio.href}
              aria-label={`Listen — resume ${lastAudio.title}`}
              className="inline-flex items-center gap-1.5 rounded-pill bg-primary/10 px-2.5 py-1 text-micro font-semibold text-primary transition-colors hover:bg-primary/15"
            >
              <Headphones className="h-3.5 w-3.5" aria-hidden />
              <span className="max-w-[140px] truncate">{lastAudio.title}</span>
            </Link>
          ) : (
            <Link
              to="/audio"
              aria-label="Open audio library"
              className="inline-flex items-center gap-1.5 rounded-pill bg-primary/10 px-2.5 py-1 text-micro font-semibold text-primary transition-colors hover:bg-primary/15"
            >
              <Headphones className="h-3.5 w-3.5" aria-hidden />
              Listen
            </Link>
          )}
        </div>

        {/* Next salah row — only shown to signed-out visitors. Signed-in
            users get the full NextSalahWidget below in TodayHero, so we
            skip this row to avoid duplication. */}
        {!user && (
          <div className="mt-3 border-t border-border/60 pt-3">
            {!settings?.location ? (
              <Link
                to="/prayer"
                className="flex items-center gap-2 text-sm text-foreground"
                aria-label="Set your location for prayer times"
              >
                <MapPin className="h-4 w-4 text-primary" aria-hidden />
                <span className="font-semibold">Set location</span>
                <span className="text-muted-foreground">for prayer times</span>
              </Link>
            ) : next ? (
              <Link
                to="/prayer"
                className={"flex items-center gap-2 text-sm " + (approx ? "opacity-70" : "")}
                aria-label={`Next prayer: ${next.label} in ${formatCountdown(next.time.getTime() - now.getTime())}`}
              >
                <Compass className="h-4 w-4 text-primary" aria-hidden />
                <span className="font-semibold text-foreground">Next: {next.label}</span>
                <span className="text-muted-foreground">
                  {formatTime(next.time)} · in{" "}
                  <span className="tabular-nums font-medium text-foreground">
                    {formatCountdown(next.time.getTime() - now.getTime())}
                  </span>
                </span>
                {approx ? (
                  <span className="ml-auto shrink-0 text-micro font-semibold text-primary">Confirm</span>
                ) : null}
              </Link>
            ) : null}
          </div>
        )}

        {/* Today's ayah — signed-out only. Signed-in users get the full
            VerseOfDayCard inside TodayHero, so we skip here to avoid two
            ayah cards competing above the fold (the 5-second test). */}
        {!user && (
          <div className="mt-3 border-t border-border/60 pt-3">
            <Link to="/quran" className="block group" aria-label="Open Qur'an reader">
              <p
                lang="ar"
                dir="rtl"
                className="font-quran text-xl leading-[1.8] text-foreground [font-feature-settings:'liga','calt','ss01']"
                style={{ fontWeight: 700 }}
              >
                {FALLBACK_AYAH.arabic}
              </p>
              <p className="mt-1.5 text-sm italic text-foreground/90">
                {FALLBACK_AYAH.english}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 text-micro text-muted-foreground group-hover:text-foreground transition-colors">
                <BookOpen className="h-3 w-3" aria-hidden />
                {FALLBACK_AYAH.ref}
              </div>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
