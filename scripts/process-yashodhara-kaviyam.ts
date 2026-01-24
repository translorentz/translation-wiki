/**
 * Process Yashodhara Kaviyam raw text files into structured JSON chapters.
 *
 * The Yashodhara Kaviyam is a Jain Tamil epic poem in 5 carukkams (chapters),
 * with 330 verses total. This script:
 * 1. Reads both raw text files (carukkam 1-2 and carukkam 3-5)
 * 2. Extracts verse text (Tamil verse lines), excluding commentary (urai)
 * 3. Groups verses into 5 chapters (one per carukkam)
 * 4. Outputs to data/processed/yashodhara-kaviyam/chapter-001.json through chapter-005.json
 *
 * Verse structure: 4-line stanzas ending with a verse number (integer at end of last line).
 * Commentary blocks start with "உரை:-" and are prose explanations -- these are EXCLUDED.
 *
 * Usage: pnpm tsx scripts/process-yashodhara-kaviyam.ts
 */

import fs from "fs";
import path from "path";

const RAW_DIR = path.join(
  process.cwd(),
  "data/raw/yashodhara-kaviyam"
);
const OUTPUT_DIR = path.join(
  process.cwd(),
  "data/processed/yashodhara-kaviyam"
);

// Carukkam boundaries (verse numbers, inclusive)
// Verses 1-4 are kaappu (invocation) + paayiram + avaiyarakkam + mutporul
// These preliminary verses belong to Carukkam 1.
// Verified from source text markers: "தற் ச க்கம் ற்றிற்" after verse 73,
// "இரண்டாவது ச க்கம்" starting verse 74, etc.
const CARUKKAM_RANGES: { start: number; end: number; title: string }[] = [
  { start: 1, end: 73, title: "Carukkam 1 (முதலாவது சருக்கம்)" },
  { start: 74, end: 160, title: "Carukkam 2 (இரண்டாவது சருக்கம்)" },
  { start: 161, end: 225, title: "Carukkam 3 (மூன்றாவது சருக்கம்)" },
  { start: 226, end: 261, title: "Carukkam 4 (நான்காவது சருக்கம்)" },
  { start: 262, end: 330, title: "Carukkam 5 (ஐந்தாவது சருக்கம்)" },
];

interface Verse {
  number: number;
  lines: string[];
}

/**
 * Parse a raw text file and extract verses, ignoring commentary (urai) sections.
 */
function extractVerses(text: string): Verse[] {
  const lines = text.split("\n");
  const verses: Verse[] = [];

  let currentVerseLines: string[] = [];
  let inCommentary = false;
  let inVerseSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      // If we were collecting verse lines and hit a blank, check if it's between verse lines
      // (verse stanzas can have internal spacing in the source)
      continue;
    }

    // Detect commentary start: "உரை:-" or "உரை:-" variants
    if (
      trimmed.startsWith("உரை:-") ||
      trimmed.startsWith("உரை:-") ||
      trimmed.startsWith("உரை:- ") ||
      trimmed.match(/^உைர:-/) ||
      trimmed.match(/^உைர:-/)
    ) {
      inCommentary = true;
      // If we had verse lines accumulated without a number, flush them
      if (currentVerseLines.length > 0) {
        // Try to extract verse number from last line
        const lastLine = currentVerseLines[currentVerseLines.length - 1];
        const verseNum = extractVerseNumber(lastLine);
        if (verseNum !== null) {
          // Clean the verse number from the last line
          currentVerseLines[currentVerseLines.length - 1] = removeVerseNumber(lastLine);
          verses.push({ number: verseNum, lines: currentVerseLines.filter(l => l.trim()) });
        }
        currentVerseLines = [];
      }
      continue;
    }

    // Detect section headings and separators (not verse content)
    if (
      trimmed.match(/^-{3,}/) || // Separator lines "----------"
      trimmed.match(/^\(பாடம்\)/) || // Variant readings "(பாடம்)*..."
      trimmed.match(/^\d+\.\s*(நீல|சீவக|குறள|புறம|சிலப|தொல|பரிபா|மேரு|சூளா|புற)/) || // Footnote references
      trimmed.match(/^1\.\s/) || // Footnote number references at start of line
      trimmed.match(/^2\.\s/) ||
      trimmed.match(/^3\.\s/) ||
      false
    ) {
      inCommentary = true; // These are part of commentary apparatus
      continue;
    }

    // Check if this line ends with a verse number (integer at end)
    // Verse numbers appear at the end of the last line of a stanza
    const verseNum = extractVerseNumber(trimmed);

    if (verseNum !== null && !inCommentary) {
      // This is the last line of a verse
      const cleanLine = removeVerseNumber(trimmed);
      if (cleanLine.trim()) {
        currentVerseLines.push(cleanLine.trim());
      }
      verses.push({
        number: verseNum,
        lines: currentVerseLines.filter(l => l.trim()),
      });
      currentVerseLines = [];
      inCommentary = false;
      inVerseSection = false;
      continue;
    }

    // If we're in commentary, check if this looks like the start of a new verse
    // New verses typically start with Tamil text after commentary
    if (inCommentary) {
      // Check if this line could be the start of a verse stanza
      // Verse lines are typically Tamil text (short-medium length) that will end with a verse number
      // Look ahead to see if there's a verse number within the next few lines
      if (looksLikeVerseStart(lines, i)) {
        inCommentary = false;
        currentVerseLines = [trimmed];
      }
      // Otherwise stay in commentary mode
      continue;
    }

    // If we get here, we're collecting verse lines
    currentVerseLines.push(trimmed);
  }

  return verses;
}

