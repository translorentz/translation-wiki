/**
 * Text extraction utilities for TEI-XML parsed content.
 * Cleans and normalizes Greek text, handling editorial markup remnants.
 */

/**
 * Clean Greek text content after extraction from XML.
 * Removes editorial artifacts while preserving valid polytonic Greek.
 */
export function cleanGreekText(text: string): string {
  let cleaned = text;

  // Fix hyphenated word breaks from original print layout
  // Pattern: Greek word fragment + hyphen + space(s) + continuation
  // e.g., "περι- πιπτόντων" -> "περιπιπτόντων"
  // e.g., "συλλο- γισμὸς" -> "συλλογισμὸς"
  cleaned = cleaned.replace(/(\p{Script=Greek})-\s+(\p{Script=Greek})/gu, '$1$2');

  // Strip footnote reference numbers (e.g., "1)", "2)", "3)", "5 )")
  // These are common in Flach's edition of the Hesiod Theogony commentary
  // Some have a space between digit and paren
  cleaned = cleaned.replace(/\d+\s*\)/g, '');

  // Strip orphaned closing parentheses that are not part of a matching pair.
  // After footnote digit stripping, some `)` remain without a corresponding `(`.
  // Pattern: `)` preceded by whitespace or Greek char, without a prior `(` nearby.
  // Strategy: remove any `)` that has no matching `(` in the text.
  cleaned = removeUnmatchedClosingParens(cleaned);

  // Also handle the pipe character that appears in some texts as a column/page marker
  cleaned = cleaned.replace(/\s*\|\s*/g, ' ');

  // Normalize whitespace: collapse multiple spaces/newlines into single space
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Remove editorial brackets and their contents where appropriate:
  // Square brackets [text] = editorial additions (keep the text, remove brackets)
  cleaned = cleaned.replace(/\[([^\]]*)\]/g, '$1');

  // Angle brackets <text> = editorial deletions/corrections (keep text)
  cleaned = cleaned.replace(/<([^>]*)>/g, '$1');

  // Curly braces {text} = editorial remarks (remove entirely)
  cleaned = cleaned.replace(/\{[^}]*\}/g, '');

  // Daggers/obeli for corrupt passages: remove the marks, keep surrounding text
  cleaned = cleaned.replace(/[†‡]/g, '');

  // Remove ellipsis dots that indicate lacunae (keep actual text)
  // But preserve legitimate Greek punctuation like the middle dot (ano teleia)
  cleaned = cleaned.replace(/\.{2,}/g, '...');

  // Remove stray page/line references that may have leaked through
  // Pattern: standalone numbers at start or end of text
  cleaned = cleaned.replace(/^\d+\s+/, '');
  cleaned = cleaned.replace(/\s+\d+$/, '');

  // Normalize Unicode: some texts mix combining diacritics with precomposed
  // We normalize to NFC (precomposed) for consistent storage
  cleaned = cleaned.normalize('NFC');

  // Trim
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Check if a string contains primarily Greek characters.
 * Used for quality validation.
 */
export function getGreekCharPercent(text: string): number {
  if (!text || text.length === 0) return 0;

  // Count Greek characters (ranges for Greek and Extended Greek)
  const greekRegex = /[\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F]/g;
  const greekMatches = text.match(greekRegex) || [];

  // Count all non-whitespace, non-punctuation characters
  const contentChars = text.replace(/[\s\p{P}]/gu, '');

  if (contentChars.length === 0) return 0;
  return (greekMatches.length / contentChars.length) * 100;
}

/**
 * Detect if text contains apparatus criticus remnants.
 * These are critical commentary notes that should have been stripped.
 */
export function hasApparatusRemnants(text: string): boolean {
  // Common apparatus patterns:
  // - "om." (omitted), "add." (added), "corr." (corrected)
  // - manuscript sigla like "L", "M", "N", "P" with surrounding annotations
  // - "ex ... corr." patterns
  const apparatusPatterns = [
    /\bom\.\s/,
    /\badd\.\s/,
    /\bcorr\.\s/,
    /\bscripsi\b/,
    /\blibri\b/,
    /\bfort\.\s/,
    /\bcf\.\s/,
    /\bsic\b/,
    /\bsqq?\.\b/,
  ];

  return apparatusPatterns.some(pattern => pattern.test(text));
}

/**
 * Detect if text contains footnote-style content that should be stripped.
 */
export function hasFootnoteContent(text: string): boolean {
  // Footnotes often start with a number and contain editorial commentary
  const footnotePatterns = [
    /^\d+\s+\w+\s+(om|add|corr|ex|post|ante)/,
    /\bTitulum\b/,
    /\bsuprascripta\b/,
  ];

  return footnotePatterns.some(pattern => pattern.test(text));
}

/**
 * Split a long paragraph into sensible sub-paragraphs if needed.
 * Some TEI sections contain very long text blocks that should be
 * preserved as-is (they represent the original structure).
 */
export function splitLongParagraph(text: string, maxLength: number = 5000): string[] {
  if (text.length <= maxLength) return [text];

  // Split at sentence boundaries (Greek uses period and raised dot)
  const sentences = text.split(/(?<=[.·;])\s+/);
  const result: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxLength && current.length > 0) {
      result.push(current.trim());
      current = sentence;
    } else {
      current = current ? current + ' ' + sentence : sentence;
    }
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result;
}

/**
 * Remove closing parentheses that have no matching opening parenthesis.
 * This handles orphaned `)` left behind after footnote reference stripping.
 */
function removeUnmatchedClosingParens(text: string): string {
  let depth = 0;
  let result = '';
  for (const ch of text) {
    if (ch === '(') {
      depth++;
      result += ch;
    } else if (ch === ')') {
      if (depth > 0) {
        depth--;
        result += ch;
      }
      // else: unmatched `)`, skip it
    } else {
      result += ch;
    }
  }
  return result;
}
