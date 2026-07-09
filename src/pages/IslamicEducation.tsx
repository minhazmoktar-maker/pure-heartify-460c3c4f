import { Link } from "react-router-dom";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ["Kuttāb (elementary), madrasa (secondary), jāmi'ah (university).", 'Ijāzah — chain of transmission for authorization.', "Integrate 'ulūm sharʿiyyah with worldly sciences.", 'Adab (character) precedes ʿilm (knowledge).'];

export default function IslamicEducation() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Islamic Education — Heartify" description="Islamic Education: System." path="/islamic-education" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <GraduationCap className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Islamic Education</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">System</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
