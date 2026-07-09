import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";

type IEvent = {
  name: string;
  hijri: { month: number; day: number };
  category: "Eid" | "Fasting" | "Hajj" | "Historical" | "Sacred Night";
  significance: string;
  note?: string;
};

// Hijri months
const H_MONTHS = [
  "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
  "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
  "Ramadan", "Shawwal", "Dhul-Qi'dah", "Dhul-Hijjah",
];

const EVENTS: IEvent[] = [
  { name: "Islamic New Year", hijri: { month: 1, day: 1 }, category: "Historical",
    significance: "Marks the beginning of the Hijri calendar and the Prophet's ﷺ migration to Madinah." },
  { name: "Day of Ashura", hijri: { month: 1, day: 10 }, category: "Fasting",
    significance: "Fasting expiates the sins of the previous year. Pair with 9th or 11th Muharram." },
  { name: "First day of Rajab", hijri: { month: 7, day: 1 }, category: "Historical",
    significance: "Start of one of the four sacred months — increase in righteous deeds." },
  { name: "Mid-Sha'ban", hijri: { month: 8, day: 15 }, category: "Historical",
    significance: "The Prophet ﷺ used to fast much of Sha'ban, preparing for Ramadan." },
  { name: "First day of Ramadan", hijri: { month: 9, day: 1 }, category: "Fasting",
    significance: "Start of the obligatory month of fasting — the month of the Qur'an." },
  { name: "Laylat al-Qadr (likely)", hijri: { month: 9, day: 27 }, category: "Sacred Night",
    significance: "Sought in the odd nights of the last 10 of Ramadan — better than a thousand months.",
    note: "Exact night is hidden. 27th is a strong opinion; seek it on 21, 23, 25, 27, 29." },
  { name: "Eid al-Fitr", hijri: { month: 10, day: 1 }, category: "Eid",
    significance: "Celebration marking the end of Ramadan. Zakat al-Fitr is paid before the Eid prayer." },
  { name: "Six of Shawwal (start)", hijri: { month: 10, day: 2 }, category: "Fasting",
    significance: "Fasting six days of Shawwal after Ramadan = reward of fasting the whole year." },
  { name: "First 10 of Dhul-Hijjah", hijri: { month: 12, day: 1 }, category: "Hajj",
    significance: "The most beloved days for righteous deeds — fast, dhikr, tahlil, takbir." },
  { name: "Day of Arafah", hijri: { month: 12, day: 9 }, category: "Hajj",
    significance: "Greatest day of Hajj. For non-pilgrims, fasting expiates the past and coming year." },
  { name: "Eid al-Adha", hijri: { month: 12, day: 10 }, category: "Eid",
    significance: "Celebration of sacrifice, commemorating Ibrahim ﷺ. Udhiyah / Qurbani offered." },
  { name: "Days of Tashriq", hijri: { month: 12, day: 11 }, category: "Hajj",
    significance: "11, 12, 13 Dhul-Hijjah — days of eating, drinking, and remembrance of Allah." },
];

// Kuwaiti algorithm to convert Gregorian ↔ Hijri (approximate, ±1 day)
function gregorianToHijri(date: Date) {
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();

  let jd: number;
  if (year > 1582 || (year === 1582 && month > 10) || (year === 1582 && month === 10 && day > 14)) {
    jd = Math.floor((1461 * (year + 4800 + Math.floor((month - 14) / 12))) / 4) +
      Math.floor((367 * (month - 2 - 12 * Math.floor((month - 14) / 12))) / 12) -
      Math.floor((3 * Math.floor((year + 4900 + Math.floor((month - 14) / 12)) / 100)) / 4) +
      day - 32075;
  } else {
    jd = 367 * year - Math.floor((7 * (year + 5001 + Math.floor((month - 9) / 7))) / 4) +
      Math.floor((275 * month) / 9) + day + 1729777;
  }

  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const m = Math.floor((24 * l3) / 709);
  const d = l3 - Math.floor((709 * m) / 24);
  const y = 30 * n + j - 30;
  return { year: y, month: m, day: d };
}

function hijriToGregorianJD(hy: number, hm: number, hd: number) {
  const jd = Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm -
    Math.floor((hm - 1) / 2) + hd + 1948440 - 385;
  return jd;
}

function jdToDate(jd: number) {
  let l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l) / 2447);
  const d = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const m = j + 2 - 12 * l;
  const y = 100 * (n - 49) + i + l;
  return new Date(Date.UTC(y, m - 1, d));
}

function daysUntil(target: Date) {
  const now = new Date();
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const b = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((b - a) / 86400000);
}

export default function IslamicEvents() {
  const today = new Date();
  const hijriToday = gregorianToHijri(today);

  const rows = useMemo(() => {
    return EVENTS
      .map((e) => {
        // pick current or next hijri year so date is in the future
        let hy = hijriToday.year;
        let jd = hijriToGregorianJD(hy, e.hijri.month, e.hijri.day);
        let d = jdToDate(jd);
        if (daysUntil(d) < 0) {
          hy += 1;
          jd = hijriToGregorianJD(hy, e.hijri.month, e.hijri.day);
          d = jdToDate(jd);
        }
        return { event: e, hijriYear: hy, date: d, days: daysUntil(d) };
      })
      .sort((a, b) => a.days - b.days);
  }, [hijriToday.year]);

  const catColor = (c: IEvent["category"]) =>
    c === "Eid" ? "bg-amber-500/15 text-amber-500" :
    c === "Fasting" ? "bg-emerald-500/15 text-emerald-500" :
    c === "Hajj" ? "bg-blue-500/15 text-blue-500" :
    c === "Sacred Night" ? "bg-purple-500/15 text-purple-500" :
    "bg-muted text-muted-foreground";

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <SEO
        title="Islamic Events & Sacred Days | Heartify"
        description="Countdown to Ramadan, Eid, Laylatul Qadr, Arafah, Ashura and every notable day of the Hijri year."
        path="/events"
      />
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <CalendarDays className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Islamic Events</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Today</div>
          <div className="text-lg font-semibold">
            {hijriToday.day} {H_MONTHS[hijriToday.month - 1]} {hijriToday.year} AH
          </div>
          <div className="text-xs text-muted-foreground">
            {today.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </Card>

        <p className="text-xs text-muted-foreground">
          Dates are computed via the Umm al-Qura / Kuwaiti algorithm and can differ ±1 day from
          local moon-sighting announcements.
        </p>

        <div className="space-y-3">
          {rows.map(({ event, hijriYear, date, days }) => (
            <Card key={event.name} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {days === 0 && <Star className="h-4 w-4 text-amber-500" />}
                    <h3 className="text-base font-semibold">{event.name}</h3>
                  </div>
                  <Badge className={`mt-1 ${catColor(event.category)}`} variant="secondary">
                    {event.category}
                  </Badge>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {event.hijri.day} {H_MONTHS[event.hijri.month - 1]} {hijriYear} AH ·{" "}
                    {date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-2xl font-bold text-primary">
                    {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                  </div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    {days === 0 ? "" : "until"}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-sm">{event.significance}</p>
              {event.note && (
                <p className="mt-2 rounded-md border border-border/60 bg-muted/40 p-2 text-xs text-muted-foreground">
                  {event.note}
                </p>
              )}
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
