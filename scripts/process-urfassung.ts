/**
 * Process Schelling Urfassung der Philosophie der Offenbarung
 *
 * Critical rules from prior catastrophe:
 * 1. DO NOT use page headers as chapter boundaries ("Einundfünfzigste Vorlesung 409" is a PAGE HEADER, not a boundary)
 * 2. DO NOT match bibliography entry "8." at line 28483 — real lecture 8 is at line 1862
 * 3. DO strip margin line numbers (5, 10, 15, 20, 25, 30, 35)
 * 4. DO stop processing before "Anmerkungen" section (line ~28478)
 *
 * Raw Text Structure:
 * - Lines 1-240: Front matter (title, TOC, preface) — SKIP
 * - Lines ~247-28091: Lecture content (83 lectures) — PROCESS
 * - Lines 28092+: Bibliography ("Anmerkungen", "[BEILAGEN, LITERATUR]") — SKIP
 */

import * as fs from "fs";
import * as path from "path";

const INPUT_FILE = "/Users/bryancheong/claude_projects/translation-wiki/data/raw/urfassung/full-text-layout.txt";
const OUTPUT_DIR = "/Users/bryancheong/claude_projects/translation-wiki/data/processed/urfassung";

// Lecture markers mapped to their line numbers (1-indexed)
// Compiled from manual inspection of the source file
const LECTURE_MARKERS: Record<number, { line: number; pattern: string }> = {
  1: { line: 247, pattern: "   1." },
  2: { line: 436, pattern: "2." },
  3: { line: 640, pattern: "     3." },
  4: { line: 866, pattern: "   4." },
  5: { line: 1121, pattern: "     5." },
  6: { line: 1391, pattern: "6." },
  7: { line: 1620, pattern: "7." },
  8: { line: 1862, pattern: "8." },
  9: { line: 2101, pattern: "9." },
  10: { line: 2361, pattern: "    10." },
  11: { line: 2611, pattern: "15   11." },
  12: { line: 2894, pattern: "12." },
  13: { line: 3128, pattern: "13." },
  14: { line: 3344, pattern: "14." },
  15: { line: 3614, pattern: "   15." },
  16: { line: 3883, pattern: "     16." },
  17: { line: 4201, pattern: "17." },
  18: { line: 4492, pattern: "     18." },
  19: { line: 4752, pattern: "19." },
  20: { line: 5021, pattern: "20." },
  21: { line: 5317, pattern: "21." },
  22: { line: 5636, pattern: "22." },
  23: { line: 6021, pattern: "23." },
  24: { line: 6322, pattern: "   24." },
  25: { line: 6592, pattern: "25." }, // Has "20" margin number on same line
  26: { line: 6890, pattern: "26." },
  27: { line: 7135, pattern: "27." },
  28: { line: 7455, pattern: "28." },
  29: { line: 7724, pattern: "15   29." },
  30: { line: 8150, pattern: "30." },
  31: { line: 8525, pattern: "     31." },
  32: { line: 8850, pattern: "   32." },
  33: { line: 9165, pattern: "     33." },
  34: { line: 9517, pattern: "34." },
  35: { line: 9936, pattern: "20   35." },
  36: { line: 10261, pattern: "36." }, // Must find exact line
  37: { line: 10634, pattern: "10   37." },
  38: { line: 11051, pattern: "38." },
  39: { line: 11404, pattern: "     39." },
  40: { line: 11825, pattern: "   40." },
  41: { line: 12288, pattern: "41." }, // Must find exact line
  42: { line: 12656, pattern: "42." },
  43: { line: 13052, pattern: "43." },
  44: { line: 13453, pattern: "44." },
  45: { line: 13839, pattern: "45." },
  46: { line: 14236, pattern: "46." },
  47: { line: 14641, pattern: "47." },
  48: { line: 15073, pattern: "     48." },
  49: { line: 15488, pattern: "49." },
  50: { line: 15973, pattern: "* 50." },
  51: { line: 16311, pattern: "      51 ." },
  52: { line: 16633, pattern: "r7 :L." }, // Garbled OCR
  53: { line: 16946, pattern: "53." },
  54: { line: 17320, pattern: "     54." },
  55: { line: 17661, pattern: "55." },
  56: { line: 18016, pattern: "     56." },
  57: { line: 18391, pattern: "    57." },
  58: { line: 18769, pattern: "58." },
  59: { line: 19104, pattern: " 0    59." },
  60: { line: 19410, pattern: "   60." },
  61: { line: 19745, pattern: "   61." },
  62: { line: 20144, pattern: "     62." },
  63: { line: 20521, pattern: "      63." },
  64: { line: 20879, pattern: "64." },
  65: { line: 21216, pattern: "    65." },
  66: { line: 21563, pattern: "     66." },
  67: { line: 21890, pattern: "67." },
  68: { line: 22233, pattern: "    68." },
  69: { line: 22626, pattern: "   69." },
  70: { line: 22968, pattern: "     70." },
  71: { line: 23330, pattern: "    71." },
  72: { line: 23669, pattern: "25   72." },
  73: { line: 24024, pattern: "73." },
  74: { line: 24356, pattern: "     74." },
  75: { line: 24722, pattern: "75." },
  76: { line: 25098, pattern: "76." },
  77: { line: 25430, pattern: "77." },
  78: { line: 25824, pattern: "78." },
  79: { line: 26188, pattern: "79." },
  80: { line: 26585, pattern: "80." },
  81: { line: 26956, pattern: "     81." },
  82: { line: 27340, pattern: "     82." },
  83: { line: 27683, pattern: "83." },
};

