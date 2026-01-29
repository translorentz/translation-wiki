/**
 * Regex patterns for filtering apparatus and contamination from Zonaras Epitome Vol. 3
 *
 * The Bonn CSHB edition (1897) uses a complex apparatus criticus format:
 * - Manuscript sigla: A (Parisinus 1715), B (Vindobon. 16), C (Monac. 324),
 *   D (Monac. 93), E (Monac. 325), P (Parisini Ducangii), W (Wolfii codex)
 * - Editor abbreviations: wp (Wolf-Paris), Di (Dindorf), Wo (Wolf), Duc (Ducange)
 * - Combined sigla: AR, CE, Rwp, Dwp, Owp, BwpDi, etc.
 */

// ===== MANUSCRIPT SIGLA PATTERNS =====

// Single manuscript sigla at word boundaries
export const SINGLE_SIGLA = /\b[ABCDEPW]\b/;

// Combined sigla patterns used in apparatus
export const COMBINED_SIGLA_PATTERNS = [
  /\bAR\b/,
  /\bCE\b/,
  /\bBE\b/,
  /\bBC\b/,
  /\bBD\b/,
  /\bDE\b/,
  /\bBCE\b/,
  /\bBCD\b/,
  /\bBDE\b/,
  /\bCDE\b/,
  /\bBCDE\b/,
  /\bABCDE\b/,
  /\bPW\b/,
  /\bRw?p?\b/,
  /\bDwp?\b/,
  /\bOwp\b/,
  /\bwp\b/,
  /\bDi\b/,
  /\bWo\b/,
  /\bDuc\b/,
  /\bRwpDi\b/,
  /\bBwpDi\b/,
  /\bEwpDi\b/,
  /\bOwpDi\b/,
  /\bwpDi\b/,
  /\bB[s*]\b/,  // B with annotations
  /\bD[w*]\b/,  // D with annotations
];

// Sigla followed by comma, period, or space (variant reading pattern)
export const SIGLA_WITH_PUNCTUATION = /[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDEPW][,.\s]/;

// ===== EDITORIAL TERM PATTERNS =====

// Latin editorial terms used in apparatus
export const LATIN_APPARATUS_TERMS = /\b(om\.?|add\.?|post|pro|cum|sic|cod\.|codex|corr\.?|falso|del\.?|suppl\.?|extr\.?|tatum|punctis|invitis|notat|spatium|erasum|adhibere|exeunte|sequentis|enuntiato|praetereundum|enim|nam|nisi|sed|quod|ita|alter|mss\.?|manu|recens|ead\.?\s*m\.?|antecedentia)\b/i;

// Cross-reference patterns
export const CROSS_REFERENCE_PATTERNS = [
  /v\.\s+ad\s+[XIVLC]+\s+\d+/i,        // v. ad XIII 1,5
  /\b[IVX]+\s+p\.\s+\d+/,               // II p. 622, 15
  /\bl\.\s*c\.\s+p\.\s+\d+/i,           // l. c. p. 201
  /\bvs\.\s*\d+/i,                       // vs. 6
  /cf\.\s+[A-Z]/i,                       // cf. Theoph.
  /Byz\.\s+Zeitschr/i,                   // Byz. Zeitschr.
  /\]\s*[IVXLC]+\s+p\./,                 // ]II p.
  /\bedit\.\s+\w+/i,                     // edit. Dindorf.
  /\bWo\s+lat\.?/i,                      // Wo lat.:
  /\bDittenberg[zs]erum/i,               // Dittenbergzerum
  /\bHermes\s+a\.\s+\d+/i,               // Hermes a. 1872
  /\bBoiss[\.:]?/i,                      // Boiss. (Boissevain)
  /\bTheoph\.\s+p\./i,                   // Theoph. p. 14
  /\bCedr\.\s+[IVX]/i,                   // Cedr. I p.
];

// ===== APPARATUS LINE PATTERNS =====

// Lines starting with number followed by Greek/text + sigla
export const APPARATUS_START = /^\d+\s+[\u0370-\u03FF\u1F00-\u1FFFFa-zA-Z]/;

