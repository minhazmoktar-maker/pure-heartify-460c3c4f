import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Download, Clock, Crown } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import { useEntitlement } from "@/hooks/useEntitlement";
import OfflineQueuePanel from "@/components/offline/OfflineQueuePanel";
import OfflineDownloadSettingsCard from "@/components/offline/OfflineDownloadSettingsCard";
import {
  listOfflineMeta,
  removeOfflineTrack,
  purgeExpiredOffline,
  OFFLINE_LIMITS,
  type OfflineMeta,
} from "@/lib/audioOffline";

function formatRemaining(expiresAt: number | null): string {
  if (expiresAt === null) return "Never expires";
  const ms = expiresAt - Date.now();
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

export default function OfflineLibrary() {
  const { isPremium, loading } = useEntitlement();
  const [items, setItems] = useState<OfflineMeta[]>([]);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    await purgeExpiredOffline();
    const rows = await listOfflineMeta();
    setItems(rows.sort((a, b) => b.savedAt - a.savedAt));
  }

  useEffect(() => { void refresh(); }, []);

  async function handleRemove(id: string) {
    setBusy(true);
    try {
      await removeOfflineTrack(id);
      toast.success("Removed from offline");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const freeUsed = items.filter((m) => m.plan === "free").length;

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Offline Library — Heartify"
        description="Your downloaded recitations and audio, available without a connection."
        path="/offline"
      />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <PageHeader
          title="Offline Library"
          subtitle={
            loading
              ? "Checking your plan…"
              : isPremium
                ? "Heartify+ · unlimited downloads, no expiry."
                : `Free plan · ${freeUsed}/${OFFLINE_LIMITS.FREE_LIMIT} slots used. Downloads expire after 24 hours.`
          }
          icon={Download}
          backHref="/"
          actions={
            !loading && !isPremium ? (
              <Button asChild size="sm" variant="default">
                <Link to="/plus">
                  <Crown className="w-4 h-4" /> Upgrade
                </Link>
              </Button>
            ) : undefined
          }
        />

        {items.length === 0 ? (
          <EmptyState
            icon={Download}
            title="Nothing downloaded yet"
            description="Tap the download button on any track to save it for offline listening — perfect for flights, commutes, and Jumu'ah."
            actionLabel="Browse audio"
            actionHref="/audio"
          />
        ) : (
          <ul className="space-y-2">
            {items.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-card border p-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm truncate">{m.id}</p>
                  <p className="text-micro text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {formatRemaining(m.expiresAt)}
                    {m.plan === "premium" && (
                      <span className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Crown className="w-3 h-3" /> Plus
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={busy}
                  onClick={() => handleRemove(m.id)}
                  aria-label={`Remove ${m.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
