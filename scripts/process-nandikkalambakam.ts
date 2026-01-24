/**
 * Processes the Nandikkalambakam raw text into structured JSON.
 *
 * The raw text contains Tamil poetry from the Nandikkalambakam, a multi-poet
 * anthology praising King Nandivarman III Pallava (c. 850 CE).
 *
 * Structure:
 * - Kappu (invocation, no number) becomes chapter 1
 * - Poems 1-88 become chapters 2-89 (note: no poem 35 in source, duplicate poem 34)
 * - Supplement poems S1-1 through S1-22 become chapters 90-111
 * - Supplement poems S2-1 through S2-3 become chapters 112-114
 *
 * Each poem becomes a single paragraph (all lines joined by \n).
 * Structural markers in parentheses like (taravai), (taazicai), etc. are preserved.
 *
 * Usage: pnpm tsx scripts/process-nandikkalambakam.ts
 */

import fs from "fs";
import path from "path";

const RAW_FILE = path.resolve("data/raw/nandikkalambakam/nandikkalambakam-clean.txt");
const OUTPUT_DIR = path.resolve("data/processed/nandikkalambakam");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

interface RawPoem {
  identifier: string; // "kappu", "1", "34", "S1-1", "S2-3", etc.
  lines: string[];
}

function main() {
  const rawText = fs.readFileSync(RAW_FILE, "utf-8");
  const lines = rawText.split("\n");

  // Parse the file into poems
  const poems: RawPoem[] = [];
  let currentIdentifier: string | null = null;
  let currentLines: string[] = [];
  let isFirstPoem = true;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Check if this line is a poem identifier
    // Identifiers are: standalone numbers (1-88), S1-N, S2-N patterns
    const isNumberId = /^\d+$/.test(trimmed);
    const isSupplementId = /^S\d+-\d+$/.test(trimmed);

    if (isNumberId || isSupplementId) {
      // Save previous poem if exists
      if (currentLines.length > 0) {
        poems.push({
          identifier: currentIdentifier || "kappu",
          lines: currentLines,
        });
      }
      currentIdentifier = trimmed;
      currentLines = [];
      isFirstPoem = false;
      continue;
    }

    // Skip blank lines between poems (but they serve as separators)
    if (!trimmed) {
      continue;
    }

    // If we haven't seen a number yet, this is the kappu (invocation)
    if (isFirstPoem && currentIdentifier === null) {
      currentIdentifier = "kappu";
    }

    currentLines.push(trimmed);
  }

  // Don't forget the last poem
  if (currentLines.length > 0) {
    poems.push({
      identifier: currentIdentifier || "kappu",
      lines: currentLines,
    });
  }

  console.log(`Parsed ${poems.length} poems from raw file`);

  // Map poems to chapters
  const chapters: ProcessedChapter[] = [];
  let chapterNumber = 1;

  for (const poem of poems) {
    let title: string;

    if (poem.identifier === "kappu") {
      title = "Kappu (Invocation)";
    } else if (poem.identifier.startsWith("S1-")) {
      const num = poem.identifier.substring(3);
      title = `Supplement S1-${num}`;
    } else if (poem.identifier.startsWith("S2-")) {
      const num = poem.identifier.substring(3);
      title = `Supplement S2-${num}`;
    } else {
      title = `Poem ${poem.identifier}`;
    }

    // Join all lines with \n to form a single paragraph
    const poemText = poem.lines.join("\n");

    const chapter: ProcessedChapter = {
      chapterNumber,
      title,
      sourceContent: {
        paragraphs: [{ index: 0, text: poemText }],
      },
    };

    chapters.push(chapter);
    chapterNumber++;
  }

  // Write output
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const chapter of chapters) {
    const fileName = `chapter-${String(chapter.chapterNumber).padStart(3, "0")}.json`;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, fileName),
      JSON.stringify(chapter, null, 2) + "\n"
    );
  }

  console.log(`\nProcessed ${chapters.length} chapters:`);
  console.log(`  Kappu (invocation): chapter 1`);

  // Count poem types
  const regularPoems = chapters.filter(
    (c) => c.title.startsWith("Poem ")
  );
  const s1Poems = chapters.filter(
    (c) => c.title.startsWith("Supplement S1-")
  );
  const s2Poems = chapters.filter(
    (c) => c.title.startsWith("Supplement S2-")
  );

  console.log(`  Regular poems: ${regularPoems.length} (chapters 2-${1 + regularPoems.length})`);
  console.log(`  Supplement S1: ${s1Poems.length} poems (chapters ${1 + regularPoems.length + 1}-${1 + regularPoems.length + s1Poems.length})`);
  console.log(`  Supplement S2: ${s2Poems.length} poems (chapters ${1 + regularPoems.length + s1Poems.length + 1}-${chapters.length})`);
  console.log(`  Total chapters: ${chapters.length}`);
  console.log(`\nOutput: ${OUTPUT_DIR}`);
}

main();
