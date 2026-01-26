/**
 * Processes Dongzhou Lieguo Zhi (東周列國志) raw text into structured JSON.
 *
 * Source: 108 chapter files in data/raw/dongzhou_lieguo_zhi/
 * Author: Feng Menglong (馮夢龍, 1574-1646)
 *
 * The raw file structure:
 * - One file per chapter: NNN_第N回.txt
 * - Each chapter contains: opening poem (詞曰/詩曰), chapter title line, prose narrative
 * - Chapters end with "不知...，再看下回分解" formula
 *
 * Each file becomes one chapter with paragraphs split on blank lines.
 *
 * Usage: pnpm tsx scripts/process-dongzhou-lieguo-zhi.ts
 */

import fs from "fs";
import path from "path";

const RAW_DIR = path.resolve("data/raw/dongzhou_lieguo_zhi");
const OUTPUT_DIR = path.resolve("data/processed/dongzhou-lieguo-zhi");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

function extractChapterNumber(filename: string): number {
  // Filenames are like: 001_第一回.txt, 100_第一百回.txt, 101_第百零一回.txt
  const match = filename.match(/^(\d+)_/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
}

function extractChapterTitle(content: string, chapterNum: number): string {
  // Look for the chapter title line: 第N回　TITLE
  // The title line has the pattern: 第X回 followed by the title (often with 　 full-width space)
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    // Match patterns like "第一回　周宣王聞謠輕殺　杜大夫化厲鳴寃"
    if (trimmed.match(/^第[\u4e00-\u9fa5]+回[　\s]/)) {
      return `${trimmed} (Chapter ${chapterNum})`;
    }
  }

  // Fallback: use chapter number only
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
  console.log("Processing Dongzhou Lieguo Zhi (東周列國志)...\n");

  // Get all chapter files
  const files = fs.readdirSync(RAW_DIR)
    .filter(f => f.endsWith(".txt"))
    .sort((a, b) => extractChapterNumber(a) - extractChapterNumber(b));

  console.log(`Found ${files.length} chapter files\n`);

  // Create output directory
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

    const title = extractChapterTitle(content, chapterNum);
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
