/**
 * Content Classifier for Eustathius Commentary on Homer's Odyssey.
 *
 * Classifies each line in a text section as one of:
 * - commentary: Greek scholarly prose (the main content to preserve)
 * - page_header: ΡΑΨΩΔΙΑ section markers, verse references, edition identifiers
 * - margin_number: Bekker-style margin line numbers (10, 20, 30, 40, 50)
 * - page_number: Edition page numbers (1379, 1380, etc.)
 * - empty: blank/whitespace
 * - noise: short garbage, OCR artifacts, stray characters
 *
 * Key differences from the Carmina Graeca classifier:
 * 1. This is PROSE, not verse -- so line length is highly variable
 * 2. The main content IS the commentary (not verse extraction)
 * 3. Margin numbers (10, 20, 30, 40, 50) are embedded within lines, not on their own
 * 4. Page numbers from the Roman edition appear at line boundaries
 * 5. ΡΑΨΩΔΙΑ headers with verse references must be stripped
 * 6. Latin preface section (chapter 0) has different character profile
 *
 * The key insight: commentary lines are long (80-200+ chars), densely packed
 * Greek text with Homeric quotations. Noise/headers are short and contain
 * distinctive patterns (ΡΑΨΩΔΙΑ, page numbers, margin markers).
 */

import type { ClassifiedLine, LineCategory, TextSection } from "./types.js";

/**
 * Pattern: ΡΑΨΩΔΙΑ section header (various OCR garbles).
 * Matches "ΡΑΨ" or "ΡΡΑΨ" prefix followed by garbled ΩΙΔΙΑ continuation.
 */
const RHAPSODIA_PATTERN = /[»Ῥ]*Ρ{0,2}ΑΨ[ΙΩΏΣΨ1-9\s.,]*[ΩΏΙΊ1ΣΤ][ΔΙ41][ΑΙ4.,\s\d]*/;

/**
 * Pattern: Verse references like "(Vers. 15.)" or "(Vers, 18.)"
 * or "(Wers. 45.)" (OCR variants)
 * These are embedded WITHIN commentary lines and should NOT cause
 * the line to be classified as noise -- they're part of the commentary.
 */
const VERSE_REF_PATTERN = /\([VWν][eo]rs[,.]?\s*\d/;

/**
 * Pattern: Bekker-style margin numbers that appear on their own line
 * These are multiples of 10 (10, 20, 30, 40, 50) standing alone
 */
const STANDALONE_MARGIN_NUMBER = /^\s*(10|20|30|40|50|60)\s*$/;

/**
 * Pattern: Edition page numbers (1379-1500+ range for this volume)
 * These appear at line start or end, sometimes with garble
 */
const PAGE_NUMBER_PATTERN = /^(\d{3,4})\s*[᾿'΄]?\s*$/;

/**
 * Pattern: Page number embedded at end of a commentary line
 * e.g., "...text text 1379" at line end
 */
const TRAILING_PAGE_NUMBER = /\s+(\d{3,4})\s*$/;

/**
 * Pattern: Page number embedded at start of a line (before commentary continues)
 * e.g., "1380' Οδύσσειαν..."
 */
const LEADING_PAGE_NUMBER = /^(\d{3,4})[᾿'΄]?\s+/;

/**
 * Pattern: Margin numbers embedded within text (standalone on short lines)
 * Multiples of 10, sometimes with leading or trailing numbers from adjacent columns
 */
const MARGIN_ONLY = /^\s*\d{1,3}\s*$/;

/**
 * Pattern: "CoMMEN" or "COMMEN" type edition running headers
 */
const EDITION_HEADER = /CoMMEN|COMMEN|Opvss|Odyss.*Tox|COMMENT/i;

/**
 * Pattern: Latin letters making up more than threshold of the line
 * Used to detect the Latin preface vs Greek commentary
 */
function latinCharPercent(text: string): number {
  let latinCount = 0;
  let totalAlpha = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      latinCount++;
      totalAlpha++;
    } else if (isGreekChar(char)) {
      totalAlpha++;
    }
  }
  if (totalAlpha === 0) return 0;
  return latinCount / totalAlpha;
}

/**
 * Check if a character is a Greek letter (upper or lower, including polytonic).
 */
function isGreekChar(char: string): boolean {
  const code = char.codePointAt(0);
  if (code === undefined) return false;

  // Basic Greek: Α-Ω (0x0391-0x03A9), α-ω (0x03B1-0x03C9), ς (0x03C2)
  if (code >= 0x0370 && code <= 0x03ff) return true;
  // Extended Greek (polytonic): 0x1F00-0x1FFF
  if (code >= 0x1f00 && code <= 0x1fff) return true;
  // Greek Extended (archaic): 0x0370-0x037F
  if (code >= 0x0370 && code <= 0x037f) return true;

  return false;
}

/**
 * Compute Greek character percentage for a string.
 */
function greekCharPercent(text: string): number {
  let greekCount = 0;
  let totalAlpha = 0;
  for (const char of text) {
    if (isGreekChar(char)) {
      greekCount++;
      totalAlpha++;
    } else {
      const code = char.charCodeAt(0);
      if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
        totalAlpha++;
      }
    }
  }
  if (totalAlpha === 0) return 0;
  return greekCount / totalAlpha;
}

