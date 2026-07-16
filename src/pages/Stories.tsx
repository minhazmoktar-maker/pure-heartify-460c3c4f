import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Story = { id: string; title: string; category: "Prophets" | "Sahaba" | "Tabi'un" | "Moral"; lesson: string; body: string };

const STORIES: Story[] = [
  { id: "p-adam", title: "Prophet Adam ﷺ — the First Human", category: "Prophets", lesson: "Repentance is always accepted when sincere.",
    body: "Allah created Adam ﷺ from clay and taught him the names of all things. The angels prostrated to him, but Iblis refused out of arrogance. Adam and Hawwa were placed in Jannah but were deceived by Iblis and ate from the forbidden tree. They turned to Allah in sincere repentance with the words He inspired to them, and Allah forgave them — showing that sin does not close the door on mercy when we return with humility." },
  { id: "p-nuh", title: "Prophet Nuh ﷺ — Patience for 950 Years", category: "Prophets", lesson: "Da'wah requires patience without expectation of quick results.",
    body: "Nuh ﷺ called his people to worship Allah alone for centuries, and only a few believed. Commanded by Allah, he built a great ark on dry land while being mocked. When the flood came, those who believed were saved; even his own son refused and was drowned. The story teaches that guidance is from Allah — our duty is only to convey the truth patiently." },
  { id: "p-ibrahim", title: "Prophet Ibrahim ﷺ — the Friend of Allah", category: "Prophets", lesson: "True tawakkul means trusting Allah in every trial.",
    body: "Ibrahim ﷺ smashed the idols of his people and was thrown into a blazing fire, which Allah made cool and safe. He left his wife Hajar and infant Isma'il in the barren valley of Makkah, trusting Allah's command. Later he was tested with the order to sacrifice his son — both father and son submitted, and Allah ransomed Isma'il with a great sacrifice, immortalised in Eid al-Adha." },
  { id: "p-yusuf", title: "Prophet Yusuf ﷺ — from the Well to the Palace", category: "Prophets", lesson: "Allah's plan is always better than we can see.",
    body: "Yusuf ﷺ was thrown into a well by his brothers, sold as a slave, tempted and falsely imprisoned. Through it all he held firm to his faith and his character. Allah raised him to become minister of Egypt, and he saved a nation from famine — including the very brothers who had wronged him. His words: 'No blame upon you today; may Allah forgive you' remain a model of forgiveness." },
  { id: "p-musa", title: "Prophet Musa ﷺ and Fir'awn", category: "Prophets", lesson: "Fear no tyrant when Allah is with you.",
    body: "Raised in Fir'awn's own palace, Musa ﷺ was later commanded to return and call the greatest tyrant of his age to Allah. With his brother Harun and the staff that became a serpent, he confronted Fir'awn's magicians — who all believed on the spot. When Fir'awn pursued Bani Isra'il to the sea, Allah split it, saving the believers and drowning the tyrant. 'Indeed, my Lord is with me; He will guide me.'" },
  { id: "p-isa", title: "Prophet Isa ﷺ — the Word of Allah", category: "Prophets", lesson: "Miracles serve the message, not fame.",
    body: "Isa ﷺ was born miraculously to Maryam without a father, and spoke from the cradle to defend his mother. By Allah's leave he healed the blind and the leper and revived the dead. When his people plotted against him, Allah raised him up to Himself. He will return before the Day of Judgement to affirm the message of Muhammad ﷺ." },
  { id: "p-muhammad", title: "Prophet Muhammad ﷺ — Mercy to the Worlds", category: "Prophets", lesson: "The best character reflects the best of faith.",
    body: "Born in Makkah and orphaned young, Muhammad ﷺ was known as al-Amin (the Trustworthy) even before revelation. At forty, Jibril brought the first ayah: 'Read, in the name of your Lord'. For 23 years he taught worship, justice, mercy, and purity of heart, transforming a fragmented tribal society into a global ummah. His farewell sermon reminded all Muslims that no Arab is superior to a non-Arab except in taqwa." },
  { id: "s-abubakr", title: "Abu Bakr as-Siddiq (RA)", category: "Sahaba", lesson: "Certainty of faith is stronger than any doubt.",
    body: "The Prophet's ﷺ closest companion, Abu Bakr believed instantly when the Prophet spoke of the night journey — earning the title 'as-Siddiq' (the Truthful). He freed enslaved believers with his own wealth, accompanied the Prophet on the Hijrah hiding in the cave of Thawr, and after the Prophet's death held the ummah together with the words: 'Whoever worshipped Muhammad — Muhammad has died. Whoever worships Allah — Allah is ever-living.'" },
  { id: "s-umar", title: "Umar ibn al-Khattab (RA) — Justice Personified", category: "Sahaba", lesson: "True leadership serves the weakest first.",
    body: "Once a fierce enemy of Islam, Umar's heart was softened by hearing his sister recite Surah Ta-Ha. As khalifah he expanded the ummah across three continents yet patched his own clothes and walked among his people at night to check on their needs. He is remembered for saying: 'Were a mule to stumble in Iraq, I would fear Allah would ask me: why did you not level the road for it?'" },
  { id: "s-uthman", title: "Uthman ibn Affan (RA) — the Generous", category: "Sahaba", lesson: "Wealth spent for Allah multiplies eternally.",
    body: "Uthman bought the well of Rumah and made it free for all Muslims, funded the entire army of Tabuk, and preserved the ummah by commissioning the standard Mushaf of the Qur'an. Known for his modesty — even angels were said to feel shy in his presence — he was martyred while reading the Qur'an, refusing to shed the blood of Muslims in his defence." },
  { id: "s-ali", title: "Ali ibn Abi Talib (RA) — Gate of Knowledge", category: "Sahaba", lesson: "Courage and knowledge are two wings of the believer.",
    body: "The first child to embrace Islam, Ali slept in the Prophet's ﷺ bed during the Hijrah to deceive the assassins. Famed for his bravery at Badr, Uhud, and Khaybar, he was equally famed for his wisdom: 'People are enemies of what they do not know.' His counsel and rulings shaped Islamic jurisprudence for generations." },
  { id: "s-bilal", title: "Bilal ibn Rabah (RA) — the First Mu'adhin", category: "Sahaba", lesson: "Allah sees the heart, not the status.",
    body: "Enslaved and tortured under the burning sun with a boulder on his chest, Bilal only repeated: 'Ahad, Ahad' — One, One. Abu Bakr bought and freed him. When Makkah was conquered, the Prophet ﷺ chose him — a formerly enslaved Abyssinian — to climb the Ka'bah and call the adhan, a public statement that lineage and colour count for nothing before Allah." },
  { id: "s-khadijah", title: "Khadijah bint Khuwaylid (RA)", category: "Sahaba", lesson: "A believing spouse is a shelter in trial.",
    body: "A noble businesswoman of Makkah, Khadijah proposed to Muhammad ﷺ years before revelation because of his character. When the first revelation shook him, she wrapped him in a cloak and reassured him: 'By Allah, He will never disgrace you — you keep ties, carry the weak, honour the guest, and stand for truth.' She was the first believer and his greatest support until her death." },
  { id: "s-aisha", title: "Aisha bint Abi Bakr (RA) — Mother of the Believers", category: "Sahaba", lesson: "Seeking knowledge is a lifelong ibadah.",
    body: "Aisha narrated over 2,000 ahadith and was consulted on fiqh by the greatest companions after the Prophet ﷺ. Her home was a school where women and men came to learn Qur'an, Sunnah, medicine, poetry, and Arabic. She embodied the truth that a woman's intellect and voice are indispensable to the ummah." },
  { id: "t-umarII", title: "Umar ibn Abd al-Aziz (RA) — the Fifth Rightly-Guided", category: "Tabi'un", lesson: "Power is a trust, not a prize.",
    body: "When he became khalifah, Umar II returned properties his family had unjustly taken, wept for the weight of accounting before Allah, and worked so intensely for justice that in just two and a half years zakat collectors could not find poor people to receive the money. He extinguished his official candle when talking about family matters — 'this oil belongs to the treasury'." },
  { id: "m-parents", title: "The Man Who Carried His Mother", category: "Moral", lesson: "No labour repays a mother's love.",
    body: "A companion once carried his aged mother on his back around the Ka'bah for the entire tawaf, then asked Ibn Umar: 'Have I repaid her?' Ibn Umar replied: 'Not even one contraction of the pains of her childbirth.' The story teaches the immeasurable right of parents in Islam." },
  { id: "m-neighbour", title: "The Neighbour Who Never Complained", category: "Moral", lesson: "The best of you are best to those closest to you.",
    body: "Jibril used to remind the Prophet ﷺ so often about the rights of the neighbour that the Prophet thought neighbours would be given a share of inheritance. Believers are commanded not to sleep full while a neighbour is hungry, and to check on those beside them before those far away." },
];

