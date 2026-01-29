/**
 * Regex patterns for identifying contamination in Epitome of Histories text
 */

// FONTES citation patterns (source references in critical apparatus)
export const FONTES_PATTERNS = [
  // Standard FONTES/ΕΌΝΤΕΒ pattern
  /^[ΕἘ]?[ΌO]?[ΝN]?[ΤT][ΕE][ΣΒS]\s*\.\s*Cap\./i,
  /^FONTES\s*\.\s*Cap\./i,
  // OCR variants
  /^ΕΌΝΤΕΒ/,
  /^ἘΕΌΝΤΕΒ/,
];

// Manuscript reference patterns (critical apparatus)
export const MANUSCRIPT_PATTERNS = [
  // Manuscript name patterns
  /\bcodex\s+\w+/i,
  /\bcodices\s+\w*/i,
  /\bcod\.\s*\w+/i,
  /\balter\s+cod(?:ex|ices)?\b/i,
  // Specific manuscript names
  /\bWolfii?\b/,
  /\bWolfius\b/,
  /\bWolfian[uo]s?\b/,
  /\bColbert(?:eus|eo)?\b/,
  /\bRegii?\b/i,
  /\bParisiens(?:is|i)?\b/i,
  /\bVindobonens(?:is|i)?\b/i,
  /\bMonacens(?:is|i)?\b/i,
  // Editor names
  /\bDucangi[io]?s?\b/i,
  /\bDVCANGE?\b/i,
  /\bDucawse\b/i,
  /\bDucaNeiuUs\b/i,
  /\bcangii\b/i,
  /\bPinder(?:i|us)?\b/i,
  // Syncellus (cited source author, often OCR'd strangely)
  /\bS\s*yncellus\b/i,
];

// Latin apparatus notation patterns
export const LATIN_APPARATUS_PATTERNS = [
  // Variant readings notation
  /\bom\s+[ABPW]\b/,  // "om A" = omitted in manuscript A
  /\badd\s+[ABPW]\b/, // "add A" = added in manuscript A
  /\bpost\s+\w+\s+[ABP]W?\s+add\b/i,
  // Comparison phrases
  /\bcum\s+(?:altero\s+)?cod(?:ice|ex)?\b/i,
  /\bcum\s+Iosepho\b/i,
  /\bcum\s+libris\s+mss\b/i,
  /\bet\s+alter\s+cod\b/i,
  // Latin description phrases
  /\bita\s+(?:Reg\.|cod\.)\b/i,
  /\bsic\s+Iosephus\b/i,
  /\bunde\s+\w+\s+dicitur\b/i,
  /\bet\s+tanquam\b/i,
  /\bpaucis\s+mutatis\b/i,
  /\beadem\s+fere\b/i,
  /\brectius\s+\w+:\s*sic\b/i,
  /\bspatio\s+inter\b/i,
  /\bab\s+eadem\s+manu\b/i,
  /\blitteris\s+\w+\s+ab\b/i,
  // Source references
  /\bAntiq\.\s*\d+/i,
  /\bAnt\.\s*\d+/i,
  /\bGenesis\s+\d+/i,
  /\bLXX\b/,
  // Additional patterns
  /\bIosephi?\b/,
  /\bIosephus\b/,
  /\blosephi?\b/,  // OCR variant of Iosephi
  /\blosephus\b/,  // OCR variant
  /\bex\s+uno\s+[ABC]\b/i,  // "ex uno C" = from one ms C
];

// Line number patterns (numbers at start or embedded in text)
export const LINE_NUMBER_PATTERNS = [
  // Numbers followed by Greek text (line numbers in margin)
  /^(\d{1,3})\s*(?=[Α-Ωα-ωἀ-ῶ])/,
  // Numbers embedded mid-text (page/line references in apparatus)
  /\s+(\d{1,3})\s+(?=[α-ωἀ-ῶ])/g,
];

// OCR artifact patterns
export const OCR_ARTIFACT_PATTERNS = [
  // Common OCR errors
  /\bslg\b/g,  // Should be different word
  /\b[A-Z]\.\s*[A-Z]\./g,  // Isolated initials like "B. G."
];

// Latin text detection (for measuring Latin leakage)
// Note: This only matches pure Latin words, not OCR errors that look Latin
export const LATIN_WORD_PATTERN = /\b[A-Za-z]{3,}\b/g;

