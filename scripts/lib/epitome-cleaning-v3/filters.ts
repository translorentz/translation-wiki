/**
 * Line filtering functions for Zonaras Epitome Vol. 3 cleaning
 *
 * Determines whether a line should be:
 * - Included (Greek text)
 * - Excluded (apparatus, Latin translation, headers, etc.)
 */

import {
  SINGLE_SIGLA,
  LATIN_APPARATUS_TERMS,
  APPARATUS_START,
  MULTIPLE_APPARATUS,
  APPARATUS_ENDING,
  APPARATUS_BRACKETS,
  LATIN_SECTION_HEADER,
  LATIN_TRANSLATION_INDICATORS,
  COLOPHON_PATTERNS,
  FONTES_START,
  countGreekChars,
  countLatinChars,
  greekRatio,
  hasCombinedSigla,
  hasCrossReference,
  hasPageMarker,
  isPageHeader,
  isFrontMatter,
  isBackMatter,
} from './patterns';

/**
 * Result of line classification
 */
export interface LineClassification {
  include: boolean;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Check if a line is primarily Greek text
 */
export function isGreekLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  const greekCount = countGreekChars(trimmed);
  const latinCount = countLatinChars(trimmed);

  // Must have substantial Greek content
  if (greekCount < 3) return false;

  // Greek ratio must be high enough
  const ratio = greekRatio(trimmed);

  // Strong Greek lines: >70% Greek and >10 Greek chars
  if (ratio > 0.7 && greekCount > 10) return true;

  // Medium Greek lines: >50% Greek and >20 Greek chars
  if (ratio > 0.5 && greekCount > 20) return true;

  // Lines with significant Greek even if mixed
  if (greekCount > 30 && ratio > 0.3) return true;

  return false;
}

/**
 * Check if a line is critical apparatus
 */
