/**
 * clean-nandikkalambakam.ts
 *
 * Processes the Nandikkalambakam (நந்திக்கலம்பகம்) source text.
 *
 * The Nandikkalambakam is a medieval Tamil literary work praising the Pallava king
 * Nandippottaraiyan (9th century CE). It contains 88 numbered poems in various meters
 * (venpa, viruttam, kalitturai, etc.), plus a kappu (invocatory verse) and supplementary
 * verses from variant manuscripts.
 *
 * FILE STRUCTURE ANALYSIS:
 *   - Line 1: "காப்பு" (kappu header)
 *   - Lines 2-5: Invocatory verse (4 lines)
 *   - Line 6: "நூல்" (main text header)
 *   - Lines 7-607: Main poems 1-88, each preceded by "N. <meter designation>"
 *   - Lines 608-609: Editorial note about damaged poems after 88
 *   - Line 610: "பல சுவடிப்படிகளில் கூடுதலாகக் காணப்பட்டவை" (supplementary header)
 *   - Lines 611-736: Supplementary poems 1-22 from "many manuscripts"
 *   - Line 737: "வேறு ஒன்றிரண்டு சுவடிகளில் கூடுதலாக உள்ளவை" (second supplementary header)
 *   - Lines 738-760: Supplementary poems 1-3 from "one or two manuscripts"
 *
 * CLEANING DECISIONS:
 *   - REMOVE: "காப்பு" header, "நூல்" header
 *   - REMOVE: Meter designations (e.g., "1. மயங்கிசைக் கொச்சகக் கலிப்பா")
 *   - REMOVE: Editorial notes (lines 608-609)
 *   - REMOVE: Supplementary manuscript headers (lines 610, 737)
 *   - REMOVE: Blank lines within poems
 *   - KEEP: All Tamil verse lines (the actual poetry)
 *   - KEEP: Poem numbers as delimiters (output as plain numbers)
 *   - KEEP: Parenthetical structural markers within kalippa poems: (தரவு), (தாழிசை),
 *           (அராகம்), (அம்போதரங்கம்), (தனிச்சொல்), (சுரிதகம்) — these are integral
 *           parts of the poem form, NOT editorial apparatus
 *   - KEEP: The kappu verse (numbered as poem 0 / "காப்பு")
 *   - KEEP: Supplementary poems (renumbered as 89-110 for continuity)
 *   - KEEP: Recap/fragment lines like "மண்டலமாய் . . . . . . . திருமேனி" (these are
 *           part of the original text, noting where a refrain would be sung)
 *
 * OUTPUT FORMAT:
 *   காப்பு
 *   <verse lines>
 *
 *   1
 *   <verse lines>
 *
 *   2
 *   <verse lines>
 *   ...
 *
 * NOTE ON NUMBERING:
 *   The source has a duplicate "34." (poems 34 and 34-bis). The second is actually poem 35
 *   in the traditional numbering, but since later poems keep the source numbering (36, 37...),
 *   we preserve the original numbering including the duplicate. The source also has no poem 35.
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_FILE = path.resolve(__dirname, '../../data/raw/nandikkalambakam/nandikkalambakam.txt');
const OUTPUT_FILE = path.resolve(__dirname, '../../data/raw/nandikkalambakam/nandikkalambakam-clean.txt');

// Known Tamil meter names that appear in poem headers
const METER_PATTERNS = [
  'மயங்கிசைக் கொச்சகக் கலிப்பா',
  'நேரிசை வெண்பா',
  'கட்டளைக்கலித்துறை',
  'ஆசிரிய விருத்தம்',
  'வஞ்சிவிருத்தம்',
  'வஞ்சித்துறை',
  'தரவு கொச்சகக் கலிப்பா',
  'கலிவிருத்தம்',
  'கலிநிலைத்துறை',
  'இணைக்குறளாசிரிப்பா',
  'வெண்டுறை',
  'குறள் வெண்டுறை',
];

// Structural markers within kalippa poems (these are KEPT as part of verse)
// They appear as parenthetical notes at the end of lines: (தரவு), (தாழிசை), etc.
// We keep them because they mark structural divisions of the kalippa form.

interface PoemEntry {
  label: string;     // "காப்பு" or the poem number
  lines: string[];   // verse lines
  source: string;    // "main" | "supplement-many" | "supplement-few"
}

function isMeterLine(line: string): boolean {
  // Matches patterns like "1. மயங்கிசைக் கொச்சகக் கலிப்பா" or
  // "18.கலிவிருத்தம்" (no space after period)
  // The line starts with a number, then a period, then a meter name
  const trimmed = line.trim();

  // Check if it starts with "N." or "N. "
  const match = trimmed.match(/^(\d+)\.\s*(.*)/);
  if (!match) return false;

  const rest = match[2];

  // Check if the rest contains known meter keywords
  // Common meter-related Tamil words:
  const meterKeywords = [
    'வெண்பா', 'விருத்தம்', 'கலித்துறை', 'கலிப்பா', 'ஆசிரிய',
    'வஞ்சி', 'கொச்சக', 'நேரிசை', 'கட்டளை', 'இணைக்குறள',
    'கலிநிலை', 'வெண்டுறை', 'குறள்',
    // Also meter-length descriptors:
    'எண்சீர்', 'அறுசீர்', 'எழுசீர்',
    'கழிநெடிலடி',
  ];

  for (const kw of meterKeywords) {
    if (rest.includes(kw)) return true;
  }

  return false;
}

function isEditorialNote(line: string): boolean {
  const trimmed = line.trim();
  // Editorial notes in parentheses
  if (trimmed.startsWith('(') && trimmed.includes('சிதைந்தன')) return true;
  if (trimmed.startsWith('(') && trimmed.includes('அந்தாதித் தொடை')) return true;
  // Supplementary manuscript headers
  if (trimmed === 'பல சுவடிப்படிகளில் கூடுதலாகக் காணப்பட்டவை') return true;
  if (trimmed === 'வேறு ஒன்றிரண்டு சுவடிகளில் கூடுதலாக உள்ளவை') return true;
  return false;
}

function isHeaderLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === 'காப்பு' || trimmed === 'நூல்';
}

function isSectionNumberOnly(line: string): boolean {
  // Lines that are just a poem number like "1." or start of editorial: "கிழ் வருவனவும்..."
  const trimmed = line.trim();
  // Check for "N." alone (just a number with period, no meter after it)
  // This shouldn't happen in this file - meter always follows - but check anyway
  return /^\d+\.\s*$/.test(trimmed);
}

function clean(): void {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(INPUT_FILE, 'utf-8');
  const allLines = raw.split('\n');

  console.log(`Input: ${INPUT_FILE}`);
  console.log(`Total input lines: ${allLines.length}`);
  console.log('');

  const poems: PoemEntry[] = [];
  let currentPoem: PoemEntry | null = null;
  let currentSource: 'main' | 'supplement-many' | 'supplement-few' = 'main';

  let removedHeaders = 0;
  let removedMeterLines = 0;
  let removedEditorial = 0;
  let removedBlanks = 0;
  let removedSupplementHeaders = 0;
  let keptVerseLines = 0;
  let lineNumberMarkers = 0;

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      removedBlanks++;
      continue;
    }

    // Skip headers
    if (isHeaderLine(trimmed)) {
      removedHeaders++;
      console.log(`  Removed header (line ${i + 1}): "${trimmed}"`);
      continue;
    }

    // Track source sections
    if (trimmed === 'பல சுவடிப்படிகளில் கூடுதலாகக் காணப்பட்டவை') {
      currentSource = 'supplement-many';
      removedSupplementHeaders++;
      console.log(`  Removed supplement header (line ${i + 1}): "${trimmed}"`);
      continue;
    }
    if (trimmed === 'வேறு ஒன்றிரண்டு சுவடிகளில் கூடுதலாக உள்ளவை') {
      currentSource = 'supplement-few';
      removedSupplementHeaders++;
      console.log(`  Removed supplement header (line ${i + 1}): "${trimmed}"`);
      continue;
    }

    // Skip editorial notes
    if (isEditorialNote(trimmed)) {
      removedEditorial++;
      console.log(`  Removed editorial (line ${i + 1}): "${trimmed}"`);
      continue;
    }

    // Check for the continuation of the editorial note on line 609
    if (trimmed === 'கிழ் வருவனவும் அந்தாதித் தொடையில் அமைய வில்லை)') {
      removedEditorial++;
      console.log(`  Removed editorial cont. (line ${i + 1}): "${trimmed}"`);
      continue;
    }

    // Check for meter designation lines
    if (isMeterLine(trimmed)) {
      // This is a poem header: extract the number and start a new poem
      const match = trimmed.match(/^(\d+)\./);
      if (match) {
        const poemNum = match[1];

        // Finalize previous poem
        if (currentPoem) {
          poems.push(currentPoem);
        }

        // Determine label for supplementary poems
        let label: string;
        if (currentSource === 'main') {
          label = poemNum;
        } else if (currentSource === 'supplement-many') {
          // Supplementary poems from "many manuscripts": prefix with S1-
          label = `S1-${poemNum}`;
        } else {
          // Supplementary from "one or two manuscripts": prefix with S2-
          label = `S2-${poemNum}`;
        }

        currentPoem = { label, lines: [], source: currentSource };
        removedMeterLines++;
      }
      continue;
    }

    // Check for line number markers (standalone numbers like "5", "10", "15")
    // In this file, these appear within poem 61 (the inaikkuralaasirippaa)
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      // Line numbers in this file are: 5, 10, 15 (within poem 61)
      if (num % 5 === 0 && num <= 20) {
        lineNumberMarkers++;
        console.log(`  Removed line number marker (line ${i + 1}): "${trimmed}"`);
        continue;
      }
    }

    // The kappu: if we haven't started any poem yet, this is the kappu verse
    if (!currentPoem) {
      // First verse lines before any numbered poem = kappu
      currentPoem = { label: 'காப்பு', lines: [], source: 'main' };
    }

    // This is a verse line - keep it
    // Strip trailing line-number markers (e.g., "சிவக்கு மாகிற் 5" -> "சிவக்கு மாகிற்")
    // These appear in poem 61 (inaikkuralaasirippaa) where every 5th line is marked
    let cleanedLine = trimmed;
    const trailingNumMatch = trimmed.match(/^(.+)\s+(\d+)$/);
    if (trailingNumMatch) {
      const num = parseInt(trailingNumMatch[2], 10);
      // Only strip if it's a plausible line-number marker (multiples of 5, small values)
      if (num % 5 === 0 && num <= 50 && num > 0) {
        cleanedLine = trailingNumMatch[1];
        lineNumberMarkers++;
        console.log(`  Stripped trailing line number (line ${i + 1}): "${trimmed}" -> "${cleanedLine}"`);
      }
    }
    currentPoem.lines.push(cleanedLine);
    keptVerseLines++;
  }

  // Don't forget the last poem
  if (currentPoem) {
    poems.push(currentPoem);
  }

  // Build output
  const outputLines: string[] = [];
  for (let pi = 0; pi < poems.length; pi++) {
    const poem = poems[pi];
    if (poem.lines.length === 0) continue;

    // Add blank line between poems (not before first)
    if (outputLines.length > 0) {
      outputLines.push('');
    }

    // Poem label
    outputLines.push(poem.label);

    // Verse lines
    for (const vl of poem.lines) {
      outputLines.push(vl);
    }
  }

  // Write output
  const output = outputLines.join('\n') + '\n';
  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');

  // Reporting
  console.log('');
  console.log('=== Removal Summary ===');
  console.log(`  Headers removed: ${removedHeaders}`);
  console.log(`  Meter designation lines removed: ${removedMeterLines}`);
  console.log(`  Editorial notes removed: ${removedEditorial}`);
  console.log(`  Supplement headers removed: ${removedSupplementHeaders}`);
  console.log(`  Line number markers removed: ${lineNumberMarkers}`);
  console.log(`  Blank lines removed: ${removedBlanks}`);
  console.log('');
  console.log('=== Output Summary ===');
  console.log(`  Total poems: ${poems.length}`);

  // Break down by source
  const mainPoems = poems.filter(p => p.source === 'main');
  const supp1Poems = poems.filter(p => p.source === 'supplement-many');
  const supp2Poems = poems.filter(p => p.source === 'supplement-few');

  console.log(`    Main text: ${mainPoems.length} poems (kappu + 1-88)`);
  console.log(`    Supplement (many MSS): ${supp1Poems.length} poems`);
  console.log(`    Supplement (1-2 MSS): ${supp2Poems.length} poems`);
  console.log(`  Total verse lines kept: ${keptVerseLines}`);
  console.log(`  Output file lines: ${outputLines.length}`);
  console.log(`  Output: ${OUTPUT_FILE}`);

  // Spot checks
  console.log('');
  console.log('=== Spot Checks ===');
  const checks = [0, 1, 5, 10, 20, 50, 60, 70, 80, 88];
  for (const ci of checks) {
    if (ci === 0) {
      const p = poems.find(pp => pp.label === 'காப்பு');
      if (p) {
        console.log(`  Kappu: ${p.lines.length} lines — "${p.lines[0]}..."`);
      }
    } else {
      const p = poems.find(pp => pp.label === String(ci));
      if (p) {
        console.log(`  Poem ${ci}: ${p.lines.length} lines — "${p.lines[0].slice(0, 40)}..."`);
      } else {
        console.log(`  Poem ${ci}: NOT FOUND`);
      }
    }
  }

  // Check for the duplicate poem 34
  const poem34s = poems.filter(p => p.label === '34');
  if (poem34s.length > 1) {
    console.log(`  NOTE: Found ${poem34s.length} poems labeled "34" (known duplicate in source)`);
  }

  // List all poem labels for verification
  console.log('');
  console.log('=== All Poem Labels ===');
  console.log(`  Main: ${mainPoems.map(p => p.label).join(', ')}`);
  if (supp1Poems.length > 0) {
    console.log(`  Supplement (many): ${supp1Poems.map(p => p.label).join(', ')}`);
  }
  if (supp2Poems.length > 0) {
    console.log(`  Supplement (1-2): ${supp2Poems.map(p => p.label).join(', ')}`);
  }
}

clean();
