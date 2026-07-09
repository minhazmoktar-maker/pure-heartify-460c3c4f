import { Link } from "react-router-dom";
import { ArrowLeft, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Fard kifāyah in every settlement.",
  "Wording: 15 phrases (Ḥanafī/Ḥanbalī) or with tarjī' (Mālikī/Shāfi'ī, Muslim 379).",
  "'Aṣ-ṣalātu khayrun min an-nawm' in Fajr adhān only (Abu Dawud 501)."
];
const S1 = [
  "Repeat what the mu'adhdhin says, except for ḥayya 'alā — reply 'lā ḥawla wa lā quwwata illā billāh' (Muslim 385).",
  "After adhān: ṣalāh on the Prophet ﷺ then the du'ā of the waṣīlah (Bukhari 614).",
  "Du'ā between adhān and iqāmah is not rejected (Abu Dawud 521)."
];
const S2 = [
  "Shorter form (11 phrases) with 'qad qāmati-ṣ-ṣalāh' twice.",
  "Only the mu'adhdhin calls the iqāmah (Abu Dawud 514)."
];

export default function AdhanIqamah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Adhān & Iqāmah — The Call to Prayer" description="Rulings, wording, response, and the du'ā after the adhān." path="/adhan-iqamah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Volume2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Adhān & Iqāmah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Adhān</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Response</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Iqāmah</h2>
        {S2.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}