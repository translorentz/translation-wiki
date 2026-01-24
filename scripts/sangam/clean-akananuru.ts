/**
 * clean-akananuru.ts
 *
 * Processes the Akananuru (அகநானூறு) source text from Project Madurai.
 *
 * DEFINITIVE FORMAT ANALYSIS:
 *   Between poems, the sequence is always:
 *     [last verse line of poem N]
 *     [total_line_count]           <-- the line count for poem N
 *     [poem_number N+1]            <-- OR section header followed by poem number
 *     [first verse line of poem N+1]
 *
 *   Within a poem, line markers appear:
 *     [verse line]
 *     [line_number: 0, 5, 10, ...]  <-- always multiples of 5
 *     [verse line]
 *
 *   Line markers are ALWAYS sandwiched between two text lines.
 *   Total_count is ALWAYS followed by a poem number (or section header + poem number).
 *   Poem numbers are ALWAYS preceded by total_count (or section header for poem 0/121/301).
 *
 * STRATEGY:
 *   Use the known structure: for each number in the file, check what comes AFTER it.
 *   If what follows is text (Tamil verse), the number is a line marker.
 *   If what follows is another number (the next poem), the current number is total_count.
 *   If what follows is a section header, the current number is total_count.
 *
 *   A poem number is any standalone number that is preceded by either:
 *     - another standalone number (the total_count), or
 *     - a section header
 *   AND matches the expected sequential poem number.
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_FILE = path.resolve(__dirname, '../../data/difficult_extra_processing/tamil_corpus/229_அகநானுறு - மூலம்.txt');
const OUTPUT_DIR = path.resolve(__dirname, '../../data/raw/sangam/ettuthokai/akananuru');

interface Poem {
  number: number;
  section: string;
  lines: string[];
}

function clean(): void {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(INPUT_FILE, 'utf-8');
  const allLines = raw.split('\n');

  // Find content start
  let contentStart = 0;
  for (let i = 20; i < allLines.length; i++) {
    if (allLines[i].trim() === 'அகநானுறு') {
      contentStart = i + 1;
      break;
    }
  }

  // Parse into tokens: 'num', 'text', 'section'
  type TokenType = 'num' | 'text' | 'section';
  interface Token {
    type: TokenType;
    text: string;
    numValue: number;
    sectionName: string;
    lineNum: number; // source file line number for debugging
  }

  const tokens: Token[] = [];
  for (let i = contentStart; i < allLines.length; i++) {
    let trimmed = allLines[i].trim();
    if (!trimmed) continue;

    // BOM character
    if (trimmed === '\ufeff') continue;

    // Section headers
    if (/^\d+\.\s+(களிற்றியாணை|மணிமிடை|நித்திலக்)/.test(trimmed)) {
      let sName = '';
      if (trimmed.includes('களிற்றியாணை')) sName = 'களிற்றியாணை நிரை';
      else if (trimmed.includes('மணிமிடை')) sName = 'மணிமிடை பவளம்';
      else if (trimmed.includes('நித்திலக்')) sName = 'நித்திலக்கோவை';
      tokens.push({ type: 'section', text: trimmed, numValue: -1, sectionName: sName, lineNum: i + 1 });
      continue;
    }

    // FIX 1: Normalize split numbers like "1 5" -> "15"
    // These are OCR/formatting errors where a number is split by a space
    if (/^\d+\s+\d+$/.test(trimmed)) {
      const normalized = trimmed.replace(/\s+/g, '');
      const num = parseInt(normalized, 10);
      if (!isNaN(num)) {
        tokens.push({ type: 'num', text: normalized, numValue: num, sectionName: '', lineNum: i + 1 });
        continue;
      }
    }

    // FIX 2: Handle lines with embedded annotations like "text\t.NNN-NN"
    // These have verse text followed by a tab and a poem/line-count annotation.
    // The annotation effectively serves as a total_count marker.
    // We emit the text part as a 'text' token, and then emit the line count from the
    // annotation as a synthetic 'num' token.
    const annotationMatch = trimmed.match(/^(.+?)\s*\t\s*\.(\d+)-(\d+)\s*$/);
    if (annotationMatch) {
      const textPart = annotationMatch[1].trim();
      const lineCount = parseInt(annotationMatch[3], 10);
      // Emit the text
      tokens.push({ type: 'text', text: textPart, numValue: -1, sectionName: '', lineNum: i + 1 });
      // Emit the line count as a synthetic number token (acts as total_count)
      tokens.push({ type: 'num', text: String(lineCount), numValue: lineCount, sectionName: '', lineNum: i + 1 });
      continue;
    }

    // Check if standalone number
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && trimmed === String(num)) {
      tokens.push({ type: 'num', text: trimmed, numValue: num, sectionName: '', lineNum: i + 1 });
      continue;
    }

    // Text line (also strip any trailing tab+annotation that doesn't match the pattern above)
    const cleanedText = trimmed.replace(/\t.*$/, '').trim();
    tokens.push({ type: 'text', text: cleanedText || trimmed, numValue: -1, sectionName: '', lineNum: i + 1 });
  }

  // Now identify poem boundaries using sequential matching.
  // We know poems are numbered 0, 1, 2, ..., 400.
  //
  // For each expected poem number N, we search for it in the token stream.
  // It must be a 'num' token with value N, and it must be preceded by either:
  //   - Another 'num' token (the total_count)
  //   - A 'section' token
  //
  // To handle ambiguity (e.g., poem 5 vs line-marker 5), we search FORWARD
  // from the end of the previous poem for the first occurrence of N that
  // satisfies the predecessor condition.
  //
  // FIX 3: Handle duplicate/mistyped poem numbers.
  // The source file has typos where poem 131 is labeled "130" and poem 319
  // is labeled "318" (duplicate of previous poem's number). If we can't find
  // poem N, we check if there's a second occurrence of (N-1) that satisfies
  // the predecessor condition after the position where we already found (N-1).

  const poems: Poem[] = [];
  let currentSection = '';
  let searchFrom = 0; // token index to search from
  const poemFoundAt: Map<number, number> = new Map(); // poem number -> token index where found

  for (let poemNum = 0; poemNum <= 400; poemNum++) {
    // Find token with value = poemNum, starting from searchFrom
    let found = -1;

    for (let ti = searchFrom; ti < tokens.length; ti++) {
      const t = tokens[ti];
      if (t.type !== 'num' || t.numValue !== poemNum) continue;

      // Check predecessor
      if (ti === 0) {
        // First token - only valid for poem 0
        if (poemNum === 0) { found = ti; break; }
        continue;
      }

      const prev = tokens[ti - 1];
      if (prev.type === 'num') {
        // Preceded by a number (total_count) - valid poem boundary
        found = ti;
        break;
      }
      if (prev.type === 'section') {
        // Preceded by section header - valid (poems 0, 121, 301)
        found = ti;
        break;
      }
      // Preceded by text - this is a LINE MARKER within a poem, not a poem number
      // Continue searching
    }

    // FIX 3: If poem N not found, look for a second occurrence of (N-1)
    // that satisfies the predecessor condition after where we found (N-1).
    // This handles source typos where "130" appears twice (should be "130" then "131").
    if (found < 0 && poemNum > 0) {
      const prevPoemPos = poemFoundAt.get(poemNum - 1);
      if (prevPoemPos !== undefined) {
        // Search for another occurrence of (N-1) after prevPoemPos
        for (let ti = prevPoemPos + 1; ti < tokens.length; ti++) {
          const t = tokens[ti];
          if (t.type !== 'num' || t.numValue !== (poemNum - 1)) continue;

          if (ti === 0) continue;
          const prev = tokens[ti - 1];
          if (prev.type === 'num') {
            // Found a second occurrence of (N-1) with valid predecessor
            // This is actually poem N with a typo in the source
            found = ti;
            console.log(`  FIX: Poem ${poemNum} found as duplicate "${poemNum - 1}" at source line ${tokens[ti].lineNum}`);
            break;
          }
        }
      }
    }

    if (found < 0) {
      // Poem not found
      continue;
    }

    poemFoundAt.set(poemNum, found);

    // Update section from any section tokens before this poem
    for (let ti = searchFrom; ti <= found; ti++) {
      if (tokens[ti].type === 'section') {
        currentSection = tokens[ti].sectionName;
      }
    }

    // Collect verse lines from found+1 until the next poem boundary
    // (i.e., until we hit a 'num' token that's preceded by another 'num' token,
    //  or a section header followed by a num token)
    // For simplicity, we'll just collect text tokens until the next poem.
    // We do this lazily: collect all text tokens after 'found' until the next poem is identified.

    // For now, store the start position; we'll extract verse later
    poems.push({
      number: poemNum,
      section: currentSection,
      lines: [], // will be filled in next pass
    });

    searchFrom = found + 1;
  }

  // Now extract verse lines for each poem
  // For each poem, the verse is all 'text' tokens between its start and the next poem's start
  // (skipping section headers and line-number tokens)

  // Use the poemFoundAt map from the first pass to get positions
  const poemPositions: number[] = [];
  for (const poem of poems) {
    const pos = poemFoundAt.get(poem.number);
    if (pos !== undefined) {
      poemPositions.push(pos);
    }
  }

  // Extract verses
  for (let pi = 0; pi < poems.length; pi++) {
    const startTI = poemPositions[pi] + 1; // skip the poem number token itself
    const endTI = pi + 1 < poemPositions.length ? poemPositions[pi + 1] : tokens.length;

    const verseLines: string[] = [];
    for (let ti = startTI; ti < endTI; ti++) {
      const t = tokens[ti];
      if (t.type === 'text') {
        // Stop at colophon ("முற்றிற்று" = "completed") or English footer text
        if (/முற்றிற்று/.test(t.text)) break;
        if (/^This page was/.test(t.text)) break;
        verseLines.push(t.text);
      }
      // Skip numbers (line markers + total_count at end) and section headers
    }

    poems[pi].lines = verseLines;
  }

  // Write output
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalPoems = 0;
  let totalLines = 0;

  for (const poem of poems) {
    if (poem.number === 0) {
      const outPath = path.join(OUTPUT_DIR, 'invocation.txt');
      fs.writeFileSync(outPath, poem.lines.join('\n') + '\n', 'utf-8');
      console.log(`  Invocation: ${poem.lines.length} lines`);
      continue;
    }

    const paddedNum = String(poem.number).padStart(3, '0');
    const outPath = path.join(OUTPUT_DIR, `poem-${paddedNum}.txt`);
    fs.writeFileSync(outPath, poem.lines.join('\n') + '\n', 'utf-8');
    totalPoems++;
    totalLines += poem.lines.length;
  }

  console.log(`\nAkananuru processing complete:`);
  console.log(`  Total poems: ${totalPoems} (expected 400)`);
  console.log(`  Total verse lines: ${totalLines}`);
  console.log(`  Output directory: ${OUTPUT_DIR}`);

  // Section breakdown
  const sections = new Map<string, number>();
  for (const poem of poems) {
    if (poem.number === 0) continue;
    const count = sections.get(poem.section) || 0;
    sections.set(poem.section, count + 1);
  }
  console.log(`\nSection breakdown:`);
  for (const [section, count] of sections) {
    console.log(`  ${section}: ${count} poems`);
  }

  // Report gaps
  const poemNumbers = new Set(poems.map(p => p.number));
  const missing: number[] = [];
  for (let n = 1; n <= 400; n++) {
    if (!poemNumbers.has(n)) missing.push(n);
  }
  if (missing.length > 0) {
    console.log(`\n  Missing poems (${missing.length}): ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? '...' : ''}`);
  }

  // Spot check: print a few poems with their line counts for verification
  console.log(`\nSpot checks (poem#: line count):`);
  const checks = [1, 2, 3, 4, 5, 10, 50, 100, 121, 200, 300, 400];
  for (const c of checks) {
    const p = poems.find(pp => pp.number === c);
    if (p) {
      console.log(`  Poem ${c}: ${p.lines.length} lines`);
    } else {
      console.log(`  Poem ${c}: NOT FOUND`);
    }
  }
}

clean();
