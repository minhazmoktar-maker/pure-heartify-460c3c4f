import { useEffect, useMemo, useState } from "react";
import { Calculator, Coins, Info, RotateCcw } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";

const STORAGE = "heartify:zakat:v1";
const ZAKAT_RATE = 0.025;

// Approximate nisab weights (grams)
const GOLD_NISAB_GRAMS = 87.48;
const SILVER_NISAB_GRAMS = 612.36;

interface Form {
  currency: string;
  goldPricePerGram: number;   // in selected currency
  silverPricePerGram: number; // in selected currency
  nisabBasis: "gold" | "silver";

  cash: number;
  bank: number;
  savings: number;
  investments: number;
  businessInventory: number;
  receivables: number;
  goldGrams: number;
  silverGrams: number;
  otherAssets: number;

  debts: number;
  billsDue: number;
}

const defaults: Form = {
  currency: "USD",
  goldPricePerGram: 85,
  silverPricePerGram: 1.05,
  nisabBasis: "silver",
  cash: 0,
  bank: 0,
  savings: 0,
  investments: 0,
  businessInventory: 0,
  receivables: 0,
  goldGrams: 0,
  silverGrams: 0,
  otherAssets: 0,
  debts: 0,
  billsDue: 0,
};

const load = (): Form => {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {}
  return defaults;
};

const Row = ({
  label,
  value,
  onChange,
  hint,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
  prefix?: string;
  suffix?: string;
}) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs font-medium text-foreground">{label}</span>
    <div className="flex items-center rounded-lg border border-border bg-background focus-within:border-primary">
      {prefix && <span className="pl-3 text-xs text-muted-foreground">{prefix}</span>}
      <input
        type="number"
        min={0}
        step="any"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-full bg-transparent px-3 py-2 text-sm text-foreground outline-none"
      />
      {suffix && <span className="pr-3 text-xs text-muted-foreground">{suffix}</span>}
    </div>
    {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
  </label>
);

