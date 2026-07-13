// Phase 10 — Theme mode selector (light / dark / auto).
// Auto follows sunrise → Maghrib for the user's saved prayer location.

import { Moon, Sun, Sunrise } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { soundTap } from "@/lib/soundHaptics";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "auto", label: "Auto", icon: Sunrise, hint: "Follows sunrise & Maghrib" },
] as const;

export default function ThemeModeSetting() {
  const { mode, setMode } = useTheme();
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
        <p className="text-xs text-muted-foreground">
          Auto uses your saved prayer location — light during the day, dark from Maghrib until sunrise.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map(({ id, label, icon: Icon, hint }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => { soundTap(); setMode(id); }}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition-colors",
                active ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:bg-secondary",
              )}
              title={"hint" in (id === "auto" ? { hint } : {}) ? hint : label}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
