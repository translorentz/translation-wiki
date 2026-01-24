/**
 * Process Eustathius Commentary on Homer's Odyssey -- Main Orchestrator
 *
 * Reads the OCR file, splits into Odyssey book sections,
 * classifies content (commentary vs. headers/noise), extracts clean text,
 * and writes standard chapter JSON files.
 *
 * Usage: pnpm tsx scripts/process-eustathius.ts [options]
 *
 * Options:
 *   --validate-only   Run boundary validation without processing
 *   --stats-only      Show classification stats without writing output
 *   --chapter N       Process only chapter N
 *   --detect-headers  Show all detected ΡΑΨΩΔΙΑ headers
 *   --volume N        Process volume N (1=Books 1-11, 2=Books 12-24, default: 1)
 *   --all             Process both volumes
 */

import fs from "fs";
import path from "path";

import { getBookBoundaries, validateBoundaries, splitBooks, detectRhapsodiaHeaders } from "./lib/eustathius/book-splitter.js";
import type { VolumeNumber } from "./lib/eustathius/book-splitter.js";
import { classifySection, getClassificationStats } from "./lib/eustathius/content-classifier.js";
import { extractCommentary } from "./lib/eustathius/commentary-extractor.js";
import { checkQuality } from "./lib/eustathius/quality-checker.js";
import { formatChapter, writeChapterJSON, writeChapterTxt, PROCESSED_DIR } from "./lib/eustathius/output-formatter.js";
import type { QualityReport } from "./lib/eustathius/types.js";

const VOL1_SOURCE_FILE = path.resolve("data/difficult_extra_processing/commentariiadhom01eust_djvu.txt");
const VOL2_SOURCE_FILE = path.resolve("data/difficult_extra_processing/commentariiadhom02eust_djvu.txt");

function getSourceFile(volume: VolumeNumber): string {
  return volume === 2 ? VOL2_SOURCE_FILE : VOL1_SOURCE_FILE;
}

