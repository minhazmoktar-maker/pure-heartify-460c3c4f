import { Link } from "react-router-dom";
import { ArrowLeft, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "'Every child is born upon the fiṭrah; his parents make him a Jew, Christian, or Magian' (Bukhari 1358).",
  "Qur'an 30:30 — 'The fiṭrah of Allah upon which He created mankind.'",
  "Kufr and shirk are deviations from the original nature."
];
const S1 = [
  "Circumcision, shaving the pubic hair, plucking the armpit hair, trimming the moustache, cutting the nails, washing the finger joints, using the miswāk, rinsing the nose, rinsing the mouth, and istinjā' with water (Muslim 261, 223)."
];

export default function Fitrah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Fiṭrah — The Innate Nature" description="The natural disposition to worship Allah alone, and the 10 sunnahs of fiṭrah." path="/fitrah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Sprout className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Fiṭrah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Innate tawḥīd</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Ten sunnahs of fiṭrah</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}