import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, Star } from "lucide-react";

// Islamic events by (hijri month index 1-12, day). Approximate/observational
// dates are noted; Ramadan/Eid depend on moon sighting.
type Event = { m: number; d: number; name: string; note?: string };
const EVENTS: Event[] = [
  { m: 1, d: 1, name: "Islamic New Year" },
  { m: 1, d: 10, name: "Day of Ashura", note: "Recommended fast" },
  { m: 3, d: 12, name: "Mawlid an-Nabi ﷺ", note: "Observance varies" },
  { m: 7, d: 27, name: "Laylat al-Mi'raj", note: "Observance varies" },
  { m: 8, d: 15, name: "Laylat al-Bara'ah" },
  { m: 9, d: 1, name: "Ramadan begins", note: "Subject to moon sighting" },
  { m: 9, d: 27, name: "Laylat al-Qadr (commonly observed)", note: "Odd nights of last 10" },
  { m: 10, d: 1, name: "Eid al-Fitr", note: "Subject to moon sighting" },
  { m: 12, d: 8, name: "Hajj begins (Tarwiyah)" },
  { m: 12, d: 9, name: "Day of Arafah", note: "Recommended fast (non-pilgrim)" },
  { m: 12, d: 10, name: "Eid al-Adha" },
  { m: 12, d: 11, name: "Ayyam al-Tashreeq" },
  { m: 12, d: 12, name: "Ayyam al-Tashreeq" },
  { m: 12, d: 13, name: "Ayyam al-Tashreeq" },
];

const HIJRI_MONTHS = [
  "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
  "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
  "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah",
];

const hijriFormatter = new Intl.DateTimeFormat("en-TN-u-ca-islamic-umalqura", {
  day: "numeric", month: "numeric", year: "numeric",
});

function toHijri(date: Date): { d: number; m: number; y: number } {
  const parts = hijriFormatter.formatToParts(date);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0);
  return { d: get("day"), m: get("month"), y: get("year") };
}

function isSameHijriDay(a: Date, b: Date) {
  const ha = toHijri(a), hb = toHijri(b);
  return ha.d === hb.d && ha.m === hb.m && ha.y === hb.y;
}

export default function HijriCalendar() {
  const today = new Date();
  const todayHijri = useMemo(() => toHijri(today), []);
  const [cursor, setCursor] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  // Build a 42-cell grid for the Gregorian month of the cursor, annotate hijri
  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: { date: Date; hijri: ReturnType<typeof toHijri>; event?: Event }[] = [];
    for (let i = 0; i < 42; i++) {
      const day = i - startDay + 1;
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      const hijri = toHijri(date);
      const event = EVENTS.find(e => e.m === hijri.m && e.d === hijri.d);
      cells.push({ date, hijri, event });
    }
    return cells;
  }, [cursor]);

  const upcoming = useMemo(() => {
    const list: { date: Date; event: Event }[] = [];
    for (let i = 0; i < 400; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const h = toHijri(d);
      const e = EVENTS.find(x => x.m === h.m && x.d === h.d);
      if (e) list.push({ date: d, event: e });
      if (list.length >= 8) break;
    }
    return list;
  }, [today]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Hijri Calendar — Heartify" description="Islamic Hijri calendar with today's date, upcoming events, Ramadan, Hajj, and Eid observances." path="/hijri" />
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2"><CalendarDays className="h-7 w-7 text-primary" />Hijri Calendar</h1>
          <p className="mt-1 text-muted-foreground">
            Today: <span className="font-semibold text-foreground">{todayHijri.d} {HIJRI_MONTHS[todayHijri.m - 1]} {todayHijri.y} AH</span>
            {" · "}{today.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-lg">{monthLabel}</CardTitle>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" aria-label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</Button>
                <Button size="icon" variant="ghost" aria-label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-1">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {grid.map(({ date, hijri, event }, i) => {
                  const inMonth = date.getMonth() === cursor.getMonth();
                  const isToday = isSameHijriDay(date, today) && date.toDateString() === today.toDateString();
                  return (
                    <div
                      key={i}
                      className={`relative min-h-[60px] rounded-md border p-1 text-left text-xs transition ${inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground"} ${isToday ? "ring-2 ring-primary" : ""}`}
                      title={event ? `${event.name}${event.note ? " — " + event.note : ""}` : undefined}
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-semibold">{date.getDate()}</span>
                        <span className="text-[10px] text-muted-foreground">{hijri.d}</span>
                      </div>
                      {event && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-primary">
                          <Star className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{event.name}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">Hijri dates use the Umm al-Qura tabular calendar. Ramadan, Eid, and Mawlid observance may shift ±1 day based on local moon sighting.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Upcoming events</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming events in the next year.</p>}
              {upcoming.map(({ date, event }) => {
                const h = toHijri(date);
                const daysAway = Math.round((date.getTime() - today.getTime()) / 86400000);
                return (
                  <div key={date.toISOString() + event.name} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium">{event.name}</div>
                      <Badge variant="secondary" className="text-[10px]">{daysAway === 0 ? "Today" : `${daysAway}d`}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {h.d} {HIJRI_MONTHS[h.m - 1]} {h.y} AH · {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </div>
                    {event.note && <div className="mt-1 text-[11px] italic text-muted-foreground">{event.note}</div>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
