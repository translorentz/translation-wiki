/**
 * Content Classifier for Carmina Graeca Medii Aevi.
 *
 * Classifies each line in a text section as one of:
 * - verse: clean Greek poetry line
 * - verse_numbered: verse with leading editorial line number
 * - apparatus: critical apparatus (variant readings with manuscript sigla)
 * - introduction: scholarly prose (mixed Greek/Latin, garbled)
 * - empty: blank/whitespace
 * - noise: short garbage, stray chars
 *
 * Key insight: medieval Greek verse NEVER contains Arabic numerals. The only
 * numerals in the file are editorial line numbers (leading position only) and
 * apparatus references. Any embedded number signals apparatus text.
 *
 * The apparatus in this critical edition (Wagner's Carmina Graeca) often has
 * Latin editorial commentary OCR'd into Greek Unicode characters, making
 * latinCharPercent() useless. We detect apparatus via:
 * - Embedded numbers (not at line start)
 * - Multiple numbers on one line
 * - Bracket characters ([], {})
 * - Known abbreviations: οοα/οοά (= "cod."), ν. + number
 * - Isolated manuscript sigla (Α, Β, Μ, Ρ, Δ, Κ, Υ, Ν, Τ)
 */

import type { ClassifiedLine, LineCategory, TextSection } from "./types.js";
import { isGreekLetter } from "./title-finder.js";

/**
 * Pattern: isolated manuscript sigla (single uppercase Greek letter surrounded by
 * word boundaries, spaces, or punctuation).
 * Extended set: Α, Β, Μ, Ρ, Δ (primary), plus Κ, Υ, Ν, Τ (secondary in this edition)
 */
const SIGLA_PATTERN = /(?:^|[\s.,;:᾿'()])([ΑΒΜΡΔ])(?:[\s.,;:᾿'()]|$)/;

/**
 * Pattern: abbreviated manuscript references like "Ὅυς. Ρ. 486" or "Πυο. Ρ. 288"
 */
const ABBREVIATED_REF = /[α-ωά-ώἀ-ῶΑ-Ω]{2,}\.\s*[ΡΑΒ]\.?\s*\d+/;

/**
 * Pattern: 3+ separate numbers on one line (strong apparatus signal)
 */
const MULTIPLE_NUMBERS = /\d+\D+\d+\D+\d+/;

/**
 * Pattern: 2+ separate numbers on one line
 */
const TWO_NUMBERS = /\d+\D+\d+/;

/**
 * Pattern: line starts with 1-5 digit number followed by space(s)
 */
const LEADING_NUMBER = /^(\d{1,5})\s+(.+)$/;

/**
 * Pattern: bare number (just digits, optionally with whitespace)
 */
const BARE_NUMBER = /^\s*\d{1,5}\s*$/;

/**
 * Pattern: editorial brackets that never appear in verse text
 */
const EDITORIAL_BRACKETS = /[\[\]{}]/;

/**
 * Pattern: codex abbreviation "οοα" / "οοά" (= "cod." in Latin rendered as Greek)
 * This is extremely common in the apparatus of this edition.
 */
const CODEX_ABBREV = /οο[αά][.,\s:;]/;

/**
 * Pattern: known Latin-in-Greek-script editorial abbreviations
 * ργοθοάοβὶ = "proecdosi", Βατγβίαπ = "Bursian", ΒΙοο]α = "Stoccla"
 */
const LATIN_IN_GREEK = /ργο[θσ][οε][άα]οβ|Βατγβίαπ|ΒΙοο\]|ΒΌΡ\s|ΡΟΥ\s\d|ἰογίαββ|οομίϊ|Βαγβί|ΡῬ[͵,]\s*\d|αυοᾶ|ΒΙ66\]/;

/**
 * Pattern: line-number reference "ν." or "v." followed by digit (common in apparatus)
 */