// Lines with multiple apparatus entries (pattern: num + text + sigla + num + text)
export const MULTIPLE_APPARATUS = /\d+\s+[\u0370-\u03FF\u1F00-\u1FFFFa-zA-Z]+.*\b[ABCDEPW]\b.*\d+\s+[\u0370-\u03FF\u1F00-\u1FFFFa-zA-Z]+/;

// Lines ending with sigla or edition reference
export const APPARATUS_ENDING = [
  /\b[ABCDEPW]+\.?\s*$/,                 // ends with A, B, etc.
  /\bwp\s*$/i,                           // ends with wp
  /\bDi\s*$/i,                           // ends with Di
  /\bRwp\s*$/i,                          // ends with Rwp
  /\bOwp\s*$/i,                          // ends with Owp
];

// Apparatus bracket patterns (variant citations)
export const APPARATUS_BRACKETS = /\([^)]*\b[ABCDEPW]\b[^)]*\)/;

// ===== MARGIN/PAGE REFERENCE PATTERNS =====

// Page/section markers embedded in text
export const PAGE_MARKERS = [
  /\bP\s*[IVX]+\s*[A-Z]?\d*\b/,          // P I11, P IIS A
  /\bW\s*[IVX]+\s*\d*\b/,                // W III 4
  /\bD\s*[IVX]+\s*\d*\b/,                // D III
  /\bΡΙΓΦΑ\b/,                           // Greek page marker artifacts
  /\bMILI\b/,                             // OCR artifact
  /\bΘΗΤῸ\b/,                            // OCR artifact
];

// Line numbers at margins (appearing mid-text)
export const MARGIN_LINE_NUMBERS = [
  /^\s*\d{1,2}\s+(?=[A-Z\u0370-\u03FF])/,  // start of line
  /\s+\d{1,2}\s+(?=[A-Z\u0370-\u03FF])/,   // mid-text
  /\s+\d{1,2}\s*$/,                         // end of line
];

// ===== LATIN TEXT PATTERNS =====

// Section headers (all caps Latin)
export const LATIN_SECTION_HEADER = /^[A-Z]{4,}(\s+[A-Z]+)+\.?\s*$/;

