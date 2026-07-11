import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Droplets, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SEO from "@/components/SEO";

type Step = { id: string; title: string; detail: string };

const GHUSL: Step[] = [
  { id: "g1", title: "Niyyah", detail: "Intend in the heart to purify from major ritual impurity (janabah, hayd, nifas)." },
  { id: "g2", title: "Bismillah & wash hands", detail: "Say Bismillah and wash both hands three times." },
  { id: "g3", title: "Wash private parts", detail: "Remove any impurity from the private area." },
  { id: "g4", title: "Perform wudu", detail: "Do a complete wudu as for salah (may delay washing feet to the end)." },
  { id: "g5", title: "Pour water over the head three times", detail: "Ensure water reaches the roots of the hair." },
  { id: "g6", title: "Wash the right side, then the left", detail: "Then pour water over the whole body ensuring no dry spots remain." },
  { id: "g7", title: "Wash the feet", detail: "If delayed from wudu, wash them now to complete the ghusl." },
];

const TAYAMMUM: Step[] = [
  { id: "t1", title: "Condition", detail: "Water is unavailable, insufficient, harmful, or would delay salah past its time. Use clean earth, dust, sand or stone." },
  { id: "t2", title: "Niyyah", detail: "Intend purification from hadath to make salah permissible." },
  { id: "t3", title: "Bismillah", detail: "Say Bismillah." },
  { id: "t4", title: "Strike palms on clean earth once", detail: "Blow off any excess dust." },
  { id: "t5", title: "Wipe the face", detail: "Wipe the entire face once with both palms." },
  { id: "t6", title: "Wipe the hands to the wrists", detail: "Wipe the back of the right hand with the left palm, then the back of the left hand with the right palm (Sahih Sunnah description — Bukhari 347)." },
];

const NAWAQID: Step[] = [
  { id: "n1", title: "Anything from the two passages", detail: "Urine, stool, wind, mani, madhi, wadi." },
  { id: "n2", title: "Deep sleep or loss of consciousness", detail: "Any sleep that removes awareness." },
  { id: "n3", title: "Touching the private part with the palm (some madhahib)", detail: "Direct skin-to-skin without barrier — differed on." },
  { id: "n4", title: "Eating camel meat", detail: "Established sunnah (Muslim 360)." },
  { id: "n5", title: "Anything requiring ghusl", detail: "Janabah, ending of hayd or nifas — requires full ghusl, which includes wudu." },
];

const STORAGE_KEY = "purification.done";

const Purification = () => {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const all = [...GHUSL, ...TAYAMMUM, ...NAWAQID];
  const count = Object.values(done).filter(Boolean).length;

  const List = ({ items }: { items: Step[] }) => (
    <div className="grid gap-3">{items.map((s, i) => (
      <Card key={s.id} className={`p-4 cursor-pointer ${done[s.id] ? "border-primary/60 bg-primary/5" : ""}`} onClick={() => persist({ ...done, [s.id]: !done[s.id] })}>
        <div className="flex items-start gap-3"><Badge variant="secondary">{i + 1}</Badge><div><h3 className="font-semibold mb-1">{s.title}</h3><p className="text-sm text-muted-foreground">{s.detail}</p></div></div>
      </Card>
    ))}</div>
  );

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Ghusl, Tayammum & Nullifiers of Wudu — Taharah Guide" description="Step-by-step ghusl, tayammum when water is unavailable, and the nullifiers of wudu with authentic sources." path="/purification" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon" aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Button></Link><Droplets className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Purification (Taharah)</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4">
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Reviewed</span><span className="text-sm font-medium">{count} / {all.length}</span></div><Progress value={(count / all.length) * 100} /></Card>
        <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => persist({})}><RotateCcw className="w-4 h-4 mr-2" />Reset</Button></div>
        <Tabs defaultValue="ghusl">
          <TabsList><TabsTrigger value="ghusl">Ghusl</TabsTrigger><TabsTrigger value="tayammum">Tayammum</TabsTrigger><TabsTrigger value="nullifiers">Nullifiers</TabsTrigger></TabsList>
          <TabsContent value="ghusl" className="mt-4"><List items={GHUSL} /></TabsContent>
          <TabsContent value="tayammum" className="mt-4"><List items={TAYAMMUM} /></TabsContent>
          <TabsContent value="nullifiers" className="mt-4"><List items={NAWAQID} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Purification;
