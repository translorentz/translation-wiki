/**
 * Processes Perch Proshyan's "Khorhrdavor Miandznuhi" (The Mysterious Solitary Woman)
 * into structured JSON for the translation wiki.
 *
 * The text is a first-person diary/memoir in Armenian, set in 1884-1887.
 * A narrator recovering from illness travels to a remote village in the Syunik
 * region of Armenia and encounters "Sister Anna" (Քdelays-Աdelays), a woman who
 * has devoted herself to education and social reform.
 *
 * Input: data/raw/khorhrdavor_miandznuhi/*.txt (12 files)
 *   - 00_Intro.txt: Epigraph and framing preface
 *   - 01-10: Diary entries with Armenian date filenames
 *   - 11_1887_delays_5.txt: Epilogue from Tiflis
 *
 * Output: data/processed/khorhrdavor-miandznuhi/chapter-NNN.json
 *
 * Usage: pnpm tsx scripts/process-khorhrdavor-miandznuhi.ts
 */

import fs from "fs";
import path from "path";

const RAW_DIR = "data/raw/khorhrdavor_miandznuhi";
const OUTPUT_DIR = "data/processed/khorhrdavor-miandznuhi";

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

/**
 * Map of file prefixes to chapter info.
 * Files are numbered 00-11, but we want meaningful titles.
 */
const CHAPTER_INFO: Record<
  string,
  { number: number; titleArmenian: string; titleEnglish: string }
> = {
  "00": {
    number: 1,
    titleArmenian: "\u0546\u0565\u0580\u0561\u056E\u0578\u0582\u0569\u0575\u0578\u0582\u0576",
    titleEnglish: "Introduction",
  },
  "01": {
    number: 2,
    titleArmenian: "188* \u0544\u0561\u0575\u056B\u057D\u056B 25",
    titleEnglish: "May 25",
  },
  "02": {
    number: 3,
    titleArmenian: "\u0540\u0578\u0582\u0576\u056B\u057D\u056B 1",
    titleEnglish: "June 1",
  },
  "03": {
    number: 4,
    titleArmenian: "\u0540\u0578\u0582\u0576\u056B\u057D\u056B 2",
    titleEnglish: "June 2",
  },
  "04": {
    number: 5,
    titleArmenian: "\u0540\u0578\u0582\u0576\u056B\u057D\u056B 3",
    titleEnglish: "June 3",
  },
  "05": {
    number: 6,
    titleArmenian: "\u0540\u0578\u0582\u0576\u056B\u057D\u056B 4",
    titleEnglish: "June 4",
  },
  "06": {
    number: 7,
    titleArmenian: "\u0540\u0578\u0582\u0576\u056B\u057D\u056B 5",
    titleEnglish: "June 5",
  },
  "07": {
    number: 8,
    titleArmenian: "\u0540\u0578\u0582\u0576\u056B\u057D\u056B 7",
    titleEnglish: "June 7",
  },
  "08": {
    number: 9,
    titleArmenian: "\u0540\u0578\u0582\u0576\u056B\u057D\u056B 10",
    titleEnglish: "June 10",
  },
  "09": {
    number: 10,
    titleArmenian: "\u0540\u0578\u0582\u0576\u056B\u057D\u056B 11",
    titleEnglish: "June 11",
  },
  "10": {
    number: 11,
    titleArmenian: "\u054D\u0565\u057A\u057F\u0565\u0574\u0562\u0565\u0580\u056B 15",
    titleEnglish: "September 15",
  },
  "11": {
    number: 12,
    titleArmenian: "1887, \u0570\u0578\u0582\u0576\u056B\u057D 5, \u0539\u056B\u0586\u056C\u056B\u057D",
    titleEnglish: "Epilogue: June 5, 1887, Tiflis",
  },
};

// Armenian full stop character
const ARMENIAN_FULL_STOP = "\u0589"; // ։

/**
 * Check if a line is an epigraph attribution (author name or source reference).
 * These are typically short lines containing:
 * - A name (e.g., "John Sterling")
 * - An abbreviated reference (e.g., "Avel. Hovh.")
 */
function isAttributionLine(line: string): boolean {
  const trimmed = line.trim();
  // Attribution lines are typically short (under 80 chars)
  if (trimmed.length > 80) return false;
  // They don't end with Armenian sentence-final punctuation
  if (trimmed.endsWith(ARMENIAN_FULL_STOP) || trimmed.endsWith("\u055D")) {
    return false;
  }

  // Check for abbreviated reference pattern like "Avel. Hovh."
  // Armenian uppercase: U+0531-U+0556, lowercase: U+0561-U+0586
  const abbrPattern =
    /^[\u0531-\u0556][\u0531-\u0586]*\.\s+[\u0531-\u0556][\u0531-\u0586]*\.?$/;
  if (abbrPattern.test(trimmed)) return true;

  // Check for simple name pattern (1-4 words)
  const words = trimmed.split(/\s+/);
  if (words.length >= 1 && words.length <= 4) {
    // Names contain Armenian letters (U+0531-U+0586), Latin letters, or periods
    const namePattern = /^[\u0531-\u0586A-Za-z]+\.?$/;
    const hasOnlyNameChars = words.every((w) => namePattern.test(w));
    if (hasOnlyNameChars) return true;
  }
  return false;
}

