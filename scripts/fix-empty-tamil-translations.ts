/**
 * Fix empty translation paragraphs in Tamil texts.
 *
 * For each empty paragraph:
 * 1. Check if the source paragraph has content
 * 2. If source is empty: note as intentional stanza break
 * 3. If source has content: translate it and update translation_versions
 *
 * Usage: pnpm tsx scripts/fix-empty-tamil-translations.ts [--dry-run]
 */

import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, sql } from "drizzle-orm";
import OpenAI from "openai";
import * as schema from "../src/server/db/schema";

// ============================================================
// Configuration
// ============================================================

const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const dbMatch = line.match(/^DATABASE_URL=(.+)$/);
    if (dbMatch) {
      process.env.DATABASE_URL = dbMatch[1].replace(/^['"]|['"]$/g, "");
    }
    const dsMatch = line.match(/^DEEPSEEK_API_KEY=(.+)$/);
    if (dsMatch) {
      process.env.DEEPSEEK_API_KEY = dsMatch[1].replace(/^['"]|['"]$/g, "");
    }
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
  console.error("DEEPSEEK_API_KEY is required.");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });
const openai = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });

const MODEL = "deepseek-chat";

// Empty paragraphs to investigate
const EMPTY_PARAGRAPHS = [
  { textSlug: "bharata-senapathiyam", chapterSlug: "chapter-1", paraIndices: [6] },
  { textSlug: "moovarul", chapterSlug: "chapter-1", paraIndices: [138, 308] },
  { textSlug: "moovarul", chapterSlug: "chapter-2", paraIndices: [46, 77, 113, 142, 235] },
  { textSlug: "moovarul", chapterSlug: "chapter-3", paraIndices: [117] },
  { textSlug: "nalavenba", chapterSlug: "chapter-2", paraIndices: [40] },
  { textSlug: "takka-yaaga-parani", chapterSlug: "chapter-1", paraIndices: [5] },
  { textSlug: "takka-yaaga-parani", chapterSlug: "chapter-4", paraIndices: [35] },
  { textSlug: "takka-yaaga-parani", chapterSlug: "chapter-7", paraIndices: [4] },
];

// Tamil translation prompt
const TAMIL_PROMPT = `You are translating classical Tamil poetry to British English.
Use British spelling and conventions (colour, honour, recognise, travelled, grey, etc.).

Guidelines:
- Produce fluent, readable British English while preserving poetic beauty
- Translate Tamil names and places with transliteration
- Preserve devotional and literary imagery
- Maintain verse structure where possible

Translate the following Tamil text(s) to English.

CRITICAL: Return ONLY a valid JSON array of translation objects.
Each object must have:
- "index": the paragraph index (integer)
- "text": the English translation (string)

Example response format:
[{"index": 0, "text": "The translation goes here."}]

Do not include any text before or after the JSON array.`;

interface Paragraph {
  index: number;
  text: string;
}

