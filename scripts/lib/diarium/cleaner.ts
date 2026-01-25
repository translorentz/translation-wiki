/**
 * Cleaner module: removes OCR noise, page headers, footnotes,
 * editorial markers, and normalizes text.
 */

import type { CleaningStats } from './types.js';

/**
 * Check if a line is a page header for the diary section.
 * Patterns:
 * - [YEAR]  DIARIA  RERUM  ROMANARUM.  PAGE_NUM   (odd pages)
 * - PAGE_NUM  STEPHANI  INFESSURAE  [YEAR]         (even pages)
 * - Standalone page numbers (1-300 range)
 * - Lines that are JUST a year in brackets: [1414]
 */
export function isPageHeader(line: string): boolean {
  const trimmed = line.trim();

  // Empty lines are not headers
  if (!trimmed) return false;

  // Pattern: [YEAR]  DIARIA  RERUM  ROMANARUM.  PAGE_NUM
  // Allow OCR variants: ROMAN ARUM, ROlvLANARUM, etc.
  // Year may be garbled: [ijoo] = [1300], [1484], etc.
  if (/^\[[\di][0-9ijo]{2,3}\]\s+DIARIA\s+RERUM\s+ROM/i.test(trimmed)) return true;

  // Pattern: PAGE_NUM  STEPHANI  INFESSURAE  [YEAR]
  if (/^\d+\s+STEPHANI\s+INFESSURAE/i.test(trimmed)) return true;
  // Also garbled: i6d stephani infessurae, etc.
  if (/^[a-z0-9]+\s+stephani\s+infessurae/i.test(trimmed)) return true;

  // Standalone "DIARIA  RERUM  ROMANARUM." on its own line (OCR split header)
  if (/^DIARIA\s+RERUM\s+ROM/i.test(trimmed) && trimmed.length < 40) return true;

  // Standalone page number (just a number, 1-350 range, possibly garbled)
  // Be careful: line numbers 5/10/15/20/25/30 also appear. Handle those separately.
  if (/^\d{1,3}\s*$/.test(trimmed) && parseInt(trimmed) > 35) return true;
  // OCR garbled page numbers: $5, 9I, etc.
  if (/^[\$\d][0-9I]{1,2}\s*$/.test(trimmed) && trimmed.length <= 4) return true;

  // Standalone year in brackets: [1414] or [ijoo] or [1484]
  if (/^\[[\di][0-9ijo]{2,3}\]\s*$/.test(trimmed)) return true;

  // "PREFAZIONE.  ROMAN_NUMERAL" pattern (for preface headers)
  if (/^PREFAZIONE\.\s+[IVXLCDM]+\s*$/i.test(trimmed)) return true;

  // "O.  TOMMASINI" or "O.TOMMASINI" standalone (author running header)
  if (/^O\.\s*TOMMASINI/i.test(trimmed) && trimmed.length < 20) return true;
  // With Roman numeral page prefix: "vili  O.   TOMMASINI" or "XVI  O.    TOMMASINI"
  if (/^[IVXLCDM]+\s+O\.\s*TOMMASINI/i.test(trimmed)) return true;
  // Garbled: "X  O.    TOMMASINI"
  if (/^[A-Z]{1,4}\s+O\.\s*TOMMAS/i.test(trimmed)) return true;

  // "St.  Infessura." standalone (running header variant)
  if (/^St\.\s+Infessura\.?\s*$/i.test(trimmed)) return true;

  // Standalone page numbers in the preface (Roman numerals)
  if (/^[ivxlcdm]+\s*$/i.test(trimmed) && trimmed.length <= 6) return true;

  // Standalone numbers that look like page numbers from the printed edition
  // "i9»" = 19, "5I" = 51, etc.
  if (/^[i1-9]\d{0,2}[»>)]*\s*$/.test(trimmed) && trimmed.length <= 5) return true;

  return false;
}

/**
 * Check if a line starts an apparatus criticus footnote.
 * These start with (a), (b), (c), etc. and cite manuscript sigla.
 */