// Latin-heavy line detection (for translation paragraphs)
export const LATIN_HEAVY_LINE = /^[A-Za-z][A-Za-z\s,;:.'"()-]+$/;

// Common Latin words that indicate translation text
export const LATIN_TRANSLATION_INDICATORS = /\b(igitur|enim|autem|vero|atque|quoque|tamen|itaque|ergo|ipse|quidem|quod|cum|dum|nam|nec|neque|sed|vel|aut|ut|si|qui|quae|quod|hic|haec|hoc|ille|illa|illud|est|sunt|fuit|esse|habuit|dixit|fecit|erat)\b/i;

// ===== PAGE HEADER PATTERNS =====

export const PAGE_HEADERS = [
  /^ANNALIUM\s+[XIVLC]+\s*\d*/i,
  /^IOANNIS\s+ZONARAE/i,
  /^Zonarae\s+Epitome/i,
  /^ZONAR\.\s+EPIT\./i,
  /^\d+\s*\.?\s*IOANNIS\s+ZONARAE/i,
  /^[XIVLC]+\s+Praefatio/i,
  /^Praefatio\.\s+[XIVLC]+$/i,
  /^[CONSTANTINVS|CONSTANTIVS|IVLIANVS|THEODOSIVS]/,
];

// ===== FRONT/BACK MATTER PATTERNS =====

export const FRONT_MATTER_MARKERS = [
  /^PRAEFATIO/i,
  /^CORPUS\s+SCRIPTORUM/i,
  /^EDITIO\s+EMENDATIOR/i,
  /^ACADEMIAE\s+LITTERARUM/i,
  /^BONNAE$/i,
  /^IMPENSIS/i,
  /^MDCCC/i,
  /^TOMUS\s+III/i,
  /^EX\s+RECENSIONE/i,
  /^EDIDIT$/i,
  /^Seribebam\s+Dresdae/i,
  /^FRIDERICO\s+HULTSCHIO/i,
];

export const BACK_MATTER_MARKERS = [
  /^INDEX\s+(ANNOTATIONUM|HISTORICVS|AVCTORVM)/i,
  /^FINIS$/i,
];

// German text (preface)
export const GERMAN_TEXT = /\b(und|der|die|das|ist|nicht|auch|mit|aus|bei|für|zur|vom|zum|des|dem|den|ein|eine|einer|werden|haben|diese|dieser|dieses|welche|welcher|welches)\b/i;

// ===== BOOK/CHAPTER MARKERS =====

export const BOOK_MARKERS = [
  { pattern: /^LIBER\s+TERTI[UV]S\s+DECIM[UV]S\.?$/i, book: 13 },
  { pattern: /^LIBER\s+Q[UV]ART[UV]S\s+DECIM[UV]S\.?$/i, book: 14 },
  { pattern: /^LIBER\s+Q[UV]INT[UV]S\s+DECIM[UV]S\.?$/i, book: 15 },
  { pattern: /^LIBER\s+SEXT[UV]S\s+DECIM[UV]S\.?$/i, book: 16 },
  { pattern: /^LIBER\s+DECIM[UV]S\s+SEPTIM[UV]S\.?$/i, book: 17 },
  { pattern: /^LIBER\s+D[UV]ODEVICESIM[UV]S\.?$/i, book: 18 },
];

// ===== COLOPHON/SCRIBE PATTERNS =====

export const COLOPHON_PATTERNS = /ἐτελειώϑη|ἐγράφει|χειρὸς|ἁμαρτωλοῦ|μοναχοῦ|ἁμαρτιῶν|ἁγία\s+τριὰς|nomen\s+evanuit/i;

// ===== FONTES PATTERNS =====

export const FONTES_START = /^F[OοΟ][NνΝ][TτΤ][EεΕ][SσΣ]/i;

// ===== HELPER FUNCTIONS =====

/**
 * Count Greek characters in a string
 */
export function countGreekChars(text: string): number {
  const matches = text.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g);
  return matches ? matches.length : 0;
}

/**
 * Count Latin characters in a string
 */
export function countLatinChars(text: string): number {
  const matches = text.match(/[A-Za-z]/g);
  return matches ? matches.length : 0;
}

/**
 * Calculate Greek character ratio
 */
export function greekRatio(text: string): number {
  const greekCount = countGreekChars(text);
  const latinCount = countLatinChars(text);
  const total = greekCount + latinCount;
  return total > 0 ? greekCount / total : 0;
}

/**
 * Check if line has any combined sigla
 */
export function hasCombinedSigla(line: string): boolean {
  return COMBINED_SIGLA_PATTERNS.some(pattern => pattern.test(line));
}

/**
 * Check if line matches any cross-reference pattern
 */
export function hasCrossReference(line: string): boolean {
  return CROSS_REFERENCE_PATTERNS.some(pattern => pattern.test(line));
}

/**
 * Check if line matches any page marker pattern
 */
export function hasPageMarker(line: string): boolean {
  return PAGE_MARKERS.some(pattern => pattern.test(line));
}

/**
 * Check if line is a page header
 */
export function isPageHeader(line: string): boolean {
  return PAGE_HEADERS.some(pattern => pattern.test(line.trim()));
}

/**
 * Check if line is front matter
 */
export function isFrontMatter(line: string): boolean {
  const trimmed = line.trim();
  return FRONT_MATTER_MARKERS.some(pattern => pattern.test(trimmed)) ||
         GERMAN_TEXT.test(trimmed);
}

/**
 * Check if line is back matter
 */
export function isBackMatter(line: string): boolean {
  return BACK_MATTER_MARKERS.some(pattern => pattern.test(line.trim()));
}

/**
 * Get book number if line is a book marker
 */
export function getBookNumber(line: string): number | null {
  const trimmed = line.trim().toUpperCase();
  for (const { pattern, book } of BOOK_MARKERS) {
    if (pattern.test(trimmed)) {
      return book;
    }
  }
  return null;
}
