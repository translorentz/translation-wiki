/**
 * Diarium Urbis Romae — Cleaning Script (Agent B)
 *
 * Reads the complete OCR scan and produces clean text files
 * split by time period. Removes page headers, footnotes,
 * line numbers, and normalizes spacing.
 *
 * Source: data/difficult_extra_processing/diarium_urbis_romae/complete_text_scan_2.txt
 * Output: data/difficult_extra_processing/diarium_urbis_romae/clean_copy_b/
 *
 * Usage: pnpm tsx scripts/clean-diarium-b.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { identifySections } from './lib/diarium-b/section-splitter.js';
import { cleanDiaryText, isPageHeader, isApparatusLine, normalizeSpacing } from './lib/diarium-b/cleaner.js';
import { findYearTransitions, assignYearPeriods } from './lib/diarium-b/year-splitter.js';
import { CleaningStats } from './lib/diarium-b/types.js';

const SOURCE_FILE = path.resolve(__dirname, '../data/difficult_extra_processing/diarium_urbis_romae/complete_text_scan_2.txt');
const OUTPUT_DIR = path.resolve(__dirname, '../data/difficult_extra_processing/diarium_urbis_romae/clean_copy_b');

function main() {
  console.log('=== Diarium Urbis Romae Cleaning Pipeline (Agent B) ===');
  console.log(`Source: ${SOURCE_FILE}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log();

  // Read source file
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`ERROR: Source file not found: ${SOURCE_FILE}`);
    process.exit(1);
  }

  const rawText = fs.readFileSync(SOURCE_FILE, 'utf-8');
  const lines = rawText.split('\n');
  console.log(`Total lines in source: ${lines.length}`);

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Step 1: Identify major sections
  console.log('\n--- Step 1: Identifying sections ---');
  const sections = identifySections(lines);
  for (const section of sections) {
    console.log(`  ${section.type}: lines ${section.startLine + 1}-${section.endLine + 1} (${section.title})`);
  }

  // Step 2: Clean and write the preface
  const prefaceSection = sections.find(s => s.type === 'preface');
  if (prefaceSection) {
    console.log('\n--- Step 2: Cleaning preface ---');
    const prefaceResult = cleanPreface(lines, prefaceSection.startLine, prefaceSection.endLine);
    const prefacePath = path.join(OUTPUT_DIR, 'preface.txt');
    fs.writeFileSync(prefacePath, prefaceResult.cleaned.join('\n'), 'utf-8');
    console.log(`  Written: preface.txt (${prefaceResult.cleaned.length} lines)`);
    printStats(prefaceResult.stats);
  }

  // Step 3: Clean the main diary text
  const diarySection = sections.find(s => s.type === 'diary');
  if (diarySection) {
    console.log('\n--- Step 3: Cleaning main diary text ---');
    const diaryResult = cleanDiaryText(lines, diarySection.startLine, diarySection.endLine);
    console.log(`  Cleaned diary: ${diaryResult.cleaned.length} lines`);
    printStats(diaryResult.stats);

    // Step 4: Split by year periods
    console.log('\n--- Step 4: Splitting by year periods ---');
    const transitions = findYearTransitions(diaryResult.cleaned);
    console.log(`  Found ${transitions.length} year transitions`);
    if (transitions.length > 0) {
      console.log(`  First: year ${transitions[0].year} at line ${transitions[0].lineIndex + 1}`);
      console.log(`  Last: year ${transitions[transitions.length - 1].year} at line ${transitions[transitions.length - 1].lineIndex + 1}`);
    }

    const periods = assignYearPeriods(diaryResult.cleaned, transitions);
    console.log(`  Assigned ${periods.length} periods`);

    for (const period of periods) {
      const periodLines = diaryResult.cleaned.slice(period.startLine, period.endLine + 1);
      const filename = `diary-${period.label}.txt`;
      const filepath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(filepath, periodLines.join('\n'), 'utf-8');
      console.log(`  Written: ${filename} (${periodLines.length} lines, years ${period.startYear}-${period.endYear})`);
    }

    // Write the full cleaned diary as one file too (for reference)
    const fullDiaryPath = path.join(OUTPUT_DIR, 'diary-full.txt');
    fs.writeFileSync(fullDiaryPath, diaryResult.cleaned.join('\n'), 'utf-8');
    console.log(`  Written: diary-full.txt (${diaryResult.cleaned.length} lines, complete)`);
  }

  // Step 5: Clean the "Altro principio" appendix
  const appendixSection = sections.find(s => s.type === 'appendix');
  if (appendixSection) {
    console.log('\n--- Step 5: Cleaning "Altro principio" appendix ---');
    const appendixResult = cleanDiaryText(lines, appendixSection.startLine, appendixSection.endLine);
    const appendixPath = path.join(OUTPUT_DIR, 'altro-principio.txt');
    fs.writeFileSync(appendixPath, appendixResult.cleaned.join('\n'), 'utf-8');
    console.log(`  Written: altro-principio.txt (${appendixResult.cleaned.length} lines)`);
    printStats(appendixResult.stats);
  }

  console.log('\n=== Cleaning complete ===');
}

/**
 * Cleans the preface section (Tommasini's scholarly introduction).
 * Similar to diary cleaning but preserves more structure.
 */
