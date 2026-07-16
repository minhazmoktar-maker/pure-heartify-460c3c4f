import { useEffect, useMemo, useState } from "react";
import { Scroll, Plus, Trash2, Download, Info } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { toast } from "sonner";

type Row = { id: string; label: string; value: string };

type Wasiyyah = {
  fullName: string;
  otherNames: string;
  dob: string;
  nationality: string;
  address: string;
  maritalStatus: string;
  spouse: string;
  children: string;
  parents: string;
  executor1: string;
  executor2: string;
  guardian: string;
  assets: Row[];
  debts: Row[];
  bequests: Row[]; // up to 1/3 to non-heirs
  funeralWishes: string;
  charities: Row[];
  witnesses: string;
  signedDate: string;
  notes: string;
};

const KEY = "wasiyyah:draft";
const uid = () => Math.random().toString(36).slice(2, 10);

const empty: Wasiyyah = {
  fullName: "", otherNames: "", dob: "", nationality: "", address: "",
  maritalStatus: "", spouse: "", children: "", parents: "",
  executor1: "", executor2: "", guardian: "",
  assets: [], debts: [], bequests: [],
  funeralWishes: "Ghusl and Islamic funeral prayer according to the Sunnah, burial in a Muslim cemetery without delay, no elaborate ceremonies.",
  charities: [],
  witnesses: "",
  signedDate: new Date().toISOString().slice(0, 10),
  notes: "",
};

function load(): Wasiyyah {
  try { const v = localStorage.getItem(KEY); return v ? { ...empty, ...JSON.parse(v) } : empty; }
  catch { return empty; }
}

