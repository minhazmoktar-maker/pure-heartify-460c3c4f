import { ArrowUp } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useScrolled } from "@/hooks/useScrolled";

/**
 * Floating back-to-top affordance. Appears once the user scrolls past ~600px.
 * Positioned above the audio player (bottom-24) with safe-area padding.
 */
export default function BackToTop() {
  const visible = useScrolled(600);
  const reduce = useReducedMotion();

  const scrollTop = () =>
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={scrollTop}
          aria-label="Back to top"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.9 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.9 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed right-4 bottom-28 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/95 text-foreground shadow-lg backdrop-blur transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background md:right-6"
          style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
