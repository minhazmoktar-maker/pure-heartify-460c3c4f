import { Link } from "react-router-dom";
import { ArrowLeft, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Successor to the Prophet ﷺ in worldly leadership (not prophethood).', 'Rāshidūn model: Abū Bakr, ʿUmar, ʿUthmān, ʿAlī.', 'Ended 1924 — ummah currently without united khilāfah.', 'Re-establishing it is a communal responsibility, not through takfīr or violence.'];

export default function KhilafahConcept() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="The Khilāfah — Heartify" description="The Khilāfah: Historical & jurisprudential." path="/khilafah-concept" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Crown className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">The Khilāfah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Historical & jurisprudential</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