function cleanPreface(lines: string[], startLine: number, endLine: number): { cleaned: string[]; stats: CleaningStats } {
  const stats: CleaningStats = {
    totalLinesInput: endLine - startLine + 1,
    pageHeadersRemoved: 0,
    footnotesRemoved: 0,
    hyphenationsFixed: 0,
    extraSpacesFixed: 0,
    blankLinesNormalized: 0,
    totalLinesOutput: 0,
  };

  const result: string[] = [];

  for (let i = startLine; i <= endLine; i++) {
    let line = lines[i];

    // Skip page headers in preface
    if (isPageHeader(line)) {
      stats.pageHeadersRemoved++;
      continue;
    }

    // Skip footnotes in preface (numbered references)
    const isApparatus = isApparatusLine(line);
    if (isApparatus) {
      stats.footnotesRemoved++;
      // Skip until next blank line or page header
      while (i + 1 <= endLine && lines[i + 1].trim() && !isPageHeader(lines[i + 1])) {
        i++;
        stats.footnotesRemoved++;
      }
      continue;
    }

    // Normalize spacing
    const before = line;
    line = normalizeSpacing(line);
    if (line !== before) stats.extraSpacesFixed++;

    // Handle hyphenation
    if (line.match(/\w+-\s*$/) && i + 1 <= endLine) {
      const nextLine = lines[i + 1];
      if (nextLine.trim() && !isPageHeader(nextLine)) {
        const match = line.match(/^(.+?)(\w+)-\s*$/);
        const nextMatch = nextLine.match(/^\s*(\w+)(.*)/);
        if (match && nextMatch) {
          line = match[1] + match[2] + nextMatch[1];
          lines[i + 1] = nextMatch[2].trimStart() ? '  ' + nextMatch[2].trimStart() : '';
          stats.hyphenationsFixed++;
        }
      }
    }

    const trimmed = line.trim();
    if (trimmed) {
      result.push(trimmed);
    } else {
      if (result.length > 0 && result[result.length - 1] !== '') {
        result.push('');
        stats.blankLinesNormalized++;
      }
    }
  }

  // Remove trailing blanks
  while (result.length > 0 && result[result.length - 1] === '') {
    result.pop();
  }

  stats.totalLinesOutput = result.length;
  return { cleaned: result, stats };
}

function printStats(stats: CleaningStats) {
  console.log(`    Input lines: ${stats.totalLinesInput}`);
  console.log(`    Output lines: ${stats.totalLinesOutput}`);
  console.log(`    Page headers removed: ${stats.pageHeadersRemoved}`);
  console.log(`    Footnote lines removed: ${stats.footnotesRemoved}`);
  console.log(`    Hyphenations fixed: ${stats.hyphenationsFixed}`);
  console.log(`    Extra spaces normalized: ${stats.extraSpacesFixed}`);
}

main();
