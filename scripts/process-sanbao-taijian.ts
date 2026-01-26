/**
 * Processes Sanbao Taijian Xiyang Ji (三寶太監下西洋記) raw text into structured JSON.
 *
 * Source: 100 chapter files in data/raw/sanbao_taijian_xiyang_ji/
 * Author: Luo Maodeng (羅懋登, fl. 1597)
 *
 * The raw file structure:
 * - One file per chapter: NNN_第N回[TITLE].txt (title embedded in filename)
 * - Each chapter contains: opening ci/poem, prose narrative
 *
 * Each file becomes one chapter with paragraphs split on blank lines.
 *
 * Usage: pnpm tsx scripts/process-sanbao-taijian.ts
 */

import fs from "fs";
import path from "path";

const RAW_DIR = path.resolve("data/raw/sanbao_taijian_xiyang_ji");
const OUTPUT_DIR = path.resolve("data/processed/sanbao-taijian-xiyang-ji");

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
  // Filename format: 001_第一回盂蘭盆佛爺揭諦補陀山菩薩會神.txt
  // Extract the Chinese title after "第X回"
  const match = filename.match(/^\d+_(第[\u4e00-\u9fa5]+回.+)\.txt$/);
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
  console.log("Processing Sanbao Taijian Xiyang Ji (三寶太監下西洋記)...\n");

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
