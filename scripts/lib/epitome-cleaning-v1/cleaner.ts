/**
 * Main cleaning pipeline for Epitome of Histories
 */

import {
  classifyParagraph,
  getContaminationScore,
  getLatinRatio,
  type ParagraphClassification,
} from './filters.js';
import { LINE_NUMBER_PATTERNS, PAGE_MARKER_PATTERNS } from './patterns.js';

/**
 * Paragraph with metadata
 */
export interface Paragraph {
  index: number;
  text: string;
}

/**
 * Chapter data structure
 */
export interface ChapterData {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: Paragraph[];
  };
}

/**
 * Cleaning statistics for a chapter
 */
export interface CleaningStats {
  originalCount: number;
  cleanedCount: number;
  removedCount: number;
  classifications: {
    fontes: number;
    apparatus: number;
    mixed: number;
    clean: number;
  };
}

/**
 * Clean embedded line numbers from text
 */
export function cleanLineNumbers(text: string): string {
  let cleaned = text;

  // Remove line numbers at the start of text (e.g., "1, Θεός" -> "Θεός")
  cleaned = cleaned.replace(/^\d{1,3}\s*,?\s*/, '');

  // Remove embedded line numbers (more cautious approach)
  // Only remove numbers that appear to be margin references
  cleaned = cleaned.replace(/\s+(\d{1,2})\s+(?=[α-ωἀ-ῶ])/g, ' ');

  return cleaned;
}

/**
 * Clean page and column markers from text
 */
export function cleanPageMarkers(text: string): string {
  let cleaned = text;

  // Remove page markers at START of paragraph like "C 3.", "D", "B"
  // These are folio/column references
  cleaned = cleaned.replace(/^[CDPWB]\s+\d+\.\s*/g, '');
  cleaned = cleaned.replace(/^[CDPWB]\s+(?=[Α-Ωα-ωἀ-ῶ])/g, '');

  // Remove "T E" type markers (page reference)
  cleaned = cleaned.replace(/^\"?T\s+E\s+/g, '');

  // Remove page markers like "P 130", "W 18", "P E 15" in middle of text
  cleaned = cleaned.replace(/\s+[PWBCD]\s+[0-9]+(?:\s|$)/g, ' ');
  cleaned = cleaned.replace(/\s+[PWBCD]\s+[EY]\s+\d*\s*/g, ' ');

  // Remove isolated single letters that are page/column markers
  // Be careful not to remove Greek single letters
  cleaned = cleaned.replace(/\s+[PWBCD]\s+(?=[α-ωἀ-ῶΑ-Ω])/g, ' ');

  // Remove margin indicators like "| τῇ"
  cleaned = cleaned.replace(/\|\s+/g, '');

  // Remove "W 1 7" type patterns (page + column)
  cleaned = cleaned.replace(/\s+W\s+\d+\s+\d+\s+/g, ' ');

  // Remove folio markers embedded in text like "132»" or "ῬῚ 16"
  cleaned = cleaned.replace(/\d+[»›]\s*/g, '');
  cleaned = cleaned.replace(/ῬῚ\s+\d+\s*/g, '');

  return cleaned;
}

/**
 * Clean OCR artifacts and normalize text
 */
export function cleanOcrArtifacts(text: string): string {
  let cleaned = text;

  // Clean up hyphenation artifacts
  // Words split across lines often have trailing hyphens
  cleaned = cleaned.replace(/--\s*/g, '');
  cleaned = cleaned.replace(/—\s*(?=[α-ωἀ-ῶ])/g, '');

  // Remove stray punctuation patterns
  cleaned = cleaned.replace(/\s*\.\s*\.\s*/g, '. ');

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned;
}


/**
 * Check if a paragraph is too short to be meaningful (fragment)
 */
function isFragmentParagraph(text: string): boolean {
  const trimmed = text.trim();

  // Very short paragraphs (< 30 chars) with only 1-2 words are fragments
  if (trimmed.length < 30) {
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    if (words.length <= 2) return true;
  }

  // Single line that ends mid-word (hyphenation artifact)
  if (/[α-ωἀ-ῶ]-$/.test(trimmed)) return true;

  // Starts with lowercase Greek (continuation of previous paragraph)
  if (/^[α-ωἀ-ῶ]/.test(trimmed) && trimmed.length < 50) return true;

  return false;
}

/**
 * Process a single paragraph
 */
export function processParagraph(
  paragraph: Paragraph
): { paragraph: Paragraph | null; classification: ParagraphClassification } {
  const { text, index } = paragraph;

  // Classify the paragraph
  const classification = classifyParagraph(text);

  // Remove FONTES citations entirely
  if (classification === 'fontes') {
    return { paragraph: null, classification };
  }

  // Remove apparatus paragraphs entirely
  if (classification === 'apparatus') {
    return { paragraph: null, classification };
  }

  // Remove fragment paragraphs (too short to be meaningful)
  if (isFragmentParagraph(text)) {
    return { paragraph: null, classification: 'apparatus' };
  }

  // For mixed content, try to clean it
  let cleanedText = text;
  if (classification === 'mixed') {
    // Check contamination score - if too high, remove
    const score = getContaminationScore(text);
    if (score > 40) {
      return { paragraph: null, classification: 'apparatus' };
    }

    // Check Latin ratio after potential cleaning
    const latinRatio = getLatinRatio(text);
    if (latinRatio > 0.15) {
      return { paragraph: null, classification: 'apparatus' };
    }

    // Otherwise, try to clean
    cleanedText = cleanLineNumbers(cleanedText);
    cleanedText = cleanPageMarkers(cleanedText);
    cleanedText = cleanOcrArtifacts(cleanedText);
  }

  // For clean paragraphs, still apply basic cleaning
  cleanedText = cleanLineNumbers(cleanedText);
  cleanedText = cleanPageMarkers(cleanedText);
  cleanedText = cleanOcrArtifacts(cleanedText);

  return {
    paragraph: { index, text: cleanedText.trim() },
    classification: classification === 'mixed' ? 'clean' : classification,
  };
}

/**
 * Clean an entire chapter
 */
export function cleanChapter(chapter: ChapterData): {
  cleanedChapter: ChapterData;
  stats: CleaningStats;
} {
  const originalParagraphs = chapter.sourceContent.paragraphs;
  const stats: CleaningStats = {
    originalCount: originalParagraphs.length,
    cleanedCount: 0,
    removedCount: 0,
    classifications: {
      fontes: 0,
      apparatus: 0,
      mixed: 0,
      clean: 0,
    },
  };

  const cleanedParagraphs: Paragraph[] = [];
  let newIndex = 0;

  for (const paragraph of originalParagraphs) {
    const { paragraph: processed, classification } = processParagraph(paragraph);

    // Update stats
    stats.classifications[classification]++;

    if (processed === null) {
      stats.removedCount++;
    } else {
      // Skip empty paragraphs
      if (processed.text.trim().length === 0) {
        stats.removedCount++;
        continue;
      }

      cleanedParagraphs.push({
        index: newIndex++,
        text: processed.text,
      });
      stats.cleanedCount++;
    }
  }

  return {
    cleanedChapter: {
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      sourceContent: {
        paragraphs: cleanedParagraphs,
      },
    },
    stats,
  };
}
