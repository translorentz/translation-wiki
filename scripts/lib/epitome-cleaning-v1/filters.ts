/**
 * Filter functions for detecting and removing contamination
 */

import {
  FONTES_PATTERNS,
  MANUSCRIPT_PATTERNS,
  LATIN_APPARATUS_PATTERNS,
  APPARATUS_INDICATORS,
  PAGE_MARKER_PATTERNS,
  LATIN_WORD_PATTERN,
  GREEK_WORD_PATTERN,
  OCR_SUBSTITUTION_WORDS,
} from './patterns.js';

/**
 * Check if a paragraph is a FONTES citation
 */
export function isFontesCitation(text: string): boolean {
  const trimmed = text.trim();
  return FONTES_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Check if a paragraph contains manuscript references
 */
export function hasManuscriptReferences(text: string): boolean {
  return MANUSCRIPT_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check if a paragraph contains Latin apparatus notation
 */
export function hasLatinApparatusNotation(text: string): boolean {
  return LATIN_APPARATUS_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check if a paragraph has apparatus indicators
 */
export function hasApparatusIndicators(text: string): boolean {
  return APPARATUS_INDICATORS.some(pattern => pattern.test(text));
}

/**
 * Check if a paragraph has page markers
 */
export function hasPageMarkers(text: string): boolean {
  return PAGE_MARKER_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check if a paragraph is very short and looks like apparatus
 * Short paragraphs with mixed Greek/Latin are often apparatus fragments
 */
export function isShortApparatusFragment(text: string): boolean {
  const trimmed = text.trim();

  // Check patterns regardless of length for very clear apparatus
  // Single letter siglum at end (Greek or Latin A)
  if (/\s+[ΑAΒBΠPW]\s*\.?\s*$/.test(trimmed)) return true;

  // Multiple Greek words followed by siglum like "πεδιάδας Α."
  if (/[α-ωἀ-ῶ]+\s+[ΑA]\s*\.\s*[α-ωἀ-ῶ]+/.test(trimmed)) return true;

  // Pattern like "word Α. word ... Α." (apparatus variant notation)
  if (/[α-ωἀ-ῶ]+\s+[ΑA]\s*\.[^.]*[ΑA]\s*\./.test(trimmed)) return true;

  // Starts with em-dash or double dash
  if (/^[—–-]{1,2}\s/.test(trimmed)) return true;

  // Contains "om" or "add" patterns
  if (/\b(om|add)\s+[ABPW]/i.test(trimmed)) return true;

  // Contains parenthetical variant like "(τῆς γῆς B)"
  if (/\([^)]*\s+[ABCDPW]\)/.test(trimmed)) return true;

  // Starts with "Wolfius" or other manuscript names
  if (/^(Wolfius|Colbert|Ducang|Syncellus)/i.test(trimmed)) return true;

  // Contains "ex uno" pattern (manuscript collation)
  if (/\bex\s+uno\s+[A-Z]\b/i.test(trimmed)) return true;

  // For short text (<120 chars), check Latin ratio
  if (trimmed.length <= 120) {
    const latinWords = trimmed.match(LATIN_WORD_PATTERN) || [];
    const greekWords = trimmed.match(GREEK_WORD_PATTERN) || [];
    const totalWords = latinWords.length + greekWords.length;
    if (totalWords > 0 && totalWords < 15) {
      const latinRatio = latinWords.length / totalWords;
      if (latinRatio > 0.25) return true;
    }
  }

  // Very short fragments (<60 chars) with any Latin are suspicious
  if (trimmed.length < 60) {
    const latinWords = trimmed.match(LATIN_WORD_PATTERN) || [];
    if (latinWords.length > 0) return true;
  }

  // Short paragraph with multiple Greek sigla Α. (manuscript reference format)
  if (trimmed.length < 80) {
    const siglaMatches = trimmed.match(/\s+[ΑA]\s*\./g) || [];
    if (siglaMatches.length >= 2) return true;
  }

  // Starts with isolated Latin letter(s) and punctuation (OCR/apparatus artifact)
  if (/^["']?[a-zA-Z]\s*[-–—]/.test(trimmed)) return true;

  // Starts with quotation mark followed by Latin letter and space
  if (/^["'][a-zA-Z]\s/.test(trimmed)) return true;

  return false;
}

/**
 * Calculate the ratio of Latin words to total words
 * Excludes common OCR substitution errors that look like Latin
 */
export function getLatinRatio(text: string): number {
  const allLatinWords = text.match(LATIN_WORD_PATTERN) || [];
  // Filter out known OCR substitution words
  const latinWords = allLatinWords.filter(w => !OCR_SUBSTITUTION_WORDS.has(w));
  const greekWords = text.match(GREEK_WORD_PATTERN) || [];
  const totalWords = latinWords.length + greekWords.length;

  if (totalWords === 0) return 0;
  return latinWords.length / totalWords;
}

/**
 * Check if a paragraph is primarily apparatus content
 * Returns true if likely to be apparatus, false otherwise
 */
export function isApparatusParagraph(text: string): boolean {
  // Empty or very short paragraphs
  if (text.trim().length < 10) return true;

  // Check for FONTES citations
  if (isFontesCitation(text)) return true;

  // Check for short apparatus fragments
  if (isShortApparatusFragment(text)) return true;

  // Check for manuscript references - be more aggressive
  if (hasManuscriptReferences(text)) {
    const latinRatio = getLatinRatio(text);
    // If has manuscript refs and >15% Latin, likely apparatus
    if (latinRatio > 0.15) return true;
    // If starts with apparatus-like content
    if (/^\s*[A-Za-z]+\s+(codex|cod\.|om|add)\b/i.test(text)) return true;
    // If starts with manuscript name like "Wolfius"
    if (/^\s*(Wolfius|Colbert|Ducang)/i.test(text)) return true;
    // If has manuscript refs and short text, likely apparatus
    if (text.trim().length < 200) return true;
  }

  // Check for Latin apparatus notation
  if (hasLatinApparatusNotation(text)) {
    const latinRatio = getLatinRatio(text);
    // If has apparatus notation and >15% Latin, likely apparatus
    if (latinRatio > 0.15) return true;
    // Short text with apparatus notation
    if (text.trim().length < 200) return true;
  }

  // Check for apparatus indicators
  if (hasApparatusIndicators(text)) {
    // Check if the paragraph is mostly apparatus content
    const latinRatio = getLatinRatio(text);
    if (latinRatio > 0.2) return true;
    // Short paragraph with apparatus indicators
    if (text.trim().length < 150) return true;
  }

  // High Latin ratio alone (>35%) suggests pure Latin apparatus text
  const latinRatio = getLatinRatio(text);
  if (latinRatio > 0.35) return true;

  // Medium Latin ratio (>12%) in shorter paragraphs
  if (latinRatio > 0.12 && text.trim().length < 200) return true;

  // Check for Greek sigla patterns (Α. at word boundaries)
  // These are manuscript references using Greek capital letters
  if (/[α-ωἀ-ῶ]+\s+[ΑΒΓ]\s*\.\s*[α-ωἀ-ῶ]+\s+[α-ωἀ-ῶ]+\s+[ΑΒΓ]\s*\./.test(text)) return true;

  // Very short paragraph that looks like apparatus (multiple Greek siglum Α.)
  if (text.trim().length < 100 && /[ΑA]\s*\.\s*/.test(text) && (text.match(/[ΑA]\s*\./g) || []).length >= 2) return true;

  // Starts with Latin word(s) (apparatus note)
  if (/^[A-Za-z]{3,}[,.]?\s/.test(text.trim())) return true;

  // Ends with Latin words (apparatus note at end)
  if (/[A-Za-z]{3,}[.,]?\s*$/.test(text.trim())) return true;

  // Contains edition reference patterns like "[ed. Bonn. p. 141]" or "Duc."
  if (/\[.*ed\.\s+\w+.*\]/.test(text)) return true;
  if (/\bDuc\.\s*$/.test(text)) return true;

  return false;
}

/**
 * Classification result for a paragraph
 */
export type ParagraphClassification =
  | 'fontes'           // FONTES citation - remove entirely
  | 'apparatus'        // Critical apparatus - remove entirely
  | 'mixed'            // Mixed content - may need cleaning
  | 'clean';           // Clean Greek text

/**
 * Classify a paragraph for cleaning purposes
 */
export function classifyParagraph(text: string): ParagraphClassification {
  if (isFontesCitation(text)) return 'fontes';

  if (isApparatusParagraph(text)) return 'apparatus';

  const latinRatio = getLatinRatio(text);
  if (latinRatio > 0.15) return 'mixed';

  return 'clean';
}

/**
 * Score a paragraph for contamination (0-100, higher = more contaminated)
 */
export function getContaminationScore(text: string): number {
  let score = 0;

  // FONTES = 100 (always remove)
  if (isFontesCitation(text)) return 100;

  // Manuscript references add 30 points
  if (hasManuscriptReferences(text)) score += 30;

  // Latin apparatus notation adds 25 points
  if (hasLatinApparatusNotation(text)) score += 25;

  // Apparatus indicators add 20 points
  if (hasApparatusIndicators(text)) score += 20;

  // Latin ratio contributes up to 40 points
  const latinRatio = getLatinRatio(text);
  score += Math.floor(latinRatio * 40);

  // Very short text (<20 chars) adds 10 points
  if (text.trim().length < 20) score += 10;

  return Math.min(100, score);
}