const VERSE_REF = /(?:^|[\s(])ν\.\s*\d/;

/**
 * Check if a character is a Latin letter (a-z, A-Z).
 */
function isLatinLetter(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

/**
 * Count the percentage of Greek characters in a string.
 */
function greekCharPercent(text: string): number {
  let greekCount = 0;
  let totalAlpha = 0;
  for (const char of text) {
    if (isGreekLetter(char)) {
      greekCount++;
      totalAlpha++;
    } else if (isLatinLetter(char)) {
      totalAlpha++;
    }
  }
  if (totalAlpha === 0) return 0;
  return greekCount / totalAlpha;
}

/**
 * Count the percentage of Latin characters in a string.
 */
function latinCharPercent(text: string): number {
  let latinCount = 0;
  let totalChars = 0;
  for (const char of text) {
    if (char.trim()) {
      totalChars++;
      if (isLatinLetter(char)) latinCount++;
    }
  }
  if (totalChars === 0) return 0;
  return latinCount / totalChars;
}

/**
 * Count isolated sigla occurrences in a line.
 * Checks primary sigla (Α, Β, Μ, Ρ, Δ) and secondary sigla (Κ, Υ, Ν, Τ).
 */
function countSigla(text: string): number {
  let count = 0;
  const padded = ` ${text} `;
  for (const sigla of ["Α", "Β", "Μ", "Ρ", "Δ", "Κ", "Υ", "Ν", "Τ"]) {
    const re = new RegExp(`(?:^|[\\s.,;:᾿'()])${sigla}(?:[\\s.,;:᾿'()]|$)`, "g");
    const matches = padded.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

/**
 * Check if a line has embedded numbers (digits NOT at the very start).
 * Medieval Greek verse never contains Arabic numerals, so any embedded
 * number is a strong apparatus signal.
 */
function hasEmbeddedNumbers(text: string): boolean {
  const withoutLeading = text.replace(/^\d{1,5}\s+/, "");
  return /\d/.test(withoutLeading);
}

/**
 * Check if text after a leading number looks like apparatus.
 */
function isApparatusContent(text: string): boolean {
  // Has isolated sigla
  if (countSigla(text) >= 1) return true;
  // Has abbreviated references
  if (ABBREVIATED_REF.test(text)) return true;
  // Has 2+ numbers (variant references) — verse text after a leading number has NO digits
  if (TWO_NUMBERS.test(text)) return true;
  // Has any digit at all — pure verse text never contains Arabic numerals
  if (/\d/.test(text)) return true;
  // Editorial brackets
  if (EDITORIAL_BRACKETS.test(text)) return true;
  // Codex abbreviation
  if (CODEX_ABBREV.test(text)) return true;
  // Latin-in-Greek abbreviations
  if (LATIN_IN_GREEK.test(text)) return true;
  // Verse reference
  if (VERSE_REF.test(text)) return true;
  // Garbled characters
  const garbledChars = text.match(/[{}[\]|!@#$%^&*~`<>]/g);
  if (garbledChars && garbledChars.length > 1) return true;

  return false;
}

/**
 * Classify a single line.
 */
function classifyLine(text: string): LineCategory {
  const trimmed = text.trim();

  // 1. Empty
  if (!trimmed) return "empty";

  // 2. Very short noise
  if (trimmed.length < 5) {
    // Unless it's a bare number (handled as noise anyway)
    return "noise";
  }

  // 3. Bare number
  if (BARE_NUMBER.test(trimmed)) return "noise";

  // 3b. Lines starting with ". " + number — OCR artifact from page margins
  if (/^\.\s+\d+/.test(trimmed)) return "apparatus";

  // 4. Check for apparatus signals first (before checking verse)
  const siglaCount = countSigla(trimmed);
  if (siglaCount >= 2) return "apparatus";
  if (siglaCount >= 1 && MULTIPLE_NUMBERS.test(trimmed)) return "apparatus";
  if (ABBREVIATED_REF.test(trimmed)) return "apparatus";

  // 4b. Lines with ANY sigla + ANY embedded number (not at start) → apparatus
  if (siglaCount >= 1 && /\d+/.test(trimmed)) return "apparatus";

  // 4c. MULTIPLE_NUMBERS standalone — 3+ numbers on one line is apparatus
  // regardless of sigla (apparatus always has scattered line references)
  if (MULTIPLE_NUMBERS.test(trimmed)) return "apparatus";

  // 4d. Editorial brackets — never appear in verse text
  if (EDITORIAL_BRACKETS.test(trimmed)) return "apparatus";

  // 4e. Codex abbreviation "οοα"/"οοά" (= Latin "cod.") — extremely common in apparatus
  if (CODEX_ABBREV.test(trimmed)) return "apparatus";

  // 4f. Known Latin-in-Greek-script editorial abbreviations
  if (LATIN_IN_GREEK.test(trimmed)) return "apparatus";

  // 4g. Verse reference pattern "ν. 123"
  if (VERSE_REF.test(trimmed)) return "apparatus";

  // 4h. Embedded numbers — medieval Greek verse NEVER has Arabic numerals
  // If after removing a leading editorial number, digits remain → apparatus
  if (hasEmbeddedNumbers(trimmed)) return "apparatus";

  // 5. High Latin content → introduction
  if (latinCharPercent(trimmed) > 0.2 && trimmed.length > 15) return "introduction";

  // 6. Line starts with number — is it verse_numbered or apparatus?
  const leadingMatch = trimmed.match(LEADING_NUMBER);
  if (leadingMatch) {
    const afterNumber = leadingMatch[2];
    if (isApparatusContent(afterNumber)) return "apparatus";

    // Check if the part after the number is clean Greek verse
    const gPercent = greekCharPercent(afterNumber);
    if (gPercent > 0.75 && afterNumber.length >= 20) return "verse_numbered";
    if (gPercent > 0.6 && afterNumber.length >= 30 && siglaCount === 0) return "verse_numbered";

    // Short numbered line with some Greek — could be either
    if (afterNumber.length < 20 && siglaCount === 0 && gPercent > 0.5) return "verse_numbered";

    // Multiple numbers suggest apparatus
    if (MULTIPLE_NUMBERS.test(trimmed)) return "apparatus";

    // Default for numbered lines: if it has any sigla, it's apparatus
    if (siglaCount >= 1) return "apparatus";

    // Otherwise treat short lines as noise
    if (afterNumber.length < 15) return "noise";
    return "verse_numbered";
  }

  // 7. Check for verse (no leading number)
  const gPercent = greekCharPercent(trimmed);

  // Standard verse: 40-120 chars, >79% Greek
  if (trimmed.length >= 40 && trimmed.length <= 120 && gPercent > 0.79) {
    // Final check: no sigla contamination
    if (siglaCount === 0) return "verse";
    // One sigla in a long line might be OK (false positive from name like "Μανολής")
    if (siglaCount === 1 && trimmed.length > 60) return "verse";
    return "apparatus";
  }

  // Shorter verse lines (for text #18 which has 40-50 char lines)
  if (trimmed.length >= 25 && trimmed.length < 40 && gPercent > 0.79 && siglaCount === 0) {
    return "verse";
  }

  // Longer verse lines (some lines can be up to 120 chars)
  if (trimmed.length > 120 && gPercent > 0.79 && siglaCount === 0) {
    return "verse";
  }

  // 8. Garbled introduction (high noise, some Greek, some Latin mix)
  if (trimmed.length > 20 && gPercent < 0.6 && gPercent > 0.2) return "introduction";

  // 9. Everything else
  if (trimmed.length < 15) return "noise";
  if (gPercent > 0.6 && trimmed.length >= 20 && siglaCount === 0) return "verse";

  return "noise";
}

/**
 * Apply contextual smoothing to classified lines.
 * Fixes isolated misclassifications based on surrounding context.
 */
function smoothClassifications(classified: ClassifiedLine[]): ClassifiedLine[] {
  const result = [...classified];

  for (let i = 0; i < result.length; i++) {
    const current = result[i];
    if (!current) continue;

    // Skip empty lines in smoothing
    if (current.category === "empty") continue;

    // Rule 1: verse surrounded by apparatus → reclassify as apparatus
    if (current.category === "verse" || current.category === "verse_numbered") {
      const surroundingApparatus = countNearbyCategory(result, i, "apparatus", 3);
      const surroundingVerse = countNearbyCategory(result, i, "verse", 3) +
        countNearbyCategory(result, i, "verse_numbered", 3);

      if (surroundingApparatus >= 4 && surroundingVerse <= 1) {
        result[i] = { ...current, category: "apparatus" };
      }
    }

    // Rule 2: noise between verse → reclassify as verse (damaged)
    // Only if the line has NO apparatus signals (no digits, no brackets, no abbreviations)
    if (current.category === "noise" && current.text.trim().length >= 15) {
      const trimmedText = current.text.trim();
      const hasDigits = /\d/.test(trimmedText);
      const hasBrackets = EDITORIAL_BRACKETS.test(trimmedText);
      const hasCodex = CODEX_ABBREV.test(trimmedText);

      if (!hasDigits && !hasBrackets && !hasCodex) {
        const prevVerse = findPrevCategory(result, i, ["verse", "verse_numbered"], 3);
        const nextVerse = findNextCategory(result, i, ["verse", "verse_numbered"], 3);

        if (prevVerse && nextVerse && greekCharPercent(current.text) > 0.6) {
          result[i] = { ...current, category: "verse" };
        }
      }
    }

    // Rule 3: single non-apparatus line within apparatus block → reclassify
    if (current.category === "noise" || current.category === "introduction") {
      const surroundingApparatus = countNearbyCategory(result, i, "apparatus", 2);
      if (surroundingApparatus >= 3) {
        result[i] = { ...current, category: "apparatus" };
      }
    }
  }

  return result;
}

/**
 * Count how many lines within ±range of index have the given category.
 */
function countNearbyCategory(
  lines: ClassifiedLine[],
  index: number,
  category: LineCategory,
  range: number
): number {
  let count = 0;
  for (let i = Math.max(0, index - range); i <= Math.min(lines.length - 1, index + range); i++) {
    if (i === index) continue;
    if (lines[i]?.category === category) count++;
  }
  return count;
}

/**
 * Find the previous non-empty line with one of the given categories within range.
 */
function findPrevCategory(
  lines: ClassifiedLine[],
  index: number,
  categories: LineCategory[],
  range: number
): ClassifiedLine | null {
  for (let i = index - 1; i >= Math.max(0, index - range); i--) {
    const line = lines[i];
    if (!line || line.category === "empty") continue;
    if (categories.includes(line.category)) return line;
    return null; // hit a different category
  }
  return null;
}

/**
 * Find the next non-empty line with one of the given categories within range.
 */
function findNextCategory(
  lines: ClassifiedLine[],
  index: number,
  categories: LineCategory[],
  range: number
): ClassifiedLine | null {
  for (let i = index + 1; i <= Math.min(lines.length - 1, index + range); i++) {
    const line = lines[i];
    if (!line || line.category === "empty") continue;
    if (categories.includes(line.category)) return line;
    return null;
  }
  return null;
}

/**
 * Classify all lines in a text section.
 */
export function classifySection(section: TextSection): ClassifiedLine[] {
  const classified: ClassifiedLine[] = section.rawLines.map((text, idx) => ({
    lineNumber: section.contentStartLine + idx,
    text,
    category: classifyLine(text),
  }));

  return smoothClassifications(classified);
}

/**
 * Get classification statistics for a section.
 */
export function getClassificationStats(classified: ClassifiedLine[]): Record<LineCategory, number> {
  const stats: Record<LineCategory, number> = {
    verse: 0,
    verse_numbered: 0,
    apparatus: 0,
    introduction: 0,
    empty: 0,
    noise: 0,
  };

  for (const line of classified) {
    stats[line.category]++;
  }

  return stats;
}