/**
 * Process a single text file into paragraphs.
 *
 * The raw files have been digitized from print. Key patterns:
 * 1. Lines ending with ։ (Armenian full stop) are complete paragraphs
 * 2. Lines NOT ending with ։ continue onto the next line (page break artifacts)
 * 3. Dialogue lines starting with — should be separate paragraphs
 * 4. Attribution lines (author names after epigraphs) should be separate paragraphs
 *
 * For the Introduction (chapter 1), there are two epigraphs at the start:
 * - First epigraph: lines 1-4 (ends with ։) + line 5 (attribution)
 * - Second epigraph: lines 6-10 (ends with ։) + line 11 (attribution)
 * - Main text: lines 12-end
 */
function processFile(
  content: string,
  isIntroduction: boolean = false
): { index: number; text: string }[] {
  const lines = content.split("\n");
  const paragraphs: { index: number; text: string }[] = [];

  let currentParagraph: string[] = [];

  /**
   * Flush the current paragraph buffer to the output.
   */
  function flushParagraph() {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(" ").replace(/\s+/g, " ").trim();
      if (text.length > 1) {
        paragraphs.push({ index: paragraphs.length, text });
      }
      currentParagraph = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const prevLine = i > 0 ? lines[i - 1].trim() : "";

    // Skip empty lines - they mark paragraph boundaries
    if (!line) {
      flushParagraph();
      continue;
    }

    // Check if this line starts with a dialogue marker (em-dash)
    // If so, start a new paragraph
    if (line.startsWith("\u2014") && currentParagraph.length > 0) {
      flushParagraph();
      currentParagraph = [line];
      continue;
    }

    // Special handling for Introduction: detect attribution lines after epigraphs
    // An attribution follows a line ending with ։ and is a short name/reference
    if (
      isIntroduction &&
      isAttributionLine(line) &&
      prevLine.endsWith(ARMENIAN_FULL_STOP)
    ) {
      // Flush the epigraph text first
      flushParagraph();
      // Add the attribution as its own paragraph
      paragraphs.push({ index: paragraphs.length, text: line });
      continue;
    }

    // Check if the previous line ended with Armenian full stop
    // If so, the current line starts a new paragraph
    if (prevLine.endsWith(ARMENIAN_FULL_STOP) && currentParagraph.length > 0) {
      flushParagraph();
    }

    // Add line to current paragraph
    currentParagraph.push(line);
  }

  // Don't forget the last paragraph
  flushParagraph();

  return paragraphs;
}

/**
 * Main processing function.
 */
function main() {
  console.log('=== Processing Perch Proshyan\'s "Khorhrdavor Miandznuhi" ===\n');
  console.log("(The Mysterious Solitary Woman)\n");

  // Read all files in the directory
  const files = fs
    .readdirSync(RAW_DIR)
    .filter((f) => f.endsWith(".txt"))
    .sort();

  console.log(`Found ${files.length} source files in ${RAW_DIR}\n`);

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalParagraphs = 0;
  let totalCharacters = 0;

  for (const file of files) {
    // Extract the prefix (e.g., "00", "01", etc.)
    const prefix = file.slice(0, 2);
    const info = CHAPTER_INFO[prefix];

    if (!info) {
      console.warn(`  [warn] Unknown file prefix: ${file}`);
      continue;
    }

    // Read file content
    const content = fs.readFileSync(path.join(RAW_DIR, file), "utf-8");

    // Process into paragraphs (pass isIntroduction flag for special epigraph handling)
    const isIntroduction = prefix === "00";
    const paragraphs = processFile(content, isIntroduction);

    // Build title
    const title = `${info.titleArmenian} (${info.titleEnglish})`;

    const chapter: ProcessedChapter = {
      chapterNumber: info.number,
      title,
      sourceContent: { paragraphs },
    };

    // Calculate statistics
    const charCount = paragraphs.reduce((sum, p) => sum + p.text.length, 0);
    totalParagraphs += paragraphs.length;
    totalCharacters += charCount;

    // Write output file
    const outFile = path.join(
      OUTPUT_DIR,
      `chapter-${String(info.number).padStart(3, "0")}.json`
    );
    fs.writeFileSync(outFile, JSON.stringify(chapter, null, 2), "utf-8");

    console.log(
      `  Chapter ${info.number}: ${paragraphs.length} paragraphs, ${charCount.toLocaleString()} chars`
    );
    console.log(`    File: ${file}`);
    console.log(`    Title: ${title}`);
  }

  console.log("\n=== Summary ===");
  console.log(`Chapters: ${files.length}`);
  console.log(`Paragraphs: ${totalParagraphs.toLocaleString()}`);
  console.log(`Characters: ${totalCharacters.toLocaleString()}`);
  console.log(`Output: ${OUTPUT_DIR}/chapter-NNN.json`);
}

main();
