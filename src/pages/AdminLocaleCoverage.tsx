/**
 * /admin/locale-coverage — localization readiness report.
 *
 * For every locale Heartify declares to iOS/Android (`APP_LOCALES`) this page
 * measures three coverage dimensions against the English source dictionary:
 *   • Strings   — the whole UI dictionary
 *   • Metadata  — app name / store-facing + SEO keys
 *   • Player UI — watch-page and player controls
 * Missing keys are listed explicitly so a translator can act without guessing,
 * and locales declared natively but missing a dictionary are surfaced as gaps.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import SEO from "@/components/SEO";
import { usePermissions } from "@/hooks/usePermissions";
import { APP_LOCALES } from "@/config/globalization";
import { SUPPORTED_LANGUAGES, loadDictionary, type LanguageCode } from "@/i18n";
import enDict from "@/i18n/dictionaries/en.json";

type Dict = Record<string, string>;

/** Key groups. A key can belong to more than one group. */
const GROUPS = {
  metadata: (k: string) => /^(app|seo|meta|store)\./.test(k),
  player: (k: string) => /^(player|watch|video|autoplay)\./.test(k),
} as const;

interface Row {
  language: LanguageCode;
  label: string;
  native: string;
  tags: string[];
  total: number;
  translated: number;
  missing: string[];
  untouched: string[];
  metadata: { total: number; translated: number };
  player: { total: number; translated: number };
}

const EN = enDict as Dict;
const EN_KEYS = Object.keys(EN);

function pct(a: number, b: number) {
  return b === 0 ? 100 : Math.round((a / b) * 100);
}

function coverage(dict: Dict, keys: string[]) {
  let translated = 0;
  const missing: string[] = [];
  const untouched: string[] = [];
  for (const k of keys) {
    const v = dict[k];
    if (v == null || v === "") {
      missing.push(k);
    } else if (v === EN[k]) {
      // Present but identical to English — real for brand names, suspicious
      // everywhere else, so it is reported separately rather than as missing.
      untouched.push(k);
      translated++;
    } else {
      translated++;
    }
  }
  return { translated, missing, untouched };
}

function tone(p: number) {
  if (p >= 100) return "text-emerald-600";
  if (p >= 90) return "text-amber-600";
  return "text-destructive";
}

export default function AdminLocaleCoverage() {
  const { hasMinRole } = usePermissions();
  const isAdmin = hasMinRole("admin") || hasMinRole("owner");
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      const metaKeys = EN_KEYS.filter(GROUPS.metadata);
      const playerKeys = EN_KEYS.filter(GROUPS.player);
      const out: Row[] = [];
      for (const meta of SUPPORTED_LANGUAGES) {
        const dict = (await loadDictionary(meta.code)) as Dict;
        const all = coverage(dict, EN_KEYS);
        out.push({
          language: meta.code,
          label: meta.label,
          native: meta.native,
          tags: APP_LOCALES.filter((l) => l.language === meta.code).map((l) => l.tag),
          total: EN_KEYS.length,
          translated: all.translated,
          missing: all.missing,
          untouched: all.untouched,
          metadata: { total: metaKeys.length, translated: coverage(dict, metaKeys).translated },
          player: { total: playerKeys.length, translated: coverage(dict, playerKeys).translated },
        });
      }
      if (!cancelled) {
        out.sort((a, b) => a.translated / a.total - b.translated / b.total);
        setRows(out);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const summary = useMemo(() => {
    if (!rows) return null;
    const full = rows.filter((r) => r.translated === r.total && r.missing.length === 0);
    const declaredWithoutDict = APP_LOCALES.filter(
      (l) => !SUPPORTED_LANGUAGES.some((s) => s.code === l.language),
    ).map((l) => l.tag);
    return { full: full.length, total: rows.length, declaredWithoutDict };
  }, [rows]);

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">The localization report is restricted.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-6">
      <SEO
        title="Locale coverage — Heartify admin"
        description="Which locales are fully translated across strings, metadata and player UI."
        path="/admin/locale-coverage"
        noBreadcrumbs
      />
      <h1 className="text-xl font-semibold">Locale coverage</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {APP_LOCALES.length} BCP-47 locales declared to iOS &amp; Android · {SUPPORTED_LANGUAGES.length}{" "}
        dictionaries · {EN_KEYS.length} source strings
      </p>

      {!rows && (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Measuring dictionaries…
        </p>
      )}

      {summary && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Fully covered</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {summary.full}/{summary.total}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Native tags</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{APP_LOCALES.length}</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Declared w/o dictionary</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${summary.declaredWithoutDict.length ? "text-destructive" : "text-emerald-600"}`}>
              {summary.declaredWithoutDict.length}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {rows?.map((r) => {
          const p = pct(r.translated, r.total);
          return (
            <Card key={r.language}>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <span>{r.native}</span>
                  <span className="text-xs font-normal text-muted-foreground">{r.label}</span>
                  <Badge variant="outline" className="text-[10px]">{r.language}</Badge>
                  {r.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                  ))}
                  <span className={`ml-auto text-sm font-semibold tabular-nums ${tone(p)}`}>{p}%</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={p} className="h-1.5" />
                <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
                  <span>
                    Strings {r.translated}/{r.total}
                  </span>
                  <span className={tone(pct(r.metadata.translated, r.metadata.total))}>
                    Metadata {r.metadata.translated}/{r.metadata.total}
                  </span>
                  <span className={tone(pct(r.player.translated, r.player.total))}>
                    Player UI {r.player.translated}/{r.player.total}
                  </span>
                  {r.untouched.length > 0 && <span>{r.untouched.length} same as English</span>}
                </div>
                {r.missing.length > 0 && (
                  <p className="text-[11px] text-destructive">
                    Missing: <code className="break-all">{r.missing.join(", ")}</code>
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
