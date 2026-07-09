import { Link } from "react-router-dom";
import { ArrowLeft, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function MarriageContract() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Nikāḥ — The Marriage Contract" description="Pillars and conditions of a valid Islamic marriage" path="/nikah-contract" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Handshake className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Nikāḥ — The Marriage Contract</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Pillars</h2>
        <Card key="0-0" className="p-4"><div>Consent of both parties.</div></Card>
        <Card key="0-1" className="p-4"><div>Walī (guardian) for the bride.</div></Card>
        <Card key="0-2" className="p-4"><div>Two witnesses.</div></Card>
        <Card key="0-3" className="p-4"><div>Mahr (dower).</div></Card>
        <h2 className="font-semibold pt-2">Sunnah</h2>
        <Card key="1-0" className="p-4"><div>Announce it publicly and hold a walīmah (Bukhari 5155).</div></Card>
      </div>
    </div>
  );
}