/**
 * Look ahead from current position to see if there's a verse number
 * within the next 5 lines (verses are typically 4 lines).
 */
function looksLikeVerseStart(lines: string[], startIdx: number): boolean {
  let nonEmptyCount = 0;
  for (let j = startIdx; j < Math.min(startIdx + 10, lines.length); j++) {
    const trimmed = lines[j].trim();
    if (!trimmed) continue;

    // If we hit a commentary marker, this isn't a verse start
    if (
      trimmed.startsWith("உரை:-") ||
      trimmed.startsWith("உரை:-") ||
      trimmed.match(/^உைர:-/)
    ) {
      return false;
    }

    nonEmptyCount++;
    // Check if this line ends with a verse number
    if (extractVerseNumber(trimmed) !== null) {
      return true;
    }

    // Don't look too far ahead (verses are max 4-6 lines)
    if (nonEmptyCount > 6) return false;
  }
  return false;
}

/**
 * Extract a verse number from the end of a line.
 * Verse numbers are integers appearing at the end of a line, typically
 * with whitespace before them.
 * Returns null if no verse number found.
 */
function extractVerseNumber(line: string): number | null {
  // Match a number at the very end of the line, possibly preceded by significant whitespace
  // Verse numbers in this text are separated from verse text by multiple spaces/tabs
  // and are typically the only number at the end of a verse line
  const match = line.match(/\s{2,}(\d{1,3})\s*\.?\s*$/);
  if (match) {
    const num = parseInt(match[1], 10);
    // Verse numbers should be 1-330
    if (num >= 1 && num <= 330) {
      return num;
    }
  }
  return null;
}

/**
 * Remove the verse number from the end of a line.
 */
function removeVerseNumber(line: string): string {
  return line.replace(/\s{2,}\d{1,3}\s*\.?\s*$/, "").trim();
}

/**
 * Group verses into carukkam chapters.
 */
function groupByCarukkam(verses: Verse[]): Map<number, Verse[]> {
  const groups = new Map<number, Verse[]>();

  for (const verse of verses) {
    for (let i = 0; i < CARUKKAM_RANGES.length; i++) {
      const range = CARUKKAM_RANGES[i];
      if (verse.number >= range.start && verse.number <= range.end) {
        if (!groups.has(i + 1)) {
          groups.set(i + 1, []);
        }
        groups.get(i + 1)!.push(verse);
        break;
      }
    }
  }

  return groups;
}

/**
 * Main processing function.
 */
function main() {
  console.log("Processing Yashodhara Kaviyam...\n");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Read raw files
  const file1Path = path.join(RAW_DIR, "yashodhara-kaviyam-carukkam-1-2.txt");
  const file2Path = path.join(RAW_DIR, "yashodhara-kaviyam-carukkam-3-5.txt");

  if (!fs.existsSync(file1Path)) {
    console.error(`File not found: ${file1Path}`);
    process.exit(1);
  }
  if (!fs.existsSync(file2Path)) {
    console.error(`File not found: ${file2Path}`);
    process.exit(1);
  }

  const text1 = fs.readFileSync(file1Path, "utf-8");
  const text2 = fs.readFileSync(file2Path, "utf-8");

  console.log(`File 1: ${text1.split("\n").length} lines`);
  console.log(`File 2: ${text2.split("\n").length} lines`);

  // Extract verses from both files
  const verses1 = extractVerses(text1);
  const verses2 = extractVerses(text2);

  console.log(`\nExtracted ${verses1.length} verses from file 1`);
  console.log(`Extracted ${verses2.length} verses from file 2`);

  // Combine all verses
  const allVerses = [...verses1, ...verses2];

  // Sort by verse number
  allVerses.sort((a, b) => a.number - b.number);

  // Remove duplicates (if any verse appears in both files)
  const uniqueVerses: Verse[] = [];
  const seen = new Set<number>();
  for (const v of allVerses) {
    if (!seen.has(v.number)) {
      seen.add(v.number);
      uniqueVerses.push(v);
    }
  }

  console.log(`Total unique verses: ${uniqueVerses.length}`);
  console.log(
    `Verse number range: ${uniqueVerses[0]?.number} - ${uniqueVerses[uniqueVerses.length - 1]?.number}`
  );

  // Check for gaps
  const expectedNumbers = new Set(
    Array.from({ length: 330 }, (_, i) => i + 1)
  );
  const foundNumbers = new Set(uniqueVerses.map(v => v.number));
  const missing = [...expectedNumbers].filter(n => !foundNumbers.has(n));
  if (missing.length > 0) {
    console.warn(`\nWARNING: Missing verse numbers: ${missing.join(", ")}`);
  }

  // Group by carukkam
  const groups = groupByCarukkam(uniqueVerses);

  // Write output files
  for (let ch = 1; ch <= 5; ch++) {
    const carukkamVerses = groups.get(ch) || [];
    const range = CARUKKAM_RANGES[ch - 1];

    const paragraphs = carukkamVerses.map((verse, idx) => ({
      index: idx,
      text: `[${verse.number}] ${verse.lines.join("\n")}`,
    }));

    const output = {
      chapterNumber: ch,
      title: range.title,
      sourceContent: {
        paragraphs,
      },
    };

    const outPath = path.join(
      OUTPUT_DIR,
      `chapter-${String(ch).padStart(3, "0")}.json`
    );
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

    console.log(
      `  Chapter ${ch}: ${carukkamVerses.length} verses → ${outPath}`
    );
  }

  console.log("\nDone!");
}

main();
