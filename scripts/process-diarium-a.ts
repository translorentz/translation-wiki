/**
 * process-diarium-a.ts
 *
 * Primary Text Agent A's processing script for the Diario della Citta di Roma
 * by Stefano Infessura (Tommasini 1890 edition).
 *
 * Source: data/difficult_extra_processing/diarium_urbis_romae/complete_text_scan_1.txt
 * Output: data/difficult_extra_processing/diarium_urbis_romae/clean_copy_a/
 *
 * Usage: pnpm tsx scripts/process-diarium-a.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  identifySections,
  extractSection,
  cleanDiarySection,
  cleanPrefaceSection,
  splitByYear,
  groupByPeriod,
} from './lib/diarium/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const SOURCE_FILE = join(ROOT, 'data/difficult_extra_processing/diarium_urbis_romae/complete_text_scan_1.txt');
const OUTPUT_DIR = join(ROOT, 'data/difficult_extra_processing/diarium_urbis_romae/clean_copy_a');

function main() {
  console.log('=== Diarium Urbis Romae — Agent A Cleaning Pipeline ===\n');

  // Read source file
  console.log(`Reading source: ${SOURCE_FILE}`);
  const rawText = readFileSync(SOURCE_FILE, 'utf-8');
  const allLines = rawText.split('\n');
  console.log(`Total lines: ${allLines.length}\n`);

  // Identify sections
  console.log('Identifying sections...');
  const sections = identifySections(allLines);
  console.log(`  Preface: lines ${sections.prefaceStart}-${sections.prefaceEnd}`);
  console.log(`  Diary: lines ${sections.diaryStart}-${sections.diaryEnd}`);
  console.log(`  Altro principio: lines ${sections.altroPrincipioStart}-${sections.altroPrincipioEnd}`);
  console.log(`  Index: line ${sections.indexStart}+\n`);

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // === Process Preface ===
  console.log('--- Processing PREFACE ---');
  const prefaceLines = extractSection(allLines, sections.prefaceStart, sections.prefaceEnd);
  const prefaceResult = cleanPrefaceSection(prefaceLines);
  console.log(`  Input lines: ${prefaceLines.length}`);
  console.log(`  Headers removed: ${prefaceResult.stats.headerLinesRemoved}`);
  console.log(`  Footnotes removed: ${prefaceResult.stats.footnoteLinesRemoved}`);
  console.log(`  Hyphens rejoined: ${prefaceResult.stats.hyphensRejoined}`);
  console.log(`  Output lines: ${prefaceResult.stats.outputLines}`);

  const prefacePath = join(OUTPUT_DIR, 'preface.txt');
  writeFileSync(prefacePath, prefaceResult.lines.join('\n'), 'utf-8');
  console.log(`  Written: ${prefacePath}\n`);

  // === Process Main Diary ===
  console.log('--- Processing MAIN DIARY ---');
  const diaryLines = extractSection(allLines, sections.diaryStart, sections.diaryEnd);
  const diaryResult = cleanDiarySection(diaryLines);
  console.log(`  Input lines: ${diaryLines.length}`);
  console.log(`  Headers removed: ${diaryResult.stats.headerLinesRemoved}`);
  console.log(`  Footnotes removed: ${diaryResult.stats.footnoteLinesRemoved}`);
  console.log(`  Folio refs removed: ${diaryResult.stats.folioRefsRemoved}`);
  console.log(`  Line numbers removed: ${diaryResult.stats.lineNumbersRemoved}`);
  console.log(`  Markers removed: ${diaryResult.stats.markersRemoved}`);
  console.log(`  Hyphens rejoined: ${diaryResult.stats.hyphensRejoined}`);
  console.log(`  Output lines: ${diaryResult.stats.outputLines}`);

  // Write full diary
  const fullDiaryPath = join(OUTPUT_DIR, 'diary-full.txt');
  writeFileSync(fullDiaryPath, diaryResult.lines.join('\n'), 'utf-8');
  console.log(`  Written: ${fullDiaryPath}`);

  // Split by year and group by period
  console.log('\n  Splitting diary by year...');
  const yearEntries = splitByYear(diaryResult.lines);
  console.log(`  Year entries found: ${yearEntries.length}`);

  const periodGroups = groupByPeriod(yearEntries);
  console.log(`  Period groups: ${periodGroups.size}`);

  for (const [period, entries] of periodGroups) {
    const content = entries.map(e => e.text).join('\n\n');
    const filename = `diary-${period}.txt`;
    const filepath = join(OUTPUT_DIR, filename);
    writeFileSync(filepath, content, 'utf-8');
    const lineCount = content.split('\n').length;
    console.log(`  Written: ${filename} (${entries.length} entries, ${lineCount} lines)`);
  }

  // === Process Altro Principio ===
  console.log('\n--- Processing ALTRO PRINCIPIO ---');
  const altroLines = extractSection(allLines, sections.altroPrincipioStart, sections.altroPrincipioEnd);
  const altroResult = cleanDiarySection(altroLines);
  console.log(`  Input lines: ${altroLines.length}`);
  console.log(`  Headers removed: ${altroResult.stats.headerLinesRemoved}`);
  console.log(`  Footnotes removed: ${altroResult.stats.footnoteLinesRemoved}`);
  console.log(`  Output lines: ${altroResult.stats.outputLines}`);

  const altroPath = join(OUTPUT_DIR, 'altro-principio.txt');
  writeFileSync(altroPath, altroResult.lines.join('\n'), 'utf-8');
  console.log(`  Written: ${altroPath}\n`);

  // === Summary ===
  console.log('=== COMPLETE ===');
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Files written:`);
  console.log(`  preface.txt — Tommasini's scholarly preface`);
  console.log(`  diary-full.txt — Complete diary text (all years)`);
  for (const period of periodGroups.keys()) {
    console.log(`  diary-${period}.txt — Diary entries ${period}`);
  }
  console.log(`  altro-principio.txt — Alternative beginning (1294-1305)`);
}

main();