/**
 * Pattern: "(Vers. N.)" and its many OCR variants.
 * Matches parenthesized verse references like:
 *   (Vers. 1.) (Vers. 6—7.) (V ers. 1.) (Vevs. 9 J (Νουα. 155.)
 *   (Vers, 19.) (Wers. 45.) ( Vers. N. ) etc.
 * Global flag to strip all occurrences.
 */
const VERS_PATTERN = /\(\s*[VWνΝ][eοo\s][rvau][sσ][,.\s]\s*\d+[^)]{0,20}\)/g;

/**
 * Pattern: OCR variant verse refs with slightly different garbling.
 * Covers forms like "(Vers, 19.)" "(Νουα. 155.)" and broken parens.
 * Also covers "(V ers. N.)" where there's a space after V.
 */
const VERS_PATTERN_ALT = /\(\s*[VW]\s*[eο]?[rv][sσ][.,]?\s*\d+[\s\d.—–\-]*[.)J}\]]/g;

/**
 * Pattern: Verse ref with space in "V ers" (very common OCR garble).
 * e.g., "(V ers. 1.)" or "(V ers."
 */
const VERS_PATTERN_SPACED = /\(\s*V\s+ers[.,]?\s*\d*[^)]{0,15}\)/g;

/**
 * Pattern: Verse ref without closing paren but with clear structure.
 * e.g., "(Vers. 1." at end without ")"
 */
