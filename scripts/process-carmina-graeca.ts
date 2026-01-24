/**
 * Process Carmina Graeca Medii Aevi — Main Orchestrator
 *
 * Reads the OCR file containing ~21 medieval Greek poems, splits them apart,
 * classifies content (verse vs. apparatus vs. noise), extracts clean verse,
 * and writes standard chapter JSON files.
 *
 * Usage: pnpm tsx scripts/process-carmina-graeca.ts
 *
 * Options:
 *   --validate-only   Run title validation without processing
 *   --stats-only      Show classification stats without writing output
 *   --chapter N       Process only chapter N
 */

import fs from "fs";
import path from "path";

import { getTitleMap, validateTitles, detectTitlesHeuristic } from "./lib/carmina/title-finder.js";
import { splitTexts, validateSections } from "./lib/carmina/text-splitter.js";
import { classifySection, getClassificationStats } from "./lib/carmina/content-classifier.js";
import { extractVerse } from "./lib/carmina/verse-extractor.js";
import { checkQuality } from "./lib/carmina/quality-checker.js";
import { formatChapter, writeChapter } from "./lib/carmina/output-formatter.js";
import type { QualityReport } from "./lib/carmina/types.js";

const SOURCE_FILE = path.resolve("data/difficult_extra_processing/carmina_graeca_medii_aevi_multiple_titles.txt");

function main() {
  const args = process.argv.slice(2);
  const validateOnly = args.includes("--validate-only");
  const statsOnly = args.includes("--stats-only");
  const chapterArg = args.indexOf("--chapter");
  const singleChapter = chapterArg >= 0 ? parseInt(args[chapterArg + 1], 10) : null;

  // Read the source file
  console.log(`Reading: ${SOURCE_FILE}`);
  const raw = fs.readFileSync(SOURCE_FILE, "utf-8");
  const lines = raw.split("\n");
  console.log(`  ${lines.length} lines loaded`);

  // Phase 1: Title finding
  console.log("\n=== Phase 1: Title Finding ===");
  const titles = getTitleMap();
  console.log(`  ${titles.length} titles in hardcoded map`);

  const validationWarnings = validateTitles(lines);
  if (validationWarnings.length > 0) {
    console.log("  Validation warnings:");
    for (const w of validationWarnings) {
      console.log(`    ⚠ ${w}`);
    }
  } else {
    console.log("  All title positions validated OK");
  }

  // Heuristic comparison
  const heuristicTitles = detectTitlesHeuristic(lines);
  console.log(`  Heuristic detector found ${heuristicTitles.length} ALL-CAPS lines (vs. ${titles.length} hardcoded)`);

  if (validateOnly) {
    console.log("\n  Heuristic title lines:");
    for (const t of heuristicTitles) {
      console.log(`    Line ${t.line}: ${t.text.substring(0, 70)}`);
    }
    return;
  }

  // Phase 2: Text splitting
  console.log("\n=== Phase 2: Text Splitting ===");
  const sections = splitTexts(lines, titles);
  console.log(`  ${sections.length} sections created`);

  const sectionWarnings = validateSections(sections);
  for (const w of sectionWarnings) {
    console.log(`    ⚠ ${w}`);
  }

  for (const s of sections) {
    console.log(`  Ch ${String(s.chapterNumber).padStart(2)}: ${s.rawLines.length} lines — "${s.englishTitle}"`);
  }

  // Filter to single chapter if requested
  const sectionsToProcess = singleChapter
    ? sections.filter((s) => s.chapterNumber === singleChapter)
    : sections;

  if (singleChapter && sectionsToProcess.length === 0) {
    console.error(`  ERROR: Chapter ${singleChapter} not found`);
    process.exit(1);
  }

  // Phase 3-5: Classification, extraction, quality checking
  console.log("\n=== Phase 3-5: Classification, Extraction, Quality ===");
  const reports: QualityReport[] = [];
  let failCount = 0;

  for (const section of sectionsToProcess) {
    // Classify
    const classified = classifySection(section);
    const stats = getClassificationStats(classified);

    if (statsOnly) {
      const total = section.rawLines.length;
      const verseTotal = stats.verse + stats.verse_numbered;
      console.log(
        `  Ch ${String(section.chapterNumber).padStart(2)}: ` +
        `verse=${verseTotal} (${Math.round(verseTotal / total * 100)}%) ` +
        `apparatus=${stats.apparatus} ` +
        `intro=${stats.introduction} ` +
        `noise=${stats.noise} ` +
        `empty=${stats.empty}`
      );
      continue;
    }

    // Extract
    const extracted = extractVerse(section, classified);

    // Quality check
    const report = checkQuality(extracted, classified);
    reports.push(report);

    // Log status
    const statusIcon = report.status === "PASS" ? "✓" : report.status === "WARN" ? "⚠" : "✗";
    console.log(
      `  ${statusIcon} Ch ${String(section.chapterNumber).padStart(2)}: ` +
      `${report.verseLineCount} verse lines, ${report.paragraphCount} paragraphs, ` +
      `avg ${report.avgLineLength} chars — ${report.status}`
    );

    if (report.warnings.length > 0) {
      for (const w of report.warnings) {
        console.log(`      ⚠ ${w}`);
      }
    }
    if (report.errors.length > 0) {
      for (const e of report.errors) {
        console.log(`      ✗ ${e}`);
      }
      failCount++;
    }

    // Phase 6: Write output (even for WARN, skip FAIL)
    if (report.status !== "FAIL") {
      const chapter = formatChapter(extracted);
      const outPath = writeChapter(chapter);
      console.log(`      → ${path.basename(outPath)}`);
    } else {
      console.log(`      → SKIPPED (FAIL status)`);
    }
  }

  if (statsOnly) return;

  // Summary
  console.log("\n=== Summary ===");
  const passCount = reports.filter((r) => r.status === "PASS").length;
  const warnCount = reports.filter((r) => r.status === "WARN").length;
  console.log(`  PASS: ${passCount}  WARN: ${warnCount}  FAIL: ${failCount}`);
  console.log(`  Total verse lines: ${reports.reduce((sum, r) => sum + r.verseLineCount, 0)}`);
  console.log(`  Total paragraphs: ${reports.reduce((sum, r) => sum + r.paragraphCount, 0)}`);

  if (failCount > 0) {
    console.log(`\n  ${failCount} chapter(s) failed quality checks — review needed.`);
  }

  // Write quality report
  const reportPath = path.resolve("data/processed/carmina-graeca/quality-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(reports, null, 2) + "\n");
  console.log(`\n  Quality report: ${reportPath}`);
}

main();
