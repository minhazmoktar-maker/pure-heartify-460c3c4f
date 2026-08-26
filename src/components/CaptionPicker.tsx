/**
 * Per-video caption language picker.
 *
 * Defaults to the viewer's native lane, degrades through the fallback rules in
 * `captionFallback.ts`, and always reports state (loading / missing / which
 * rule fired). RTL caption languages get `dir="rtl"` so Arabic, Urdu, Farsi and
 * Pashto labels render correctly inside an LTR shell.
 */
import { Captions, ChevronDown, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { languageLabel } from "@/components/LaneToggle";
import { RTL_LANGUAGES, type LanguageCode } from "@/i18n";
import {
  captionReasonLabel,
  type CaptionCandidate,
  type CaptionResolutionReason,
} from "@/lib/captionFallback";

export function isRtlCaption(code: string | null | undefined): boolean {
  const b = (code ?? "").split(/[-_]/)[0].toLowerCase();
  return RTL_LANGUAGES.has(b as LanguageCode);
}

interface Props {
  tracks: readonly CaptionCandidate[];
  selected: string | null;
  reason: CaptionResolutionReason;
  loading?: boolean;
  onSelect: (language: string) => void;
  /** Compact variant used inside list cells / grid cards. */
  compact?: boolean;
  testId?: string;
}

const CaptionPicker = ({
  tracks,
  selected,
  reason,
  loading = false,
  onSelect,
  compact = false,
  testId = "caption-picker",
}: Props) => {
  if (loading) {
    return (
      <span
        data-testid={`${testId}-loading`}
        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
      >
        <Loader2 className="h-3 w-3 animate-spin" /> Loading captions…
      </span>
    );
  }

  if (tracks.length === 0) {
    return (
      <span
        data-testid={`${testId}-missing`}
        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
      >
        <Captions className="h-3 w-3" /> No captions yet
      </span>
    );
  }

  const activeLabel = languageLabel(selected ?? undefined);

  return (
    <div className="inline-flex flex-wrap items-center gap-2" data-testid={testId}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-testid={`${testId}-trigger`}
            aria-label="Choose caption language"
            dir={isRtlCaption(selected) ? "rtl" : "ltr"}
            className={`inline-flex items-center gap-1.5 rounded-pill border border-border px-3 font-medium text-foreground transition-colors hover:bg-accent/50 ${
              compact ? "min-h-[32px] text-[11px]" : "min-h-[36px] text-xs"
            }`}
          >
            <Captions className="h-3.5 w-3.5 shrink-0" />
            <span>{activeLabel}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-44">
          {tracks.map((track) => (
            <DropdownMenuItem
              key={track.language}
              data-testid={`${testId}-option-${track.language}`}
              dir={isRtlCaption(track.language) ? "rtl" : "ltr"}
              onSelect={() => onSelect(track.language)}
              className={track.language === selected ? "font-semibold text-primary" : undefined}
            >
              {languageLabel(track.language)}
              {track.source === "mt" ? " · translated" : ""}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {!compact && (
        <span
          data-testid={`${testId}-status`}
          dir={isRtlCaption(selected) ? "rtl" : "ltr"}
          className="text-[11px] text-muted-foreground"
        >
          {captionReasonLabel(reason, activeLabel)}
        </span>
      )}
    </div>
  );
};

export default CaptionPicker;
