/**
 * Process Diarium Urbis Romae from raw text to chapter JSONs
 *
 * This script handles the OCR output from a critical edition which contains:
 * - Mixed diary text and scholarly apparatus (footnotes, variant readings)
 * - Manuscript sigla (C, M, R, S, etc.)
 * - Page/column references
 * - Hyphenation artifacts from original line breaks
 *
 * The script:
 * 1. Strips apparatus and scholarly annotations
 * 2. Rejoins hyphenated words
 * 3. Splits into chapters based on year markers
 * 4. Creates content-aware paragraphs
 *
 * Usage: pnpm tsx scripts/process-diarium.ts
 */

import * as fs from "fs";
import * as path from "path";

const RAW_DIR = "data/raw/diarium-urbis-romae";
const OUTPUT_DIR = "data/processed/diarium-urbis-romae";

interface Chapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

// ============================================================================
// APPARATUS DETECTION AND CLEANING
// ============================================================================

/**
 * Patterns that indicate a line is part of the critical apparatus
 * rather than the diary text itself.
 */
const APPARATUS_PATTERNS = [
  // Manuscript sigla at line start: "C M" "R S" "C C E M R R S"
  /^[CERMRSFPKW]{1,2}\s+[CERMRSFPKW]/,
  // Sigla patterns like "pt p2 p} p4" (OCR of p1 p2 p3 p4)
  /^p[t123}\]]\s+p[234}\]]/i,
  // "Così C" "Così M" - variant reading indicators
  /^Così\s+[CERMRSFPKW]/,
  /Così\s+[CERMRSFPKW]/,
  // Citation abbreviations
  /^Cf\.\s+/,
  /Cf\.\s+[A-Z]/,
  /op\.\s*cit\./,
  /vol\.\s*[IVX]+/,
  /col\.\s*\d+/,
  // Manuscript references
  /Ms\.\s*Vat\./,
  /Arch\.\s*Soc\./,
  // Page references with multiple periods
  /pp\.\s*\d+\s*-\s*\d+/,
  // Edition notes
  /^St\.\s+In[/f]essura/,
  // Pure sigla lines (multiple isolated capitals)
  /^[A-Z]\s+[A-Z]\s+[A-Z]?\s*$/,
  // Footnote references (isolated numbers with markers)
  /^\(\d+\)\s*$/,
  /^\d+\)\s*$/,
  // "in nota" references
  /in\s+nota[,.]?\s*$/,
  // Column markers common in critical editions
  /^[a-z]\)\s+/,
  // Lines that are purely bibliographic references
  /Graziavi,\s+Cron\./,
  /Reumont\s+e\s+non/,
  /Mitlheilungen/,
  /Forschttng/,
  /Garampi,/,
  /Adinolfi,/,
  /Mandalari,/,
  /Fabretti,/,
  /Bianchi,\s+pred\./,
  /Pastor\s+Gesch\./,
  /Gregokovws,\s+Gesch\./,
  /Die\s+Zer-$/,
  /stòrung\s+der\s+Engelslurg/,
  // Modern scholarly interpolations
  /\[144\d?\]/,
  /e\.\s*\d+\s*[a-z]?\s*$/,
  // Lines that are purely reference markers
  /^[CERMRSFPKW]\s+[a-z]/,
  // Registry/archive references
  /Reg\.\s+div\./,
  /in,\s*\d+;/,
  // Apparatus phrases
  /seguono\s+la\s+le[gz]ione/,
  /imbroglia\s*$/,
  /la\s+legione\s+et\s+furono\s+sconfitti/,
  /il\s+testo\s+in\s+modo/,
  /ammessa\s+dal\s+Reumont/,
  /detta\s+dal\.\s+Cf\./,
  /Diario\s+antico,\s+III/,
  /crede\s+senza\s+valore/,
  // Latin scholarly phrases in apparatus
  /pertinentiis\s+ob\s+conspirationem/,
  /Urbis\s+statum\s+perturbandum/,
  /damnati\s+adiacenti/,
  /pontifex\s+annect/,
  /vineamcumeius/,
  // Apparatus variant markers
  /&c\.\s*[CERMRSFPKW]/,
  /lo\s+tempo\s+col\s+sole\s+Cosi$/,
  // Page number style references
  /^\d+[\s,.:]+\d+;?\s+/,
  // Short apparatus lines (with sigla)
  /^[A-Z\/]\s+[a-z]+\s+[CERMRSFPKW]/,
  // Date variant lines
  /^5\s+F\s+a\s+dì/,
  /^[A-Z\/]+\s+da\s+Sarmona$/,
];

