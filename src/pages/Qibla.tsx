import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Compass, MapPin, Navigation2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Kaaba
const KAABA = { lat: 21.4225, lon: 39.8262 };

function toRad(d: number) { return (d * Math.PI) / 180; }
function toDeg(r: number) { return (r * 180) / Math.PI; }

function qiblaBearing(lat: number, lon: number) {
  const φ1 = toRad(lat), φ2 = toRad(KAABA.lat);
  const Δλ = toRad(KAABA.lon - lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function distanceKm(lat: number, lon: number) {
  const R = 6371;
  const φ1 = toRad(lat), φ2 = toRad(KAABA.lat);
  const Δφ = toRad(KAABA.lat - lat);
  const Δλ = toRad(KAABA.lon - lon);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Qibla() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [orientationPermission, setOrientationPermission] = useState<"unknown" | "granted" | "denied">("unknown");

  const bearing = coords ? qiblaBearing(coords.lat, coords.lon) : null;
  const distance = coords ? distanceKm(coords.lat, coords.lon) : null;
  const needleAngle = useMemo(() => {
    if (bearing == null) return 0;
    if (heading == null) return bearing; // static
    return (bearing - heading + 360) % 360;
  }, [bearing, heading]);

  const getLocation = () => {
    if (!("geolocation" in navigator)) return toast.error("Geolocation is not available.");
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => toast.error(err.message || "Could not get location"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const enableOrientation = async () => {
    const DOE: any = (window as any).DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === "function") {
      try {
        const res = await DOE.requestPermission();
        setOrientationPermission(res === "granted" ? "granted" : "denied");
      } catch { setOrientationPermission("denied"); }
    } else {
      setOrientationPermission("granted");
    }
  };

  useEffect(() => {
    if (orientationPermission !== "granted") return;
    const onOrient = (e: DeviceOrientationEvent) => {
      const wk = (e as any).webkitCompassHeading;
      if (typeof wk === "number") setHeading(wk);
      else if (typeof e.alpha === "number") setHeading((360 - e.alpha) % 360);
    };
    window.addEventListener("deviceorientationabsolute", onOrient as any, true);
    window.addEventListener("deviceorientation", onOrient, true);
    return () => {
      window.removeEventListener("deviceorientationabsolute", onOrient as any, true);
      window.removeEventListener("deviceorientation", onOrient, true);
    };
  }, [orientationPermission]);

  const applyManual = () => {
    const lat = parseFloat(manualLat), lon = parseFloat(manualLon);
    if (isNaN(lat) || isNaN(lon)) return toast.error("Enter valid coordinates");
    setCoords({ lat, lon });
  };

  return (
    <div className="min-h-dvh bg-background">
      <Helmet>
        <title>Qibla Compass — Heartify</title>
        <meta name="description" content="Find the direction of the Kaaba from your location with a live compass." />
      </Helmet>
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 pb-24 pt-24">
        <header className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Compass className="h-4 w-4" /> Direction</div>
          <h1 className="text-title font-bold tracking-tight md:text-display">Qibla Compass</h1>
          <p className="mt-1 text-muted-foreground">Great-circle bearing from your location to the Kaaba in Makkah.</p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Location</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={getLocation} className="w-full"><MapPin className="mr-2 h-4 w-4" />Use my location</Button>
              <div className="text-center text-micro text-muted-foreground">or enter manually</div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Latitude" value={manualLat} onChange={(e) => setManualLat(e.target.value)} />
                <Input placeholder="Longitude" value={manualLon} onChange={(e) => setManualLon(e.target.value)} />
              </div>
              <Button variant="outline" className="w-full" onClick={applyManual}>Apply coordinates</Button>
              {coords && (
                <div className="rounded-card border p-3 text-sm">
                  <div>Lat: <span className="font-mono">{coords.lat.toFixed(4)}</span></div>
                  <div>Lon: <span className="font-mono">{coords.lon.toFixed(4)}</span></div>
                  <div className="mt-1">Distance to Kaaba: <span className="font-medium">{distance?.toFixed(0)} km</span></div>
                  <div>Qibla bearing (true N): <span className="font-medium">{bearing?.toFixed(1)}°</span></div>
                </div>
              )}
              {orientationPermission !== "granted" && (
                <Button variant="secondary" className="w-full" onClick={enableOrientation}>
                  <Navigation2 className="mr-2 h-4 w-4" />Enable live compass
                </Button>
              )}
              {orientationPermission === "granted" && heading != null && (
                <div className="text-micro text-muted-foreground">Live heading: {heading.toFixed(0)}°</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Compass</CardTitle></CardHeader>
            <CardContent>
              <div className="relative mx-auto aspect-square w-full max-w-[280px]">
                <div className="absolute inset-0 rounded-pill border-4 border-border bg-muted/30" />
                {["N", "E", "S", "W"].map((label, i) => (
                  <div key={label} className="absolute inset-0 flex items-start justify-center text-sm font-semibold" style={{ transform: `rotate(${i * 90}deg)` }}>
                    <span className="mt-2" style={{ transform: `rotate(${-i * 90}deg)` }}>{label}</span>
                  </div>
                ))}
                {coords ? (
                  <div className="absolute inset-0 transition-transform duration-short" style={{ transform: `rotate(${needleAngle}deg)` }}>
                    <div className="absolute left-1/2 top-4 h-[45%] w-1 -translate-x-1/2 rounded bg-primary" />
                    <div className="absolute left-1/2 top-2 -translate-x-1/2 text-heading">🕋</div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-micro text-muted-foreground">Set location first</div>
                )}
                <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-foreground" />
              </div>
              <p className="mt-4 text-center text-micro text-muted-foreground">
                {heading == null ? "Static view — needle points to Qibla bearing from true North." : "Live view — needle points to the Kaaba as you rotate your device."}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
