import { Link } from "react-router-dom";
import { MORE_NAV_ITEMS } from "@/config/nav";

/**
 * MoreGrid — the "supporting Islamic tools" surface on Profile.
 *
 * Heartify's spine is halal video discovery. Ancillary tools
 * (Qur'an, Prayer, Dhikr, Zakat, Journal, etc.) live here rather
 * than competing for tab real-estate on the bottom bar.
 */
export default function MoreGrid() {
  return (
    <section aria-labelledby="more-tools" className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="more-tools" className="font-heading text-heading font-semibold text-foreground">
          More tools
        </h2>
        <p className="text-xs text-muted-foreground">Islamic utilities that complement your feed</p>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {MORE_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="group flex min-h-[64px] items-center gap-3 rounded-card border border-border/50 bg-card/60 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-card focus-visible:border-primary focus-visible:outline-none"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-primary/10">
                <Icon className="h-4 w-4 text-primary" aria-hidden />
              </span>
              <span className="text-sm font-medium text-foreground">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
