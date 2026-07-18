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
          <span className="inline-block rounded-pill bg-gold/20 px-3 py-1 text-micro font-semibold text-gold">
            ✦ Reclaim your attention
          </span>
          <h1 className="mt-4 font-heading text-title font-bold leading-tight text-cream md:text-display">
            Every recommendation should earn your time.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-cream md:text-base">
            Heartify is built for people who choose learning over endless scrolling.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-cream md:text-base">
            Our AI continuously selects educational, ethical, and value-aligned content while reducing distractions, so your feed becomes a place to learn, reflect, and grow.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-cream md:text-base">
            Whether you&apos;re studying Islam, building new skills, or exploring the world&apos;s knowledge, Heartify helps you spend more time on content that truly matters.
          </p>

          <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-micro font-medium text-cream md:text-sm">
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="text-gold">✓</span> Purposeful recommendations
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="text-gold">✓</span> AI-moderated for quality
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="text-gold">✓</span> Built to reduce distraction
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="text-gold">✓</span> Privacy respected
            </li>
          </ul>

          <button className="mt-6 inline-flex items-center gap-2 rounded-pill bg-gold px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg transition-all hover:brightness-110">
            <Play className="h-4 w-4" />
            Start Watching
          </button>
        </FadeIn>
      </div>
    </section>
  );
};

export default HeroSection;
