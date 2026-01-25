/**
 * Processes Raffi's Samvel raw text files into structured JSON.
 *
 * Input: data/raw/samvel/Book{1,2,3}_NNN_X.txt files
 *   - Book1: Chapters 1-21 (21 files)
 *   - Book2: Chapters 22-35 (14 files)
 *   - Book3: Chapters 36-41 (6 files)
 *   - Total: 41 chapters
 *   - Filenames: Book{1,2,3}_NNN_[Armenian numeral].txt
 *
 * Output: data/processed/samvel/chapter-NNN.json
 *
 * Text structure:
 *   - Line 1: Armenian chapter numeral (e.g., Ա, ԺԱ, etc.)
 *   - Line 2: Chapter title in Armenian (e.g., ԵՐdelays Սdelays)
 *   - Lines 3+: Each line is a paragraph (one line = one paragraph)
 *   - Lines containing only dots or whitespace may be section separators
 *
 * Historical context:
 *   Samvel is a historical novel set in 4th-century Armenia during the struggle
 *   against Persian domination, depicting the conflict between Christianity and
 *   Zoroastrianism. It is one of Raffi's masterpieces alongside Kaytser and Davit Bek.
 *
 * Usage: pnpm tsx scripts/process-samvel.ts
 */

import fs from "fs";
import path from "path";

const RAW_DIR = "data/raw/samvel";
const OUTPUT_DIR = "data/processed/samvel";

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

/**
 * Extract chapter number from filename (Book1_001, Book2_022, Book3_036)
 * The number in the filename is the global chapter number (1-41)
 */
function extractChapterNumber(filename: string): number {
  const match = filename.match(/Book[123]_(\d{3})_/);
  if (!match) {
    throw new Error(`Cannot extract chapter number from: ${filename}`);
  }
  return parseInt(match[1], 10);
}

/**
 * Extract book number from filename
 */
function extractBookNumber(filename: string): number {
  const match = filename.match(/Book([123])_/);
  if (!match) {
    throw new Error(`Cannot extract book number from: ${filename}`);
  }
  return parseInt(match[1], 10);
}

/**
 * Check if a line should be skipped (empty, whitespace only, or section separator)
 */
function isSkippableLine(line: string): boolean {
  const trimmed = line.trim();
  // Skip empty lines
  if (trimmed === "") return true;
  // Skip lines that are just dots (section separators like ". ")
  if (/^[.\s]+$/.test(trimmed)) return true;
  return false;
}

/**
 * Process a single chapter file into structured JSON.
 * Each line is treated as a separate paragraph.
 */
function processChapter(filePath: string): ProcessedChapter {
  const filename = path.basename(filePath);
  const chapterNumber = extractChapterNumber(filename);
  const bookNumber = extractBookNumber(filename);

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Find the first non-empty line (Armenian numeral)
  let startIdx = 0;
  while (startIdx < lines.length && isSkippableLine(lines[startIdx])) {
    startIdx++;
  }

  // Line at startIdx is the Armenian numeral (e.g., " Delays" for chapter 1)
  // Line at startIdx+1 is the title (e.g., "DELAYS DELAYS")
  const armenianNumeral = lines[startIdx]?.trim() || "";
  const armenianTitle = lines[startIdx + 1]?.trim() || "";

  // Create chapter title with book info: "Book N, Ch X. Title"
  // The Armenian numeral in later books restarts (Book 2 starts with I, II or Ա, Բ)
  const title = `Book ${bookNumber}, ${armenianNumeral}. ${armenianTitle}`;

  // Content starts from startIdx+2
  const contentLines = lines.slice(startIdx + 2);

  const paragraphs: { index: number; text: string }[] = [];

  for (const line of contentLines) {
    // Skip empty/separator lines
    if (isSkippableLine(line)) continue;

    let text = line.trim();

    // Skip very short lines that are likely artifacts (single char markers)
    if (text.length <= 1 && !/[Ա-Ֆա-ֆ]/.test(text)) continue;

    // Each line is a separate paragraph
    paragraphs.push({
      index: paragraphs.length,
      text,
    });
  }

  return {
    chapterNumber,
    title,
    sourceContent: { paragraphs },
  };
}

/**
 * Main processing function
 */
async function main() {
  console.log("=== Processing Raffi's Samvel ===\n");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Read all chapter files from raw directory
  const files = fs
    .readdirSync(RAW_DIR)
    .filter((f) => f.match(/^Book[123]_\d{3}_.*\.txt$/))
    .sort();

  console.log(`Found ${files.length} chapter files\n`);

  let totalParagraphs = 0;
  let totalCharacters = 0;
  const chapters: ProcessedChapter[] = [];

  // Track stats by book
  const bookStats: { [key: number]: { chapters: number; paragraphs: number; chars: number } } = {
    1: { chapters: 0, paragraphs: 0, chars: 0 },
    2: { chapters: 0, paragraphs: 0, chars: 0 },
    3: { chapters: 0, paragraphs: 0, chars: 0 },
  };

  for (const file of files) {
    const filePath = path.join(RAW_DIR, file);

    try {
      const chapter = processChapter(filePath);
      chapters.push(chapter);

      const paraCount = chapter.sourceContent.paragraphs.length;
      const charCount = chapter.sourceContent.paragraphs.reduce(
        (sum, p) => sum + p.text.length,
        0
      );

      totalParagraphs += paraCount;
      totalCharacters += charCount;

      // Track by book
      const bookNum = extractBookNumber(file);
      bookStats[bookNum].chapters++;
      bookStats[bookNum].paragraphs += paraCount;
      bookStats[bookNum].chars += charCount;

      // Write output JSON
      const outFile = path.join(OUTPUT_DIR, `chapter-${chapter.chapterNumber}.json`);
      fs.writeFileSync(outFile, JSON.stringify(chapter, null, 2), "utf-8");

      console.log(
        `  Ch ${String(chapter.chapterNumber).padStart(2)}: ${paraCount} paragraphs, ${charCount.toLocaleString()} chars — ${chapter.title.substring(0, 60)}...`
      );
    } catch (err) {
      console.error(`  ERROR processing ${file}:`, err);
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Total Chapters: ${chapters.length}`);
  console.log(`Total Paragraphs: ${totalParagraphs.toLocaleString()}`);
  console.log(`Total Characters: ${totalCharacters.toLocaleString()}`);
  console.log(`Average Paragraphs/Chapter: ${Math.round(totalParagraphs / chapters.length)}`);
  console.log(`Average Characters/Chapter: ${Math.round(totalCharacters / chapters.length).toLocaleString()}`);

  console.log("\n=== By Book ===");
  for (const [book, stats] of Object.entries(bookStats)) {
    console.log(
      `  Book ${book}: ${stats.chapters} chapters, ${stats.paragraphs.toLocaleString()} paragraphs, ${stats.chars.toLocaleString()} chars`
    );
  }

  console.log(`\nOutput: ${OUTPUT_DIR}/chapter-NNN.json`);
}

main().catch((err) => {
  console.error("Processing failed:", err);
  process.exit(1);
});
