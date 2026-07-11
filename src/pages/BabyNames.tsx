import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Baby, Heart, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Name = { name: string; arabic: string; gender: "boy" | "girl"; meaning: string; origin: string };

const NAMES: Name[] = [
  { name: "Aaliyah", arabic: "عالية", gender: "girl", meaning: "High, exalted, sublime", origin: "Arabic" },
  { name: "Aisha", arabic: "عائشة", gender: "girl", meaning: "Living, prosperous; wife of the Prophet ﷺ", origin: "Arabic" },
  { name: "Amina", arabic: "آمنة", gender: "girl", meaning: "Trustworthy, peaceful; mother of the Prophet ﷺ", origin: "Arabic" },
  { name: "Asma", arabic: "أسماء", gender: "girl", meaning: "Noble, elegant; daughter of Abu Bakr (RA)", origin: "Arabic" },
  { name: "Fatimah", arabic: "فاطمة", gender: "girl", meaning: "One who weans; daughter of the Prophet ﷺ", origin: "Arabic" },
  { name: "Hafsa", arabic: "حفصة", gender: "girl", meaning: "Young lioness; wife of the Prophet ﷺ", origin: "Arabic" },
  { name: "Hoor", arabic: "حور", gender: "girl", meaning: "Companion of Paradise", origin: "Arabic" },
  { name: "Iman", arabic: "إيمان", gender: "girl", meaning: "Faith, belief", origin: "Arabic" },
  { name: "Jannah", arabic: "جنة", gender: "girl", meaning: "Paradise, garden", origin: "Arabic" },
  { name: "Khadijah", arabic: "خديجة", gender: "girl", meaning: "Trustworthy; first wife of the Prophet ﷺ", origin: "Arabic" },
  { name: "Layla", arabic: "ليلى", gender: "girl", meaning: "Night, dark beauty", origin: "Arabic" },
  { name: "Maryam", arabic: "مريم", gender: "girl", meaning: "Devout, worshipper; mother of Isa (AS)", origin: "Hebrew/Arabic" },
  { name: "Nusaybah", arabic: "نسيبة", gender: "girl", meaning: "Noble; brave sahabiyyah", origin: "Arabic" },
  { name: "Rahma", arabic: "رحمة", gender: "girl", meaning: "Mercy", origin: "Arabic" },
  { name: "Ruqayyah", arabic: "رقية", gender: "girl", meaning: "Ascent; daughter of the Prophet ﷺ", origin: "Arabic" },
  { name: "Safiyyah", arabic: "صفية", gender: "girl", meaning: "Pure, sincere friend", origin: "Arabic" },
  { name: "Sakinah", arabic: "سكينة", gender: "girl", meaning: "Tranquility from Allah", origin: "Arabic" },
  { name: "Sumayyah", arabic: "سمية", gender: "girl", meaning: "First martyr of Islam", origin: "Arabic" },
  { name: "Yasmin", arabic: "ياسمين", gender: "girl", meaning: "Jasmine flower", origin: "Persian/Arabic" },
  { name: "Zainab", arabic: "زينب", gender: "girl", meaning: "Fragrant flower; daughter of the Prophet ﷺ", origin: "Arabic" },

  { name: "Abdullah", arabic: "عبد الله", gender: "boy", meaning: "Servant of Allah", origin: "Arabic" },
  { name: "Abdur-Rahman", arabic: "عبد الرحمن", gender: "boy", meaning: "Servant of the Most Merciful", origin: "Arabic" },
  { name: "Ahmad", arabic: "أحمد", gender: "boy", meaning: "Most praised; a name of the Prophet ﷺ", origin: "Arabic" },
  { name: "Ali", arabic: "علي", gender: "boy", meaning: "Exalted, noble; the fourth caliph (RA)", origin: "Arabic" },
  { name: "Bilal", arabic: "بلال", gender: "boy", meaning: "Moisture; the first muezzin (RA)", origin: "Arabic" },
  { name: "Dawood", arabic: "داود", gender: "boy", meaning: "Beloved; Prophet Dawood (AS)", origin: "Hebrew/Arabic" },
  { name: "Faisal", arabic: "فيصل", gender: "boy", meaning: "Decisive, just judge", origin: "Arabic" },
  { name: "Hamza", arabic: "حمزة", gender: "boy", meaning: "Lion; uncle of the Prophet ﷺ", origin: "Arabic" },
  { name: "Haroon", arabic: "هارون", gender: "boy", meaning: "Prophet Haroon (AS), brother of Musa", origin: "Hebrew/Arabic" },
  { name: "Hassan", arabic: "حسن", gender: "boy", meaning: "Handsome, good; grandson of the Prophet ﷺ", origin: "Arabic" },
  { name: "Hussain", arabic: "حسين", gender: "boy", meaning: "Small handsome one; grandson of the Prophet ﷺ", origin: "Arabic" },
  { name: "Ibrahim", arabic: "إبراهيم", gender: "boy", meaning: "Father of nations; Prophet Ibrahim (AS)", origin: "Arabic" },
  { name: "Idris", arabic: "إدريس", gender: "boy", meaning: "Studious; Prophet Idris (AS)", origin: "Arabic" },
  { name: "Ilyas", arabic: "إلياس", gender: "boy", meaning: "Prophet Ilyas (AS)", origin: "Hebrew/Arabic" },
  { name: "Imran", arabic: "عمران", gender: "boy", meaning: "Long-lived; father of Maryam (AS)", origin: "Arabic" },
  { name: "Isa", arabic: "عيسى", gender: "boy", meaning: "Prophet Isa (AS)", origin: "Arabic" },
  { name: "Ismail", arabic: "إسماعيل", gender: "boy", meaning: "Allah hears; Prophet Ismail (AS)", origin: "Arabic" },
  { name: "Khalid", arabic: "خالد", gender: "boy", meaning: "Eternal; the great commander (RA)", origin: "Arabic" },
  { name: "Musa", arabic: "موسى", gender: "boy", meaning: "Prophet Musa (AS)", origin: "Arabic" },
  { name: "Muhammad", arabic: "محمد", gender: "boy", meaning: "The praised one; the Prophet ﷺ", origin: "Arabic" },
  { name: "Nuh", arabic: "نوح", gender: "boy", meaning: "Prophet Nuh (AS)", origin: "Arabic" },
  { name: "Omar", arabic: "عمر", gender: "boy", meaning: "Long-lived; the second caliph (RA)", origin: "Arabic" },
  { name: "Rayyan", arabic: "ريان", gender: "boy", meaning: "Gate of Paradise for those who fast", origin: "Arabic" },
  { name: "Salman", arabic: "سلمان", gender: "boy", meaning: "Safe, secure; Salman al-Farsi (RA)", origin: "Arabic" },
  { name: "Sulaiman", arabic: "سليمان", gender: "boy", meaning: "Man of peace; Prophet Sulaiman (AS)", origin: "Arabic" },
  { name: "Talha", arabic: "طلحة", gender: "boy", meaning: "A kind of tree; Talha ibn Ubaydullah (RA)", origin: "Arabic" },
  { name: "Uthman", arabic: "عثمان", gender: "boy", meaning: "Wise; the third caliph (RA)", origin: "Arabic" },
  { name: "Yahya", arabic: "يحيى", gender: "boy", meaning: "Prophet Yahya (AS)", origin: "Arabic" },
  { name: "Yusuf", arabic: "يوسف", gender: "boy", meaning: "Prophet Yusuf (AS)", origin: "Arabic" },
  { name: "Zakariya", arabic: "زكريا", gender: "boy", meaning: "Prophet Zakariya (AS)", origin: "Arabic" },
  { name: "Zayd", arabic: "زيد", gender: "boy", meaning: "Growth, abundance; Zayd ibn Harithah (RA)", origin: "Arabic" },
];

