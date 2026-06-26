#!/usr/bin/env node
/**
 * validate-gallery.mjs — CI/Build guard (T038)
 *
 * Enforces SC-005 / FR-016:
 *   Every entry in the gallery manifest that has any content (id, beforeSrc, afterSrc)
 *   MUST have a non-empty consentProofId.
 *
 * Exit code 0  → all entries have documented consent → build may proceed.
 * Exit code 1  → at least one entry is missing consentProofId → build MUST fail.
 *
 * Usage:
 *   node frontend/scripts/validate-gallery.mjs
 *   npm run validate:gallery   (added to package.json)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = join(__dirname, '..', 'src', 'content', 'galerie', 'manifest.json');

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
} catch (err) {
  console.error(`❌  Could not read gallery manifest at ${MANIFEST_PATH}`);
  console.error(err.message);
  process.exit(1);
}

if (!Array.isArray(manifest)) {
  console.error('❌  manifest.json must be a JSON array.');
  process.exit(1);
}

const violations = manifest.filter(
  (item) =>
    !item.consentProofId ||
    typeof item.consentProofId !== 'string' ||
    item.consentProofId.trim().length === 0
);

if (violations.length > 0) {
  console.error('');
  console.error('❌  Gallery consent guard FAILED (SC-005 / FR-016)');
  console.error('');
  console.error(
    `   ${violations.length} published gallery entry/entries are missing a non-empty consentProofId:`
  );
  violations.forEach((item) => {
    console.error(`   • id="${item.id ?? '(missing id)'}"  beforeSrc="${item.beforeSrc ?? '—'}"`);
  });
  console.error('');
  console.error(
    '   Resolution: add an offline consent record and set consentProofId to its reference ID,'
  );
  console.error('   or remove the entry from the manifest entirely.');
  console.error('');
  process.exit(1);
}

console.log(`✅  Gallery consent guard passed — ${manifest.length} entry/entries, all with documented consent.`);
process.exit(0);
