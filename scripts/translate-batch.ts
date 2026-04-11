/**
 * Batch translates untranslated chapters using the Claude API.
 *
 * Usage: pnpm translate:batch [--text zhuziyulei|ceremonialis] [--start N] [--end N] [--delay MS] [--target-language en|zh|es] [--model deepseek-chat|deepseek-reasoner]
 *
 * Target languages:
 *   en  British English (default)
 *   zh  Simplified Chinese
 *   es  Spanish — hard-locked to deepseek-chat; register auto-resolved
 *       (Mexican for literature/poetry, Español Neutro for everything else).
 *       Forbidden: es → es (Spanish source texts are never translated to Spanish).
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
const DEFAULT_MODEL = "deepseek-chat";

// Texts that require deepseek-reasoner for more careful, defensible translation
const REASONER_SLUGS = new Set([
  "zhouyi-neichuan-fali",  // Wang Fuzhi's Yijing methodology — dense philosophical argumentation
  "zhouyi-daxiang-jie",    // Wang Fuzhi's Great Image commentary — philosophical application of hexagrams
  "zhuangzi-tong",         // Wang Fuzhi's Zhuangzi commentary — dense philosophical argumentation with Confucian reinterpretation
  "tuibei-tu",             // Tang dynasty prophetic verse — cryptic 4-char/7-char verse requires careful interpretation
]);

let MODEL = DEFAULT_MODEL;

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
  let targetLanguage = "en";
  let modelOverride: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--text" && args[i + 1]) textSlug = args[i + 1];
    if (args[i] === "--start" && args[i + 1]) start = parseInt(args[i + 1]);
    if (args[i] === "--end" && args[i + 1]) end = parseInt(args[i + 1]);
    if (args[i] === "--delay" && args[i + 1]) delay = parseInt(args[i + 1]);
    if (args[i] === "--retranslate") retranslate = true;
    if (args[i] === "--target-language" && args[i + 1]) targetLanguage = args[i + 1];
    if (args[i] === "--model" && args[i + 1]) modelOverride = args[i + 1];
  }

  return { textSlug, start, end, delay, retranslate, targetLanguage, modelOverride };
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
// REDUCED grc/la from 6000 to 2500 to prevent LLM truncation on long paragraphs.
const MAX_CHARS_BY_LANG: Record<string, number> = {
  zh: 1500,   // Chinese: extremely dense
  grc: 2500,  // Greek: reduced to prevent truncation
  la: 2500,   // Latin: reduced to prevent truncation
  hu: 1200,   // Hungarian: dialogue-heavy prose causes truncation at 2500 chars per batch
  ar: 2000,   // Arabic: moderately dense, some long rhetorical paragraphs
};
const DEFAULT_MAX_CHARS = 2500;
const BATCH_DELAY_MS = 2000;

// Very long paragraphs (>1500 chars) should be processed alone to prevent truncation
const SOLO_PARAGRAPH_THRESHOLD = 1500;

function chunkParagraphs(paragraphs: Paragraph[], sourceLanguage: string): Paragraph[][] {
  const maxChars = MAX_CHARS_BY_LANG[sourceLanguage] ?? DEFAULT_MAX_CHARS;
  const chunks: Paragraph[][] = [];
  let current: Paragraph[] = [];
  let currentChars = 0;

  for (const p of paragraphs) {
    // Guard against null/undefined text fields (OCR processing artifacts)
    if (!p.text) {
      p.text = "";
    }
    // Very long paragraphs get their own batch to prevent truncation
    if (p.text.length > SOLO_PARAGRAPH_THRESHOLD) {
      if (current.length > 0) {
        chunks.push(current);
        current = [];
        currentChars = 0;
      }
      chunks.push([p]); // Solo batch for long paragraph
      continue;
    }

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

/**
 * Parse and validate the LLM response for a batch of paragraphs.
 * Returns the parsed paragraphs, or throws if the response is unusable.
 * Does NOT attempt realignment — caller decides what to do on mismatch.
 */
function parseTranslationResponse(
  content: string,
  expectedIndices: number[]
): { parsed: Paragraph[]; exactMatch: boolean } {
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
    const index = typeof item.index === "string" ? parseInt(item.index, 10) : Math.floor(Number(item.index));
    const text = String(item.text ?? "");
    return { index: isNaN(index) ? -1 : index, text };
  });

  const exactMatch =
    parsed.length === expectedIndices.length &&
    parsed.every((p, i) => p.index === expectedIndices[i]);

  return { parsed, exactMatch };
}

/**
 * Best-effort realignment when the LLM returns a different number of paragraphs.
 * Maps each returned paragraph to the closest expected index.
 */