const STORAGE = "heartify-stories-read-v1";

const Stories = () => {
  const [read, setRead] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<Story | null>(null);

  useEffect(() => {
    try { setRead(JSON.parse(localStorage.getItem(STORAGE) || "{}")); } catch {}
  }, []);

  const markRead = (id: string) => {
    const updated = { ...read, [id]: true };
    setRead(updated);
    localStorage.setItem(STORAGE, JSON.stringify(updated));
  };

  const cats = ["Prophets", "Sahaba", "Tabi'un", "Moral"] as const;
  const readCount = Object.values(read).filter(Boolean).length;
  const pct = Math.round((readCount / STORIES.length) * 100);

  return (
    <div className="min-h-dvh bg-background pb-20">
      <SEO title="Islamic Stories — Heartify" description="Curated stories of the Prophets, Sahaba, and Tabi'un with the moral lesson from each." path="/stories" />
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back"><Link to="/" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-heading font-semibold">Islamic Stories</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Read progress</span>
              <span className="font-medium">{readCount} / {STORIES.length}</span>
            </div>
            <Progress value={pct} className="mt-2 h-2" />
          </CardContent>
        </Card>

        {active ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{active.category}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setActive(null)}>Close</Button>
              </div>
              <CardTitle className="pt-2">{active.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="leading-relaxed">{active.body}</p>
              <div className="rounded-card border-l-4 border-primary bg-primary/5 p-3 text-sm">
                <b>Lesson:</b> {active.lesson}
              </div>
              {!read[active.id] && (
                <Button onClick={() => markRead(active.id)}><Check className="mr-2 h-4 w-4" />Mark as read</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="Prophets">
            <TabsList className="grid w-full grid-cols-4">
              {cats.map((c) => <TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}
            </TabsList>
            {cats.map((c) => (
              <TabsContent key={c} value={c} className="space-y-2">
                {STORIES.filter((s) => s.category === c).map((s) => (
                  <button key={s.id} onClick={() => setActive(s)} className="flex w-full items-center justify-between rounded-card border p-4 text-left hover:bg-accent">
                    <div>
                      <div className="font-medium">{s.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">{s.lesson}</div>
                    </div>
                    {read[s.id] && <Check className="h-5 w-5 text-primary shrink-0" />}
                  </button>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Stories;
