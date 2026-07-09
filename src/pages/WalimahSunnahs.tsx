import { Link } from "react-router-dom";
import { ArrowLeft, Cake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function WalimahSunnahs() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Walīmah — Marriage Feast" description="Etiquette of the wedding banquet" path="/walimah-sunnahs" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Cake className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Walīmah — Marriage Feast</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Ruling</h2>
        <Card key="0-0" className="p-4"><div>Sunnah mu'akkadah on the groom.</div></Card>
        <h2 className="font-semibold pt-2">Adab</h2>
        <Card key="1-0" className="p-4"><div>Invite the poor along with the rich (Bukhari 5177).</div></Card>
        <Card key="1-1" className="p-4"><div>Accept invitations unless a valid excuse.</div></Card>
      </div>
    </div>
  );
}
