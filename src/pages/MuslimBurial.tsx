import { Link } from "react-router-dom";
import { ArrowLeft, Cross } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = ['Prompt ghusl & kafan.', 'Ṣalāt al-janāzah communal.', 'Simple grave, no structures.', 'Duʿāʾ for the deceased ongoing.'];

export default function MuslimBurial() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Muslim Burial Rites — Heartify" description={'Janāzah & burial procedures.'} path="/muslim-burial" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Cross className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Muslim Burial Rites</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <p className="text-muted-foreground">Janāzah & burial procedures.</p>
        {ITEMS.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}
