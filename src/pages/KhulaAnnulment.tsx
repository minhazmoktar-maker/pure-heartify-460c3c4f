import { Link } from "react-router-dom";
import { ArrowLeft, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function KhulaAnnulment() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Khul' — Wife-Initiated Separation" description="Right of the wife to seek release" path="/khula-annulment" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <FileX className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Khul' — Wife-Initiated Separation</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Basis</h2>
        <Card key="0-0" className="p-4"><div>Ḥadīth of Jamīlah bint 'Abdillāh — she returned the garden (Bukhari 5273).</div></Card>
        <h2 className="font-semibold pt-2">Process</h2>
        <Card key="1-0" className="p-4"><div>Wife returns the mahr (or agreed compensation); qāḍī grants the separation.</div></Card>
      </div>
    </div>
  );
}
