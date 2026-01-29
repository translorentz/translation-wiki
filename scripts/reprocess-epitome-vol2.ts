/**
 * Reprocess Epitome of Histories Vol 2 (Books 7-12)
 *
 * Reads the existing processed JSON files, applies aggressive cleaning
 * to remove critical apparatus, Latin translation, FONTES citations,
 * and other contamination, then outputs to a clean directory.
 */

import * as fs from "fs";
import * as path from "path";
import {
  ChapterData,
  processVolume2,
} from "./lib/epitome-cleaning-v2/cleaner.js";

const SOURCE_DIR = "data/processed/epitome-of-histories";
const OUTPUT_DIR = "data/processed/epitome-of-histories-clean";
const REPORT_PATH = "docs/epitome-v2-cleaning-report.md";

// Books 7-12 are chapters 7-12 in our numbering
const CHAPTERS_TO_PROCESS = [7, 8, 9, 10, 11, 12];

async function main() {
  console.log("=== Epitome Vol 2 Cleaning Pipeline ===\n");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load all chapters
  const chapters: ChapterData[] = [];

  for (const chapterNum of CHAPTERS_TO_PROCESS) {
    const filename = `chapter-${String(chapterNum).padStart(3, "0")}.json`;
    const filepath = path.join(SOURCE_DIR, filename);

    if (!fs.existsSync(filepath)) {
      console.error(`Warning: ${filepath} not found, skipping`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filepath, "utf-8")) as ChapterData;
    chapters.push(data);
    console.log(
      `Loaded chapter ${chapterNum}: ${data.sourceContent.paragraphs.length} paragraphs`
    );
  }

  console.log(`\nProcessing ${chapters.length} chapters...\n`);

  // Process all chapters
  const { cleanedChapters, aggregateStats, perChapterStats, fullReport } =
    processVolume2(chapters);

  // Write cleaned chapters
  for (const chapter of cleanedChapters) {
    const filename = `chapter-${String(chapter.chapterNumber).padStart(3, "0")}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(chapter, null, 2));

    const stats = perChapterStats.get(chapter.chapterNumber);
    console.log(
      `Chapter ${chapter.chapterNumber}: ${stats?.originalParagraphs} -> ${stats?.finalParagraphs} paragraphs`
    );
    console.log(
      `  Removed: ${stats?.removedAsLatin} Latin, ${stats?.removedAsApparatus} apparatus, ${stats?.removedAsFontes} FONTES`
    );
  }

  // Write report
  fs.writeFileSync(REPORT_PATH, fullReport);
  console.log(`\nReport written to ${REPORT_PATH}`);

  // Print summary
  console.log("\n=== SUMMARY ===");
  console.log(`Grade: ${aggregateStats.grade}`);
  console.log(`Average Score: ${aggregateStats.avgScore.toFixed(1)}/100`);
  console.log(
    `Average Greek Ratio: ${(aggregateStats.avgGreekRatio * 100).toFixed(1)}%`
  );
  console.log(
    `Total Apparatus Indicators: ${aggregateStats.totalApparatusIndicators}`
  );
  console.log(`Chapters with FONTES: ${aggregateStats.chaptersWithFontes}`);

  if (aggregateStats.grade >= "B+") {
    console.log("\n[SUCCESS] Grade B+ or higher achieved!");
  } else {
    console.log(
      `\n[NEEDS WORK] Current grade is ${aggregateStats.grade}, target is B+`
    );
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
