import { Moon, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { getHijriInfo } from "@/lib/ramadan";

/**
 * Ramadan Mode banner — only renders during Ramaḍān. Highlights Laylat al-Qadr
 * awareness during the last ten nights. Purely presentational; no client toggles.
 */
export default function RamadanBanner() {
  const h = getHijriInfo();
  if (!h.isRamadan) return null;

  const title = h.isLastTen
    ? `Last Ten Nights · ${h.day} Ramaḍān`
    : `Ramaḍān Mubārak · ${h.day} Ramaḍān`;
  const subtitle = h.isLastTen
    ? "Seek Laylat al-Qadr — better than a thousand months."
    : "The month of the Qurʾān. May Allāh accept your fasting and qiyām.";

  return (
    <div className="mx-auto max-w-[1800px] px-4 pt-3 md:px-6">
      <Link
        to="/duas"
        className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-4 py-3 transition-colors hover:border-primary/50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
          {h.isLastTen ? <Star className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{title}</div>
          <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
        </div>
        <span className="hidden shrink-0 text-xs font-medium text-primary group-hover:underline sm:inline">
          Open Duʿāʾ Wall →
        </span>
      </Link>
    </div>
  );
}
