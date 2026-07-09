import { Link } from "react-router-dom";
import { ArrowLeft, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

const RIGHTS = [
  { t: "A righteous spouse before conception", ref: "Bukhari 5090; Muslim 1466" },
  { t: "Choosing a good name — best names are 'Abdullāh and 'Abd ar-Raḥmān", ref: "Muslim 2132" },
  { t: "Adhān in the right ear at birth", ref: "Abu Dawud 5105" },
  { t: "Taḥnīk (rubbing a chewed date on the palate)", ref: "Bukhari 5470; Muslim 2145" },
  { t: "'Aqīqah — 2 sheep for a boy, 1 for a girl on the 7th day, shave head, name the child", ref: "Abu Dawud 2842 — Ṣaḥīḥ" },
  { t: "Circumcision (khitān) for boys — a Sunnah of the fiṭrah", ref: "Bukhari 5891; Muslim 257" },
  { t: "Nursing — up to two full years for whoever wishes to complete the nursing", ref: "Qur'an 2:233" },
  { t: "Halal, sufficient provision — lawful maintenance is on the father", ref: "Bukhari 5364; Muslim 1714" },
  { t: "Teach them Tawḥīd from the earliest age — Nu'mān's ṣaḥīfah began: I teach him lā ilāha illa-llāh.", ref: "Ḥākim, al-Mustadrak" },
  { t: "Command them to pray at 7, discipline them for it at 10, and separate their beds", ref: "Abu Dawud 495 — Ḥasan" },
  { t: "Teach them Qur'an, swimming, archery, and a useful trade", ref: "Ibn Abī Shaybah; Bayhaqī" },
  { t: "Justice between all children — do not favor one over another in gifts", ref: "Bukhari 2587; Muslim 1623" },
  { t: "Marry them off when able", ref: "Bukhari 5066" },
  { t: "Speak to them with kindness, teach with mercy, and do not curse them", ref: "Muslim 3009" },
];
export default function ChildrensRights() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Rights of Children in Islam" description="14 Prophetic rights of the child — from choosing a righteous spouse to naming, aqīqah, education, and marriage — with authentic references." path="/childrens-rights" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link><Baby className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold">Rights of Children</h1></div></div>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-3">
        {RIGHTS.map((r, i) => (<Card key={i} className="p-4"><div className="font-medium">{i + 1}. {r.t}</div><div className="text-xs text-muted-foreground mt-1">{r.ref}</div></Card>))}
      </div>
    </div>
  );
}
