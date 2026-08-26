/**
 * Native vs diversified lane toggle.
 *
 * Heartify serves every feed page as ~80% native (the user's primary content
 * language) and ~20% diversified (everything else they understand). That rule
 * is invisible unless we show it, so this control makes the split legible —
 * with live counts — and lets the viewer narrow to one lane on demand.
 */
import { Globe, Languages } from "lucide-react";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n";

export type Lane = "all" | "native" | "diversified";

export function isNativeItem(
  contentLanguage: string | null | undefined,
  primary: string | undefined,
): boolean {
  if (!primary) return true;
  return (contentLanguage ?? "").toLowerCase() === primary.toLowerCase();
}

export function languageLabel(code: string | undefined): string {
  if (!code) return "your language";
  return (
    SUPPORTED_LANGUAGES.find((l) => l.code === (code as LanguageCode))?.native ??
    code.toUpperCase()
  );
}

interface Props {
  lane: Lane;
  onChange: (lane: Lane) => void;
  primaryLanguage: string | undefined;
  nativeCount: number;
  diversifiedCount: number;
}

const LaneToggle = ({
  lane,
  onChange,
  primaryLanguage,
  nativeCount,
  diversifiedCount,
}: Props) => {
  const total = nativeCount + diversifiedCount;
  const nativePct = total > 0 ? Math.round((nativeCount / total) * 100) : 0;

  const options: Array<{ key: Lane; label: string; count: number; icon?: typeof Globe }> = [
    { key: "all", label: "All", count: total },
    {
      key: "native",
      label: languageLabel(primaryLanguage),
      count: nativeCount,
      icon: Languages,
    },
    { key: "diversified", label: "Other languages", count: diversifiedCount, icon: Globe },
  ];

  return (
    <div className="mb-4 space-y-1.5" data-testid="lane-toggle">
      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        role="group"
        aria-label="Filter feed by language lane"
      >
        {options.map((option) => {
          const Icon = option.icon;
          const active = lane === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              aria-pressed={active}
              data-testid={`lane-${option.key}`}
              className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-pill border px-3 text-xs font-medium transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span>{option.label}</span>
              <span className="tabular-nums opacity-70">{option.count}</span>
            </button>
          );
        })}
      </div>
      <p className="text-micro text-muted-foreground">
        {nativePct}% {languageLabel(primaryLanguage)} · {100 - nativePct}% other languages —
        Heartify aims for an 80/20 balance so your feed stays local without becoming narrow.
      </p>
    </div>
  );
};

export default LaneToggle;
