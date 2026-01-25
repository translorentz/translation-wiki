/**
 * Processes Raffi's Kaytser (The Spark) raw text files into structured JSON.
 *
 * Input: data/raw/kaitser/Vol1_NNN_X.txt and Vol2_NNN_X.txt files
 *   - Vol1 has chapters 1-44, Vol2 has chapters 45-76
 *   - Filenames: Vol{1,2}_NNN_[Armenian numeral].txt
 *
 * Output: data/processed/kaitser/chapter-NNN.json
 *
 * Text structure:
 *   - Line 1: Empty or zero-width space (page marker - skip)
 *   - Line 2: Armenian chapter numeral (e.g., Delays, Բ, Գ...)
 *   - Line 3: Chapter title in Armenian (e.g., DELAYS
 *   - Lines 4+: Each line is a paragraph (one line = one paragraph)
 *   - Lines containing only zero-width space (​) are page breaks - skip
 *   - Some chapters have footnotes at end (↑ marker)
 *
 * Usage: pnpm tsx scripts/process-kaitser.ts
 */

import fs from "fs";
import path from "path";

const RAW_DIR = "data/raw/kaitser";
const OUTPUT_DIR = "data/processed/kaitser";

// Zero-width space character (U+200B)
const ZERO_WIDTH_SPACE = "\u200B";

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

/**
 * Extract chapter number from filename (Vol1_NNN or Vol2_NNN)
 */
function extractChapterNumber(filename: string): number {
  const match = filename.match(/Vol[12]_(\d{3})_/);
  if (!match) {
    throw new Error(`Cannot extract chapter number from: ${filename}`);
  }
  return parseInt(match[1], 10);
}

/**
 * Check if a line is a page break marker (empty or only zero-width space)
 */
function isPageBreak(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === "" || trimmed === ZERO_WIDTH_SPACE;
}

/**
 * Process a single chapter file into structured JSON.
 * Each line is treated as a separate paragraph (unless it's a page break marker).
 */
function processChapter(filePath: string): ProcessedChapter {
  const filename = path.basename(filePath);
  const chapterNumber = extractChapterNumber(filename);

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Find the first non-empty, non-page-break line (skip BOM and page markers)
  let startIdx = 0;
  while (startIdx < lines.length && isPageBreak(lines[startIdx])) {
    startIdx++;
  }

  // Line at startIdx is the Armenian numeral (e.g., "Ա" for chapter 1)
  // Line at startIdx+1 is the title (e.g., " DELAYS")
  const armenianNumeral = lines[startIdx]?.trim() || "";
  const armenianTitle = lines[startIdx + 1]?.trim() || "";

  // Combine them for the chapter title: "numeral. Title"
  const title = `${armenianNumeral}. ${armenianTitle}`;

  // Content starts from startIdx+2
  const contentLines = lines.slice(startIdx + 2);

  const paragraphs: { index: number; text: string }[] = [];
  const footnotes: string[] = [];
  let inFootnotes = false;

  for (const line of contentLines) {
    // Skip page break markers
    if (isPageBreak(line)) continue;

    let text = line.trim();

    // Skip empty lines
    if (!text) continue;

    // Check if this is a footnote marker (starts with ↑ or [number])
    if (text.startsWith("↑") || text.match(/^\[\d+\]/)) {
      inFootnotes = true;
      footnotes.push(text);
      continue;
    }

    // If we're in footnotes section, collect all remaining as footnotes
    if (inFootnotes) {
      footnotes.push(text);
      continue;
    }

    // Skip very short lines that are likely artifacts (single char page markers)
    if (text.length <= 1) continue;

    // Each line is a separate paragraph
    paragraphs.push({
      index: paragraphs.length,
      text,
    });
  }

  // If we collected footnotes, append them as a final paragraph
  if (footnotes.length > 0) {
    const footnotesText = footnotes.join("\n\n");

    paragraphs.push({
      index: paragraphs.length,
      text: `[Footnotes]\n${footnotesText}`,
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
  console.log("=== Processing Raffi's Kaytser (The Spark) ===\n");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Read all chapter files from raw directory
  const files = fs
    .readdirSync(RAW_DIR)
    .filter((f) => f.match(/^Vol[12]_\d{3}_.*\.txt$/))
    .sort();

  console.log(`Found ${files.length} chapter files\n`);

  let totalParagraphs = 0;
  let totalCharacters = 0;
  const chapters: ProcessedChapter[] = [];

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

      // Write output JSON
      const outFile = path.join(OUTPUT_DIR, `chapter-${chapter.chapterNumber}.json`);
      fs.writeFileSync(outFile, JSON.stringify(chapter, null, 2), "utf-8");

      console.log(
        `  Ch ${String(chapter.chapterNumber).padStart(2)}: ${paraCount} paragraphs, ${charCount.toLocaleString()} chars — ${chapter.title.substring(0, 50)}...`
      );
    } catch (err) {
      console.error(`  ERROR processing ${file}:`, err);
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Chapters: ${chapters.length}`);
  console.log(`Paragraphs: ${totalParagraphs.toLocaleString()}`);
  console.log(`Characters: ${totalCharacters.toLocaleString()}`);
  console.log(`Output: ${OUTPUT_DIR}/chapter-NNN.json`);
}

main().catch((err) => {
  console.error("Processing failed:", err);
  process.exit(1);
});
