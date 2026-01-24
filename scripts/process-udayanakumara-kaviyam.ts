/**
 * Processes the Udayanakumara Kaviyam raw text into structured JSON.
 *
 * The raw text contains Tamil verse with prose commentary (உரை).
 * Structure of each verse block (between separator lines "------"):
 *   1. Optional verse number line: "26" or "12."
 *   2. Optional verse title: "27. சதானிகன் துறவியாதல்" or "5. நாட்டுச் சிறப்பு"
 *   3. Optional meter description in parentheses: "(அறுசீர்க் கழிநெடிலடியாசிரிய விருத்தம்)"
 *   4. Verse lines: typically 4 lines of Tamil poetry
 *   5. Commentary: starts with "(இ - ள்.)" or "(இதன் பொருள்)" — EXCLUDED from output
 *
 * Usage: pnpm tsx scripts/process-udayanakumara-kaviyam.ts
 */

import fs from "fs";
import path from "path";

const RAW_FILE = path.resolve(
  "data/raw/udayanakumara-kaviyam/udayanakumara-kaviyam.txt"
);
const OUTPUT_DIR = path.resolve("data/processed/udayanakumara-kaviyam");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

// Kandam boundaries (line numbers, 1-indexed)
const KANDAM_BOUNDARIES = [
  { start: 2, end: 882, titleTamil: "உஞ்சைக் காண்டம்", titleEn: "Unchai Kandam (The Ujjain Canto)" },
  { start: 884, end: 1100, titleTamil: "இலாவாண காண்டம்", titleEn: "Ilaavana Kandam (The Lavana Canto)" },
  { start: 1102, end: 1352, titleTamil: "மகத காண்டம்", titleEn: "Magata Kandam (The Magadha Canto)" },
  { start: 1353, end: 1751, titleTamil: "வத்தவ காண்டம்", titleEn: "Vattava Kandam (The Vatsa Canto)" },
  { start: 1753, end: 2186, titleTamil: "நரவாகன காண்டம்", titleEn: "Naravakana Kandam (The Naravahana Canto)" },
  { start: 2188, end: 2660, titleTamil: "துறவுக் காண்டம்", titleEn: "Thuravu Kandam (The Renunciation Canto)" },
];

function isSeparator(line: string): boolean {
  return /^-{3,}$/.test(line.trim());
}

function isCommentaryStart(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.startsWith("(இ - ள்.)") || trimmed.startsWith("(இ-ள்.)")) return true;
  if (trimmed.startsWith("(இதன் பொருள்)")) return true;
  if (trimmed.startsWith("(இ - ள்)") || trimmed.startsWith("(இ-ள்)")) return true;
  if (trimmed.startsWith("(இ ") || trimmed.startsWith("(இ-")) return true;
  return false;
}

function isMeterDescription(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith("(")) return false;
  return (
    trimmed.includes("விருத்தம்") ||
    trimmed.includes("ஆசிரிய") ||
    trimmed.includes("வெண்பா") ||
    trimmed.includes("கலிப்பா") ||
    trimmed.includes("கழிநெடிலடி") ||
    trimmed.includes("அடியாசிரிய")
  );
}

function isKandamMarker(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.includes("காண்டம்")) return true;
  if (
    trimmed.startsWith("முதலாவது") ||
    trimmed.startsWith("இரண்டாவது") ||
    trimmed.startsWith("மூன்றாவது") ||
    trimmed.startsWith("நான்காவது") ||
    trimmed.startsWith("ஐந்தாவது") ||
    trimmed.startsWith("ஆறாவது")
  ) return true;
  return false;
}

/**
 * Checks if a line is a verse number header.
 * Patterns: "26", "12.", "5. நாட்டுச் சிறப்பு", "121. நூலாசிரியர் நுதலிப்புகுதல்"
 */
function isVerseNumberLine(line: string): boolean {
  const trimmed = line.trim();
  // Standalone number: "26"
  if (/^\d+$/.test(trimmed)) return true;
  // Number with period: "12."
  if (/^\d+\.\s*$/.test(trimmed)) return true;
  // Number with period and title: "5. நாட்டுச் சிறப்பு"
  if (/^\d+\.\s+\S/.test(trimmed)) return true;
  return false;
}

/**
 * Checks if a line is a section/work title marker (not verse)
 * E.g., "உதயணகுமார காவியம்- நூல்"
 */
function isTitleMarker(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.includes("உதயணகுமார காவியம்")) return true;
  if (trimmed.includes("நூல்") && trimmed.length < 40) return true;
  if (trimmed.includes("செய்யுள்") && trimmed.length < 50) return true;
  if (trimmed === "உதயணகுமார காவியம்- நூல்") return true;
  return false;
}

/**
 * Checks if a line is a supplementary commentary line (not marked with the standard prefix).
 * These are explanatory notes that reference other texts, contain "(N)" citation numbers, etc.
 */
