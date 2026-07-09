import { Link } from "react-router-dom";
import { ArrowLeft, Group } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const S0 = [
  "Subḥānaka-Llāhumma wa bi-ḥamdik, ashhadu an lā ilāha illā anta, astaghfiruka wa atūbu ilayk (Tirmidhi 3433).",
  "'Whoever says this at the end of a gathering, Allah forgives what took place in it' (Ṣaḥīḥ al-Jāmi' 6192)."
];
const S1 = [
  "Begin with Bismillāh, ḥamd, and salawāt.",
  "Do not sit between two people without their permission (Abu Dawud 4844).",
  "When three are together, two should not converse secretly excluding the third (Bukhari 6288)."
];

export default function KaffaratMajlis() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Kaffārat al-Majlis — Expiation of the Gathering" description="The du'ā the Prophet ﷺ taught to erase whatever idle speech occurred in a sitting." path="/kaffarat-al-majlis" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Group className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Kaffārat al-Majlis</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Du'ā</h2>
        {S0.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
        <h2 className="font-semibold pt-2">Adab of gatherings</h2>
        {S1.map((x, k) => (<Card key={k} className="p-4"><div>{x}</div></Card>))}
      </div>
    </div>
  );
}