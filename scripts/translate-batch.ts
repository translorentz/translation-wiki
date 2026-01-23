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

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, isNull, asc, desc, gte, lte } from "drizzle-orm";
import OpenAI from "openai";
import * as schema from "../src/server/db/schema";
import { buildTranslationPrompt } from "../src/server/translation/prompts";

// ============================================================
// Configuration
// ============================================================

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
// Argument parsing
// ============================================================

function parseArgs() {
  const args = process.argv.slice(2);
  let textSlug: string | undefined;
  let start: number | undefined;
  let end: number | undefined;
  let delay = DEFAULT_DELAY_MS;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--text" && args[i + 1]) textSlug = args[i + 1];
    if (args[i] === "--start" && args[i + 1]) start = parseInt(args[i + 1]);
    if (args[i] === "--end" && args[i + 1]) end = parseInt(args[i + 1]);
    if (args[i] === "--delay" && args[i + 1]) delay = parseInt(args[i + 1]);
  }

  return { textSlug, start, end, delay };
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
  zh: 1500,   // Classical Chinese: extremely dense
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

async function translateChapter(
  chapter: {
    id: number;
    chapterNumber: number;
    title: string | null;
    sourceContent: unknown;
    textId: number;
  },
  sourceLanguage: string,
  systemUserId: number
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

    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
      let batchResult: Paragraph[];
      try {
        batchResult = await translateBatch(chunks[i], sourceLanguage);
      } catch (err) {
        // Retry once after a delay
        process.stdout.write(
          `    batch ${i + 1}/${chunks.length} failed, retrying...\n`
        );
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS * 2));
        batchResult = await translateBatch(chunks[i], sourceLanguage);
      }
      translated.push(...batchResult);
      if (chunks.length > 1) {
        process.stdout.write(
          `    batch ${i + 1}/${chunks.length} (${batchResult.length} paragraphs)\n`
        );
      }
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

    // Create version
    const [version] = await db
      .insert(schema.translationVersions)
      .values({
        translationId: translation.id,
        versionNumber: 1,
        content: { paragraphs: translated },
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
  const { textSlug, start, end, delay } = parseArgs();

  console.log("=== Batch Translation ===\n");
  console.log(`Model: ${MODEL}`);
  console.log(`Delay: ${delay}ms between requests\n`);

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
    console.log(`\n--- ${text.title} (${text.language.code}) ---\n`);

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
      const success = await translateChapter(
        chapter,
        text.language.code,
        systemUserId
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
