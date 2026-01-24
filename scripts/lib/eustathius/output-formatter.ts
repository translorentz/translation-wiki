/**
 * Output Formatter for Eustathius Commentary on Homer's Odyssey.
 *
 * Writes extracted commentary into standard chapter JSON files
 * and raw text files.
 */

import fs from "fs";
import path from "path";
import type { ExtractedCommentary, ProcessedChapter } from "./types.js";

const PROCESSED_DIR = path.resolve("data/processed/eustathius-odyssey");
const RAW_DIR = path.resolve("data/raw/eustathius-odyssey");

/**
 * Format extracted commentary into a ProcessedChapter.
 */
export function formatChapter(commentary: ExtractedCommentary): ProcessedChapter {
  return {
    chapterNumber: commentary.chapterNumber,
    title: commentary.title,
    sourceContent: {
      paragraphs: commentary.paragraphs,
    },
  };
}

/**
 * Write a processed chapter JSON to disk.
 */
export function writeChapterJSON(chapter: ProcessedChapter): string {
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });

  const fileName = `chapter-${String(chapter.chapterNumber).padStart(3, "0")}.json`;
  const filePath = path.join(PROCESSED_DIR, fileName);

  fs.writeFileSync(filePath, JSON.stringify(chapter, null, 2) + "\n");

  return filePath;
}

/**
 * Write a raw text file (paragraphs separated by blank lines).
 */
export function writeChapterTxt(commentary: ExtractedCommentary): string {
  fs.mkdirSync(RAW_DIR, { recursive: true });

  const chapterNum = String(commentary.chapterNumber).padStart(2, "0");
  const slug = commentary.chapterNumber === 0
    ? "preface-prooemium"
    : `odyssey-book-${commentary.chapterNumber}`;
  const fileName = `chapter-${chapterNum}-${slug}.txt`;
  const filePath = path.join(RAW_DIR, fileName);

  const lines: string[] = [];
  lines.push(commentary.title);
  lines.push("Eustathius of Thessalonica");
  lines.push("");

  for (const para of commentary.paragraphs) {
    lines.push(para.text);
    lines.push("");
  }

  fs.writeFileSync(filePath, lines.join("\n"));

  return filePath;
}

export { PROCESSED_DIR, RAW_DIR };
