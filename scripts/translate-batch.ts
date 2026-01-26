/**
 * Batch translates untranslated chapters using the Claude API.
 *
 * Usage: pnpm translate:batch [--text zhuziyulei|ceremonialis] [--start N] [--end N] [--delay MS]
 *
 * Prerequisites:
 * - Database seeded with chapters (pnpm db:seed)
 * - DEEPSEEK_API_KEY set in environment
 * - DATABASE_URL set in environment
 * - A system user exists in the database (created automatically if needed)
 *
 * The script creates translation versions attributed to the "system" user.
 * These are marked as AI-generated initial translations for human review.
 */

import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, isNull, asc, desc, gte, lte } from "drizzle-orm";
import OpenAI from "openai";
import * as schema from "../src/server/db/schema";
import { buildTranslationPrompt } from "../src/server/translation/prompts";

// ============================================================
// Configuration
// ============================================================

// Load .env.local manually (last DATABASE_URL wins, matching dotenv behavior)
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

const DEFAULT_DELAY_MS = 3000;
const MODEL = "deepseek-chat";

// ============================================================
// Text-specific post-processing fixes
// ============================================================

/**
 * Apply text-specific fixes to translated content.
 * This handles known issues where the model leaves characters untranslated.
 */
function applyTextSpecificFixes(textSlug: string, paragraphs: { index: number; text: string }[]): { index: number; text: string }[] {
  if (textSlug === "dongzhou-lieguo-zhi") {
    return paragraphs.map((p) => ({
      ...p,
      text: p.text
        // Fix incomplete transliterations for 左儒 (Zuo Ru)
        .replace(/Zuo儒/g, "Zuo Ru")
        .replace(/左儒/g, "Zuo Ru")
        // Add other known fixes for this text as discovered
    }));
  }
  return paragraphs;
}

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

// Language-specific limits: Chinese is very dense (1 char ≈ 2-4 English words),
// Greek/Latin are closer to English character density.
const MAX_CHARS_BY_LANG: Record<string, number> = {
  zh: 1500,   // Chinese: extremely dense
  grc: 6000,  // Greek: moderate density
  la: 6000,   // Latin: similar to Greek
};
const DEFAULT_MAX_CHARS = 3000;
const BATCH_DELAY_MS = 2000;

