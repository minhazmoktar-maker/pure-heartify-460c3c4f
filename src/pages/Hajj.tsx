import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, Circle, MapPin, Package, Plane, Wallet } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type Trip = "hajj" | "umrah";

const HAJJ_RITES = [
  { day: "8 Dhul Hijjah — Yawm at-Tarwiyah", items: ["Enter Ihram from Miqat/hotel", "Make intention & Talbiyah", "Travel to Mina", "Pray Dhuhr–Fajr shortened in Mina"] },
  { day: "9 Dhul Hijjah — Yawm Arafah", items: ["Travel to Arafah after Fajr", "Wuquf: du'a from Zuhr to sunset", "Combine Dhuhr & Asr (qasr) in Arafah", "Travel to Muzdalifah after sunset", "Pray Maghrib & Isha combined in Muzdalifah", "Collect 49–70 pebbles", "Sleep at Muzdalifah until Fajr"] },
  { day: "10 Dhul Hijjah — Yawm an-Nahr", items: ["Return to Mina", "Rami: 7 pebbles at Jamrat al-Aqaba", "Hady (sacrifice) or arrange voucher", "Halq/Taqsir (shave/trim)", "Tawaf al-Ifadah + Sa'i (Hajj)", "Return to Mina for the night"] },
  { day: "11 Dhul Hijjah — Tashreeq 1", items: ["Rami at all 3 Jamarat (7 each, small → large)", "Overnight in Mina"] },
  { day: "12 Dhul Hijjah — Tashreeq 2", items: ["Rami at all 3 Jamarat", "Leave Mina before Maghrib (or stay for day 13)"] },
  { day: "13 Dhul Hijjah — Tashreeq 3 (optional)", items: ["Rami at all 3 Jamarat", "Depart Mina"] },
  { day: "Before departure", items: ["Tawaf al-Wada (farewell tawaf)"] },
];

const UMRAH_RITES = [
  { day: "Preparation", items: ["Ghusl & wear Ihram from Miqat", "Two rak'ah of Ihram", "Niyyah + Talbiyah until Haram"] },
  { day: "At Masjid al-Haram", items: ["Enter with right foot, du'a", "Tawaf: 7 circuits around the Ka'bah", "2 rak'ah at Maqam Ibrahim", "Drink Zamzam", "Sa'i: 7 laps Safa ↔ Marwah", "Halq or Taqsir → exit Ihram"] },
];

const PACKING = [
  "2 sets of Ihram (men) / modest clothing (women)",
  "Ihram belt with pouch",
  "Unscented soap & toiletries",
  "Comfortable sandals (no stitching on top for men)",
  "Prayer mat & small Qur'an",
  "Refillable water bottle",
  "Medications + basic first aid",
  "Passport, visa, vaccination card",
  "Mina bag / drawstring bag for pebbles",
  "Portable charger & universal adapter",
];

const KEY = "heartify.hajj.v1";

type Progress = { trip: Trip; done: Record<string, boolean>; budgetGoal: number; budgetSpent: number };

const defaultState: Progress = { trip: "umrah", done: {}, budgetGoal: 0, budgetSpent: 0 };

export default function Hajj() {
  const [state, setState] = useState<Progress>(defaultState);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setState({ ...defaultState, ...JSON.parse(raw) }); } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }, [state]);

  const rites = state.trip === "hajj" ? HAJJ_RITES : UMRAH_RITES;
  const allKeys = useMemo(() => rites.flatMap((s, di) => s.items.map((_, ii) => `${state.trip}:${di}:${ii}`)), [rites, state.trip]);
  const doneCount = allKeys.filter((k) => state.done[k]).length;
  const pct = allKeys.length ? Math.round((doneCount / allKeys.length) * 100) : 0;

  const toggle = (k: string) => setState((s) => ({ ...s, done: { ...s.done, [k]: !s.done[k] } }));

  return (
    <div className="min-h-dvh bg-background">
      <Helmet>
        <title>Hajj & Umrah Planner — Heartify</title>
        <meta name="description" content="Day-by-day rites checklist, packing list, and budget tracker for Hajj and Umrah." />
      </Helmet>
      <Navbar />

      <main className="container mx-auto max-w-5xl px-4 pb-24 pt-24">
        <header className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Plane className="h-4 w-4" /> Sacred Journey</div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Hajj & Umrah Planner</h1>
          <p className="mt-1 text-muted-foreground">Rites checklists, packing, and a simple budget tracker — stored on this device.</p>
        </header>

        <Tabs value={state.trip} onValueChange={(v) => setState((s) => ({ ...s, trip: v as Trip }))} className="mb-6">
          <TabsList>
            <TabsTrigger value="umrah">Umrah</TabsTrigger>
            <TabsTrigger value="hajj">Hajj</TabsTrigger>
          </TabsList>

          <TabsContent value={state.trip} className="mt-6 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="capitalize">{state.trip} progress</CardTitle>
                  <p className="text-sm text-muted-foreground">{doneCount} of {allKeys.length} steps completed</p>
                </div>
                <Badge variant="secondary">{pct}%</Badge>
              </CardHeader>
              <CardContent><Progress value={pct} /></CardContent>
            </Card>

            <section className="space-y-4">
              {rites.map((stage, di) => (
                <Card key={di}>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4 text-primary" />{stage.day}</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {stage.items.map((item, ii) => {
                        const k = `${state.trip}:${di}:${ii}`;
                        const done = !!state.done[k];
                        return (
                          <li key={ii}>
                            <button onClick={() => toggle(k)} className="flex w-full items-start gap-3 rounded-md border border-transparent p-2 text-left hover:border-border hover:bg-muted/40">
                              {done ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" /> : <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" />}
                              <span className={done ? "line-through text-muted-foreground" : ""}>{item}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </section>
          </TabsContent>
        </Tabs>

        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4 text-primary" />Packing checklist</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {PACKING.map((item, i) => {
                  const k = `pack:${i}`;
                  const done = !!state.done[k];
                  return (
                    <li key={i}>
                      <button onClick={() => toggle(k)} className="flex w-full items-start gap-3 rounded-md p-1 text-left hover:bg-muted/40">
                        {done ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" /> : <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" />}
                        <span className={done ? "line-through text-muted-foreground" : ""}>{item}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4 text-primary" />Budget tracker</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Goal</label>
                  <Input type="number" min={0} value={state.budgetGoal || ""} onChange={(e) => setState((s) => ({ ...s, budgetGoal: Number(e.target.value) || 0 }))} placeholder="e.g. 6000" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Spent so far</label>
                  <Input type="number" min={0} value={state.budgetSpent || ""} onChange={(e) => setState((s) => ({ ...s, budgetSpent: Number(e.target.value) || 0 }))} placeholder="e.g. 1200" />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{state.budgetSpent} / {state.budgetGoal || 0}</span>
                  <span className="font-medium">{state.budgetGoal ? Math.min(100, Math.round((state.budgetSpent / state.budgetGoal) * 100)) : 0}%</span>
                </div>
                <Progress value={state.budgetGoal ? Math.min(100, (state.budgetSpent / state.budgetGoal) * 100) : 0} />
              </div>
              <Button variant="outline" size="sm" onClick={() => setState(defaultState)}>Reset planner</Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