function realignParagraphs(
  parsed: Paragraph[],
  expectedIndices: number[]
): Paragraph[] {
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

// ============================================================
// Split-translate-rejoin for very long paragraphs
// ============================================================

/**
 * Split a single long paragraph's text into sentence-level sub-chunks.
 * The sub-chunks are translated individually, then the translations are
 * concatenated back into a single paragraph. This avoids modifying source
 * content in the database (which would break existing English translations).
 *
 * Sentence detection is language-aware:
 * - Chinese/Japanese: split on 。！？
 * - Western languages: split on . ! ? followed by whitespace or end-of-string
 * - Latin/Greek: split on . ! ? (same as Western)
 */
function splitTextIntoSubChunks(text: string, sourceLanguage: string, maxChunkChars: number): string[] {
  // Choose sentence-end pattern by language family
  const isCJK = ["zh", "ja", "ko"].includes(sourceLanguage);
  const sentenceEndPattern = isCJK
    ? /([。！？」』）\)]+)/g        // CJK sentence-ending punctuation (including closing quotes/brackets)
    : /([.!?]+[\"\'\)\]»]*)\s+/g;   // Western sentence-ending punctuation + trailing space

  // Split into sentences while preserving the delimiters
  const sentences: string[] = [];
  let lastIndex = 0;

  if (isCJK) {
    // For CJK: split after sentence-ending punctuation
    const parts = text.split(sentenceEndPattern);
    let buffer = "";
    for (let i = 0; i < parts.length; i++) {
      buffer += parts[i];
      // After a delimiter match (odd index), flush the buffer as a sentence
      if (i % 2 === 1 && buffer.trim()) {
        sentences.push(buffer.trim());
        buffer = "";
      }
    }
    if (buffer.trim()) sentences.push(buffer.trim());
  } else {
    // For Western: split at sentence boundaries (period/!/? followed by space)
    const pattern = /([.!?]+[\"\'\)\]»]*)\s+/g;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const end = match.index + match[1].length;
      sentences.push(text.slice(lastIndex, end).trim());
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      sentences.push(text.slice(lastIndex).trim());
    }
  }

  // If sentence splitting failed (e.g. no punctuation found), fall back to rough character-based splitting
  if (sentences.length <= 1) {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += maxChunkChars) {
      chunks.push(text.slice(i, i + maxChunkChars));
    }
    return chunks;
  }

  // Group sentences into sub-chunks that stay under maxChunkChars
  const chunks: string[] = [];
  let currentChunk = "";
  for (const sentence of sentences) {
    if (currentChunk && (currentChunk.length + sentence.length + 1) > maxChunkChars) {
      chunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      currentChunk = currentChunk ? currentChunk + (isCJK ? "" : " ") + sentence : sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  return chunks;
}

/**
 * Translate a single long paragraph by splitting its text into sub-chunks,
 * translating each sub-chunk independently, and joining the results.
 * The original paragraph index is preserved — source content is NOT modified.
 */
async function translateLongParagraphViaSplitting(
  paragraph: Paragraph,
  sourceLanguage: string,
  targetLanguage: string,
  textType: string | null = null,
  genre: string | null = null
): Promise<Paragraph> {
  // Use a SMALLER chunk size than normal batching — we're here because the
  // paragraph was too long for normal translation, so be more aggressive
  const SPLIT_MAX_CHARS = 800;
  const subChunks = splitTextIntoSubChunks(paragraph.text, sourceLanguage, SPLIT_MAX_CHARS);

  process.stdout.write(`      [split-translate] Para ${paragraph.index}: ${paragraph.text.length} chars → ${subChunks.length} sub-chunks\n`);

  const translatedParts: string[] = [];

  for (let i = 0; i < subChunks.length; i++) {
    // Each sub-chunk is sent as a single paragraph with a temporary index
    const subParagraph: Paragraph = { index: 0, text: subChunks[i] };

    const MAX_SUB_RETRIES = 3;
    let translated = false;

    for (let attempt = 1; attempt <= MAX_SUB_RETRIES; attempt++) {
      try {
        const result = await translateBatch([subParagraph], sourceLanguage, targetLanguage, textType, genre);
        if (result.length > 0 && result[0].text.trim()) {
          translatedParts.push(result[0].text);
          translated = true;
          break;
        }
      } catch (err) {
        if (attempt < MAX_SUB_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS * (attempt + 1)));
        }
      }
    }

    if (!translated) {
      throw new Error(`Sub-chunk ${i + 1}/${subChunks.length} of para ${paragraph.index} failed after ${MAX_SUB_RETRIES} retries`);
    }

    if (i < subChunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // Rejoin: single space for Western languages, no space for CJK
  const isCJK = ["zh", "ja", "ko"].includes(sourceLanguage);
  const isCJKTarget = targetLanguage === "zh";
  const joiner = (isCJK || isCJKTarget) ? "" : " ";

  const joinedText = translatedParts.join(joiner);

  process.stdout.write(`      [split-translate] Para ${paragraph.index}: ${subChunks.length} sub-chunks → ${joinedText.length} chars translated\n`);

  return { index: paragraph.index, text: joinedText };
}

const MISMATCH_MAX_RETRIES = 2;

async function translateBatch(
  paragraphs: Paragraph[],
  sourceLanguage: string,
  targetLanguage: string = "en",
  textType: string | null = null,
  genre: string | null = null
): Promise<Paragraph[]> {
  const expectedIndices = paragraphs.map((p) => p.index);

  for (let attempt = 0; attempt <= MISMATCH_MAX_RETRIES; attempt++) {
    const { system, user } = buildTranslationPrompt({
      sourceLanguage,
      paragraphs,
      targetLanguage,
      textType,
      genre,
    });

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 8192,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No text response from DeepSeek");
    }

    const { parsed, exactMatch } = parseTranslationResponse(content, expectedIndices);

    if (exactMatch) {
      return parsed;
    }

    // Count mismatch — retry if we have attempts left
    if (attempt < MISMATCH_MAX_RETRIES) {
      process.stdout.write(
        `      [mismatch] expected ${expectedIndices.length} paragraphs, got ${parsed.length} — retrying (${attempt + 1}/${MISMATCH_MAX_RETRIES})\n`
      );
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      continue;
    }

    // Final attempt failed — throw error instead of realigning (realignment causes misalignment bugs)
    throw new Error(
      `Paragraph count mismatch after ${MISMATCH_MAX_RETRIES} retries: expected ${expectedIndices.length}, got ${parsed.length}. Refusing to realign.`
    );
  }

  // Unreachable, but TypeScript needs it
  throw new Error("translateBatch: unreachable");
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
  depth: number = 0,
  targetLanguage: string = "en",
  textType: string | null = null,
  genre: string | null = null
): Promise<{ results: Paragraph[]; failed: number }> {
  const MAX_RETRIES = 3;
  const label = totalBatches > 1 ? `    batch ${batchNum}/${totalBatches}` : "    batch 1/1";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await translateBatch(paragraphs, sourceLanguage, targetLanguage, textType, genre);
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
    const r1 = await translateBatchWithRetry(firstHalf, sourceLanguage, batchNum, totalBatches, depth + 1, targetLanguage, textType, genre);
    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    const r2 = await translateBatchWithRetry(secondHalf, sourceLanguage, batchNum, totalBatches, depth + 1, targetLanguage, textType, genre);

    return { results: [...r1.results, ...r2.results], failed: r1.failed + r2.failed };
  }

  // Single paragraph that still fails — try split-translate-rejoin for long paragraphs
  if (paragraphs.length === 1 && paragraphs[0].text.length > 500) {
    try {
      process.stdout.write(`${label} trying split-translate-rejoin for para ${paragraphs[0].index} (${paragraphs[0].text.length} chars)\n`);
      const result = await translateLongParagraphViaSplitting(paragraphs[0], sourceLanguage, targetLanguage, textType, genre);
      return { results: [result], failed: 0 };
    } catch (splitErr) {
      process.stdout.write(`${label} split-translate also failed: ${(splitErr as Error).message}\n`);
    }
  }

  // Truly failed — return placeholder
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
  textSlug: string,
  targetLanguage: string = "en",
  textType: string = "prose",
  genre: string | null = null
): Promise<boolean> {
  const sourceContent = chapter.sourceContent as {
    paragraphs: Paragraph[];
  } | null;

  if (!sourceContent || sourceContent.paragraphs.length === 0) {
    console.log(`  [skip] Chapter ${chapter.chapterNumber}: no source content`);
    return false;
  }

  // Check if translation already exists for this target language
  const existingTranslation = await db.query.translations.findFirst({
    where: and(
      eq(schema.translations.chapterId, chapter.id),
      eq(schema.translations.targetLanguage, targetLanguage)
    ),
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
      const batchResult = await translateBatchWithRetry(chunks[i], sourceLanguage, i + 1, chunks.length, 0, targetLanguage, textType, genre);
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

    // Post-chapter verification: ensure translated paragraph count matches source
    const expectedCount = sourceContent.paragraphs.length;
    if (translated.length !== expectedCount) {
      console.error(
        `  [ALIGN ERROR] Chapter ${chapter.chapterNumber}: source has ${expectedCount} paragraphs but translation has ${translated.length}. Skipping save to prevent misalignment.`
      );
      return false;
    }

    // Verify index alignment
    const indexMismatches = sourceContent.paragraphs.filter(
      (sp, i) => translated[i]?.index !== sp.index
    );
    if (indexMismatches.length > 0) {
      console.error(
        `  [ALIGN ERROR] Chapter ${chapter.chapterNumber}: ${indexMismatches.length} paragraph indices don't match source. Skipping save.`
      );
      return false;
    }

    // SPANISH QUOTE NORMALIZATION — deterministic post-processing to enforce
    // pan-Hispanic RAE conventions (genre-driven):
    //   - Character dialogue in narrative → raya em-dash — (paragraph start)
    //   - Quotations / citations / terms → comillas latinas «...»
    //   - Nested inside raya or «» → curly double ""
    //   - Deeply nested → curly single ''
    //   - NEVER curly "" as PRIMARY (that's English/Chinese style, not Spanish)
    //
    // This normalizer is a safety net for legacy / non-compliant LLM output.
    // It INVERTS the previous (incorrect) normalizer which converted «» → curly "".
    //
    // Rules:
    // - Leave existing «...» alone (already correct for citations)
    // - Leave paragraph-leading — alone (correct literary dialogue marker)
    // - Leave inline —speaker— tags alone
    // - Convert curly "..." / "..." primary → «...» (when not nested inside «»)
    // - Convert Japanese brackets 「...」 / 『...』 → «...»
    // - Convert straight ASCII " pairs → «...»
    // - Preserve apostrophes in contractions (l', d', c'est, it's, o'clock)
    //
    // Applied ONLY when targetLanguage === "es".
    if (targetLanguage === "es") {
      const normalizeQuotes = (input: string): string => {
        let s = input;

        // 1. Japanese corner brackets → «...» (quotations)
        s = s.replace(/「([^」]{0,500})」/g, "\u00ab$1\u00bb");
        s = s.replace(/『([^』]{0,500})』/g, "\u00ab$1\u00bb");
        // Any stragglers (unmatched): best-effort conversion
        s = s.replace(/[「『]/g, "\u00ab").replace(/[」』]/g, "\u00bb");

        // 2. Curly "..." pairs → «...»
        //    Only convert when NOT nested inside existing «...». We do this by
        //    splitting on «»: process each outside-of-guillemets segment, then
        //    reassemble with the inside-of-guillemets segments preserved.
        //
        //    Parse guillemet-bracketed regions first.
        const segments: { inside: boolean; text: string }[] = [];
        {
          let depth = 0;
          let buf = "";
          for (let i = 0; i < s.length; i++) {
            const ch = s[i]!;
            if (ch === "\u00ab") {
              if (depth === 0 && buf.length > 0) {
                segments.push({ inside: false, text: buf });
                buf = "";
              }
              depth++;
              buf += ch;
            } else if (ch === "\u00bb") {
              buf += ch;
              depth--;
              if (depth === 0) {
                segments.push({ inside: true, text: buf });
                buf = "";
              } else if (depth < 0) {
                // Stray close — treat as outside
                depth = 0;
                segments.push({ inside: false, text: buf });
                buf = "";
              }
            } else {
              buf += ch;
            }
          }
          if (buf.length > 0) {
            segments.push({ inside: depth > 0, text: buf });
          }
        }

        // For each outside segment, convert curly "..." pairs → «...».
        // Do NOT touch segments inside «», since curly "" there is legitimate
        // (secondary nesting).
        for (const seg of segments) {
          if (seg.inside) continue;
          // Pair up curly open/close. Use a non-greedy match.
          seg.text = seg.text.replace(
            /\u201C([^\u201C\u201D]{0,1500})\u201D/g,
            "\u00ab$1\u00bb"
          );
          // Any straight ASCII " pairs: toggle (odd=open, even=close → «»)
          // Walk the string and toggle.
          {
            const parts = seg.text.split('"');
            if (parts.length > 1) {
              let out = parts[0]!;
              for (let i = 1; i < parts.length; i++) {
                out += i % 2 === 1 ? "\u00ab" : "\u00bb";
                out += parts[i]!;
              }
              seg.text = out;
            }
          }
        }
        s = segments.map((seg) => seg.text).join("");

        // 3. Straight ASCII single quotes — conservative pass.
        //    Convert ' to curly apostrophe/close-quote ONLY when it is clearly
        //    NOT inside a word (which would indicate a contraction apostrophe
        //    that must be preserved).
        //    Since curly single quotes are the TERTIARY nesting level in
        //    Spanish, they are rare at top level. We toggle them only when
        //    the ' is at a clear quotation position.
        {
          const chars = [...s];
          let open = true;
          for (let i = 0; i < chars.length; i++) {
            if (chars[i] !== "'") continue;
            const prev = i > 0 ? chars[i - 1]! : "";
            const next = i + 1 < chars.length ? chars[i + 1]! : "";
            const prevIsWord = /\w/.test(prev);
            const nextIsWord = /\w/.test(next);
            // Apostrophe: word'word (e.g. d'amour, l'homme, it's, c'est) — preserve
            if (prevIsWord && nextIsWord) continue;
            // Word-final apostrophe (o', 'tis edge case): preserve
            if (prevIsWord && !nextIsWord) continue;
            // Leading apostrophe in a word ('tis, 'twas): preserve
            if (!prevIsWord && nextIsWord && /[a-zA-Z]/.test(next)) continue;
            // Otherwise treat as quotation marker → curly single
            chars[i] = open ? "\u2018" : "\u2019";
            open = !open;
          }
          s = chars.join("");
        }

        return s;
      };
      for (let i = 0; i < translated.length; i++) {
        if (translated[i]?.text) {
          const original = translated[i]!.text;
          const normalized = normalizeQuotes(original);
          if (normalized !== original) {
            translated[i]!.text = normalized;
          }
        }
      }
    }

    // ZH LEAK GUARDRAIL — Hard-coded for Chinese → Spanish translations.
    // Catches the catastrophic failure mode observed on chaozhen-fayuan-chanhui-wen
    // where the worker persisted the source Chinese text as its own Spanish
    // "translation" (ratio 1.00 — every paragraph was untranslated CJK). This
    // guardrail detects untranslated Chinese characters leaking through into
    // Spanish output and refuses the save. Thresholds:
    //   - >10% of paragraphs containing ANY Chinese characters, OR
    //   - >5% of total character count being Chinese
    // Either trips → reject. Legitimate Spanish translations of Chinese texts
    // should contain essentially ZERO Chinese characters (occasional proper
    // noun glosses stay well under these thresholds).
    if (
      targetLanguage === "es" &&
      (sourceLanguage === "zh" || sourceLanguage.startsWith("zh-"))
    ) {
      const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf]/g;
      let leakyParas = 0;
      let totalChineseChars = 0;
      let totalChars = 0;
      for (const para of translated) {
        const text = para?.text ?? "";
        const matches = text.match(chineseRegex) ?? [];
        if (matches.length > 0) leakyParas++;
        totalChineseChars += matches.length;
        totalChars += text.length;
      }
      const paraLeakRate =
        translated.length > 0 ? leakyParas / translated.length : 0;
      const charLeakRate = totalChars > 0 ? totalChineseChars / totalChars : 0;
      if (paraLeakRate > 0.10 || charLeakRate > 0.05) {
        console.error(
          `  [ZH LEAK ERROR] ${textSlug} ch${chapter.chapterNumber}: ${leakyParas}/${translated.length} paragraphs contain Chinese chars (${(paraLeakRate * 100).toFixed(1)}%), char leak rate ${(charLeakRate * 100).toFixed(1)}%`
        );
        console.error(
          `  Skipping save — Chinese source text leaked into Spanish translation.`
        );
        return false;
      }
    }

    // LINEBREAK GUARDRAIL — Hard-coded for poetry/hymn texts (e.g., hymni-ecclesiae)
    // Each stanza's line count in the translation MUST match the source's line count.
    // This catches the most common LLM failure mode: merging/splitting verse lines.
    // Skip for Chinese target: Chinese verse translation conventions don't preserve
    // line-for-line correspondence with non-CJK source languages.
    // Skip linebreak check for bombyx and culamani — translated as prose paragraphs, not verse
    const skipLinebreakCheck = textSlug === "bombyx" || textSlug === "culamani";
    if (textType === "poetry" && targetLanguage !== "zh" && !skipLinebreakCheck) {
      const lineCountMismatches: { index: number; srcLines: number; transLines: number }[] = [];
      for (let i = 0; i < sourceContent.paragraphs.length; i++) {
        const srcLines = sourceContent.paragraphs[i].text.split("\n").length;
        const transLines = translated[i]?.text?.split("\n").length ?? 0;
        // Skip linebreak check for prose paragraphs (1 source line = no verse structure)
        if (srcLines !== transLines && srcLines > 1) {
          lineCountMismatches.push({ index: i, srcLines, transLines });
        }
      }
      if (lineCountMismatches.length > 0) {
        console.error(
          `  [LINEBREAK ERROR] Chapter ${chapter.chapterNumber}: ${lineCountMismatches.length} stanzas have mismatched line counts:`
        );
        for (const lm of lineCountMismatches.slice(0, 5)) {
          console.error(
            `    - Stanza ${lm.index}: source ${lm.srcLines} lines, translation ${lm.transLines} lines`
          );
        }
        if (lineCountMismatches.length > 5) {
          console.error(`    ... and ${lineCountMismatches.length - 5} more`);
        }
        console.error(`  Skipping save to prevent linebreak misalignment.`);
        return false;
      }
    }

    // HEMISTICH SLASH GUARDRAIL — Hard-coded for Persian divan poetry (fa language)
    // Each couplet in the source has a / separating two hemistichs.
    // The translation MUST also contain a / in each line to preserve this structure.
    // This catches the LLM failure mode of translating the couplet as a single sentence
    // without preserving the hemistich division.
    if ((sourceLanguage === "fa" || sourceLanguage === "chg" || sourceLanguage === "chg-babur" || sourceLanguage.startsWith("fa-")) && textType === "poetry") {
      const slashMissing: number[] = [];
      for (let i = 0; i < translated.length; i++) {
        const srcHasSlash = sourceContent.paragraphs[i]?.text?.includes("/");
        const transHasSlash = translated[i]?.text?.includes("/");
        if (srcHasSlash && !transHasSlash) {
          slashMissing.push(i);
        }
      }
      if (slashMissing.length > translated.length * 0.1) {
        // More than 10% of couplets missing slash — reject
        console.error(
          `  [SLASH ERROR] Chapter ${chapter.chapterNumber}: ${slashMissing.length}/${translated.length} couplets missing hemistich / separator`
        );
        console.error(`  First 5 missing: indices ${slashMissing.slice(0, 5).join(", ")}`);
        console.error(`  Skipping save — translation must preserve hemistich structure.`);
        return false;
      } else if (slashMissing.length > 0) {
        console.warn(
          `  [slash warn] Chapter ${chapter.chapterNumber}: ${slashMissing.length} couplets missing / (within tolerance)`
        );
      }
    }

    // Verify content completeness via length ratio check
    // Translations should be at least MIN_RATIO of source length to catch truncation
    // When targeting Chinese, ratios are lower because Chinese is more compact than English
    const MIN_LENGTH_RATIO_EN: Record<string, number> = {
      zh: 0.3,        // Chinese to English — lowered from 1.5; compact translations are legitimate
      "zh-literary": 0.3,
      "zh-science": 0.3,
      "zh-biji": 0.3,
      "zh-dongpo-yi-zhuan": 0.3,
      "zh-zhouyi-neichuan-fali": 0.3,
      "zh-zhouyi-daxiang-jie": 0.3,
      "zh-zhuangzi-tong": 0.3,
      "zh-su-shen-liang-fang": 0.3,
      "zh-tan-huo-dian-xue": 0.3,
      "zh-shengji-zonglu": 0.3,
      "zh-joseon-sillok": 0.3,
      "zh-poetry": 0.3, // Chinese poetry with dense annotations (phonetic glosses, variant readings) compresses in English
      grc: 0.5,       // Greek to English is roughly similar, but allow for compression
      "grc-history": 0.5,
      "grc-gregory": 0.5,
      la: 0.5,        // Latin similar to Greek
      "la-hymn": 0.3, // Latin hymns — short stanzas, linebreak check handles alignment
      fa: 0.5,        // Persian epic poetry (Shahnameh) — similar to English in length
      "fa-prose": 0.3, // Persian reform prose — long paragraphs, allow compression
      sr: 0.3,        // Serbian literary prose allows moderate compression
      hu: 0.3,        // Hungarian literary prose/dialogue compresses significantly into English
      "ru-literary": 0.15,  // Russian dialogue-heavy prose: short replies compress significantly
      "ru-tipikon": 0.3,   // Liturgical commentary: short transitional paragraphs compress legitimately
      "sr-scholarly": 0.1, // OCR-damaged Serbian text — garbled source produces short translations
      "xcl-literature": 0.1, // OCR-damaged Classical Armenian — garbled source produces short translations
      "te-prose": 0.3,  // Telugu prose (agglutinative morphology) — English translations may be shorter
      ta: 0,            // Tamil poetry — large chapters (100-227 stanzas); DeepSeek drops a few stanzas per run. Accept and fix post-hoc.
      ar: 0,            // Arabic prose/history — large chapters; DeepSeek may drop 1-2 paras. Accept and fix post-hoc.
      default: 0.5,
    };
    // When translating TO Chinese: Chinese uses far fewer characters than European source languages
    // Italian/French/German → Chinese can compress 5-8x, so ratio 0.12-0.18 is normal
    // Only flag truly truncated output (ratio < 0.1)
    // When translating TO Chinese: DeepSeek occasionally produces empty translations
    // for individual paragraphs (ratio 0.00). The chapter-level truncation check should
    // not reject an entire chapter (30+ paragraphs) because one paragraph is empty.
    // Set all thresholds to 0 to disable this check for zh target translations.
    // Quality will be verified post-hoc.
    const MIN_LENGTH_RATIO_ZH: Record<string, number> = {
      default: 0,
    };
    // When translating TO Spanish: Spanish is generally more verbose than English,
    // so ratios are calibrated higher than MIN_LENGTH_RATIO_EN. Sources where English
    // already expands massively (CJK, Greek, Latin) still need lower floors because
    // Spanish and English are proportionally similar relative to those compact sources.
    // Romance peers (fr, it, en) run near 0.8+ because output is roughly 1:1 to 1.2:1.
    const MIN_LENGTH_RATIO_ES: Record<string, number> = {
      zh: 0.4, // Chinese → Spanish: massive expansion
      "zh-literary": 0.4,
      "zh-science": 0.4,
      "zh-biji": 0.4,
      "zh-poetry": 0.3,
      "zh-joseon-sillok": 0.4,
      grc: 0.5,
      "grc-history": 0.5,
      "grc-gregory": 0.5,
      "grc-philosophy": 0.5,
      la: 0.5,
      "la-hymn": 0.4,
      fa: 0.6, // Persian poetry has compressed meter
      "fa-prose": 0.5,
      chg: 0.5,
      "chg-babur": 0.5,
      ja: 0.4,
      ru: 0.4,
      "ru-literary": 0.4, // Dialogue-heavy compresses
      "ru-tipikon": 0.4,
      ar: 0.5,
      "ar-sufi": 0.5,
      "ar-fiqh": 0.5,
      fr: 0.8, // Romance peer
      "fr-literary": 0.8,
      "fr-poetry": 0.6,
      "fr-metropolitan": 0.8,
      "fr-metropolitan-poetry": 0.6,
      "fr-academic": 0.8,
      it: 0.8,
      "it-literary-19c": 0.8,
      "it-nonfiction-19c": 0.8,
      "it-renaissance-dialogue": 0.8,
      en: 0.8, // English source → Spanish ~1.1× expansion typical
      "en-philosophy": 0.8,
      "en-philosophy-18c": 0.8,
      "en-victorian": 0.8,
      "en-science": 0.8,
      de: 0.7,
      "de-philosophy": 0.7,
      pl: 0.6,
      "pl-poetry": 0.5,
      "pl-philosophy": 0.7,
      hu: 0.6,
      "hu-poetry": 0.5,
      sr: 0.6,
      "sr-scholarly": 0.4,
      "sr-philosophy": 0.6,
      ta: 0,
      "ta-prose": 0.4,
      te: 0.4,
      "te-prose": 0.4,
      xcl: 0.1,
      "xcl-literature": 0.1,
      hy: 0.5,
      default: 0.7,
    };
    const ratioTable =
      targetLanguage === "zh"
        ? MIN_LENGTH_RATIO_ZH
        : targetLanguage === "es"
        ? MIN_LENGTH_RATIO_ES
        : MIN_LENGTH_RATIO_EN;
    const minRatio = ratioTable[sourceLanguage] ?? ratioTable.default;

    const truncatedParagraphs: { index: number; srcLen: number; transLen: number; ratio: number }[] = [];
    for (let i = 0; i < sourceContent.paragraphs.length; i++) {
      const srcLen = sourceContent.paragraphs[i].text.length;
      const transLen = translated[i]?.text?.length ?? 0;
      // Only check paragraphs with substantial source content (>100 chars)
      if (srcLen > 100) {
        const ratio = transLen / srcLen;
        if (ratio < minRatio) {
          truncatedParagraphs.push({ index: i, srcLen, transLen, ratio });
        }
      }
    }

    if (truncatedParagraphs.length > 0) {
      console.error(
        `  [TRUNCATION ERROR] Chapter ${chapter.chapterNumber}: ${truncatedParagraphs.length} paragraphs appear truncated:`
      );
      for (const tp of truncatedParagraphs.slice(0, 5)) {
        console.error(
          `    - Para ${tp.index}: source ${tp.srcLen} chars, translation ${tp.transLen} chars (ratio: ${tp.ratio.toFixed(2)}, min: ${minRatio})`
        );
      }
      if (truncatedParagraphs.length > 5) {
        console.error(`    ... and ${truncatedParagraphs.length - 5} more`);
      }
      console.error(`  Skipping save to prevent incomplete translations.`);
      return false;
    }

    // Create or get translation record
    let translation = existingTranslation;
    if (!translation) {
      const [newT] = await db
        .insert(schema.translations)
        .values({ chapterId: chapter.id, targetLanguage })
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
  const { textSlug, start, end, delay, retranslate, targetLanguage, modelOverride } = parseArgs();

  console.log("=== Batch Translation ===\n");
  console.log(`Model: ${modelOverride || MODEL}${modelOverride ? " (CLI override)" : ""}`);
  console.log(`Target language: ${targetLanguage}`);
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
    // Defensive: Spanish source texts must NEVER be translated into Spanish (ES→ES forbidden).
    // No current Spanish source texts exist, but this guardrail prevents future accidents.
    if (text.language.code === "es" && targetLanguage === "es") {
      throw new Error(
        `Refusing to translate Spanish source text "${text.slug}" into Spanish (ES→ES forbidden).`
      );
    }

    // Determine prompt variant based on language and genre
    let promptLang = text.language.code;
    let usingSpecialPrompt = false;

    // Chinese literary/historical/commentary texts use zh-literary prompt
    const isLiteraryChinese = text.language.code === "zh" && (text.genre === "literature" || text.genre === "history" || text.genre === "commentary");
    if (isLiteraryChinese) {
      promptLang = "zh-literary";
      usingSpecialPrompt = true;
    }

    // Chinese scientific/technical texts use zh-science prompt
    const isScienceChinese = text.language.code === "zh" && text.genre === "science";
    if (isScienceChinese) {
      promptLang = "zh-science";
      usingSpecialPrompt = true;
    }

    // Chinese Daoist ritual/liturgical texts use zh-daoist-ritual prompt
    const isDaoistRitual = text.language.code === "zh" && text.genre === "ritual";
    if (isDaoistRitual) {
      promptLang = "zh-daoist-ritual";
      usingSpecialPrompt = true;
    }

    // Tang Code (唐律疏議) uses zh-legal prompt for legal code with commentary
    if (text.slug === "tanglv-shuyi") {
      promptLang = "zh-legal";
      usingSpecialPrompt = true;
    }

    // Ming Code (大明律) uses zh-daminglv prompt for Ming dynasty legal code
    if (text.slug === "daminglv") {
      promptLang = "zh-daminglv";
      usingSpecialPrompt = true;
    }

    // Qing Code (大清律例) uses zh-daqinglvli prompt for Qing dynasty legal code
    if (text.slug === "daqinglvli") {
      promptLang = "zh-daqinglvli";
      usingSpecialPrompt = true;
    }

    // Su Shen Liang Fang (medical formulary) uses text-specific prompt
    if (text.slug === "su-shen-liang-fang") {
      promptLang = "zh-su-shen-liang-fang";
      usingSpecialPrompt = true;
    }

    // Tan Huo Dian Xue (Ming clinical treatise on phlegm-fire disorders) uses text-specific prompt
    if (text.slug === "tan-huo-dian-xue") {
      promptLang = "zh-tan-huo-dian-xue";
      usingSpecialPrompt = true;
    }

    // Shengji Zonglu (Song imperial medical encyclopedia) uses text-specific prompt
    if (text.slug === "shengji-zonglu") {
      promptLang = "zh-shengji-zonglu";
      usingSpecialPrompt = true;
    }

    // Yijing commentary texts use specialized prompts
    if (text.slug === "dongpo-yi-zhuan") {
      promptLang = "zh-dongpo-yi-zhuan";
      usingSpecialPrompt = true;
    }
    if (text.slug === "zhouyi-neichuan-fali") {
      promptLang = "zh-zhouyi-neichuan-fali";
      usingSpecialPrompt = true;
    }
    if (text.slug === "zhouyi-daxiang-jie") {
      promptLang = "zh-zhouyi-daxiang-jie";
      usingSpecialPrompt = true;
    }

    // Baopuzi (Daoist philosophy) uses zh-literary prompt — the base "zh" prompt
    // is Neo-Confucian-specific and would give wrong interpretive framing
    if (text.slug === "baopuzi") {
      promptLang = "zh-literary";
      usingSpecialPrompt = true;
    }
    if (text.slug === "zhuangzi-tong") {
      promptLang = "zh-zhuangzi-tong";
      usingSpecialPrompt = true;
    }

    // Song biji prose (Su Shi's notebooks) uses zh-biji prompt
    if (text.slug === "dongpo-zhilin" || text.slug === "qiu-chi-bi-ji") {
      promptLang = "zh-biji";
      usingSpecialPrompt = true;
    }

    // Joseon Sillok texts use zh-joseon-sillok prompt
    if (text.slug.startsWith("joseon-sillok-")) {
      promptLang = "zh-joseon-sillok";
      usingSpecialPrompt = true;
    }

    // Twenty-Four Histories use text-specific prompts (zh-shiji, zh-hanshu, etc.)
    const twentyFourHistoriesSlugs = [
      "shiji", "hanshu", "hou-hanshu", "sanguozhi", "jinshu", "songshu",
      "nan-qi-shu", "liangshu", "chenshu", "weishu", "bei-qi-shu", "zhoushu",
      "suishu", "nanshi", "beishi", "jiu-tangshu", "xin-tangshu",
      "jiu-wudaishi", "xin-wudaishi", "songshi", "liaoshi", "jinshi",
      "yuanshi", "mingshi"
    ];
    if (twentyFourHistoriesSlugs.includes(text.slug)) {
      promptLang = `zh-${text.slug}`;
      usingSpecialPrompt = true;
    }

    // Chagatai Turkic poetry (Babur's Divan) uses chg-babur prompt
    if (text.language.code === "chg") {
      promptLang = "chg-babur";
      usingSpecialPrompt = true;
    }

    // Müşahedat uses text-specific Ottoman Turkish prompt (Tanzimat era, distinct from Servet-i Fünun)
    if (text.slug === "musahedat") {
      promptLang = "tr-musahedat";
      usingSpecialPrompt = true;
    }

    // Poselyanin's hagiography uses the base ru prompt (devotional writing), not ru-literary (Romantic fiction)
    if (text.slug === "bozhya-rat" || text.slug === "bogomater") {
      promptLang = "ru";
      usingSpecialPrompt = true;
    }

    // Russian literary prose and literary history (19th-century Romantic fiction, satire, historical novels, literary criticism) uses ru-literary prompt
    const isLiteraryRussian = text.language.code === "ru" && (text.genre === "literature" || text.genre === "history");
    if (isLiteraryRussian && !usingSpecialPrompt) {
      promptLang = "ru-literary";
      usingSpecialPrompt = true;
    }

    // Skaballanovich's Tolkovyj Tipikon — scholarly liturgical commentary
    if (text.slug === "tolkovyj-tipikon") {
      promptLang = "ru-tipikon";
      usingSpecialPrompt = true;
    }

    // Italian Renaissance dialogue uses it-renaissance-dialogue prompt
    const itRenaissanceDialogueSlugs = ["i-marmi", "della-historia-dialoghi"];
    if (itRenaissanceDialogueSlugs.includes(text.slug)) {
      promptLang = "it-renaissance-dialogue";
      usingSpecialPrompt = true;
    }

    // 19th-century Italian literature uses it-literary-19c prompt
    const isLiteraryItalian = text.language.code === "it" && text.genre === "literature";
    if (isLiteraryItalian && !usingSpecialPrompt) {
      promptLang = "it-literary-19c";
      usingSpecialPrompt = true;
    }

    // Italian non-fiction (philosophy, science, history) uses it-nonfiction-19c prompt
    const isNonfictionItalian = text.language.code === "it" && text.genre !== "literature" && text.slug !== "diarium-urbis-romae";
    if (isNonfictionItalian) {
      promptLang = "it-nonfiction-19c";
      usingSpecialPrompt = true;
    }

    // French metropolitan poetry (Des Roches, Girardin)
    const frMetropolitanPoetry = ["la-puce-desroches", "essais-poetiques", "fleurs-de-reve"];
    if (text.language.code === "fr" && text.textType === "poetry" && frMetropolitanPoetry.includes(text.slug)) {
      promptLang = "fr-metropolitan-poetry";
      usingSpecialPrompt = true;
    }

    // French-Canadian poetry uses fr-poetry prompt
    const isFrenchPoetry = text.language.code === "fr" && text.textType === "poetry";
    if (isFrenchPoetry && !usingSpecialPrompt) {
      promptLang = "fr-poetry";
      usingSpecialPrompt = true;
    }

    // French metropolitan prose (Gautier, Dufrénoy, Lecomte du Noüy, etc.)
    const frMetropolitanProse = [
      "notes-dune-mere", "la-femme-auteur", "collier-second-rang", "collier-souvenirs",
      "paravent-soie-or", "en-chine", "contes-de-noel", "maudit-soit-lamour",
      "fou-damour", "daad", "sultans-ottomans",
    ];
    if (text.language.code === "fr" && frMetropolitanProse.includes(text.slug)) {
      promptLang = "fr-metropolitan";
      usingSpecialPrompt = true;
    }

    // French-Canadian literary prose (novels, historical fiction) uses fr-literary prompt
    // This catches all fr literature not already matched by specific slug rules above
    if (text.language.code === "fr" && text.genre === "literature" && !usingSpecialPrompt) {
      promptLang = "fr-literary";
      usingSpecialPrompt = true;
    }

    // Chinese poetry uses zh-poetry prompt
    const isChinesePoetry = text.language.code === "zh" && text.textType === "poetry";
    if (isChinesePoetry) {
      promptLang = "zh-poetry";
      usingSpecialPrompt = true;
    }

    // Hungarian poetry uses hu-poetry prompt (Ady-style modernist verse cycles)
    const isHungarianPoetry = text.language.code === "hu" && text.textType === "poetry";
    if (isHungarianPoetry) {
      promptLang = "hu-poetry";
      usingSpecialPrompt = true;
    }

    // Polish poetry uses pl-poetry prompt (Enlightenment philosophical verse)
    const isPolishPoetry = text.language.code === "pl" && text.textType === "poetry";
    if (isPolishPoetry) {
      promptLang = "pl-poetry";
      usingSpecialPrompt = true;
    }

    // Polish philosophy uses pl-philosophy prompt (Libelt's Filozofia i Krytyka and similar)
    const isPolishPhilosophy =
      text.language.code === "pl" && text.genre === "philosophy" && text.textType !== "poetry";
    if (isPolishPhilosophy) {
      promptLang = "pl-philosophy";
      usingSpecialPrompt = true;
    }

    // German philosophy uses de-philosophy prompt (Petronijevic, etc. — not alchemy, not Schelling)
    const isGermanPhilosophy =
      text.language.code === "de" && text.genre === "philosophy" && !usingSpecialPrompt;
    if (isGermanPhilosophy) {
      promptLang = "de-philosophy";
      usingSpecialPrompt = true;
    }

    // Tuibei Tu (推背圖) uses its own prophetic verse prompt
    if (text.slug === "tuibei-tu") {
      promptLang = "zh-tuibei-tu";
      usingSpecialPrompt = true;
    }

    // Persian prose (reform literature, travel narratives) uses fa-prose prompt
    // The default "fa" prompt is for Shahnameh poetry — Persian prose texts need a different prompt
    const isPersianProse = text.language.code === "fa" && text.textType === "prose";
    if (isPersianProse) {
      promptLang = "fa-prose";
      usingSpecialPrompt = true;
    }

    // Tamil prose literature uses ta-prose prompt
    const isTamilProse = text.language.code === "ta" && text.genre === "literature" && text.textType === "prose";
    if (isTamilProse) {
      promptLang = "ta-prose";
      usingSpecialPrompt = true;
    }

    // Byzantine Greek history/chronicles use grc-history prompt
    const isGreekHistory = text.language.code === "grc" && text.genre === "history";
    if (isGreekHistory) {
      promptLang = "grc-history";
      usingSpecialPrompt = true;
    }

    // Gregory of Nazianzus orations use grc-gregory prompt
    if (text.slug === "gregory-orations") {
      promptLang = "grc-gregory";
      usingSpecialPrompt = true;
    }

    // Late antique Greek philosophy/commentary (Neoplatonism, Pythagoreanism) uses grc-philosophy prompt
    const isGreekPhilosophy = text.language.code === "grc" && (text.genre === "philosophy" || text.genre === "commentary");
    if (isGreekPhilosophy) {
      promptLang = "grc-philosophy";
      usingSpecialPrompt = true;
    }

    // French academic geography (Peninsula Balkanique) uses fr-academic prompt
    if (text.language.code === "fr" && text.genre === "science") {
      promptLang = "fr-academic";
      usingSpecialPrompt = true;
    }

    // Serbian scholarly prose uses sr-scholarly prompt
    if (text.language.code === "sr" && text.genre === "history") {
      promptLang = "sr-scholarly";
      usingSpecialPrompt = true;
    }

    // Serbian philosophy uses sr-philosophy prompt (Knežević aphorisms, etc.)
    if (text.language.code === "sr" && text.genre === "philosophy" && !usingSpecialPrompt) {
      promptLang = "sr-philosophy";
      usingSpecialPrompt = true;
    }

    // Classical Armenian literature (fables, moral tales) uses xcl-literature prompt
    if (text.language.code === "xcl" && text.genre === "literature") {
      promptLang = "xcl-literature";
      usingSpecialPrompt = true;
    }

    // Kitab al-Mawaqif uses ar-sufi prompt (19th-century Sufi philosophical prose)
    if (text.slug === "kitab-al-mawaqif") {
      promptLang = "ar-sufi";
      usingSpecialPrompt = true;
    }

    // Masail Ibn Rushd uses ar-fiqh prompt (12th-century Maliki jurisprudence)
    if (text.slug === "masail-ibn-rushd") {
      promptLang = "ar-fiqh";
      usingSpecialPrompt = true;
    }

    // Arabic literary prose (nahda-era essays, drama) uses ar prompt
    if (text.language.code === "ar" && !usingSpecialPrompt) {
      promptLang = "ar";
      usingSpecialPrompt = true;
    }

    // All Persian texts use the same fa prompt (Shahnameh-style)

    // Zhu Zi Yu Lei uses specialist ZZYL prompt (dialogue conventions, philosophical terminology)
    if (text.slug === "zhuziyulei") {
      promptLang = "zh-zhuziyulei";
      usingSpecialPrompt = true;
    }

    // Telugu prose (non-Satakam) uses te-prose prompt
    const isTeluguProse = text.language.code === "te" && text.slug !== "sri-kalahasteeswara-satakam";
    if (isTeluguProse) {
      promptLang = "te-prose";
      usingSpecialPrompt = true;
    }

    // Latin poetry/hymns use la-hymn prompt — NO RHYMING, line-for-line
    if (text.slug === "hymni-ecclesiae" || text.slug === "bombyx") {
      promptLang = "la-hymn";
      usingSpecialPrompt = true;
    }

    // English Victorian/Edwardian literary prose — specialist Chinese/Spanish target prompt
    const isVictorianEnglish = text.language.code === "en" && text.genre === "literature";
    if (isVictorianEnglish && (targetLanguage === "zh" || targetLanguage === "es")) {
      promptLang = "en-victorian";
      usingSpecialPrompt = true;
    }

    // 19th-century English history of science (Whewell etc.) — specialist Chinese/Spanish target prompt
    const isEnglishScience = text.language.code === "en" && text.genre === "science";
    if (isEnglishScience && (targetLanguage === "zh" || targetLanguage === "es")) {
      promptLang = "en-science";
      usingSpecialPrompt = true;
    }

    // Tracts for the Times — Victorian Anglican theology, use en-victorian prompt (has theological terms)
    if (text.slug === "tracts-for-the-times" && (targetLanguage === "zh" || targetLanguage === "es")) {
      promptLang = "en-victorian";
      usingSpecialPrompt = true;
    }

    // Butler's Analogy of Religion — 18th-century Anglican theology, en-victorian prompt has relevant theological terms
    if (text.slug === "analogy-of-religion" && (targetLanguage === "zh" || targetLanguage === "es")) {
      promptLang = "en-victorian";
      usingSpecialPrompt = true;
    }

    // Hutcheson's Inquiry — 18th-century English moral philosophy
    if (text.slug === "hutcheson-inquiry" && (targetLanguage === "zh" || targetLanguage === "es")) {
      promptLang = "en-philosophy-18c";
      usingSpecialPrompt = true;
    }

    // Bosanquet's Philosophical Theory of the State — late 19c British Idealist political philosophy
    if (text.slug === "philosophical-theory-of-state" && (targetLanguage === "zh" || targetLanguage === "es")) {
      promptLang = "en-philosophy";
      usingSpecialPrompt = true;
    }

    // Bradley's Appearance and Reality — late 19c British Idealist metaphysics
    if (text.slug === "appearance-and-reality" && (targetLanguage === "zh" || targetLanguage === "es")) {
      promptLang = "en-philosophy";
      usingSpecialPrompt = true;
    }

    // Select model — CLI --model flag overrides auto-selection
    // Without override: use deepseek-reasoner ONLY for texts in REASONER_SLUGS
    // Exception: Hindi target always uses deepseek-chat (User directive 2026-02-26)
    // Exception: Spanish target ALWAYS uses deepseek-chat, including poetry
    //   (User directive 2026-04-11 — hard rule, bypasses REASONER_SLUGS)
    // Note: Poetry texts use deepseek-chat by default (User directive 2026-03-06)
    //   — deepseek-reasoner is reserved for specific texts that need it (REASONER_SLUGS)
    if (modelOverride) {
      MODEL = modelOverride;
    } else if (targetLanguage === "hi") {
      MODEL = DEFAULT_MODEL; // Hindi always deepseek-chat
    } else if (targetLanguage === "es") {
      MODEL = DEFAULT_MODEL; // Spanish always deepseek-chat, including poetry
    } else {
      MODEL = REASONER_SLUGS.has(text.slug) ? "deepseek-reasoner" : DEFAULT_MODEL;
    }

    if (usingSpecialPrompt) {
      console.log(`\n--- ${text.title} (${text.language.code}, genre: ${text.genre}, using ${promptLang} prompt, model: ${MODEL}) ---\n`);
    } else {
      console.log(`\n--- ${text.title} (${text.language.code}, genre: ${text.genre || "none"}, model: ${MODEL}) ---\n`);
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
          where: and(
            eq(schema.translations.chapterId, chapter.id),
            eq(schema.translations.targetLanguage, targetLanguage)
          ),
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
        text.slug,
        targetLanguage,
        text.textType ?? "prose",
        text.genre ?? null
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
