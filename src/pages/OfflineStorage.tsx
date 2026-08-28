import { useCallback, useEffect, useMemo, useState } from "react";
import { HardDrive, Trash2, ChevronDown, Crown } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import {
  listOfflineUsage, removeOfflineTrack, clearAllOffline, purgeExpiredOffline,
  offlineQuotaEstimate, type OfflineUsageRow,
} from "@/lib/audioOffline";
import {
  formatBytes, groupUsageByReciter, parseSurahTrackId, totalOfflineBytes,
} from "@/lib/offlineStorage";
import { reciterById } from "@/data/reciters";
import { SURAHS } from "@/data/surahs";

const surahName = (n: number) => SURAHS.find((s) => s.number === n)?.nameEn ?? `Surah ${n}`;

export default function OfflineStorage() {
  const [rows, setRows] = useState<OfflineUsageRow[]>([]);
  const [quota, setQuota] = useState<{ usage: number; quota: number } | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    await purgeExpiredOffline();
    setRows(await listOfflineUsage());
    setQuota(await offlineQuotaEstimate());
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const total = useMemo(() => totalOfflineBytes(rows), [rows]);
  const groups = useMemo(() => groupUsageByReciter(rows), [rows]);
  const quotaPct = quota && quota.quota > 0 ? Math.min(100, Math.round((total / quota.quota) * 100)) : null;

  async function removeOne(id: string) {
    setBusy(true);
    try {
      await removeOfflineTrack(id);
      await refresh();
      toast.success("Download deleted");
    } finally { setBusy(false); }
  }

  async function clearEverything() {
    setBusy(true);
    try {
      const n = await clearAllOffline();
      await refresh();
      toast.success(n > 0 ? `Cleared ${n} download${n === 1 ? "" : "s"}` : "Nothing to clear");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Download Storage — Heartify"
        description="See how much space your downloaded Qur'an recitations use and free it up surah by surah."
        path="/offline/storage"
      />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader
          title="Storage"
          subtitle="How much space your downloads use — remove single surahs or clear everything."
          icon={HardDrive}
          backHref="/offline"
        />

        <section className="rounded-card border p-4" aria-label="Storage summary">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-micro uppercase tracking-wide text-muted-foreground">Downloaded audio</p>
              <p className="text-2xl font-semibold tabular-nums">{formatBytes(total)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {rows.length} file{rows.length === 1 ? "" : "s"}
                {quota ? ` · about ${formatBytes(quota.quota)} available on this device` : ""}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={busy || rows.length === 0}>
                  <Trash2 className="h-4 w-4" /> Clear all
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all downloads?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes every downloaded surah from this device ({formatBytes(total)}).
                    You can download them again at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep downloads</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void clearEverything()}>Clear all</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          {quotaPct !== null && (
            <Progress value={quotaPct} className="mt-4 h-2" aria-label="Share of device storage used by downloads" />
          )}
        </section>

        {rows.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={HardDrive}
            title="No downloads on this device"
            description="Download a surah or a whole Qur'an from any reciter to listen without a connection."
            actionLabel="Browse reciters"
            actionHref="/listen"
          />
        ) : (
          <ul className="mt-6 space-y-3">
            {groups.map((g) => {
              const reciter = reciterById(g.reciterId);
              const expanded = open[g.reciterId] ?? false;
              return (
                <li key={g.reciterId} className="rounded-card border">
                  <button
                    type="button"
                    onClick={() => setOpen((s) => ({ ...s, [g.reciterId]: !expanded }))}
                    aria-expanded={expanded}
                    className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {reciter?.name ?? (g.reciterId === "other" ? "Other audio" : g.reciterId)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {g.count} file{g.count === 1 ? "" : "s"} · {formatBytes(g.bytes)}
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>

                  {expanded && (
                    <ul className="border-t">
                      {g.rows.map((r) => {
                        const parsed = parseSurahTrackId(r.id);
                        return (
                          <li key={r.id} className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2">
                            <span className="min-w-0">
                              <span className="block truncate text-sm">
                                {parsed ? `${parsed.surah}. ${surahName(parsed.surah)}` : r.id}
                              </span>
                              <span className="flex items-center gap-1 text-micro text-muted-foreground">
                                {formatBytes(r.bytes)}
                                {r.plan === "premium" && (
                                  <>
                                    <span aria-hidden>·</span>
                                    <Crown className="h-3 w-3" aria-hidden /> Plus
                                  </>
                                )}
                              </span>
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={busy}
                              onClick={() => void removeOne(r.id)}
                              aria-label={`Delete ${parsed ? surahName(parsed.surah) : r.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
