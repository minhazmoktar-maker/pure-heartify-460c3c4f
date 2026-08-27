/**
 * Multilingual front-end for the deterministic support brain.
 *
 * Heartify's largest markets do not type support questions in English. Instead
 * of duplicating every FAQ, classifier rule and cache key per language, every
 * incoming question is first folded to a canonical English intent phrase here.
 * Downstream layers (normalisation, cache keys, classification, FAQ lookup)
 * then behave identically regardless of the language the user typed in.
 *
 * Pure, dependency-free and runtime-agnostic: the edge function (Deno) and the
 * Vitest suite (Node) import this exact file.
 */

export type SupportLanguage =
  | "en" | "bn" | "ur" | "ar" | "hi" | "id" | "ms" | "tr" | "fr" | "es" | "de" | "fa";

const SCRIPT_TESTS: Array<[SupportLanguage, RegExp]> = [
  ["bn", /[\u0980-\u09FF]/],
  ["hi", /[\u0900-\u097F]/],
  // Urdu/Persian-specific letters win over generic Arabic script.
  ["ur", /[\u06BE\u0679\u0688\u06AF\u06BA\u06C1\u06CC\u06D2]/],
  ["fa", /[\u067E\u0686\u0698\u06AF]/],
  ["ar", /[\u0600-\u06FF]/],
];

/**
 * Latin-script language hints. Deliberately conservative: only unambiguous
 * function words that appear in real support questions.
 */
const LATIN_HINTS: Array<[SupportLanguage, RegExp]> = [
  ["id", /\b(bagaimana|kenapa|saya|tidak|akun|langganan|batalkan|masuk|kata sandi|sandi)\b/i],
  ["ms", /\b(bagaimanakah|mengapa|saya tidak boleh|akaun|langganan saya|masuk ke akaun)\b/i],
  ["tr", /\b(nas[ıi]l|neden|hesab[ıi]m|abonelik|giri[şs] yapam[ıi]yorum|şifre|sifre)\b/i],
  ["fr", /\b(comment|pourquoi|mon compte|abonnement|se connecter|mot de passe)\b/i],
  ["es", /\b(c[oó]mo|por qu[eé]|mi cuenta|suscripci[oó]n|iniciar sesi[oó]n|contrase[nñ]a)\b/i],
  ["de", /\b(wie kann ich|warum|mein konto|abonnement|anmelden|passwort)\b/i],
  // Romanised Bengali / Urdu ("banglish", "roman urdu") — very common on mobile.
  ["bn", /\b(kivabe|kibhabe|kemon|amar|ami|korbo|hocche|hoy na|khulte)\b/i],
  ["ur", /\b(kaise|kyun|kyu|mera|meri|nahi|nahin|karun|kar sakta hoon)\b/i],
];

/** Detect the question language well enough to route translation + FAQ locale. */
export function detectQuestionLanguage(raw: string): SupportLanguage {
  const text = raw ?? "";
  for (const [lang, re] of SCRIPT_TESTS) if (re.test(text)) return lang;
  for (const [lang, re] of LATIN_HINTS) if (re.test(text)) return lang;
  return "en";
}

/**
 * Phrase table: non-English (or romanised) support vocabulary mapped to the
 * canonical English term used by the classifier, FAQ table and cache key.
 * Longest phrases first so multi-word intents win over single words.
 */