function isUnmarkedCommentary(line: string): boolean {
  const trimmed = line.trim();
  // Lines containing text references like "எனவரும்" (as occurs)
  if (trimmed.startsWith("இதனோடு,")) return true;
  if (trimmed.startsWith("எனவரும்")) return true;
  // Lines that are clearly prose explanations (very long, contain no verse patterns)
  // Verse end markers in parentheses: (1), (2), etc.
  if (/\(\d+\)\s*$/.test(trimmed)) return true;
  return false;
}

/**
 * Determines if a line is a verse end number like "(1)" or "(56)" at the end
 * of a commentary section. These appear at the end of the last commentary line.
 */
function hasVerseEndNumber(line: string): boolean {
  return /\(\d+\)\s*$/.test(line.trim());
}

/**
 * Extracts verse lines from a block of text between separators.
 * Returns the verse lines (multi-line stanza) or null if no verse found.
 */
function extractVerseFromBlock(blockLines: string[]): string[] | null {
  const verseLines: string[] = [];
  let foundCommentary = false;

  for (const line of blockLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip separators
    if (isSeparator(trimmed)) continue;

    // Skip kandam markers
    if (isKandamMarker(trimmed)) continue;

    // Skip meter descriptions
    if (isMeterDescription(trimmed)) continue;

    // Skip verse number lines
    if (isVerseNumberLine(trimmed)) continue;

    // Skip work title markers
    if (isTitleMarker(trimmed)) continue;

    // Stop at commentary
    if (isCommentaryStart(trimmed)) {
      foundCommentary = true;
      break;
    }

    // If we've found commentary, skip everything after
    if (foundCommentary) continue;

    // Check for unmarked commentary (has verse-end citation number)
    if (hasVerseEndNumber(trimmed) && verseLines.length >= 2) {
      // This is the end of commentary, not verse
      break;
    }

    // Check if this looks like an unmarked commentary reference line
    if (isUnmarkedCommentary(trimmed)) {
      foundCommentary = true;
      break;
    }

    // Heuristic: if we already have 4+ verse lines and encounter a very long line
    // (>120 chars) that's clearly prose commentary, stop
    if (verseLines.length >= 4 && trimmed.length > 120) {
      foundCommentary = true;
      break;
    }

    // This is a verse line
    verseLines.push(trimmed);
  }

  // Filter out any remaining non-verse lines
  // Verse lines in this text typically have specific patterns:
  // - They end with words that have poetic suffixes
  // - They're usually 30-60 characters long (not very short or very long)
  if (verseLines.length === 0) return null;

  // If we got too many lines (>8), something went wrong — trim to likely verse
  if (verseLines.length > 8) {
    // Take the first 4-8 lines that look like verse
    return verseLines.slice(0, 8);
  }

  return verseLines;
}

function processKandam(
  allLines: string[],
  kandam: typeof KANDAM_BOUNDARIES[0],
  kandamNumber: number
): ProcessedChapter {
  // Extract lines for this kandam (convert to 0-indexed)
  const sectionLines = allLines.slice(kandam.start - 1, kandam.end);

  // Split into blocks using separator lines
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  for (const line of sectionLines) {
    if (isSeparator(line.trim())) {
      if (currentBlock.length > 0) {
        blocks.push([...currentBlock]);
        currentBlock = [];
      }
    } else {
      currentBlock.push(line);
    }
  }
  // Don't forget the last block
  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  // Extract verses from each block
  const verses: string[][] = [];
  for (const block of blocks) {
    const verse = extractVerseFromBlock(block);
    if (verse && verse.length > 0) {
      verses.push(verse);
    }
  }

  const chapter: ProcessedChapter = {
    chapterNumber: kandamNumber,
    title: `${kandam.titleTamil} — ${kandam.titleEn}`,
    sourceContent: {
      paragraphs: verses.map((verseLines, idx) => ({
        index: idx + 1,
        text: verseLines.join("\n"),
      })),
    },
  };

  return chapter;
}

function main() {
  const rawText = fs.readFileSync(RAW_FILE, "utf-8");
  const allLines = rawText.split("\n");

  console.log(`Total lines in raw file: ${allLines.length}`);
  console.log(`Processing 6 kandams...\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalVerses = 0;

  for (let i = 0; i < KANDAM_BOUNDARIES.length; i++) {
    const kandam = KANDAM_BOUNDARIES[i];
    const chapter = processKandam(allLines, kandam, i + 1);

    const fileName = `chapter-${String(i + 1).padStart(3, "0")}.json`;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, fileName),
      JSON.stringify(chapter, null, 2) + "\n"
    );

    totalVerses += chapter.sourceContent.paragraphs.length;
    console.log(
      `  Kandam ${i + 1} (${kandam.titleEn}): ${chapter.sourceContent.paragraphs.length} verses -> ${fileName}`
    );
  }

  console.log(`\nTotal verses extracted: ${totalVerses}`);
  console.log(`Expected: 367 verses`);
  if (totalVerses !== 367) {
    console.log(`Note: Difference of ${Math.abs(totalVerses - 367)} verses from expected count.`);
    console.log(`Minor differences may occur from prefatory verses or commentary sections.`);
  }
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main();
