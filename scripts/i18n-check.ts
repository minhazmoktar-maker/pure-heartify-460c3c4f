/**
 * i18n key-parity check.
 *
 * Guarantees every non-English dictionary has the same keys as `en.json`
 * (English is the source of truth and the fallback in translate()).
 *
 * Failure modes:
 *   - missing keys   → translations will render the raw key or fall back to English
 *   - extra keys     → dead strings; wastes bundle + confuses translators
 *   - empty values   → translator forgot the string
 *   - unresolved {var} placeholders → mismatched vs English (breaks interpolation)
 *
 * Exit code is non-zero on failure so this is CI-safe.
 * Wire into CI with: `bun run i18n:check` (or `npx tsx scripts/i18n-check.ts`).
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const DICT_DIR = resolve("src/i18n/dictionaries");
const PLACEHOLDER_RE = /\{(\w+)\}/g;

type Dict = Record<string, string>;

function readDict(file: string): Dict {
  return JSON.parse(readFileSync(resolve(DICT_DIR, file), "utf8")) as Dict;
}

function placeholders(value: string): Set<string> {
  const out = new Set<string>();
  for (const m of value.matchAll(PLACEHOLDER_RE)) out.add(m[1]);
  return out;
}

function eqSet(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

const en = readDict("en.json");
const enKeys = new Set(Object.keys(en));
const files = readdirSync(DICT_DIR).filter((f) => f.endsWith(".json") && f !== "en.json");

let failures = 0;
const summary: string[] = [];

for (const file of files.sort()) {
  const lang = file.replace(/\.json$/, "");
  const dict = readDict(file);
  const langKeys = new Set(Object.keys(dict));
  const missing = [...enKeys].filter((k) => !langKeys.has(k));
  const extra = [...langKeys].filter((k) => !enKeys.has(k));
  const empty = Object.entries(dict)
    .filter(([, v]) => typeof v !== "string" || v.trim().length === 0)
    .map(([k]) => k);
  const placeholderMismatch: string[] = [];
  for (const [k, v] of Object.entries(dict)) {
    if (typeof v !== "string" || !enKeys.has(k)) continue;
    if (!eqSet(placeholders(en[k]), placeholders(v))) placeholderMismatch.push(k);
  }

  const problems = missing.length + extra.length + empty.length + placeholderMismatch.length;
  if (problems === 0) {
    summary.push(`  \u2713 ${lang.padEnd(4)}  ${Object.keys(dict).length} keys, parity`);
    continue;
  }
  failures += problems;
  const lines = [
    `  \u2717 ${lang.padEnd(4)}  ${problems} issue${problems === 1 ? "" : "s"}`,
  ];
  if (missing.length) lines.push(`      missing (${missing.length}): ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "\u2026" : ""}`);
  if (extra.length) lines.push(`      extra (${extra.length}): ${extra.slice(0, 5).join(", ")}${extra.length > 5 ? "\u2026" : ""}`);
  if (empty.length) lines.push(`      empty (${empty.length}): ${empty.slice(0, 5).join(", ")}${empty.length > 5 ? "\u2026" : ""}`);
  if (placeholderMismatch.length) lines.push(`      {var} mismatch (${placeholderMismatch.length}): ${placeholderMismatch.slice(0, 5).join(", ")}`);
  summary.push(lines.join("\n"));
}

console.log(`i18n dictionary parity vs en.json (${enKeys.size} keys):`);
console.log(summary.join("\n"));

if (failures > 0) {
  console.error(`\n${failures} issue(s) across ${files.length} dictionaries. See above.`);
  process.exit(1);
}
console.log(`\nAll ${files.length} dictionaries in parity.`);