const Zakat = () => {
  const [form, setForm] = useState<Form>(load);
  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(form));
  }, [form]);

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: form.currency || "USD",
        maximumFractionDigits: 2,
      }),
    [form.currency],
  );

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const goldValue = form.goldGrams * form.goldPricePerGram;
  const silverValue = form.silverGrams * form.silverPricePerGram;

  const totalAssets =
    form.cash +
    form.bank +
    form.savings +
    form.investments +
    form.businessInventory +
    form.receivables +
    goldValue +
    silverValue +
    form.otherAssets;

  const totalLiabilities = form.debts + form.billsDue;
  const zakatable = Math.max(0, totalAssets - totalLiabilities);

  const nisabValue =
    form.nisabBasis === "gold"
      ? GOLD_NISAB_GRAMS * form.goldPricePerGram
      : SILVER_NISAB_GRAMS * form.silverPricePerGram;

  const meetsNisab = zakatable >= nisabValue;
  const zakatDue = meetsNisab ? zakatable * ZAKAT_RATE : 0;

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Zakat calculator — 2.5% on eligible wealth held one lunar year"
        description="Calculate your annual zakat with a fiqh-aligned worksheet: cash, gold, silver, investments, business inventory, receivables minus debts, against gold or silver nisab."
        path="/zakat"
      />
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <header className="mb-6">
          <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
            Zakat Calculator
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Zakat is 2.5% of your eligible wealth once it has been in your possession for
            one lunar year (hawl) and meets the nisab threshold. This tool is a guide —
            for complex portfolios, consult a scholar.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="space-y-6">
            {/* Settings */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Settings</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-foreground">Currency</span>
                  <input
                    value={form.currency}
                    onChange={(e) => set("currency", e.target.value.toUpperCase().slice(0, 6))}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm uppercase text-foreground"
                  />
                </label>
                <Row
                  label="Gold price / gram"
                  value={form.goldPricePerGram}
                  onChange={(n) => set("goldPricePerGram", n)}
                />
                <Row
                  label="Silver price / gram"
                  value={form.silverPricePerGram}
                  onChange={(n) => set("silverPricePerGram", n)}
                />
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-foreground">Nisab basis</span>
                  <select
                    value={form.nisabBasis}
                    onChange={(e) =>
                      set("nisabBasis", e.target.value as "gold" | "silver")
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="silver">Silver (recommended, lower)</option>
                    <option value="gold">Gold</option>
                  </select>
                </label>
              </div>
              <p className="mt-3 flex items-start gap-2 text-[11px] text-muted-foreground">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                Nisab thresholds: 87.48g gold or 612.36g silver. Update the metal prices
                for your local market before calculating.
              </p>
            </div>

            {/* Assets */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Zakatable assets
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                <Row label="Cash on hand" value={form.cash} onChange={(n) => set("cash", n)} />
                <Row
                  label="Bank / checking balance"
                  value={form.bank}
                  onChange={(n) => set("bank", n)}
                />
                <Row
                  label="Savings & fixed deposits"
                  value={form.savings}
                  onChange={(n) => set("savings", n)}
                />
                <Row
                  label="Investments (stocks, funds, crypto)"
                  value={form.investments}
                  onChange={(n) => set("investments", n)}
                  hint="Use current market value."
                />
                <Row
                  label="Business inventory / stock"
                  value={form.businessInventory}
                  onChange={(n) => set("businessInventory", n)}
                  hint="Goods held for resale at wholesale value."
                />
                <Row
                  label="Money owed to you (expected)"
                  value={form.receivables}
                  onChange={(n) => set("receivables", n)}
                />
                <Row
                  label="Gold you own"
                  value={form.goldGrams}
                  onChange={(n) => set("goldGrams", n)}
                  suffix="grams"
                  hint={`≈ ${fmt.format(goldValue)}`}
                />
                <Row
                  label="Silver you own"
                  value={form.silverGrams}
                  onChange={(n) => set("silverGrams", n)}
                  suffix="grams"
                  hint={`≈ ${fmt.format(silverValue)}`}
                />
                <Row
                  label="Other zakatable assets"
                  value={form.otherAssets}
                  onChange={(n) => set("otherAssets", n)}
                />
              </div>
            </div>

            {/* Liabilities */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Immediate liabilities
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                <Row
                  label="Short-term debts you owe"
                  value={form.debts}
                  onChange={(n) => set("debts", n)}
                  hint="Only the portion due within the year."
                />
                <Row
                  label="Bills & obligations due"
                  value={form.billsDue}
                  onChange={(n) => set("billsDue", n)}
                />
              </div>
              <button
                onClick={() => setForm(defaults)}
                className="mt-4 inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:bg-secondary"
              >
                <RotateCcw className="h-3 w-3" /> Reset all fields
              </button>
            </div>
          </section>

          {/* Summary */}
          <aside className="lg:sticky lg:top-24 h-fit space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
              <div className="flex items-center gap-2 text-primary">
                <Calculator className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Your Zakat
                </span>
              </div>
              <p className="mt-3 text-4xl font-bold text-foreground">
                {fmt.format(zakatDue)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {meetsNisab
                  ? "Payable this hawl. Distribute to eligible recipients (Q 9:60)."
                  : "Below nisab — no zakat is due right now."}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 text-sm">
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Total assets</span>
                <span className="font-medium text-foreground">
                  {fmt.format(totalAssets)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Liabilities</span>
                <span className="font-medium text-foreground">
                  −{fmt.format(totalLiabilities)}
                </span>
              </div>
              <div className="my-2 border-t border-border" />
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Zakatable wealth</span>
                <span className="font-semibold text-foreground">
                  {fmt.format(zakatable)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">
                  Nisab ({form.nisabBasis})
                </span>
                <span className="font-medium text-foreground">
                  {fmt.format(nisabValue)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Rate</span>
                <span className="font-medium text-foreground">2.5%</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-2 flex items-center gap-2">
                <Coins className="h-4 w-4 text-[hsl(var(--gold))]" />
                <h3 className="text-sm font-semibold text-foreground">
                  Eight categories of recipients
                </h3>
              </div>
              <ol className="list-decimal space-y-0.5 pl-5 text-xs text-muted-foreground">
                <li>The poor (fuqara)</li>
                <li>The needy (masakin)</li>
                <li>Zakat administrators</li>
                <li>Those whose hearts are reconciled</li>
                <li>Freeing captives</li>
                <li>Those in debt</li>
                <li>In the cause of Allah</li>
                <li>The wayfarer</li>
              </ol>
              <p className="mt-2 text-[11px] text-muted-foreground">Surah At-Tawbah 9:60</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Zakat;