async function translateParagraph(
  sourceText: string,
  paraIndex: number
): Promise<string> {
  const userMessage = `Translate paragraph ${paraIndex}:

${sourceText}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: TAMIL_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content?.trim() || "";

  // Parse JSON response
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0].text;
    }
    throw new Error("Unexpected JSON format");
  } catch {
    // Try to extract translation from non-JSON response
    return content.replace(/^\[?\{?"index":\s*\d+,\s*"text":\s*"?/, "").replace(/"?\}?\]?$/, "");
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  console.log("=".repeat(60));
  console.log("Tamil Empty Paragraph Fix Script");
  console.log("=".repeat(60));
  if (dryRun) console.log("DRY RUN MODE - no changes will be made\n");

  const results = {
    sourceEmpty: [] as { text: string; chapter: string; index: number }[],
    needsTranslation: [] as { text: string; chapter: string; index: number; sourceText: string }[],
    fixed: [] as { text: string; chapter: string; index: number; translation: string }[],
    errors: [] as { text: string; chapter: string; index: number; error: string }[],
  };

  for (const item of EMPTY_PARAGRAPHS) {
    console.log(`\n--- Processing ${item.textSlug}/${item.chapterSlug} ---`);

    // Get the text and chapter
    const text = await db.query.texts.findFirst({
      where: eq(schema.texts.slug, item.textSlug),
    });

    if (!text) {
      console.log(`  ERROR: Text not found: ${item.textSlug}`);
      for (const idx of item.paraIndices) {
        results.errors.push({ text: item.textSlug, chapter: item.chapterSlug, index: idx, error: "Text not found" });
      }
      continue;
    }

    const chapter = await db.query.chapters.findFirst({
      where: and(
        eq(schema.chapters.textId, text.id),
        eq(schema.chapters.slug, item.chapterSlug)
      ),
    });

    if (!chapter) {
      console.log(`  ERROR: Chapter not found: ${item.chapterSlug}`);
      for (const idx of item.paraIndices) {
        results.errors.push({ text: item.textSlug, chapter: item.chapterSlug, index: idx, error: "Chapter not found" });
      }
      continue;
    }

    // Get source content - handle both array and {paragraphs: [...]} format
    const rawSourceContent = chapter.sourceContent as Paragraph[] | { paragraphs: Paragraph[] } | null;
    if (!rawSourceContent) {
      console.log(`  ERROR: No source content for chapter`);
      for (const idx of item.paraIndices) {
        results.errors.push({ text: item.textSlug, chapter: item.chapterSlug, index: idx, error: "No source content" });
      }
      continue;
    }
    const sourceContent = Array.isArray(rawSourceContent) ? rawSourceContent : rawSourceContent.paragraphs;

    // Get the translation and current version
    const translation = await db.query.translations.findFirst({
      where: eq(schema.translations.chapterId, chapter.id),
    });

    if (!translation || !translation.currentVersionId) {
      console.log(`  ERROR: No translation found for chapter`);
      for (const idx of item.paraIndices) {
        results.errors.push({ text: item.textSlug, chapter: item.chapterSlug, index: idx, error: "No translation found" });
      }
      continue;
    }

    const currentVersion = await db.query.translationVersions.findFirst({
      where: eq(schema.translationVersions.id, translation.currentVersionId),
    });

    if (!currentVersion) {
      console.log(`  ERROR: Translation version not found`);
      for (const idx of item.paraIndices) {
        results.errors.push({ text: item.textSlug, chapter: item.chapterSlug, index: idx, error: "Translation version not found" });
      }
      continue;
    }

    // Handle both array format and {paragraphs: [...]} format
    const rawContent = currentVersion.content as Paragraph[] | { paragraphs: Paragraph[] };
    const translationContent = Array.isArray(rawContent) ? rawContent : rawContent.paragraphs;
    let contentModified = false;
    const updatedContent = [...translationContent];

    for (const paraIndex of item.paraIndices) {
      console.log(`  Checking paragraph ${paraIndex}...`);

      // Find source paragraph
      const sourcePara = sourceContent.find((p) => p.index === paraIndex);
      const translationPara = translationContent.find((p) => p.index === paraIndex);

      if (!sourcePara) {
        console.log(`    Source paragraph not found at index ${paraIndex}`);
        results.errors.push({ text: item.textSlug, chapter: item.chapterSlug, index: paraIndex, error: "Source paragraph not found" });
        continue;
      }

      // Check if source is empty or whitespace
      const sourceText = sourcePara.text?.trim() || "";
      const translationText = translationPara?.text?.trim() || "";

      if (sourceText === "") {
        console.log(`    Source is EMPTY - intentional stanza break`);
        results.sourceEmpty.push({ text: item.textSlug, chapter: item.chapterSlug, index: paraIndex });
        continue;
      }

      if (translationText !== "") {
        console.log(`    Translation already has content: "${translationText.slice(0, 50)}..."`);
        continue;
      }

      // Source has content, translation is empty - needs translation
      console.log(`    Source has content (${sourceText.length} chars), translation is empty`);
      console.log(`    Source: "${sourceText.slice(0, 80)}..."`);
      results.needsTranslation.push({ text: item.textSlug, chapter: item.chapterSlug, index: paraIndex, sourceText });

      if (!dryRun) {
        try {
          console.log(`    Translating...`);
          const newTranslation = await translateParagraph(sourceText, paraIndex);
          console.log(`    Translation: "${newTranslation.slice(0, 80)}..."`);

          // Update the content array
          const translationIdx = updatedContent.findIndex((p) => p.index === paraIndex);
          if (translationIdx >= 0) {
            updatedContent[translationIdx] = { index: paraIndex, text: newTranslation };
          } else {
            updatedContent.push({ index: paraIndex, text: newTranslation });
            updatedContent.sort((a, b) => a.index - b.index);
          }
          contentModified = true;

          results.fixed.push({ text: item.textSlug, chapter: item.chapterSlug, index: paraIndex, translation: newTranslation });

          // Rate limiting
          await new Promise((r) => setTimeout(r, 1000));
        } catch (error) {
          console.log(`    ERROR translating: ${error}`);
          results.errors.push({ text: item.textSlug, chapter: item.chapterSlug, index: paraIndex, error: String(error) });
        }
      }
    }

    // Update the translation version if content was modified
    if (contentModified && !dryRun) {
      console.log(`  Updating translation version...`);

      // Get the system user
      const systemUser = await db.query.users.findFirst({
        where: eq(schema.users.username, "system"),
      });

      if (!systemUser) {
        console.log(`  ERROR: System user not found`);
        continue;
      }

      // Create a new version with the fixes - preserve original format
      const newContent = Array.isArray(rawContent) ? updatedContent : { paragraphs: updatedContent };
      const [newVersion] = await db
        .insert(schema.translationVersions)
        .values({
          translationId: translation.id,
          versionNumber: currentVersion.versionNumber + 1,
          content: newContent,
          authorId: systemUser.id,
          editSummary: "Fixed empty translation paragraphs",
          previousVersionId: currentVersion.id,
        })
        .returning({ id: schema.translationVersions.id });

      // Update translation to point to new version
      await db
        .update(schema.translations)
        .set({
          currentVersionId: newVersion.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.translations.id, translation.id));

      console.log(`  Created new translation version ${currentVersion.versionNumber + 1}`);
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));

  console.log(`\nSource Empty (intentional stanza breaks): ${results.sourceEmpty.length}`);
  for (const item of results.sourceEmpty) {
    console.log(`  - ${item.text}/${item.chapter} para[${item.index}]`);
  }

  console.log(`\nNeeded Translation: ${results.needsTranslation.length}`);
  for (const item of results.needsTranslation) {
    console.log(`  - ${item.text}/${item.chapter} para[${item.index}]: "${item.sourceText.slice(0, 50)}..."`);
  }

  console.log(`\nFixed: ${results.fixed.length}`);
  for (const item of results.fixed) {
    console.log(`  - ${item.text}/${item.chapter} para[${item.index}]: "${item.translation.slice(0, 50)}..."`);
  }

  console.log(`\nErrors: ${results.errors.length}`);
  for (const item of results.errors) {
    console.log(`  - ${item.text}/${item.chapter} para[${item.index}]: ${item.error}`);
  }

  await client.end();
  console.log("\nDone!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
