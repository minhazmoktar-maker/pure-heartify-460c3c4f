import { motion } from "framer-motion";
import { Play } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

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
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-dark/90 via-emerald-dark/70 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-[1800px] px-4 py-16 md:px-6 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-xl"
        >
          <span className="inline-block rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-gold">
            ✦ 100% Halal Content
          </span>
          <h1 className="mt-4 font-heading text-3xl font-bold leading-tight text-cream md:text-5xl">
            Watch. Learn.{" "}
            <span className="text-gradient-gold">Grow in Faith.</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-cream/70 md:text-base">
            Your trusted platform for Islamic knowledge, Quran recitations,
            nasheeds, and wholesome family content — curated to be 100% halal.
          </p>
          <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg transition-all hover:brightness-110">
            <Play className="h-4 w-4" />
            Start Watching
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
