import { Play } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";
import FadeIn from "@/components/FadeIn";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroBanner}
          alt="HalalTube hero"
          width={1920}
          height={800}
          loading="eager"
          {...({ fetchpriority: "high" } as { fetchpriority: string })}
          decoding="async"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-dark/90 via-emerald-dark/70 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-[1800px] px-4 py-14 md:px-6 md:py-20">
        <FadeIn y={30} duration={0.7} className="max-w-2xl">
          <span className="inline-block rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-gold">
            ✦ Trying our best to keep it halal · No music · No women on camera
          </span>
          <h1 className="mt-4 font-heading text-3xl font-bold leading-tight text-cream md:text-5xl">
            Halal video, audio &amp; Qur&apos;an.{" "}
            <span className="text-gradient-gold">Nothing else.</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-cream/80 md:text-base">
            Every video passes a scholar-guided moderation pipeline. No music.
            No ads. No tracking. Just recitation, tafsir, seerah and reminders
            you can trust.
          </p>

          <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-cream/85 md:text-sm">
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="text-gold">✓</span> Scholar-moderated
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="text-gold">✓</span> No music, ever
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="text-gold">✓</span> No ads, no tracking
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="text-gold">✓</span> Verified reciters
            </li>
          </ul>

          <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg transition-all hover:brightness-110">
            <Play className="h-4 w-4" />
            Start Watching
          </button>
        </FadeIn>
      </div>
    </section>
  );
};

export default HeroSection;
