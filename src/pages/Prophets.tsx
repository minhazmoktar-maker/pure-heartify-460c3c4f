import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Search, Users, Check, RotateCcw } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";

type Prophet = {
  id: string;
  name: string;
  arabic: string;
  title?: string;
  people: string;
  quranMentions: number;
  summary: string;
  lesson: string;
  primaryRef: string;
};

const PROPHETS: Prophet[] = [
  { id: "adam", name: "Adam", arabic: "آدم", title: "Father of Humanity", people: "Humanity", quranMentions: 25, summary: "Created by Allah's own hand, taught the names of all things, honoured by the angels' prostration. After the slip with the tree, he and Hawwa repented and were forgiven — the first tawbah in human history.", lesson: "Every human errs; what defines you is the return to Allah.", primaryRef: "Qur'an 2:30-38, 7:19-25" },
  { id: "idris", name: "Idris", arabic: "إدريس", people: "Early humanity", quranMentions: 2, summary: "A truthful prophet raised to a high station. Traditions describe him as the first to write with the pen and study the stars.", lesson: "Seeking knowledge is a means of nearness to Allah when guided by revelation.", primaryRef: "Qur'an 19:56-57" },
  { id: "nuh", name: "Nuh (Noah)", arabic: "نوح", title: "First of the Ulul-'Azm", people: "The people of Nuh", quranMentions: 43, summary: "Called his people to tawhid for 950 years; only a few believed. Built the Ark on revelation and was saved with the believers while the disbelievers, including his own son, perished in the Flood.", lesson: "Success is in patient, sincere call — not in immediate results.", primaryRef: "Qur'an 11:25-49, Surah Nuh" },
  { id: "hud", name: "Hud", arabic: "هود", people: "'Aad", quranMentions: 7, summary: "Sent to the mighty tribe of 'Aad in al-Ahqaf. They boasted of their strength; when they persisted in kufr, Allah destroyed them with a barren wind for seven nights and eight days.", lesson: "Physical power without gratitude to Allah invites ruin.", primaryRef: "Qur'an 7:65-72, 46:21-25" },
  { id: "salih", name: "Salih", arabic: "صالح", people: "Thamud", quranMentions: 9, summary: "Sent to Thamud, expert stone-carvers of al-Hijr. The she-camel was given as a sign; when they hamstrung it, the sayha (blast) destroyed them at dawn.", lesson: "Signs demand submission; scepticism after clarity is destruction.", primaryRef: "Qur'an 7:73-79, 11:61-68" },
  { id: "ibrahim", name: "Ibrahim (Abraham)", arabic: "إبراهيم", title: "Khalilullah — Ulul-'Azm", people: "Babylon, Egypt, Hijaz", quranMentions: 69, summary: "Broke his people's idols, was cast into fire that became cool by Allah's command, migrated with Sarah and Hajar, was tested with the sacrifice of Isma'il, and built the Ka'bah with him.", lesson: "Absolute submission to Allah opens doors no scheme can shut.", primaryRef: "Qur'an 2:124-129, 37:83-113" },
  { id: "lut", name: "Lut (Lot)", arabic: "لوط", people: "Sodom", quranMentions: 27, summary: "Nephew of Ibrahim, sent to a people who invented indecency the world had not seen. Only his household believed; the cities were overturned and rained upon with stones of baked clay.", lesson: "Public vice normalised eventually invites public ruin.", primaryRef: "Qur'an 7:80-84, 11:77-83" },
  { id: "ismail", name: "Isma'il (Ishmael)", arabic: "إسماعيل", title: "Ancestor of the Arabs", people: "Hijaz", quranMentions: 12, summary: "Son of Ibrahim and Hajar. Left as an infant with his mother in the barren valley of Makkah — Zamzam sprang beneath his feet. Willingly submitted to the sacrifice, then helped raise the Ka'bah.", lesson: "Trust in Allah turns wilderness into a wellspring.", primaryRef: "Qur'an 2:127, 37:100-107" },
  { id: "ishaq", name: "Ishaq (Isaac)", arabic: "إسحاق", people: "Levant", quranMentions: 17, summary: "Son of Ibrahim and Sarah, born in their old age as glad tidings from angels. Father of Ya'qub; both a prophet and a bearer of prophethood in his line.", lesson: "Allah's gifts arrive in their appointed time.", primaryRef: "Qur'an 11:69-73, 37:112-113" },
  { id: "yaqub", name: "Ya'qub (Jacob)", arabic: "يعقوب", title: "Isra'il", people: "Bani Isra'il", quranMentions: 16, summary: "Son of Ishaq, father of the twelve tribes. Endured decades of grief over Yusuf with beautiful patience (sabrun jamil), and taught his sons true tawhid on his deathbed.", lesson: "Beautiful patience is complaint to Allah alone, not to people.", primaryRef: "Qur'an 12:83-87, 2:132-133" },
  { id: "yusuf", name: "Yusuf (Joseph)", arabic: "يوسف", people: "Egypt", quranMentions: 27, summary: "Betrayed by brothers, sold into slavery, imprisoned unjustly, then raised to minister over Egypt's treasuries. His story is 'the most beautiful of narrations' (12:3), a masterclass in chastity, forgiveness, and divine plan.", lesson: "What is written for you cannot be diverted; what wounds you today may save many tomorrow.", primaryRef: "Surah Yusuf (12)" },
  { id: "ayyub", name: "Ayyub (Job)", arabic: "أيوب", people: "Levant", quranMentions: 4, summary: "Tested with the loss of wealth, family, and health for many years. Never complained except to Allah with the words 'Harm has afflicted me, and You are the most merciful of the merciful.' Restored fully.", lesson: "Sabr in trial is the shortest road back to Allah's ease.", primaryRef: "Qur'an 21:83-84, 38:41-44" },
  { id: "shuayb", name: "Shu'ayb", arabic: "شعيب", title: "Khatib al-Anbiya", people: "Madyan", quranMentions: 11, summary: "Sent to Madyan, notorious for fraud in weights and measures. Called them to tawhid and honest trade; when they mocked and threatened him, the earthquake and shout destroyed them.", lesson: "Faith is incomplete without honesty in the marketplace.", primaryRef: "Qur'an 7:85-93, 11:84-95" },
  { id: "musa", name: "Musa (Moses)", arabic: "موسى", title: "Kalimullah — Ulul-'Azm", people: "Bani Isra'il", quranMentions: 136, summary: "Raised in Pharaoh's household, called at the burning valley of Tuwa, confronted Pharaoh with signs, split the sea, received the Tawrah at Sinai, and led Bani Isra'il through forty years in the wilderness.", lesson: "Speak the truth to power gently — 'Perhaps he may take heed' (20:44).", primaryRef: "Qur'an 20, 26, 28" },
  { id: "harun", name: "Harun (Aaron)", arabic: "هارون", people: "Bani Isra'il", quranMentions: 20, summary: "Brother of Musa, granted prophethood at Musa's request for eloquence and support. Held the community together during Musa's absence at Sinai despite the calf worship crisis.", lesson: "Allah answers sincere du'a for helpers in His path.", primaryRef: "Qur'an 20:29-36, 20:90-94" },
  { id: "dhulkifl", name: "Dhul-Kifl", arabic: "ذو الكفل", people: "Bani Isra'il", quranMentions: 2, summary: "Praised in the Qur'an among the patient and the righteous. Classical scholars differ on details of his life, but the Qur'an's testimony to his sabr is definitive.", lesson: "Some servants earn Allah's praise for character no history recorded.", primaryRef: "Qur'an 21:85, 38:48" },
  { id: "dawud", name: "Dawud (David)", arabic: "داوود", title: "Khalifah on earth", people: "Bani Isra'il", quranMentions: 16, summary: "Slew Jalut (Goliath), was made a king and prophet, given the Zabur, and taught the language of birds. Iron was made soft in his hands; his voice moved the mountains in tasbih.", lesson: "Strength of body, voice, and rule are amanahs to be spent on justice.", primaryRef: "Qur'an 2:251, 21:78-80, 34:10-11" },
  { id: "sulayman", name: "Sulayman (Solomon)", arabic: "سليمان", people: "Bani Isra'il", quranMentions: 17, summary: "Son of Dawud. Granted a kingdom unrivalled — the wind under his command, jinn as builders, and the language of ants and birds. Ruled with justice and humility, always attributing power to Allah.", lesson: "Ask Allah for a kingdom that draws you nearer to Him — never further.", primaryRef: "Qur'an 27:15-44, 38:30-40" },
  { id: "ilyas", name: "Ilyas (Elijah)", arabic: "إلياس", people: "Bani Isra'il", quranMentions: 3, summary: "Sent to his people who worshipped the idol Ba'l. Called them relentlessly to tawhid; most rejected him, and Allah praised him among the righteous.", lesson: "Reject every idol — of stone, status, wealth, or self.", primaryRef: "Qur'an 37:123-132, 6:85" },
  { id: "alyasa", name: "Al-Yasa' (Elisha)", arabic: "اليسع", people: "Bani Isra'il", quranMentions: 2, summary: "Successor to Ilyas among Bani Isra'il, mentioned among the excellent (al-akhyar).", lesson: "Carrying the torch of tawhid after one's teacher is itself prophetic work.", primaryRef: "Qur'an 6:86, 38:48" },
  { id: "yunus", name: "Yunus (Jonah)", arabic: "يونس", title: "Dhun-Nun", people: "Ninawa", quranMentions: 4, summary: "Left his people in anger before divine permission, was swallowed by the whale, and called out from the darknesses: 'La ilaha illa Anta, subhanaka, inni kuntu min adh-dhalimin.' Allah delivered him.", lesson: "That du'a is a rescue for every believer in distress.", primaryRef: "Qur'an 21:87-88, 37:139-148" },
  { id: "zakariyya", name: "Zakariyya (Zechariah)", arabic: "زكريا", people: "Bani Isra'il", quranMentions: 7, summary: "Guardian of Maryam, whose sustenance from Allah in the mihrab inspired his private du'a for a righteous son in old age. Answered with Yahya.", lesson: "Never abandon du'a for what seems impossible.", primaryRef: "Qur'an 3:37-41, 19:2-11" },
  { id: "yahya", name: "Yahya (John)", arabic: "يحيى", people: "Bani Isra'il", quranMentions: 5, summary: "Given wisdom as a child; described by Allah as tender-hearted, pure, dutiful to his parents, and neither arrogant nor disobedient.", lesson: "Early devotion is a lifelong crown.", primaryRef: "Qur'an 19:12-15, 3:39" },
  { id: "isa", name: "'Isa (Jesus)", arabic: "عيسى", title: "Ruhullah — Ulul-'Azm", people: "Bani Isra'il", quranMentions: 25, summary: "Born miraculously to Maryam without a father, spoke from the cradle, healed the blind and leper, raised the dead by Allah's leave, and was raised alive to the heavens. Will return before the Hour to rule with the Shari'ah of Muhammad ﷺ.", lesson: "He is a slave and Messenger of Allah — never divine.", primaryRef: "Qur'an 3:45-59, 5:110-118, 19:16-36" },
  { id: "muhammad", name: "Muhammad ﷺ", arabic: "محمد", title: "Khatam an-Nabiyyin — Ulul-'Azm", people: "All humanity and jinn", quranMentions: 4, summary: "The final Messenger, sent as a mercy to the worlds. Born in Makkah, entrusted with the Qur'an over 23 years, endured Ta'if and the boycott, migrated to Madinah, established the first Islamic society, and completed the religion at his farewell Hajj.", lesson: "His Sunnah is the surest path to Allah — 'Whoever obeys the Messenger has obeyed Allah' (4:80).", primaryRef: "Qur'an 33:40, 21:107; Sirah collections" },
];

