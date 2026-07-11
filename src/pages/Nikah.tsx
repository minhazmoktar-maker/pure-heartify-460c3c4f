import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import SEO from "@/components/SEO";

type Guest = { id: string; name: string; side: "bride" | "groom"; rsvp: "pending" | "yes" | "no" };
type Task = { id: string; label: string; done: boolean };
type Expense = { id: string; label: string; amount: number };

const DEFAULT_TASKS: Task[] = [
  { id: "t1", label: "Confirm Wali (guardian) for the bride", done: false },
  { id: "t2", label: "Agree on Mahr (dower) — amount & timing", done: false },
  { id: "t3", label: "Select two adult male Muslim witnesses", done: false },
  { id: "t4", label: "Draft & sign the Nikah contract", done: false },
  { id: "t5", label: "Book the Imam / officiant", done: false },
  { id: "t6", label: "Register the marriage civilly", done: false },
  { id: "t7", label: "Plan the Walimah (post-nikah feast)", done: false },
  { id: "t8", label: "Arrange separate seating / modest venue", done: false },
  { id: "t9", label: "Confirm no music/haram elements", done: false },
  { id: "t10", label: "Prepare Khutbatun-Nikah reading", done: false },
];

const STORAGE = "heartify-nikah-v1";

type State = {
  brideName: string;
  groomName: string;
  date: string;
  venue: string;
  mahrType: string;
  mahrAmount: string;
  budget: number;
  currency: string;
  notes: string;
  tasks: Task[];
  guests: Guest[];
  expenses: Expense[];
};

const initial: State = {
  brideName: "",
  groomName: "",
  date: "",
  venue: "",
  mahrType: "Cash",
  mahrAmount: "",
  budget: 5000,
  currency: "USD",
  notes: "",
  tasks: DEFAULT_TASKS,
  guests: [],
  expenses: [],
};

const uid = () => Math.random().toString(36).slice(2, 10);

