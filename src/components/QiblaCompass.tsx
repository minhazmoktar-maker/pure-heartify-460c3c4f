import { useEffect, useState } from "react";
import { Compass } from "lucide-react";

interface Props {
  bearing: number; // qibla bearing from north (degrees), clockwise
}

/**
 * Displays a compass rose. When device orientation is available, the compass
 * rotates so the Qibla arrow points at the Kaaba relative to the user's heading.
 * Falls back to a static rose showing bearing from north.
 */
export default function QiblaCompass({ bearing }: Props) {
  const [heading, setHeading] = useState<number | null>(null);
  const [supported, setSupported] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const DOE = (window as unknown as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> })
      | undefined;
    if (!DOE) return;
    setSupported(true);
    if (typeof DOE.requestPermission === "function") setNeedsPermission(true);
    else attach();
    return () => {
      window.removeEventListener("deviceorientationabsolute", handler as EventListener);
      window.removeEventListener("deviceorientation", handler as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handler = (e: DeviceOrientationEvent) => {
    const anyE = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
    const h =
      typeof anyE.webkitCompassHeading === "number"
        ? anyE.webkitCompassHeading
        : e.alpha != null
          ? 360 - e.alpha
          : null;
    if (h != null) setHeading(h);
  };

  const attach = () => {
    window.addEventListener("deviceorientationabsolute", handler as EventListener, true);
    window.addEventListener("deviceorientation", handler as EventListener, true);
  };

  const requestPermission = async () => {
    const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    if (DOE?.requestPermission) {
      const res = await DOE.requestPermission();
      if (res === "granted") {
        setNeedsPermission(false);
        attach();
      }
    }
  };

  const arrowRotation = heading != null ? bearing - heading : bearing;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-56 w-56">
        <div
          className="absolute inset-0 rounded-full border-4 border-border bg-card shadow-inner transition-transform duration-200"
          style={{ transform: heading != null ? `rotate(${-heading}deg)` : undefined }}
        >
          <div className="absolute left-1/2 top-2 -translate-x-1/2 text-xs font-bold text-muted-foreground">N</div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold text-muted-foreground">S</div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">E</div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">W</div>
        </div>
        <div
          className="absolute inset-0 flex items-start justify-center transition-transform duration-200"
          style={{ transform: `rotate(${arrowRotation}deg)` }}
        >
          <div className="mt-3 flex flex-col items-center">
            <div className="text-2xl">🕋</div>
            <div className="mt-1 h-24 w-1 rounded bg-primary" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Compass className="h-4 w-4" />
        <span>Qibla: {bearing.toFixed(1)}° from North</span>
      </div>
      {supported && needsPermission && (
        <button
          onClick={requestPermission}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Enable compass
        </button>
      )}
      {!supported && (
        <p className="max-w-xs text-center text-xs text-muted-foreground">
          Live compass unavailable on this device. Arrow shows Qibla bearing from true North.
        </p>
      )}
    </div>
  );
}
