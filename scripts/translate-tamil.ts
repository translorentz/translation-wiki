/**
 * Batch translates Tamil (Sangam) texts using the Google Gemini API.
 *
 * Usage: pnpm tsx scripts/translate-tamil.ts --text <slug> [--start N] [--end N] [--delay MS]
 *
 * Prerequisites:
 * - Database seeded with Tamil chapters (pnpm db:seed)
 * - GEMINI_API_KEY set in environment
 * - DATABASE_URL set in environment
 * - A system user exists in the database (created automatically if needed)
 *
 * Uses Gemini 2.5 Flash for Tamil-to-English translation.
 * Tamil Sangam poetry requires a model with strong Tamil language understanding;
 * Gemini models are superior to DeepSeek for this task.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, asc, gte, lte } from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import { buildTranslationPrompt } from "../src/server/translation/prompts";
import { getGeminiClient } from "../src/server/translation/gemini-client";

// ============================================================
// Configuration
// ============================================================

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is required.");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });
const ai = getGeminiClient();

const DEFAULT_DELAY_MS = 3000;
const MODEL = "gemini-2.5-flash";
const MAX_CHARS_PER_BATCH = 2500;
const BATCH_DELAY_MS = 2000;

// ============================================================
// Argument parsing
// ============================================================

function parseArgs() {
  const args = process.argv.slice(2);
  let textSlug: string | undefined;
  let start: number | undefined;
  let end: number | undefined;
  let delay = DEFAULT_DELAY_MS;
  let retranslate = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--text" && args[i + 1]) textSlug = args[i + 1];
    if (args[i] === "--start" && args[i + 1]) start = parseInt(args[i + 1]);
    if (args[i] === "--end" && args[i + 1]) end = parseInt(args[i + 1]);
    if (args[i] === "--delay" && args[i + 1]) delay = parseInt(args[i + 1]);
    if (args[i] === "--retranslate") retranslate = true;
  }

  return { textSlug, start, end, delay, retranslate };
}

// ============================================================
// System user management
// ============================================================

async function getOrCreateSystemUser(): Promise<number> {
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.username, "system"),
  });

  if (existing) return existing.id;

  const [user] = await db
    .insert(schema.users)
    .values({
      email: "system@translation-wiki.local",
      username: "system",
      passwordHash: "SYSTEM_USER_NO_LOGIN",
      role: "admin",
    })
    .returning({ id: schema.users.id });

  console.log("Created system user (id:", user.id, ")");
  return user.id;
}

// ============================================================
// Translation logic
// ============================================================

interface Paragraph {
  index: number;
  text: string;
}

function chunkParagraphs(paragraphs: Paragraph[]): Paragraph[][] {
  const chunks: Paragraph[][] = [];
  let current: Paragraph[] = [];
  let currentChars = 0;

  for (const p of paragraphs) {
    if (current.length > 0 && currentChars + p.text.length > MAX_CHARS_PER_BATCH) {
      chunks.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(p);
    currentChars += p.text.length;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

/**
 * Attempts to repair malformed JSON from LLM output.
 */
function repairAndParseJson(jsonStr: string): unknown[] {
  let str = jsonStr.trim();

  const arrayStart = str.indexOf("[");
  if (arrayStart > 0) {
    str = str.substring(arrayStart);
  }

  if (!str.endsWith("]")) {
    const lastBrace = str.lastIndexOf("}");
    if (lastBrace > 0) {
      str = str.substring(0, lastBrace + 1) + "]";
    }
  }

  try {
    const result = JSON.parse(str);
    if (Array.isArray(result)) return result;
  } catch {
    // Continue with more aggressive repair
  }

  str = str.replace(/(?<="text"\s*:\s*")([\s\S]*?)(?="[\s,}\]])/g, (match) => {
    return match
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
  });

  try {
    const result = JSON.parse(str);
    if (Array.isArray(result)) return result;
  } catch {
    // Last resort
  }

  const objects: unknown[] = [];
  const objectPattern = /\{\s*"index"\s*:\s*(\d+)\s*,\s*"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let match;
  while ((match = objectPattern.exec(jsonStr)) !== null) {
    objects.push({
      index: parseInt(match[1]),
      text: match[2].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
    });
  }

  if (objects.length > 0) return objects;

  throw new Error(`Failed to parse or repair JSON response (length: ${jsonStr.length})`);
}

