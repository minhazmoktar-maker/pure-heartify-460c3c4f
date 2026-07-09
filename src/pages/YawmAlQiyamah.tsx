import { Link } from "react-router-dom";
import { ArrowLeft, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function YawmAlQiyamah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Yawm al-Qiyāmah — The Day of Judgement" description="Signs, stages, and stations of that Day" path="/yawm-al-qiyamah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Sunrise className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Yawm al-Qiyāmah — The Day of Judgement</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Stages</h2>
        <Card key="0-0" className="p-4"><div>Resurrection, gathering, giving of records, scales, ṣirāṭ.</div></Card>
        <h2 className="font-semibold pt-2">Shade</h2>
        <Card key="1-0" className="p-4"><div>Seven under Allah's shade when there is no shade but His (Bukhari 660).</div></Card>
      </div>
    </div>
  );
}
