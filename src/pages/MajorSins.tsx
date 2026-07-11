import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Sin = { id: string; number: number; name: string; detail: string; source: string };

const SINS: Sin[] = [
  { id: "1", number: 1, name: "Shirk — associating partners with Allah", detail: "The only sin Allah will not forgive if one dies upon it.", source: "Qur'an 4:48" },
  { id: "2", number: 2, name: "Sihr (magic / sorcery)", detail: "Kufr and destruction in this life and the next.", source: "Bukhari 2766" },
  { id: "3", number: 3, name: "Killing a soul unjustly", detail: "'Whoever kills a believer intentionally — his recompense is Hell.'", source: "Qur'an 4:93" },
  { id: "4", number: 4, name: "Consuming riba (interest)", detail: "'Allah has permitted trade and forbidden riba.'", source: "Qur'an 2:275" },
  { id: "5", number: 5, name: "Consuming the orphan's wealth", detail: "'They only consume fire into their bellies.'", source: "Qur'an 4:10" },
  { id: "6", number: 6, name: "Fleeing from battle", detail: "Fleeing the day of the advance (jihad).", source: "Qur'an 8:16" },
  { id: "7", number: 7, name: "Slandering chaste believing women", detail: "Cursed in this world and the next.", source: "Qur'an 24:23" },
  { id: "8", number: 8, name: "Abandoning salah", detail: "The line between iman and kufr.", source: "Muslim 82" },
  { id: "9", number: 9, name: "Withholding zakat", detail: "The wealth will be a burning collar around the neck on the Day of Judgment.", source: "Qur'an 3:180" },
  { id: "10", number: 10, name: "Disobedience to parents ('uquq)", detail: "The Prophet ﷺ mentioned it three times as among the greatest.", source: "Bukhari 5976" },
  { id: "11", number: 11, name: "Severing family ties", detail: "'The one who severs ties will not enter Paradise.'", source: "Bukhari 5984" },
  { id: "12", number: 12, name: "Zina (adultery / fornication)", detail: "'Do not come near zina — it is an obscene act and an evil way.'", source: "Qur'an 17:32" },
  { id: "13", number: 13, name: "Homosexual acts", detail: "The sin of the people of Lut.", source: "Qur'an 7:80–84" },
  { id: "14", number: 14, name: "False testimony", detail: "Listed with shirk and killing.", source: "Bukhari 2654" },
  { id: "15", number: 15, name: "Consuming pork or carrion", detail: "'Forbidden to you are carrion, blood, the flesh of swine…'", source: "Qur'an 5:3" },
  { id: "16", number: 16, name: "Drinking khamr (alcohol / intoxicants)", detail: "Cursed the one who drinks, serves, sells, buys, and carries it.", source: "Abu Dawud 3674" },
  { id: "17", number: 17, name: "Gambling", detail: "The work of Shaytan.", source: "Qur'an 5:90" },
  { id: "18", number: 18, name: "Theft", detail: "Prescribed hadd punishment.", source: "Qur'an 5:38" },
  { id: "19", number: 19, name: "Highway robbery / hirabah", detail: "Waging war against Allah and His Messenger.", source: "Qur'an 5:33" },
  { id: "20", number: 20, name: "Perjuring oaths (al-yamin al-ghamus)", detail: "'A false oath to seize a Muslim's right — he meets Allah while He is angry.'", source: "Bukhari 6676" },
  { id: "21", number: 21, name: "Injustice / oppression (zulm)", detail: "Darkness on the Day of Judgment.", source: "Bukhari 2447" },
  { id: "22", number: 22, name: "Bribery", detail: "'Allah has cursed the briber and the bribed.'", source: "Abu Dawud 3580" },
  { id: "23", number: 23, name: "Cheating / dishonesty in trade", detail: "'Whoever cheats is not from us.'", source: "Muslim 102" },
  { id: "24", number: 24, name: "Pride (kibr)", detail: "'No one enters Paradise with an atom of arrogance.'", source: "Muslim 91" },
  { id: "25", number: 25, name: "Despairing of Allah's mercy", detail: "'None despairs of Allah's mercy except the disbelieving people.'", source: "Qur'an 12:87" },
  { id: "26", number: 26, name: "Feeling secure from Allah's plan", detail: "'None feels secure from Allah's plan except the losers.'", source: "Qur'an 7:99" },
  { id: "27", number: 27, name: "Backbiting (ghibah) & tale-carrying (namimah)", detail: "'The tale-bearer will not enter Paradise.'", source: "Muslim 105" },
  { id: "28", number: 28, name: "Suicide", detail: "'Whoever kills himself will be tormented with it in the Fire.'", source: "Bukhari 1365" },
  { id: "29", number: 29, name: "Wailing over the dead / lamentation", detail: "Blackening the face, tearing clothes.", source: "Bukhari 1294" },
  { id: "30", number: 30, name: "Deceiving one's Imam / ruler unjustly", detail: "Rebellion against just authority.", source: "Muslim 1851" },
  { id: "31", number: 31, name: "Suspending images of living beings / idolatry of images", detail: "The most severely punished on Judgment Day.", source: "Bukhari 5951" },
  { id: "32", number: 32, name: "Displaying tattoos with permanence for beautification", detail: "'The Prophet ﷺ cursed the tattooer and the one tattooed.'", source: "Bukhari 5947" },
  { id: "33", number: 33, name: "Persistently missing Friday prayers", detail: "'A seal is placed on his heart.'", source: "Muslim 865" },
  { id: "34", number: 34, name: "Spying on and exposing Muslims' faults", detail: "Allah will expose the faults of the one who exposes others.", source: "Abu Dawud 4880" },
  { id: "35", number: 35, name: "Insulting the Companions", detail: "'Do not insult my Companions.'", source: "Bukhari 3673" },
  { id: "36", number: 36, name: "Effeminate men and masculine women", detail: "'The Prophet ﷺ cursed men who imitate women and women who imitate men.'", source: "Bukhari 5885" },
  { id: "37", number: 37, name: "Cursing parents (directly or indirectly)", detail: "One who insults another's parents so that they insult his — has cursed his own.", source: "Bukhari 5973" },
  { id: "38", number: 38, name: "Refusing to pay wages / withholding a worker's right", detail: "Allah will be his adversary on the Day of Judgment.", source: "Bukhari 2270" },
  { id: "39", number: 39, name: "Not cleaning oneself from urine properly", detail: "Most punishment in the grave is from this.", source: "Bukhari 216" },
  { id: "40", number: 40, name: "Showing off in worship (riya')", detail: "The lesser shirk the Prophet ﷺ feared for his ummah.", source: "Ahmad 23630" },
  { id: "41", number: 41, name: "Learning knowledge for worldly gain and hiding it", detail: "'Will not smell the fragrance of Paradise.'", source: "Abu Dawud 3664" },
  { id: "42", number: 42, name: "Treachery / breaking covenants", detail: "For every treacherous one, a banner on the Day of Judgment.", source: "Muslim 1738" },
  { id: "43", number: 43, name: "Reminding others of favors done (al-mann)", detail: "Nullifies the reward of charity.", source: "Qur'an 2:264" },
  { id: "44", number: 44, name: "Denying qadr (predestination)", detail: "Nullifies iman.", source: "Muslim 8" },
  { id: "45", number: 45, name: "Listening to people's private conversations", detail: "Molten lead will be poured in his ears on the Day of Judgment.", source: "Bukhari 7042" },
  { id: "46", number: 46, name: "Harming neighbors", detail: "'By Allah he does not believe' — three times, of one whose neighbor is not safe from his harm.", source: "Bukhari 6016" },
  { id: "47", number: 47, name: "Harming or terrifying a Muslim", detail: "'Not permissible for a Muslim to terrify another Muslim.'", source: "Abu Dawud 5004" },
  { id: "48", number: 48, name: "Insulting the Messenger of Allah ﷺ", detail: "Kufr in agreement of the scholars.", source: "Qur'an 33:57" },
  { id: "49", number: 49, name: "Falsely attributing to the Prophet ﷺ", detail: "'Whoever lies upon me — let him take his seat in the Fire.'", source: "Bukhari 110" },
  { id: "50", number: 50, name: "Not judging by what Allah revealed while denying it", detail: "'Those who do not judge by what Allah revealed — they are the disbelievers.'", source: "Qur'an 5:44" },
];

