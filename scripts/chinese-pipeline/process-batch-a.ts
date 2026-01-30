/**
 * Process Batch A: Convert raw scraped text files into chapter JSONs.
 * Reads from data/raw/<slug>/ and writes to data/processed/<slug>/
 */

import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const RAW_DIR = path.join(PROJECT_ROOT, "data", "raw");
const PROCESSED_DIR = path.join(PROJECT_ROOT, "data", "processed");
const LOG_FILE = "/tmp/chinese-processor-a.log";

const AGENT_A_SLUGS = [
  "huayue-hen", "sui-tang-yanyi", "taoan-mengyi", "xianqing-ouji",
  "xiaolin-guangji", "suiyuan-shihua", "shipin", "qianfu-lun",
  "rongzhai-suibi", "kunxue-jiwen", "youyang-zazu", "laoxuean-biji",
  "dongjing-menghua-lu", "chibei-outan", "shuijing-zhu", "qimin-yaoshu",
  "fenshu",
];

function log(msg: string) {
  const line = `${new Date().toISOString()} [PROCESS] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function splitIntoParagraphs(text: string): string[] {
  // Split on double newlines, filter empty
  const parts = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);

  // If we got only 1 paragraph and it's very long, try splitting on single newlines
  if (parts.length === 1 && parts[0].length > 2000) {
    const singleSplit = text.split(/\n/).map(p => p.trim()).filter(p => p.length > 0);
    if (singleSplit.length > 1) {
      return singleSplit;
    }
  }

  return parts;
}

function processText(slug: string) {
  const rawDir = path.join(RAW_DIR, slug);
  const outDir = path.join(PROCESSED_DIR, slug);

  if (!fs.existsSync(rawDir)) {
    log(`  No raw directory for ${slug}, skipping`);
    return 0;
  }

  // Read all .txt files, sort by numeric prefix
  const files = fs.readdirSync(rawDir)
    .filter(f => f.endsWith(".txt"))
    .sort((a, b) => {
      const numA = parseInt(a.split("_")[0], 10);
      const numB = parseInt(b.split("_")[0], 10);
      return numA - numB;
    });

  if (files.length === 0) {
    log(`  No .txt files in ${rawDir}`);
    return 0;
  }

  fs.mkdirSync(outDir, { recursive: true });

  let count = 0;
  for (const file of files) {
    const numStr = file.split("_")[0];
    const chapterNum = parseInt(numStr, 10);
    if (isNaN(chapterNum)) {
      log(`  Skipping non-numeric file: ${file}`);
      continue;
    }

    const rawText = fs.readFileSync(path.join(rawDir, file), "utf-8");

    // Extract title from filename (between NNN_ and .txt)
    const titleMatch = file.match(/^\d+_(.+)\.txt$/);
    const title = titleMatch ? titleMatch[1] : `Chapter ${chapterNum}`;

    const paragraphs = splitIntoParagraphs(rawText);

    if (paragraphs.length === 0) {
      log(`  Empty content for ${slug} chapter ${chapterNum}`);
      continue;
    }

    const chapterJson = {
      chapterNumber: chapterNum,
      title: title,
      sourceContent: {
        paragraphs: paragraphs.map((text, i) => ({
          index: i + 1,
          text: text,
        })),
      },
    };

    const outFile = path.join(outDir, `chapter-${String(chapterNum).padStart(3, "0")}.json`);
    fs.writeFileSync(outFile, JSON.stringify(chapterJson, null, 2), "utf-8");
    count++;
  }

  log(`  ${slug}: processed ${count} chapters`);
  return count;
}

function main() {
  log("=".repeat(60));
  log("Process Batch A - Starting");
  log("=".repeat(60));

  let total = 0;
  for (const slug of AGENT_A_SLUGS) {
    log(`Processing ${slug}...`);
    try {
      const count = processText(slug);
      total += count;
    } catch (e) {
      log(`  ERROR processing ${slug}: ${e}`);
    }
  }

  log(`Total chapters processed: ${total}`);
  log("=".repeat(60));
}

main();