async function translateBatch(
  paragraphs: Paragraph[],
  sourceLanguage: string
): Promise<Paragraph[]> {
  const { system, user } = buildTranslationPrompt({
    sourceLanguage,
    paragraphs,
  });

  const response = await ai.models.generateContent({
    model: MODEL,
    config: {
      systemInstruction: system,
      temperature: 0.3,
      maxOutputTokens: 16384,
    },
    contents: user,
  });

  const content = response.text;
  if (!content) {
    throw new Error("No text response from Gemini");
  }

  // Parse JSON from response (may be wrapped in markdown code block)
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let raw: unknown[];
  try {
    raw = JSON.parse(jsonStr);
  } catch {
    raw = repairAndParseJson(jsonStr);
  }

  if (!Array.isArray(raw)) {
    throw new Error("Response is not an array");
  }

  const parsed: Paragraph[] = raw.map((item: any) => {
    const index =
      typeof item.index === "string"
        ? parseInt(item.index, 10)
        : Math.floor(Number(item.index));
    const text = String(item.text ?? "");
    return { index: isNaN(index) ? -1 : index, text };
  });

  const expectedIndices = paragraphs.map((p) => p.index);

  if (
    parsed.length === paragraphs.length &&
    parsed.every((p, i) => p.index === expectedIndices[i])
  ) {
    return parsed;
  }

  // Realign
  const result: Paragraph[] = expectedIndices.map((idx) => ({ index: idx, text: "" }));

  for (const p of parsed) {
    if (p.index < 0 || !p.text.trim()) continue;
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < expectedIndices.length; i++) {
      const dist = Math.abs(p.index - expectedIndices[i]);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (result[bestIdx].text) {
      result[bestIdx].text += "\n\n" + p.text;
    } else {
      result[bestIdx].text = p.text;
    }
  }

  return result;
}

