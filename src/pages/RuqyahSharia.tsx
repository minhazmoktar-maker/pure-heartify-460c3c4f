import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function RuqyahSharia() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ruqyah Shar'iyyah" description="Healing with Qur'an and authentic du'ās" path="/ruqyah-shariah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Sparkles className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Ruqyah Shar'iyyah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Foundations</h2>
        <Card key="0-0" className="p-4"><div>Sūrat al-Fātiḥah, al-Ikhlāṣ, al-Falaq, an-Nās, Āyat al-Kursī.</div></Card>
        <h2 className="font-semibold pt-2">Guidelines</h2>
        <Card key="1-0" className="p-4"><div>Words must be understood, in Arabic, and belief that only Allah heals — Muslim 2200.</div></Card>
      </div>
    </div>
  );
}
