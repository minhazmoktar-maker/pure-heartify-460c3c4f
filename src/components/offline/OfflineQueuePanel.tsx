import { Loader2, RotateCw, X, Check, AlertTriangle, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import type { QueueItem, QueueStatus } from "@/lib/offlineQueue";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<QueueStatus, string> = {
  queued: "Queued",
  downloading: "Downloading",
  retrying: "Retrying",
  completed: "Saved offline",
  failed: "Failed",
  cancelled: "Cancelled",
};

function StatusIcon({ status }: { status: QueueStatus }) {
  if (status === "downloading") return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
  if (status === "retrying") return <RotateCw className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />;
  if (status === "completed") return <Check className="w-4 h-4 text-primary" />;
  if (status === "failed") return <AlertTriangle className="w-4 h-4 text-destructive" />;
  if (status === "cancelled") return <X className="w-4 h-4 text-muted-foreground" />;
  return <Clock className="w-4 h-4 text-muted-foreground" />;
}

function Row({
  item,
  onRetry,
  onCancel,
  onRemove,
}: {
  item: QueueItem;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const inFlight = item.status === "downloading" || item.status === "retrying";
  const secondsToRetry = item.nextAttemptAt
    ? Math.max(0, Math.ceil((item.nextAttemptAt - Date.now()) / 1000))
    : 0;

  return (
    <li className="rounded-card border p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0"><StatusIcon status={item.status} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{item.title}</p>
          <p className="text-micro text-muted-foreground mt-0.5">
            {STATUS_LABEL[item.status]}
            {item.status === "downloading" && ` · ${item.pct}%`}
            {item.status === "retrying" &&
              ` · attempt ${item.attempt}/${item.maxAttempts}${secondsToRetry ? ` in ${secondsToRetry}s` : ""}`}
            {item.status === "failed" && item.error ? ` · ${item.error}` : ""}
          </p>
          {inFlight && <Progress value={item.pct} className="h-1 mt-2" />}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {inFlight && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCancel(item.id)}
              aria-label={`Cancel download of ${item.title}`}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          {(item.status === "failed" || item.status === "cancelled") && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRetry(item.id)}
              aria-label={`Retry download of ${item.title}`}
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          )}
          {!inFlight && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(item.id)}
              aria-label={`Remove ${item.title} from the queue`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function OfflineQueuePanel({ className }: { className?: string }) {
  const { items, active, finished, retry, cancel, remove, clearFinished, cancelAll } = useOfflineQueue();

  if (items.length === 0) return null;

  return (
    <section className={cn("mt-6", className)} aria-label="Download queue">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          Download queue
          {active.length > 0 && <Badge variant="secondary">{active.length} active</Badge>}
        </h2>
        <div className="flex gap-1">
          {active.length > 0 && (
            <Button variant="ghost" size="sm" onClick={cancelAll}>Cancel all</Button>
          )}
          {finished.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFinished}>Clear finished</Button>
          )}
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <Row
            key={item.id}
            item={item}
            onRetry={retry}
            onCancel={cancel}
            onRemove={(id) => void remove(id)}
          />
        ))}
      </ul>
    </section>
  );
}
