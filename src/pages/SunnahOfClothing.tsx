import { Link } from "react-router-dom";
import { ArrowLeft, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function SunnahOfClothing() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Sunnah of Clothing" description="Modesty, dignity, and moderation in dress" path="/sunnah-of-clothing" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Shirt className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Sunnah of Clothing</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Principles</h2>
        <Card key="0-0" className="p-4"><div>Cover the 'awrah, avoid arrogance and imitation of the disbelievers in symbols of their religion.</div></Card>
        <h2 className="font-semibold pt-2">Details</h2>
        <Card key="1-0" className="p-4"><div>Men: not below the ankles from pride (Bukhari 5787). Women: loose, opaque, not attracting attention (Qur'an 33:59).</div></Card>
      </div>
    </div>
  );
}
