import { Link } from "react-router-dom";
import { ArrowLeft, Sparkle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const V = [
  { v: "The best day upon which the sun rises is Friday: on it Adam was created, on it he was admitted to Paradise, on it he was expelled, and the Hour will not come except on a Friday.", ref: "Muslim 854" },
  { v: "There is an hour on Friday in which no Muslim servant asks Allah for anything except that Allah gives it to him.", ref: "Bukhari 935; Muslim 852 — most likely between 'Aṣr and Maghrib" },
  { v: "Whoever recites Sūrat al-Kahf on Friday, a light will shine for him between the two Fridays.", ref: "Nasa'i, al-Kubrā — Ṣaḥīḥ al-Jāmi' 6470" },
];
const SUNAN = [
  "Ghusl for Jumu'ah — Bukhari 877",
  "Miswāk and best clothes — Ibn Mājah 1097",
  "Apply 'iṭr (perfume) — Bukhari 883",
  "Go early on foot; each step is a year of fasting and standing — Tirmidhi 496",
  "Recite Sūrat al-Kahf — Ṣaḥīḥ al-Jāmi' 6470",
  "Send abundant ṣalāh upon the Prophet ﷺ — Abu Dawud 1047",
  "Pray Taḥiyyatul-Masjid on arrival (2 rak'ah, even if the khaṭīb is speaking) — Bukhari 931",
  "Listen silently to the khuṭbah — even 'be silent' is idle speech — Bukhari 934",
  "Pray 2 or 4 rak'ah Sunnah after Jumu'ah — Muslim 881, 882",
  "Seek the hour of acceptance in du'ā — Muslim 852",
];
const RULES = [
  "Obligatory on every free, adult, resident, sane male Muslim — not on women, travelers, or the ill (Abu Dawud 1067)",
  "Whoever misses three Jumu'ahs out of neglect — Allah seals his heart (Abu Dawud 1052)",
  "Two rak'ah, prayed after two khuṭbahs; replaces Zuhr",
  "No prayer or business transaction is permitted after the second adhān has been called (Qur'an 62:9)",
];

export default function Jumuah() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Jumu'ah — Fiqh, Virtues & Sunnahs of Friday" description="The rulings, virtues, and 10 confirmed Sunnahs of Jumu'ah — ghusl, miswāk, Sūrat al-Kahf, ṣalāh on the Prophet ﷺ, and the hour of acceptance." path="/jumuah" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Sparkle className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Jumu'ah — Friday</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <h2 className="font-semibold">Virtues</h2>
        {V.map((v, i) => (<Card key={i} className="p-4"><div>{v.v}</div><div className="text-xs text-muted-foreground mt-1">{v.ref}</div></Card>))}
        <h2 className="font-semibold pt-2">Ten Sunnahs of Jumu'ah</h2>
        {SUNAN.map((s, i) => (<Card key={i} className="p-4"><div>{i + 1}. {s}</div></Card>))}
        <h2 className="font-semibold pt-2">Rulings</h2>
        {RULES.map((r, i) => (<Card key={i} className="p-4"><div>{r}</div></Card>))}
      </div>
    </div>
  );
}
