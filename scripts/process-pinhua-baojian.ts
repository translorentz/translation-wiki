/**
 * Processes Pinhua Baojian (品花寶鑑) raw text into structured JSON.
 *
 * Source: 60 chapter files in data/raw/pinhua_baojian/
 * Author: Chen Sen (陳森), c. 1849
 *
 * Raw file structure:
 * - One file per chapter: NNN_第N回.txt
 * - Each chapter contains prose narrative split by blank lines
 *
 * Each file becomes one chapter with paragraphs split on blank lines.
 *
 * Usage: pnpm tsx scripts/process-pinhua-baojian.ts
 */

import fs from "fs";
import path from "path";

const RAW_DIR = path.resolve("data/raw/pinhua_baojian");
const OUTPUT_DIR = path.resolve("data/processed/pinhua-baojian");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

function extractChapterNumber(filename: string): number {
  const match = filename.match(/^(\d+)_/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
}

function extractChapterTitle(filename: string, chapterNum: number): string {
  // Extract title from filename: "001_第一回.txt" → "第一回"
  const match = filename.match(/^\d+_(.+)\.txt$/);
  if (match) {
    return `${match[1]} (Chapter ${chapterNum})`;
  }
  return `第${chapterNum}回 (Chapter ${chapterNum})`;
}

function splitIntoParagraphs(content: string): { index: number; text: string }[] {
  const paragraphs: { index: number; text: string }[] = [];

  // Split on blank lines (one or more empty lines)
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
  console.log("Processing Pinhua Baojian (品花寶鑑)...\n");

  const files = fs.readdirSync(RAW_DIR)
    .filter(f => f.endsWith(".txt"))
    .sort((a, b) => extractChapterNumber(a) - extractChapterNumber(b));

  console.log(`Found ${files.length} chapter files\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalParagraphs = 0;
  let totalChars = 0;

  for (const file of files) {
    const chapterNum = extractChapterNumber(file);
    if (chapterNum === 0) {
      console.log(`  SKIP: ${file} (cannot extract chapter number)`);
      continue;
    }

    const filePath = path.join(RAW_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");

    const title = extractChapterTitle(file, chapterNum);
    const paragraphs = splitIntoParagraphs(content);

    const chapter: ProcessedChapter = {
      chapterNumber: chapterNum,
      title,
      sourceContent: { paragraphs },
    };

    const outFileName = `chapter-${String(chapterNum).padStart(3, "0")}.json`;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, outFileName),
      JSON.stringify(chapter, null, 2) + "\n"
    );

    const charCount = paragraphs.reduce((sum, p) => sum + p.text.length, 0);
    totalParagraphs += paragraphs.length;
    totalChars += charCount;

    console.log(
      `  Chapter ${chapterNum}: ${paragraphs.length} paragraphs, ${charCount.toLocaleString()} chars → ${outFileName}`
    );
  }

  console.log(`\n========================================`);
  console.log(`Processing complete!`);
  console.log(`  Total chapters: ${files.length}`);
  console.log(`  Total paragraphs: ${totalParagraphs}`);
  console.log(`  Total characters: ${totalChars.toLocaleString()}`);
  console.log(`  Output: ${OUTPUT_DIR}`);
  console.log(`========================================\n`);
}

main();