export function isCriticalApparatus(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // ====== NEW: Aggressive pattern matching for Vol. 3 apparatus ======

  // Pattern: Lines starting with single letter "l " followed by Greek + sigla
  // e.g., "l καὶ σκώμματα κατ' αὐτοῦ πεποιεῖσϑαι ὑπό τινων AE,"
  if (/^[lLtT]\s+[\u0370-\u03FF\u1F00-\u1FFF]/.test(trimmed) &&
      (/[ABCDE],/.test(trimmed) || /,\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE]/.test(trimmed))) {
    return true;
  }

  // Pattern: Variant reading blocks - Greek + SIGLA, Greek + SIGLA anywhere in line
  // Matches: "καὶ σκώμματα κατ' αὐτοῦ πεποιεῖσϑαι ὑπό τινων AE, καὶ σκώμματα"
  if (/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDERW]{1,2},\s*[\u0370-\u03FF\u1F00-\u1FFF]+/.test(trimmed)) {
    return true;
  }

  // Pattern: Lines containing "(sic)" anywhere
  if (/\(sic\)/i.test(trimmed)) {
    return true;
  }

  // Pattern: Lines containing "ead. man." or "ead. m." (eadem manu)
  if (/ead\.\s*m(an)?\.?/i.test(trimmed)) {
    return true;
  }

  // Pattern: Lines containing Latin editorial phrases
  if (/\b(cuius|ubi|mutat\s+in|in\s+marg|correetum|correctum)\b/i.test(trimmed)) {
    return true;
  }

  // Pattern: Lines with Xiphil. or Euseb. references (source citations)
  if (/\b(Xiphil|Euseb|Theoph|Glyc|Leo\s+Diac)\./i.test(trimmed)) {
    return true;
  }

  // Pattern: Lines containing apparatus numerals like "5-9" or "1,15" or "XIV 11, 7"
  if (/\b[XIVLC]+\s+\d+,\s*\d+/.test(trimmed) || /\b\d+\s*-\s*\d+\b/.test(trimmed)) {
    if (SINGLE_SIGLA.test(trimmed) || hasCombinedSigla(trimmed)) {
      return true;
    }
  }

  // Pattern: Short lines with just sigla/page markers (OCR garbage)
  // "W ΤΠ", "D HI", "θΠΗΤῸ", "ΡΙΓΦΑ", "MIL"
  if (trimmed.length < 15) {
    if (/^[WPDBC]\s*[ΤΠΙIV]+/.test(trimmed) ||
        /^[θΘΡΜ][ΠΙΗΤΌ]+$/.test(trimmed) ||
        /^MI[LT]+$/i.test(trimmed) ||
        /^Ρ[ΙΊ][ΓΠ][ΦΑ]?$/.test(trimmed)) {
      return true;
    }
  }

  // Pattern: Lines with garbled characters (OCR artifacts)
  if (/[»«]\s*,\s*[ΕE]\]?\s*[-–]\s*,/.test(trimmed) ||
      /^\s*[-–»«\[\]{}()\s,.*]+\s*$/.test(trimmed)) {
    return true;
  }

  // Pattern: Lines with mixed Greek + Latin lowercase words + brackets (apparatus)
  // "φὼς Ὁ jaime] vat eus wces ἕτερον IJ 8."
  if (/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[\u1F49\u1F4B\u1F4D]?\s*[a-z]+\]?\s*[a-z]+/.test(trimmed) &&
      /\d+\.\s*\d*/.test(trimmed)) {
    return true;
  }

  // Pattern: Lines with ellipses (....) - apparatus notes
  if (/\.{4,}/.test(trimmed)) {
    return true;
  }

  // Pattern: Lines with ] followed by Latin words (apparatus citations)
  if (/\]\s*[a-z]+\s+[a-z]+\s+[a-z]+/i.test(trimmed)) {
    return true;
  }

  // ====== Original patterns below ======

  // Short lines ending with manuscript sigla are likely apparatus
  if (trimmed.length < 150) {
    for (const pattern of APPARATUS_ENDING) {
      if (pattern.test(trimmed)) {
        return true;
      }
    }
  }

  // Lines with multiple apparatus entries
  if (MULTIPLE_APPARATUS.test(trimmed)) {
    return true;
  }

  // Lines starting with number + text + having sigla/editorial terms
  if (APPARATUS_START.test(trimmed)) {
    if (hasCombinedSigla(trimmed) || LATIN_APPARATUS_TERMS.test(trimmed)) {
      return true;
    }
  }

  // Lines with manuscript sigla + editorial terms
  if (SINGLE_SIGLA.test(trimmed) && LATIN_APPARATUS_TERMS.test(trimmed)) {
    return true;
  }

  // Lines with cross-references
  if (hasCrossReference(trimmed)) {
    return true;
  }

  // Lines containing apparatus brackets
  if (APPARATUS_BRACKETS.test(trimmed)) {
    return true;
  }

  // Lines ending with just Greek word + single sigla (variant readings)
  if (/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE][,.]?\s*$/.test(trimmed) && trimmed.length < 100) {
    return true;
  }

  // Lines containing editorial instructions in Latin
  if (/\b(transponit|omittunt|constanter|consuevit|invitis|adhibere)\b/i.test(trimmed)) {
    return true;
  }

  // Colophon patterns
  if (COLOPHON_PATTERNS.test(trimmed)) {
    return true;
  }

  // Lines with combined sigla and short length
  if (hasCombinedSigla(trimmed) && trimmed.length < 200) {
    // Check if it's really apparatus (has sigla usage pattern)
    if (/[ABCDE]w?p?\s*(,|\.|\s|$)/.test(trimmed)) {
      return true;
    }
  }

  // Additional pattern: lines starting with "l " or single lowercase letter
  if (/^l\s+[\u0370-\u03FF\u1F00-\u1FFF]/.test(trimmed) && SINGLE_SIGLA.test(trimmed)) {
    return true;
  }

  // Pattern: starts with "post" or "ante" (editorial apparatus)
  if (/^(post|ante)\s+[\u0370-\u03FF\u1F00-\u1FFF]/i.test(trimmed)) {
    return true;
  }

  // Pattern: bracketed content with sigla
  if (/^\([^)]*[ABCDE][^)]*\)/.test(trimmed)) {
    return true;
  }

  // Lines that are mostly parenthetical apparatus
  if (/^\(.*\)$/.test(trimmed) && trimmed.length < 100) {
    return true;
  }

  // Short lines with sigla isolated in Greek context
  if (trimmed.length < 80 && /[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE]\s+[\u0370-\u03FF\u1F00-\u1FFF]+/.test(trimmed)) {
    return true;
  }

  // Additional patterns for Vol. 3 specific apparatus:

  // Pattern: "word DwpJDi," or similar with combined sigla
  if (/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE]?w?p?J?D?i?,/.test(trimmed)) {
    return true;
  }

  // Pattern: "(v. ad. XIV..." cross-references
  if (/\(v\.\s+ad\.?\s+[XIVLC]+/i.test(trimmed)) {
    return true;
  }

  // Pattern: "word À word" (À is an artifact/sigla variant)
  if (/[\u0370-\u03FF\u1F00-\u1FFF]+\s+À\s+[\u0370-\u03FF\u1F00-\u1FFF]+/.test(trimmed)) {
    return true;
  }

  // Pattern: "w*p" in the line
  if (/\bw\*p\b/.test(trimmed)) {
    return true;
  }

  // Pattern: lines with "om." (omitted variants)
  if (/\bom\.\s*[ABCDERW]/i.test(trimmed)) {
    return true;
  }

  // Pattern: lines starting with a Greek word followed by sigla variant pattern
  // e.g., "ἐρρύϑμισεν DwpJDi, μετερύϑμισεν"
  if (/^[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDERW]?w?p?D?i?,\s*[\u0370-\u03FF\u1F00-\u1FFF]+/.test(trimmed) && trimmed.length < 150) {
    return true;
  }

  // Pattern: lines with "] II p." or similar (page references with bracket)
  if (/\]\s*[IVX]+\s*p\./.test(trimmed)) {
    return true;
  }

  // Pattern: lines ending with "-" followed by sigla
  if (/-\s*[ABCDE]\s*$/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Check if a line is Latin translation text
 */
export function isLatinTranslation(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  const greekCount = countGreekChars(trimmed);
  const latinCount = countLatinChars(trimmed);

  // Must be Latin-dominant
  if (greekCount > 0 && latinCount > 0) {
    const ratio = greekRatio(trimmed);
    // If Greek ratio is low, likely Latin
    if (ratio < 0.2 && latinCount > 20) {
      // Check for Latin translation indicators
      if (LATIN_TRANSLATION_INDICATORS.test(trimmed)) {
        return true;
      }
    }
  }

  // Pure Latin lines
  if (greekCount === 0 && latinCount > 15) {
    // Not a section header (those are handled separately)
    if (!LATIN_SECTION_HEADER.test(trimmed)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if line is a FONTES citation
 */
export function isFontes(line: string): boolean {
  return FONTES_START.test(line.trim());
}

/**
 * Check if line is a Latin section header
 */
export function isSectionHeader(line: string): boolean {
  return LATIN_SECTION_HEADER.test(line.trim());
}

/**
 * Classify a line for inclusion/exclusion
 */
export function classifyLine(line: string): LineClassification {
  const trimmed = line.trim();

  // Empty lines
  if (!trimmed) {
    return { include: false, reason: 'empty', confidence: 'high' };
  }

  // Page numbers only
  if (/^\d+$/.test(trimmed)) {
    return { include: false, reason: 'page_number', confidence: 'high' };
  }

  // Front/back matter
  if (isFrontMatter(trimmed)) {
    return { include: false, reason: 'front_matter', confidence: 'high' };
  }
  if (isBackMatter(trimmed)) {
    return { include: false, reason: 'back_matter', confidence: 'high' };
  }

  // Page headers
  if (isPageHeader(trimmed)) {
    return { include: false, reason: 'page_header', confidence: 'high' };
  }

  // FONTES
  if (isFontes(trimmed)) {
    return { include: false, reason: 'fontes', confidence: 'high' };
  }

  // Section headers
  if (isSectionHeader(trimmed)) {
    return { include: false, reason: 'section_header', confidence: 'high' };
  }

  // Critical apparatus (before Greek check)
  if (isCriticalApparatus(trimmed)) {
    return { include: false, reason: 'apparatus', confidence: 'high' };
  }

  // Latin translation
  if (isLatinTranslation(trimmed)) {
    return { include: false, reason: 'latin_translation', confidence: 'high' };
  }

  // NEW: Reject very short lines that might be OCR garbage or page markers
  // These often slip through as "mixed_greek_dominant"
  if (trimmed.length < 20) {
    const greekCount = countGreekChars(trimmed);
    // Short lines need to be predominantly Greek with real words
    if (greekCount < 10 || !/[\u0370-\u03FF\u1F00-\u1FFF]{3,}/.test(trimmed)) {
      return { include: false, reason: 'garbage_short', confidence: 'high' };
    }
  }

  // Greek text - include
  if (isGreekLine(trimmed)) {
    return { include: true, reason: 'greek_text', confidence: 'high' };
  }

  // Mixed content with some Greek - needs review
  const greekCount = countGreekChars(trimmed);
  if (greekCount > 0) {
    // Some Greek but not enough to be clearly Greek text
    const ratio = greekRatio(trimmed);

    // NEW: Be more strict about low-confidence inclusion
    // Require minimum Greek content and minimum ratio for mixed lines
    if (ratio > 0.5 && greekCount > 15) {
      return { include: true, reason: 'mixed_greek_dominant', confidence: 'low' };
    } else if (ratio > 0.3 && greekCount > 25) {
      // Allow lower ratio only if there's substantial Greek
      return { include: true, reason: 'mixed_greek_dominant', confidence: 'low' };
    } else {
      return { include: false, reason: 'mixed_latin_dominant', confidence: 'medium' };
    }
  }

  // Default: exclude non-Greek content
  return { include: false, reason: 'no_greek', confidence: 'high' };
}

/**
 * Filter an array of lines, returning only Greek content
 */
export function filterLines(lines: string[]): { included: string[]; stats: FilterStats } {
  const stats: FilterStats = {
    total: lines.length,
    included: 0,
    excluded: {
      empty: 0,
      page_number: 0,
      front_matter: 0,
      back_matter: 0,
      page_header: 0,
      fontes: 0,
      section_header: 0,
      apparatus: 0,
      latin_translation: 0,
      mixed_latin_dominant: 0,
      no_greek: 0,
      other: 0,
    },
    lowConfidence: 0,
  };

  const included: string[] = [];

  for (const line of lines) {
    const classification = classifyLine(line);

    if (classification.include) {
      included.push(line);
      stats.included++;
      if (classification.confidence === 'low') {
        stats.lowConfidence++;
      }
    } else {
      const reason = classification.reason as keyof typeof stats.excluded;
      if (reason in stats.excluded) {
        stats.excluded[reason]++;
      } else {
        stats.excluded.other++;
      }
    }
  }

  return { included, stats };
}

export interface FilterStats {
  total: number;
  included: number;
  excluded: {
    empty: number;
    page_number: number;
    front_matter: number;
    back_matter: number;
    page_header: number;
    fontes: number;
    section_header: number;
    apparatus: number;
    latin_translation: number;
    mixed_latin_dominant: number;
    no_greek: number;
    other: number;
  };
  lowConfidence: number;
}