// Greek text detection
export const GREEK_WORD_PATTERN = /[Α-Ωα-ωἀ-ῶϑ]+/g;

// Common OCR substitution patterns (Greek chars misread as Latin)
// These are NOT Latin contamination, just OCR errors in otherwise valid Greek
export const OCR_SUBSTITUTION_WORDS = new Set([
  // x → κ (very common)
  'xai', 'xal', 'xar', 'xat', 'xuT', 'xoyra', 'xait', 'xol',
  // y → υ
  'yàp', 'ydo',
  // Single letter OCR errors
  'uiv', 'ulv', 'viv', 'ouv', 'ovv', 'olv', 'oiv',
  // Mixed OCR errors - names and common words
  'nap', 'dfe', 'rov', 'Tra', 'Affe', 'Jie', 'Mya', 'dva',
  'Thovrut', 'Xovgaio', 'Meogaluv', 'Alpvoc', 'Vore', 'Exiqa',
  'glove', 'qui', 'App', 'Avool', 'piv', 'olx', 'XuAd', 'dye',
  'epe', 'pad', 'Tob', 'dela', 'dile', 'aoro', 'Balla', 'Pay',
  'Hoa', 'Atul', 'vav', 'tig', 'voua', 'slg',
  // Additional OCR errors
  'Megom', 'pact', 'neat', 'Zclafild', 'oxt', 'Ofx', 'oux',
  'olg', 'olà', 'oic', 'oiy', 'ola', 'ole', 'olo', 'oly',
  // More OCR errors from chapters 2-6
  'Alyuntloug', 'ucrgg', 'pobvrag', 'Howov', 'Zfaf',
  'xtyvipa', 'xul', 'evgedtn', 'rotto', 'avrayay', 'vra', 'zaga',
  'Mer', 'Agxafl', 'vov', 'avo', 'ovy', 'ovà', 'ova', 'ove', 'ovo',
  'xar', 'xav', 'xay', 'xao', 'xae', 'xou', 'xov', 'xoy', 'xoa',
  'xoe', 'xoo', 'xuo', 'xua', 'xue', 'xue', 'xtà', 'xte', 'xto',
  // More mixed OCR
  'dlà', 'dia', 'dio', 'dte', 'dté', 'dta', 'dto',
  'xepl', 'xept', 'xero', 'xera', 'xere', 'xeri',
  'oaì', 'ool', 'oor', 'oot', 'oou', 'oov', 'ooy', 'oox',
  // Apparatus sigla that appear in cleaned text (not true Latin)
  'Rwp', 'Dwp', 'Owp', 'Ewp', 'BwpDi',
]);

// Combined detection for apparatus paragraphs
export const APPARATUS_INDICATORS = [
  // Square brackets with manuscript sigla
  /\]\s*[ABPW]\b/,
  /\[\s*[ABPW]\b/,
  // Line references with variants
  /\d{1,2}\s+\w+\]\s*\w+\s+[ABP]W?/,
  // "ita" + source references
  /\"ita\s+/i,
  // Manuscript siglum patterns at start of paragraph
  /^[ABCDPW]\s*\.?\s+[a-z]/,
  // Short Greek followed by isolated "A" or similar
  /ὠνομά[ξζ]οντο\s+[ΑA]\s*\.?\s*$/,
  // Fragment indicators
  /^—\s*—/,  // "— —" at start
  // Manuscript collation notation
  /\b[ABCDPW]\s+cum\b/i,
  /\bet\s+[ABCDPW]\b/,
  // Parenthetical variants like "(τῆς γῆς B)"
  /\([^)]*\s+[ABCDPW]\)/,
  // Word ending with Greek + "A." or similar siglum
  /[α-ωἀ-ῶ]+\s+[ΑA]\s*\./,
  // Latin phrases in variants
  /\bex\s+uno\b/i,
];

// Page/column markers (P, W, B, C, D followed by numbers or at paragraph boundaries)
export const PAGE_MARKER_PATTERNS = [
  // Single letter page markers embedded in text
  /\s[PWBCD]\s+[0-9EI]+\s/,  // e.g., "P 130", "W 18", "P E 15"
  /\s[PWBCD]\s+[0-9]+$/,     // at end of paragraph
  /^[PWBCD]\s+[0-9]+\s/,     // at start of paragraph
  // Folio references
  /\s[PWBCD]\s+Y\s/,
  // Column markers
  /\|\s+τῇ/,  // vertical bar before Greek
];
