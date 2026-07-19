import { localToday } from "@/lib/intl";
import { useEffect, useMemo, useState } from "react";
import { HandCoins, Plus, Trash2, Target, TrendingUp, Calendar } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import CurrencyPicker from "@/components/CurrencyPicker";
import { toast } from "sonner";

type Entry = {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
};

const KEY = "sadaqah:entries";
const GOAL_KEY = "sadaqah:monthlyGoal";
const CUR_KEY = "sadaqah:currency";

const CATEGORIES = [
  "Masjid",
  "Orphans",
  "Food & water",
  "Family & relatives",
  "Sadaqah Jariyah",
  "Islamic education",
  "Poor & needy",
  "Other",
] as const;

const CURRENCIES: { code: string; name: string }[] = [
  { code: "USD", name: "US Dollar" }, { code: "EUR", name: "Euro" }, { code: "GBP", name: "British Pound" },
  { code: "AED", name: "UAE Dirham" }, { code: "SAR", name: "Saudi Riyal" }, { code: "QAR", name: "Qatari Riyal" },
  { code: "KWD", name: "Kuwaiti Dinar" }, { code: "BHD", name: "Bahraini Dinar" }, { code: "OMR", name: "Omani Rial" },
  { code: "JOD", name: "Jordanian Dinar" }, { code: "EGP", name: "Egyptian Pound" }, { code: "TRY", name: "Turkish Lira" },
  { code: "IRR", name: "Iranian Rial" }, { code: "IQD", name: "Iraqi Dinar" }, { code: "LBP", name: "Lebanese Pound" },
  { code: "MAD", name: "Moroccan Dirham" }, { code: "DZD", name: "Algerian Dinar" }, { code: "TND", name: "Tunisian Dinar" },
  { code: "LYD", name: "Libyan Dinar" }, { code: "SDG", name: "Sudanese Pound" }, { code: "SOS", name: "Somali Shilling" },
  { code: "YER", name: "Yemeni Rial" }, { code: "SYP", name: "Syrian Pound" }, { code: "AFN", name: "Afghan Afghani" },
  { code: "PKR", name: "Pakistani Rupee" }, { code: "INR", name: "Indian Rupee" }, { code: "BDT", name: "Bangladeshi Taka" },
  { code: "LKR", name: "Sri Lankan Rupee" }, { code: "NPR", name: "Nepalese Rupee" }, { code: "MVR", name: "Maldivian Rufiyaa" },
  { code: "IDR", name: "Indonesian Rupiah" }, { code: "MYR", name: "Malaysian Ringgit" }, { code: "SGD", name: "Singapore Dollar" },
  { code: "BND", name: "Brunei Dollar" }, { code: "THB", name: "Thai Baht" }, { code: "PHP", name: "Philippine Peso" },
  { code: "VND", name: "Vietnamese Dong" }, { code: "CNY", name: "Chinese Yuan" }, { code: "HKD", name: "Hong Kong Dollar" },
  { code: "TWD", name: "Taiwan Dollar" }, { code: "JPY", name: "Japanese Yen" }, { code: "KRW", name: "South Korean Won" },
  { code: "KZT", name: "Kazakhstani Tenge" }, { code: "UZS", name: "Uzbekistani Som" }, { code: "AZN", name: "Azerbaijani Manat" },
  { code: "AUD", name: "Australian Dollar" }, { code: "NZD", name: "New Zealand Dollar" }, { code: "CAD", name: "Canadian Dollar" },
  { code: "MXN", name: "Mexican Peso" }, { code: "BRL", name: "Brazilian Real" }, { code: "ARS", name: "Argentine Peso" },
  { code: "CLP", name: "Chilean Peso" }, { code: "COP", name: "Colombian Peso" }, { code: "PEN", name: "Peruvian Sol" },
  { code: "CHF", name: "Swiss Franc" }, { code: "SEK", name: "Swedish Krona" }, { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" }, { code: "ISK", name: "Icelandic Króna" }, { code: "PLN", name: "Polish Zloty" },
  { code: "CZK", name: "Czech Koruna" }, { code: "HUF", name: "Hungarian Forint" }, { code: "RON", name: "Romanian Leu" },
  { code: "BGN", name: "Bulgarian Lev" }, { code: "RSD", name: "Serbian Dinar" }, { code: "UAH", name: "Ukrainian Hryvnia" },
  { code: "RUB", name: "Russian Ruble" }, { code: "ZAR", name: "South African Rand" }, { code: "NGN", name: "Nigerian Naira" },
  { code: "GHS", name: "Ghanaian Cedi" }, { code: "KES", name: "Kenyan Shilling" }, { code: "TZS", name: "Tanzanian Shilling" },
  { code: "UGX", name: "Ugandan Shilling" }, { code: "ETB", name: "Ethiopian Birr" },
  { code: "XOF", name: "West African CFA Franc" }, { code: "XAF", name: "Central African CFA Franc" },
];

const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => localToday();
const monthKey = (d: string) => d.slice(0, 7);

function load<T>(k: string, fb: T): T {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; }
}
function save<T>(k: string, v: T) { localStorage.setItem(k, JSON.stringify(v)); }

