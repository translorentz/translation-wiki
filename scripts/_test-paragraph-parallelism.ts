/**
 * Paragraph-parallelism test harness for translate-batch.ts speedup #3.
 *
 * Fetches a chapter's source paragraphs, builds batches using the SAME
 * logic as translate-batch.ts, then runs them in two modes:
 *   1. Serial — for...of await (current production behavior)
 *   2. Parallel — Promise.all() with bounded concurrency (proposed)
 *
 * Measures wall-clock time, validates output, prints a comparison report.
 * Does NOT save anything to the DB. Pure measurement.
 *
 * Usage: pnpm tsx scripts/_test-paragraph-parallelism.ts <text-slug> <chapter-number>
 */

import fs from "fs";
import path from "path";
import postgres from "postgres";
import OpenAI from "openai";
import { buildTranslationPrompt } from "../src/server/translation/prompts";

// ============================================================
// Env loading (match translate-batch.ts)
// ============================================================
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const dbMatch = line.match(/^DATABASE_URL=(.+)$/);
    if (dbMatch) {
      process.env.DATABASE_URL = dbMatch[1].replace(/^['"]|['"]$/g, "");
    }
    const dsMatch = line.match(/^(DEEPSEEK_API_KEY|DEEPSEEK_API_KEYS|DEEPSEEK_API_KEY_\d+|DEEPSEEK_EXTRA_API_\d+)=(.+)$/);
    if (dsMatch) {
      process.env[dsMatch[1]] = dsMatch[2].replace(/^['"]|['"]$/g, "");
    }
  }
}

// ============================================================
// Multi-key pool (copied from translate-batch.ts)
// ============================================================
function loadDeepseekKeys(): string[] {
  const keys: string[] = [];
  if (process.env.DEEPSEEK_API_KEYS) {
    keys.push(...process.env.DEEPSEEK_API_KEYS.split(",").map((k) => k.trim()).filter(Boolean));
  }
  if (process.env.DEEPSEEK_API_KEY) keys.push(process.env.DEEPSEEK_API_KEY);
  for (let i = 2; i <= 10; i++) {
    const k = process.env[`DEEPSEEK_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  for (let i = 2; i <= 10; i++) {
    const k = process.env[`DEEPSEEK_EXTRA_API_${i}`];
    if (k) keys.push(k);
  }
  return Array.from(new Set(keys.filter(Boolean)));
}
const DEEPSEEK_KEYS = loadDeepseekKeys();
if (DEEPSEEK_KEYS.length === 0) {
  console.error("No DeepSeek API keys found.");
  process.exit(1);
}
console.log(`Loaded ${DEEPSEEK_KEYS.length} DeepSeek API key${DEEPSEEK_KEYS.length === 1 ? "" : "s"}`);
const deepseekClients = DEEPSEEK_KEYS.map(
  (key) => new OpenAI({ apiKey: key, baseURL: "https://api.deepseek.com" })
);
let nextClientIdx = 0;
function getNextClient(): OpenAI {
  const c = deepseekClients[nextClientIdx % deepseekClients.length];
  nextClientIdx++;
  return c;
}

// ============================================================
// Batching (copied from translate-batch.ts — MUST match exactly)
// ============================================================
interface Paragraph {
  index: number;
  text: string;
}

const MAX_CHARS_BY_LANG: Record<string, number> = {
  zh: 1500,
  grc: 2500,
  la: 2500,
  hu: 1200,
  ar: 2000,
};
const DEFAULT_MAX_CHARS = 2500;
const SOLO_PARAGRAPH_THRESHOLD = 1500;
const BATCH_DELAY_MS = 2000;
const MODEL = "deepseek-chat";
const MISMATCH_MAX_RETRIES = 2;

function chunkParagraphs(paragraphs: Paragraph[], sourceLanguage: string): Paragraph[][] {
  const maxChars = MAX_CHARS_BY_LANG[sourceLanguage] ?? DEFAULT_MAX_CHARS;
  const chunks: Paragraph[][] = [];
  let current: Paragraph[] = [];
  let currentChars = 0;

  for (const p of paragraphs) {
    if (!p.text) p.text = "";
    if (p.text.length > SOLO_PARAGRAPH_THRESHOLD) {
      if (current.length > 0) {
        chunks.push(current);
        current = [];
        currentChars = 0;
      }
      chunks.push([p]);
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
  if (current.length > 0) chunks.push(current);
  return chunks;
}

// ============================================================
// Translation helpers (copied from translate-batch.ts)
// ============================================================
function repairAndParseJson(jsonStr: string): unknown[] {
  let str = jsonStr.trim();
  const arrayStart = str.indexOf("[");
  if (arrayStart > 0) str = str.substring(arrayStart);
  if (!str.endsWith("]")) {
    const lastBrace = str.lastIndexOf("}");
    if (lastBrace > 0) str = str.substring(0, lastBrace + 1) + "]";
  }
  try {
    const result = JSON.parse(str);
    if (Array.isArray(result)) return result;
  } catch {}
  const objects: unknown[] = [];
  const objectPattern = /\{\s*"index"\s*:\s*(\d+)\s*,\s*"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let match;
  while ((match = objectPattern.exec(jsonStr)) !== null) {
    objects.push({ index: parseInt(match[1]), text: match[2].replace(/\\n/g, "\n").replace(/\\"/g, '"') });
  }
  if (objects.length > 0) return objects;
  throw new Error(`Failed to parse JSON (length ${jsonStr.length})`);
}

function parseTranslationResponse(
  content: string,
  expectedIndices: number[]
): { parsed: Paragraph[]; exactMatch: boolean } {
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
  if (!Array.isArray(raw)) throw new Error("Response is not an array");
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

async function translateBatch(
  paragraphs: Paragraph[],
  sourceLanguage: string,
  targetLanguage: string,
  textType: string | null,
  genre: string | null
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

    const clientForCall = getNextClient();
    const response = await clientForCall.chat.completions.create({
      model: MODEL,
      max_tokens: 8192,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No text response from DeepSeek");

    const { parsed, exactMatch } = parseTranslationResponse(content, expectedIndices);
    if (exactMatch) return parsed;

    if (attempt < MISMATCH_MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      continue;
    }
    throw new Error(`Paragraph count mismatch: expected ${expectedIndices.length}, got ${parsed.length}`);
  }
  throw new Error("unreachable");
}

// Simple retry wrapper — single level, no split. Measures raw batch latency.
async function translateBatchWithRetry(
  paragraphs: Paragraph[],
  sourceLanguage: string,
  targetLanguage: string,
  textType: string | null,
  genre: string | null
): Promise<{ result: Paragraph[]; retries: number }> {
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await translateBatch(paragraphs, sourceLanguage, targetLanguage, textType, genre);
      return { result, retries: attempt - 1 };
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS * attempt));
      } else {
        throw err;
      }
    }
  }
  throw new Error("unreachable");
}

// ============================================================
// Parallelism runner
// ============================================================
async function runSerial(
  batches: Paragraph[][],
  sourceLanguage: string,
  targetLanguage: string,
  textType: string | null,
  genre: string | null
): Promise<{ results: Paragraph[][]; totalRetries: number }> {
  const results: Paragraph[][] = [];
  let totalRetries = 0;
  for (let i = 0; i < batches.length; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
    const { result, retries } = await translateBatchWithRetry(
      batches[i],
      sourceLanguage,
      targetLanguage,
      textType,
      genre
    );
    results.push(result);
    totalRetries += retries;
  }
  return { results, totalRetries };
}

async function runParallel(
  batches: Paragraph[][],
  sourceLanguage: string,
  targetLanguage: string,
  textType: string | null,
  genre: string | null,
  concurrency: number
): Promise<{ results: Paragraph[][]; totalRetries: number }> {
  const results: Paragraph[][] = new Array(batches.length);
  let totalRetries = 0;
  let nextIdx = 0;
  async function worker() {
    while (true) {
      const myIdx = nextIdx++;
      if (myIdx >= batches.length) return;
      const { result, retries } = await translateBatchWithRetry(
        batches[myIdx],
        sourceLanguage,
        targetLanguage,
        textType,
        genre
      );
      results[myIdx] = result;
      totalRetries += retries;
    }
  }
  const workerCount = Math.min(concurrency, batches.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return { results, totalRetries };
}

// ============================================================
// Validation
// ============================================================
function validate(
  sourceParas: Paragraph[],
  batches: Paragraph[][],
  results: Paragraph[][]
): { ok: boolean; reason?: string; assembled: Paragraph[] } {
  if (results.length !== batches.length) {
    return { ok: false, reason: `Batch result count mismatch: ${results.length} vs ${batches.length}`, assembled: [] };
  }
  // Flatten results in batch order (which is already source order)
  const assembled: Paragraph[] = [];
  for (const r of results) assembled.push(...r);

  if (assembled.length !== sourceParas.length) {
    return { ok: false, reason: `Total para count: ${assembled.length} vs ${sourceParas.length}`, assembled };
  }
  // Order check via index field
  for (let i = 0; i < assembled.length; i++) {
    if (assembled[i].index !== sourceParas[i].index) {
      return {
        ok: false,
        reason: `Order mismatch at position ${i}: got index ${assembled[i].index}, expected ${sourceParas[i].index}`,
        assembled,
      };
    }
  }
  // No duplicates or drops (via Set of indices)
  const seen = new Set<number>();
  for (const p of assembled) {
    if (seen.has(p.index)) return { ok: false, reason: `Duplicate index ${p.index}`, assembled };
    seen.add(p.index);
  }
  for (const sp of sourceParas) {
    if (!seen.has(sp.index)) return { ok: false, reason: `Dropped index ${sp.index}`, assembled };
  }
  // Basic non-empty check on first paragraph
  if (!assembled[0].text || assembled[0].text.length < 3) {
    return { ok: false, reason: `First paragraph empty or too short`, assembled };
  }
  return { ok: true, assembled };
}

// ============================================================
// Main
// ============================================================
async function main() {
  const [slugArg, chapNumArg] = process.argv.slice(2);
  if (!slugArg || !chapNumArg) {
    console.error("Usage: pnpm tsx scripts/_test-paragraph-parallelism.ts <text-slug> <chapter-number>");
    process.exit(1);
  }
  const chapterNumber = parseInt(chapNumArg, 10);

  const sql = postgres(process.env.DATABASE_URL!);

  const rows = await sql`
    SELECT
      c.id,
      c.chapter_number,
      c.source_content,
      t.slug AS text_slug,
      t.text_type,
      t.genre,
      l.code AS source_lang
    FROM chapters c
    JOIN texts t ON t.id = c.text_id
    JOIN languages l ON l.id = t.language_id
    WHERE t.slug = ${slugArg} AND c.chapter_number = ${chapterNumber}
    LIMIT 1
  `;
  if (rows.length === 0) {
    console.error(`No chapter found: ${slugArg} ch${chapterNumber}`);
    await sql.end();
    process.exit(1);
  }
  const row = rows[0];
  const sourceContent = row.source_content as { paragraphs: Paragraph[] };
  const sourceParas = sourceContent.paragraphs;
  const sourceLanguage = row.source_lang as string;
  const textType = (row.text_type as string | null) ?? "prose";
  const genre = (row.genre as string | null) ?? null;
  const targetLanguage = "es";

  // Verify not already translated
  const existing = await sql`
    SELECT 1 FROM translations WHERE chapter_id = ${row.id} AND target_language = ${targetLanguage} AND current_version_id IS NOT NULL
  `;
  if (existing.length > 0) {
    console.error(`Chapter already translated in ${targetLanguage}. Pick a different one.`);
    await sql.end();
    process.exit(1);
  }

  const batches = chunkParagraphs(sourceParas, sourceLanguage);

  console.log("═".repeat(80));
  console.log(`TEST CHAPTER: ${slugArg} ch${chapterNumber}`);
  console.log(`  Source lang: ${sourceLanguage}  Text type: ${textType}  Genre: ${genre}`);
  console.log(`  Paragraphs: ${sourceParas.length}`);
  console.log(`  Batches: ${batches.length}`);
  console.log(`  Total chars: ${sourceParas.reduce((a, p) => a + p.text.length, 0)}`);
  console.log(`  Target: ${targetLanguage}`);
  console.log("═".repeat(80));

  // ─── Run 1: Serial ───
  console.log("\n▶ Run 1: SERIAL");
  const serial1Start = Date.now();
  let serial1: { results: Paragraph[][]; totalRetries: number };
  try {
    serial1 = await runSerial(batches, sourceLanguage, targetLanguage, textType, genre);
  } catch (err) {
    console.error(`  Serial run failed: ${(err as Error).message}`);
    await sql.end();
    process.exit(1);
  }
  const serial1Ms = Date.now() - serial1Start;
  const v1 = validate(sourceParas, batches, serial1.results);
  console.log(`  Time: ${(serial1Ms / 1000).toFixed(2)}s  Retries: ${serial1.totalRetries}  Valid: ${v1.ok ? "PASS" : "FAIL"}`);
  if (!v1.ok) console.log(`    reason: ${v1.reason}`);

  // ─── Run 2: Parallel (concurrency 3) ───
  console.log("\n▶ Run 2: PARALLEL (concurrency=3)");
  const par1Start = Date.now();
  let par1: { results: Paragraph[][]; totalRetries: number };
  try {
    par1 = await runParallel(batches, sourceLanguage, targetLanguage, textType, genre, 3);
  } catch (err) {
    console.error(`  Parallel run failed: ${(err as Error).message}`);
    await sql.end();
    process.exit(1);
  }
  const par1Ms = Date.now() - par1Start;
  const v2 = validate(sourceParas, batches, par1.results);
  console.log(`  Time: ${(par1Ms / 1000).toFixed(2)}s  Retries: ${par1.totalRetries}  Valid: ${v2.ok ? "PASS" : "FAIL"}`);
  if (!v2.ok) console.log(`    reason: ${v2.reason}`);

  // ─── Run 3: Serial again ───
  console.log("\n▶ Run 3: SERIAL (re-run for stability)");
  const serial2Start = Date.now();
  let serial2: { results: Paragraph[][]; totalRetries: number };
  try {
    serial2 = await runSerial(batches, sourceLanguage, targetLanguage, textType, genre);
  } catch (err) {
    console.error(`  Serial re-run failed: ${(err as Error).message}`);
    await sql.end();
    process.exit(1);
  }
  const serial2Ms = Date.now() - serial2Start;
  const v3 = validate(sourceParas, batches, serial2.results);
  console.log(`  Time: ${(serial2Ms / 1000).toFixed(2)}s  Retries: ${serial2.totalRetries}  Valid: ${v3.ok ? "PASS" : "FAIL"}`);
  if (!v3.ok) console.log(`    reason: ${v3.reason}`);

  // ─── Report ───
  console.log("\n" + "═".repeat(80));
  console.log("REPORT");
  console.log("═".repeat(80));
  const serialMedianMs = (serial1Ms + serial2Ms) / 2;
  const speedup = serialMedianMs / par1Ms;
  console.log(`  Serial (median of 2): ${(serialMedianMs / 1000).toFixed(2)}s`);
  console.log(`  Parallel (concurrency=3): ${(par1Ms / 1000).toFixed(2)}s`);
  console.log(`  SPEEDUP: ${speedup.toFixed(2)}×`);
  console.log();
  console.log(`  Serial avg batch latency: ${(serial1Ms / batches.length / 1000).toFixed(2)}s (includes BATCH_DELAY_MS)`);
  console.log(`  Parallel avg batch latency: ${(par1Ms / batches.length / 1000).toFixed(2)}s (wall-clock / batch count)`);
  console.log();
  console.log(`  Validation: serial1=${v1.ok ? "PASS" : "FAIL"}  parallel=${v2.ok ? "PASS" : "FAIL"}  serial2=${v3.ok ? "PASS" : "FAIL"}`);
  console.log(`  Total retries: serial1=${serial1.totalRetries}  parallel=${par1.totalRetries}  serial2=${serial2.totalRetries}`);
  console.log();
  const parValid = v2.ok;
  const parFastEnough = speedup >= 1.8;
  const lowRetries = par1.totalRetries / batches.length <= 2.0;
  const allPass = v1.ok && v2.ok && v3.ok && parValid && parFastEnough && lowRetries;
  console.log(`  Criterion 1 — Parallel correct: ${parValid ? "YES" : "NO"}`);
  console.log(`  Criterion 2 — Speedup ≥ 1.8×: ${parFastEnough ? "YES" : "NO"} (got ${speedup.toFixed(2)}×)`);
  console.log(`  Criterion 3 — Retries acceptable: ${lowRetries ? "YES" : "NO"} (${par1.totalRetries} retries / ${batches.length} batches)`);
  console.log();
  console.log(`  DECISION: ${allPass ? "SAFE TO IMPLEMENT" : "NOT SAFE — investigate"}`);
  console.log("═".repeat(80));

  // Print a tiny sample of the parallel output to eyeball
  console.log("\nSample of parallel output (first 3 paragraphs):");
  const assembled = v2.assembled;
  for (let i = 0; i < Math.min(3, assembled.length); i++) {
    const snippet = assembled[i].text.slice(0, 120).replace(/\n/g, " ");
    console.log(`  [${assembled[i].index}] ${snippet}${assembled[i].text.length > 120 ? "..." : ""}`);
  }

  await sql.end();
  process.exit(allPass ? 0 : 2);
}

main().catch((err) => {
  console.error("Test harness failed:", err);
  process.exit(1);
});
