/**
 * Processes Perch Proshyan's "Khorhrdavor Miandznuhi" (The Mysterious Solitary Woman)
 * into structured JSON for the translation wiki.
 *
 * The text is a first-person diary/memoir in Armenian, set in 1884-1887.
 * A narrator recovering from illness travels to a remote village in the Syunik
 * region of Armenia and encounters "Sister Anna" (Քույր-Աննա), a woman who
 * has devoted herself to education and social reform.
 *
 * Input: data/raw/khorhrdavor_miandznuhi/*.txt (12 files)
 *   - 00_Intro.txt: Epigraph and framing preface
 *   - 01-10: Diary entries with Armenian date filenames
 *   - 11_1887_հունիս_5.txt: Epilogue from Tiflis
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
    titleArmenian: "Ներածություն",
    titleEnglish: "Introduction",
  },
  "01": {
    number: 2,
    titleArmenian: "188* Մայիսի 25",
    titleEnglish: "May 25",
  },
  "02": {
    number: 3,
    titleArmenian: "Հունիսի 1",
    titleEnglish: "June 1",
  },
  "03": {
    number: 4,
    titleArmenian: "Հունիսի 2",
    titleEnglish: "June 2",
  },
  "04": {
    number: 5,
    titleArmenian: "Հունիսի 3",
    titleEnglish: "June 3",
  },
  "05": {
    number: 6,
    titleArmenian: "Հունիսի 4",
    titleEnglish: "June 4",
  },
  "06": {
    number: 7,
    titleArmenian: "Հունիսի 5",
    titleEnglish: "June 5",
  },
  "07": {
    number: 8,
    titleArmenian: "Հունիսի 7",
    titleEnglish: "June 7",
  },
  "08": {
    number: 9,
    titleArmenian: "Հունիսի 10",
    titleEnglish: "June 10",
  },
  "09": {
    number: 10,
    titleArmenian: "Հունիսի 11",
    titleEnglish: "June 11",
  },
  "10": {
    number: 11,
    titleArmenian: "Սեպտեմբերի 15",
    titleEnglish: "September 15",
  },
  "11": {
    number: 12,
    titleArmenian: "1887, հունիս 5, Թիֆլիս",
    titleEnglish: "Epilogue: June 5, 1887, Tiflis",
  },
};

/**
 * Process a single text file into paragraphs.
 *
 * The raw files have been digitized from print, with line breaks
 * that don't always correspond to paragraph breaks. Paragraphs
 * are best identified by:
 *  1. Blank lines between content
 *  2. Lines ending with Armenian full stop (։) followed by newline
 *     and a line starting with uppercase Armenian letter or em-dash
 *
 * For this text, we'll use a hybrid approach:
 *  - Join all lines together
 *  - Then split on the Armenian period (։) followed by space
 *  - Group into semantic paragraphs
 */
function processFile(
  content: string
): { index: number; text: string }[] {
  const lines = content.split("\n");
  const paragraphs: { index: number; text: string }[] = [];

  // First, identify where real paragraph breaks occur
  // A paragraph break is indicated by:
  // 1. A blank line
  // 2. A line ending with ։ followed by a line starting with — (em-dash for dialogue)
  // 3. A line ending with ։ followed by a line starting with a capital letter and having
  //    contextually different content (hard to detect automatically)

  // For simplicity, let's join lines into larger chunks and split at blank lines
  // and dialogue markers (—)

  let currentParagraph: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines - they mark paragraph boundaries
    if (!line) {
      if (currentParagraph.length > 0) {
        const text = currentParagraph
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (text.length > 1) {
          paragraphs.push({ index: paragraphs.length, text });
        }
        currentParagraph = [];
      }
      continue;
    }

    // Check if this line starts with a dialogue marker (em-dash)
    // If so, start a new paragraph
    if (line.startsWith("—") && currentParagraph.length > 0) {
      const text = currentParagraph
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (text.length > 1) {
        paragraphs.push({ index: paragraphs.length, text });
      }
      currentParagraph = [line];
      continue;
    }

    // Add line to current paragraph
    currentParagraph.push(line);
  }

  // Don't forget the last paragraph
  if (currentParagraph.length > 0) {
    const text = currentParagraph
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length > 1) {
      paragraphs.push({ index: paragraphs.length, text });
    }
  }

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

    // Process into paragraphs
    const paragraphs = processFile(content);

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
