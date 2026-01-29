/**
 * Regex patterns for detecting contamination in Epitome of Histories text
 *
 * The Bonn CSHB edition contains:
 * - Greek text (desired)
 * - Latin translation (discard)
 * - Critical apparatus (discard)
 * - FONTES citations (discard)
 * - Page headers/numbers (discard)
 * - Margin references (discard)
 */

// ============================================================
// HEADERS AND PAGE MARKERS
// ============================================================

// Page headers like "IOANNIS ZONARAE", "IOANNIS .ZONARAE"
export const PAGE_HEADER_IOANNIS = /^[\d\s]*IOANNIS\s*\.?\s*ZONARAE\s*$/i;

// Section headers like "ANNALIUM VII 1.", "ANNALIUM VII 4."
export const SECTION_HEADER_ANNALIUM = /^ANNALIUM\s+[IVXLCDM]+\s+\d+\.?\s*$/i;

// Zonarae Annales reference
export const ZONARAE_ANNALES = /Zonarae?\s+Annales?\s+[IVX]+\.?\s*\d*/i;

// Title lines like "CHRONIKON", "A PON 1 K O N"
export const TITLE_LINES = /^[A-Z\s]+[ΧΡΟΝΙΚΟΝ|CHRONIKON|X P ON I K O N]/;

// Page numbers at start of line
export const PAGE_NUMBER_LINE = /^\d+\s*$/;

// ============================================================
// FONTES (SOURCE CITATIONS)
// ============================================================

// FONTES or FowTES (OCR variant) citations
export const FONTES_LINE = /^F[Oo][NnWw][Tt][Ee][Ss]\.?\s*Cap\./i;

// Extended FONTES block pattern - often multi-line
export const FONTES_CONTENT = /F[Oo][NnWw][Tt][Ee][Ss]\.\s*Cap\.\s*\d+\.\s*.+/;

// ============================================================
// CRITICAL APPARATUS
// ============================================================

// Lines starting with numbers followed by Greek/apparatus content
// e.g., "1 λαουνίαν B, qui mox λαούνιον"
export const APPARATUS_LINE_NUMBER = /^\d+\s+[^\d]/;

// Manuscript sigla patterns - concentrated sigla references
// AB, BC, PW, ABC, etc.
export const MANUSCRIPT_SIGLA = /\b[ABCPW]{2,}\b/;

// Editor names commonly found in apparatus
export const EDITOR_NAMES = /\b(Ducang[ie][iu]s|Plutarch[ou]s|Reimar[iu]s|Phatarchus|Tzetzes?|Dion[iy]s[iu]s|Halicarnass[eo]ns[ie]s?|Livius?)\b/i;

// Apparatus phrases
export const APPARATUS_PHRASES = [
  /\bom\s+[A-Z]\b/,           // "om A" = omitted in manuscript A
  /\badd\s+[A-Z]\b/,          // "add AB" = added in manuscripts AB
  /\bsic\s+libri\b/i,         // "sic libri" = thus in the books
  /\bcum\s+P\b/,              // "cum P" = with Parisian edition
  /\bvulgo\b/i,               // "vulgo" = commonly
  /\bhaec\s+non\s+leguntur\b/i,  // "haec non leguntur" = these are not read
  /\bqui\s+mox\b/i,           // "qui mox" = who soon
  /\bet\s+sic\s+ubique\b/i,   // "et sic ubique" = and so everywhere
  /\bcodices?\b/i,            // "codices" = manuscripts
  /\bRecens\s+adscriptum\b/i, // "Recens adscriptum" = recently written
  /\bRecens\s+supple/i,       // "recens suppletis" = recently supplied
  /\bmargini\b/i,             // "margini" = in the margin
  /\blitteris\s+erasis\b/i,   // "litteris erasis" = with letters erased
];

// Line with apparatus characteristics: starts with number, contains sigla, short
export const APPARATUS_LINE = /^\d+\s+\S.*\s[ABCPW]\b/;

// ============================================================
// MARGIN REFERENCES
// ============================================================

// Single capital letter margin refs at line start: "A ", "B ", "C ", "D "
export const MARGIN_LETTER_START = /^[ABCDP]\s+/;

// Page reference patterns: "P I 314", "P I 316", "W II 6"
export const PAGE_REFERENCE = /^[PW]\s+[IVX]+\s+\d+/;

// Margin ref in middle of text
export const MARGIN_REF_INLINE = /\s[ABCD]\s(?=[Α-ω])/;

// ============================================================
// LATIN TEXT DETECTION
// ============================================================

