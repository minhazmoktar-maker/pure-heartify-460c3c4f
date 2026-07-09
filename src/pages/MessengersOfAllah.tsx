import { Link } from "react-router-dom";
import { ArrowLeft, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function MessengersOfAllah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="The Messengers of Allah" description="Belief in all Prophets ﷺ" path="/messengers-of-allah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <UserCheck className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">The Messengers of Allah</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Twenty-Five Named</h2>
        <Card key="0-0" className="p-4"><div>Ādam, Idrīs, Nūḥ, Hūd, Ṣāliḥ, Ibrāhīm, Lūṭ, Ismā'īl, Isḥāq, Ya'qūb, Yūsuf, Ayyūb, Shu'ayb, Mūsā, Hārūn, Dhū'l-Kifl, Dāwūd, Sulaymān, Ilyās, Ilyasa', Yūnus, Zakariyyā, Yaḥyā, 'Īsā, Muḥammad ﷺ.</div></Card>
        <h2 className="font-semibold pt-2">The Five 'Ulū al-'Azm</h2>
        <Card key="1-0" className="p-4"><div>Nūḥ, Ibrāhīm, Mūsā, 'Īsā, and Muḥammad ﷺ.</div></Card>
      </div>
    </div>
  );
}
