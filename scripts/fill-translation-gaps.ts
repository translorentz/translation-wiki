/**
 * Fills translation gaps: finds chapters where some paragraphs have empty translations
 * despite having non-empty source text, retranslates just those paragraphs, and creates
 * a new TranslationVersion with the gaps filled.
 *
 * Usage: pnpm tsx scripts/fill-translation-gaps.ts [--text <slug>] [--delay <ms>]
 *
 * This script:
 * 1. Scans all translated chapters for empty paragraphs with non-empty source
 * 2. Groups gaps by chapter
 * 3. Translates only the missing paragraphs (using batching)
 * 4. Creates a new TranslationVersion with gaps filled, keeping existing translations
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, desc } from "drizzle-orm";
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

const MODEL = "deepseek-chat";
const BATCH_DELAY_MS = 2000;

const MAX_CHARS_BY_LANG: Record<string, number> = {
  zh: 1500,
  grc: 6000,
  la: 6000,
};
const DEFAULT_MAX_CHARS = 3000;

// ============================================================
// Argument parsing
// ============================================================

function parseArgs() {
  const args = process.argv.slice(2);
  let textSlug: string | undefined;
  let delay = 3000;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--text" && args[i + 1]) textSlug = args[i + 1];
    if (args[i] === "--delay" && args[i + 1]) delay = parseInt(args[i + 1]);
  }

  return { textSlug, delay };
}

// ============================================================
// Types
// ============================================================

interface Para {
  index: number;
  text: string;
}

interface GapInfo {
  textSlug: string;
  textTitle: string;
  languageCode: string;
  chapterNumber: number;
  chapterId: number;
  translationId: number;
  currentVersionId: number;
  currentContent: Para[];
  sourceContent: Para[];
  gapIndices: number[];
}

// ============================================================
// Translation logic (same as translate-batch.ts)
// ============================================================

async function translateBatch(paragraphs: Para[], sourceLanguage: string): Promise<Para[]> {
  const { system, user } = buildTranslationPrompt({ sourceLanguage, paragraphs });

  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from API");

  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  // Parse with repair
  let raw: unknown[];
  try {
    raw = JSON.parse(jsonStr);
  } catch {
    // Try to repair
    const arrayStart = jsonStr.indexOf("[");
    if (arrayStart > 0) jsonStr = jsonStr.substring(arrayStart);
    if (!jsonStr.endsWith("]")) {
      const lastBrace = jsonStr.lastIndexOf("}");
      if (lastBrace > 0) jsonStr = jsonStr.substring(0, lastBrace + 1) + "]";
    }
    raw = JSON.parse(jsonStr);
  }

  if (!Array.isArray(raw)) throw new Error("Response is not an array");

  return raw.map((item: any) => ({
    index: typeof item.index === "string" ? parseInt(item.index, 10) : Math.floor(Number(item.index)),
    text: String(item.text ?? ""),
  }));
}

async function translateWithRetry(paragraphs: Para[], sourceLanguage: string): Promise<Para[]> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await translateBatch(paragraphs, sourceLanguage);
    } catch (err) {
      if (attempt < 3) {
        const delay = BATCH_DELAY_MS * (attempt + 1);
        process.stdout.write(`    retry ${attempt}/3 in ${delay}ms...\n`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  return []; // unreachable
}

// ============================================================
// Gap detection
// ============================================================

async function findGaps(textSlug?: string): Promise<GapInfo[]> {
  const gaps: GapInfo[] = [];

  const translations = await db.query.translations.findMany({
    with: {
      chapter: { with: { text: { with: { language: true } } } },
    },
  });

  for (const t of translations) {
    if (!t.currentVersionId) continue;
    if (textSlug && t.chapter.text.slug !== textSlug) continue;

    // Get current version
    const version = await db.query.translationVersions.findFirst({
      where: eq(schema.translationVersions.id, t.currentVersionId),
    });
    if (!version) continue;

    const translationContent = version.content as { paragraphs: Para[] } | null;
    const sourceContent = t.chapter.sourceContent as { paragraphs: Para[] } | null;
    if (!translationContent?.paragraphs || !sourceContent?.paragraphs) continue;

    // Find gaps: empty translation but non-empty source
    const gapIndices: number[] = [];
    for (const tp of translationContent.paragraphs) {
      if (tp.text.trim() === "") {
        const sp = sourceContent.paragraphs.find((s) => s.index === tp.index);
        if (sp && sp.text.trim().length > 0) {
          gapIndices.push(tp.index);
        }
      }
    }

    if (gapIndices.length > 0) {
      gaps.push({
        textSlug: t.chapter.text.slug,
        textTitle: t.chapter.text.title,
        languageCode: t.chapter.text.language.code,
        chapterNumber: t.chapter.chapterNumber,
        chapterId: t.chapter.id,
        translationId: t.id,
        currentVersionId: t.currentVersionId,
        currentContent: translationContent.paragraphs,
        sourceContent: sourceContent.paragraphs,
        gapIndices,
      });
    }
  }

  // Sort by text slug then chapter number
  gaps.sort((a, b) => a.textSlug.localeCompare(b.textSlug) || a.chapterNumber - b.chapterNumber);
  return gaps;
}

// ============================================================
// Gap filling
// ============================================================

async function fillGap(gap: GapInfo, systemUserId: number, delay: number): Promise<boolean> {
  const label = `${gap.textSlug} ch${gap.chapterNumber}`;
  process.stdout.write(`\n  [fill] ${label}: ${gap.gapIndices.length} gaps at [${gap.gapIndices.join(", ")}]\n`);

  // Get source paragraphs for the gaps
  const gapSources = gap.gapIndices
    .map((idx) => gap.sourceContent.find((s) => s.index === idx))
    .filter((s): s is Para => s !== undefined && s !== null);

  if (gapSources.length === 0) {
    process.stdout.write(`    no source text found for gaps, skipping\n`);
    return false;
  }

  // Chunk the gap paragraphs (same logic as translate-batch)
  const maxChars = MAX_CHARS_BY_LANG[gap.languageCode] ?? DEFAULT_MAX_CHARS;
  const chunks: Para[][] = [];
  let current: Para[] = [];
  let currentChars = 0;

  for (const p of gapSources) {
    if (current.length > 0 && currentChars + p.text.length > maxChars) {
      chunks.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(p);
    currentChars += p.text.length;
  }
  if (current.length > 0) chunks.push(current);

  // Translate each chunk
  const translated: Para[] = [];
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, delay));
    try {
      const result = await translateWithRetry(chunks[i], gap.languageCode);
      // Match results to expected indices
      for (let j = 0; j < chunks[i].length; j++) {
        const expectedIndex = chunks[i][j].index;
        const match = result.find((r) => r.index === expectedIndex);
        if (match && match.text.trim()) {
          translated.push(match);
        } else if (result[j] && result[j].text.trim()) {
          translated.push({ index: expectedIndex, text: result[j].text });
        } else {
          process.stdout.write(`    ⚠ paragraph ${expectedIndex} still empty after retranslation\n`);
        }
      }
    } catch (err) {
      process.stdout.write(`    ✗ batch ${i + 1}/${chunks.length} failed: ${err instanceof Error ? err.message : err}\n`);
    }
  }

  if (translated.length === 0) {
    process.stdout.write(`    ✗ all retranslations failed\n`);
    return false;
  }

  // Merge: take existing content and fill in the gaps
  const merged: Para[] = gap.currentContent.map((p) => {
    const fill = translated.find((t) => t.index === p.index);
    if (fill && p.text.trim() === "") {
      return fill;
    }
    return p;
  });

  // Get current version number
  const currentVersion = await db.query.translationVersions.findFirst({
    where: eq(schema.translationVersions.id, gap.currentVersionId),
    columns: { versionNumber: true },
  });
  const newVersionNumber = (currentVersion?.versionNumber ?? 0) + 1;

  // Create new version
  const [newVersion] = await db
    .insert(schema.translationVersions)
    .values({
      translationId: gap.translationId,
      versionNumber: newVersionNumber,
      content: { paragraphs: merged },
      authorId: systemUserId,
      editSummary: `Fill ${translated.length} translation gap(s) (automated)`,
      previousVersionId: gap.currentVersionId,
    })
    .returning();

  // Update head
  await db
    .update(schema.translations)
    .set({ currentVersionId: newVersion.id, updatedAt: new Date() })
    .where(eq(schema.translations.id, gap.translationId));

  process.stdout.write(`    ✓ filled ${translated.length}/${gap.gapIndices.length} gaps (version ${newVersionNumber})\n`);
  return true;
}

// ============================================================
// System user
// ============================================================

async function getSystemUserId(): Promise<number> {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.username, "system"),
  });
  if (!user) throw new Error("System user not found. Run translate-batch.ts first.");
  return user.id;
}

// ============================================================
// Main
// ============================================================

async function main() {
  const { textSlug, delay } = parseArgs();

  console.log("=== Translation Gap Filler ===\n");
  console.log(`Model: ${MODEL}`);
  console.log(`Delay: ${delay}ms between batches`);
  if (textSlug) console.log(`Filter: ${textSlug} only`);

  const systemUserId = await getSystemUserId();

  console.log("\nScanning for gaps...");
  const gaps = await findGaps(textSlug);

  if (gaps.length === 0) {
    console.log("No gaps found. All translations are complete.");
    await client.end();
    return;
  }

  const totalGaps = gaps.reduce((sum, g) => sum + g.gapIndices.length, 0);
  console.log(`Found ${totalGaps} gaps across ${gaps.length} chapters.\n`);

  let filled = 0;
  let failed = 0;

  for (const gap of gaps) {
    try {
      const success = await fillGap(gap, systemUserId, delay);
      if (success) filled++;
      else failed++;
    } catch (err) {
      process.stdout.write(`  [err] ${gap.textSlug} ch${gap.chapterNumber}: ${err instanceof Error ? err.message : err}\n`);
      failed++;
    }
    await new Promise((r) => setTimeout(r, delay));
  }

  console.log(`\n=== Complete ===`);
  console.log(`Filled: ${filled}, Failed: ${failed}, Total chapters: ${gaps.length}`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
