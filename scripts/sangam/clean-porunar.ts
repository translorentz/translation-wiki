/**
 * clean-porunar.ts
 *
 * Processes the Porunarāṟṟuppaṭai (பொருநர் ஆற்றுப்படை) from Project Madurai.
 * This is the 2nd of the Pattuppāṭṭu (Ten Idylls).
 *
 * Input: data/difficult_extra_processing/tamil_corpus/63_பொருநாறாற்றுப்படை.txt
 * Output: data/raw/sangam/pattuppattu/porunararruppadai/poem.txt
 *
 * Format:
 *   - Header (Project Madurai info, lines 1-38)
 *   - Metadata (author, patron, genre, line count)
 *   - 248 lines of verse with embedded line numbers every 5th line
 *   - Colophon "பொருநர் ஆற்றுப்படை முற்றிற்று."
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_FILE = path.resolve(__dirname, '../../data/difficult_extra_processing/tamil_corpus/63_பொருநாறாற்றுப்படை.txt');
const OUTPUT_DIR = path.resolve(__dirname, '../../data/raw/sangam/pattuppattu/porunararruppadai');

function isLineNumber(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Line numbers in this text are right-aligned numbers like "5", "10", "15"
  // They appear as suffixes on verse lines (e.g., "விளக்கழ லுருவின் விசியுறு பச்சை              5")
  // OR as standalone numbers
  const num = parseInt(trimmed, 10);
  if (isNaN(num)) return false;
  return trimmed === String(num) && num % 5 === 0;
}

function stripTrailingLineNumber(line: string): string {
  // Remove trailing line numbers like "         5" or "    10"
  return line.replace(/\s+\d+\s*$/, '').trimEnd();
}

function isHeader(line: string): boolean {
  // Detect header/metadata lines
  if (line.startsWith('Title:') || line.startsWith('Author:') || line.startsWith('Source:')) return true;
  if (line.includes('======')) return true;
  if (line.includes('Project Madurai')) return true;
  if (line.includes('Acknowledgement')) return true;
  if (line.includes('unicode') || line.includes('Unicode')) return true;
  if (line.includes('utf-8') || line.includes('UTF-8')) return true;
  if (line.includes('©')) return true;
  if (line.includes('freely distribute')) return true;
  if (line.includes('header page')) return true;
  return false;
}

function clean(): void {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(INPUT_FILE, 'utf-8');
  const allLines = raw.split('\n');

  // Find where actual verse content starts
  // The verse starts after the metadata block (after "மொத்த வரிகள் :: 248" and "---")
  let verseStart = -1;
  for (let i = 0; i < allLines.length; i++) {
    if (allLines[i].includes('மொத்த வரிகள்') || allLines[i].includes('----------')) {
      // The next non-empty line after the dashes is the first verse line
      for (let j = i + 1; j < allLines.length; j++) {
        if (allLines[j].trim() && !allLines[j].includes('---')) {
          verseStart = j;
          break;
        }
      }
      if (verseStart > 0) break;
    }
  }

  if (verseStart < 0) {
    // Fallback: find first Tamil verse line
    for (let i = 0; i < allLines.length; i++) {
      if (allLines[i].trim().startsWith('அறா')) {
        verseStart = i;
        break;
      }
    }
  }

  console.log(`Verse content starts at line ${verseStart + 1}`);

  const verseLines: string[] = [];
  for (let i = verseStart; i < allLines.length; i++) {
    const line = allLines[i];
    const trimmed = line.trim();

    // Stop at colophon
    if (trimmed.includes('முற்றிற்று') || trimmed.includes('------')) {
      break;
    }

    // Skip standalone line numbers
    if (isLineNumber(trimmed)) {
      continue;
    }

    // Skip empty lines
    if (!trimmed) {
      continue;
    }

    // Strip trailing line numbers from verse lines
    const cleaned = stripTrailingLineNumber(line).trim();
    if (cleaned) {
      verseLines.push(cleaned);
    }
  }

  // Write output
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, 'poem.txt');
  fs.writeFileSync(outPath, verseLines.join('\n') + '\n', 'utf-8');

  console.log(`\nPorunarāṟṟuppaṭai processing complete:`);
  console.log(`  Total verse lines: ${verseLines.length}`);
  console.log(`  Expected: 248`);
  console.log(`  Output: ${outPath}`);
}

clean();