const Field = ({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) => (
  <label className="block">
    <span className="mb-1 block text-micro font-medium text-muted-foreground">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-card border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
    />
  </label>
);

const Area = ({ label, value, onChange, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) => (
  <label className="block">
    <span className="mb-1 block text-micro font-medium text-muted-foreground">{label}</span>
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-card border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
    />
  </label>
);

const RowList = ({ title, rows, setRows, labels, sum }: {
  title: string;
  rows: Row[];
  setRows: (r: Row[]) => void;
  labels: [string, string];
  sum?: boolean;
}) => {
  const total = sum ? rows.reduce((s, r) => s + (parseFloat(r.value) || 0), 0) : 0;
  return (
    <section className="rounded-card border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading font-semibold text-foreground">{title}</h3>
        <button
          onClick={() => setRows([...rows, { id: uid(), label: "", value: "" }])}
          className="inline-flex items-center gap-1 rounded-card border border-border px-2 py-1 text-micro hover:border-primary hover:text-primary"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-micro text-muted-foreground">None added yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="grid grid-cols-[1fr_140px_auto] gap-2">
              <input
                placeholder={labels[0]}
                value={r.label}
                onChange={(e) => setRows(rows.map((x) => x.id === r.id ? { ...x, label: e.target.value } : x))}
                className="h-9 rounded-card border border-border bg-background px-2 text-sm"
              />
              <input
                placeholder={labels[1]}
                value={r.value}
                onChange={(e) => setRows(rows.map((x) => x.id === r.id ? { ...x, value: e.target.value } : x))}
                className="h-9 rounded-card border border-border bg-background px-2 text-sm"
              />
              <button
                onClick={() => setRows(rows.filter((x) => x.id !== r.id))}
                className="rounded-card p-2 text-muted-foreground hover:bg-secondary"
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {sum && rows.length > 0 && (
        <p className="mt-3 text-right text-micro text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{total.toLocaleString()}</span>
        </p>
      )}
    </section>
  );
};

const Wasiyyah = () => {
  const [w, setW] = useState<Wasiyyah>(load);
  const set = <K extends keyof Wasiyyah>(k: K, v: Wasiyyah[K]) => setW((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(w));
  }, [w]);

  const bequestTotal = useMemo(
    () => w.bequests.reduce((s, r) => s + (parseFloat(r.value) || 0), 0),
    [w.bequests],
  );
  const netEstate = useMemo(() => {
    const a = w.assets.reduce((s, r) => s + (parseFloat(r.value) || 0), 0);
    const d = w.debts.reduce((s, r) => s + (parseFloat(r.value) || 0), 0);
    return Math.max(0, a - d);
  }, [w.assets, w.debts]);
  const thirdCap = netEstate / 3;
  const overThird = bequestTotal > thirdCap && netEstate > 0;

  const exportText = () => {
    const lines: string[] = [];
    const H = (t: string) => { lines.push(""); lines.push(t.toUpperCase()); lines.push("-".repeat(t.length)); };
    lines.push("BISMILLAHIR RAHMANIR RAHEEM");
    lines.push("");
    lines.push("ISLAMIC LAST WILL AND TESTAMENT (WASIYYAH)");
    lines.push("");
    lines.push(`I, ${w.fullName || "___"}${w.otherNames ? ` (also known as ${w.otherNames})` : ""}, of ${w.address || "___"}, being of sound mind, declare this to be my last will.`);
    H("Personal details");
    lines.push(`Date of birth: ${w.dob || "___"}`);
    lines.push(`Nationality: ${w.nationality || "___"}`);
    lines.push(`Marital status: ${w.maritalStatus || "___"}`);
    if (w.spouse) lines.push(`Spouse: ${w.spouse}`);
    if (w.children) lines.push(`Children: ${w.children}`);
    if (w.parents) lines.push(`Parents: ${w.parents}`);
    H("Declaration of faith");
    lines.push("I bear witness that there is no god but Allah, alone with no partner, and that Muhammad ﷺ is His servant and messenger. I die upon Islam and the Sunnah.");
    H("Executors and guardian");
    lines.push(`Primary executor: ${w.executor1 || "___"}`);
    if (w.executor2) lines.push(`Alternate executor: ${w.executor2}`);
    if (w.guardian) lines.push(`Guardian for minor children: ${w.guardian}`);
    H("Debts");
    if (w.debts.length === 0) lines.push("I declare no outstanding debts at the time of writing.");
    else w.debts.forEach((r) => lines.push(`- ${r.label || "___"}: ${r.value || "___"}`));
    lines.push("All lawful debts must be settled from my estate before any distribution.");
    H("Assets");
    w.assets.forEach((r) => lines.push(`- ${r.label || "___"}: ${r.value || "___"}`));
    H("Bequests (up to 1/3 to non-heirs)");
    if (w.bequests.length === 0) lines.push("No specific bequests.");
    else w.bequests.forEach((r) => lines.push(`- ${r.label || "___"}: ${r.value || "___"}`));
    H("Charitable wishes");
    if (w.charities.length === 0) lines.push("None specified.");
    else w.charities.forEach((r) => lines.push(`- ${r.label || "___"}: ${r.value || "___"}`));
    H("Distribution of estate");
    lines.push("The remaining estate after debts and bequests must be distributed among my legal heirs strictly according to the rules of Islamic inheritance (mirath) as set out in the Qur'an and Sunnah.");
    H("Funeral wishes");
    lines.push(w.funeralWishes || "As per the Sunnah.");
    if (w.notes) { H("Additional notes"); lines.push(w.notes); }
    H("Signed");
    lines.push(`Date: ${w.signedDate}`);
    lines.push(`Witnesses: ${w.witnesses || "___"}`);
    lines.push("");
    lines.push("IMPORTANT: This document is a personal draft to help articulate your Islamic wishes. For it to be legally enforceable in your jurisdiction, please have it reviewed and formalized by a qualified Islamic scholar and a licensed lawyer.");

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wasiyyah-${w.fullName || "draft"}-${w.signedDate}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Wasiyyah Builder — Draft Your Islamic Will | Heartify"
        description="Draft your Islamic last will (wasiyyah) privately on-device: executors, assets, debts, up-to-one-third bequests, funeral wishes, exportable to text."
        path="/wasiyyah"
      />
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <header className="mb-4 flex items-start gap-3">
          <div className="rounded-card bg-primary/10 p-3 text-primary">
            <Scroll className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-heading text-title font-bold text-foreground md:text-display">Wasiyyah Builder</h1>
            <p className="mt-1 text-muted-foreground">
              "It is not permissible for any Muslim who has something to will to stay for two nights without having his last will written." — Bukhari
            </p>
          </div>
        </header>

        <div className="mb-6 flex items-start gap-2 rounded-card border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            This is a private on-device draft to help you articulate your wishes. Have it reviewed and formalized by a qualified scholar and a licensed lawyer in your jurisdiction before treating it as legally binding.
          </p>
        </div>

        <div className="space-y-6">
          <section className="rounded-card border border-border bg-card p-5">
            <h2 className="mb-3 font-heading text-heading font-semibold text-foreground">Personal details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full legal name" value={w.fullName} onChange={(v) => set("fullName", v)} />
              <Field label="Other known names (optional)" value={w.otherNames} onChange={(v) => set("otherNames", v)} />
              <Field label="Date of birth" value={w.dob} onChange={(v) => set("dob", v)} type="date" />
              <Field label="Nationality" value={w.nationality} onChange={(v) => set("nationality", v)} />
              <div className="sm:col-span-2"><Area label="Residential address" value={w.address} onChange={(v) => set("address", v)} rows={2} /></div>
              <Field label="Marital status" value={w.maritalStatus} onChange={(v) => set("maritalStatus", v)} placeholder="Married / Single / Widowed" />
              <Field label="Spouse (name)" value={w.spouse} onChange={(v) => set("spouse", v)} />
              <div className="sm:col-span-2"><Area label="Children (names & DOB)" value={w.children} onChange={(v) => set("children", v)} rows={2} /></div>
              <div className="sm:col-span-2"><Area label="Parents (living)" value={w.parents} onChange={(v) => set("parents", v)} rows={2} /></div>
            </div>
          </section>

          <section className="rounded-card border border-border bg-card p-5">
            <h2 className="mb-3 font-heading text-heading font-semibold text-foreground">Executors & guardian</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Primary executor" value={w.executor1} onChange={(v) => set("executor1", v)} />
              <Field label="Alternate executor" value={w.executor2} onChange={(v) => set("executor2", v)} />
              <div className="sm:col-span-2">
                <Field label="Guardian for minor children" value={w.guardian} onChange={(v) => set("guardian", v)} />
              </div>
            </div>
          </section>

          <RowList title="Assets" rows={w.assets} setRows={(r) => set("assets", r)} labels={["Description", "Value"]} sum />
          <RowList title="Debts to settle first" rows={w.debts} setRows={(r) => set("debts", r)} labels={["Creditor", "Amount"]} sum />

          <div>
            <RowList title="Bequests (max 1/3 of net estate to non-heirs)" rows={w.bequests} setRows={(r) => set("bequests", r)} labels={["Beneficiary & purpose", "Amount"]} sum />
            {netEstate > 0 && (
              <p className={`mt-2 text-micro ${overThird ? "text-destructive" : "text-muted-foreground"}`}>
                Net estate: <span className="font-semibold text-foreground">{netEstate.toLocaleString()}</span> · 1/3 cap: <span className="font-semibold text-foreground">{thirdCap.toLocaleString()}</span> · Bequests: <span className={`font-semibold ${overThird ? "text-destructive" : "text-foreground"}`}>{bequestTotal.toLocaleString()}</span>
                {overThird && " — reduce; a Muslim may only bequeath up to 1/3 to non-heirs."}
              </p>
            )}
          </div>

          <RowList title="Charitable wishes (sadaqah jariyah)" rows={w.charities} setRows={(r) => set("charities", r)} labels={["Cause / organization", "Amount"]} />

          <section className="rounded-card border border-border bg-card p-5 space-y-3">
            <h2 className="font-heading text-heading font-semibold text-foreground">Funeral & additional</h2>
            <Area label="Funeral wishes" value={w.funeralWishes} onChange={(v) => set("funeralWishes", v)} rows={3} />
            <Area label="Additional notes" value={w.notes} onChange={(v) => set("notes", v)} rows={3} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Signed date" value={w.signedDate} onChange={(v) => set("signedDate", v)} type="date" />
              <Field label="Witnesses (names)" value={w.witnesses} onChange={(v) => set("witnesses", v)} placeholder="Two adult Muslim witnesses" />
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportText}
              className="inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Download className="h-4 w-4" /> Download draft
            </button>
            <button
              onClick={() => { if (confirm("Clear the entire draft?")) { setW(empty); toast.success("Cleared"); } }}
              className="rounded-card border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary"
            >
              Clear draft
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Wasiyyah;