const STORAGE_KEY = "kabair.aware";

const MajorSins = () => {
  const [q, setQ] = useState("");
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setDone(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const filtered = useMemo(() => SINS.filter(s => !q.trim() || s.name.toLowerCase().includes(q.toLowerCase()) || s.detail.toLowerCase().includes(q.toLowerCase())), [q]);
  const count = Object.values(done).filter(Boolean).length;

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Major Sins in Islam (al-Kaba'ir)" description="50 major sins compiled from Qur'an and Sunnah with authentic references — a warning and reminder." path="/major-sins" />
      <div className="border-b bg-card"><div className="container mx-auto px-4 py-4 flex items-center gap-3"><Link to="/"><Button variant="ghost" size="icon" aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Button></Link><ShieldAlert className="w-6 h-6 text-destructive" /><h1 className="text-2xl font-bold">Major Sins (al-Kaba'ir)</h1></div></div>
      <div className="container mx-auto px-4 py-6 space-y-4">
        <Card className="p-4 border-destructive/40 bg-destructive/5"><p className="text-sm">A reminder — not a fatwa. If you have fallen into any of these, the door of tawbah is open. 'Say: O My servants who have transgressed against themselves — do not despair of Allah's mercy…' (39:53)</p></Card>
        <Card className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Reviewed</span><span className="text-sm font-medium">{count} / {SINS.length}</span></div><Progress value={(count / SINS.length) * 100} /></Card>
        <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="pl-9" /></div><Button variant="outline" size="icon" aria-label="Reset" onClick={() => persist({})}><RotateCcw className="w-4 h-4" /></Button></div>
        <div className="grid gap-3">{filtered.map(s => (
          <Card key={s.id} className={`p-4 cursor-pointer ${done[s.id] ? "border-primary/60 bg-primary/5" : ""}`} onClick={() => persist({ ...done, [s.id]: !done[s.id] })}>
            <div className="flex items-start justify-between mb-2"><h3 className="font-semibold"><span className="text-muted-foreground mr-2">#{s.number}</span>{s.name}</h3><Badge variant="secondary" className="shrink-0">{s.source}</Badge></div>
            <p className="text-sm text-muted-foreground">{s.detail}</p>
          </Card>
        ))}</div>
      </div>
    </div>
  );
};

export default MajorSins;
