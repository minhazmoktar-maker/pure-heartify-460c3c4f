import { motion, useReducedMotion, type MotionProps } from "framer-motion";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type FadeInProps<T extends ElementType = "div"> = {
  as?: T;
  children: ReactNode;
  /** Stagger index — multiplied by 0.04s, capped at 0.2s. */
  index?: number;
  /** Y-offset in px (default 12). Ignored when reduced motion is on. */
  y?: number;
  /** X-offset in px (default 0). Ignored when reduced motion is on. */
  x?: number;
  /** Duration in seconds (default 0.35). */
  duration?: number;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children"> &
  Omit<MotionProps, "initial" | "animate" | "transition">;

/**
 * Canonical enter animation used across pages and grid cells.
 * Respects `prefers-reduced-motion` — collapses to a static element with no transform or fade.
 */
export default function FadeIn<T extends ElementType = "div">({
  as,
  children,
  index = 0,
  y = 12,
  x = 0,
  // Design system: --duration-medium (320ms) with ease-standard.
  duration = 0.32,
  className,
  ...rest
}: FadeInProps<T>) {
  const reduce = useReducedMotion();
  const Tag = (as ?? "div") as ElementType;
  const MotionTag = motion.create(Tag as never) as never;

  if (reduce) {
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    );
  }

  const delay = Math.min(index * 0.04, 0.2);

  return (
    // @ts-expect-error - dynamic motion element typing
    <MotionTag
      initial={{ opacity: 0, y, x }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
