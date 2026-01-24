/**
 * clean-puranānuru.ts
 *
 * Processes the Puranānūru (புறநானூறு) from Project Madurai.
 * The available files contain both verse text (மூலம்) and commentary (உரை).
 * This script extracts ONLY the verse text.
 *
 * Input files:
 *   494: புற நானூறு - மூலமும்; உரையும் பாகம் 1 (actually contains verses 131-200)
 *   531: புற நானூறு - மூலமும் விளக்க உரையும் (contains verses 341-400)
 *
 * IMPORTANT: This corpus does NOT contain Purananuru verses 1-130 or 201-340.
 * Those portions are MISSING from this collection.
 *
 * Output: data/raw/sangam/ettuthokai/puranānuru/poem-NNN.txt (one file per poem)
 *
 * Format of input:
 *   - Header (Project Madurai credits)
 *   - For each poem:
 *     - Poem number + poet name line (e.g., "131. வேள் ஆய் அண்டிரன்")
 *     - Prose introduction (commentary about the poem)
 *     - Verse text (the actual Tamil poem lines)
 *     - Colophon line (e.g., "திணையும் துறையும் அவை. அவனை அவர் பாடியது.")
 *     - "உரை" section (detailed commentary)
 *     - "விளக்கம்" section (explanation)
 *     - Dashed separator "----------"
 *
 * The challenge: distinguishing verse text from prose commentary.
 * Strategy: Verse lines are between the prose intro and the colophon line.
 * They often contain embedded line numbers (5, 10, 15...) and
 * poem number at end (e.g., "(131)").
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_DIR = path.resolve(__dirname, '../../data/difficult_extra_processing/tamil_corpus');
const OUTPUT_DIR = path.resolve(__dirname, '../../data/raw/sangam/ettuthokai/puranānuru');

// The two source files
const INPUT_FILES = [
  '494_புற நானூறு - மூலமும்; உரையும் பாகம் 1 பாடல்கள் 1-200).txt',
  '531_புற நானூறு - மூலமும் விளக்க உரையும்.txt',
];

interface Poem {
  number: number;
  poet: string;
  lines: string[];
}

function stripTrailingNumber(line: string): string {
  // Remove trailing line numbers (5, 10, 15...) or poem ref numbers like (131)
  let cleaned = line.replace(/\s+\d+\s*$/, '').trimEnd();
  // Remove trailing poem reference numbers in parentheses like (131)
  cleaned = cleaned.replace(/\s*\(\d+\)\s*$/, '').trimEnd();
  return cleaned;
}

function extractPoemsFromFile(filePath: string): Poem[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const allLines = raw.split('\n');
  const poems: Poem[] = [];

  let i = 0;

  // Skip header (find first poem number)
  while (i < allLines.length) {
    const match = allLines[i].trim().match(/^(\d+)\.\s+(.+)$/);
    if (match && parseInt(match[1]) >= 100) {
      break;
    }
    i++;
  }

  // Parse poems
  while (i < allLines.length) {
    const line = allLines[i].trim();

    // Look for poem header: "NNN. Poet Name"
    const poemHeaderMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (!poemHeaderMatch) {
      i++;
      continue;
    }

    const poemNumber = parseInt(poemHeaderMatch[1]);
    const poet = poemHeaderMatch[2];
    i++;

    // Skip prose introduction until we find verse lines
    // Verse lines are characterized by:
    // 1. Short lines (typically < 60 chars of Tamil)
    // 2. Poetic vocabulary (not prose explanation)
    // 3. Sometimes end with line numbers
    // 4. End with a poem reference like (NNN)
    //
    // The prose introduction typically has longer lines and ends before
    // the first verse line. We detect the verse section by looking for
    // the pattern of short poetic lines.

    // Strategy: Read until we hit "உரை" or "திணை" (colophon markers)
    // Everything between the intro and "திணை..." is verse.
    // But first we need to identify where intro ends and verse begins.

    // Collect all lines until the next poem header or separator
    const blockLines: string[] = [];
    while (i < allLines.length) {
      const currentLine = allLines[i].trim();
      // Check for next poem or separator
      if (currentLine.match(/^(\d+)\.\s+.+$/) && parseInt(currentLine.match(/^(\d+)/)?.[1] || '0') > poemNumber) {
        break;
      }
      if (currentLine === '----------' || currentLine === '-------------' || currentLine.match(/^-{5,}$/)) {
        i++;
        break;
      }
      blockLines.push(allLines[i]);
      i++;
    }

    // Now extract verse lines from the block
    // The verse is between the prose intro and the "திணை" line or "உரை" line
    // Verse lines are typically:
    // - Multiple short lines
    // - Contain classical Tamil poetic vocabulary
    // - End with (NNN) on the last line
    // - Have embedded line numbers (5, 10, ...)

    // Find the verse section: look for the characteristic pattern
    // of short lines followed by (NNN) or "திணை" marker
    let verseStart = -1;
    let verseEnd = -1;

    for (let j = 0; j < blockLines.length; j++) {
      const bl = blockLines[j].trim();
      // The "திணை" line marks the end of verse
      if (bl.startsWith('திணை') && (bl.includes('துறை') || bl.includes('அவர் பாடியது'))) {
        verseEnd = j;
        break;
      }
      // The "உரை" marker also ends verse
      if (bl === 'உரை' || bl.startsWith('உரை')) {
        if (verseEnd < 0) verseEnd = j;
        break;
      }
    }

    if (verseEnd < 0) {
      // No clear end marker found, try to identify verse by pattern
      verseEnd = blockLines.length;
    }

    // Now find where the verse starts (after prose intro)
    // The prose intro tends to be long paragraph-like lines
    // The verse tends to be shorter lines with poetic structure
    // Look backwards from verseEnd for the verse block

    // Find the last block of short lines before verseEnd
    // that contains a poem reference (NNN) or line numbers
    let foundPoemRef = false;
    for (let j = verseEnd - 1; j >= 0; j--) {
      const bl = blockLines[j].trim();
      if (!bl) continue;

      // Check for poem reference number
      if (bl.match(/\(\d+\)\s*$/) || bl.match(/\(\s*\d+\s*\)$/)) {
        foundPoemRef = true;
      }

      // Check if this is a standalone number (line number) - verse indicator
      const num = parseInt(bl, 10);
      if (!isNaN(num) && bl === String(num) && num % 5 === 0 && num <= 50) {
        foundPoemRef = true;
      }

      // If line is very long (>80 chars), it's likely prose - verse starts after it
      if (bl.length > 100 && !foundPoemRef) {
        verseStart = j + 1;
        break;
      }
    }

    if (verseStart < 0) {
      // Try another approach: find the first non-empty line that looks like verse
      // (shorter lines, Tamil poetic vocabulary)
      for (let j = 0; j < verseEnd; j++) {
        const bl = blockLines[j].trim();
        if (!bl) continue;
        // If line length < 80 and contains Tamil characters, might be verse
        if (bl.length < 80 && bl.length > 5 && /[\u0B80-\u0BFF]/.test(bl)) {
          // Check if subsequent lines also look like verse
          let consecutive = 0;
          for (let k = j; k < verseEnd && k < j + 5; k++) {
            const nextBl = blockLines[k].trim();
            if (nextBl && nextBl.length < 80 && /[\u0B80-\u0BFF]/.test(nextBl)) {
              consecutive++;
            }
          }
          if (consecutive >= 2) {
            verseStart = j;
            break;
          }
        }
      }
    }

    if (verseStart < 0 || verseStart >= verseEnd) {
      console.warn(`  Could not identify verse for poem ${poemNumber}`);
      continue;
    }

    // Extract verse lines
    const verseLines: string[] = [];
    for (let j = verseStart; j < verseEnd; j++) {
      const bl = blockLines[j].trim();
      if (!bl) continue;

      // Skip standalone line numbers
      const num = parseInt(bl, 10);
      if (!isNaN(num) && bl === String(num)) continue;

      // Strip trailing numbers and poem references
      const cleaned = stripTrailingNumber(bl);
      if (cleaned) {
        verseLines.push(cleaned);
      }
    }

    if (verseLines.length > 0) {
      poems.push({ number: poemNumber, poet, lines: verseLines });
    }
  }

  return poems;
}

function clean(): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalPoems = 0;
  let totalLines = 0;

  for (const filename of INPUT_FILES) {
    const filePath = path.join(INPUT_DIR, filename);
    console.log(`Processing: ${filename}`);

    const poems = extractPoemsFromFile(filePath);
    console.log(`  Found ${poems.length} poems`);

    for (const poem of poems) {
      const paddedNum = String(poem.number).padStart(3, '0');
      const outPath = path.join(OUTPUT_DIR, `poem-${paddedNum}.txt`);
      fs.writeFileSync(outPath, poem.lines.join('\n') + '\n', 'utf-8');
      totalPoems++;
      totalLines += poem.lines.length;
    }
  }

  console.log(`\nPurananuru processing complete:`);
  console.log(`  Total poems extracted: ${totalPoems}`);
  console.log(`  Total verse lines: ${totalLines}`);
  console.log(`  Output directory: ${OUTPUT_DIR}`);
  console.log(`\n  NOTE: Only verses 131-200 and 341-400 are available.`);
  console.log(`  Verses 1-130 and 201-340 are MISSING from this corpus.`);
}

clean();