/**
 * SECTION HEADER PATTERNS - These are edition artifacts (table of contents)
 * that appear in the text but should be stripped.
 *
 * Examples:
 * - "III. HlSTORIE DOPO IL RITORNO DELLA CORTE ROMANA"
 * - "DA Avignone."
 * - "li. Quando la corte era in Pranza."
 * - "DALLO PONTIFICATO DE MARTINO PAPA QUINTO."
 * - "VI. De bello commisso inter Sixtum..."
 * - "VII..Mcccc. Lxxxiiii."
 */
const SECTION_HEADER_PATTERNS = [
  // Roman numeral section headers: "III. HISTORIE...", "VI. De bello...", "VII..Mcccc."
  // Including OCR variants like "li." for "II."
  /^[IVXLivxl]+\.+\s*[A-Z]/,
  // All-caps section headers (edition titles): "DALLO PONTIFICATO DE MARTINO PAPA QUINTO."
  /^[A-Z][A-Z\s]+[A-Z]\.\s*$/,
  // Short all-caps lines that are header continuations: "DA Avignone."
  /^[A-Z]{2,}\s+[A-Za-z]+\.?\s*$/,
  // Specific known section headers
  /^HlSTORIE\s+DOPO/i,
  /^HISTORIE\s+DOPO/i,
  /^DALLO\s+PONTIFICATO/i,
  /^DA\s+Avignone\.?\s*$/i,
  /^Quando\s+la\s+corte\s+era\s+in\s+Pranza\.?\s*$/i,
  // Latin section headers from the edition
  /^De\s+bello\s+commisso/i,
  /^TUM\s+de\s+ArIMINO/i,
  /^Q\.?UE\s+CaLABRL/i,
  /^CUM\s+tempore\s+Sixti/i,
  // Lines that are entirely uppercase Latin/Italian header text
  /^[A-Z]+\s+[A-Z]+\s+[A-Z]+\s+[A-Z]+$/,
  // Multi-line Latin header fragments
  /^\[domini\]\s+Roberti,\s+anno/i,
  /^ET\s+DE\s+MORTE\s+DICTI$/i,
];

/**
 * Patterns to strip inline (not whole line removal)
 */