const PHRASES: Array<[RegExp, string]> = [
  // ---- Bengali (script) ----
  [/কিভাবে|কীভাবে|কেমন করে/g, " how "],
  [/কেন|কারণ কি/g, " why "],
  [/আমার/g, " my "],
  [/অ্যাকাউন্ট|একাউন্ট/g, " account "],
  [/পাসওয়ার্ড/g, " password "],
  [/সাবস্ক্রিপশন|সদস্যপদ/g, " subscription "],
  [/প্রিমিয়াম/g, " premium "],
  [/বাতিল|ক্যান্সেল/g, " cancel "],
  [/লগইন|লগ ইন|সাইন ইন|প্রবেশ/g, " login "],
  [/ভিডিও/g, " video "],
  [/চলছে না|কাজ করছে না|চালু হচ্ছে না/g, " not working "],
  [/সেভ|সংরক্ষণ/g, " save "],
  [/রিপোর্ট|অভিযোগ/g, " report "],
  [/মুছে|ডিলিট|ডিলীট/g, " delete "],
  [/টাকা|পেমেন্ট|বিল/g, " payment "],
  [/ফেরত|রিফান্ড/g, " refund "],

  // ---- Urdu / Arabic / Persian (script) ----
  [/کیسے|کیسا|طریقہ/g, " how "],
  [/کیوں/g, " why "],
  [/میرا|میری|میرے/g, " my "],
  [/اکاؤنٹ|حساب/g, " account "],
  [/پاس ورڈ|پاسورڈ/g, " password "],
  [/سبسکرپشن|رکنیت/g, " subscription "],
  [/منسوخ/g, " cancel "],
  [/لاگ ان|سائن ان|داخل/g, " login "],
  [/ویڈیو/g, " video "],
  [/کام نہیں|چل نہیں/g, " not working "],
  [/محفوظ|سیو/g, " save "],
  [/رپورٹ|شکایت/g, " report "],
  [/ڈیلیٹ|حذف کریں/g, " delete "],
  [/ادائیگی|رقم/g, " payment "],
  [/رقم کی واپسی|ریفنڈ/g, " refund "],
  [/كيف|كيفية/g, " how "],
  [/لماذا/g, " why "],
  [/حسابي/g, " my account "],
  [/كلمة (?:ال)?مرور|كلمة السر/g, " password "],
  [/الاشتراك|اشتراكي/g, " subscription "],
  [/إلغاء|الغاء/g, " cancel "],
  [/تسجيل الدخول|الدخول/g, " login "],
  [/فيديو|الفيديو/g, " video "],
  [/لا يعمل|لا تعمل|لايعمل/g, " not working "],
  [/الدفع|الفاتورة/g, " payment "],
  [/استرداد|المبلغ المسترد/g, " refund "],
  [/أحفظ|احفظ|حفظ|أضيف إلى المفضلة/g, " save "],
  [/حذف/g, " delete "],
  [/تقرير|الإبلاغ|ابلاغ/g, " report "],

  // ---- Hindi (script) ----
  [/कैसे/g, " how "],
  [/क्यों/g, " why "],
  [/मेरा|मेरी/g, " my "],
  [/खाता|अकाउंट/g, " account "],
  [/पासवर्ड/g, " password "],
  [/सदस्यता|सब्सक्रिप्शन/g, " subscription "],
  [/रद्द/g, " cancel "],
  [/लॉग ?इन|साइन ?इन/g, " login "],
  [/वीडियो/g, " video "],
  [/काम नहीं/g, " not working "],
  [/सेव|सहेज/g, " save "],
  [/सिस्टम प्रॉम्प्ट/g, " system prompt "],
  [/दिखाओ|दिखाएँ|बताओ/g, " show "],
  [/अपने|अपना/g, " your "],

  // ---- Indonesian / Malay ----
  [/\bbagaimanakah\b|\bbagaimana cara\b|\bbagaimana\b/gi, " how "],
  [/\bmengapa\b|\bkenapa\b/gi, " why "],
  [/\b(saya|aku)\b/gi, " my "],
  [/\bakun\b|\bakaun\b/gi, " account "],
  [/\bkata sandi\b|\bsandi\b|\bkata laluan\b/gi, " password "],
  [/\blangganan\b/gi, " subscription "],
  [/\b(batalkan|membatalkan|batal)\b/gi, " cancel "],
  [/\b(masuk|login)\b/gi, " login "],
  [/\bvideo tidak (bisa )?(diputar|main)\b/gi, " video not working "],
  [/\btidak (bisa|boleh|dapat)\b/gi, " cannot "],
  [/\b(menyimpan|simpan)\b/gi, " save "],
  [/\bhapus\b/gi, " delete "],
  [/\blaporkan\b|\blapor\b/gi, " report "],
  [/\bpembayaran\b/gi, " payment "],
  [/\bpengembalian dana\b/gi, " refund "],

  // ---- Turkish ----
  [/\bnas[ıi]l\b/gi, " how "],
  [/\bneden\b|\bni[çc]in\b/gi, " why "],
  [/\bhesab[ıi]m[ıi]?\b|\bhesap\b/gi, " account "],
  [/\b[şs]ifre(mi)?\b/gi, " password "],
  [/\babonelik(imi)?\b/gi, " subscription "],
  [/\biptal\b/gi, " cancel "],
  [/\bgiri[şs] yapam[ıi]yorum\b/gi, " cannot login "],
  [/\bgiri[şs]\b/gi, " login "],
  [/\b[çc]al[ıi][şs]m[ıi]yor\b/gi, " not working "],
  [/\b[öo]deme\b/gi, " payment "],
  [/\bgeri [öo]deme\b/gi, " refund "],
  [/\bsil(mek)?\b/gi, " delete "],

  // ---- French ----
  [/\bcomment\b/gi, " how "],
  [/\bpourquoi\b/gi, " why "],
  [/\bmon compte\b|\bcompte\b/gi, " account "],
  [/\bmot de passe\b/gi, " password "],
  [/\babonnement\b/gi, " subscription "],
  [/\bannuler\b|\br[ée]silier\b/gi, " cancel "],
  [/\bse connecter\b|\bconnexion\b/gi, " login "],
  [/\bne fonctionne pas\b|\bne marche pas\b/gi, " not working "],
  [/\bpaiement\b/gi, " payment "],
  [/\bremboursement\b/gi, " refund "],
  [/\bsupprimer\b/gi, " delete "],
  [/\bsignaler\b/gi, " report "],

  // ---- Spanish ----
  [/\bc[oó]mo\b/gi, " how "],
  [/\bpor qu[eé]\b/gi, " why "],
  [/\bmi cuenta\b|\bcuenta\b/gi, " account "],
  [/\bcontrase[nñ]a\b/gi, " password "],
  [/\bsuscripci[oó]n\b/gi, " subscription "],
  [/\bcancelar\b/gi, " cancel "],
  [/\biniciar sesi[oó]n\b/gi, " login "],
  [/\bno funciona\b/gi, " not working "],
  [/\bpago\b/gi, " payment "],
  [/\breembolso\b/gi, " refund "],
  [/\beliminar\b|\bborrar\b/gi, " delete "],

  // ---- German ----
  [/\bwie kann ich\b|\bwie\b/gi, " how "],
  [/\bwarum\b/gi, " why "],
  [/\bmein konto\b|\bkonto\b/gi, " account "],
  [/\bpasswort\b/gi, " password "],
  [/\babonnement\b|\babo\b/gi, " subscription "],
  [/\bk[üu]ndigen\b|\bstornieren\b/gi, " cancel "],
  [/\banmelden\b|\beinloggen\b/gi, " login "],
  [/\bfunktioniert nicht\b/gi, " not working "],
  [/\bzahlung\b/gi, " payment "],
  [/\bl[öo]schen\b/gi, " delete "],

  // ---- Romanised Bengali / Urdu ----
  [/\b(kivabe|kibhabe|kemon kore)\b/gi, " how "],
  [/\b(keno|kyun|kyu|kyon)\b/gi, " why "],
  [/\b(amar|mera|meri)\b/gi, " my "],
  [/\b(kaise|kese)\b/gi, " how "],
  [/\b(hoy na|hocche na|kaj korche na|kaam nahi kar raha|nahi chal raha)\b/gi, " not working "],
  [/\b(bondho|bond)\b/gi, " cancel "],
  [/\bpaisa\b|\btaka\b/gi, " payment "],
];