const Sadaqah = () => {
  const [entries, setEntries] = useState<Entry[]>(() => load<Entry[]>(KEY, []));
  const [goal, setGoal] = useState<number>(() => load<number>(GOAL_KEY, 0));
  const [currency, setCurrency] = useState<string>(() => load<string>(CUR_KEY, "USD"));

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState<string>(today());

  useEffect(() => save(KEY, entries), [entries]);
  useEffect(() => save(GOAL_KEY, goal), [goal]);
  useEffect(() => save(CUR_KEY, currency), [currency]);

  const currentMonth = monthKey(today());

  const stats = useMemo(() => {
    const thisMonth = entries.filter((e) => monthKey(e.date) === currentMonth);
    const thisMonthTotal = thisMonth.reduce((s, e) => s + e.amount, 0);
    const allTime = entries.reduce((s, e) => s + e.amount, 0);
    const byCat: Record<string, number> = {};
    for (const e of thisMonth) byCat[e.category] = (byCat[e.category] || 0) + e.amount;
    const months = new Set(entries.map((e) => monthKey(e.date)));
    return { thisMonthTotal, allTime, byCat, monthsActive: months.size };
  }, [entries, currentMonth]);

  const goalPct = goal > 0 ? Math.min(100, Math.round((stats.thisMonthTotal / goal) * 100)) : 0;

  const addEntry = () => {
    const n = parseFloat(amount);
    if (!n || n <= 0) { toast.error("Enter a valid amount"); return; }
    const e: Entry = { id: uid(), amount: n, category, note: note.trim(), date, createdAt: Date.now() };
    setEntries((es) => [e, ...es]);
    setAmount("");
    setNote("");
    toast.success("Sadaqah logged — jazakAllahu khayran");
  };

  const remove = (id: string) => setEntries((es) => es.filter((e) => e.id !== id));

  const fmt = (n: number) => `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const recent = entries.slice(0, 20);
  const maxCat = Math.max(1, ...Object.values(stats.byCat));

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Sadaqah Tracker — Log Charity & Set Monthly Goals | Heartify"
        description="Track your sadaqah privately: log donations by category, set a monthly goal, and see all-time giving. Data stays on your device."
        path="/sadaqah"
      />
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <header className="mb-6 flex items-start gap-3">
          <div className="rounded-card bg-primary/10 p-3 text-primary">
            <HandCoins className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-heading text-title font-bold text-foreground md:text-display">Sadaqah Tracker</h1>
            <p className="mt-1 text-muted-foreground">
              "The believer's shade on the Day of Judgement will be his charity." — Tirmidhi
            </p>
          </div>
        </header>

        {/* Stats */}
        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-card border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-micro text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> This month
            </div>
            <p className="mt-1 font-heading text-title font-bold text-primary">{fmt(stats.thisMonthTotal)}</p>
          </div>
          <div className="rounded-card border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-micro text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> All-time
            </div>
            <p className="mt-1 font-heading text-title font-bold text-foreground">{fmt(stats.allTime)}</p>
          </div>
          <div className="rounded-card border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-micro text-muted-foreground">
              <Target className="h-3.5 w-3.5" /> Months active
            </div>
            <p className="mt-1 font-heading text-title font-bold text-foreground">{stats.monthsActive}</p>
          </div>
        </section>

        {/* Goal */}
        <section className="mb-6 rounded-card border border-border bg-card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-heading font-semibold text-foreground">Monthly goal</h2>
              <p className="text-micro text-muted-foreground">Set a target to consistently give.</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-9 rounded-card border border-border bg-background px-2 text-sm"
              >
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              </select>
              <input
                type="number"
                min={0}
                value={goal || ""}
                onChange={(e) => setGoal(Math.max(0, Number(e.target.value) || 0))}
                placeholder="Goal"
                className="h-9 w-32 rounded-card border border-border bg-background px-2 text-sm"
              />
            </div>
          </div>
          {goal > 0 ? (
            <>
              <div className="mb-1 flex justify-between text-micro text-muted-foreground">
                <span>{fmt(stats.thisMonthTotal)} of {fmt(goal)}</span>
                <span>{goalPct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-pill bg-secondary">
                <div className="h-full bg-primary transition-all" style={{ width: `${goalPct}%` }} />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No goal set yet.</p>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Add entry */}
          <section className="rounded-card border border-border bg-card p-5">
            <h2 className="mb-3 font-heading text-heading font-semibold text-foreground">Log sadaqah</h2>
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 rounded-card border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 rounded-card border border-border bg-background px-2 text-sm"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-2 h-10 w-full rounded-card border border-border bg-background px-2 text-sm"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input
              type="text"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-2 h-10 w-full rounded-card border border-border bg-background px-3 text-sm"
            />
            <button
              onClick={addEntry}
              className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-card bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Add entry
            </button>
          </section>

          {/* By category */}
          <section className="rounded-card border border-border bg-card p-5">
            <h2 className="mb-3 font-heading text-heading font-semibold text-foreground">This month by category</h2>
            {Object.keys(stats.byCat).length === 0 ? (
              <p className="text-sm text-muted-foreground">No entries this month yet.</p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(stats.byCat)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, val]) => (
                    <li key={cat}>
                      <div className="mb-1 flex justify-between text-micro">
                        <span className="text-foreground">{cat}</span>
                        <span className="text-muted-foreground">{fmt(val)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-pill bg-secondary">
                        <div className="h-full bg-primary transition-all" style={{ width: `${(val / maxCat) * 100}%` }} />
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>

        {/* Recent */}
        <section className="mt-6 rounded-card border border-border bg-card p-5">
          <h2 className="mb-3 font-heading text-heading font-semibold text-foreground">Recent entries</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet. Your first sadaqah is one tap away.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{fmt(e.amount)} <span className="text-micro font-normal text-muted-foreground">· {e.category}</span></p>
                    <p className="text-micro text-muted-foreground">
                      {e.date}{e.note ? ` · ${e.note}` : ""}
                    </p>
                  </div>
                  <button onClick={() => remove(e.id)} aria-label="Delete" className="rounded-pill p-2 text-muted-foreground hover:bg-secondary">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

export default Sadaqah;