// End of lecture content (line before [BEILAGEN, LITERATUR])
const CONTENT_END_LINE = 28091;

// Special content to skip (TOC between volumes, front matter)
// Lecture 49 ends at line 15835 ("nen. - Leben Sie wohl!")
// Then there's volume 2 title page and TOC until lecture 50 marker at line 15973
const VOLUME_BREAK_START = 15836; // Start of inter-volume content (SCHELLING name line)
const VOLUME_BREAK_END = 15972;   // End of volume 2 TOC (just before * 50. marker)

// Lines containing only page headers or markers to strip
const SKIP_PATTERNS = [
  /^\s*\[VORLESUNGEN\s+(ERSTES|ZWEITES)\s+HALBJAHR\]\s*$/i,
  /^\s*Teilband\s+\d+\s*$/i,
  /^\s*Band\s+[IV]+\s+der\s+Handschrift\s*$/i,
  /^\s*FELIX\s+MEINER\s+VERLAG/i,
  /^\s*Herausgegeben\s+von/i,
  /^\s*WALTER\s+E\.\s+EHRHARDT/i,
  /^\s*F\.\s*W\.\s*J\.\s*SCHELLING/i,
  /^\s*Urfassung\s+der\s+Philosophie/i,
  /^\s*Vorbemerkung\s+des\s+Herausgebers/i,
  /^\s*Nachwort\s+des\s+Herausgebers/i,
  /^\s*Annotationen\s+des\s+Herausgebers/i,
  /^\s*Verzeichnis\s+der\s+vom\s+Herausgeber/i,
  /^\s*Namenregister/i,
  /^\s*Stichwortregister/i,
  /^\s*lNHALT\s*$/i,
  /^\s*Inhalt\s*$/i,
  /^\s*\[\s*Beilag/i,
  /^\s*Anmerkungen\./i,
  /^\s*Ausführliche\s+Geschichtswerke/i,
  /^\s*Materialien-Sammlung/i,
  /^\s*\[Literaturliste/i,
  /^\s*\[Anmerkungen/i,
  /^\s*Titelblatt\s+der\s+Handschrift/i,
  /^\s*Motto\s*\.+/i,
  /^\s*Wiedergabe\s+der\s+Eintrittskarte/i,
  /^\s*Reproduktion\s*$/i,
  /^\s*Ms\.\s*\d+/i,
  /^\s*\/\s*V[öo]r?l[ec]s/i,  // Garbled TOC headers
  /^\d+\.\s*Vorlesung\s*\.+\s*\d+/i,  // TOC entries like "1. Vorlesung ......... 3"
  /^\s*\d{1,2}\.\s*Vorl[ec]sun/i,  // More TOC entries
];

// Page header pattern: Number + German ordinal + "Vorlesung"
// e.g., "410                Einundfünfzigste Vorlesung"
const PAGE_HEADER_PATTERN = /^\d+\s+(?:[A-ZÄÖÜ][a-zäöüß]+)?(?:und)?(?:[a-zäöüß]+)?(?:ste|te)?\s*Vorlesung$/i;
const PAGE_HEADER_PATTERN_2 = /^\s*(?:[A-ZÄÖÜ][a-zäöüß]+)?(?:und)?(?:[a-zäöüß]+)?(?:ste|te)?\s*Vorlesung\s+\d+$/i;

// Margin line number pattern (at start of line)
const MARGIN_NUMBER_PATTERN = /^\s*(\d{1,2})\s+/;

// Check if line should be skipped (page header, TOC, front matter)
function shouldSkipLine(line: string, lineNum: number): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Skip volume break section (TOC between volumes)
  if (lineNum >= VOLUME_BREAK_START && lineNum <= VOLUME_BREAK_END) {
    return true;
  }

  // Check skip patterns
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  // Pattern 1: "NNN   Name Vorlesung" or "Name Vorlesung   NNN"
  if (PAGE_HEADER_PATTERN.test(trimmed) || PAGE_HEADER_PATTERN_2.test(trimmed)) {
    return true;
  }

  // More flexible: check for "Vorlesung" with a page number
  if (/Vorlesung/i.test(trimmed) && /\d{2,3}/.test(trimmed)) {
    // But NOT if it contains "M.H." which indicates lecture content
    if (!/M\.H\./i.test(trimmed)) {
      return true;
    }
  }

  // Skip lines that look like TOC entries (number + dots + number)
  if (/^\s*\d+\.\s*Vorlesung\s*\.+\s*\d+/.test(trimmed)) {
    return true;
  }

  // Skip Roman numeral page numbers like "VI", "VII", "VIII"
  if (/^[IVXLCDM]+\s*$/i.test(trimmed) && trimmed.length <= 8) {
    return true;
  }

  return false;
}

// Alias for backward compatibility
function isPageHeader(line: string): boolean {
  return shouldSkipLine(line, 0);
}

// Strip margin line numbers from text
function stripMarginNumbers(line: string): string {
  let result = line;

  // Match margin numbers 5, 10, 15, 20, 25, 30, 35 at line start
  // Can have just a single space if followed by M.H. or similar
  const startMatch = result.match(/^(\s*)(\d{1,2})\s+(.*)$/);
  if (startMatch) {
    const num = parseInt(startMatch[2], 10);
    if ([5, 10, 15, 20, 25, 30, 35].includes(num)) {
      result = startMatch[1] + startMatch[3];
    }
  }

  // Also strip trailing margin numbers at end of line (common OCR artifact)
  // Pattern: content followed by space(s) and a number 5/10/15/20/25/30/35 at end
  const trailingMatch = result.match(/^(.*\S)\s+(\d{1,2})$/);
  if (trailingMatch) {
    const num = parseInt(trailingMatch[2], 10);
    if ([5, 10, 15, 20, 25, 30, 35].includes(num)) {
      result = trailingMatch[1];
    }
  }

  return result;
}

// Clean a line of text
function cleanLine(line: string): string {
  // Strip margin numbers first
  let cleaned = stripMarginNumbers(line);

  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

// Clean a paragraph of text (post-processing after joining lines)
function cleanParagraph(text: string): string {
  let cleaned = text;

  // Remove page headers that got merged into paragraph endings
  // Pattern: "...text. Neunzehnte Vorlesung" or "...text Dreiundachtzigste Vorlesung"
  const pageHeaderEndPattern = /\s+(?:[A-ZÄÖÜ][a-zäöüß]+)?(?:und)?(?:[a-zäöüß]+)?(?:ste|te)?\s*Vorlesung\s*$/i;
  cleaned = cleaned.replace(pageHeaderEndPattern, "");

  // Remove any trailing margin numbers that survived
  cleaned = cleaned.replace(/\s+\d{1,2}\s*$/, "");

  return cleaned.trim();
}

// Check if content starts with expected patterns
function validateFirstParagraph(text: string, lectureNum: number): boolean {
  const trimmed = text.trim();

  // Most lectures start with "M.H." (Meine Herren) or "M. H."
  if (/^M\.?\s*H\./i.test(trimmed)) return true;

  // Some lectures start with capital letter (e.g., lecture 1)
  if (/^[A-ZÄÖÜ]/.test(trimmed)) return true;

  // Allow quotes
  if (/^[»„"]/.test(trimmed)) return true;

  console.warn(`Lecture ${lectureNum}: First paragraph may be unusual: "${trimmed.substring(0, 50)}..."`);
  return true; // Still accept
}

// Check if content ends with terminal punctuation
function validateLastParagraph(text: string, lectureNum: number): boolean {
  const trimmed = text.trim();

  // Should end with . ! ? » " )
  if (/[.!?»")—-]$/.test(trimmed)) return true;

  console.warn(`Lecture ${lectureNum}: Last paragraph may be incomplete: "...${trimmed.substring(Math.max(0, trimmed.length - 50))}"`);
  return true; // Still accept
}

// Check if text is German (not Latin bibliography)
function isGermanContent(text: string): boolean {
  // Latin bibliography has lots of abbreviations like "ed.", "Vol.", "Lips.", etc.
  const latinIndicators = ["ed.", "Vol.", "Lips.", "Biblioth.", "fol.", "cet."];
  let latinCount = 0;

  for (const indicator of latinIndicators) {
    if (text.includes(indicator)) latinCount++;
  }

  // German indicators
  const germanIndicators = ["der", "die", "das", "und", "ist", "nicht", "Gott", "Philosophie"];
  let germanCount = 0;

  for (const indicator of germanIndicators) {
    if (text.includes(indicator)) germanCount++;
  }

  return germanCount > latinCount;
}

async function processLectures() {
  console.log("Reading input file...");
  const content = fs.readFileSync(INPUT_FILE, "utf-8");
  const lines = content.split("\n");
  console.log(`Total lines: ${lines.length}`);

  const results: Array<{
    num: number;
    startLine: number;
    endLine: number;
    paragraphs: number;
    first50: string;
    last50: string;
    valid: boolean;
    issues: string[];
  }> = [];

  // First, find all lecture markers by searching the file
  console.log("\nVerifying lecture markers...");
  const foundMarkers: Map<number, number> = new Map();

  for (let i = 0; i < lines.length && i < CONTENT_END_LINE; i++) {
    const line = lines[i];
    const lineNum = i + 1; // 1-indexed

    // Skip if this is a page header
    if (isPageHeader(line)) continue;

    // Check for lecture number markers
    // Pattern: optional margin number, optional asterisk, lecture number, period
    const match = line.match(/^[\s*]*(?:\d{1,2}\s+)?(?:\*\s*)?(\d{1,2})\s*\.?\s*$/);
    if (match) {
      const lectureNum = parseInt(match[1], 10);
      if (lectureNum >= 1 && lectureNum <= 83) {
        // Only accept if we haven't found this lecture yet, or if this is before line 28000 (to avoid bibliography)
        if (!foundMarkers.has(lectureNum) && lineNum < 28000) {
          foundMarkers.set(lectureNum, lineNum);
        }
      }
    }

    // Special case: lecture 52 with garbled OCR
    if (line.includes("r7") && line.includes(":L.")) {
      if (!foundMarkers.has(52)) {
        foundMarkers.set(52, lineNum);
      }
    }

    // Special case: lecture 25 on same line with "20" margin
    if (/25\.\s*$/.test(line) && /^\s*20\s*$/.test(lines[i-1]?.trim() || "")) {
      if (!foundMarkers.has(25)) {
        foundMarkers.set(25, lineNum);
      }
    }
  }

  // Check for missing lectures
  console.log("\nChecking for missing lectures...");
  for (let i = 1; i <= 83; i++) {
    if (!foundMarkers.has(i)) {
      console.log(`  Lecture ${i}: NOT FOUND via regex - using manual entry from LECTURE_MARKERS`);
      if (LECTURE_MARKERS[i]) {
        foundMarkers.set(i, LECTURE_MARKERS[i].line);
      }
    }
  }

  // Sort by line number
  const sortedLectures = Array.from(foundMarkers.entries()).sort((a, b) => a[1] - b[1]);

  console.log(`\nFound ${sortedLectures.length} lectures`);

  // Process each lecture
  for (let idx = 0; idx < sortedLectures.length; idx++) {
    const [lectureNum, startLine] = sortedLectures[idx];
    const endLine = idx < sortedLectures.length - 1
      ? sortedLectures[idx + 1][1] - 1
      : CONTENT_END_LINE;

    const issues: string[] = [];

    // Extract content lines
    const contentLines: string[] = [];
    for (let i = startLine; i <= endLine && i <= lines.length; i++) {
      const line = lines[i - 1]; // Convert to 0-indexed

      // Skip the marker line itself for lectures 2+
      if (i === startLine) continue;

      // Skip page headers, TOC, front matter
      if (shouldSkipLine(line, i)) continue;

      // Skip empty lines at the very start
      if (contentLines.length === 0 && !line.trim()) continue;

      // Clean and add line
      const cleaned = cleanLine(line);
      contentLines.push(cleaned);
    }

    // Join into paragraphs (blank lines = paragraph breaks)
    const paragraphs: string[] = [];
    let currentPara: string[] = [];

    for (const line of contentLines) {
      if (!line) {
        // Blank line = paragraph break
        if (currentPara.length > 0) {
          paragraphs.push(currentPara.join(" ").replace(/\s+/g, " ").trim());
          currentPara = [];
        }
      } else {
        currentPara.push(line);
      }
    }

    // Don't forget the last paragraph
    if (currentPara.length > 0) {
      paragraphs.push(currentPara.join(" ").replace(/\s+/g, " ").trim());
    }

    // Filter out empty paragraphs and apply paragraph-level cleaning
    const cleanedParagraphs = paragraphs
      .map(p => cleanParagraph(p))
      .filter(p => p.length > 0);

    // Validate
    if (cleanedParagraphs.length === 0) {
      issues.push("No paragraphs found");
    } else {
      if (!validateFirstParagraph(cleanedParagraphs[0], lectureNum)) {
        issues.push("First paragraph unusual");
      }
      if (!validateLastParagraph(cleanedParagraphs[cleanedParagraphs.length - 1], lectureNum)) {
        issues.push("Last paragraph may be incomplete");
      }
      if (!isGermanContent(cleanedParagraphs.join(" "))) {
        issues.push("Content may not be German");
      }
    }

    // Create output
    const chapterData = {
      title: `Vorlesung ${lectureNum} (Lecture ${lectureNum})`,
      paragraphs: cleanedParagraphs.map((text, index) => ({ index, text })),
    };

    // Write to file
    const outputPath = path.join(OUTPUT_DIR, `chapter-${String(lectureNum).padStart(3, "0")}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(chapterData, null, 2), "utf-8");

    const first50 = cleanedParagraphs[0]?.substring(0, 50) || "";
    const last50 = cleanedParagraphs[cleanedParagraphs.length - 1]?.slice(-50) || "";

    results.push({
      num: lectureNum,
      startLine,
      endLine,
      paragraphs: cleanedParagraphs.length,
      first50,
      last50,
      valid: issues.length === 0,
      issues,
    });
  }

  // Print summary
  console.log("\n=== PROCESSING SUMMARY ===\n");
  console.log(`Lectures found: ${results.length}/83`);

  const missing = [];
  for (let i = 1; i <= 83; i++) {
    if (!results.find(r => r.num === i)) {
      missing.push(i);
    }
  }
  if (missing.length > 0) {
    console.log(`Missing lectures: ${missing.join(", ")}`);
  }

  const failingValidation = results.filter(r => !r.valid);
  if (failingValidation.length > 0) {
    console.log(`\nLectures with issues: ${failingValidation.length}`);
    for (const r of failingValidation) {
      console.log(`  Lecture ${r.num}: ${r.issues.join(", ")}`);
    }
  }

  console.log("\n=== LECTURE DETAILS ===\n");
  console.log("Num | Lines | Paras | First 50 chars | Last 50 chars");
  console.log("----|-------|-------|----------------|---------------");

  for (const r of results.sort((a, b) => a.num - b.num)) {
    const lineRange = `${r.startLine}-${r.endLine}`;
    console.log(`${String(r.num).padStart(3)} | ${lineRange.padEnd(5)} | ${String(r.paragraphs).padStart(5)} | ${r.first50.padEnd(50).substring(0, 50)} | ${r.last50.substring(0, 50)}`);
  }

  console.log("\n=== DONE ===");
  console.log(`Output written to: ${OUTPUT_DIR}`);
}

processLectures().catch(console.error);
