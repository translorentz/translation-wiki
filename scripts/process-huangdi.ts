/**
 * Processes the Huang Di Nei Jing (黃帝內經) raw text into structured JSON.
 *
 * The raw files are named: NNN_素問_Su_Wen_ChineseTitle.txt
 * Each file contains:
 * - Line 1: Chapter title in Chinese
 * - Line 2: === separator
 * - Then repeating blocks of: section header + blank + content paragraph + blank
 *
 * The section headers (e.g. "上古天真... :" or "五藏生成:") are stripped.
 * Each content paragraph becomes one entry in the output.
 *
 * Usage: pnpm tsx scripts/process-huangdi.ts
 */

import fs from "fs";
import path from "path";

const RAW_DIR = path.resolve("data/raw/huang_di_nei_jing");
const OUTPUT_DIR = path.resolve("data/processed/huangdineijing");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

function main() {
  const files = fs
    .readdirSync(RAW_DIR)
    .filter((f) => f.endsWith(".txt"))
    .sort();

  console.log(`Found ${files.length} chapter files`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const file of files) {
    const raw = fs.readFileSync(path.join(RAW_DIR, file), "utf-8");
    const lines = raw.split("\n");

    // Extract chapter number from filename: NNN_素問_Su_Wen_Title.txt
    const match = file.match(/^(\d+)_素問_Su_Wen_(.+)\.txt$/);
    if (!match) {
      console.log(`  [skip] ${file}: unexpected filename format`);
      continue;
    }

    const chapterNumber = parseInt(match[1], 10);
    const chineseTitle = lines[0].trim(); // First line is the title

    // Build bilingual title: "Chinese (Pinyin transliteration)"
    // The filename has the pinyin-ish romanization in the title part
    const title = `${chineseTitle} (Su Wen Chapter ${chapterNumber})`;

    // Extract content paragraphs (skip title, ===, and section headers)
    const paragraphs: { index: number; text: string }[] = [];
    let paragraphIndex = 1;

    for (let i = 2; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // Skip blank lines
      if (!trimmed) continue;

      // Skip the === separator
      if (trimmed === "===") continue;

      // Skip section headers (short lines ending with : or containing ...)
      if (trimmed.endsWith(":") || trimmed.endsWith("... :")) continue;

      // This is a content paragraph
      paragraphs.push({ index: paragraphIndex, text: trimmed });
      paragraphIndex++;
    }

    const chapter: ProcessedChapter = {
      chapterNumber,
      title,
      sourceContent: { paragraphs },
    };

    const fileName = `chapter-${String(chapterNumber).padStart(3, "0")}.json`;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, fileName),
      JSON.stringify(chapter, null, 2) + "\n"
    );

    console.log(
      `  Chapter ${chapterNumber}: "${chineseTitle}" — ${paragraphs.length} paragraphs → ${fileName}`
    );
  }

  console.log(`\nDone. Output: ${OUTPUT_DIR}`);
}

main();
