import { Link } from "react-router-dom";
import { ArrowLeft, ShowerHead } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function JanabahFiqh() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Janābah — Major Ritual Impurity" description="When ghusl becomes obligatory" path="/janabah-fiqh" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <ShowerHead className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Janābah — Major Ritual Impurity</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Causes</h2>
        <Card key="0-0" className="p-4"><div>Ejaculation (in sleep or awake).</div></Card>
        <Card key="0-1" className="p-4"><div>Sexual intercourse — even without ejaculation.</div></Card>
        <Card key="0-2" className="p-4"><div>End of ḥayḍ or nifās.</div></Card>
        <h2 className="font-semibold pt-2">Before Ghusl</h2>
        <Card key="1-0" className="p-4"><div>Do not pray or recite Qur'an.</div></Card>
        <Card key="1-1" className="p-4"><div>Wuḍū is recommended before sleeping if delaying ghusl (Bukhari 288).</div></Card>
      </div>
    </div>
  );
}
