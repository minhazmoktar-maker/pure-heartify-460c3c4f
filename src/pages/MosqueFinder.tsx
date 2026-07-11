import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, Navigation, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Mosque = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  distanceKm: number;
  address?: string;
};

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

async function fetchMosques(lat: number, lon: number, radiusM: number): Promise<Mosque[]> {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lon});
      way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lon});
      relation["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lon});
    );
    out center tags 60;
  `;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error("Overpass API error");
  const data = await res.json();
  const origin = { lat, lon };
  return (data.elements as any[])
    .map((el) => {
      const p = el.type === "node" ? { lat: el.lat, lon: el.lon } : { lat: el.center?.lat, lon: el.center?.lon };
      if (!p.lat || !p.lon) return null;
      const t = el.tags || {};
      const addressParts = [t["addr:housenumber"], t["addr:street"], t["addr:city"]].filter(Boolean);
      return {
        id: el.id,
        name: t.name || t["name:en"] || "Unnamed mosque",
        lat: p.lat,
        lon: p.lon,
        address: addressParts.join(" ") || undefined,
        distanceKm: haversineKm(origin, p),
      } as Mosque;
    })
    .filter(Boolean)
    .sort((a: Mosque, b: Mosque) => a.distanceKm - b.distanceKm) as Mosque[];
}

export default function MosqueFinder() {
  const [loc, setLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);
  const [manual, setManual] = useState("");

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not supported by this browser");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => setLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => {
        setLoading(false);
        toast.error("Location denied — try entering coordinates manually");
        console.warn(err);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  useEffect(() => {
    if (!loc) return;
    let cancelled = false;
    setLoading(true);
    fetchMosques(loc.lat, loc.lon, radiusKm * 1000)
      .then((m) => !cancelled && setMosques(m))
      .catch(() => toast.error("Couldn't reach OpenStreetMap. Please retry."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [loc, radiusKm]);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const m = manual.trim().match(/^(-?\d+(?:\.\d+)?)[ ,]+(-?\d+(?:\.\d+)?)$/);
    if (!m) {
      toast.error("Enter as: latitude, longitude (e.g. 21.4225, 39.8262)");
      return;
    }
    setLoc({ lat: parseFloat(m[1]), lon: parseFloat(m[2]) });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Mosque Finder — Heartify"
        description="Find nearby mosques and Muslim prayer places using OpenStreetMap. Get walking distance and directions."
        path="/mosques"
      />
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <MapPin className="h-7 w-7 text-primary" />
            Mosque Finder
          </h1>
          <p className="mt-1 text-muted-foreground">
            Discover mosques near you using OpenStreetMap community data.
          </p>
        </header>

        <Card className="mb-6">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={requestLocation} disabled={loading}>
                <Navigation className="mr-2 h-4 w-4" />
                Use my location
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Radius:</span>
                {[2, 5, 10, 25].map((r) => (
                  <Button key={r} size="sm" variant={radiusKm === r ? "default" : "outline"} onClick={() => setRadiusKm(r)}>
                    {r} km
                  </Button>
                ))}
              </div>
            </div>
            <form onSubmit={submitManual} className="flex flex-wrap items-center gap-2">
              <Input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="Or enter latitude, longitude (e.g. 21.4225, 39.8262)"
                className="max-w-sm"
                aria-label="Manual coordinates"
              />
              <Button type="submit" variant="outline" size="sm">Search</Button>
            </form>
            {loc && (
              <p className="text-xs text-muted-foreground">
                Searching within {radiusKm} km of {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
              </p>
            )}
          </CardContent>
        </Card>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading nearby mosques…
          </div>
        )}

        {!loading && loc && mosques.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No mosques found within {radiusKm} km. Try increasing the radius.
          </p>
        )}

        {!loading && mosques.length > 0 && (
          <div className="space-y-3">
            {mosques.map((m) => (
              <Card key={m.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base">{m.name}</CardTitle>
                    {m.address && <p className="text-xs text-muted-foreground">{m.address}</p>}
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                    {m.distanceKm < 1 ? `${Math.round(m.distanceKm * 1000)} m` : `${m.distanceKm.toFixed(1)} km`}
                  </span>
                </CardHeader>
                <CardContent className="flex gap-2 pt-0">
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lon}`}
                      target="_blank" rel="noopener noreferrer"
                    >
                      <Navigation className="mr-1 h-3 w-3" /> Directions
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lon}#map=18/${m.lat}/${m.lon}`}
                      target="_blank" rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-1 h-3 w-3" /> Map
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
            <p className="text-center text-[11px] text-muted-foreground">Data © OpenStreetMap contributors</p>
          </div>
        )}
      </main>
    </div>
  );
}
