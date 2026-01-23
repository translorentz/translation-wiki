/**
 * Seeds the database with languages, authors, texts, and chapters
 * from the processed JSON files.
 *
 * Usage: pnpm db:seed
 *
 * Prerequisites:
 * - PostgreSQL running (docker compose up -d)
 * - Migrations applied (pnpm db:push or pnpm db:migrate)
 * - Text processing done (pnpm process:texts)
 *
 * This script is idempotent — re-running it will skip existing records.
 */

import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "../src/server/db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is required.");
  console.error("Copy .env.example to .env.local and configure it.");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

// ============================================================
// Seed data definitions
// ============================================================

const LANGUAGES = [
  { code: "zh", name: "Classical Chinese", displayName: "文言文" },
  { code: "grc", name: "Ancient Greek", displayName: "Ἀρχαία Ἑλληνική" },
  { code: "la", name: "Latin", displayName: "Lingua Latina" },
  { code: "en", name: "English", displayName: "English" },
] as const;

const AUTHORS = [
  {
    name: "Zhu Xi",
    nameOriginalScript: "朱熹",
    slug: "zhu-xi",
    era: "Song Dynasty (1130–1200)",
    description:
      "Neo-Confucian philosopher whose recorded sayings form the Zhu Zi Yu Lei.",
  },
  {
    name: "Constantine VII Porphyrogennetos",
    nameOriginalScript: "Κωνσταντῖνος Ζʹ ὁ Πορφυρογέννητος",
    slug: "constantine-vii",
    era: "Byzantine Empire (905–959)",
    description:
      "Byzantine emperor and scholar who compiled De Ceremoniis, a treatise on imperial court protocol.",
  },
  {
    name: "Wang Yangming",
    nameOriginalScript: "王陽明",
    slug: "wang-yangming",
    era: "Ming Dynasty (1472–1529)",
    description:
      "Neo-Confucian philosopher, statesman, and military strategist who developed the philosophy of the unity of knowledge and action and the doctrine of innate moral knowing (良知).",
  },
] as const;

const TEXTS = [
  {
    title: "Zhu Zi Yu Lei",
    titleOriginalScript: "朱子語類",
    slug: "zhuziyulei",
    languageCode: "zh",
    authorSlug: "zhu-xi",
    description:
      "Classified Conversations of Master Zhu — a massive compendium of 140 chapters recording the philosophical discussions of Zhu Xi with his students.",
    sourceUrl: "https://ctext.org/zhuzi-yulei",
    processedDir: "data/processed/zhuziyulei",
    compositionYear: 1270,
    compositionEra: "咸淳六年, Southern Song",
  },
  {
    title: "De Ceremoniis Aulae Byzantinae",
    titleOriginalScript: "Περὶ τῆς Βασιλείου Τάξεως",
    slug: "ceremonialis",
    languageCode: "grc",
    authorSlug: "constantine-vii",
    description:
      "On the Ceremonies of the Byzantine Court — a detailed account of the ceremonies and protocol of the Byzantine imperial court, compiled in the 10th century.",
    sourceUrl: "https://archive.org/details/bub_gb_OFpFAAAAYAAJ",
    processedDir: "data/processed/ceremonialis",
    compositionYear: 959,
    compositionEra: "Reign of Constantine VII, Byzantine Empire",
  },
  {
    title: "Chuan Xi Lu",
    titleOriginalScript: "傳習錄",
    slug: "chuanxilu",
    languageCode: "zh",
    authorSlug: "wang-yangming",
    description:
      "Instructions for Practical Living — a collection of recorded conversations, letters, and essays by Wang Yangming, compiled by his disciples. The foundational text of the Yangming school of Neo-Confucianism.",
    sourceUrl: "https://ctext.org/chuan-xi-lu",
    processedDir: "data/processed/chuanxilu",
    compositionYear: 1518,
    compositionEra: "正德十三年, Ming Dynasty",
  },
] as const;

// ============================================================
// Seed functions
// ============================================================