export function isApparatusCriticusLine(line: string): boolean {
  const trimmed = line.trim();
  // Pattern: starts with (a), (b), ..., (z), possibly with superscripts or dot
  if (/^\([a-z]\.?\)\s+/.test(trimmed)) return true;
  // Continuation lines of apparatus that start with manuscript sigla patterns:
  // "O' V^ Perosia  C  R^  S  S^  V  Peroscia"
  if (/^[CEMORSVP]['^]?\s+[CEMORSVP]['^]?\s/.test(trimmed) && trimmed.length < 130) return true;
  // Lines with mid-line apparatus markers: "maggio (e) C^ C^ M..."
  if (/\([a-z]\)\s+[CEMORSVP]['^]?\s/.test(trimmed) &&
      (trimmed.match(/[CEMORSVP]['^]?\s/g) || []).length >= 2) return true;
  // Lines starting with sigla + reading: "R' S de Mercati" or "C de' Mercanti"
  if (/^[CEMORSVP]['^]?\s+(de|di|e\s|et\s|in\s|manca|sopra|corregge|annota|legga|reca)/i.test(trimmed)) return true;
  // Lines with variant readings indicated by keywords
  if (/^(Cosi|Così)\s+[CEMORSVP]/.test(trimmed)) return true;
  // Lines with "In X manca" pattern
  if (/^In\s+[CEMORSVP]['^]?\s+(manca|è)/i.test(trimmed)) return true;
  return false;
}

/**
 * Check if a line starts a scholarly footnote.
 * These start with (1), (2), (3), etc. and provide references.
 */
export function isScholarlyFootnoteLine(line: string): boolean {
  const trimmed = line.trim();
  // Pattern: starts with (1), (2), etc.
  if (/^\(\d+\)\s+/.test(trimmed)) return true;
  // Also handles Roman numeral footnotes: (i), (ii) — but these overlap with apparatus
  // Be more specific: scholarly notes cite authors, page numbers, etc.
  return false;
}

/**
 * Check if a line is a continuation of a footnote.
 * Footnote continuations typically:
 * - Start with a lowercase letter or quotation mark
 * - Contain manuscript sigla patterns
 * - Contain bibliographic references
 * - Are indented or start with citation patterns
 *
 * This is context-dependent, so we use a flag-based approach in the main cleaner.
 */
export function looksLikeFootnoteContinuation(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Lines that are clearly footnote-related:
  // Contains manuscript sigla patterns like "C^", "R'", "S'", "E M"
  // followed by text variant
  if (/^[A-Z]['^]?\s+[A-Z]/.test(trimmed) && trimmed.length < 100) return true;

  // Starts with "«" (quotation in footnote)
  if (/^[«"]/.test(trimmed)) return true;

  // Contains "Cf." or "cf." (scholarly cross-reference)
  if (/^[Cc]f\.\s/.test(trimmed)) return true;

  // Contains bibliographic abbreviations
  if (/^(loc\.\s+cit|op\.\s+cit|ibid)/i.test(trimmed)) return true;

  return false;
}

/**
 * Check if a line is a standalone folio/carta reference.
 * Pattern: "e.  37  A" or "c.  16 a" or "e.  169 a" or "e. 170 A"
 */
export function isFolioReference(line: string): boolean {
  const trimmed = line.trim();
  // Standalone folio ref: "e.  NNN  A/B/a/b" or "c.  NNN  A/B/a/b"
  if (/^[ec]\.\s+\d+\s*[ABab]\s*$/.test(trimmed)) return true;
  return false;
}

/**
 * Remove inline folio references, footnote markers, and manuscript page breaks.
 */
export function removeInlineMarkers(line: string): string {
  let result = line;

  // Remove || manuscript page break markers
  result = result.replace(/\|\|/g, '');

  // Remove single | pipe characters that are OCR artifacts (not part of words)
  // Match | surrounded by spaces or at word boundaries
  result = result.replace(/\s+\|\s+/g, ' ');
  // Also at end/start of line
  result = result.replace(/\|\s+/g, ' ');
  result = result.replace(/\s+\|$/g, '');

  // Remove "jj" that is OCR-garbled "||" (manuscript page break marker)
  // Only when surrounded by spaces (not part of a word)
  result = result.replace(/\s+jj\s+/g, ' ');

  // Remove "II" when it appears as garbled "||" between text
  // (only when surrounded by spaces and not at start of Roman numeral)
  result = result.replace(/\s+II\s+(?=[a-z])/g, ' ');

  // Remove inline folio references: "e.  NNN  A/B" or "c.  NNN  a/b" or "e NNN A/B"
  result = result.replace(/\b[ec]\.\s+\d+\s*[ABab]\b/g, '');
  // Also without the dot: "e 38 b", "e. 157 A" — broader pattern
  result = result.replace(/\be\s+\d{1,3}\s*[ABab]\b/g, '');
  // With hyphen instead of dot: "e- 157 A"
  result = result.replace(/\be-\s+\d{1,3}\s*[ABab]\b/g, '');
  // Extended folio: "<^- 40 b" or similar garbled folio refs
  result = result.replace(/<\^-\s+\d+\s*[ABab]\b/g, '');
  // Folio with lowercase letter suffix: "e. 157 e" (carta 157, side e?)
  result = result.replace(/\b[ec][.-]\s*\d{1,3}\s*[ABabe]\b/g, '');

  // Remove footnote call markers — the OCR renders them in many garbled forms:
  // Standard: (^), (*), ('), (°), (=), ('^), (^*)
  // OCR garbled: W, <^), (^>, (s), (0, (**\, (^^, (§), (■), (■■)
  // Also: (^^ , '^"^, C'^), <^*), <^'), ("">, (">), <•), (•), (*>
  // Also: (^^, ('^, <^s), (^i), (0, (""), (J), (+), ('), (°^, (~^\

  // Pattern 1: parenthesized special chars (broad catch-all)
  // Catches: (^), (*), ('), (°), (=), (§), (■), (♦), (•), (+), (~), (»)
  // and combinations: (^^), (**), ('^), (°^), (~^\, (*-', (f>, <^s)
  result = result.replace(/\s*[<(]\s*['^°=§*^♦■•~+f#!?,;:s0-9»«"]{1,4}\s*[)>\\]\s*/g, ' ');

  // Pattern 2: garbled markers with angle brackets or mixed: <^), <^*), <^'), <^s^, (*>
  result = result.replace(/\s*<['^*^s]{1,4}[)>\\]\s*/g, ' ');
  result = result.replace(/\s*\(['^*^s]{1,4}>\s*/g, ' ');

  // Pattern 3: markers with backslash: (**\, (^^\, (~^\
  result = result.replace(/\s*\([*^~']{1,4}\\\s*/g, ' ');

  // Pattern 4: multiple ^ or ' : (^^, (^^^, '^"^, ^^), ^^^
  result = result.replace(/\s*\(\^{1,4}\s*/g, ' ');
  result = result.replace(/\s*'\^"?\^\s*/g, ' ');
  // Standalone ^^ or ^^^ between text (with or without trailing backslash)
  result = result.replace(/\s+\^{2,4}[\\)]?\s*/g, ' ');
  // ^O, ^O), ^') — single caret with letter/symbol
  result = result.replace(/\s*\^[A-Za-z)\\]\s*/g, ' ');
  // Standalone ^ between words (garbled marker)
  result = result.replace(/\s+\^\s+/g, ' ');
  // ^^) pattern
  result = result.replace(/\s*\^{1,4}\)\s*/g, ' ');
  // ^s\ or ^s) pattern
  result = result.replace(/\s*\^[a-z][\\)]\s*/g, ' ');
  // ^^^; — multiple carets before punctuation
  result = result.replace(/\s*\^{1,4}([;,.])/g, '$1');
  // ^'^ pattern
  result = result.replace(/\s*\^'\^\s*/g, ' ');

  // Pattern 5: (a) through (z) inline markers — single lowercase letter in parens
  // Remove when they appear after text (not at line start — those are apparatus)
  result = result.replace(/(?<=\S)\s*\([a-z]\)\s*/g, ' ');
  // Also at line end or before punctuation
  result = result.replace(/\s*\([a-z]\)\s*([,;.])/g, '$1');

  // Pattern 6: W as garbled footnote marker
  // W appears isolated between spaces and is followed by a lowercase letter or comma
  result = result.replace(/\s+W\s+(?=[a-z,;])/g, ' ');
  // W at end of a word group followed by space (e.g., "CampaneamW;")
  result = result.replace(/(\w)W([;,.])/g, '$1$2');
  // W between words where it's clearly a marker (before uppercase too in some cases)
  result = result.replace(/\s+W\s+(?=[A-Z][a-z])/g, ' ');
  // W followed by period or comma (e.g., "Infessura W." or "papa W ,")
  result = result.replace(/\s+W\s*([.,;:])/g, '$1');
  // W followed by space then period/comma (after other marker removal leaves space)
  result = result.replace(/\s+W\s+([.,;:])/g, '$1');
  // W at end of line (with or without trailing space)
  result = result.replace(/\s+W\s*$/g, '');
  // W between spaces before end of sentence or before "et"
  result = result.replace(/\s+W\s+(?=et\s)/g, ' ');
  // Isolated W between words (broader catch) — only when clearly not a word
  // Must be preceded by a word char or punctuation, and followed by space+word
  result = result.replace(/(\w)\s+W\s+(\w)/g, '$1 $2');
  // W followed by other markers (^, ^^, etc.) — remove both
  result = result.replace(/\s+W\s*\^+\s*/g, ' ');
  // Remaining standalone W between text (catch-all for W as footnote marker)
  result = result.replace(/\s+W\s+/g, ' ');

  // Pattern 7: Various specific garbled patterns from OCR
  // (0, — garbled (1), (2), etc.
  result = result.replace(/\s*\(0[,;.]\s*/g, ' ');
  // ("> or ("") or (""  — garbled quotation mark patterns
  result = result.replace(/\s*\([""«»]{1,3}[)>]?\s*/g, ' ');
  // C") or C"^ — garbled C with quotation
  result = result.replace(/\s*C[""'][)^]?\s*/g, ' ');
  // (J) — garbled marker
  result = result.replace(/\s*\([JI]\)\s*/g, ' ');
  // (') and (*) specifically
  result = result.replace(/\s*\('\)\s*/g, ' ');
  result = result.replace(/\s*\(\*\)\s*/g, ' ');
  // (*• or (**) or (***
  result = result.replace(/\s*\(\*{1,3}[•)\\]?\s*/g, ' ');
  // (•) and <•) specifically
  result = result.replace(/\s*[<(]•+[)>]\s*/g, ' ');

  // Pattern 8: superscript numbers in parentheses as markers: (1), (2) mid-line
  // Only when they appear inline (not at line start — those are scholarly notes)
  result = result.replace(/(?<=\S)\s*\(\d{1,2}\)\s*/g, ' ');

  // Pattern 9: Garbled footnote markers with mixed chars
  // C'^), C>), (0,, [0 etc.
  result = result.replace(/\s*[C<]\s*['>'^]?\^?\)\s*/g, ' ');
  result = result.replace(/\s*\[0\s*/g, ' ');
  // (™) — garbled marker in OCR
  result = result.replace(/\s*\(™+\)\s*/g, ' ');
  // (^^  at end of word
  result = result.replace(/\s*\(\^{1,3}\s*/g, ' ');

  // Pattern 10: .^ (dot-caret) which is garbled marker
  result = result.replace(/\.\^/g, '.');

  // Pattern 11: Inline page headers that OCR merged into text
  // "STEPHANI INFESSURAE" as a whole line or embedded in text
  result = result.replace(/\s*STEPHANI\s+INFESSURAE\s*/g, ' ');
  // "[YEAR] DIARIA RERUM ROMANARUM. PAGE" inline
  result = result.replace(/\s*\[\d{4}\]\s+DIARIA\s+RERUM\s+ROM\w*\.?\s+\d*\s*/g, ' ');
  // Inline "c. NNN A/B" or "e. NNN A/B" folio references (with preceding text)
  result = result.replace(/\bc\.\s*\d{1,3}\s*[ABab]\b/g, '');
  result = result.replace(/\be\.\s*\d{1,3}\s*[ABab]\b/g, '');

  // Pattern 11b: Standalone special chars that are clearly markers
  // "1 5" at end of line (garbled "15" line number)
  // "$5" or "9I" standalone page numbers handled by isPageHeader

  // Pattern 12: Garbled footnote ref attached to preceding word
  // e.g., "afHrmatum fuitW." → "afHrmatum fuit."
  result = result.replace(/(\w)W(\s|[.,;:!?]|$)/g, '$1$2');

  // Pattern 13: Various bracket-based markers
  // (>) or (<) isolated
  result = result.replace(/\s*\([<>]\)\s*/g, ' ');
  // (^> or <^>
  result = result.replace(/\s*[<(]\^+[>)]\s*/g, ' ');

  // Pattern 14: R with single line break (header fragment that leaked)
  // "R\n" standalone after text — this is a page fragment

  // Pattern 15: Trailing editorial line numbers at end of lines
  // These appear as " 5", " 10", " 15", " 20", " 25", " 30" at line end
  // Also garbled forms: " 2(", " IO", " ij", " ì", " i", " io" etc.
  result = result.replace(/\s+(5|10|15|20|25|30|IO|ìo|ij|I5|2\(|2o|\^c|3o)\s*$/g, '');
  // Single garbled characters that are line numbers at end: ì, i, j
  // Only when preceded by space and word (not part of Italian text like "di")
  result = result.replace(/\s+[ìij]\s*$/g, '');
  // "io" at end when preceded by hyphenated word (clearly garbled "10")
  result = result.replace(/-\s+io\s*$/g, '-');

  // Pattern 16: "1 5" at end (garbled "15" split into two)
  result = result.replace(/\s+1\s+5\s*$/g, '');
  // "2 (" at end
  result = result.replace(/\s+2\s+\(\s*$/g, '');

  // Pattern 17: Trailing garbled markers
  // "am- ^" — hyphenated word with trailing marker (the ^ is noise)
  result = result.replace(/\s+\^+\s*$/g, '');
  // " H" at end of line (garbled footnote marker)
  result = result.replace(/\s+H\s*$/g, '');

  // Clean up any double/triple spaces left by removals
  result = result.replace(/  +/g, ' ');
  // Clean up space before punctuation
  result = result.replace(/ ([,;.!?:])/g, '$1');

  return result;
}

/**
 * Check if a line is a standalone editorial line number (5, 10, 15, 20, 25, 30).
 * These are Tommasini's line numbering system, appearing alone on a line.
 * Also catches OCR-garbled versions of these numbers.
 */
export function isEditorialLineNumber(line: string): boolean {
  const trimmed = line.trim();
  // Standalone numbers that are multiples of 5, in range 5-30
  if (/^(5|10|15|20|25|30)\s*$/.test(trimmed)) return true;
  // OCR-garbled versions
  if (/^(IO|io|ìo|ro|ij|I5|\[5|\$5|2\(|2o|ao|a5|2\$|\^c|3o|50)\s*$/.test(trimmed)) return true;
  return false;
}

/**
 * Remove leading editorial line numbers from text lines.
 * Pattern: "5  text continues here" or "10  text continues"
 * Line numbers are 5, 10, 15, 20, 25, 30 at the very start of a line
 * followed by at least 2 spaces and then text.
 *
 * OCR frequently garbles these numbers:
 * - 5 → 5, [5, $5
 * - 10 → 10, IO, io, ìo, ro
 * - 15 → 15, ij, 1$, I5, [5
 * - 20 → 20, 2o, 2(, ao
 * - 25 → 25, 2$, a5
 * - 30 → 30, 3o, ^c, 50
 */
export function removeLeadingLineNumber(line: string): string {
  // Match: optional spaces + line number (exact or garbled) + 2+ spaces + text
  // Exact numbers
  const exactMatch = line.match(/^\s*(5|10|15|20|25|30)\s{2,}(.+)$/);
  if (exactMatch) {
    return exactMatch[2];
  }

  // OCR-garbled line numbers at start of line
  // IO/io/ìo = 10; ij/I5/[5/$5 = 5 or 15; 2(/2o/ao = 20; ^c/50/3o = 30
  const garbledMatch = line.match(/^\s*(IO|io|ìo|ro|ij|I5|\[5|\$5|2\(|2o|ao|a5|2\$|\^c|3o|50)\s{2,}(.+)$/);
  if (garbledMatch) {
    return garbledMatch[2];
  }

  // Also handle the case where the number is at the start followed by just 1 space
  // but only for very clear garbled patterns that can't be real words
  const singleSpaceGarbled = line.match(/^\s*(IO|ìo|\[5|2\(|\^c)\s+(.{20,})$/);
  if (singleSpaceGarbled) {
    return singleSpaceGarbled[2];
  }

  // "o " at the very start when followed by an uppercase letter (garbled 10)
  // Only when the "o" is clearly not part of a word (followed by space + uppercase)
  const garbledO = line.match(/^\s*o\s+([A-Z].{20,})$/);
  if (garbledO) {
    return garbledO[1];
  }

  // Single special chars at start of line that are garbled line numbers/markers:
  // f, ^, ;, », 3, j, [, $ when followed by space and substantial text
  const garbledSingleChar = line.match(/^\s*[f^;»3j\[$]\s+(.{25,})$/);
  if (garbledSingleChar) {
    return garbledSingleChar[1];
  }

  // "59*" or similar garbled page numbers at start of line
  const garbledPageNum = line.match(/^\s*\d{2}\*?\s+(.{20,})$/);
  if (garbledPageNum && parseInt(line.trim()) > 35) {
    return garbledPageNum[1];
  }

  // "1-1" at start (garbled line number "11" or "|-|" margin marker)
  const garbled11 = line.match(/^\s*1-1\s+(.{20,})$/);
  if (garbled11) {
    return garbled11[1];
  }

  return line;
}

/**
 * Rejoin hyphenated words split across lines.
 * Returns the modified array of lines.
 */
export function rejoinHyphenatedLines(lines: string[]): string[] {
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const currentLine = lines[i];

    // Check if line ends with a hyphen followed by possible whitespace
    if (i + 1 < lines.length && /\w-\s*$/.test(currentLine)) {
      const nextLine = lines[i + 1];
      const nextTrimmed = nextLine.trim();

      if (nextTrimmed && /^[a-zàáâãäåèéêëìíîïòóôõöùúûü]/.test(nextTrimmed)) {
        // Rejoin: remove hyphen from end of current line, prepend next line content
        const joined = currentLine.replace(/(\w)-\s*$/, '$1') + nextTrimmed;
        result.push(joined);
        i += 2; // Skip the next line since it's been joined
        continue;
      }
    }

    result.push(currentLine);
    i++;
  }

  return result;
}

/**
 * Normalize spacing in a line:
 * - Collapse multiple spaces to single space
 * - Trim leading/trailing whitespace
 */
export function normalizeSpacing(line: string): string {
  return line.replace(/  +/g, ' ').trim();
}

/**
 * Collapse consecutive blank lines to at most one blank line.
 */
export function collapseBlankLines(lines: string[]): string[] {
  const result: string[] = [];
  let prevBlank = false;

  for (const line of lines) {
    const isBlank = line.trim() === '';
    if (isBlank) {
      if (!prevBlank) {
        result.push('');
      }
      prevBlank = true;
    } else {
      result.push(line);
      prevBlank = false;
    }
  }

  return result;
}

/**
 * Determine if a line is part of a multi-line footnote block.
 * This uses heuristics based on the surrounding context.
 *
 * A footnote block starts with (a)/(1) etc. and continues until:
 * - A blank line followed by non-footnote content
 * - A line that clearly starts diary text (year entry, "Die", "A dì", etc.)
 */
export function isDiaryTextStart(line: string): boolean {
  const trimmed = line.trim();

  // Year entry patterns
  if (/^(Dell'anno|Nell'anno|Anno\s+Domini)/i.test(trimmed)) return true;

  // Latin date entries
  if (/^Die\s+\./i.test(trimmed)) return true;
  if (/^Die\s+(dominico|lune|martis|mercurii|iovis|veneris|sabbat)/i.test(trimmed)) return true;
  if (/^Die\s+\d/i.test(trimmed)) return true;

  // Italian date entries
  if (/^A\s+d[iì]\s+\d/i.test(trimmed)) return true;

  // Section headers (Roman numeral + title)
  if (/^[IVX]+\.\s+/.test(trimmed)) return true;

  // Starts with uppercase and looks like narrative
  // (this is a weak heuristic, use carefully)

  return false;
}

/**
 * Check if a line looks like it belongs to a footnote block.
 * This is a broader check than just the first line — it catches:
 * - Lines that are clearly bibliographic references
 * - Lines with manuscript sigla patterns
 * - Lines from two-column footnote layout
 */
export function isFootnoteContent(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Starts with manuscript sigla: single uppercase letter followed by content
  // Pattern: "E M something" or "C^ something"
  if (/^[A-Z]['^]?\s+[A-Z]['^]?\s/.test(trimmed) && trimmed.length < 120) return true;

  // Contains "Cf." bibliographic reference pattern
  if (/\bCf\.\s/.test(trimmed)) return true;

  // Contains "loc. cit." or "op. cit."
  if (/loc\.\s*cit|op\.\s*cit/i.test(trimmed)) return true;

  // Contains "Arch. Soc." (Archivio della Societa)
  if (/Arch\.\s+Soc\./i.test(trimmed)) return true;

  // Contains reference patterns: "p. NNN", "pp. NNN"
  if (/\bp+\.\s+\d/.test(trimmed)) return true;

  // Contains "ed." (edition reference)
  if (/\bed\.\s+[A-Z]/.test(trimmed)) return true;

  // Contains "mss." or "ms." (manuscript reference)
  if (/\bmss?\.\s/.test(trimmed)) return true;

  // Contains typical apparatus content: manuscript sigla patterns
  if (/\b[CEMORSVP]['^]*\s+[CEMORSVP]['^]*\s/.test(trimmed) && trimmed.length < 100) return true;

  // Lines that start with "«" or "K " (quoting sources in footnotes)
  // The « quotes in footnotes cite original Latin/Italian from other chronicles
  if (/^[«"K]\s/.test(trimmed)) return true;
  if (/^«/.test(trimmed)) return true;
  // Lines containing «-quoted text anywhere (source citations in footnotes)
  // But only if the line is short enough to be footnote (not diary with direct speech)
  if (/«[^»]*»?\s*$/.test(trimmed) && trimmed.length < 100 &&
      !/^(Dell'anno|Nell'anno|A\s+d[iì]|Die\s|et\s+li\s|lo\s+papa|li\s+Romani)/i.test(trimmed)) return true;
  // Lines with multiple «-quoted fragments (clearly footnote two-column)
  if ((trimmed.match(/«/g) || []).length >= 2) return true;

  // Lines with folio references in footnotes: "ce." or "fo." or "fol."
  if (/\b(ce|fo|fol)\.\s+\d/i.test(trimmed)) return true;

  // MURATORI, ECKHART, etc. — author names in caps or small caps
  if (/\b(MURATORI|ECKHART|CONTELORI|THEINER|PASTOR|CREIGHTON|GREGOROVIUS|REUMONT|VILLANI|TUCCIA|MASTRO|PAPIEN|THAST|NARD)\b/.test(trimmed)) return true;
  // Also mixed case versions — author references in footnotes
  if (/\b(Muratori|Eckhart|Contelori|Theiner|Pastor|Creighton|Gregorovius|Villani|Tuccia|Pipini|Petrarcha|Bernard\s+Gui|Platina|Dante|Petrarch|Ptolemaei)\s*[,;.]/i.test(trimmed)) return true;
  // "G. Villani" or "M. Villani" patterns
  if (/\b[A-Z]\.\s+Villani\b/.test(trimmed)) return true;
  // "loc. cit." anywhere in line
  if (/\bloc\.\s*cit/i.test(trimmed)) return true;

  // Lines containing column/volume/page references typical of footnotes
  if (/\bcol\.\s+\d/.test(trimmed)) return true;
  if (/\bvol\.\s+[IVX\d]/.test(trimmed)) return true;

  // Lines with "Croniche" or "Hist." or "Chron." (historical work references)
  if (/\b(Croniche|Hist\.|Chron\.|Annali|Cronicon)\b/.test(trimmed)) return true;

  // Lines with multiple manuscript sigla mixed with variant readings
  // Pattern: several single uppercase letters (V, O, C, M, R, S, P, N, etc.)
  // used as manuscript abbreviations, separated by spaces
  const siglaMatches = trimmed.match(/\b[CEMORSVPNULA]['^i\d]?\s/g) || [];
  if (siglaMatches.length >= 3 && trimmed.length < 150 &&
      !/^(Dell'anno|Nell'anno|A\s+d[iì]|Die\s|et\s+(li|lo)|lo\s+papa|li\s+Romani|Dopo|Poi)/i.test(trimmed)) return true;
  // With 2+ sigla and apparatus-specific vocabulary (variant readings)
  if (siglaMatches.length >= 2 && trimmed.length < 150 &&
      /\b(prohibitum|ventum|manca|saria|così|cosi|corregge)\b/i.test(trimmed) &&
      !/^(Dell'anno|Nell'anno|A\s+d[iì]|Die\s)/i.test(trimmed)) return true;

  // Lines with "manca" (=missing in manuscript) combined with sigla
  if (/\bmanca\b/.test(trimmed) && /\b[CEMORSVP]['^]?\s/.test(trimmed)) return true;

  // Lines with "corregge" or "legga" or "reca" (manuscript correction terms)
  if (/\b(corregge|legga|reca|annota)\b/.test(trimmed) && /\b[CEMORSVP]['^]?\b/.test(trimmed)) return true;

  // Lines that are clearly editorial/scholarly commentary (not diary narrative)
  // "È evidente", "È noto", "interpretò", "vuole dire", "Erroneamente"
  if (/^È\s+(evidente|noto|chiaro)\b/.test(trimmed)) return true;
  if (/\b(interpretò|vuole dire|Erroneamente)\b/.test(trimmed) &&
      !/^(Dell'anno|Nell'anno|A\s+d[iì]|lo\s+papa|li\s+Romani)/i.test(trimmed)) return true;
  // "l'I." = "l'Infessura" — editorial abbreviation for the author
  if (/\bl'I\.\s*[;,]/.test(trimmed) && trimmed.length < 120) return true;

  // Lines with "nota marginale" or "in margine" — marginal manuscript notes
  if (/\b(nota\s+marginale|in\s+margine|frammento\s+de)\b/i.test(trimmed)) return true;

  // Lines with abbreviated pope names: "Clem. V", "Bened» 12", "Greg. XI"
  // These appear in marginal manuscript notes listing papal succession
  if (/\b(Clem|Bened|Greg|Inno|Urban)\b[.»"]*\s+[VIX\d]/.test(trimmed) &&
      /\b(li\s+papi|la\s+corte|in\s+Avignone|in\s+Pranza|Gregorio|tabernacolo|ritrovate)\b/.test(trimmed)) return true;
  // Broader: multiple abbreviated names with periods/numbers in same line
  const abbrCount = (trimmed.match(/\b(Clem\w*|Bened\w*|Greg\w*|Inno\w*|Urban\w*)[.»""'^]*\s+[VIX\d]/g) || []).length;
  if (abbrCount >= 2) return true;
  // Single pope name + "stette la corte" or "in Avignone/Pranza" (marginal note context)
  if (/\b(Gregorio|Clemente|Urbano|Benedetto|Innocenzo)\s+[VIX]+\b/.test(trimmed) &&
      /\b(stette\s+la\s+corte|in\s+Avignone|in\s+Pranza|tabernacolo|ritrovate)\b/.test(trimmed)) return true;

  // Lines with "si cita" or "si legge" — editorial commentary
  if (/\b(si\s+cita|si\s+legge|come\s+si\s+vede)\b/i.test(trimmed) &&
      !/^(Dell'anno|Nell'anno|lo\s+papa|li\s+Romani|et\s+fu)/i.test(trimmed) &&
      /\b(testo|profezia|nota|margine|passo)\b/.test(trimmed)) return true;

  // Lines that mix manuscript variant readings without starting with (a)/(b)
  // Pattern: Italian/Latin word + "Mal" or "Così" + manuscript reference
  if (/\bMal\s+[a-z]/i.test(trimmed) && /\b(collegio|provincia|Prancia|Bordeos)\b/.test(trimmed)) return true;

  // Lines with "profezia/profezie" — always editorial commentary
  if (/\bprofezi[ae]\b/i.test(trimmed) && trimmed.length < 120) return true;

  // Lines starting with "K " (OCR garbled «) in footnote context
  if (/^K\s/.test(trimmed) && trimmed.length < 100) return true;

  // Lines with anno/year references in scholarly context (not diary dates)
  // e.g., "egli v'entrò a' 16 d'ottobre 1567 e"
  if (/\bd'ottobre\s+\d{4}\b/.test(trimmed) && !/^(Dell'anno|Nell'anno|A\s+d[iì])/i.test(trimmed) &&
      /\b(dacché|sicché|ov'e|v'entrò|riparti)\b/.test(trimmed)) return true;

  // Lines mentioning specific document types in footnotes
  if (/\b(Diario|Diar\.|Bull\.|Reg\.|Cod\.|Arch\.\s+Vat)\b/.test(trimmed) &&
      !/^(Dell'anno|Nell'anno|A\s+d[iì])/.test(trimmed)) return true;

  // Two-column footnote lines: text + large gap + text (OCR two-column merge)
  // In the RAW text (before normalization), these have 3+ spaces between columns
  if (/\S\s{3,}\S/.test(line) && trimmed.length < 100 &&
      !/^(Dell'anno|Nell'anno|et\s|A\s+d[iì]|Die\s)/i.test(trimmed)) return true;

  // Lines containing "cap." (chapter reference) with Roman/Arabic numbers
  if (/\bcap\.\s+[IVX\d]/.test(trimmed) && trimmed.length < 100) return true;

  // Lines with interpolazione/annotazione/postilla (editorial vocabulary)
  if (/\b(interpolazione|annotazione|postilla|variante|lezione|codice|codici)\b/i.test(trimmed) &&
      !/^(Dell'anno|Nell'anno|A\s+d[iì])/i.test(trimmed)) return true;

  return false;
}

/**
 * Determine if a line is CLEARLY diary text (not a footnote).
 * Uses strong positive indicators. Must be strict — only return true
 * for lines that are DEFINITELY diary narrative.
 */
export function isClearDiaryText(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Negative check: if line has footnote characteristics, it's NOT diary text
  if (isFootnoteContent(line)) return false;
  if (/\b(Cf\.|loc\.\s*cit|Arch\.\s+Soc|Arch\.\s+Vat)\b/.test(trimmed)) return false;
  if (/\bcap\.\s+[IVX\d]/.test(trimmed)) return false;

  // Year entry headers — strongest signal
  if (/^(Dell'anno|Nell'anno|Anno\s+Domini)/i.test(trimmed)) return true;

  // Latin date entries starting with "Die"
  if (/^Die\s+[\.\dIVXLC]/i.test(trimmed) && trimmed.length > 20) return true;

  // Italian date entries
  if (/^A\s+d[iì]\s+\d/i.test(trimmed) && trimmed.length > 15) return true;

  // Section headers with Roman numeral
  if (/^[IVX]+\.\s+[A-Z]/.test(trimmed) && !/Cf\./.test(trimmed)) return true;

  // Lines with typical diary narrative content (long, narrative Italian/Latin)
  // Must be long enough (>60 chars) and contain diary-typical vocabulary
  if (trimmed.length > 60) {
    // Contains diary-specific vocabulary
    if (/\b(papa|pontefice|cardinali|Romani|Roma|conclave|chiesa)\b/i.test(trimmed) &&
        !/\b(Cf\.|cod\.|mss?\.|ed\.)\b/.test(trimmed)) return true;
    // Contains Latin diary vocabulary
    if (/\b(fuit|sunt|erat|fecit|venit|mortuus|dictus|dominus)\b/.test(trimmed) &&
        !/\b(Cf\.|cod\.|mss?\.|ed\.)\b/.test(trimmed)) return true;
  }

  // Starts with "ET" or "et" + narrative (common diary continuation)
  if (/^(ET|et)\s+/.test(trimmed) && trimmed.length > 40 &&
      !/\b(Cf\.|cod\.|mss?\.|ed\.)\b/.test(trimmed)) return true;

  // Starts with common diary text beginnings (Italian narrative)
  if (/^(Dopo|Poi|Coaciosia|Cominciò|Questo|Quell'|Item|Novissime|Huic)\s/i.test(trimmed) &&
      trimmed.length > 30) return true;

  return false;
}

/**
 * Main cleaning function for diary text lines.
 * Uses a state-machine approach: tracks whether we're in text or footnote territory.
 *
 * The structure on each page is:
 * 1. Diary text (can span multiple paragraphs)
 * 2. Apparatus criticus lines starting with (a), (b)...
 * 3. Scholarly footnotes starting with (1), (2)... (sometimes in 2 columns)
 * 4. Page header (next page)
 * 5. Back to diary text
 *
 * Once we see an apparatus or scholarly footnote line, everything until the
 * next clear diary text or page header is considered footnote material.
 */
export function cleanDiarySection(rawLines: string[]): { lines: string[]; stats: CleaningStats } {
  const stats: CleaningStats = {
    totalLinesRead: rawLines.length,
    headerLinesRemoved: 0,
    footnoteLinesRemoved: 0,
    folioRefsRemoved: 0,
    lineNumbersRemoved: 0,
    markersRemoved: 0,
    hyphensRejoined: 0,
    spacesNormalized: 0,
    blankLinesCollapsed: 0,
    outputLines: 0,
  };

  // Pass 1: Tag each line as HEADER, FOOTNOTE, FOLIO, LINENUM, or TEXT
  type LineTag = 'header' | 'footnote' | 'folio' | 'linenum' | 'text' | 'blank';
  const tags: LineTag[] = new Array(rawLines.length).fill('text');

  // First pass: mark obvious categories
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      tags[i] = 'blank';
    } else if (isPageHeader(line)) {
      tags[i] = 'header';
    } else if (isFolioReference(line)) {
      tags[i] = 'folio';
    } else if (isEditorialLineNumber(line)) {
      tags[i] = 'linenum';
    } else if (isApparatusCriticusLine(line)) {
      tags[i] = 'footnote';
    } else if (isScholarlyFootnoteLine(line)) {
      tags[i] = 'footnote';
    }
  }

  // Second pass: propagate footnote status forward
  // Once we enter footnote territory (apparatus or scholarly note),
  // STAY in footnote until we hit:
  // - A page header (resets state), OR
  // - A VERY strong diary text indicator (year entry, Die entry, etc.)
  //
  // The key insight: footnotes can quote diary text and chronicles,
  // so they contain the same vocabulary. Only genuine structural
  // markers (year entries, date entries) should break out of footnote mode.
  let inFootnote = false;
  let justPassedHeader = false;

  for (let i = 0; i < rawLines.length; i++) {
    if (tags[i] === 'footnote') {
      inFootnote = true;
      justPassedHeader = false;
      continue;
    }

    if (inFootnote) {
      if (tags[i] === 'header') {
        // Page headers reset the footnote state
        inFootnote = false;
        justPassedHeader = true;
        continue;
      }

      if (tags[i] === 'blank') {
        tags[i] = 'footnote';
        continue;
      }

      if (tags[i] === 'text') {
        const trimmed = rawLines[i].trim();

        // STRONG diary text indicators that break out of footnote mode:
        // Year entry headers
        if (/^(Dell'anno|Nell'anno)\s/i.test(trimmed)) {
          inFootnote = false;
          justPassedHeader = false;
          continue;
        }
        // Latin date entries (must be substantial, not just quoted)
        if (/^Die\s+[\.\dIVXLC]/.test(trimmed) && trimmed.length > 30 &&
            !/^«/.test(trimmed) && !/Cf\./.test(trimmed)) {
          inFootnote = false;
          justPassedHeader = false;
          continue;
        }
        // Italian date "A di" entries
        if (/^A\s+d[iì]\s+\d/.test(trimmed) && trimmed.length > 20) {
          inFootnote = false;
          justPassedHeader = false;
          continue;
        }
        // Section headers (I., II., III.)
        if (/^[IVX]+\.\s+[A-Z]/.test(trimmed) && !/Cf\./.test(trimmed)) {
          inFootnote = false;
          justPassedHeader = false;
          continue;
        }
        // Long narrative text (>80 chars) without ANY footnote vocabulary
        // that follows a page header — this is diary text continuing mid-sentence
        // Must be very strict: check for «-quotes, Cf., bibliographic refs, etc.
        if (trimmed.length > 80 && !isFootnoteContent(rawLines[i]) &&
            !/\b(Cf\.|loc\.\s*cit|op\.\s*cit|Arch\.\s+Soc|cod\.|mss?\.|ed\.)\b/.test(trimmed) &&
            !/«/.test(trimmed) &&
            !/\b(Bernard|Villani|Muratori|Platina|Dante|Petrarch|Ptolemaei)\b/i.test(trimmed) &&
            !/\b(Croniche|Annali|Hist\.|Chron\.)\b/.test(trimmed)) {
          inFootnote = false;
          justPassedHeader = false;
          continue;
        }

        // Everything else while inFootnote is footnote
        tags[i] = 'footnote';
      }
    } else {
      if (tags[i] === 'header') {
        justPassedHeader = true;
      } else if (tags[i] !== 'blank') {
        justPassedHeader = false;
      }
    }
  }

  // Third pass: also catch "orphaned" footnote content blocks
  // These are lines with footnote characteristics even when not preceded by (a)/(1)
  // This handles cases where apparatus lines were on the previous page
  for (let i = 0; i < rawLines.length; i++) {
    if (tags[i] === 'text' && isFootnoteContent(rawLines[i])) {
      // Check context: if preceded by footnote/header/blank within 3 lines, mark as footnote
      let prevContent = -1;
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        if (tags[j] !== 'blank') {
          prevContent = j;
          break;
        }
      }
      if (prevContent >= 0 && (tags[prevContent] === 'footnote' || tags[prevContent] === 'header')) {
        tags[i] = 'footnote';
      }
    }
  }

  // Fourth pass: forward-propagate footnote status through consecutive footnote-content lines
  // Once we identify a line as footnote content (via third pass), check if subsequent
  // lines are also footnote content — if so, mark them too. This catches blocks of
  // footnotes that appear mid-page without a preceding (a)/(1) marker.
  let inFnBlock = false;
  for (let i = 0; i < rawLines.length; i++) {
    if (tags[i] === 'footnote') {
      inFnBlock = true;
      continue;
    }
    if (inFnBlock) {
      if (tags[i] === 'header') {
        inFnBlock = false;
        continue;
      }
      if (tags[i] === 'blank') {
        // Don't propagate across blank lines unless next non-blank is also footnote content
        continue;
      }
      if (tags[i] === 'text') {
        const trimmed = rawLines[i].trim();
        // Break out on strong diary text indicators
        if (/^(Dell'anno|Nell'anno)\s/i.test(trimmed)) { inFnBlock = false; continue; }
        if (/^Die\s+[\.\dIVXLC]/.test(trimmed) && trimmed.length > 30) { inFnBlock = false; continue; }
        if (/^A\s+d[iì]\s+\d/.test(trimmed) && trimmed.length > 20) { inFnBlock = false; continue; }
        if (/^[IVX]+\.\s+[A-Z]/.test(trimmed)) { inFnBlock = false; continue; }

        // If the line looks like footnote content, mark it
        if (isFootnoteContent(rawLines[i])) {
          tags[i] = 'footnote';
          continue;
        }

        // If line is short (<60) and follows footnote block, might be continuation
        if (trimmed.length < 60 && !isClearDiaryText(rawLines[i])) {
          // Check if next few lines are also footnote content
          let nextIsFn = false;
          for (let j = i + 1; j < Math.min(rawLines.length, i + 3); j++) {
            if (tags[j] !== 'blank' && rawLines[j].trim()) {
              nextIsFn = isFootnoteContent(rawLines[j]);
              break;
            }
          }
          if (nextIsFn) {
            tags[i] = 'footnote';
            continue;
          }
        }

        // Otherwise, break out of footnote block
        inFnBlock = false;
      }
    }
  }

  // Collect stats
  for (let i = 0; i < rawLines.length; i++) {
    switch (tags[i]) {
      case 'header': stats.headerLinesRemoved++; break;
      case 'footnote': stats.footnoteLinesRemoved++; break;
      case 'folio': stats.folioRefsRemoved++; break;
      case 'linenum': stats.lineNumbersRemoved++; break;
    }
  }

  // Extract text lines (only those tagged 'text' + meaningful blanks between text)
  let pass1: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    if (tags[i] === 'text') {
      pass1.push(rawLines[i]);
    } else if (tags[i] === 'blank') {
      // Keep blank lines that are between text lines (paragraph breaks)
      // but not blanks that were between footnote lines
      let prevIsText = false;
      let nextIsText = false;
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        if (tags[j] === 'text') { prevIsText = true; break; }
        if (tags[j] === 'footnote' || tags[j] === 'header') break;
      }
      for (let j = i + 1; j < Math.min(rawLines.length, i + 3); j++) {
        if (tags[j] === 'text') { nextIsText = true; break; }
        if (tags[j] === 'footnote' || tags[j] === 'header') break;
      }
      if (prevIsText && nextIsText) {
        pass1.push('');
      }
    }
  }

  // Pass 2: Rejoin hyphenated lines
  const beforeHyphen = pass1.length;
  let pass2 = rejoinHyphenatedLines(pass1);
  stats.hyphensRejoined = beforeHyphen - pass2.length;

  // Pass 3: Remove inline markers and leading line numbers
  let pass3: string[] = [];
  for (let line of pass2) {
    // Remove leading editorial line numbers
    const beforeLineNum = line;
    line = removeLeadingLineNumber(line);
    if (line !== beforeLineNum) stats.lineNumbersRemoved++;

    // Remove inline markers
    const beforeMarkers = line;
    line = removeInlineMarkers(line);
    if (line !== beforeMarkers) stats.markersRemoved++;

    pass3.push(line);
  }

  // Pass 4: Normalize spacing
  let pass4: string[] = [];
  for (const line of pass3) {
    const normalized = normalizeSpacing(line);
    if (normalized !== line.trim()) stats.spacesNormalized++;
    pass4.push(normalized);
  }

  // Pass 5: Collapse blank lines
  const beforeCollapse = pass4.length;
  let pass5 = collapseBlankLines(pass4);
  stats.blankLinesCollapsed = beforeCollapse - pass5.length;

  // Remove leading/trailing blank lines
  while (pass5.length > 0 && pass5[0] === '') pass5.shift();
  while (pass5.length > 0 && pass5[pass5.length - 1] === '') pass5.pop();

  stats.outputLines = pass5.length;
  return { lines: pass5, stats };
}

/**
 * Clean the preface section. Similar to diary cleaning but with
 * preface-specific header patterns.
 */
export function cleanPrefaceSection(rawLines: string[]): { lines: string[]; stats: CleaningStats } {
  // The preface uses the same basic cleaning but has different header patterns
  // "PREFAZIONE.  IX", "O.  TOMMASINI", and Roman numeral page numbers
  return cleanDiarySection(rawLines);
}
