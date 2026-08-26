/**
 * Caption display settings — size, backing plate, line height, RTL mirroring
 * and the accessibility layer (high contrast, text edge, OS font scaling) —
 * with a live preview line so the effect is visible before closing.
 *
 * Used on Watch and on Originals. Settings apply instantly on the device and,
 * for signed-in viewers, follow them to every other device.
 */
import { Settings2, RotateCcw, Accessibility } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CAPTION_SIZE_PRESETS,
  captionLineStyle,
  effectiveCaptionScale,
  osFontScale,
  useCaptionSettings,
  type CaptionSettings,
  type CaptionSizePreset,
} from "@/hooks/useCaptionSettings";

const BACKGROUNDS: Array<{ value: CaptionSettings["background"]; label: string }> = [
  { value: "none", label: "None" },
  { value: "soft", label: "Soft" },
  { value: "solid", label: "Solid" },
];

const SIZE_PRESETS: Array<{ value: Exclude<CaptionSizePreset, "custom">; label: string }> = [
  { value: "small", label: "S" },
  { value: "medium", label: "M" },
  { value: "large", label: "L" },
  { value: "xlarge", label: "XL" },
];

interface Props {
  /** Preview text uses the active caption language so RTL is visible. */
  previewRtl?: boolean;
  testId?: string;
}

const CaptionSettingsSheet = ({ previewRtl = false, testId = "caption-settings" }: Props) => {
  const { settings, update, reset } = useCaptionSettings();
  const osScale = osFontScale();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid={`${testId}-trigger`}
          aria-label="Caption display settings"
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-pill border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent/50"
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span>Caption style</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-[70vh] w-72 space-y-4 overflow-y-auto"
        data-testid={`${testId}-panel`}
      >
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="caption-enabled" className="text-xs">
            Show captions
          </Label>
          <Switch
            id="caption-enabled"
            checked={settings.enabled}
            onCheckedChange={(v) => update({ enabled: v })}
            data-testid={`${testId}-enabled`}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Text size</Label>
          <div className="flex gap-2">
            {SIZE_PRESETS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => update({ sizePreset: option.value, fontScale: CAPTION_SIZE_PRESETS[option.value] })}
                data-testid={`${testId}-size-${option.value}`}
                aria-pressed={settings.sizePreset === option.value}
                aria-label={`Caption text size ${option.label}`}
                className={`min-h-[36px] flex-1 rounded-input border px-2 text-xs transition-colors ${
                  settings.sizePreset === option.value
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-border text-muted-foreground hover:bg-accent/50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Slider
            value={[settings.fontScale]}
            min={0.8}
            max={2.4}
            step={0.05}
            onValueChange={([v]) => update({ fontScale: v, sizePreset: "custom" })}
            aria-label="Caption text size (fine)"
            data-testid={`${testId}-font-scale`}
          />
          <p className="text-[11px] text-muted-foreground" data-testid={`${testId}-effective-scale`}>
            Rendering at {Math.round(effectiveCaptionScale(settings) * 100)}%
            {settings.followOsScaling && Math.abs(osScale - 1) > 0.01
              ? ` (includes your device text size, ${Math.round(osScale * 100)}%)`
              : ""}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Line height · {settings.lineHeight.toFixed(1)}</Label>
          <Slider
            value={[settings.lineHeight]}
            min={1.1}
            max={2}
            step={0.1}
            onValueChange={([v]) => update({ lineHeight: v })}
            aria-label="Caption line height"
            data-testid={`${testId}-line-height`}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Background</Label>
          <div className="flex gap-2">
            {BACKGROUNDS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => update({ background: option.value })}
                data-testid={`${testId}-bg-${option.value}`}
                aria-pressed={settings.background === option.value}
                disabled={settings.highContrast}
                className={`min-h-[36px] flex-1 rounded-input border px-2 text-xs transition-colors disabled:opacity-50 ${
                  settings.background === option.value
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-border text-muted-foreground hover:bg-accent/50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
            <Accessibility className="h-3.5 w-3.5" aria-hidden="true" /> Accessibility
          </p>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="caption-high-contrast" className="text-xs font-normal">
              High contrast (white on black)
            </Label>
            <Switch
              id="caption-high-contrast"
              checked={settings.highContrast}
              onCheckedChange={(v) => update({ highContrast: v })}
              data-testid={`${testId}-high-contrast`}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-normal">
              Text edge · {Math.round(settings.edgeOpacity * 100)}%
            </Label>
            <Slider
              value={[settings.edgeOpacity]}
              min={0}
              max={1}
              step={0.05}
              disabled={settings.highContrast}
              onValueChange={([v]) => update({ edgeOpacity: v })}
              aria-label="Caption text edge opacity"
              data-testid={`${testId}-edge-opacity`}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="caption-os-scaling" className="text-xs font-normal">
              Follow device text size
            </Label>
            <Switch
              id="caption-os-scaling"
              checked={settings.followOsScaling}
              onCheckedChange={(v) => update({ followOsScaling: v })}
              data-testid={`${testId}-os-scaling`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="caption-rtl" className="text-xs">
            Mirror layout for RTL captions
          </Label>
          <Switch
            id="caption-rtl"
            checked={settings.mirrorRtl}
            onCheckedChange={(v) => update({ mirrorRtl: v })}
            data-testid={`${testId}-mirror-rtl`}
          />
        </div>

        <div className="rounded-lg bg-black/80 p-2">
          <p
            data-testid={`${testId}-preview`}
            className="rounded px-2 py-1 text-sm text-white"
            style={captionLineStyle(settings, previewRtl)}
          >
            {previewRtl ? "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ" : "Preview of your caption style"}
          </p>
        </div>

        <Button variant="ghost" size="sm" className="h-9 w-full" onClick={reset} data-testid={`${testId}-reset`}>
          <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset to default
        </Button>
      </PopoverContent>
    </Popover>
  );
};

export default CaptionSettingsSheet;
