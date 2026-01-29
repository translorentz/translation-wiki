/**
 * Processes Nancun Chuogeng Lu (南村輟耕錄) raw text into structured JSON.
 *
 * Source: 30 volume files in data/raw/nancun_chuogeng_lu/
 * Author: Tao Zongyi (陶宗儀, c. 1329-1412)
 *
 * This is a Yuan-dynasty biji (筆記) miscellany. Each volume contains
 * multiple independent entries on diverse topics (history, arts, customs, etc.).
 * Entries are separated by blank lines, with a short title heading per entry.
 *
 * Each volume file becomes one chapter. Entries within a volume become
 * paragraphs (preserving blank-line separation as paragraph boundaries).
 *
 * Usage: pnpm tsx scripts/process-nancun-chuogeng-lu.ts
 */

import fs from "fs";
import path from "path";

const RAW_DIR = path.resolve("data/raw/nancun_chuogeng_lu");
const OUTPUT_DIR = path.resolve("data/processed/nancun-chuogeng-lu");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

function extractVolumeNumber(filename: string): number {
  const match = filename.match(/^(\d+)_/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
}

function extractVolumeTitle(filename: string, volNum: number): string {
  // Extract Chinese volume title from filename: "01_卷一.txt" → "卷一"
  const match = filename.match(/^\d+_(.+)\.txt$/);
  const chineseTitle = match ? match[1] : `卷${volNum}`;
  return `${chineseTitle} (Volume ${volNum})`;
}

function splitIntoParagraphs(content: string): { index: number; text: string }[] {
  const paragraphs: { index: number; text: string }[] = [];

  // Split on blank lines
  const blocks = content.split(/\n\s*\n/);

  let index = 1;
  for (const block of blocks) {
    const text = block.trim();
    if (text) {
      paragraphs.push({ index, text });
      index++;
    }
  }

  return paragraphs;
}

function main() {
  console.log("Processing Nancun Chuogeng Lu (南村輟耕錄)...\n");

  const files = fs.readdirSync(RAW_DIR)
    .filter(f => f.endsWith(".txt"))
    .sort((a, b) => extractVolumeNumber(a) - extractVolumeNumber(b));

  console.log(`Found ${files.length} volume files\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalParagraphs = 0;
  let totalChars = 0;

  for (const file of files) {
    const volNum = extractVolumeNumber(file);
    if (volNum === 0) {
      console.log(`  SKIP: ${file} (cannot extract volume number)`);
      continue;
    }

    const filePath = path.join(RAW_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");

    const title = extractVolumeTitle(file, volNum);
    const paragraphs = splitIntoParagraphs(content);

    const chapter: ProcessedChapter = {
      chapterNumber: volNum,
      title,
      sourceContent: { paragraphs },
    };

    const outFileName = `chapter-${String(volNum).padStart(3, "0")}.json`;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, outFileName),
      JSON.stringify(chapter, null, 2) + "\n"
    );

    const charCount = paragraphs.reduce((sum, p) => sum + p.text.length, 0);
    totalParagraphs += paragraphs.length;
    totalChars += charCount;

    console.log(
      `  Volume ${volNum}: ${paragraphs.length} paragraphs, ${charCount.toLocaleString()} chars → ${outFileName}`
    );
  }

  console.log(`\n========================================`);
  console.log(`Processing complete!`);
  console.log(`  Total volumes: ${files.length}`);
  console.log(`  Total paragraphs: ${totalParagraphs}`);
  console.log(`  Total characters: ${totalChars.toLocaleString()}`);
  console.log(`  Output: ${OUTPUT_DIR}`);
  console.log(`========================================\n`);
}

main();