async function seedLanguages(): Promise<Map<string, number>> {
  console.log("Seeding languages...");
  const codeToId = new Map<string, number>();

  for (const lang of LANGUAGES) {
    // Check if already exists
    const existing = await db.query.languages.findFirst({
      where: eq(schema.languages.code, lang.code),
    });

    if (existing) {
      codeToId.set(lang.code, existing.id);
      console.log(`  [skip] ${lang.code} — ${lang.name}`);
    } else {
      const [inserted] = await db
        .insert(schema.languages)
        .values(lang)
        .returning({ id: schema.languages.id });
      codeToId.set(lang.code, inserted.id);
      console.log(`  [add]  ${lang.code} — ${lang.name}`);
    }
  }

  return codeToId;
}

async function seedAuthors(): Promise<Map<string, number>> {
  console.log("\nSeeding authors...");
  const slugToId = new Map<string, number>();

  for (const author of AUTHORS) {
    const existing = await db.query.authors.findFirst({
      where: eq(schema.authors.slug, author.slug),
    });

    if (existing) {
      slugToId.set(author.slug, existing.id);
      console.log(`  [skip] ${author.name}`);
    } else {
      const [inserted] = await db
        .insert(schema.authors)
        .values(author)
        .returning({ id: schema.authors.id });
      slugToId.set(author.slug, inserted.id);
      console.log(`  [add]  ${author.name}`);
    }
  }

  return slugToId;
}

async function seedTexts(
  languageIds: Map<string, number>,
  authorIds: Map<string, number>
): Promise<Map<string, number>> {
  console.log("\nSeeding texts...");
  const slugToId = new Map<string, number>();

  for (const text of TEXTS) {
    const languageId = languageIds.get(text.languageCode);
    const authorId = authorIds.get(text.authorSlug);

    if (!languageId || !authorId) {
      console.error(`  [err]  Missing language or author for ${text.slug}`);
      continue;
    }

    const existing = await db.query.texts.findFirst({
      where: and(
        eq(schema.texts.slug, text.slug),
        eq(schema.texts.languageId, languageId)
      ),
    });

    if (existing) {
      slugToId.set(text.slug, existing.id);
      console.log(`  [skip] ${text.title}`);
    } else {
      const [inserted] = await db
        .insert(schema.texts)
        .values({
          title: text.title,
          titleOriginalScript: text.titleOriginalScript,
          slug: text.slug,
          languageId,
          authorId,
          description: text.description,
          sourceUrl: text.sourceUrl,
          totalChapters: 0, // Updated after chapters are inserted
          compositionYear: text.compositionYear,
          compositionEra: text.compositionEra,
        })
        .returning({ id: schema.texts.id });
      slugToId.set(text.slug, inserted.id);
      console.log(`  [add]  ${text.title}`);
    }
  }

  return slugToId;
}

