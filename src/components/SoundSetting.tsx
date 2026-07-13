// Phase 10 — Sound preference toggle.

import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isSoundEnabled, setSoundEnabled, soundTap } from "@/lib/soundHaptics";

export default function SoundSetting() {
  const [enabled, setEnabled] = useState(() => isSoundEnabled());

  const toggle = () => {
    const next = !enabled;
    setSoundEnabled(next);
    setEnabled(next);
    if (next) soundTap();
  };

  return (
    <section className="flex items-center justify-between rounded-2xl border border-border bg-card p-5">
      <div className="pr-4">
        <h2 className="text-sm font-semibold text-foreground">Sound &amp; haptics</h2>
        <p className="text-xs text-muted-foreground">
          Soft tones and gentle vibrations for taps, dhikr goals, streak saves and completions.
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={enabled}
        aria-label={enabled ? "Turn sound off" : "Turn sound on"}
        className={`tap-target flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
          enabled ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"
        }`}
      >
        {enabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
      </button>
    </section>
  );
}
