/**
 * Reprocess Epitome of Histories Volume 1 (Books 1-6)
 *
 * Reads the original processed files, applies cleaning filters,
 * and outputs cleaned versions.
 *
 * Usage: pnpm tsx scripts/reprocess-epitome-vol1.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  cleanChapter,
  type ChapterData,
  type CleaningStats,
} from './lib/epitome-cleaning-v1/cleaner.js';
import {
  validateChapter,
  generateQualityReport,
  type ChapterValidation,
} from './lib/epitome-cleaning-v1/validators.js';

const INPUT_DIR = 'data/processed/epitome-of-histories';
const OUTPUT_DIR = 'data/processed/epitome-of-histories-clean';
const CHAPTERS_TO_PROCESS = [1, 2, 3, 4, 5, 6]; // Books 1-6

async function main() {
  console.log('='.repeat(60));
  console.log('Epitome of Histories Vol. 1 Cleaning Pipeline');
  console.log('='.repeat(60));
  console.log('');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const allStats: CleaningStats[] = [];
  const allValidations: ChapterValidation[] = [];

  for (const chapterNum of CHAPTERS_TO_PROCESS) {
    const inputPath = path.join(
      INPUT_DIR,
      `chapter-${String(chapterNum).padStart(3, '0')}.json`
    );
    const outputPath = path.join(
      OUTPUT_DIR,
      `chapter-${String(chapterNum).padStart(3, '0')}.json`
    );

    console.log(`Processing Chapter ${chapterNum}...`);

    // Read input file
    if (!fs.existsSync(inputPath)) {
      console.error(`  ERROR: Input file not found: ${inputPath}`);
      continue;
    }

    const inputData = JSON.parse(
      fs.readFileSync(inputPath, 'utf-8')
    ) as ChapterData;

    console.log(`  Input: ${inputData.sourceContent.paragraphs.length} paragraphs`);

    // Clean the chapter
    const { cleanedChapter, stats } = cleanChapter(inputData);
    allStats.push(stats);

    console.log(`  Cleaned: ${stats.cleanedCount} paragraphs`);
    console.log(`  Removed: ${stats.removedCount} paragraphs`);
    console.log(
      `    - FONTES: ${stats.classifications.fontes}`
    );
    console.log(
      `    - Apparatus: ${stats.classifications.apparatus}`
    );

    // Validate the cleaned chapter
    const validation = validateChapter(
      cleanedChapter.sourceContent.paragraphs,
      chapterNum,
      stats.removedCount,
      {
        fontes: stats.classifications.fontes,
        apparatus: stats.classifications.apparatus,
        highLatinRatio: stats.classifications.mixed,
      }
    );
    allValidations.push(validation);

    console.log(
      `  Greek ratio: ${(validation.averageGreekRatio * 100).toFixed(1)}%`
    );
    console.log(
      `  Status: ${validation.passed ? 'PASS' : 'NEEDS REVIEW'}`
    );
    if (validation.issues.length > 0) {
      for (const issue of validation.issues) {
        console.log(`    WARNING: ${issue}`);
      }
    }

    // Write output file
    fs.writeFileSync(outputPath, JSON.stringify(cleanedChapter, null, 2));
    console.log(`  Output: ${outputPath}`);
    console.log('');
  }

  // Generate quality report
  const report = generateQualityReport(allValidations);
  const reportPath = path.join(OUTPUT_DIR, 'quality-report.md');
  fs.writeFileSync(reportPath, report);
  console.log(`Quality report: ${reportPath}`);

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const totalOriginal = allStats.reduce((sum, s) => sum + s.originalCount, 0);
  const totalCleaned = allStats.reduce((sum, s) => sum + s.cleanedCount, 0);
  const totalRemoved = allStats.reduce((sum, s) => sum + s.removedCount, 0);
  const totalFontes = allStats.reduce(
    (sum, s) => sum + s.classifications.fontes,
    0
  );
  const totalApparatus = allStats.reduce(
    (sum, s) => sum + s.classifications.apparatus,
    0
  );

  console.log(`Total original paragraphs: ${totalOriginal}`);
  console.log(`Total cleaned paragraphs: ${totalCleaned}`);
  console.log(
    `Total removed: ${totalRemoved} (${((totalRemoved / totalOriginal) * 100).toFixed(1)}%)`
  );
  console.log(`  - FONTES citations: ${totalFontes}`);
  console.log(`  - Apparatus notes: ${totalApparatus}`);
  console.log('');

  const passedCount = allValidations.filter(v => v.passed).length;
  console.log(
    `Validation: ${passedCount}/${allValidations.length} chapters passed`
  );

  if (passedCount < allValidations.length) {
    console.log('');
    console.log('Chapters needing review:');
    for (const v of allValidations) {
      if (!v.passed) {
        console.log(`  - Chapter ${v.chapterNumber}: ${v.issues.join(', ')}`);
      }
    }
  }
}

main().catch(console.error);
