import { Link } from "react-router-dom";
import { ArrowLeft, Ghost } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function JinnAndShaytan() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Jinn & Shayṭān — What Muslims Believe" description="Basic 'aqīdah about the unseen creation" path="/jinn-shaytan" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Ghost className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Jinn & Shayṭān — What Muslims Believe</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Nature</h2>
        <Card key="0-0" className="p-4"><div>Created from smokeless fire (Qur'an 55:15). Some are believers, some disbelievers.</div></Card>
        <h2 className="font-semibold pt-2">Protection</h2>
        <Card key="1-0" className="p-4"><div>Āyat al-Kursī before sleep (Bukhari 2311).</div></Card>
        <Card key="1-1" className="p-4"><div>Bismillāh when entering the home, eating, dressing.</div></Card>
      </div>
    </div>
  );
}
