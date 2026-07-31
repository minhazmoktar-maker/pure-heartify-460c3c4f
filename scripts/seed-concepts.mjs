/**
 * MVP-3 knowledge-graph seed.
 *
 * Emits idempotent SQL for `public.concepts` + `public.concept_prerequisites`.
 * The graph is authored as domains → clusters → an ordered ladder of concepts.
 * Position in a ladder is the concept's `level`; each step requires the step
 * before it, which is exactly what the prerequisite edges encode.
 *
 * Usage: node scripts/seed-concepts.mjs > /tmp/concepts.sql
 */

const DOMAINS = {
  aqidah: {
    label: "Aqidah",
    clusters: [
      ["Tawhid: the oneness of Allah", "Tawhid al-rububiyyah", "Tawhid al-uluhiyyah", "Tawhid al-asma wa al-sifat", "Common errors in describing Allah"],
      ["What shirk means", "Major and minor shirk", "Shirk in supplication", "Shirk in obedience and law", "Guarding tawhid in daily life"],
      ["The six pillars of iman", "Belief in the angels", "Belief in the revealed books", "Belief in the messengers", "Belief in the Last Day"],
      ["Belief in divine decree", "Qadar and human choice", "Reconciling decree with responsibility", "Trials as decree", "Contentment with the decree"],
      ["Who the prophets were", "The finality of prophethood", "Miracles and their purpose", "Signs of true prophethood", "Rejecting false claims to prophethood"],
      ["The names of Allah: an introduction", "Al-Rahman and al-Rahim", "Al-Malik and al-Quddus", "Al-Hakim and al-Alim", "Living by the divine names"],
      ["What the soul is", "Life in the grave", "The blowing of the trumpet", "The reckoning and the scale", "Paradise and the Fire"],
      ["Iman, kufr and nifaq", "Levels of iman", "What increases iman", "What weakens iman", "Repairing weakened iman"],
      ["The unseen world", "Angels and their duties", "Jinn: what is established", "Protection from harm through revelation", "Superstition versus tawakkul"],
      ["Sources of creed", "Why creed must be textual", "Reading creed with the early generations", "Avoiding speculative theology", "Teaching creed to a beginner"],
    ],
  },
  quran: {
    label: "Qur'an",
    clusters: [
      ["What the Qur'an is", "How the Qur'an was revealed", "How the Qur'an was preserved", "The compilation of the mushaf", "The seven modes of recitation"],
      ["Makkan and Madinan revelation", "Occasions of revelation", "Abrogation: what it means", "Clear and ambiguous verses", "Order of the surahs"],
      ["Beginning tajwid", "Articulation points of the letters", "Rules of the noon and meem", "Elongation rules", "Stopping and starting correctly"],
      ["What tafsir is", "Tafsir by narration", "Tafsir by reasoned inference", "Tools every reader needs", "Judging a tafsir source"],
      ["Reading Surah al-Fatihah", "The opening as a prayer", "Guidance in al-Fatihah", "Al-Fatihah in the salah", "Al-Fatihah as a cure"],
      ["Themes of Surah al-Baqarah", "The story of Adam in the Qur'an", "Bani Isra'il in the Qur'an", "Verses of law in al-Baqarah", "The verse of the Throne"],
      ["Short surahs for beginners", "Surah al-Ikhlas explained", "Surah al-Falaq and al-Nas", "Surah al-Kahf and its lessons", "Surah Yasin in context"],
      ["Qur'anic supplications", "Supplications of the prophets", "Asking well in the Qur'an", "Making dua after study", "Building a personal dua list"],
      ["Memorising the Qur'an", "Choosing a memorisation plan", "Revision that lasts", "Recovering forgotten portions", "Memorising with understanding"],
      ["Living with the Qur'an", "Daily portion and consistency", "Reflection as a habit", "Acting on what you read", "Teaching a verse to others"],
    ],
  },
  hadith: {
    label: "Hadith",
    clusters: [
      ["What hadith is", "Hadith and sunnah", "Why hadith is needed", "Hadith and the Qur'an together", "Common objections answered"],
      ["Anatomy of a hadith", "Chain and text", "What isnad means", "How narrators were graded", "Why the chain matters"],
      ["Sahih, hasan, daif", "Fabricated reports", "Mutawatir and ahad", "Hidden defects in narration", "Grading in practice"],
      ["The major collections", "Sahih al-Bukhari", "Sahih Muslim", "The four Sunan works", "Reading a collection well"],
      ["Forty hadith: an introduction", "Intentions and deeds", "Islam, iman, ihsan", "The lawful and the doubtful", "Sincerity in advice"],
      ["Hadith on worship", "Hadith on character", "Hadith on family", "Hadith on wealth", "Hadith on the heart"],
      ["Verifying a hadith yourself", "Using reliable databases", "Reading a scholar's grading", "Spotting misquoted hadith", "Sharing hadith responsibly"],
      ["Understanding hadith in context", "Occasion of a report", "General and specific wording", "Apparent contradictions", "Reconciling reports"],
      ["Sciences of narrator biography", "Preservation of the sunnah", "Travel in search of hadith", "Women narrators of hadith", "Continuity of transmission today"],
      ["Acting on the sunnah", "Choosing a sunnah to revive", "Sunnah in daily routine", "Sunnah without extremism", "Teaching the sunnah gently"],
    ],
  },
  fiqh: {
    label: "Fiqh",
    clusters: [
      ["What fiqh is", "Fiqh and shariah", "Sources of rulings", "Consensus and analogy", "Difference of opinion and respect"],
      ["Purity: an introduction", "Types of water", "Wudu step by step", "Ghusl and when it is due", "Tayammum when water is absent"],
      ["The five daily prayers", "Conditions of a valid prayer", "How to pray step by step", "Prayer in congregation", "Making up missed prayers"],
      ["Prayer in special situations", "Shortening prayer while travelling", "Combining prayers", "Prayer when ill", "Prayer of fear and need"],
      ["Fasting: an introduction", "Who must fast", "What breaks the fast", "Making up missed fasts", "Voluntary fasting"],
      ["Zakat: an introduction", "Wealth that zakat is due on", "Calculating zakat", "Who receives zakat", "Zakat al-fitr"],
      ["Hajj and umrah: an overview", "Conditions of hajj", "The rites in order", "Common mistakes in hajj", "After hajj: keeping the change"],
      ["Halal and haram in food", "Slaughter and its conditions", "Doubtful ingredients", "Eating out with care", "Food rulings while travelling"],
      ["Financial dealings", "Riba: what it is", "Sales that are valid", "Debt and its ethics", "Contemporary banking questions"],
      ["Marriage and its contract", "Rights in marriage", "Divorce: the lawful process", "Inheritance basics", "Wills and bequests"],
    ],
  },
  seerah: {
    label: "Seerah",
    clusters: [
      ["Arabia before Islam", "The tribe of Quraysh", "The Ka'bah before Islam", "Birth of the Prophet", "Childhood and youth"],
      ["The first revelation", "The secret call", "The open call", "Persecution in Makkah", "Migration to Abyssinia"],
      ["The boycott years", "The year of grief", "The night journey and ascension", "The pledges of Aqabah", "The migration to Madinah"],
      ["Building the first mosque", "The charter of Madinah", "Muhajirun and Ansar", "Establishing the market", "Governing a new community"],
      ["The Battle of Badr", "The Battle of Uhud", "The Battle of the Trench", "Lessons from setbacks", "Leadership under pressure"],
      ["The Treaty of Hudaybiyyah", "Letters to the kings", "The conquest of Makkah", "Amnesty at the conquest", "The Battle of Tabuk"],
      ["The farewell pilgrimage", "The final sermon", "The Prophet's illness", "His passing", "Succession after the Prophet"],
      ["The Prophet as a husband", "The Prophet as a father", "The Prophet with children", "The Prophet with neighbours", "The Prophet with opponents"],
      ["The Prophet's daily habits", "His worship at night", "His speech and humour", "His dress and simplicity", "His mercy to animals"],
      ["Reading seerah critically", "Primary seerah sources", "Weak stories to avoid", "Seerah and modern life", "Teaching seerah to children"],
    ],
  },
  history: {
    label: "Islamic history",
    clusters: [
      ["The rightly guided caliphs", "Abu Bakr's caliphate", "Umar's administration", "Uthman and the mushaf", "Ali and the first trials"],
      ["The Umayyad period", "Expansion and governance", "Umar ibn Abd al-Aziz", "Scholarship under the Umayyads", "Decline of the dynasty"],
      ["The Abbasid period", "Baghdad as a capital", "The translation movement", "Institutions of learning", "Fragmentation of authority"],
      ["Islam in al-Andalus", "Cordoba and its libraries", "Scholars of al-Andalus", "The fall of Granada", "Legacy of al-Andalus"],
      ["The Crusades", "Salah al-Din", "Jerusalem across eras", "Diplomacy and warfare", "Historical memory of the Crusades"],
      ["The Mongol invasions", "The fall of Baghdad", "Recovery after catastrophe", "Scholars in exile", "Rebuilding institutions"],
      ["The Ottoman period", "Conquest of Constantinople", "Ottoman law and administration", "Reform in the late empire", "The end of the caliphate"],
      ["Islam in West Africa", "Timbuktu and its manuscripts", "Islam in East Africa", "Islam in South Asia", "Islam in Southeast Asia"],
      ["Colonialism and the Muslim world", "Responses to colonisation", "Independence movements", "Post-colonial states", "Diaspora communities"],
      ["Reading history honestly", "Sources and their bias", "Distinguishing report from legend", "Learning from decline", "History as moral instruction"],
    ],
  },
  arabic: {
    label: "Arabic language",
    clusters: [
      ["The Arabic alphabet", "Short and long vowels", "Sun and moon letters", "Reading simple words", "Reading without vowel marks"],
      ["Nouns and their cases", "Definite and indefinite", "Gender in Arabic", "Singular, dual and plural", "The construct phrase"],
      ["The Arabic verb", "Past-tense conjugation", "Present-tense conjugation", "Command forms", "Negation of verbs"],
      ["Sentence types", "Nominal sentences", "Verbal sentences", "Word order and emphasis", "Questions in Arabic"],
      ["Root and pattern", "The ten verb forms", "Deriving meaning from a root", "Using a root dictionary", "Vocabulary growth by roots"],
      ["Prepositions and particles", "Conditional sentences", "Relative clauses", "Exception and restriction", "Oaths and emphasis"],
      ["Qur'anic vocabulary tier one", "Qur'anic vocabulary tier two", "Recurring Qur'anic phrases", "Parsing a short verse", "Parsing a long verse"],
      ["Balaghah: an introduction", "Simile and metaphor", "Word order for effect", "Conciseness in the Qur'an", "Beauty of Qur'anic style"],
      ["Listening comprehension", "Classical versus modern usage", "Reading a classical text", "Using a commentary", "Reading unaided"],
      ["Speaking basics", "Everyday conversation", "Asking questions politely", "Writing simple Arabic", "Studying with a teacher"],
    ],
  },
  tazkiyah: {
    label: "Character & purification",
    clusters: [
      ["What tazkiyah is", "The heart in revelation", "Diseases of the heart", "Signs of a sound heart", "A plan for the heart"],
      ["Sincerity", "Showing off and its cure", "Seeking praise", "Acting for Allah alone", "Sincerity in public work"],
      ["Repentance", "Conditions of repentance", "Repeated relapse", "Hope and fear in balance", "Concealing the sins of others"],
      ["Patience", "Patience in hardship", "Patience in obedience", "Patience against desire", "Gratitude as a twin virtue"],
      ["Reliance on Allah", "Effort with reliance", "Anxiety and trust", "Contentment with provision", "Freedom from envy"],
      ["Anger and its control", "Speech and its dangers", "Backbiting", "Suspicion and spying", "Keeping a guarded tongue"],
      ["Humility", "Arrogance and its roots", "Accepting correction", "Serving without recognition", "Honouring elders and youth"],
      ["Remembrance of Allah", "Morning and evening adhkar", "Dhikr after prayer", "Dhikr as a discipline", "Presence of heart in dhikr"],
      ["Night prayer", "Building a night habit", "Reciting in the night", "Weeping and softness", "Steadiness over intensity"],
      ["Brotherhood", "Loving for the sake of Allah", "Advice and its etiquette", "Forgiving people", "Reconciling two believers"],
    ],
  },
  family: {
    label: "Family & upbringing",
    clusters: [
      ["The family in Islam", "Rights of parents", "Rights of children", "Rights of relatives", "Keeping family ties"],
      ["Choosing a spouse", "The marriage proposal", "Expectations before marriage", "Financial readiness", "Marriage without extravagance"],
      ["Communication in marriage", "Resolving conflict", "Intimacy and modesty", "Shared worship as a couple", "Marriage under strain"],
      ["Newborn sunnahs", "Naming a child", "Early years of care", "Teaching prayer to a child", "Teaching the Qur'an to a child"],
      ["Discipline with mercy", "Praise and correction", "Consistency between parents", "Chores and responsibility", "Sibling relationships"],
      ["Talking to teenagers", "Identity and belonging", "Peer pressure", "Trust and independence", "Teens and worship"],
      ["Children and screens", "Setting device boundaries", "Age-appropriate content", "Talking about online harm", "Modelling healthy use"],
      ["Family routines", "Family meals", "Family study circle", "Family charity habit", "Family Ramadan plan"],
      ["Caring for elderly parents", "Illness in the family", "Grief and loss", "Explaining death to children", "Wills and family duty"],
      ["Marriage difficulties", "Seeking help early", "Mediation", "Divorce with dignity", "Co-parenting after divorce"],
    ],
  },
  world: {
    label: "Beneficial worldly knowledge",
    clusters: [
      ["Learning how to learn", "Attention and focus", "Deep work habits", "Spaced review", "Teaching to consolidate"],
      ["Digital minimalism", "Auditing your attention", "Notification hygiene", "Replacing scrolling", "A weekly digital reset"],
      ["Personal finance basics", "Budgeting", "Avoiding debt traps", "Saving and emergency funds", "Halal investing basics"],
      ["Work ethics", "Honesty in trade", "Contracts and promises", "Workplace justice", "Serving customers well"],
      ["Health foundations", "Sleep", "Nutrition", "Movement and strength", "Preventive care"],
      ["Mental wellbeing", "Stress and its signals", "Anxiety: practical steps", "When to seek professional help", "Faith and therapy together"],
      ["Scientific thinking", "Evidence and inference", "Reading a study", "Statistics without deception", "Science and revelation"],
      ["Nature and stewardship", "Water and waste", "Animals and their rights", "Cities and community", "Sustainable consumption"],
      ["Communication skills", "Listening well", "Public speaking", "Writing clearly", "Disagreeing without harm"],
      ["Service and community", "Volunteering", "Building a local project", "Fundraising with integrity", "Leadership as trust"],
    ],
  },
};

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/['’ʿ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
const q = (s) => (s === null || s === undefined ? "NULL" : `'${String(s).replace(/'/g, "''")}'`);

const concepts = [];
const edges = [];
const seen = new Set();
let order = 0;

for (const [domain, def] of Object.entries(DOMAINS)) {
  for (const cluster of def.clusters) {
    let prevSlug = null;
    cluster.forEach((title, i) => {
      let slug = slugify(title);
      if (seen.has(slug)) slug = `${slug}-${domain}`;
      if (seen.has(slug)) return;
      seen.add(slug);
      concepts.push({
        slug,
        title,
        domain: def.label,
        level: Math.min(5, i + 1),
        summary: `${title} — step ${i + 1} of the "${cluster[0]}" ladder in ${def.label}.`,
        sort_order: order++,
      });
      if (prevSlug) edges.push({ concept: slug, prereq: prevSlug, strength: 0.9 });
      prevSlug = slug;
    });
  }
}

const lines = [];
lines.push("-- Generated by scripts/seed-concepts.mjs — safe to re-run.");
lines.push("BEGIN;");
lines.push(
  "INSERT INTO public.concepts (slug, title, domain, level, summary, sort_order) VALUES\n" +
    concepts
      .map(
        (c) =>
          `  (${q(c.slug)}, ${q(c.title)}, ${q(c.domain)}, ${c.level}, ${q(c.summary)}, ${c.sort_order})`,
      )
      .join(",\n") +
    "\nON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, domain = EXCLUDED.domain," +
    " level = EXCLUDED.level, summary = EXCLUDED.summary, sort_order = EXCLUDED.sort_order;",
);
lines.push(
  "INSERT INTO public.concept_prerequisites (concept_id, prerequisite_id, strength)\nSELECT c.id, p.id, e.strength FROM (VALUES\n" +
    edges.map((e) => `  (${q(e.concept)}, ${q(e.prereq)}, ${e.strength})`).join(",\n") +
    "\n) AS e(concept_slug, prereq_slug, strength)\nJOIN public.concepts c ON c.slug = e.concept_slug\nJOIN public.concepts p ON p.slug = e.prereq_slug\nON CONFLICT (concept_id, prerequisite_id) DO NOTHING;",
);
lines.push("COMMIT;");

process.stdout.write(lines.join("\n") + "\n");
process.stderr.write(`concepts=${concepts.length} edges=${edges.length}\n`);
