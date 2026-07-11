import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import SEO from "@/components/SEO";

type Inputs = {
  estate: number;
  deceasedGender: "male" | "female";
  spouse: boolean;
  sons: number;
  daughters: number;
  father: boolean;
  mother: boolean;
  siblings: number; // full siblings, only relevant when no descendants & no father
};

type Share = { heir: string; fraction: string; amount: number };

// Simplified faraid calc covering the most common cases:
// - Quranic fixed shares for spouse, parents
// - Residue to sons/daughters at 2:1
// - Grandparents / half-siblings / grandchildren not covered
function calculate(i: Inputs): { shares: Share[]; residueTo: string; notes: string[] } {
  const notes: string[] = [];
  const est = Math.max(0, i.estate);
  const hasDescendants = i.sons > 0 || i.daughters > 0;
  const spouseFrac =
    !i.spouse ? 0 :
    i.deceasedGender === "male"
      ? (hasDescendants ? 1 / 8 : 1 / 4)   // widow
      : (hasDescendants ? 1 / 4 : 1 / 2);  // widower

  const fatherFrac = i.father ? (hasDescendants ? 1 / 6 : 0) : 0;
  // Mother: 1/6 if descendants OR two+ siblings; else 1/3 (of what remains after spouse if with father — Umariyyah)
  let motherFrac = 0;
  if (i.mother) {
    if (hasDescendants || i.siblings >= 2) motherFrac = 1 / 6;
    else if (i.father && i.spouse) {
      // Umariyyah: mother takes 1/3 of the residue after spouse
      const spouseAmt = est * spouseFrac;
      const remaining = est - spouseAmt;
      motherFrac = (remaining / 3) / est;
      notes.push("Umariyyah case: mother receives 1/3 of the residue after the spouse's share.");
    } else motherFrac = 1 / 3;
  }

  const fixedTotal = spouseFrac + fatherFrac + motherFrac;
  const shares: Share[] = [];

  if (i.spouse) shares.push({
    heir: i.deceasedGender === "male" ? "Widow" : "Widower",
    fraction: fracLabel(spouseFrac),
    amount: est * spouseFrac,
  });
  if (i.father) shares.push({
    heir: "Father",
    fraction: fatherFrac > 0 ? fracLabel(fatherFrac) : "Residue (asabah)",
    amount: est * fatherFrac,
  });
  if (i.mother) shares.push({
    heir: "Mother",
    fraction: fracLabel(motherFrac),
    amount: est * motherFrac,
  });

  const residueAmt = Math.max(0, est - est * fixedTotal);
  let residueTo = "—";

  if (hasDescendants) {
    // 2:1 sons : daughters. Father (if present) already took 1/6, rest to children.
    const units = i.sons * 2 + i.daughters * 1;
    if (units > 0) {
      const perUnit = residueAmt / units;
      if (i.sons > 0) shares.push({
        heir: `Sons × ${i.sons}`,
        fraction: `Residue (2 per son)`,
        amount: perUnit * 2 * i.sons,
      });
      if (i.daughters > 0) {
        // Special case: only daughters, no sons
        if (i.sons === 0) {
          const dFrac = i.daughters === 1 ? 1 / 2 : 2 / 3;
          const dAmt = est * dFrac;
          shares.pop(); // remove residue placeholder for sons (none pushed)
          shares.push({
            heir: `Daughter${i.daughters > 1 ? `s × ${i.daughters}` : ""}`,
            fraction: fracLabel(dFrac),
            amount: dAmt,
          });
          // remaining residue goes to father (asabah) if present
          const consumed = shares.reduce((s, x) => s + x.amount, 0);
          const leftover = est - consumed;
          if (leftover > 0.01 && i.father) {
            const fi = shares.findIndex((s) => s.heir === "Father");
            if (fi >= 0) {
              shares[fi].amount += leftover;
              shares[fi].fraction = "1/6 + residue";
            }
            residueTo = "Father (as residuary)";
          } else if (leftover > 0.01) {
            residueTo = "Radd (returned proportionally — not fully computed)";
            notes.push("Residue remains; classical rules return it (radd) to heirs excluding the spouse.");
          } else {
            residueTo = "Fully distributed";
          }
        } else {
          shares.push({
            heir: `Daughters × ${i.daughters}`,
            fraction: `Residue (1 per daughter)`,
            amount: perUnit * 1 * i.daughters,
          });
          residueTo = "Sons and daughters (2:1)";
        }
      } else {
        residueTo = "Sons";
      }
    }
  } else {
    // No descendants
    if (residueAmt > 0.01) {
      if (i.father) {
        // Father takes the entire residue (asabah). We already gave him 0 fixed.
        const fi = shares.findIndex((s) => s.heir === "Father");
        if (fi >= 0) {
          shares[fi].amount += residueAmt;
          shares[fi].fraction = "Residue (asabah)";
        }
        residueTo = "Father (asabah)";
      } else if (i.siblings > 0) {
        shares.push({
          heir: `Full siblings × ${i.siblings}`,
          fraction: "Residue",
          amount: residueAmt,
        });
        residueTo = "Full siblings";
        notes.push("Simplified: siblings share residue equally; classical rules distinguish brothers/sisters at 2:1 and consider half-siblings separately.");
      } else {
        residueTo = "Radd (returned to fixed heirs) or Bayt al-Mal";
        notes.push("No residuary heir specified; classical rules return the leftover (radd) to fixed heirs or send it to the Muslim treasury.");
      }
    } else {
      residueTo = "Fully distributed";
    }
  }

  if (!i.spouse && !i.father && !i.mother && !hasDescendants && i.siblings === 0) {
    notes.push("No heirs specified.");
  }

  return { shares, residueTo, notes };
}

