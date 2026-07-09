import { Link } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const ITEMS = [
  { r: "The Prophet ﷺ said: Jibrīl kept enjoining me concerning the neighbor until I thought he would give him a share of inheritance.", ref: "Bukhari 6014; Muslim 2624" },
  { r: "Whoever believes in Allah and the Last Day, let him honor his neighbor.", ref: "Bukhari 6018; Muslim 47" },
  { r: "By Allah, he is not a believer! (three times) — the one whose neighbor is not safe from his harm.", ref: "Bukhari 6016" },
  { r: "The best of companions with Allah is the one who is best to his companion; the best of neighbors is the one best to his neighbor.", ref: "Tirmidhi 1944" },
  { r: "O Abu Dharr, when you cook broth, add extra water and give some to your neighbor.", ref: "Muslim 2625" },
  { r: "Do not consider any good deed as insignificant, even meeting your brother with a cheerful face.", ref: "Muslim 2626" },
  { r: "The nearer neighbor comes before the farther, and the door-adjacent takes precedence.", ref: "Bukhari 6020" },
  { r: "Rights of the neighbor: greet him first, visit him when ill, follow his funeral, congratulate his joys, console his sorrows, cover his faults, do not overlook his gifts, do not block his sunlight without permission, do not annoy him with cooking smells without sharing.", ref: "Ghazālī, Iḥyā'; based on hadith reports" },
];
const NeighborRights = () => (
  <div className="min-h-screen bg-background">
    <SEO title="Rights of the Neighbor in Islam (Ḥuqūq al-Jār)" description="Authentic Qur'anic and Prophetic teachings on the rights of neighbors — greeting, visiting, gifting, and protecting from harm." path="/neighbor-rights" />
    <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Home className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Ḥuqūq al-Jār — Rights of the Neighbor</h1></div></div>
    <div className="container mx-auto px-4 py-6 max-w-3xl space-y-3">
      {ITEMS.map((x, i) => (<Card key={i} className="p-4"><div>{x.r}</div><div className="mt-1 text-xs text-muted-foreground">{x.ref}</div></Card>))}
    </div>
  </div>
);
export default NeighborRights;
