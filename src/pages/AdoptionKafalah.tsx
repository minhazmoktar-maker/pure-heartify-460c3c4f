import { Link } from "react-router-dom";
import { ArrowLeft, HandHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Full legal adoption (changing lineage) forbidden (Qur'an 33:4-5).", "Kafālah — sponsorship keeps child's real name.", 'Rewarded like caring for orphan.', 'Maḥram rules apply carefully.'];

export default function AdoptionKafalah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Adoption & Kafālah — Heartify" description="Adoption & Kafālah: Rulings." path="/adoption-kafalah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <HandHeart className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Adoption & Kafālah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Rulings</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
