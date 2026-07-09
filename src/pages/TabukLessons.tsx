import { Link } from "react-router-dom";
import { ArrowLeft, Tent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function TabukLessons() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Expedition of Tabūk" description="Trial of sincerity" path="/tabuk-lessons" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Tent className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Expedition of Tabūk</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Lessons</h2>
        <Card key="0-0" className="p-4"><div>Test of the hypocrites; story of Kaʿb ibn Mālik (Bukhari 4418).</div></Card>
      </div>
    </div>
  );
}
