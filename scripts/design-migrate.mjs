#!/usr/bin/env node
/**
 * Phase 4 codemod: map off-scale Tailwind utilities to design-system tokens.
 * Idempotent, safe to re-run. Skips src/components/ui/** and src/integrations/**.
 * Respects `design-lint-disable` markers.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const ALLOW = ["src/components/ui/", "src/integrations/"];

// Word-boundary safe replacements.
const TEXT_MAP = [
  [/\btext-xs\b/g, "text-micro"],
  [/\btext-lg\b/g, "text-heading"],
  [/\btext-xl\b/g, "text-heading"],
  [/\btext-2xl\b/g, "text-title"],
  [/\btext-3xl\b/g, "text-title"],
  [/\btext-4xl\b/g, "text-display"],
  [/\btext-5xl\b/g, "text-display"],
  [/\btext-6xl\b/g, "text-display"],
  [/\btext-7xl\b/g, "text-display"],
  [/\btext-8xl\b/g, "text-display"],
  [/\btext-9xl\b/g, "text-display"],
];

const RADIUS_MAP = [
  [/\brounded-full\b/g, "rounded-pill"],
  [/\brounded-(?:sm|md|lg|xl|2xl|3xl|none)\b/g, "rounded-card"],
];

const DUR_MAP = [
  [/\bduration-(?:75|100)\b/g, "duration-micro"],
  [/\bduration-(?:150|300)\b/g, "duration-short"],
  [/\bduration-(?:500|700|1000)\b/g, "duration-medium"],
];

const ALL = [...TEXT_MAP, ...RADIUS_MAP, ...DUR_MAP];

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if ([".ts", ".tsx"].includes(extname(name))) files.push(p);
  }
})(SRC);

let changed = 0;
let replacements = 0;
for (const f of files) {
  const rel = relative(ROOT, f).replaceAll("\\", "/");
  if (ALLOW.some((d) => rel.startsWith(d))) continue;
  const src = readFileSync(f, "utf8");
  const lines = src.split("\n");
  let fileChanged = false;
  const newLines = lines.map((line, i) => {
    const prev = lines[i - 1] ?? "";
    if (line.includes("design-lint-disable") || prev.includes("design-lint-disable")) return line;
    let out = line;
    for (const [re, rep] of ALL) {
      out = out.replace(re, (m) => {
        replacements++;
        return rep;
      });
    }
    if (out !== line) fileChanged = true;
    return out;
  });
  if (fileChanged) {
    writeFileSync(f, newLines.join("\n"));
    changed++;
  }
}
console.log(`design-migrate: ${replacements} replacements across ${changed} files.`);