const KEY = "heartify_baby_name_favs";

export default function BabyNames() {
  const [q, setQ] = useState("");
  const [gender, setGender] = useState<"all" | "boy" | "girl">("all");
  const [favs, setFavs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  });
  const [onlyFavs, setOnlyFavs] = useState(false);

  const toggleFav = (name: string) => {
    setFavs((f) => {
      const next = f.includes(name) ? f.filter((n) => n !== name) : [...f, name];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return NAMES.filter((n) => {
      if (gender !== "all" && n.gender !== gender) return false;
      if (onlyFavs && !favs.includes(n.name)) return false;
      if (!s) return true;
      return (
        n.name.toLowerCase().includes(s) ||
        n.arabic.includes(s) ||
        n.meaning.toLowerCase().includes(s)
      );
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [q, gender, favs, onlyFavs]);

  return (
    <div className="min-h-dvh bg-background">
      <Helmet>
        <title>Islamic Baby Names — Heartify</title>
        <meta name="description" content="Browse Islamic baby names with Arabic script, meanings, and origins. Save favorites for later." />
      </Helmet>
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 pb-24 pt-24">
        <header className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Baby className="h-4 w-4" /> Family</div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Islamic Baby Names</h1>
          <p className="mt-1 text-muted-foreground">Curated names with Arabic script, meanings, and origins. Save your favorites.</p>
        </header>

        <Card className="mb-6">
          <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, Arabic, or meaning" className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "boy", "girl"] as const).map((g) => (
                <Button key={g} size="sm" variant={gender === g ? "default" : "outline"} onClick={() => setGender(g)}>
                  {g === "all" ? "All" : g === "boy" ? "Boys" : "Girls"}
                </Button>
              ))}
              <Button size="sm" variant={onlyFavs ? "default" : "outline"} onClick={() => setOnlyFavs((v) => !v)}>
                <Heart className={`mr-1 h-4 w-4 ${onlyFavs ? "fill-current" : ""}`} /> Favorites ({favs.length})
              </Button>
            </div>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No names match your filters.</CardContent></Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {filtered.map((n) => {
              const fav = favs.includes(n.name);
              return (
                <li key={n.name}>
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold">{n.name}</h2>
                            <Badge variant="secondary" className="capitalize">{n.gender}</Badge>
                          </div>
                          <div className="mt-0.5 text-right font-arabic text-xl" dir="rtl">{n.arabic}</div>
                          <p className="mt-2 text-sm text-muted-foreground">{n.meaning}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Origin: {n.origin}</p>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => toggleFav(n.name)} aria-label={fav ? "Unfavorite" : "Favorite"}>
                          <Heart className={`h-5 w-5 ${fav ? "fill-primary text-primary" : ""}`} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