const Nikah = () => {
  const [s, setS] = useState<State>(initial);
  const [guestName, setGuestName] = useState("");
  const [guestSide, setGuestSide] = useState<"bride" | "groom">("bride");
  const [expLabel, setExpLabel] = useState("");
  const [expAmount, setExpAmount] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setS({ ...initial, ...JSON.parse(raw) });
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(s));
  }, [s]);

  const doneCount = s.tasks.filter((t) => t.done).length;
  const progress = Math.round((doneCount / s.tasks.length) * 100);
  const spent = useMemo(() => s.expenses.reduce((a, e) => a + e.amount, 0), [s.expenses]);
  const budgetPct = s.budget > 0 ? Math.min(100, Math.round((spent / s.budget) * 100)) : 0;
  const rsvpYes = s.guests.filter((g) => g.rsvp === "yes").length;

  const toggleTask = (id: string) =>
    setS((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }));

  const addGuest = () => {
    if (!guestName.trim()) return;
    setS((p) => ({
      ...p,
      guests: [...p.guests, { id: uid(), name: guestName.trim(), side: guestSide, rsvp: "pending" }],
    }));
    setGuestName("");
  };

  const cycleRsvp = (id: string) =>
    setS((p) => ({
      ...p,
      guests: p.guests.map((g) =>
        g.id === id
          ? { ...g, rsvp: g.rsvp === "pending" ? "yes" : g.rsvp === "yes" ? "no" : "pending" }
          : g,
      ),
    }));

  const removeGuest = (id: string) =>
    setS((p) => ({ ...p, guests: p.guests.filter((g) => g.id !== id) }));

  const addExpense = () => {
    const amt = parseFloat(expAmount);
    if (!expLabel.trim() || !Number.isFinite(amt)) return;
    setS((p) => ({ ...p, expenses: [...p.expenses, { id: uid(), label: expLabel.trim(), amount: amt }] }));
    setExpLabel("");
    setExpAmount("");
  };

  const removeExpense = (id: string) =>
    setS((p) => ({ ...p, expenses: p.expenses.filter((e) => e.id !== id) }));

  return (
    <div className="min-h-dvh bg-background pb-20">
      <SEO
        title="Nikah Planner — Heartify"
        description="Plan a halal nikah: mahr, witnesses, walimah checklist, guest list with RSVP, and budget tracker."
        path="/nikah"
      />
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back">
            <Link to="/" aria-label="Back to home"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <Heart className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Nikah Planner</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Checklist</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{doneCount}/{s.tasks.length}</div>
              <Progress value={progress} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Budget</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {s.currency} {spent.toFixed(0)} <span className="text-sm text-muted-foreground">/ {s.budget}</span>
              </div>
              <Progress value={budgetPct} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Confirmed guests</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rsvpYes}<span className="text-sm text-muted-foreground"> / {s.guests.length}</span></div>
              <p className="mt-2 text-xs text-muted-foreground">Tap RSVP to cycle status</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="details">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="guests">Guests</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-3">
            <Card><CardContent className="space-y-3 pt-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Bride's name</Label><Input value={s.brideName} onChange={(e) => setS({ ...s, brideName: e.target.value })} /></div>
                <div><Label>Groom's name</Label><Input value={s.groomName} onChange={(e) => setS({ ...s, groomName: e.target.value })} /></div>
                <div><Label>Nikah date</Label><Input type="date" value={s.date} onChange={(e) => setS({ ...s, date: e.target.value })} /></div>
                <div><Label>Venue / masjid</Label><Input value={s.venue} onChange={(e) => setS({ ...s, venue: e.target.value })} /></div>
                <div><Label>Mahr type</Label><Input value={s.mahrType} onChange={(e) => setS({ ...s, mahrType: e.target.value })} placeholder="Cash, gold, Qur'an teaching..." /></div>
                <div><Label>Mahr amount / description</Label><Input value={s.mahrAmount} onChange={(e) => setS({ ...s, mahrAmount: e.target.value })} /></div>
                <div><Label>Currency</Label><Input value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })} /></div>
                <div><Label>Total budget</Label><Input type="number" min={0} value={s.budget} onChange={(e) => setS({ ...s, budget: Number(e.target.value) || 0 })} /></div>
              </div>
              <div><Label>Notes (witnesses, wali, imam...)</Label><Textarea value={s.notes} onChange={(e) => setS({ ...s, notes: e.target.value })} rows={4} /></div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="checklist">
            <Card><CardContent className="pt-6 space-y-2">
              {s.tasks.map((t) => (
                <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-accent">
                  <Checkbox checked={t.done} onCheckedChange={() => toggleTask(t.id)} />
                  <span className={t.done ? "line-through text-muted-foreground" : ""}>{t.label}</span>
                </label>
              ))}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="guests">
            <Card><CardContent className="pt-6 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Input placeholder="Guest name" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="flex-1 min-w-[180px]" />
                <select value={guestSide} onChange={(e) => setGuestSide(e.target.value as any)} className="rounded-md border bg-background px-3 text-sm">
                  <option value="bride">Bride side</option>
                  <option value="groom">Groom side</option>
                </select>
                <Button onClick={addGuest}><Plus className="mr-1 h-4 w-4" />Add</Button>
              </div>
              {s.guests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No guests added yet.</p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {s.guests.map((g) => (
                    <li key={g.id} className="flex items-center gap-2 p-3">
                      <span className="flex-1">{g.name} <span className="text-xs text-muted-foreground">({g.side})</span></span>
                      <Button size="sm" variant="outline" onClick={() => cycleRsvp(g.id)}>
                        {g.rsvp === "yes" && <Check className="mr-1 h-3 w-3 text-primary" />}
                        {g.rsvp.toUpperCase()}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => removeGuest(g.id)} aria-label="Remove"><Trash2 className="h-4 w-4" /></Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="budget">
            <Card><CardContent className="pt-6 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Input placeholder="Expense (venue, food...)" value={expLabel} onChange={(e) => setExpLabel(e.target.value)} className="flex-1 min-w-[180px]" />
                <Input placeholder="Amount" type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} className="w-32" />
                <Button onClick={addExpense}><Plus className="mr-1 h-4 w-4" />Add</Button>
              </div>
              {s.expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expenses recorded.</p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {s.expenses.map((e) => (
                    <li key={e.id} className="flex items-center gap-2 p-3">
                      <span className="flex-1">{e.label}</span>
                      <span className="font-medium">{s.currency} {e.amount.toFixed(2)}</span>
                      <Button size="icon" variant="ghost" onClick={() => removeExpense(e.id)} aria-label="Remove"><Trash2 className="h-4 w-4" /></Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="rounded-md bg-muted p-3 text-sm">
                Spent <b>{s.currency} {spent.toFixed(2)}</b> of <b>{s.currency} {s.budget}</b> ({budgetPct}%)
              </div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Nikah;
