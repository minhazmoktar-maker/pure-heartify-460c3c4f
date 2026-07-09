import { Link } from "react-router-dom";
import { ArrowLeft, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Domes, minarets, arches, muqarnas.', 'Geometry, arabesque, calligraphy — no figurative worship imagery.', 'Regional schools: Umayyad, Mamluk, Mughal, Ottoman, Andalusian.', 'Purpose-driven: masjid, madrasa, ribāṭ, hammām.'];

export default function IslamicArchitecture() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Islamic Architecture — Heartify" description="Islamic Architecture: Signature elements." path="/islamic-architecture" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Building className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Islamic Architecture</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Signature elements</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
