import { Settings2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useOfflineSettings } from "@/hooks/useOfflineQueue";
import { OFFLINE_SETTINGS_LIMITS, type OfflinePresetName } from "@/lib/offlineSettings";
import { cn } from "@/lib/utils";

const PRESETS: { name: OfflinePresetName; label: string; hint: string }[] = [
  { name: "fast", label: "Fast", hint: "Give up quickly" },
  { name: "balanced", label: "Balanced", hint: "Recommended" },
  { name: "patient", label: "Patient", hint: "Slow connections" },
];

export default function OfflineDownloadSettingsCard({ className }: { className?: string }) {
  const { settings, preset, update, applyPreset, reset } = useOfflineSettings();

  return (
    <section className={cn("rounded-card border p-4", className)} aria-label="Download behaviour">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Settings2 className="w-4 h-4" /> Download behaviour
        </h2>
        <Button variant="ghost" size="sm" onClick={reset} aria-label="Reset download settings">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </Button>
      </div>
      <p className="text-micro text-muted-foreground mt-1">
        On a weak connection, allow more attempts and more time. Interrupted downloads resume
        where they stopped instead of starting over.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => applyPreset(p.name)}
            aria-pressed={preset === p.name}
            className={cn(
              "min-h-11 rounded-card border px-3 py-2 text-left transition-colors",
              preset === p.name ? "border-primary bg-secondary" : "hover:bg-secondary",
            )}
          >
            <span className="block text-sm font-medium">{p.label}</span>
            <span className="block text-micro text-muted-foreground">{p.hint}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="offline-attempts">Max attempts</Label>
            <span className="text-micro text-muted-foreground">{settings.maxAttempts}</span>
          </div>
          <Slider
            id="offline-attempts"
            className="mt-2"
            min={OFFLINE_SETTINGS_LIMITS.maxAttempts[0]}
            max={OFFLINE_SETTINGS_LIMITS.maxAttempts[1]}
            step={1}
            value={[settings.maxAttempts]}
            onValueChange={([v]) => update({ maxAttempts: v })}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="offline-total">Max time per track</Label>
            <span className="text-micro text-muted-foreground">
              {Math.round(settings.maxTotalMs / 1000)}s
            </span>
          </div>
          <Slider
            id="offline-total"
            className="mt-2"
            min={OFFLINE_SETTINGS_LIMITS.maxTotalMs[0] / 1000}
            max={OFFLINE_SETTINGS_LIMITS.maxTotalMs[1] / 1000}
            step={15}
            value={[Math.round(settings.maxTotalMs / 1000)]}
            onValueChange={([v]) => update({ maxTotalMs: v * 1000 })}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="offline-backoff">Max wait between retries</Label>
            <span className="text-micro text-muted-foreground">
              {Math.round(settings.maxBackoffMs / 1000)}s
            </span>
          </div>
          <Slider
            id="offline-backoff"
            className="mt-2"
            min={1}
            max={OFFLINE_SETTINGS_LIMITS.maxBackoffMs[1] / 1000}
            step={1}
            value={[Math.max(1, Math.round(settings.maxBackoffMs / 1000))]}
            onValueChange={([v]) => update({ maxBackoffMs: v * 1000 })}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="offline-concurrency">Simultaneous downloads</Label>
            <span className="text-micro text-muted-foreground">{settings.concurrency}</span>
          </div>
          <Slider
            id="offline-concurrency"
            className="mt-2"
            min={OFFLINE_SETTINGS_LIMITS.concurrency[0]}
            max={OFFLINE_SETTINGS_LIMITS.concurrency[1]}
            step={1}
            value={[settings.concurrency]}
            onValueChange={([v]) => update({ concurrency: v })}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="offline-resume" className="leading-snug">
            Resume interrupted downloads
            <span className="block text-micro font-normal text-muted-foreground">
              Continues with a Range request instead of restarting.
            </span>
          </Label>
          <Switch
            id="offline-resume"
            checked={settings.resume}
            onCheckedChange={(v) => update({ resume: v })}
          />
        </div>
      </div>
    </section>
  );
}
