#!/usr/bin/env npx tsx
/**
 * Reprocess Epitome of Histories Volume 3 (Books 13-18) with improved cleaning
 *
 * This script uses the enhanced cleaning modules in scripts/lib/epitome-cleaning-v3/
 * to produce cleaner Greek text output.
 *
 * Output: data/processed/epitome-of-histories-clean/chapter-013.json through chapter-018.json
 *
 * Usage:
 *   npx tsx scripts/reprocess-epitome-vol3.ts [--verbose] [--no-report]
 */

import * as path from 'path';
import {
  cleanEpitomeVolume3,
  writeChapters,
  printSummary,
} from './lib/epitome-cleaning-v3';

const RAW_FILE = path.join(__dirname, '../data/raw/epitome_of_histories/epitome_vol3.txt');
const OUTPUT_DIR = path.join(__dirname, '../data/processed/epitome-of-histories-clean');

function main(): void {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const generateReport = !args.includes('--no-report');

  console.log('=== Reprocessing Epitome of Histories Volume 3 ===');
  console.log('');
  console.log(`Source: ${RAW_FILE}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Verbose: ${verbose}`);
  console.log(`Generate Report: ${generateReport}`);
  console.log('');

  try {
    const { chapters, stats, quality } = cleanEpitomeVolume3({
      rawFilePath: RAW_FILE,
      outputDir: OUTPUT_DIR,
      verbose,
      generateReport,
    });

    writeChapters(chapters, OUTPUT_DIR);
    printSummary(chapters, stats, quality);

    // Calculate overall grade
    const avgScore = quality.reduce((sum, q) => sum + q.overallScore, 0) / quality.length;
    let overallGrade: string;
    if (avgScore >= 90) overallGrade = 'A';
    else if (avgScore >= 85) overallGrade = 'A-';
    else if (avgScore >= 80) overallGrade = 'B+';
    else if (avgScore >= 75) overallGrade = 'B';
    else if (avgScore >= 70) overallGrade = 'B-';
    else if (avgScore >= 65) overallGrade = 'C+';
    else if (avgScore >= 60) overallGrade = 'C';
    else overallGrade = 'D or below';

    console.log('');
    console.log(`=== Overall Grade: ${overallGrade} ===`);
    console.log('');

    if (avgScore < 80) {
      console.log('NOTE: Grade is below B+. Further iteration needed.');
      console.log('Check docs/epitome-v3-cleaning-scratch.md for progress tracking.');
    } else {
      console.log('Target grade B+ achieved!');
    }

  } catch (error) {
    console.error('Error during processing:', error);
    process.exit(1);
  }
}

main();