// Common Latin words (not found in Greek)
export const LATIN_WORDS = [
  /\b(et|cum|in|ad|per|de|ex|sub|inter|ante|post|contra|prope|sine|ob|pro)\b/gi,
  /\b(qui|quae|quod|quis|quid|ubi|unde|quo|quem|quam)\b/gi,
  /\b(est|sunt|fuit|erat|erant|esse|fuisse|esset)\b/gi,
  /\b(non|nec|neque|ne|ut|si|sed|autem|enim|vero|tamen|igitur|ergo)\b/gi,
  /\b(hic|haec|hoc|ille|illa|illud|ipse|ipsa|ipsum)\b/gi,
  /\b(eius|eorum|earum|cuius|quorum|quarum)\b/gi,
];

// Latin sentence starters
export const LATIN_SENTENCE_STARTERS = [
  /^Aeneas\s/i,
  /^Romul[uo]s\s/i,
  /^Latini\s/i,
  /^Sabini\s/i,
  /^Rutuli\s/i,
  /^Deinde\s/i,
  /^Cum\s+autem\s/i,
  /^Atque\s/i,
  /^Anno\s/i,
  /^Arce\s/i,
  /^Ob\s+id\s/i,
  /^Aliquo\s/i,
  /^Numitori\s/i,
  /^Urbe\s/i,
  /^Hic\s+igitur\s/i,
];

// Latin-only characters/patterns not in Greek
export const LATIN_ONLY_CHARS = /[jJwWvV]/;  // These don't appear in Greek

// ============================================================
// GREEK TEXT DETECTION
// ============================================================

// Greek character ranges
export const GREEK_CHARS = /[\u0370-\u03FF\u1F00-\u1FFF]/;

// Extended Greek (including accented characters)
export const GREEK_TEXT_BLOCK = /[\u0370-\u03FF\u1F00-\u1FFF]{3,}/;

// Greek section numbers like "1.", "2.", "3." followed by Greek
export const GREEK_SECTION_START = /^\d+\.\s*[Α-ω]/;

// ============================================================
// LINE NUMBER ARTIFACTS
// ============================================================

// Line numbers embedded in text (5, 10, 15, 20, 25, 30 at line edges)
export const EMBEDDED_LINE_NUMBER = /\s+(5|10|15|20|25|30)\s*$/;
export const LINE_NUMBER_MID_WORD = /(\S+)\s+(5|10|15|20|25|30)\s+(\S+)/;

// ============================================================
// HYPHENATION AND BREAKS
// ============================================================

// Word broken across lines with hyphen
export const HYPHENATED_WORD = /(\S+)--?\s*$/;
export const CONTINUED_WORD = /^\s*([α-ωά-ώ]+)/i;

// ============================================================
// COMPOSITE PATTERNS
// ============================================================

/**
 * Check if a line is primarily critical apparatus
 */
export function isApparatusLine(text: string): boolean {
  // Starts with line number and short
  if (APPARATUS_LINE_NUMBER.test(text) && text.length < 150) {
    // Contains sigla or editor references
    if (MANUSCRIPT_SIGLA.test(text) || EDITOR_NAMES.test(text)) {
      return true;
    }
    // Contains apparatus phrases
    for (const phrase of APPARATUS_PHRASES) {
      if (phrase.test(text)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if a line is primarily Latin
 */
export function isLatinLine(text: string): boolean {
  // First check for Greek - if substantial Greek present, not a Latin line
  const greekMatches = text.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) || [];
  const latinMatches = text.match(/[a-zA-Z]/g) || [];

  if (greekMatches.length > latinMatches.length) {
    return false;
  }

  // Check for Latin-only characters
  if (LATIN_ONLY_CHARS.test(text)) {
    return true;
  }

  // Check for Latin sentence starters
  for (const starter of LATIN_SENTENCE_STARTERS) {
    if (starter.test(text)) {
      return true;
    }
  }

  // Count Latin function words
  let latinWordCount = 0;
  for (const pattern of LATIN_WORDS) {
    const matches = text.match(pattern);
    if (matches) {
      latinWordCount += matches.length;
    }
  }

  // If many Latin words and few Greek characters, it's Latin
  const totalWords = text.split(/\s+/).length;
  if (latinWordCount > 5 && latinWordCount / totalWords > 0.3) {
    return true;
  }

  return false;
}

/**
 * Check if text is a header/marker line
 */
export function isHeaderLine(text: string): boolean {
  const trimmed = text.trim();
  return (
    PAGE_HEADER_IOANNIS.test(trimmed) ||
    SECTION_HEADER_ANNALIUM.test(trimmed) ||
    ZONARAE_ANNALES.test(trimmed) ||
    PAGE_NUMBER_LINE.test(trimmed) ||
    PAGE_REFERENCE.test(trimmed)
  );
}

/**
 * Check if line is FONTES citation
 */
export function isFontesLine(text: string): boolean {
  return FONTES_LINE.test(text.trim()) || FONTES_CONTENT.test(text);
}
