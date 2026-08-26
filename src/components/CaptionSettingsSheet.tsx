/**
 * Caption display settings — font size, backing plate, line height and RTL
 * mirroring — with a live preview line so the effect is visible before closing.
 * Used on Watch and on Originals; settings persist per device.
 */
import { Settings2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { captionLineStyle, useCaptionSettings, type CaptionSettings } from "@/hooks/useCaptionSettings";

const BACKGROUNDS: Array<{ value: CaptionSettings["background"]; label: string }> = [
  { value: "none", label: "None" },
  { value: "soft", label: "Soft" },
  { value: "solid", label: "Solid" },
];

interface Props {
  /** Preview text uses the active caption language so RTL is visible. */
  previewRtl?: boolean;
  testId?: string;
}

const CaptionSettingsSheet = ({ previewRtl = false, testId = "caption-settings" }: Props) => {
  const { settings, update, reset } = useCaptionSettings();

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
      <PopoverContent align="start" className="w-72 space-y-4" data-testid={`${testId}-panel`}>
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
          <Label className="text-xs">Text size · {Math.round(settings.fontScale * 100)}%</Label>
          <Slider
            value={[settings.fontScale]}
            min={0.8}
            max={1.8}
            step={0.1}
            onValueChange={([v]) => update({ fontScale: v })}
            aria-label="Caption text size"
            data-testid={`${testId}-font-scale`}
          />
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
                className={`min-h-[36px] flex-1 rounded-input border px-2 text-xs transition-colors ${
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