const STORAGE_KEY = "heartify-prophets-progress";

const Prophets = () => {
  const [query, setQuery] = useState("");
  const [read, setRead] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });

  const persist = (next: Record<string, boolean>) => {
    setRead(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
  };

  const toggle = (id: string) => persist({ ...read, [id]: !read[id] });
  const reset = () => persist({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PROPHETS;
    return PROPHETS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.arabic.includes(q) ||
        p.people.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        (p.title?.toLowerCase().includes(q) ?? false),
    );
  }, [query]);

  const doneCount = PROPHETS.filter((p) => read[p.id]).length;
  const progress = Math.round((doneCount / PROPHETS.length) * 100);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <Helmet>
        <title>Stories of the Prophets — Qisas al-Anbiya | Heartify</title>
        <meta
          name="description"
          content="Read concise, Qur'an-based biographies of the 25 prophets named in the Qur'an, with lessons and references."
        />
        <link rel="canonical" href="https://pure-heartify.lovable.app/prophets" />
      </Helmet>

      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
              <Users className="h-7 w-7 text-primary" />
              Stories of the Prophets
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The 25 prophets named in the Qur'an — their people, mission, and enduring lesson for us.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={reset} className="shrink-0">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Read {doneCount} of {PROPHETS.length}</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} />
          </CardContent>
        </Card>

        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, people, or theme…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <p className="mb-3 text-xs text-muted-foreground">
          Showing {filtered.length} prophet{filtered.length === 1 ? "" : "s"}
        </p>

        <div className="space-y-4">
          {filtered.map((p) => {
            const done = !!read[p.id];
            return (
              <Card key={p.id} className={done ? "border-primary/40 bg-primary/5" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-lg">
                        {p.name}{" "}
                        <span dir="rtl" lang="ar" className="ml-1 text-xl font-normal text-muted-foreground">
                          {p.arabic}
                        </span>
                      </CardTitle>
                      {p.title && (
                        <p className="mt-0.5 text-xs italic text-muted-foreground">{p.title}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {p.quranMentions}× in Qur'an
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">People:</span> {p.people}
                  </p>
                  <p className="text-sm leading-relaxed">{p.summary}</p>
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Lesson</p>
                    <p className="mt-1 text-sm">{p.lesson}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Ref: {p.primaryRef}</p>
                  <Button
                    size="sm"
                    variant={done ? "default" : "outline"}
                    onClick={() => toggle(p.id)}
                    className="w-full"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {done ? "Marked as read" : "Mark as read"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No prophets match your search.</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Prophets;
