import { cn } from "@/lib/utils";

/**
 * Lightweight password strength meter. Not a security guarantee — a UX signal
 * to nudge users toward stronger passwords during signup / reset flows.
 */
export function scorePassword(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^\w\s]/.test(pw)) score++;
  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
}

const LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"] as const;
const TONES = [
  "bg-muted",
  "bg-destructive",
  "bg-[hsl(var(--gold))]",
  "bg-[hsl(var(--gold))]",
  "bg-primary",
] as const;

export function PasswordStrength({ value, className }: { value: string; className?: string }) {
  const score = scorePassword(value);
  if (!value) return null;
  return (
    <div className={cn("space-y-1", className)} aria-live="polite">
      <div className="flex gap-1" role="presentation">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-200",
              i <= score ? TONES[score] : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Password strength: <span className="font-medium text-foreground">{LABELS[score]}</span>
      </p>
    </div>
  );
}
