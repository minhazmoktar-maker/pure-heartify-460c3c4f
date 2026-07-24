import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { isJumuahWindow } from "@/lib/jumuah";
import { getHijriInfo } from "@/lib/ramadan";

/**
 * Jumu‘ah reminder — appears from Thursday evening through Friday night in the
 * viewer's local timezone. Hidden during Ramaḍān to avoid stacking with the
 * Ramaḍān banner. Purely presentational, deep-links to Surah al-Kahf.
 */
export default function JumuahBanner() {
  if (!isJumuahWindow()) return null;
  if (getHijriInfo().isRamadan) return null;

  return (
    <div className="mx-auto max-w-[1800px] px-4 pt-3 md:px-6">
      <Link
        to="/listen?surah=18"
        className="group relative flex items-center gap-3 overflow-hidden rounded-card border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-4 py-3 transition-colors hover:border-primary/50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-primary/20 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">
            Jumu‘ah Mubārak
          </div>
          <div className="truncate text-micro text-muted-foreground">
            Recite Sūrat al-Kahf and send abundant ṣalawāt on the Prophet ﷺ.
          </div>
        </div>
        <span className="hidden shrink-0 text-micro font-medium text-primary group-hover:underline sm:inline">
          Listen to al-Kahf →
        </span>
      </Link>
    </div>
  );
}
