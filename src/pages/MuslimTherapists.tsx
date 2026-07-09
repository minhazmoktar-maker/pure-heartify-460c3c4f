import { Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Look for licensed clinicians familiar with Islamic worldview.', 'Directories: Khalil Center, Muslim Wellness Foundation, IMANA.', 'Telehealth expands access globally.', 'Ask about training in TIIP (Traditional Islamically Integrated Psychotherapy).'];

export default function MuslimTherapists() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Muslim Therapist Directory — Heartify" description="Muslim Therapist Directory: Finding help." path="/muslim-therapists" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Search className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Muslim Therapist Directory</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Finding help</h2>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
