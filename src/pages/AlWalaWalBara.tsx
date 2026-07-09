import { Link } from "react-router-dom";
import { ArrowLeft, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function AlWalaWalBara() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Al-Walā' wa'l-Barā'" description="Loyalty for the sake of Allah" path="/al-wala-wal-bara" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <HeartHandshake className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Al-Walā' wa'l-Barā'</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Meaning</h2>
        <Card key="0-0" className="p-4"><div>Love and support what Allah loves; distance from what He dislikes — without wronging others (Qur'an 60:8).</div></Card>
      </div>
    </div>
  );
}
