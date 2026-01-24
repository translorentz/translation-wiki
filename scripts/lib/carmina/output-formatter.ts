/**
 * Output Formatter for Carmina Graeca Medii Aevi.
 *
 * Writes extracted verse into standard chapter JSON files.
 */

import fs from "fs";
import path from "path";
import type { ExtractedVerse, ProcessedChapter } from "./types.js";

const OUTPUT_DIR = path.resolve("data/processed/carmina-graeca");

/**
 * Format extracted verse into a ProcessedChapter.
 */
export function formatChapter(verse: ExtractedVerse): ProcessedChapter {
  return {
    chapterNumber: verse.chapterNumber,
    title: verse.title,
    sourceContent: {
      paragraphs: verse.paragraphs,
    },
  };
}

/**
 * Write a processed chapter to disk.
 */
export function writeChapter(chapter: ProcessedChapter): string {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const fileName = `chapter-${String(chapter.chapterNumber).padStart(3, "0")}.json`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  fs.writeFileSync(filePath, JSON.stringify(chapter, null, 2) + "\n");

  return filePath;
}

/**
 * Write all chapters.
 */
export function writeAllChapters(chapters: ProcessedChapter[]): string[] {
  return chapters.map(writeChapter);
}

export { OUTPUT_DIR };
