// Phase 10 — App-icon picker surfaced from Profile / Settings.

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { APP_ICON_VARIANTS, getSelectedIconId, setAppIcon } from "@/lib/appIcon";
import { soundTap } from "@/lib/soundHaptics";
import { cn } from "@/lib/utils";

export default function AppIconPicker() {
  const [current, setCurrent] = useState<string>(() => getSelectedIconId());

  useEffect(() => {
    // Ensure DOM reflects stored selection at mount (in case main.tsx didn't yet).
    setAppIcon(current).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (id: string) => {
    setCurrent(id);
    soundTap();
    setAppIcon(id).catch(() => {});
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">App icon</h2>
        <p className="text-xs text-muted-foreground">
          Pick the icon shown on your home screen and browser tab. Native devices update on next app open.
        </p>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {APP_ICON_VARIANTS.map((v) => {
          const active = v.id === current;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => choose(v.id)}
              className={cn(
                "group relative flex flex-col items-center gap-2 rounded-xl border p-2 text-xs transition-colors",
                active ? "border-primary bg-primary/5" : "border-border hover:bg-secondary",
              )}
              aria-pressed={active}
              aria-label={`Use ${v.label} icon`}
            >
              <span
                className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl shadow-sm"
                style={{ backgroundColor: v.swatch }}
              >
                <img
                  src={v.href}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                />
                {active && (
                  <span className="absolute inset-0 flex items-center justify-center bg-primary/40">
                    <Check className="h-6 w-6 text-primary-foreground" />
                  </span>
                )}
              </span>
              <span className="text-foreground">{v.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
