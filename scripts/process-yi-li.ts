/**
 * Processes the Yi Li (儀禮) raw text into structured JSON for database seeding.
 *
 * The Yi Li ("Ceremonies and Rites") is one of the Three Ritual Classics of
 * Confucianism, containing 17 chapters (篇) describing ceremonies for the
 * scholar-official (士) class.
 *
 * SOURCE FILES:
 *   data/yi_li/01_士冠禮.txt through 17_有司.txt
 *   Each file contains ONE chapter of pure base text (經).
 *   Lines are paragraphs; no commentary is present in these source files.
 *
 * OUTPUT:
 *   data/processed/yi-li/chapter-001.json through chapter-017.json
 *   Format: { chapterNumber, title, sourceContent: { paragraphs: [{ index, text }] } }
 *
 * COMMENTARY NOTE:
 *   The raw files do NOT contain Zheng Xuan's commentary (鄭注).
 *   If annotated source files become available, the parser in
 *   scripts/lib/yili/parser.ts can detect commentary markers and
 *   prefix those paragraphs with [注].
 *
 * Usage: pnpm tsx scripts/process-yi-li.ts
 */

import fs from "fs";
import path from "path";
import { parseYiLiChapter, validateChapter } from "./lib/yili/parser";
import { YI_LI_CHAPTERS, YiLiChapter } from "./lib/yili/types";

const RAW_DIR = path.resolve("data/yi_li");
const OUTPUT_DIR = path.resolve("data/processed/yi-li");

function main() {
  console.log("=== Processing Yi Li (儀禮) ===\n");

  // Verify raw directory exists
  if (!fs.existsSync(RAW_DIR)) {
    console.error(`ERROR: Raw directory not found: ${RAW_DIR}`);
    console.error("Place Yi Li text files in data/yi_li/");
    process.exit(1);
  }

  // List raw files
  const rawFiles = fs
    .readdirSync(RAW_DIR)
    .filter((f) => f.endsWith(".txt"))
    .sort();

  console.log(`Found ${rawFiles.length} raw files in ${RAW_DIR}`);

  if (rawFiles.length === 0) {
    console.error("ERROR: No .txt files found");
    process.exit(1);
  }

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalChapters = 0;
  let totalParagraphs = 0;
  let totalCommentary = 0;
  const results: { chapter: number; title: string; paragraphs: number; commentary: number; warnings: string[] }[] = [];

  for (const file of rawFiles) {
    // Extract chapter number from filename: NN_ChineseTitle.txt
    const match = file.match(/^(\d+)_(.+)\.txt$/);
    if (!match) {
      console.log(`  [skip] ${file}: unexpected filename format`);
      continue;
    }

    const chapterNumber = parseInt(match[1], 10);
    const filenameChinese = match[2];

    // Look up the English title from our reference table
    const chapterInfo = YI_LI_CHAPTERS.find((c) => c.number === chapterNumber);
    const englishTitle = chapterInfo?.english || `Chapter ${chapterNumber}`;
    const chineseTitle = chapterInfo?.chinese || filenameChinese;

    // Read and parse the raw file
    const rawContent = fs.readFileSync(path.join(RAW_DIR, file), "utf-8");
    const paragraphs = parseYiLiChapter(rawContent);

    // Validate
    const validation = validateChapter(paragraphs);

    if (!validation.valid) {
      console.error(`  [FAIL] Chapter ${chapterNumber} (${chineseTitle}): INVALID`);
      for (const w of validation.warnings) {
        console.error(`         - ${w}`);
      }
      continue;
    }

    // Build the output structure
    // The database schema uses { index, text } paragraphs, so we strip the type field
    // Commentary paragraphs already have [注] prefix in their text
    const chapter: { chapterNumber: number; title: string; sourceContent: { paragraphs: { index: number; text: string }[] } } = {
      chapterNumber,
      title: `${chineseTitle} (${englishTitle})`,
      sourceContent: {
        paragraphs: paragraphs.map((p) => ({ index: p.index, text: p.text })),
      },
    };

    // Write output JSON
    const outputFile = `chapter-${String(chapterNumber).padStart(3, "0")}.json`;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, outputFile),
      JSON.stringify(chapter, null, 2) + "\n"
    );

    totalChapters++;
    totalParagraphs += validation.textParagraphs;
    totalCommentary += validation.commentaryParagraphs;

    results.push({
      chapter: chapterNumber,
      title: chineseTitle,
      paragraphs: validation.textParagraphs,
      commentary: validation.commentaryParagraphs,
      warnings: validation.warnings,
    });

    const warningStr = validation.warnings.length > 0 ? ` [${validation.warnings.length} warnings]` : "";
    console.log(
      `  Ch ${String(chapterNumber).padStart(2, " ")}: ${chineseTitle.padEnd(6)} — ` +
      `${validation.textParagraphs} text` +
      (validation.commentaryParagraphs > 0 ? `, ${validation.commentaryParagraphs} commentary` : "") +
      ` → ${outputFile}${warningStr}`
    );
  }

  // Summary
  console.log("\n=== Summary ===");
  console.log(`  Chapters processed: ${totalChapters}/17`);
  console.log(`  Total main text paragraphs: ${totalParagraphs}`);
  console.log(`  Total commentary paragraphs: ${totalCommentary}`);
  if (totalCommentary === 0) {
    console.log("  NOTE: No Zheng Xuan commentary found in source files.");
    console.log("        These files contain ONLY the base text (經).");
  }
  console.log(`  Output directory: ${OUTPUT_DIR}`);

  // Report any chapters with warnings
  const chaptersWithWarnings = results.filter((r) => r.warnings.length > 0);
  if (chaptersWithWarnings.length > 0) {
    console.log("\n  Chapters with warnings:");
    for (const r of chaptersWithWarnings) {
      for (const w of r.warnings) {
        console.log(`    Ch ${r.chapter} (${r.title}): ${w}`);
      }
    }
  }

  console.log("\nDone.");
}

main();