/** Canonicalise a question into English support vocabulary. */
export interface Canonical {
  language: SupportLanguage;
  /** English-vocabulary text safe to feed the classifier / FAQ lookup. */
  canonical: string;
  /** True when at least one non-English phrase was folded. */
  translated: boolean;
}

export function canonicalizeQuestion(raw: string): Canonical {
  const original = (raw ?? "").trim();
  const language = detectQuestionLanguage(original);
  if (!original) return { language: "en", canonical: "", translated: false };

  let text = original;
  let translated = false;
  for (const [re, to] of PHRASES) {
    // Re-create the regex per call so shared `g` state never leaks.
    const rx = new RegExp(re.source, re.flags);
    if (rx.test(text)) {
      translated = true;
      text = text.replace(new RegExp(re.source, re.flags), to);
    }
  }
  // Drop any remaining non-Latin characters — they carry no signal downstream
  // and would otherwise fragment the cache key.
  const canonical = text
    .replace(/[^\p{Script=Latin}\p{N}\s'?!.,-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    language,
    canonical: canonical.length > 0 ? canonical : original,
    translated: translated && language !== "en",
  };
}

/** The locale used for FAQ/KB lookup: the user's language, falling back to en. */
export function faqLocaleFor(language: SupportLanguage, requested: string): string {
  const req = (requested ?? "en").slice(0, 2).toLowerCase();
  if (req && req !== "en") return req;
  return language;
}
