/**
 * Processes the Porunararruppadai raw text into structured JSON.
 *
 * The raw text is a single Sangam Tamil poem of 248 lines.
 * This script groups lines into stanzas of ~15 lines each,
 * creating one chapter with multiple paragraphs (stanzas).
 *
 * Usage: pnpm tsx scripts/process-porunararruppadai.ts
 */

import fs from "fs";
import path from "path";

const RAW_FILE = path.resolve(
  "data/raw/sangam/pattuppattu/porunararruppadai/poem.txt"
);
const OUTPUT_DIR = path.resolve("data/processed/porunararruppadai");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

const STANZA_SIZE = 15; // lines per stanza/paragraph group

function main() {
  const rawText = fs.readFileSync(RAW_FILE, "utf-8");
  const allLines = rawText.split("\n");

  // Filter out empty lines at the end, keep only non-empty verse lines
  const verseLines: string[] = [];
  for (const line of allLines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      verseLines.push(trimmed);
    }
  }

  console.log(`Total verse lines: ${verseLines.length}`);

  // Group lines into stanzas of STANZA_SIZE lines each
  const paragraphs: { index: number; text: string }[] = [];
  let stanzaIndex = 0;

  for (let i = 0; i < verseLines.length; i += STANZA_SIZE) {
    const stanzaLines = verseLines.slice(i, i + STANZA_SIZE);
    paragraphs.push({
      index: stanzaIndex,
      text: stanzaLines.join("\n"),
    });
    stanzaIndex++;
  }

  console.log(`Created ${paragraphs.length} stanzas (paragraphs)`);

  const chapter: ProcessedChapter = {
    chapterNumber: 1,
    title: "Porunararruppadai",
    sourceContent: {
      paragraphs,
    },
  };

  // Write output
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const fileName = "chapter-001.json";
  fs.writeFileSync(
    path.join(OUTPUT_DIR, fileName),
    JSON.stringify(chapter, null, 2) + "\n"
  );

  console.log(`\nOutput: ${path.join(OUTPUT_DIR, fileName)}`);
  console.log(
    `  ${paragraphs.length} paragraphs, ${verseLines.length} total lines`
  );

  // Print summary of each stanza
  for (const p of paragraphs) {
    const lineCount = p.text.split("\n").length;
    const preview = p.text.split("\n")[0].substring(0, 40);
    console.log(`  Stanza ${p.index}: ${lineCount} lines — "${preview}..."`);
  }
}

main();
