/**
 * Processes the Ptochoprodromika raw text into structured JSON.
 *
 * The raw text contains Byzantine Greek vernacular poetry with line numbers
 * appearing every 5 lines as standalone numbers. This script:
 * 1. Strips line numbers (standalone digit-only lines)
 * 2. Splits into poems (separated by multiple blank lines)
 * 3. Creates one paragraph per verse line (index = line number)
 *
 * Usage: pnpm tsx scripts/process-ptochoprodromos.ts
 */

import fs from "fs";
import path from "path";

const RAW_FILE = path.resolve("data/raw/ptochoprodromos/Ptochoprodromos.txt");
const OUTPUT_DIR = path.resolve("data/processed/ptochoprodromos");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

function isLineNumber(line: string): boolean {
  return /^\d+$/.test(line.trim());
}

function main() {
  const rawText = fs.readFileSync(RAW_FILE, "utf-8");
  const lines = rawText.split("\n");

  // Skip header lines (title, author, blank lines before first poem)
  // Find first actual verse line (long Greek text, not title/author)
  let startIdx = 0;
  let passedHeader = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // Skip blank lines and short header lines (title, author)
    if (!trimmed) {
      if (passedHeader) {
        startIdx = i;
        break;
      }
      continue;
    }
    if (trimmed.length < 30 && !isLineNumber(trimmed)) {
      passedHeader = true;
      continue;
    }
    // First long line is the start of verse
    startIdx = i;
    break;
  }

  // Split into poem sections (separated by 2+ blank lines)
  const poems: string[][] = [];
  let currentPoem: string[] = [];
  let consecutiveBlanks = 0;

  for (let i = startIdx; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      consecutiveBlanks++;
      if (consecutiveBlanks >= 2 && currentPoem.length > 0) {
        poems.push(currentPoem);
        currentPoem = [];
      }
      continue;
    }

    consecutiveBlanks = 0;

    // Skip standalone line numbers
    if (isLineNumber(trimmed)) continue;

    currentPoem.push(trimmed);
  }

  if (currentPoem.length > 0) {
    poems.push(currentPoem);
  }

  console.log(`Found ${poems.length} poems`);

  // Poem titles (traditional numbering)
  const POEM_TITLES = [
    "Ποίημα Αʹ — Τοῦ Γραμματικοῦ (Poem I — The Scholar)",
    "Ποίημα Βʹ — Τοῦ Ἐραστοῦ (Poem II — The Lover)",
    "Ποίημα Γʹ (Poem III)",
    "Ποίημα Δʹ (Poem IV)",
  ];

  // Process each poem
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (let i = 0; i < poems.length; i++) {
    const poemLines = poems[i];
    const chapterNumber = i + 1;

    const chapter: ProcessedChapter = {
      chapterNumber,
      title: POEM_TITLES[i] || `Ποίημα ${chapterNumber} (Poem ${chapterNumber})`,
      sourceContent: {
        paragraphs: poemLines.map((text, lineIdx) => ({
          index: lineIdx + 1, // 1-based line numbers
          text,
        })),
      },
    };

    const fileName = `chapter-${String(chapterNumber).padStart(3, "0")}.json`;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, fileName),
      JSON.stringify(chapter, null, 2) + "\n"
    );

    console.log(`  Poem ${chapterNumber}: ${poemLines.length} lines → ${fileName}`);
  }

  console.log(`\nDone. Output: ${OUTPUT_DIR}`);
}

main();
