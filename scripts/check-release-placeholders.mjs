#!/usr/bin/env node
/**
 * Release guard: fails if a store-blocking placeholder is still in the tree.
 *
 * Run before uploading a build:  npm run release:check
 * Exits 1 and lists every file/line that still holds a placeholder value.
 */
import { readFileSync, existsSync } from 'node:fs';

const CHECKS = [
  {
    file: 'public/.well-known/assetlinks.json',
    pattern: /REPLACE_WITH_[A-Z_]+/g,
    hint: 'Add the real SHA-256 fingerprints (upload key + Play App Signing) and redeploy the website.',
  },
  {
    file: 'public/.well-known/apple-app-site-association',
    pattern: /TEAMID/g,
    hint: 'Replace TEAMID with your 10-character Apple Developer Team ID and redeploy the website.',
  },
  {
    file: 'android/app/google-services.json',
    pattern: /@secret:|YOUR_|REPLACE_/g,
    hint: 'Use the real google-services.json downloaded from the Firebase console.',
  },
];

let failed = 0;
for (const { file, pattern, hint } of CHECKS) {
  if (!existsSync(file)) {
    console.error(`MISSING  ${file} — ${hint}`);
    failed++;
    continue;
  }
  const text = readFileSync(file, 'utf8');
  const hits = [...text.matchAll(pattern)].map((m) => m[0]);
  if (hits.length) {
    console.error(`PLACEHOLDER  ${file} → ${[...new Set(hits)].join(', ')}\n             ${hint}`);
    failed++;
  } else {
    console.log(`OK  ${file}`);
  }
}

if (failed) {
  console.error(`\n${failed} placeholder issue(s). Deep links (Android App Links / iOS Universal Links) will not verify until these are real.`);
  process.exit(1);
}
console.log('\nAll release placeholders resolved.');
