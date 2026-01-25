/**
 * Processes Perch Proshyan's "Anna Saroyan" epistolary novel into structured JSON.
 *
 * The novel consists of letters (chapters) written by Anna Saroyan to her friend
 * Hripsime, spanning September 1880 to October 1881. Each letter is marked by
 * an Armenian numeral (e.g., Ա, Բ, Գ... ԻԴ) followed by a date and salutation.
 *
 * Armenian numerals:
 *    Ա-Թ = 1-9, Ժ = 10, Ի = 20, etc.
 *   Compound numerals: Ժ Ա = 11 (10+1), Ի Ա = 21 (20+1), Ի Դ = 24 (20+4)
 *
 * Input: data/raw/anna_saroyan/anna_saroyan.txt
 * Output: data/processed/anna-saroyan/chapter-NNN.json
 *
 * Usage: pnpm tsx scripts/process-anna-saroyan.ts
 */

import fs from "fs";
import path from "path";

const RAW_FILE = "data/raw/anna_saroyan/anna_saroyan.txt";
const OUTPUT_DIR = "data/processed/anna-saroyan";

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

/**
 * Convert Armenian numeral(s) to Arabic number.
 * Armenian numerals use letters with specific values:
 * Ա=1, Բ=2, Գ=3, Դ=4, Ե=5, Զ=6, Է=7, Ը=8, Թ=9
 * Ժ=10, Ի=20, etc.
 */
function armenianToArabic(armenian: string): number {
  const values: Record<string, number> = {
    "\u0531": 1, // Ա
    "\u0532": 2, // Բ
    "\u0533": 3, // Գ
    "\u0534": 4, // Դ
    "\u0535": 5, // Ե
    "\u0536": 6, // Զ
    "\u0537": 7, // Է
    "\u0538": 8, // Ը
    "\u0539": 9, // Թ
    "\u053A": 10, // Ժ
    "\u053B": 20, // Ի
    "\u053C": 30, // Լ
    "\u053D": 40, // Խ
    "\u053E": 50, // Ծ
    "\u053F": 60, // Կ
    "\u0540": 70, // Հ
    "\u0541": 80, // Ձ
    "\u0542": 90, // Ղ
    "\u0543": 100, // Ճ
  };

  let total = 0;
  for (const char of armenian) {
    total += values[char] || 0;
  }
  return total;
}

/**
 * Check if a line is an Armenian chapter numeral (1-2 uppercase Armenian letters).
 */
function isChapterMarker(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 1 || trimmed.length > 2) return false;
  // Check if all characters are Armenian uppercase letters (U+0531 to U+0556)
  return [...trimmed].every((c) => c >= "\u0531" && c <= "\u0556");
}

/**
 * Main processing function.
 */
function main() {
  console.log("=== Processing Perch Proshyan's Anna Saroyan ===\n");

  // Read raw text
  const rawText = fs.readFileSync(RAW_FILE, "utf-8");
  const lines = rawText.split("\n");

  console.log(`Total lines in source: ${lines.length}`);

  // Find all chapter markers and their line positions
  const chapterStarts: { lineIdx: number; numeral: string; arabic: number }[] =
    [];

  for (let i = 0; i < lines.length; i++) {
    if (isChapterMarker(lines[i])) {
      const numeral = lines[i].trim();
      const arabic = armenianToArabic(numeral);
      chapterStarts.push({ lineIdx: i, numeral, arabic });
    }
  }

  console.log(`Found ${chapterStarts.length} chapter markers\n`);

  // Log chapter markers found (for debugging)
  console.log("Chapter markers found:");
  for (const ch of chapterStarts) {
    console.log(`  Line ${ch.lineIdx + 1}: ${ch.numeral} = Letter ${ch.arabic}`);
  }

  // Note: There's a duplicate "15" at lines 598 and 631 in the original text.
  // Line 631's "ԺԵ" (15) should likely be "ԺԷ" (17) but we'll preserve the original.
  // Missing chapters: 17 (the second "15" may be a typo for 17) and 23.

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Process each chapter
  const chapters: ProcessedChapter[] = [];
  let totalParagraphs = 0;
  let totalCharacters = 0;

  for (let i = 0; i < chapterStarts.length; i++) {
    const start = chapterStarts[i];
    const endLineIdx =
      i + 1 < chapterStarts.length
        ? chapterStarts[i + 1].lineIdx
        : lines.length;

    // Extract content lines for this chapter
    const chapterLines = lines.slice(start.lineIdx, endLineIdx);

    // First line is the numeral
    const numeral = chapterLines[0].trim();

    // Find the date line (contains city, date, year like "Թիֆլիս, 6 սեպտեմբերի, 1880")
    let dateLineIdx = 1;
    while (
      dateLineIdx < chapterLines.length &&
      !chapterLines[dateLineIdx].trim()
    ) {
      dateLineIdx++;
    }
    const dateLine = chapterLines[dateLineIdx]?.trim() || "";

    // Find the salutation line (next non-empty line after date)
    let salutationIdx = dateLineIdx + 1;
    while (
      salutationIdx < chapterLines.length &&
      !chapterLines[salutationIdx].trim()
    ) {
      salutationIdx++;
    }

    // Build title: "Letter [N] — [date]"
    const letterNum = i + 1; // Use sequential numbering for chapter files
    const title = `Նամակ ${numeral} — ${dateLine} (Letter ${letterNum})`;

    // Content starts after the salutation
    let contentStartIdx = salutationIdx;
    // Include the salutation as part of the content for epistolary style

    // Collect paragraphs - split on blank lines
    const contentText = chapterLines.slice(contentStartIdx).join("\n");
    const rawParagraphs = contentText
      .split(/\n\s*\n/)
      .filter((p) => p.trim());

    const paragraphs: { index: number; text: string }[] = [];

    for (const para of rawParagraphs) {
      const text = para
        .trim()
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Skip empty or very short lines (page markers, etc.)
      if (text.length <= 1) continue;

      // Skip isolated zero-width spaces or Unicode markers
      if (/^[\u200B\u200C\u200D\uFEFF]+$/.test(text)) continue;

      paragraphs.push({
        index: paragraphs.length,
        text,
      });
    }

    const chapter: ProcessedChapter = {
      chapterNumber: letterNum,
      title,
      sourceContent: { paragraphs },
    };

    chapters.push(chapter);

    const charCount = paragraphs.reduce((sum, p) => sum + p.text.length, 0);
    totalParagraphs += paragraphs.length;
    totalCharacters += charCount;

    // Write output file
    const outFile = path.join(
      OUTPUT_DIR,
      `chapter-${String(letterNum).padStart(3, "0")}.json`
    );
    fs.writeFileSync(outFile, JSON.stringify(chapter, null, 2), "utf-8");

    console.log(
      `\n  Letter ${letterNum} (${numeral}): ${paragraphs.length} paragraphs, ${charCount.toLocaleString()} chars`
    );
    console.log(`    Title: ${title}`);
  }

  console.log("\n=== Summary ===");
  console.log(`Letters: ${chapters.length}`);
  console.log(`Paragraphs: ${totalParagraphs.toLocaleString()}`);
  console.log(`Characters: ${totalCharacters.toLocaleString()}`);
  console.log(`Output: ${OUTPUT_DIR}/chapter-NNN.json`);
}

main();
