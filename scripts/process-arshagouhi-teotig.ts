/**
 * Processes Arshagouhi Teotig's eyewitness memoir of the 1909 Adana massacre.
 *
 * The raw file is a continuous text with dated section headers that serve as
 * natural chapter boundaries. The text documents the author's journey from
 * Istanbul to Adana and surrounding areas (Mersin, Misis, Hamidie, Erzin,
 * Dörtyol, Tarsus) in October-November 1909, witnessing the aftermath of
 * the April 1909 massacres.
 *
 * The work's full title is: "Adanayi Verq u Vordiner" (Adana's Wounds and Orphans)
 * Original Armenian: Delays Delays Delays
 *
 * Usage: pnpm tsx scripts/process-arshagouhi-teotig.ts
 */

import fs from "fs";
import path from "path";

const RAW_FILE = path.resolve(
  "data/raw/arshagouhi_teotig/ArshagouhiTeotig.txt"
);
const OUTPUT_DIR = path.resolve("data/processed/arshagouhi-teotig");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

// Chapter markers: [lineNumber, englishTitle]
// Line numbers are 1-indexed as they appear in the file
// The Armenian titles will be extracted directly from the file
const CHAPTER_BOUNDARIES: [number, string][] = [
  [1, "The Moment of Departure"],
  [9, "Prayer"],
  [14, "The Chained Couple"],
  [18, "With the Travelers"],
  [24, "Mersin"],
  [37, "Views and Memories"],
  [46, "Adana"],
  [56, "Days of Crying and Hunger"],
  [73, "Saturday Evening"],
  [88, "Widows and Orphans"],
  [134, "Comforting Appearance"],
  [145, "Towards the Government Office"],
  [155, "Among the Sick"],
  [165, "The Saving Refuge"],
  [172, "A Sad Visit"],
  [188, "The Disaster Area in Waters"],
  [204, "Opening of the School"],
  [214, "Memories"],
  [228, "From Present and Past"],
  [245, "Wedding Days"],
  [258, "Foreign Institutions"],
  [270, "In the Photography Studio"],
  [300, "Seeing the Picture"],
  [317, "Mother's Love"],
  [346, "The Sad Editor-in-Chief"],
  [359, "The Child of Keavur Köy"],
  [402, "A Call"],
  [414, "The Holy Father of Hadjin"],
  [443, "From Hamukie to Misis"],
  [486, "A Night in Hamidie"],
  [541, "The Prisoners of Erzin"],
  [615, "Towards Dörtyol"],
  [642, "The Homeland of the Brave"],
  [724, "The Apostle's Birthplace (Tarsus)"],
  [779, "Epilogue: On the Threshold of the New Year"],
];

function main() {
  if (!fs.existsSync(RAW_FILE)) {
    console.error(`Raw file not found: ${RAW_FILE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(RAW_FILE, "utf-8");
  const lines = raw.split("\n");

  console.log(`Read ${lines.length} lines from raw file`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Process each chapter based on line markers
  for (let i = 0; i < CHAPTER_BOUNDARIES.length; i++) {
    const [startLineNum, englishTitle] = CHAPTER_BOUNDARIES[i];
    const nextBoundary = CHAPTER_BOUNDARIES[i + 1];
    const endLineNum = nextBoundary ? nextBoundary[0] : lines.length + 1;

    const startLine = startLineNum - 1; // Convert to 0-indexed
    const endLine = endLineNum - 1;

    // Extract lines for this chapter
    const chapterLines = lines.slice(startLine, endLine);

    // The first line is the Armenian title
    const armenianTitle = chapterLines[0]?.trim() || "";

    // Check if second line is a date (pattern: number + Armenian month abbreviation)
    let dateStr = "";
    let contentStartIndex = 1;

    if (chapterLines[1]) {
      const secondLine = chapterLines[1].trim();
      // Armenian date patterns: "14 Հոկdelays. 1909", "22 Նdelays.", etc.
      if (/^\d+\s+\S+\.?\s*\d*$/.test(secondLine) && secondLine.length < 25) {
        dateStr = secondLine;
        contentStartIndex = 2;
      }
    }

    // Build paragraphs from content lines
    // In this text, each line is a separate paragraph (no blank line separators)
    const paragraphs: { index: number; text: string }[] = [];
    let paragraphIndex = 1;

    for (let j = contentStartIndex; j < chapterLines.length; j++) {
      const trimmed = chapterLines[j].trim();

      // Skip blank lines, standalone asterisks (section breaks), and footnote markers
      if (trimmed === "" || trimmed === "*" || /^\[\d+\]$/.test(trimmed)) {
        continue;
      }

      // Each non-empty line is a separate paragraph
      paragraphs.push({
        index: paragraphIndex,
        text: trimmed,
      });
      paragraphIndex++;
    }

    // Build chapter title combining Armenian, date, and English
    const chapterNumber = i + 1;
    let title = armenianTitle;
    if (dateStr) {
      title += ` (${dateStr})`;
    }
    title += ` — ${englishTitle}`;

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
      `  Chapter ${chapterNumber}: "${englishTitle}" — ${paragraphs.length} paragraphs → ${fileName}`
    );
  }

  console.log(`\nDone. Output: ${OUTPUT_DIR}`);
  console.log(`Total chapters: ${CHAPTER_BOUNDARIES.length}`);
}

main();
