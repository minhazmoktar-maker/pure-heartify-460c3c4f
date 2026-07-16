import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Users, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import SEO from "@/components/SEO";

type P = { id: string; name: string; relation: string; summary: string };

const PEOPLE: P[] = [
  { id: "abdullah", name: "'Abd Allāh ibn 'Abd al-Muṭṭalib", relation: "Father", summary: "Died before the Prophet ﷺ was born." },
  { id: "amina", name: "Āminah bint Wahb", relation: "Mother", summary: "Died when he ﷺ was six years old, at al-Abwā'." },
  { id: "halima", name: "Ḥalīmah as-Sa'diyyah", relation: "Wet-nurse", summary: "Nursed him ﷺ in the desert of Banū Sa'd; he showed her deep honour throughout life." },
  { id: "abdulmuttalib", name: "'Abd al-Muṭṭalib", relation: "Paternal grandfather", summary: "Cared for him ﷺ after his mother's death; died when he was eight." },
  { id: "abutalib", name: "Abū Ṭālib", relation: "Paternal uncle", summary: "Raised him ﷺ from age 8 and protected him through the Meccan years." },
  { id: "hamza", name: "Ḥamzah ibn 'Abd al-Muṭṭalib", relation: "Paternal uncle", summary: "Sayyid ash-Shuhadā'; martyred at Uhud." },
  { id: "abbas", name: "Al-'Abbās ibn 'Abd al-Muṭṭalib", relation: "Paternal uncle", summary: "Ancestor of the Abbasid caliphate; embraced Islam before Fatḥ Makkah." },
  { id: "khadija", name: "Khadījah bint Khuwaylid", relation: "First wife (mother of most of his children)", summary: "The first believer; supported him in the earliest years of da'wah." },
  { id: "aisha", name: "'Ā'ishah bint Abī Bakr", relation: "Wife — Umm al-Mu'minīn", summary: "Greatest female scholar of the ummah; narrated 2,210 aḥādīth." },
  { id: "fatima", name: "Fāṭimah az-Zahrā'", relation: "Daughter", summary: "Leader of the women of Paradise; wife of 'Alī, mother of Ḥasan and Ḥusayn." },
  { id: "hasan", name: "Al-Ḥasan ibn 'Alī", relation: "Grandson", summary: "The Prophet ﷺ said he would reconcile two great factions of Muslims — fulfilled in 41 AH." },
  { id: "husayn", name: "Al-Ḥusayn ibn 'Alī", relation: "Grandson", summary: "Martyred at Karbalā' in 61 AH; 'Ḥasan and Ḥusayn are the two chiefs of the youth of Paradise.'" },
];

const KEY = "ahlbayt.done";

const AhlulBayt = () => {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } });
  const [q, setQ] = useState("");
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(KEY, JSON.stringify(n)); };
  const count = Object.values(done).filter(Boolean).length;
  const filtered = PEOPLE.filter(p => (p.name + p.summary + p.relation).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="The Family of the Prophet ﷺ — Ahl al-Bayt" description="The blessed family of Prophet Muḥammad ﷺ — parents, uncles, wives, children, and grandchildren from authentic sīrah." path="/ahlul-bayt" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon" aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Button></Link><Users className="w-6 h-6 text-primary" /><h1 className="text-title font-bold">Ahl al-Bayt — Family of the Prophet ﷺ</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Learned</span><span className="text-sm font-medium">{count} / {PEOPLE.length}</span></div><Progress value={(count / PEOPLE.length) * 100} /></Card>
        <div className="flex gap-2"><Input placeholder="Search family members…" value={q} onChange={e => setQ(e.target.value)} /><Button variant="outline" size="sm" onClick={() => persist({})}><RotateCcw className="w-4 h-4" /></Button></div>
        {filtered.map(p => (
          <Card key={p.id} className="p-5 cursor-pointer hover:border-primary transition" onClick={() => persist({ ...done, [p.id]: !done[p.id] })}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div><h2 className="font-semibold text-heading">{p.name}</h2><Badge variant="secondary" className="mt-1">{p.relation}</Badge></div>
              {done[p.id] && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
            </div>
            <p className="text-sm text-muted-foreground">{p.summary}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AhlulBayt;
