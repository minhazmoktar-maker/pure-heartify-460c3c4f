/**
 * Timed caption-loading indicator.
 *
 * A spinner tells a viewer nothing about whether captions are 200 ms away or
 * stalled on a 2G connection. This bar advances against the *expected* load
 * time for the current network class, then honestly downgrades to "still
 * loading" and finally "slow connection" rather than pretending to be at 99%.
 */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  captionNetworkClass,
  expectedCaptionLoadMs,
  isSlowCaptionNetwork,
} from "@/lib/captionPerf";

interface Props {
  loading: boolean;
  label?: string;
  testId?: string;
}

const TICK_MS = 120;

const CaptionLoadProgress = ({ loading, label = "Loading captions", testId = "caption-load-progress" }: Props) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!loading) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - started), TICK_MS);
    return () => clearInterval(timer);
  }, [loading]);

  if (!loading) return null;

  const expected = expectedCaptionLoadMs();
  // Asymptotic: reaches 90% at the expected time and creeps after, so the bar
  // never claims completion before the data actually lands.
  const pct = Math.min(97, Math.round(90 * (1 - Math.exp(-elapsed / (expected * 0.55)))));
  const overdue = elapsed > expected * 2;
  const slow = isSlowCaptionNetwork();

  const status = overdue
    ? slow
      ? `Still loading — slow connection (${captionNetworkClass()})`
      : "Still loading captions…"
    : label;

  return (
    <div className="space-y-1.5" data-testid={testId} aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        <span data-testid={`${testId}-status`}>{status}</span>
        <span className="ml-auto font-mono tabular-nums" data-testid={`${testId}-elapsed`}>
          {(elapsed / 1000).toFixed(1)}s
        </span>
      </div>
      <div
        className="h-1 w-full overflow-hidden rounded-pill bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div
          className="h-full rounded-pill bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
          data-testid={`${testId}-bar`}
        />
      </div>
    </div>
  );
};

export default CaptionLoadProgress;