async function translateBatchWithRetry(
  paragraphs: Paragraph[],
  sourceLanguage: string,
  batchNum: number,
  totalBatches: number,
  depth: number = 0
): Promise<{ results: Paragraph[]; failed: number }> {
  const MAX_RETRIES = 3;
  const label =
    totalBatches > 1 ? `    batch ${batchNum}/${totalBatches}` : "    batch 1/1";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await translateBatch(paragraphs, sourceLanguage);
      process.stdout.write(`${label} (${result.length} paragraphs)\n`);
      return { results: result, failed: 0 };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_RETRIES) {
        const delay = BATCH_DELAY_MS * (attempt + 1);
        process.stdout.write(
          `${label} attempt ${attempt} failed (${msg}), retrying in ${delay}ms...\n`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed — try splitting
  if (paragraphs.length > 1 && depth < 3) {
    const mid = Math.ceil(paragraphs.length / 2);
    const firstHalf = paragraphs.slice(0, mid);
    const secondHalf = paragraphs.slice(mid);

    process.stdout.write(
      `${label} splitting batch (${paragraphs.length} → ${firstHalf.length}+${secondHalf.length})\n`
    );

    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    const r1 = await translateBatchWithRetry(
      firstHalf,
      sourceLanguage,
      batchNum,
      totalBatches,
      depth + 1
    );
    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    const r2 = await translateBatchWithRetry(
      secondHalf,
      sourceLanguage,
      batchNum,
      totalBatches,
      depth + 1
    );

    return {
      results: [...r1.results, ...r2.results],
      failed: r1.failed + r2.failed,
    };
  }

  // Single paragraph that still fails — return placeholder
  process.stdout.write(
    `${label} FAILED (${paragraphs.length} paragraphs skipped)\n`
  );
  const placeholders: Paragraph[] = paragraphs.map((p) => ({
    index: p.index,
    text: "[Translation pending — automated translation failed for this paragraph]",
  }));
  return { results: placeholders, failed: paragraphs.length };
}

async function translateChapter(
  chapter: {
    id: number;
    chapterNumber: number;
    title: string | null;
    sourceContent: unknown;
    textId: number;
  },
  sourceLanguage: string,
  systemUserId: number,
  delay: number,
  retranslate: boolean = false
): Promise<boolean> {
  const sourceContent = chapter.sourceContent as {
    paragraphs: Paragraph[];
  } | null;

  if (!sourceContent || sourceContent.paragraphs.length === 0) {
    console.log(`  [skip] Chapter ${chapter.chapterNumber}: no source content`);
    return false;
  }

  // Check if translation already exists
  const existingTranslation = await db.query.translations.findFirst({
    where: eq(schema.translations.chapterId, chapter.id),
  });

  if (existingTranslation?.currentVersionId && !retranslate) {
    console.log(
      `  [skip] Chapter ${chapter.chapterNumber}: already translated`
    );
    return false;
  }

  try {
    const chunks = chunkParagraphs(sourceContent.paragraphs);
    const translated: Paragraph[] = [];
    let failedParagraphs = 0;

    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
      const batchResult = await translateBatchWithRetry(
        chunks[i],
        sourceLanguage,
        i + 1,
        chunks.length
      );
      translated.push(...batchResult.results);
      failedParagraphs += batchResult.failed;
    }

    if (translated.length === 0) {
      console.log(
        `  [err]  Chapter ${chapter.chapterNumber}: all batches failed`
      );
      return false;
    }

    if (failedParagraphs > 0) {
      process.stdout.write(
        `    ⚠ ${failedParagraphs} paragraphs could not be translated\n`
      );
    }

    // Create or get translation record
    let translation = existingTranslation;
    if (!translation) {
      const [newT] = await db
        .insert(schema.translations)
        .values({ chapterId: chapter.id })
        .returning();
      translation = newT;
    }

    // Determine next version number
    let nextVersionNumber = 1;
    let previousVersionId: number | undefined;
    if (existingTranslation?.currentVersionId) {
      // Fetch the current version to determine the next number
      const currentVersion = await db.query.translationVersions.findFirst({
        where: eq(schema.translationVersions.id, existingTranslation.currentVersionId),
      });
      if (currentVersion) {
        nextVersionNumber = currentVersion.versionNumber + 1;
        previousVersionId = currentVersion.id;
      }
    }

    const editSummary = retranslate
      ? `AI retranslation v${nextVersionNumber} (Gemini 2.5 Flash, improved Tamil prompt)`
      : "AI-generated initial translation (Gemini 2.5 Flash)";

    // Create version
    const [version] = await db
      .insert(schema.translationVersions)
      .values({
        translationId: translation.id,
        versionNumber: nextVersionNumber,
        content: { paragraphs: translated },
        authorId: systemUserId,
        editSummary,
        previousVersionId: previousVersionId ?? null,
      })
      .returning();

    // Update head pointer
    await db
      .update(schema.translations)
      .set({ currentVersionId: version.id, updatedAt: new Date() })
      .where(eq(schema.translations.id, translation.id));

    console.log(
      `  [done] Chapter ${chapter.chapterNumber}: ${translated.length} paragraphs (v${nextVersionNumber})`
    );
    return true;
  } catch (err) {
    console.error(
      `  [err]  Chapter ${chapter.chapterNumber}:`,
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  const { textSlug, start, end, delay, retranslate } = parseArgs();

  console.log("=== Tamil Batch Translation (Gemini) ===\n");
  console.log(`Model: ${MODEL}`);
  console.log(`Batch size: ${MAX_CHARS_PER_BATCH} chars`);
  console.log(`Delay: ${delay}ms between chapters`);
  if (retranslate) console.log(`Mode: RETRANSLATE (creating new versions)`);
  console.log();

  const systemUserId = await getOrCreateSystemUser();

  // Get Tamil texts (language code 'ta')
  let textsToProcess = await db.query.texts.findMany({
    with: { language: true },
  });

  // Filter to Tamil only
  textsToProcess = textsToProcess.filter((t) => t.language.code === "ta");

  if (textSlug) {
    textsToProcess = textsToProcess.filter((t) => t.slug === textSlug);
  }

  if (textsToProcess.length === 0) {
    console.error(
      textSlug
        ? `Tamil text not found: ${textSlug}`
        : "No Tamil texts found in database. Seed Tamil texts first."
    );
    await client.end();
    process.exit(1);
  }

  let totalTranslated = 0;
  let totalSkipped = 0;

  for (const text of textsToProcess) {
    console.log(`\n--- ${text.title} (${text.language.code}) ---\n`);

    const conditions = [eq(schema.chapters.textId, text.id)];
    if (start !== undefined) {
      conditions.push(gte(schema.chapters.chapterNumber, start));
    }
    if (end !== undefined) {
      conditions.push(lte(schema.chapters.chapterNumber, end));
    }

    const chapters = await db.query.chapters.findMany({
      where: and(...conditions),
      orderBy: asc(schema.chapters.chapterNumber),
    });

    console.log(`Found ${chapters.length} chapters to process\n`);

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const success = await translateChapter(
        chapter,
        text.language.code,
        systemUserId,
        delay,
        retranslate
      );

      if (success) {
        totalTranslated++;
        // Delay between chapters
        if (i < chapters.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } else {
        totalSkipped++;
      }
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Translated: ${totalTranslated}, Skipped: ${totalSkipped}`);

  await client.end();
}

main().catch((err) => {
  console.error("Tamil translation failed:", err);
  client.end().then(() => process.exit(1));
});