const INLINE_APPARATUS_PATTERNS = [
  // Footnote markers: (1) (2) ') <J) O etc.
  /\s*[\('<][J0Oi\d]*[\)>']\s*/g,
  // Inline manuscript sigla after punctuation
  /\.\s+[CERMRSF]\s+[CERMRSF]/g,
  // Marginal notes indicators
  /\s*C\s+M\s+R?\s*$/,
  // Edition page numbers that leaked in
  /\s+\d{2,3}\s+[A-Z]/,
  // Damaged text markers
  /\(\?\)/g,
  // Strange artifacts like "\"" in middle of text
  /\\"/g,
  // Extra sigla
  /\s+[CERMRSF]\s*$/,
];

/**
 * Check if a line is a section header from the critical edition's table of contents.
 * These should be stripped entirely.
 */
function isSectionHeader(line: string): boolean {
  const trimmed = line.trim();

  // Check against section header patterns
  for (const pattern of SECTION_HEADER_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  // Lines that are short and entirely uppercase (header fragments)
  // But NOT year markers like "EL 1378"
  if (trimmed.length < 50 && /^[A-Z][A-Z\s.,]+$/.test(trimmed)) {
    // Exclude year markers
    if (!/^EL\s+\d{4}/i.test(trimmed) && !/^Dell/i.test(trimmed) && !/^Nell/i.test(trimmed)) {
      return true;
    }
  }

  // Lines starting with Roman numerals followed by period and text
  // e.g., "III. HISTORIE...", "li. Quando..." (OCR of II.)
  if (/^[IVXLivxl]{1,4}\.+\s/.test(trimmed)) {
    // But not if it starts a date like "I. di marzo"
    if (!/^[IVXivx]+\.\s+di\s+/i.test(trimmed)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a line is primarily apparatus rather than diary text
 */
function isApparatusLine(line: string): boolean {
  const trimmed = line.trim();

  // First check if it's a section header
  if (isSectionHeader(trimmed)) return true;

  // Very short lines are suspicious
  if (trimmed.length < 15) {
    // But allow date markers
    if (/^[AE][td]\s+d[iì]/i.test(trimmed)) return false;
    // Check if it's just sigla
    if (/^[CERMRSFPKW\s]+$/.test(trimmed)) return true;
    // Numbers alone
    if (/^\d+[\s.]*$/.test(trimmed)) return true;
  }

  // Check against apparatus patterns
  for (const pattern of APPARATUS_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  // High ratio of references/citations suggests apparatus
  const refCount = (trimmed.match(/Cf\.|op\.\s*cit\.|vol\.|pp\.|col\./g) || []).length;
  if (refCount >= 2) return true;

  // Lines that are mostly bibliographic info
  if (/^\d+[,.:]\s*\d+/.test(trimmed) && trimmed.length < 60) return true;

  // Lines with many sigla characters relative to length
  const siglaCount = (trimmed.match(/\b[CERMRSFPKW]\b/g) || []).length;
  if (siglaCount >= 3 && trimmed.length < 80) return true;

  // Lines that look like variant readings (start with variant text marker)
  if (/^diede\s+a\s+Natale/i.test(trimmed)) return true;
  if (/^tagliare\s+la\s+testa\s+a\s+Natalo/i.test(trimmed)) return true;

  // Lines that are clearly intruding from footnote apparatus
  if (/\(\d+\)\s*$/i.test(trimmed)) return true;

  // Lines containing only bibliographic style content
  if (/^\d+\s*-\s*\d+\s*\.?\s*$/.test(trimmed)) return true;

  // Catch-all for lines that are predominantly apparatus markers
  if (/^[A-Z\/\s]+[a-z]+\s+[CERMRSFPKW]/.test(trimmed) && trimmed.length < 50) return true;

  return false;
}

/**
 * Clean inline apparatus from a line while preserving diary text.
 * Also removes section headers that got concatenated with diary text.
 */
function cleanInlineApparatus(line: string): string {
  let cleaned = line;

  // Remove footnote markers
  cleaned = cleaned.replace(/\s*[\('<\["][J0Oi\d]?[\)>'\]"]\s*/g, " ");

  // Remove trailing sigla
  cleaned = cleaned.replace(/\s+[CERMRSFPKW]\s*$/, "");

  // Remove "Così C C" style insertions mid-line
  cleaned = cleaned.replace(/Così\s+[CERMRSFPKW\s]+/g, "");

  // Clean up page markers that leaked in
  cleaned = cleaned.replace(/e\.\s*\d+\s*[a-z]?\s+/g, "");

  // Remove isolated sigla
  cleaned = cleaned.replace(/\s+[CERMRSFPKW]\s+[CERMRSFPKW]\s+/g, " ");

  // Remove apparatus phrases that got merged into text
  cleaned = cleaned.replace(/xM\s+combattendo\s+un\s+tempo\s+Così$/i, "");
  cleaned = cleaned.replace(/DALLO\s+PONTIFICATO\s+DE\s+MARTINO\s+PAPA\s+QUINTO\.?/g, "");
  cleaned = cleaned.replace(/Braccio\s+da\s+Montone\s+da\s+Perugia,\s+e\s+si\s+ebbe\s+Roma\s+xM/g, "");

  // Remove section headers that got concatenated with diary text
  // "III. HlSTORIE DOPO IL RITORNO DELLA CORTE ROMANA DA Avignone."
  cleaned = cleaned.replace(/\s+[IVXLivxl]+\.\s*H[Il]STORIE[^.]*\.?/g, "");
  cleaned = cleaned.replace(/\s+[IVXLivxl]+\.\s*HISTORIE[^.]*\.?/g, "");
  cleaned = cleaned.replace(/\s+DA\s+Avignone\.?\s*$/i, "");
  cleaned = cleaned.replace(/\s+DELLA\s+CORTE\s+ROMANA[^.]*$/i, "");
  cleaned = cleaned.replace(/\s+DOPO\s+IL\s+RITORNO[^.]*$/i, "");

  // Remove "li. Quando la corte era in Pranza." (section II header)
  cleaned = cleaned.replace(/\s+li\.\s+Quando\s+la\s+corte\s+era\s+in\s+Pranza\.?/gi, "");

  // Remove inline variant readings in italics markers
  cleaned = cleaned.replace(/[A-Z]\/\s+[a-z]+\s+[CERMRSFPKW]/g, "");

  // Remove mid-text apparatus (after "Così")
  cleaned = cleaned.replace(/Così[^.]*$/g, "");

  // Clean quotes from apparatus
  cleaned = cleaned.replace(/«\s*[^»]*»\s*[CERMRSFPKW]/g, "");

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  return cleaned;
}

/**
 * Rejoin words that were hyphenated at line breaks
 */
function rejoinHyphenatedWords(lines: string[]): string[] {
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // If line ends with a hyphen and there's a next line
    if (line.endsWith("-") && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (nextLine.length > 0) {
        // Get the first word of the next line
        const firstWordMatch = nextLine.match(/^(\S+)/);
        if (firstWordMatch) {
          // Join the hyphenated word
          line = line.slice(0, -1) + firstWordMatch[1];
          // Modify the next line to remove the joined word
          lines[i + 1] = nextLine.slice(firstWordMatch[1].length).trim();
        }
      }
    }

    result.push(line);
  }

  return result;
}

// ============================================================================
// CHAPTER AND PARAGRAPH DETECTION
// ============================================================================

/**
 * Year marker patterns that indicate a new chapter
 */
const YEAR_PATTERNS = [
  /^Dell'anno[\s.]+(\d{4}|[MCDXLVI]+)/i,
  /^Nell'anno[\s.]+(\d{4}|[MCDXLVI]+)/i,
  /^Del[\s.]+(\d{4})/i,
  /^Del[\s.]+sopra\s*detto\s+anno/i,
  /^EL[\s.]+(\d{4})/i,
  /^In quell'[\s]*anno/i,
  /^Anno\s+Domini\s+\d{4}/i,
];

/**
 * Patterns that indicate the start of a new diary entry (paragraph break)
 */
const ENTRY_START_PATTERNS = [
  /^A\s+d[iì]\s+\d+/i, // "A dì 15..."
  /^Et\s+a\s+d[iì]\s+\d+/i, // "Et a dì 20..."
  /^Eodem\s+anno/i, // "Eodem anno..."
  /^Die\s+\d+/i, // "Die 3 martii..."
  /^Et\s+dep[oò]/i, // "Et depò..."
  /^Et\s+in\s+quest/i, // "Et in quest'anno..."
  /^Lo\s+d[iì]\s+/i, // "Lo dì primo..."
  /^Nel\s+mese\s+d[ie]/i, // "Nel mese di..."
  /^Del\s+mese\s+d[ie]/i, // "Del mese di..."
  /^Dopo\s+del\s+mese/i, // "Dopo del mese..."
];

function isYearMarker(line: string): boolean {
  const trimmed = line.trim();
  return YEAR_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function isEntryStart(line: string): boolean {
  const trimmed = line.trim();
  return ENTRY_START_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function extractYear(line: string): string | null {
  // Try to extract a year (Arabic or Roman numerals)
  const arabicMatch = line.match(/\b(1[234]\d{2})\b/);
  if (arabicMatch) return arabicMatch[1];

  // Roman numerals for years like MCCCCIM, MCCCCIIII
  const romanMatch = line.match(/[.']?([MCDXLVI]+)[.']?/i);
  if (romanMatch) {
    const roman = romanMatch[1].toUpperCase();
    if (roman.includes("MCCCC")) return "14xx";
    if (roman.includes("MCCC")) return "13xx";
    return roman;
  }

  return null;
}

/**
 * Clean and preprocess all lines
 */
function preprocessLines(rawLines: string[]): string[] {
  // Step 1: Filter out pure apparatus lines
  let lines = rawLines.filter((line) => !isApparatusLine(line));

  // Step 2: Rejoin hyphenated words
  lines = rejoinHyphenatedWords(lines);

  // Step 3: Clean inline apparatus from remaining lines
  lines = lines.map((line) => cleanInlineApparatus(line));

  // Step 4: Filter out any lines that became empty or too short
  lines = lines.filter((line) => line.trim().length > 0);

  return lines;
}

/**
 * Create paragraphs from lines using content-aware detection.
 *
 * Key improvements in v2:
 * - Any single blank line creates a paragraph break (more aggressive)
 * - Entry start patterns (date markers) always create a break
 * - Better handling of sentence boundaries
 * - Prevents overly long paragraphs (max ~800 chars before forcing a break)
 */
function createParagraphs(lines: string[]): { index: number; text: string }[] {
  const paragraphs: { index: number; text: string }[] = [];
  let currentParagraph: string[] = [];
  let paragraphIndex = 0;
  let currentLength = 0;

  const MAX_PARAGRAPH_LENGTH = 800; // Force break if paragraph gets too long

  function saveParagraph() {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(" ").replace(/\s{2,}/g, " ").trim();
      // Only save paragraphs with substantial content (>20 chars to allow short entries)
      if (text.length > 20) {
        paragraphs.push({ index: paragraphIndex++, text });
      }
      currentParagraph = [];
      currentLength = 0;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line = paragraph break
    if (trimmed === "") {
      saveParagraph();
      continue;
    }

    // Check for new entry start patterns - always break before these
    if (isEntryStart(trimmed) || isYearMarker(trimmed)) {
      if (currentParagraph.length > 0) {
        saveParagraph();
      }
    }

    // Check if adding this line would make paragraph too long
    // If so, try to find a good break point or force a break
    if (currentLength > MAX_PARAGRAPH_LENGTH && currentParagraph.length > 0) {
      const lastText = currentParagraph[currentParagraph.length - 1];
      // If last line ended with sentence-ending punctuation, break here
      if (/[.;:»!?]$/.test(lastText)) {
        saveParagraph();
      }
    }

    currentParagraph.push(trimmed);
    currentLength += trimmed.length + 1; // +1 for space
  }

  // Save final paragraph
  saveParagraph();

  return paragraphs;
}

/**
 * Split the full text into chapters based on year markers
 */
function splitIntoChapters(lines: string[]): Chapter[] {
  const chapters: Chapter[] = [];
  let currentLines: string[] = [];
  let currentTitle = "Manca lo principio (Beginning)";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this line starts a new year section
    if (isYearMarker(trimmed) && currentLines.length > 3) {
      // Save current chapter
      if (currentLines.length > 0) {
        const paragraphs = createParagraphs(currentLines);
        if (paragraphs.length > 0) {
          chapters.push({
            chapterNumber: chapters.length + 1,
            title: currentTitle,
            sourceContent: { paragraphs },
          });
        }
      }

      // Start new chapter
      currentLines = [line];
      // Create a clean title
      let title = trimmed;
      // Clean up apparatus from title
      title = cleanInlineApparatus(title);
      // Truncate if too long
      if (title.length > 80) {
        title = title.substring(0, 77) + "...";
      }
      currentTitle = title;
    } else {
      currentLines.push(line);
    }
  }

  // Save last chapter
  if (currentLines.length > 0) {
    const paragraphs = createParagraphs(currentLines);
    if (paragraphs.length > 0) {
      chapters.push({
        chapterNumber: chapters.length + 1,
        title: currentTitle,
        sourceContent: { paragraphs },
      });
    }
  }

  return chapters;
}

// ============================================================================
// MAIN
// ============================================================================

function main(): void {
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Read main diary file
  const diaryPath = path.join(RAW_DIR, "diary-full.txt");
  if (!fs.existsSync(diaryPath)) {
    console.error(`Error: ${diaryPath} not found`);
    process.exit(1);
  }

  const content = fs.readFileSync(diaryPath, "utf-8");
  const rawLines = content.split("\n");

  console.log(`Read ${rawLines.length} lines from diary-full.txt`);

  // Preprocess: clean apparatus, rejoin words
  const cleanedLines = preprocessLines(rawLines);
  console.log(`After cleaning: ${cleanedLines.length} lines (${rawLines.length - cleanedLines.length} apparatus lines removed)`);

  // Split into chapters
  const chapters = splitIntoChapters(cleanedLines);

  console.log(`Created ${chapters.length} chapters\n`);

  // Write chapter files
  let totalParagraphs = 0;
  for (const chapter of chapters) {
    const filename = `chapter-${String(chapter.chapterNumber).padStart(3, "0")}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(chapter, null, 2));
    totalParagraphs += chapter.sourceContent.paragraphs.length;

    console.log(
      `  ${filename}: "${chapter.title.substring(0, 50)}${chapter.title.length > 50 ? "..." : ""}" (${chapter.sourceContent.paragraphs.length} paragraphs)`
    );
  }

  console.log(`\nTotal: ${chapters.length} chapters, ${totalParagraphs} paragraphs`);
  console.log(`Output: ${OUTPUT_DIR}/`);

  // Also process altro-principio as an appendix chapter
  const altroPath = path.join(RAW_DIR, "altro-principio.txt");
  if (fs.existsSync(altroPath)) {
    const altroContent = fs.readFileSync(altroPath, "utf-8");
    const altroRawLines = altroContent.split("\n");
    const altroCleanedLines = preprocessLines(altroRawLines);
    const altroParagraphs = createParagraphs(altroCleanedLines);

    if (altroParagraphs.length > 0) {
      const altroChapter: Chapter = {
        chapterNumber: chapters.length + 1,
        title: "Altro principio del Diario (Alternative Beginning)",
        sourceContent: { paragraphs: altroParagraphs },
      };

      const altroFilename = `chapter-${String(altroChapter.chapterNumber).padStart(3, "0")}.json`;
      fs.writeFileSync(path.join(OUTPUT_DIR, altroFilename), JSON.stringify(altroChapter, null, 2));

      console.log(`\nAppendix: ${altroFilename} (${altroChapter.sourceContent.paragraphs.length} paragraphs)`);
    }
  }
}

main();
