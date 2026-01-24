/**
 * Editorial Clarification Pass for Nandikkalambakam translations.
 *
 * Reads all v2 translations from the database, applies editorial glossing
 * of Tamil terms (English + [transliteration] on first occurrence),
 * fixes remaining issues (Kanchukan, cultural glosses), and writes
 * as v3 TranslationVersions.
 *
 * Usage: pnpm tsx scripts/editorial-clarify-nandikkalambakam.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, asc } from "drizzle-orm";
import * as schema from "../src/server/db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

const TEXT_ID = 20; // nandikkalambakam

// ============================================================
// Glossary: Tamil terms to gloss on FIRST occurrence only
// Key = pattern to match, Value = { replacement, used: boolean }
// ============================================================

interface GlossEntry {
  pattern: RegExp;
  replacement: string;
  used: boolean;
}

function createGlossary(): GlossEntry[] {
  return [
    // Musical/cultural terms
    { pattern: /\bManmatha\b/, replacement: "Manmatha, the god of love,", used: false },
    { pattern: /\bAiravata\b/, replacement: "Airavata, Indra's celestial elephant,", used: false },
    { pattern: /\bKaandhaaram\b/, replacement: "the Kaandhaaram mode [a musical raga]", used: false },
    { pattern: /\byaazh\b/i, replacement: "lyre [yaazh]", used: false },
    { pattern: /\bkonrai\b/, replacement: "golden shower [konrai]", used: false },
    { pattern: /\berukkam\b/, replacement: "milkweed [erukkam]", used: false },
    { pattern: /\bpunnai\b/, replacement: "mast-tree [punnai]", used: false },
    { pattern: /\bpichchi\b/, replacement: "jasmine [pichchi]", used: false },
    { pattern: /\bchampak\b/, replacement: "magnolia [champak]", used: false },
    { pattern: /\bkuravam\b/, replacement: "bottle-flower [kuravam]", used: false },
    { pattern: /\bkuvalai\b/, replacement: "blue water-lily [kuvalai]", used: false },
    { pattern: /\bmullai\b/, replacement: "jasmine [mullai]", used: false },
    { pattern: /\bVengai\b/, replacement: "Indian kino [vengai]", used: false },
    // Flora used as beauty simile
    { pattern: /\bthondai fruit\b/, replacement: "ivy gourd [thondai] fruit", used: false },
    { pattern: /\bthondai garland\b/, replacement: "garland of ivy gourd flowers [thondai]", used: false },
    // Geography
    { pattern: /\bPonni\b/, replacement: "the Ponni (Kaveri river)", used: false },
    { pattern: /\bVengadam\b/, replacement: "Vengadam (the sacred Tirupati hills)", used: false },
    { pattern: /\bVenkatam\b/, replacement: "Venkatam (the sacred Tirupati hills)", used: false },
    { pattern: /\bMallai\b(?!\s*,)(?!\s*\()/, replacement: "Mallai (Mamallapuram)", used: false },
    { pattern: /\bMayilai\b(?!\s*\()/, replacement: "Mayilai (Mylapore)", used: false },
    { pattern: /\bKanchi\b(?!\s*,)(?!\s*\()(?! Naadu)/, replacement: "Kanchi (Kanchipuram)", used: false },
    // Social roles
    { pattern: /\bpaaNan\b/i, replacement: "minstrel [paanan]", used: false },
    { pattern: /\bPaaNan\b/, replacement: "Minstrel [paanan]", used: false },
    // Political formulas
    { pattern: /\bmadal-riding\b/, replacement: "madal-riding (a desperate love-protest on a palmyra-stalk horse)", used: false },
    { pattern: /\bpalm-leaf scroll \[of madal-riding\]/, replacement: "palm-leaf scroll of madal-riding (a desperate public love-protest)", used: false },
    // Mythological
    { pattern: /\bManodayan\b/, replacement: "Manodayan (Pride of Elephants)", used: false },
    { pattern: /\bMaanodayan\b/, replacement: "Maanodayan (Pride of Elephants)", used: false },
    { pattern: /\bMaaravel\b/, replacement: "Maaravel (Kama, the god of love)", used: false },
    { pattern: /\bmakaras\b/, replacement: "makaras (mythical sea-creatures)", used: false },
    // Royal titles
    { pattern: /\bVidelvidugu\b/, replacement: "Videlvidugu (the Unyielding One)", used: false },
    { pattern: /\bManaparan\b/, replacement: "Manaparan (the Beloved One)", used: false },
    // Verse forms (add English on first use after bracket)
    { pattern: /\[Taravu\]/, replacement: "[Taravu - base verse]", used: false },
    { pattern: /\[Taazhisai\]/, replacement: "[Taazhisai - linked refrain]", used: false },
    { pattern: /\[Aragam\]/, replacement: "[Aragam - ascending verse]", used: false },
    { pattern: /\[Ambotharangam\]/, replacement: "[Ambotharangam - wave verse]", used: false },
    { pattern: /\[Thanicchol\]/, replacement: "[Thanicchol - pivot word]", used: false },
    { pattern: /\[Suritagam\]/, replacement: "[Suritagam - flowing conclusion]", used: false },
    { pattern: /\[Kaappu\]/, replacement: "[Kaappu - invocatory verse]", used: false },
    // Kali Yuga reference
    { pattern: /\bKali age\b/, replacement: "Kali age (the dark age of decline)", used: false },
    // Animals
    { pattern: /\bYali\b/, replacement: "Yali (a mythical lion-elephant beast)", used: false },
    // Plants
    { pattern: /\btulasi\b/, replacement: "sacred basil [tulasi]", used: false },
    { pattern: /\bkovai\b/, replacement: "garland-poem [kovai]", used: false },
  ];
}

// ============================================================
// Special fixes that are not glossary-based
// ============================================================

function applySpecialFixes(text: string, chapterNumber: number): string {
  // Fix "Kanchukan" in chapter 28 — should be an epithet of Nandi
  if (chapterNumber === 28) {
    text = text.replace(
      /The heroic, brave, and mighty shining Kanchukan, who won the battle of Veriyalur/,
      "The heroic, brave, and mightily shining one of Kanchi [i.e., King Nandi], who won the battle of Veriyalur"
    );
  }

  // Fix "Husband of Ganga" in chapter 29 — religious epithet
  if (chapterNumber === 29) {
    text = text.replace(
      /the Husband of Ganga/,
      "he who is like Shiva, husband of the Ganga"
    );
  }

  // Fix "Thesabandari" in chapter 88
  if (chapterNumber === 88) {
    text = text.replace(
      /Thesabandari/,
      "Thesabandari (Lord of the Land)"
    );
  }

  // Fix "Ekambalavaanan" in chapter 112
  if (chapterNumber === 112) {
    text = text.replace(
      /Ekambalavaanan/,
      "Ekambalavaanan (Lord of the Mango-Tree Temple)"
    );
  }

  // Fix "Nandi Varathungan" in chapter 90
  if (chapterNumber === 90) {
    text = text.replace(
      /Nandi Varathungan/,
      "Nandi Varathungan (Nandi the Boon-Giver)"
    );
  }

  // Fix "King of Seti" in chapter 10 — clarify dynasty
  if (chapterNumber === 10) {
    text = text.replace(
      /the King of Seti from Mallai/,
      "the king of the Seti [Chedi] dynasty, lord of Mallai (Mamallapuram)"
    );
  }

  // Fix "the Mayan" in chapter 61
  if (chapterNumber === 61) {
    text = text.replace(
      /The Mayan, whose sole righteous scepter/,
      "The lord of the artisan's city, whose sole righteous scepter"
    );
  }

  // Standardize "Sempiyar [Cholas], Thennar [Pandyas], and Cherar" when those appear
  text = text.replace(/Sempiyar \[Cholas\]/g, "the Cholas");
  text = text.replace(/Thennar \[Pandyas\]/g, "the Pandyas");
  text = text.replace(/\bSempiyar\b/g, "the Cholas [Sempiyar]");
  text = text.replace(/\bThennar\b(?! \[)/, "the Pandyas [Thennar]");

  // Fix double [Pallava] glosses after first use: only first "Kadava [Pallava]" should have the gloss
  // This is handled by the glossary system below

  return text;
}

// ============================================================
// Apply glossary to a single text
// ============================================================

function applyGlossary(text: string, glossary: GlossEntry[]): string {
  for (const entry of glossary) {
    if (!entry.used && entry.pattern.test(text)) {
      text = text.replace(entry.pattern, entry.replacement);
      entry.used = true;
    }
  }
  return text;
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log("=== Editorial Clarification Pass: Nandikkalambakam ===\n");

  // Get system user
  const systemUser = await db.query.users.findFirst({
    where: eq(schema.users.username, "system"),
  });
  if (!systemUser) {
    console.error("System user not found");
    process.exit(1);
  }
  const systemUserId = systemUser.id;

  // Get all chapters with current translations
  const chapters = await db.query.chapters.findMany({
    where: eq(schema.chapters.textId, TEXT_ID),
    orderBy: asc(schema.chapters.chapterNumber),
  });

  console.log(`Found ${chapters.length} chapters\n`);

  // Create a single glossary that persists across all poems
  // This ensures first-use-only glossing across the entire text
  const glossary = createGlossary();

  let processed = 0;
  let errors = 0;

  for (const chapter of chapters) {
    // Get current translation
    const translation = await db.query.translations.findFirst({
      where: eq(schema.translations.chapterId, chapter.id),
    });

    if (!translation || !translation.currentVersionId) {
      console.log(`  [skip] Ch ${chapter.chapterNumber}: no translation`);
      continue;
    }

    const currentVersion = await db.query.translationVersions.findFirst({
      where: eq(schema.translationVersions.id, translation.currentVersionId),
    });

    if (!currentVersion) {
      console.log(`  [skip] Ch ${chapter.chapterNumber}: no version found`);
      continue;
    }

    try {
      const content = currentVersion.content as { paragraphs: { index: number; text: string }[] };
      if (!content || !content.paragraphs || content.paragraphs.length === 0) {
        console.log(`  [skip] Ch ${chapter.chapterNumber}: empty content`);
        continue;
      }

      // Apply editorial clarifications to each paragraph
      const clarifiedParagraphs = content.paragraphs.map((p) => {
        let text = p.text;

        // Apply special fixes for this chapter
        text = applySpecialFixes(text, chapter.chapterNumber);

        // Apply glossary (first-use glossing across entire text)
        text = applyGlossary(text, glossary);

        return { index: p.index, text };
      });

      // Check if anything actually changed
      const originalText = content.paragraphs.map(p => p.text).join("\n");
      const clarifiedText = clarifiedParagraphs.map(p => p.text).join("\n");

      if (originalText === clarifiedText) {
        // No changes needed for this chapter
        continue;
      }

      // Create new version (v3)
      const nextVersionNumber = currentVersion.versionNumber + 1;

      const [newVersion] = await db
        .insert(schema.translationVersions)
        .values({
          translationId: translation.id,
          versionNumber: nextVersionNumber,
          content: { paragraphs: clarifiedParagraphs },
          authorId: systemUserId,
          editSummary: "Editorial clarification: English glosses for Tamil terms on first use, cultural context notes, epithet corrections",
          previousVersionId: currentVersion.id,
        })
        .returning();

      // Update head pointer
      await db
        .update(schema.translations)
        .set({ currentVersionId: newVersion.id, updatedAt: new Date() })
        .where(eq(schema.translations.id, translation.id));

      processed++;
      console.log(`  [done] Ch ${chapter.chapterNumber}: v${nextVersionNumber} (editorial clarification)`);
    } catch (err) {
      errors++;
      console.error(`  [err]  Ch ${chapter.chapterNumber}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Clarified: ${processed}, Errors: ${errors}`);
  console.log(`Glossary terms used: ${glossary.filter(g => g.used).length}/${glossary.length}`);
  console.log(`\nTerms glossed:`);
  for (const entry of glossary) {
    if (entry.used) {
      console.log(`  - ${entry.replacement}`);
    }
  }

  await client.end();
}

main().catch((err) => {
  console.error("Editorial clarification failed:", err);
  client.end().then(() => process.exit(1));
});
