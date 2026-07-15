#!/usr/bin/env node
/**
 * Design-system guardrail. See docs/DESIGN_SYSTEM.md.
 * Fails when off-scale classes or hardcoded colors appear in src/**.
 *
 * Allow-list: files inside src/components/ui/** (shadcn primitives — vendored,
 * change only via system PR) and any file explicitly annotated with the
 * comment `// design-lint-disable` on the same or previous line.
 *
 * Run:  node scripts/design-lint.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

const RULES = [
  {
    id: "hex-color",
    re: /#[0-9a-fA-F]{3,8}\b|\b(?:bg|text|border|fill|stroke|from|to|via)-\[#[0-9a-fA-F]{3,8}[^\]]*\]/g,
    msg: "Hardcoded color. Use semantic tokens (bg-primary, text-foreground, ...).",
  },
  {
    id: "off-scale-text",
    re: /\btext-(xs|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/g,
    msg: "Off-scale type. Use text-display|title|heading|body|caption|micro.",
  },
  {
    id: "off-scale-radius",
    re: /\brounded-(sm|md|lg|xl|2xl|3xl|full|none)\b/g,
    msg: "Off-scale radius. Use rounded-card or rounded-pill.",
  },
  {
    id: "off-scale-duration",
    re: /\bduration-(?:75|100|150|300|500|700|1000|\[[^\]]+\])\b/g,
    msg: "Off-scale duration. Use duration-micro|short|medium.",
  },
];

const ALLOW_DIRS = ["src/components/ui/", "src/integrations/"];

const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if ([".ts", ".tsx"].includes(extname(name))) files.push(p);
  }
}
walk(SRC);

const REPORT_ONLY = process.argv.includes("--report");
let violations = 0;
const counts = {};

for (const file of files) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  if (ALLOW_DIRS.some((d) => rel.startsWith(d))) continue;
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n");
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(src))) {
      const idx = m.index;
      let line = 1, col = 1, running = 0;
      for (let i = 0; i < lines.length; i++) {
        if (running + lines[i].length + 1 > idx) { line = i + 1; col = idx - running + 1; break; }
        running += lines[i].length + 1;
      }
      const linetext = lines[line - 1] ?? "";
      const prev = lines[line - 2] ?? "";
      if (linetext.includes("design-lint-disable") || prev.includes("design-lint-disable")) continue;
      counts[rule.id] = (counts[rule.id] || 0) + 1;
      if (!REPORT_ONLY) console.error(`${rel}:${line}:${col}  [${rule.id}]  "${m[0]}"  — ${rule.msg}`);
      violations++;
    }
  }
}

if (REPORT_ONLY) {
  console.log("design-lint report (baseline mode, non-failing):");
  for (const [id, n] of Object.entries(counts)) console.log(`  ${id.padEnd(22)} ${n}`);
  console.log(`  total: ${violations}`);
  process.exit(0);
}

if (violations > 0) {
  console.error(`\n✗ design-lint: ${violations} violation(s). See docs/DESIGN_SYSTEM.md.`);
  process.exit(1);
}
console.log("✓ design-lint: all files conform to locked design system v1.");
