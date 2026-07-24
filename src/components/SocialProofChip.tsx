// Small pill used to convey live social activity — e.g. "142 Ameens today"
// or "24 du'as posted today". Keeps typography and spacing consistent so
// the same visual language reads across the Du'a Wall, feed, and community
// surfaces.

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  icon: LucideIcon;
  label: string;
  tone?: "default" | "primary" | "success";
  className?: string;
}

const TONES: Record<NonNullable<Props["tone"]>, string> = {
  default: "bg-secondary text-foreground",
  primary: "bg-primary/12 text-primary",
  success: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
};

export default function SocialProofChip({ icon: Icon, label, tone = "default", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span>{label}</span>
    </span>
  );
}