const VERS_PATTERN_UNCLOSED = /\(\s*[VWνΝ][eοo\s][rvau][sσ][,.\s]\s*\d+[\s\d.—–\-]*/g;

/**
 * Pattern: Broadly catches "(Ver..." type references that are garbled.
 * Covers: (V evs. à.) (Vers. va.) (Ver rs.) (Vera.) (Vers. ) etc.
 * These all start with "(V" and are followed by garbled "ers/evs/era"
 * and an optional verse number that may be corrupted.
 */
const VERS_PATTERN_BROAD = /\(\s*V\s*[eE]?[rvea]+[sσa]?[.,']?\s*[^)]{0,20}\)/g;

/**
 * Pattern: Verse refs without numbers (just the marker text).
 * e.g., "(Vers." followed by Greek text starting a new sentence.
 * These appear when the verse number was garbled or missing.
 */
const VERS_PATTERN_NUMBERLESS = /\(\s*[VW][eE]?r[sσva]+[.,]?\s*\)/g;

/**
 * Pattern: Bare margin numbers like "4o", "5o", "3o", "8o", "80" etc.
 * The OCR reads Bekker margin numbers (40, 50, etc.) as "4o", "5o",
 * or sometimes "80", "4O" with various letter/digit confusion.
 * Only match when surrounded by spaces or at line boundaries.
 */
const BARE_MARGIN_DIGIT_O = /(?:^|\s)\d[oO0](?:\s|$)/g;

/**
 * Pattern: Apparatus garble strings — OCR'd page/column references.
 * These contain garbled mixtures of Greek capitals, digits, dots, and symbols
 * that are NOT real Greek text. Examples:
 *   "Ῥ. 4. ΨΙΩ 7.4 δ 4. VY&35—4."
 *   "ΡαΨΏΙΜΤΙΑ, 4... Με. 8.--: 1,"
 *   "Ῥά ΨΩ, ἤει 4. Vsa56."
 *   "P4 Ψ ΊΥΝΙ Δ «(τὰς εἴα, τὸ. -- ἡ."
 * Detected by high digit/symbol ratio within a span.
 */
const APPARATUS_GARBLE = /[ΡῬP][αά4]?\s*Ψ\s*[ΩΏΙΜΤΊΥΝ][ΙΏΜΣΝΔ\s]{0,5}[^.]{0,30}/g;

/**
 * Pattern: Trailing garble with digits and punctuation at end of line.
 * e.g., "᾿4"33)η-1383", "VY&35—4."
 */
const TRAILING_GARBLE = /[\s᾿'΄]*[᾿'"()\[\]{}]*\d[\d"'΄᾿()\-—–.\s&]{3,}$/;

/**
 * Pattern: Leading apparatus garble at line/paragraph start.
 * Catches patterns like "6 Ῥ. 4. ΨΙΩ δ 4. VY&" and "8 ... Με. 1,"
 * at the beginning of text.
 */
const LEADING_GARBLE = /^\s*\d+\s*[ΡῬP.]{0,3}[^α-ωά-ώἀ-ῶΑ-ΩἈ-Ὧ]*?(?=[α-ωά-ώἀ-ῶΑ-ΩἈ-Ὧ]{2})/;

/**
 * Pattern: Short garble sequences with digits, dots, symbols.
 * Matches sequences like "8 ... Με. 1," or "6 Ῥ. 4." at start of line.
 */
const SHORT_LEADING_GARBLE = /^\s*\d\s+[\.\s…]{2,}[^α-ωά-ώ]{0,15}/;

/**
 * Strip trailing page numbers and margin numbers from a commentary line.
 * Also strips verse references, bare margin numbers, and apparatus garble.
 * Returns the cleaned text.
 */
export function stripMarginAnnotations(text: string): string {
  let cleaned = text;

  // === (Vers. N.) removal — HIGHEST PRIORITY ===
  // Strip all verse reference markers from the text (specific to broad)
  cleaned = cleaned.replace(VERS_PATTERN, " ");
  cleaned = cleaned.replace(VERS_PATTERN_ALT, " ");
  cleaned = cleaned.replace(VERS_PATTERN_SPACED, " ");
  cleaned = cleaned.replace(VERS_PATTERN_BROAD, " ");
  cleaned = cleaned.replace(VERS_PATTERN_NUMBERLESS, " ");
  // Strip verse refs with no number and no closing paren: "(Vers." followed by space/Greek
  cleaned = cleaned.replace(/\(\s*[VW][eE]?r[sσva]+[.,]?\s*(?=[Α-ΩἈ-Ὧα-ωά-ώἀ-ῶ᾿])/g, "");
  // Strip unclosed verse refs (careful - only if clearly a verse ref pattern)
  cleaned = cleaned.replace(VERS_PATTERN_UNCLOSED, " ");

  // === Apparatus garble removal ===
  // Strip "ΡαΨΩΙΜΤΙΑ" type garble strings (various starting patterns)
  cleaned = cleaned.replace(APPARATUS_GARBLE, " ");
  // Also match garble starting with just Ψ (without the Ρ prefix)
  cleaned = cleaned.replace(/Ψ[ΙΩΏΜΤ][ΩΙΔΑ\s\d.,]{2,20}/g, " ");
  // Strip leading garble at start of line (digit + non-Greek junk before real content)
  cleaned = cleaned.replace(LEADING_GARBLE, "");
  cleaned = cleaned.replace(SHORT_LEADING_GARBLE, "");
  // Strip "Με. N," type short garble fragments at start
  cleaned = cleaned.replace(/^\s*[A-Z][a-z]?\.\s*\d+\s*[,;.]\s*/, "");
  // Strip "VY&..." and similar non-Greek garble with symbols
  cleaned = cleaned.replace(/\s*V[YA][&]\S*\s*/g, " ");
  // Strip trailing garble with digits
  cleaned = cleaned.replace(TRAILING_GARBLE, "");
  // Strip "VA " (garbled) before Greek text
  cleaned = cleaned.replace(/\s+VA\s+/g, " ");

  // === Bare margin numbers (the "4o", "5o" pattern) ===
  // Strip OCR'd Bekker margin numbers that appear as digit+o
  cleaned = cleaned.replace(BARE_MARGIN_DIGIT_O, " ");

  // === Standalone digits at line start/end that are page/margin artifacts ===
  // Strip trailing Bekker margin numbers at end of line (10, 20, 30, 40, 50, 60)
  cleaned = cleaned.replace(/\s+(10|20|30|40|50|60)\s*$/, "");

  // Strip trailing page number (3-4 digit number at end of line)
  cleaned = cleaned.replace(/\s+\d{3,4}\s*$/, "");

  // Strip leading page number (3-4 digit number followed by text or parenthesis)
  // Handles both "1466 text..." and "1466(Vers..." patterns
  cleaned = cleaned.replace(/^\d{3,4}[᾿'΄]?\s*(?=[\s(])/, "");

  // Strip standalone margin numbers at line start (e.g., "10 " or "50 ")
  // Only strip if the number is a Bekker multiple AND followed by Greek text
  cleaned = cleaned.replace(/^(10|20|30|40|50|60)\s+/, "");

  // Strip margin numbers embedded mid-line (these appear as "... text 20 text ...")
  // Only do this for obvious Bekker numbers that interrupt the flow
  // Be conservative: only strip if surrounded by spaces and is a Bekker multiple
  cleaned = cleaned.replace(/\s+(10|20|30|40|50|60)\s+/g, " ");

  // === Bare isolated 1-2 digit numbers embedded in text ===
  // Strip isolated single/double digit numbers surrounded by spaces
  // (these are Bekker-style margin references, NOT part of Greek text)
  // Careful: don't strip numbers that are part of real content
  cleaned = cleaned.replace(/\s+\d{1,2}\s+/g, " ");

  // Strip trailing garbled numbers (single digits mixed with spaces at end)
  // e.g., "text 0 ὡς 1 706 50" -> strip isolated trailing digit sequences
  cleaned = cleaned.replace(/(\s+\d{1,2}){2,}\s*$/, "");

  // Strip "v» Row." or "v» Rom." (edition cross-references)
  cleaned = cleaned.replace(/\s*v[»>]\s*R[oe][wm]\.?\s*/g, " ");

  // Strip "m P^*" and similar garbled margin annotations
  cleaned = cleaned.replace(/\s*m\s*P\^?\*?\s*/g, " ");

  // === Final cleanup: garble fragments with high digit ratio ===
  // Remove any remaining short spans that are mostly digits/symbols
  // Pattern: 3+ chars that are >50% digits and have no Greek letters
  cleaned = cleaned.replace(/(?:^|\s)([^α-ωά-ώἀ-ῶΑ-ΩἈ-Ὧ\s]{0,3}[\d][^\sα-ωά-ώἀ-ῶΑ-ΩἈ-Ὧ]{2,10})(?:\s|$)/g, " ");

  return cleaned.trim();
}

/**
 * Classify a single line.
 */
function classifyLine(text: string, isPreface: boolean): LineCategory {
  const trimmed = text.trim();

  // 1. Empty
  if (!trimmed) return "empty";

  // 2. Very short -- likely noise or margin number
  if (trimmed.length <= 3) {
    if (/^\d{1,2}$/.test(trimmed)) return "margin_number";
    return "noise";
  }

  // 3. Standalone margin number (multiples of 10)
  if (STANDALONE_MARGIN_NUMBER.test(trimmed)) return "margin_number";

  // 4. Standalone page number (3-4 digits only)
  if (PAGE_NUMBER_PATTERN.test(trimmed)) return "page_number";

  // 5. Bare number (any number alone on a line)
  if (MARGIN_ONLY.test(trimmed)) return "margin_number";

  // 6. ΡΑΨΩΔΙΑ section headers
  if (RHAPSODIA_PATTERN.test(trimmed)) return "page_header";

  // 7. Edition running headers (e.g., "CoMMEN.:w Opvss. Tox. I. A")
  if (EDITION_HEADER.test(trimmed)) return "page_header";

  // 8. Very short lines with mostly non-Greek content
  if (trimmed.length < 10) {
    const gPercent = greekCharPercent(trimmed);
    if (gPercent < 0.3) return "noise";
    // Short Greek fragments might be legitimate if they continue from previous line
    // but if they're very short and isolated, they're noise
    if (trimmed.length < 5) return "noise";
  }

  // 8b. Interline OCR noise (Volume 2 specific):
  // Lines consisting mostly of scattered single characters separated by punctuation/symbols.
  // Examples: ", - , τ , 1 2€ x - " , ἢ" or "b: ΄ * * - , - ι a - [i 3 ,"
  // Detection: high ratio of punctuation/space to word-forming chars, or
  // mostly single-char tokens with lots of separators.
  if (trimmed.length > 5 && trimmed.length < 60) {
    let punctCount = 0;
    let spaceCount = 0;
    let alphaCount = 0;
    for (const ch of trimmed) {
      const code = ch.charCodeAt(0);
      if (ch === " ") {
        spaceCount++;
      } else if (
        (code >= 65 && code <= 90) || (code >= 97 && code <= 122) ||
        (code >= 0x0370 && code <= 0x03ff) || (code >= 0x1f00 && code <= 0x1fff)
      ) {
        alphaCount++;
      } else if (ch >= "0" && ch <= "9") {
        // digits count as punct in this context
        punctCount++;
      } else {
        punctCount++;
      }
    }
    const totalLen = trimmed.length;
    // If the line is mostly punctuation/spaces with scattered single characters
    // (more than 60% non-alpha, and the alpha chars are mostly isolated singles)
    if (alphaCount > 0 && (punctCount + spaceCount) / totalLen > 0.6) {
      // Count consecutive letter runs (words). If average word length <= 2.0, it's noise.
      // Real commentary has word lengths of 5-10+ chars. Interline noise has scattered
      // single/double characters separated by symbols.
      const words = trimmed.split(/[^a-zA-Zα-ωά-ώἀ-ῶΑ-ΩἈ-Ὧ]+/).filter(w => w.length > 0);
      const avgWordLen = words.length > 0 ? words.reduce((s, w) => s + w.length, 0) / words.length : 0;
      if (avgWordLen <= 2.0 && words.length >= 3) {
        return "noise";
      }
    }
  }

  // 9. Lines that are almost entirely special characters or Latin
  if (trimmed.length > 5 && trimmed.length < 30) {
    const gPercent = greekCharPercent(trimmed);
    if (gPercent < 0.2) {
      // Check if it's a Latin preface line
      if (isPreface && latinCharPercent(trimmed) > 0.5) return "commentary";
      return "noise";
    }
  }

  // 10. Commentary lines (the main content)
  // These are typically long (50+ chars) with high Greek character content
  if (trimmed.length >= 30) {
    const gPercent = greekCharPercent(trimmed);
    if (gPercent > 0.5 || (isPreface && latinCharPercent(trimmed) > 0.5)) {
      return "commentary";
    }
  }

  // 11. Shorter lines with good Greek content
  if (trimmed.length >= 10 && trimmed.length < 30) {
    const gPercent = greekCharPercent(trimmed);
    if (gPercent > 0.6) return "commentary";
    if (isPreface && latinCharPercent(trimmed) > 0.5) return "commentary";
  }

  // 12. Lines with garbled content (mix of symbols, numbers, etc.)
  if (trimmed.length > 10 && greekCharPercent(trimmed) < 0.3 && latinCharPercent(trimmed) < 0.3) {
    return "noise";
  }

  // 13. Default: if it has reasonable Greek content, treat as commentary
  if (greekCharPercent(trimmed) > 0.4) return "commentary";

  // 14. Otherwise noise
  return "noise";
}

/**
 * Classify all lines in a text section.
 */
export function classifySection(section: TextSection): ClassifiedLine[] {
  const isPreface = section.chapterNumber === 0;

  return section.rawLines.map((text, idx) => ({
    lineNumber: section.startLine + idx,
    text,
    category: classifyLine(text, isPreface),
  }));
}

/**
 * Get classification statistics for a section.
 */
export function getClassificationStats(classified: ClassifiedLine[]): Record<LineCategory, number> {
  const stats: Record<LineCategory, number> = {
    commentary: 0,
    page_header: 0,
    margin_number: 0,
    page_number: 0,
    empty: 0,
    noise: 0,
  };

  for (const line of classified) {
    stats[line.category]++;
  }

  return stats;
}

export { isGreekChar, greekCharPercent, latinCharPercent };
