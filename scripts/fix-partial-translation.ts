/**
 * Fix partially translated chapters by retranslating only the failed paragraphs.
 *
 * Usage: pnpm tsx scripts/fix-partial-translation.ts --chapter-id <id> [--dry-run]
 *
 * This script:
 * 1. Finds paragraphs with placeholder text "[Translation pending..."
 * 2. Fetches the corresponding source paragraphs
 * 3. Translates only those paragraphs
 * 4. Updates the existing translation version with the new translations
 */

import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import { buildTranslationPrompt } from "../src/server/translation/prompts";
import { getTranslationClient } from "../src/server/translation/client";

// Load .env.local
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

if (!process.env.DEEPSEEK_API_KEY) {
  console.error("DEEPSEEK_API_KEY is required.");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });
const openai = getTranslationClient();

const MODEL = "deepseek-chat";
const MAX_CHARS_PER_BATCH = 4000;
const BATCH_DELAY_MS = 2000;
const PLACEHOLDER_PREFIX = "[Translation pending";

interface Paragraph {
  index: number;
  text: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let chapterId: number | undefined;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--chapter-id" && args[i + 1]) {
      chapterId = parseInt(args[i + 1]);
    }
    if (args[i] === "--dry-run") {
      dryRun = true;
    }
  }

  return { chapterId, dryRun };
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

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.3,
    max_tokens: 8192,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No text response from DeepSeek");
  }

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

  // Realign to expected indices
  const expectedIndices = paragraphs.map((p) => p.index);

  if (
    parsed.length === paragraphs.length &&
    parsed.every((p, i) => p.index === expectedIndices[i])
  ) {
    return parsed;
  }

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
  const label = `    batch ${batchNum}/${totalBatches}`;

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
      `${label} splitting batch (${paragraphs.length} -> ${firstHalf.length}+${secondHalf.length})\n`
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

  // Single paragraph that still fails — return with placeholder
  process.stdout.write(
    `${label} FAILED (${paragraphs.length} paragraphs skipped)\n`
  );
  const placeholders: Paragraph[] = paragraphs.map((p) => ({
    index: p.index,
    text: "[Translation pending — automated translation failed for this paragraph]",
  }));
  return { results: placeholders, failed: paragraphs.length };
}

async function main() {
  const { chapterId, dryRun } = parseArgs();

  if (!chapterId) {
    console.error("Usage: pnpm tsx scripts/fix-partial-translation.ts --chapter-id <id> [--dry-run]");
    process.exit(1);
  }

  console.log("=== Fix Partial Translation ===\n");
  console.log(`Chapter ID: ${chapterId}`);
  console.log(`Dry run: ${dryRun}`);
  console.log();

  // Get chapter with text info
  const chapter = await db.query.chapters.findFirst({
    where: eq(schema.chapters.id, chapterId),
    with: { text: { with: { language: true } } },
  });

  if (!chapter) {
    console.error(`Chapter not found: ${chapterId}`);
    await client.end();
    process.exit(1);
  }

  const sourceLanguage = chapter.text.language.code;
  console.log(`Text: ${chapter.text.title}`);
  console.log(`Chapter: ${chapter.chapterNumber} - ${chapter.title || "(untitled)"}`);
  console.log(`Language: ${sourceLanguage}`);
  console.log();

  // Get translation and version
  const translation = await db.query.translations.findFirst({
    where: eq(schema.translations.chapterId, chapterId),
  });

  if (!translation || !translation.currentVersionId) {
    console.error("No translation found for this chapter");
    await client.end();
    process.exit(1);
  }

  const version = await db.query.translationVersions.findFirst({
    where: eq(schema.translationVersions.id, translation.currentVersionId),
  });

  if (!version) {
    console.error("Translation version not found");
    await client.end();
    process.exit(1);
  }

  const sourceContent = chapter.sourceContent as { paragraphs: Paragraph[] };
  const translatedContent = version.content as { paragraphs: Paragraph[] };

  if (!sourceContent?.paragraphs || !translatedContent?.paragraphs) {
    console.error("Missing paragraph content");
    await client.end();
    process.exit(1);
  }

  // Find failed paragraphs (those with placeholder text)
  const failedIndices: number[] = [];
  for (const p of translatedContent.paragraphs) {
    if (p.text.startsWith(PLACEHOLDER_PREFIX)) {
      failedIndices.push(p.index);
    }
  }

  if (failedIndices.length === 0) {
    console.log("No failed paragraphs found - translation is complete!");
    await client.end();
    return;
  }

  console.log(`Found ${failedIndices.length} failed paragraphs (indices ${failedIndices[0]}-${failedIndices[failedIndices.length - 1]})`);
  console.log();

  // Get source paragraphs for the failed indices
  const sourceToTranslate: Paragraph[] = [];
  for (const idx of failedIndices) {
    const sourcePara = sourceContent.paragraphs.find((p) => p.index === idx);
    if (sourcePara) {
      sourceToTranslate.push(sourcePara);
    }
  }

  if (sourceToTranslate.length !== failedIndices.length) {
    console.error(`Warning: Could only find ${sourceToTranslate.length} of ${failedIndices.length} source paragraphs`);
  }

  console.log(`Translating ${sourceToTranslate.length} paragraphs...`);
  console.log();

  if (dryRun) {
    console.log("[DRY RUN] Would translate these paragraphs:");
    for (const p of sourceToTranslate.slice(0, 5)) {
      console.log(`  [${p.index}] ${p.text.substring(0, 80)}...`);
    }
    if (sourceToTranslate.length > 5) {
      console.log(`  ... and ${sourceToTranslate.length - 5} more`);
    }
    await client.end();
    return;
  }

  // Translate in batches
  const chunks = chunkParagraphs(sourceToTranslate);
  const translated: Paragraph[] = [];
  let failedCount = 0;

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
    failedCount += batchResult.failed;
  }

  console.log();
  console.log(`Translated ${translated.length - failedCount} paragraphs successfully`);
  if (failedCount > 0) {
    console.log(`Warning: ${failedCount} paragraphs still failed`);
  }

  // Merge translated paragraphs into existing content
  const updatedParagraphs = [...translatedContent.paragraphs];
  for (const newPara of translated) {
    const existingIdx = updatedParagraphs.findIndex((p) => p.index === newPara.index);
    if (existingIdx >= 0) {
      updatedParagraphs[existingIdx] = newPara;
    }
  }

  // Sort by index to ensure correct order
  updatedParagraphs.sort((a, b) => a.index - b.index);

  // Update the translation version
  await db
    .update(schema.translationVersions)
    .set({
      content: { paragraphs: updatedParagraphs },
    })
    .where(eq(schema.translationVersions.id, version.id));

  console.log();
  console.log("Translation version updated successfully!");

  // Verify the update
  const verifyFailed = updatedParagraphs.filter((p) => p.text.startsWith(PLACEHOLDER_PREFIX));
  console.log(`Remaining failed paragraphs: ${verifyFailed.length}`);

  await client.end();
}

main().catch((err) => {
  console.error("Fix partial translation failed:", err);
  client.end().then(() => process.exit(1));
});