function processVolume(volume: VolumeNumber, options: {
  validateOnly: boolean;
  statsOnly: boolean;
  detectHeaders: boolean;
  singleChapter: number | null;
}): QualityReport[] {
  const { validateOnly, statsOnly, detectHeaders, singleChapter } = options;
  const SOURCE_FILE = getSourceFile(volume);

  // Read the source file
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing Volume ${volume} (Books ${volume === 1 ? "1-11" : "12-24"})`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Reading: ${SOURCE_FILE}`);
  const raw = fs.readFileSync(SOURCE_FILE, "utf-8");
  const lines = raw.split("\n");
  console.log(`  ${lines.length} lines loaded`);

  // Detect ΡΑΨΩΔΙΑ headers if requested
  if (detectHeaders) {
    console.log("\n=== Detected ΡΑΨΩΔΙΑ Headers ===");
    const headers = detectRhapsodiaHeaders(lines);
    console.log(`  ${headers.length} headers found`);
    for (const h of headers) {
      console.log(`  Line ${String(h.line).padStart(5)}: ${h.text.substring(0, 80)}`);
    }
    return [];
  }

  // Phase 1: Book boundary identification
  console.log("\n=== Phase 1: Book Boundary Identification ===");
  const boundaries = getBookBoundaries(volume);
  console.log(`  ${boundaries.length} books in boundary map`);

  const validationWarnings = validateBoundaries(lines, volume);
  if (validationWarnings.length > 0) {
    console.log("  Validation warnings:");
    for (const w of validationWarnings) {
      console.log(`    WARNING: ${w}`);
    }
  } else {
    console.log("  All book boundaries validated OK");
  }

  if (validateOnly) return [];

  // Phase 2: Split into book sections
  console.log("\n=== Phase 2: Splitting into Book Sections ===");
  const sections = splitBooks(lines, volume);
  console.log(`  ${sections.length} sections created`);

  for (const s of sections) {
    console.log(`  Ch ${String(s.chapterNumber).padStart(2)}: ${s.rawLines.length} lines -- "${s.title}"`);
  }

  // Filter to single chapter if requested
  const sectionsToProcess = singleChapter !== null
    ? sections.filter((s) => s.chapterNumber === singleChapter)
    : sections;

  if (singleChapter !== null && sectionsToProcess.length === 0) {
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
      console.log(
        `  Ch ${String(section.chapterNumber).padStart(2)}: ` +
        `commentary=${stats.commentary} (${Math.round(stats.commentary / total * 100)}%) ` +
        `headers=${stats.page_header} ` +
        `margin=${stats.margin_number} ` +
        `pagenum=${stats.page_number} ` +
        `noise=${stats.noise} ` +
        `empty=${stats.empty}`
      );
      continue;
    }

    // Extract
    const extracted = extractCommentary(section, classified);

    // Quality check
    const report = checkQuality(extracted, classified);
    reports.push(report);

    // Log status
    const statusIcon = report.status === "PASS" ? "OK" : report.status === "WARN" ? "WARN" : "FAIL";
    console.log(
      `  [${statusIcon}] Ch ${String(section.chapterNumber).padStart(2)}: ` +
      `${report.commentaryLineCount} commentary lines, ${report.paragraphCount} paragraphs, ` +
      `${report.totalCharacters} chars, Greek ${report.greekCharPercent}%, digits=${report.digitCount}`
    );

    if (report.warnings.length > 0) {
      for (const w of report.warnings) {
        console.log(`      WARN: ${w}`);
      }
    }
    if (report.errors.length > 0) {
      for (const e of report.errors) {
        console.log(`      FAIL: ${e}`);
      }
      failCount++;
    }

    // Phase 6: Write output
    if (report.status !== "FAIL") {
      const chapter = formatChapter(extracted);
      const jsonPath = writeChapterJSON(chapter);
      const txtPath = writeChapterTxt(extracted);
      console.log(`      -> ${path.basename(jsonPath)}, ${path.basename(txtPath)}`);
    } else {
      console.log(`      -> SKIPPED (FAIL status)`);
    }
  }

  if (statsOnly) return [];

  // Summary
  console.log("\n=== Summary (Volume " + volume + ") ===");
  const passCount = reports.filter((r) => r.status === "PASS").length;
  const warnCount = reports.filter((r) => r.status === "WARN").length;
  console.log(`  PASS: ${passCount}  WARN: ${warnCount}  FAIL: ${failCount}`);
  console.log(`  Total commentary lines: ${reports.reduce((sum, r) => sum + r.commentaryLineCount, 0)}`);
  console.log(`  Total paragraphs: ${reports.reduce((sum, r) => sum + r.paragraphCount, 0)}`);
  console.log(`  Total characters: ${reports.reduce((sum, r) => sum + r.totalCharacters, 0)}`);

  if (failCount > 0) {
    console.log(`\n  ${failCount} chapter(s) failed quality checks -- review needed.`);
  }

  // Print sample output from each chapter
  console.log("\n=== Sample Output (first 150 chars of each chapter) ===");
  for (const report of reports) {
    if (report.status === "FAIL") continue;
    const section = sectionsToProcess.find((s) => s.chapterNumber === report.chapterNumber);
    if (!section) continue;
    const classified = classifySection(section);
    const extracted = extractCommentary(section, classified);
    const firstPara = extracted.paragraphs[0]?.text || "(empty)";
    console.log(`  Ch ${String(report.chapterNumber).padStart(2)}: ${firstPara.substring(0, 150)}...`);
  }

  return reports;
}

function main() {
  const args = process.argv.slice(2);
  const validateOnly = args.includes("--validate-only");
  const statsOnly = args.includes("--stats-only");
  const detectHeaders = args.includes("--detect-headers");
  const chapterArg = args.indexOf("--chapter");
  const singleChapter = chapterArg >= 0 ? parseInt(args[chapterArg + 1], 10) : null;
  const volumeArg = args.indexOf("--volume");
  const volumeNum = volumeArg >= 0 ? parseInt(args[volumeArg + 1], 10) : null;
  const processAll = args.includes("--all");

  const options = { validateOnly, statsOnly, detectHeaders, singleChapter };

  let allReports: QualityReport[] = [];

  if (processAll) {
    // Process both volumes
    allReports.push(...processVolume(1, options));
    allReports.push(...processVolume(2, options));
  } else if (volumeNum === 2) {
    allReports = processVolume(2, options);
  } else {
    // Default: volume 1
    allReports = processVolume(1, options);
  }

  // Write combined quality report
  if (allReports.length > 0 && !validateOnly && !statsOnly && !detectHeaders) {
    const reportPath = path.join(PROCESSED_DIR, "quality-report.json");
    fs.mkdirSync(PROCESSED_DIR, { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(allReports, null, 2) + "\n");
    console.log(`\n  Quality report: ${reportPath}`);

    // Grand total
    if (processAll) {
      console.log("\n=== Grand Total (Both Volumes) ===");
      console.log(`  Chapters: ${allReports.length}`);
      console.log(`  Total paragraphs: ${allReports.reduce((sum, r) => sum + r.paragraphCount, 0)}`);
      console.log(`  Total characters: ${allReports.reduce((sum, r) => sum + r.totalCharacters, 0)}`);
    }
  }
}

main();
