import { Link } from "react-router-dom";
import { ArrowLeft, Share, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

export default function SocialMediaEthics() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Social Media Ethics" description="Digital adab" path="/social-media-ethics" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <Share className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Social Media Ethics</h1>
      </div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold pt-2">Guidelines</h2>
        <Card className="p-4"><div>Guard tongue, keep amānah, avoid ghībah/fitnah online (Q 49:12).</div></Card>
      </div>
    </div>
  );
}