function chunkParagraphs(paragraphs: Paragraph[], sourceLanguage: string): Paragraph[][] {
  const maxChars = MAX_CHARS_BY_LANG[sourceLanguage] ?? DEFAULT_MAX_CHARS;
  const chunks: Paragraph[][] = [];
  let current: Paragraph[] = [];
  let currentChars = 0;

  for (const p of paragraphs) {
    if (current.length > 0 && currentChars + p.text.length > maxChars) {
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
 * Common issues: truncated output, unescaped quotes, missing brackets.
 */
function repairAndParseJson(jsonStr: string): unknown[] {
  let str = jsonStr.trim();

  // If it doesn't start with [, try to find the array start
  const arrayStart = str.indexOf("[");
  if (arrayStart > 0) {
    str = str.substring(arrayStart);
  }

  // If truncated (no closing ]), try to close it
  if (!str.endsWith("]")) {
    // Find the last complete object (ends with })
    const lastBrace = str.lastIndexOf("}");
    if (lastBrace > 0) {
      str = str.substring(0, lastBrace + 1) + "]";
    }
  }

  // Try parsing after basic fixes
  try {
    const result = JSON.parse(str);
    if (Array.isArray(result)) return result;
  } catch {
    // Continue with more aggressive repair
  }

  // Try fixing unescaped newlines and quotes within string values
  // Replace literal newlines in values with \n
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
    // Last resort: extract objects individually using regex
  }

  // Last resort: extract {index: N, text: "..."} objects with regex
  const objects: unknown[] = [];
  const objectPattern = /\{\s*"index"\s*:\s*(\d+)\s*,\s*"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let match;
  while ((match = objectPattern.exec(jsonStr)) !== null) {
    objects.push({ index: parseInt(match[1]), text: match[2].replace(/\\n/g, "\n").replace(/\\"/g, '"') });
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

  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  // Extract text content from response
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No text response from DeepSeek");
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
    // Attempt JSON repair for common LLM issues
    raw = repairAndParseJson(jsonStr);
  }

  // Validate structure
  if (!Array.isArray(raw)) {
    throw new Error("Response is not an array");
  }

  // Normalize: coerce string indices to numbers, handle minor format variations
  const parsed: Paragraph[] = raw.map((item: any) => {
    const index = typeof item.index === "string" ? parseInt(item.index, 10) : Math.floor(Number(item.index));
    const text = String(item.text ?? "");
    return { index: isNaN(index) ? -1 : index, text };
  });

  // Validate: ensure output matches input indices
  const expectedIndices = paragraphs.map((p) => p.index);

  // If the AI returned the correct number of paragraphs with matching indices, use as-is
  if (
    parsed.length === paragraphs.length &&
    parsed.every((p, i) => p.index === expectedIndices[i])
  ) {
    return parsed;
  }

  // Otherwise, realign: group by closest expected index and concatenate
  const result: Paragraph[] = expectedIndices.map((idx) => ({ index: idx, text: "" }));

  for (const p of parsed) {
    if (p.index < 0 || !p.text.trim()) continue;
    // Find the closest expected index
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

/**
 * Translate a batch with robust retry logic:
 * 1. Try up to 3 times with increasing delays
 * 2. If still failing, split the batch in half and retry each half
 * 3. If a single paragraph still fails, mark it as untranslatable
 */
async function translateBatchWithRetry(
  paragraphs: Paragraph[],
  sourceLanguage: string,
  batchNum: number,
  totalBatches: number,
  depth: number = 0
): Promise<{ results: Paragraph[]; failed: number }> {
  const MAX_RETRIES = 3;
  const label = totalBatches > 1 ? `    batch ${batchNum}/${totalBatches}` : "    batch 1/1";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await translateBatch(paragraphs, sourceLanguage);
      process.stdout.write(`${label} (${result.length} paragraphs)\n`);
      return { results: result, failed: 0 };
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const delay = BATCH_DELAY_MS * (attempt + 1);
        process.stdout.write(`${label} attempt ${attempt} failed, retrying in ${delay}ms...\n`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed — try splitting the batch
  if (paragraphs.length > 1 && depth < 3) {
    const mid = Math.ceil(paragraphs.length / 2);
    const firstHalf = paragraphs.slice(0, mid);
    const secondHalf = paragraphs.slice(mid);

    process.stdout.write(`${label} splitting batch (${paragraphs.length} → ${firstHalf.length}+${secondHalf.length})\n`);

    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    const r1 = await translateBatchWithRetry(firstHalf, sourceLanguage, batchNum, totalBatches, depth + 1);
    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    const r2 = await translateBatchWithRetry(secondHalf, sourceLanguage, batchNum, totalBatches, depth + 1);

    return { results: [...r1.results, ...r2.results], failed: r1.failed + r2.failed };
  }

  // Single paragraph that still fails — return placeholder
  process.stdout.write(`${label} FAILED (${paragraphs.length} paragraphs skipped)\n`);
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
  textSlug: string
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

  if (existingTranslation?.currentVersionId) {
    console.log(
      `  [skip] Chapter ${chapter.chapterNumber}: already translated`
    );
    return false;
  }

  try {
    const chunks = chunkParagraphs(sourceContent.paragraphs, sourceLanguage);
    const translated: Paragraph[] = [];
    let failedParagraphs = 0;

    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
      const batchResult = await translateBatchWithRetry(chunks[i], sourceLanguage, i + 1, chunks.length);
      translated.push(...batchResult.results);
      failedParagraphs += batchResult.failed;
    }

    if (translated.length === 0) {
      console.log(`  [err]  Chapter ${chapter.chapterNumber}: all batches failed`);
      return false;
    }

    if (failedParagraphs > 0) {
      process.stdout.write(`    ⚠ ${failedParagraphs} paragraphs could not be translated\n`);
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

    // Apply text-specific post-processing fixes
    const fixedTranslation = applyTextSpecificFixes(textSlug, translated);

    // Create version
    const [version] = await db
      .insert(schema.translationVersions)
      .values({
        translationId: translation.id,
        versionNumber: 1,
        content: { paragraphs: fixedTranslation },
        authorId: systemUserId,
        editSummary: "AI-generated initial translation (DeepSeek V3)",
      })
      .returning();

    // Update head
    await db
      .update(schema.translations)
      .set({ currentVersionId: version.id, updatedAt: new Date() })
      .where(eq(schema.translations.id, translation.id));

    console.log(
      `  [done] Chapter ${chapter.chapterNumber}: ${translated.length} paragraphs translated`
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

  console.log("=== Batch Translation ===\n");
  console.log(`Model: ${MODEL}`);
  console.log(`Delay: ${delay}ms between requests`);
  if (retranslate) {
    console.log(`Mode: RETRANSLATE (existing translations will be replaced)`);
  }
  console.log();

  const systemUserId = await getOrCreateSystemUser();

  // Get texts to translate
  let textsToProcess = await db.query.texts.findMany({
    with: { language: true },
  });

  if (textSlug) {
    textsToProcess = textsToProcess.filter((t) => t.slug === textSlug);
    if (textsToProcess.length === 0) {
      console.error(`Text not found: ${textSlug}`);
      await client.end();
      process.exit(1);
    }
  }

  let totalTranslated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const text of textsToProcess) {
    // Determine prompt variant based on language and genre
    let promptLang = text.language.code;
    let usingSpecialPrompt = false;

    // Chinese literary/historical texts use zh-literary prompt
    const isLiteraryChinese = text.language.code === "zh" && (text.genre === "literature" || text.genre === "history");
    if (isLiteraryChinese) {
      promptLang = "zh-literary";
      usingSpecialPrompt = true;
    }

    // 19th-century Italian literature uses it-literary-19c prompt
    const isLiteraryItalian = text.language.code === "it" && text.genre === "literature";
    if (isLiteraryItalian) {
      promptLang = "it-literary-19c";
      usingSpecialPrompt = true;
    }

    if (usingSpecialPrompt) {
      console.log(`\n--- ${text.title} (${text.language.code}, genre: ${text.genre}, using ${promptLang} prompt) ---\n`);
    } else {
      console.log(`\n--- ${text.title} (${text.language.code}, genre: ${text.genre || "none"}) ---\n`);
    }

    // Build query conditions
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

      // If retranslate mode, delete existing translations first
      if (retranslate) {
        const existingTranslation = await db.query.translations.findFirst({
          where: eq(schema.translations.chapterId, chapter.id),
        });
        if (existingTranslation) {
          // Delete all versions first (due to foreign key constraints)
          await db
            .delete(schema.translationVersions)
            .where(eq(schema.translationVersions.translationId, existingTranslation.id));
          // Delete the translation record
          await db
            .delete(schema.translations)
            .where(eq(schema.translations.id, existingTranslation.id));
          console.log(`  [del]  Chapter ${chapter.chapterNumber}: removed existing translation`);
        }
      }

      const success = await translateChapter(
        chapter,
        promptLang,
        systemUserId,
        text.slug
      );

      if (success) {
        totalTranslated++;
      } else {
        // Distinguish between skip and error (logged in translateChapter)
        totalSkipped++;
      }

      // Delay between API calls (skip delay for skipped chapters)
      if (success && i < chapters.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(
    `Translated: ${totalTranslated}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`
  );

  await client.end();
}

main().catch((err) => {
  console.error("Batch translation failed:", err);
  client.end().then(() => process.exit(1));
});