function fracLabel(f: number): string {
  if (f === 0) return "0";
  const targets: [number, string][] = [
    [1/2, "1/2"], [1/3, "1/3"], [1/4, "1/4"], [1/6, "1/6"], [1/8, "1/8"], [2/3, "2/3"],
  ];
  for (const [v, s] of targets) if (Math.abs(f - v) < 1e-6) return s;
  return `${(f * 100).toFixed(2)}%`;
}

export default function Inheritance() {
  const [i, setI] = useState<Inputs>({
    estate: 100000,
    deceasedGender: "male",
    spouse: true,
    sons: 1,
    daughters: 2,
    father: false,
    mother: true,
    siblings: 0,
  });

  const result = useMemo(() => calculate(i), [i]);
  const fmt = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });

  return (
    <div className="min-h-dvh bg-background text-foreground pb-20">
      <SEO
        title="Islamic Inheritance (Mirath) Calculator | Heartify"
        description="Estimate Islamic inheritance shares (faraid) for spouse, parents, sons and daughters based on Qur'anic fixed shares."
        path="/inheritance"
      />
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back">
            <Link to="/" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <Scale className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Inheritance Calculator</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">
            Estimator based on Qur'an 4:11-12. Covers the most common household case (spouse,
            parents, sons and daughters). Grandparents, half-siblings, grandchildren, and complex
            radd/awl cases are not handled — consult a qualified scholar before acting.
          </p>
        </Card>

        <Card className="space-y-4 p-4">
          <div>
            <Label>Estate value (after debts &amp; wasiyyah)</Label>
            <Input
              type="number"
              min={0}
              value={i.estate}
              onChange={(e) => setI({ ...i, estate: Number(e.target.value) || 0 })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Deceased was male</Label>
              <p className="text-xs text-muted-foreground">
                Affects the spouse's fixed share.
              </p>
            </div>
            <Switch
              checked={i.deceasedGender === "male"}
              onCheckedChange={(v) => setI({ ...i, deceasedGender: v ? "male" : "female" })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Surviving spouse</Label>
            <Switch checked={i.spouse} onCheckedChange={(v) => setI({ ...i, spouse: v })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sons</Label>
              <Input type="number" min={0} value={i.sons}
                onChange={(e) => setI({ ...i, sons: Math.max(0, Number(e.target.value) || 0) })} />
            </div>
            <div>
              <Label>Daughters</Label>
              <Input type="number" min={0} value={i.daughters}
                onChange={(e) => setI({ ...i, daughters: Math.max(0, Number(e.target.value) || 0) })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
              <Label>Father alive</Label>
              <Switch checked={i.father} onCheckedChange={(v) => setI({ ...i, father: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
              <Label>Mother alive</Label>
              <Switch checked={i.mother} onCheckedChange={(v) => setI({ ...i, mother: v })} />
            </div>
          </div>

          <div>
            <Label>Full siblings (only counted if no children and no father)</Label>
            <Input type="number" min={0} value={i.siblings}
              onChange={(e) => setI({ ...i, siblings: Math.max(0, Number(e.target.value) || 0) })} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-semibold">Distribution</h2>
            <div className="text-xs text-muted-foreground">
              Residue → {result.residueTo}
            </div>
          </div>
          {result.shares.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add at least one heir above.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {result.shares.map((s) => (
                <div key={s.heir} className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium">{s.heir}</div>
                    <div className="text-xs text-muted-foreground">{s.fraction}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{fmt(s.amount)}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {i.estate > 0 ? ((s.amount / i.estate) * 100).toFixed(1) : "0"}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {result.notes.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {result.notes.map((n, k) => <li key={k}>• {n}</li>)}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}
