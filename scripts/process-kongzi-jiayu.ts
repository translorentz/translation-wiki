/**
 * Processes the Kongzi Jiayu (孔子家語) raw text into structured JSON.
 *
 * The raw files are 10 volume files (卷一 through 卷十) containing 44 chapters total.
 * File naming does NOT match volume order — the correct mapping is hardcoded below.
 *
 * Each volume file contains chapters separated by:
 *   ====================
 *   章節名第N
 *   ====================
 *
 * Processing steps:
 * - Split each volume into chapters on the separator pattern
 * - Strip [bracket] annotations (editorial commentary)
 * - Strip angle-bracket annotations (〈...〉)
 * - Split chapter content into paragraphs on blank lines
 * - Output numbered JSON files to data/processed/kongzi-jiayu/
 *
 * Usage: pnpm tsx scripts/process-kongzi-jiayu.ts
 */

import fs from "fs";
import path from "path";

const RAW_DIR = path.resolve("data/raw/kongzi_jiayu");
const OUTPUT_DIR = path.resolve("data/processed/kongzi-jiayu");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

// Files in correct volume order (file numbering does NOT match volume order)
const VOLUME_FILES = [
  "01_卷一.txt", // Volume 1: Chapters 1-7
  "05_卷二.txt", // Volume 2: Chapters 8-10
  "03_卷三.txt", // Volume 3: Chapters 11-14
  "10_卷四.txt", // Volume 4: Chapters 15-16
  "06_卷五.txt", // Volume 5: Chapters 17-23
  "08_卷六.txt", // Volume 6: Chapters 24-27
  "02_卷七.txt", // Volume 7: Chapters 28-32
  "07_卷八.txt", // Volume 8: Chapters 33-37
  "04_卷九.txt", // Volume 9: Chapters 38-39
  "09_卷十.txt", // Volume 10: Chapters 40-44
];

/**
 * Strip [bracket] annotations from text.
 * Handles nested brackets and multi-line annotations.
 */
function stripBracketAnnotations(text: string): string {
  // Remove all [...] annotations (possibly spanning multiple characters)
  return text.replace(/\[[^\]]*\]/g, "");
}

/**
 * Strip 〈angle bracket〉 annotations from text.
 */
function stripAngleBracketAnnotations(text: string): string {
  return text.replace(/〈[^〉]*〉/g, "");
}

/**
 * Parse a volume file into individual chapters.
 * Returns an array of { title, content } objects.
 */
function parseVolume(
  rawContent: string
): { title: string; content: string }[] {
  const chapters: { title: string; content: string }[] = [];

  // Split on the separator pattern: ====================
  const sections = rawContent.split(/={20,}/);

  // The pattern is: [preamble] === title === content === title === content ...
  // After splitting on ===, we get: [preamble, title, content, title, content, ...]
  // But the first element may be empty or contain volume-level text

  let i = 0;
  // Skip any leading content before the first separator
  if (sections.length > 0 && !sections[0].trim().match(/第[一二三四五六七八九十百千]+$/)) {
    i = 1;
  }

  while (i < sections.length) {
    const titleSection = sections[i].trim();
    i++;

    // Skip empty sections
    if (!titleSection) continue;

    // Check if this looks like a chapter title (contains 第N)
    if (titleSection.match(/第[一二三四五六七八九十百千萬]+/)) {
      // Next section is the content
      const content = i < sections.length ? sections[i].trim() : "";
      i++;

      chapters.push({
        title: titleSection,
        content: content,
      });
    }
  }

  return chapters;
}

/**
 * Process chapter content into paragraphs.
 * - Strip annotations
 * - Split on blank lines
 * - Filter out empty paragraphs
 */
function processContent(
  content: string
): { index: number; text: string }[] {
  // Strip bracket annotations
  let cleaned = stripBracketAnnotations(content);

  // Strip angle bracket annotations
  cleaned = stripAngleBracketAnnotations(cleaned);

  // Split into lines, then group into paragraphs by blank lines
  const lines = cleaned.split("\n");
  const paragraphs: { index: number; text: string }[] = [];
  let currentParagraph: string[] = [];
  let paragraphIndex = 1;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      // Blank line — flush current paragraph
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join("").trim();
        if (text) {
          paragraphs.push({ index: paragraphIndex, text });
          paragraphIndex++;
        }
        currentParagraph = [];
      }
    } else {
      currentParagraph.push(trimmed);
    }
  }

  // Flush final paragraph
  if (currentParagraph.length > 0) {
    const text = currentParagraph.join("").trim();
    if (text) {
      paragraphs.push({ index: paragraphIndex, text });
    }
  }

  return paragraphs;
}

function main() {
  console.log("Processing Kongzi Jiayu (孔子家語)...\n");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let globalChapterNumber = 0;
  let totalParagraphs = 0;

  for (const volumeFile of VOLUME_FILES) {
    const filePath = path.join(RAW_DIR, volumeFile);

    if (!fs.existsSync(filePath)) {
      console.error(`  [ERROR] File not found: ${filePath}`);
      process.exit(1);
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const chapters = parseVolume(raw);

    console.log(`${volumeFile}: ${chapters.length} chapters`);

    for (const chapter of chapters) {
      globalChapterNumber++;

      const paragraphs = processContent(chapter.content);
      totalParagraphs += paragraphs.length;

      const processed: ProcessedChapter = {
        chapterNumber: globalChapterNumber,
        title: chapter.title,
        sourceContent: { paragraphs },
      };

      const fileName = `chapter-${String(globalChapterNumber).padStart(3, "0")}.json`;
      fs.writeFileSync(
        path.join(OUTPUT_DIR, fileName),
        JSON.stringify(processed, null, 2) + "\n"
      );

      console.log(
        `  Chapter ${globalChapterNumber}: "${chapter.title}" — ${paragraphs.length} paragraphs → ${fileName}`
      );
    }
  }

  console.log(`\nDone. ${globalChapterNumber} chapters, ${totalParagraphs} total paragraphs.`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

main();