async function seedChapters(textIds: Map<string, number>): Promise<void> {
  console.log("\nSeeding chapters...");

  for (const text of TEXTS) {
    const textId = textIds.get(text.slug);
    if (!textId) {
      console.error(`  [err]  No text ID for ${text.slug}`);
      continue;
    }

    const processedDir = path.resolve(text.processedDir);
    if (!fs.existsSync(processedDir)) {
      console.warn(`  [warn] Processed dir not found: ${processedDir}`);
      console.warn(`         Run 'pnpm process:texts --text ${text.slug}' first.`);
      continue;
    }

    const files = fs
      .readdirSync(processedDir)
      .filter((f) => f.startsWith("chapter-") && f.endsWith(".json") && !f.includes("-translation"))
      .sort();

    if (files.length === 0) {
      console.warn(`  [warn] No chapter files in ${processedDir}`);
      continue;
    }

    console.log(`\n  ${text.title}: ${files.length} chapters`);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      const chapter: ProcessedChapter = JSON.parse(
        fs.readFileSync(path.join(processedDir, file), "utf-8")
      );

      // Check if chapter already exists
      const existing = await db.query.chapters.findFirst({
        where: and(
          eq(schema.chapters.textId, textId),
          eq(schema.chapters.chapterNumber, chapter.chapterNumber)
        ),
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      const chapterSlug = `chapter-${chapter.chapterNumber}`;

      await db.insert(schema.chapters).values({
        textId,
        chapterNumber: chapter.chapterNumber,
        slug: chapterSlug,
        title: chapter.title,
        sourceContent: chapter.sourceContent,
        ordering: chapter.chapterNumber,
      });

      insertedCount++;
    }

    // Update totalChapters on the text record
    await db
      .update(schema.texts)
      .set({ totalChapters: files.length })
      .where(eq(schema.texts.id, textId));

    console.log(`    Inserted: ${insertedCount}, Skipped: ${skippedCount}`);
  }
}

async function getOrCreateSystemUser(): Promise<number> {
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.username, "ai-translator"),
  });
  if (existing) return existing.id;

  const [inserted] = await db
    .insert(schema.users)
    .values({
      email: "ai@deltoi.org",
      username: "ai-translator",
      passwordHash: "---none---",
      role: "editor",
    })
    .returning({ id: schema.users.id });
  console.log("  [add]  System user: ai-translator");
  return inserted.id;
}

async function seedTranslations(textIds: Map<string, number>): Promise<void> {
  console.log("\nSeeding translations...");
  const systemUserId = await getOrCreateSystemUser();

  for (const text of TEXTS) {
    const textId = textIds.get(text.slug);
    if (!textId) continue;

    const processedDir = path.resolve(text.processedDir);
    if (!fs.existsSync(processedDir)) continue;

    const translationFiles = fs
      .readdirSync(processedDir)
      .filter((f) => f.includes("-translation.json"))
      .sort();

    if (translationFiles.length === 0) continue;

    console.log(`\n  ${text.title}: ${translationFiles.length} translation files`);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const file of translationFiles) {
      // Extract chapter number from filename (e.g., "chapter-1-translation.json" → 1)
      const match = file.match(/chapter-(\d+)-translation\.json/);
      if (!match) continue;
      const chapterNumber = parseInt(match[1]);

      // Find the chapter record
      const chapter = await db.query.chapters.findFirst({
        where: and(
          eq(schema.chapters.textId, textId),
          eq(schema.chapters.chapterNumber, chapterNumber)
        ),
      });
      if (!chapter) {
        console.warn(`    [warn] Chapter ${chapterNumber} not found for ${text.slug}`);
        continue;
      }

      // Check if translation already exists for this chapter
      const existingTranslation = await db.query.translations.findFirst({
        where: eq(schema.translations.chapterId, chapter.id),
      });
      if (existingTranslation) {
        skippedCount++;
        continue;
      }

      // Read translation content
      const translationContent = JSON.parse(
        fs.readFileSync(path.join(processedDir, file), "utf-8")
      );

      // Create translation record
      const [translation] = await db
        .insert(schema.translations)
        .values({ chapterId: chapter.id })
        .returning({ id: schema.translations.id });

      // Create version record
      const [version] = await db
        .insert(schema.translationVersions)
        .values({
          translationId: translation.id,
          versionNumber: 1,
          content: translationContent,
          authorId: systemUserId,
          editSummary: "Initial AI-generated translation",
        })
        .returning({ id: schema.translationVersions.id });

      // Update translation to point to current version
      await db
        .update(schema.translations)
        .set({ currentVersionId: version.id })
        .where(eq(schema.translations.id, translation.id));

      insertedCount++;
    }

    console.log(`    Inserted: ${insertedCount}, Skipped: ${skippedCount}`);
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log("=== Database Seed ===\n");

  const languageIds = await seedLanguages();
  const authorIds = await seedAuthors();
  const textIds = await seedTexts(languageIds, authorIds);
  await seedChapters(textIds);
  await seedTranslations(textIds);

  console.log("\n=== Seed complete ===");

  // Close the connection
  await client.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  client.end().then(() => process.exit(1));
});
