/**
 * Fetches all 140 chapters of Zhu Zi Yu Lei (朱子語類) from the ctext.org API.
 *
 * Usage: pnpm acquire:ctext [--start N] [--end N] [--delay MS]
 *
 * The API returns JSON: { title: string, fulltext: string[] }
 * Each chapter is saved as data/raw/zhuzi-yulei/chapter-NNN.json
 */

import fs from "fs";
import path from "path";

const API_BASE = "https://api.ctext.org/gettext";
const TEXT_URN = "ctp:zhuzi-yulei";
const TOTAL_CHAPTERS = 140;
const OUTPUT_DIR = path.resolve("data/raw/zhuzi-yulei");
const DEFAULT_DELAY_MS = 2000; // 2 seconds between requests to respect rate limits

interface CtextResponse {
  title: string;
  fulltext: string[];
  error?: string;
  code?: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let start = 1;
  let end = TOTAL_CHAPTERS;
  let delay = DEFAULT_DELAY_MS;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--start" && args[i + 1]) start = parseInt(args[i + 1]);
    if (args[i] === "--end" && args[i + 1]) end = parseInt(args[i + 1]);
    if (args[i] === "--delay" && args[i + 1]) delay = parseInt(args[i + 1]);
  }

  return { start, end, delay };
}

async function fetchChapter(
  chapterNumber: number,
  apiKey?: string
): Promise<CtextResponse> {
  const urn = `${TEXT_URN}/${chapterNumber}`;
  const params = new URLSearchParams({ urn });
  if (apiKey) params.set("apikey", apiKey);

  const url = `${API_BASE}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for chapter ${chapterNumber}`);
  }

  return response.json() as Promise<CtextResponse>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { start, end, delay } = parseArgs();
  const apiKey = process.env.CTEXT_API_KEY;

  if (apiKey) {
    console.log("Using API key for authenticated access");
  } else {
    console.log("No CTEXT_API_KEY set — using unauthenticated access (may hit rate limits sooner)");
  }

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Fetching chapters ${start}–${end} of ${TEXT_URN}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Delay between requests: ${delay}ms\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let chapter = start; chapter <= end; chapter++) {
    const outputFile = path.join(
      OUTPUT_DIR,
      `chapter-${String(chapter).padStart(3, "0")}.json`
    );

    // Skip if already downloaded
    if (fs.existsSync(outputFile)) {
      const existing = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
      if (existing.fulltext && existing.fulltext.length > 0) {
        skipCount++;
        process.stdout.write(`  [${chapter}/${end}] Skipped (already exists)\r`);
        continue;
      }
    }

    try {
      const data = await fetchChapter(chapter, apiKey);

      if (data.code) {
        // API returned an error code
        if (data.code === "ERR_REQUEST_LIMIT") {
          console.log(`\n  Rate limited at chapter ${chapter}. Waiting 30s...`);
          await sleep(30000);
          // Retry once
          const retry = await fetchChapter(chapter, apiKey);
          if (retry.code) {
            console.error(`  Still rate limited. Stopping at chapter ${chapter}.`);
            console.log(`  Resume with: pnpm acquire:ctext -- --start ${chapter}`);
            break;
          }
          fs.writeFileSync(outputFile, JSON.stringify(retry, null, 2), "utf-8");
          successCount++;
        } else {
          console.error(`\n  Error for chapter ${chapter}: ${data.code}`);
          errorCount++;
        }
      } else if (data.fulltext && data.fulltext.length > 0) {
        fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), "utf-8");
        successCount++;
        process.stdout.write(
          `  [${chapter}/${end}] ${data.title} — ${data.fulltext.length} paragraphs\n`
        );
      } else {
        console.warn(`\n  Chapter ${chapter}: no fulltext returned`);
        errorCount++;
      }

      // Delay between requests
      if (chapter < end) {
        await sleep(delay);
      }
    } catch (error) {
      console.error(`\n  Failed to fetch chapter ${chapter}:`, error);
      errorCount++;
      // Continue to next chapter
    }
  }

  console.log(`\nDone: ${successCount} fetched, ${skipCount} skipped, ${errorCount} errors`);
}

main().catch(console.error);
