import { Link } from "react-router-dom";
import { ArrowLeft, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Four agreed sources: Qur'an, Sunnah, Ijmāʿ, Qiyās.", "Additional: istiḥsān, maṣlaḥah, ʿurf, sadd adh-dharā'iʿ.", 'Maqāṣid ash-sharīʿah — objectives of the law.', 'Studying it prevents shallow rulings.'];

export default function FiqhUsul() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Uṣūl al-Fiqh — Heartify" description="Uṣūl al-Fiqh: Principles of jurisprudence." path="/usul-fiqh" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <GitBranch className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Uṣūl al-Fiqh</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Principles of jurisprudence</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
