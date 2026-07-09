import { Link } from "react-router-dom";
import { ArrowLeft, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Ṣaḥīḥ al-Bukhārī, Ṣaḥīḥ Muslim.', 'Sunan Abū Dāwūd, Sunan at-Tirmidhī.', "Sunan an-Nasā'ī, Sunan Ibn Mājah.", "Muwaṭṭā' and Musnad Aḥmad — also foundational."];

export default function HadithSixBooks() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Kutub as-Sittah — Heartify" description="Kutub as-Sittah: Six canonical collections." path="/kutub-sittah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Library className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Kutub as-Sittah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Six canonical collections</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
