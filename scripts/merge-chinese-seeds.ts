/**
 * Merges the 3 Chinese pipeline seed-entries JSON files into seed-db.ts.
 *
 * - Deduplicates authors (feng-menglong already in seed-db.ts, zhang-dai in both A and C)
 * - Excludes 5 PARTIAL texts: qianfu-lun, qimin-yaoshu, rongzhai-suibi, dangkou-zhi, luye-xianzong
 * - Normalizes text entries (adds sourceUrl/processedDir where missing)
 * - Outputs the TypeScript code to insert into seed-db.ts
 *
 * Usage: pnpm tsx scripts/merge-chinese-seeds.ts
 */

import fs from "fs";
import path from "path";

const BASE = path.resolve(__dirname, "..");
const PIPELINE = path.join(BASE, "data", "chinese-pipeline");

// Read the 3 seed entry files
const seedA = JSON.parse(fs.readFileSync(path.join(PIPELINE, "seed-entries-a.json"), "utf-8"));
const seedB = JSON.parse(fs.readFileSync(path.join(PIPELINE, "seed-entries-b.json"), "utf-8"));
const seedC = JSON.parse(fs.readFileSync(path.join(PIPELINE, "seed-entries-c.json"), "utf-8"));

// Authors already in seed-db.ts (checked via grep)
const EXISTING_AUTHOR_SLUGS = new Set([
  "feng-menglong", // line 383
]);

// Texts to exclude (PARTIAL — Wikisource incomplete)
const EXCLUDE_TEXT_SLUGS = new Set([
  "qianfu-lun",      // 14/36 volumes
  "qimin-yaoshu",    // 14/92 volumes
  "rongzhai-suibi",  // 17/74 volumes
  "dangkou-zhi",     // 34/70 chapters
  "luye-xianzong",   // 43/100 chapters
]);

// Read verified-texts.json for sourceUrl data
const verified = JSON.parse(
  fs.readFileSync(path.join(PIPELINE, "verified-texts.json"), "utf-8")
);
const verifiedMap = new Map<string, any>();
for (const v of verified) {
  verifiedMap.set(v.slug, v);
}

// Collect all authors, dedup by slug
const allAuthors: any[] = [];
const seenAuthorSlugs = new Set<string>();

for (const src of [seedA, seedB, seedC]) {
  for (const author of src.authors) {
    if (EXISTING_AUTHOR_SLUGS.has(author.slug)) continue;
    if (seenAuthorSlugs.has(author.slug)) continue;
    seenAuthorSlugs.add(author.slug);
    allAuthors.push(author);
  }
}

// Collect all texts, exclude PARTIAL, normalize fields
const allTexts: any[] = [];

for (const src of [seedA, seedB, seedC]) {
  for (const text of src.texts) {
    if (EXCLUDE_TEXT_SLUGS.has(text.slug)) continue;

    // Normalize: ensure sourceUrl and processedDir
    const vEntry = verifiedMap.get(text.slug);
    const sourceUrl = text.sourceUrl || vEntry?.wikisource_url || `https://zh.wikisource.org/wiki/${text.titleOriginalScript}`;
    const processedDir = text.processedDir || `data/processed/${text.slug}`;

    allTexts.push({
      title: text.title,
      titleOriginalScript: text.titleOriginalScript,
      slug: text.slug,
      languageCode: "zh",
      genre: text.genre,
      textType: (text.textType || "prose") + '" as const',
      authorSlug: text.authorSlug,
      description: text.description,
      sourceUrl,
      processedDir,
      compositionYear: text.compositionYear,
      compositionEra: text.compositionEra,
    });
  }
}

// Generate TypeScript for authors
function escapeTs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

console.log(`// ============================================================`);
console.log(`// Chinese Pipeline Authors (${allAuthors.length} new authors)`);
console.log(`// ============================================================`);
console.log();

for (const a of allAuthors) {
  console.log(`  {`);
  console.log(`    name: "${escapeTs(a.name)}",`);
  console.log(`    nameOriginalScript: "${a.nameOriginalScript}",`);
  console.log(`    slug: "${a.slug}",`);
  console.log(`    era: "${escapeTs(a.era)}",`);
  console.log(`    description:`);
  console.log(`      "${escapeTs(a.description)}",`);
  console.log(`  },`);
}

console.log();
console.log(`// ============================================================`);
console.log(`// Chinese Pipeline Texts (${allTexts.length} texts)`);
console.log(`// ============================================================`);
console.log();

for (const t of allTexts) {
  console.log(`  {`);
  console.log(`    title: "${escapeTs(t.title)}",`);
  console.log(`    titleOriginalScript: "${t.titleOriginalScript}",`);
  console.log(`    slug: "${t.slug}",`);
  console.log(`    languageCode: "zh",`);
  console.log(`    genre: "${t.genre}",`);
  console.log(`    textType: "prose" as const,`);
  console.log(`    authorSlug: "${t.authorSlug}",`);
  console.log(`    description:`);
  console.log(`      "${escapeTs(t.description)}",`);
  console.log(`    sourceUrl: "${escapeTs(t.sourceUrl)}",`);
  console.log(`    processedDir: "${t.processedDir}",`);
  console.log(`    compositionYear: ${t.compositionYear},`);
  console.log(`    compositionEra: "${escapeTs(t.compositionEra)}",`);
  console.log(`  },`);
}

console.log();
console.log(`// Summary: ${allAuthors.length} authors, ${allTexts.length} texts`);
console.log(`// Excluded PARTIAL: ${[...EXCLUDE_TEXT_SLUGS].join(", ")}`);
console.log(`// Deduplicated authors: feng-menglong (already exists), zhang-dai (A takes precedence over C)`);
