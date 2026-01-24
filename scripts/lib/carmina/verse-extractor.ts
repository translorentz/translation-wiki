/**
 * Verse Extractor for Carmina Graeca Medii Aevi.
 *
 * Extracts classified verse lines, strips editorial line numbers,
 * normalizes Unicode, and groups into fixed-size paragraphs.
 */

import type { ClassifiedLine, ExtractedVerse, TextSection } from "./types.js";

/** Number of verse lines per paragraph */
const LINES_PER_PARAGRAPH = 15;

/** Pattern: 1-5 digits followed by space(s) at line start */
const LEADING_NUMBER_RE = /^\d{1,5}\s+/;

/** Pattern: stray punctuation at line start */
const STRAY_PUNCT_START = /^[.,;:!\-᾿ʼ"'`]+\s*/;

/** Pattern: orphaned breathing mark not attached to a vowel */
const ORPHANED_BREATHING = /(?:^|\s)[᾿ʼ'](?:\s|$)/g;

/**
 * Strip leading editorial line number from a verse line.
 */
function stripLeadingNumber(text: string): string {
  return text.replace(LEADING_NUMBER_RE, "");
}

/**
 * Clean a verse line: normalize Unicode, fix OCR artifacts.
 */
function cleanVerseLine(text: string): string {
  let cleaned = text;

  // Trim first
  cleaned = cleaned.trim();

  // Remove stray punctuation at start BEFORE number stripping
  // (many lines start with ". 140 verse..." where the ". " prefix blocks number detection)
  cleaned = cleaned.replace(STRAY_PUNCT_START, "");

  // Strip leading editorial number (for verse_numbered lines)
  cleaned = stripLeadingNumber(cleaned);

  // Unicode NFC normalization
  cleaned = cleaned.normalize("NFC");

  // Collapse multiple spaces to single
  cleaned = cleaned.replace(/\s{2,}/g, " ");

  // Remove any remaining stray punctuation at start (from after number strip)
  cleaned = cleaned.replace(STRAY_PUNCT_START, "");

  // Remove orphaned breathing marks (not attached to following vowel)
  cleaned = cleaned.replace(ORPHANED_BREATHING, " ");

  // Final trim
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Extract and clean verse from classified lines, grouping into paragraphs.
 */
export function extractVerse(
  section: TextSection,
  classified: ClassifiedLine[]
): ExtractedVerse {
  // Collect verse lines (both verse and verse_numbered)
  const verseLines: { text: string; gapBefore: boolean }[] = [];
  let lastWasVerse = false;
  let gapCount = 0;

  for (const line of classified) {
    if (line.category === "verse" || line.category === "verse_numbered") {
      const cleaned = cleanVerseLine(line.text);
      if (cleaned.length > 0) {
        verseLines.push({
          text: cleaned,
          gapBefore: !lastWasVerse && gapCount >= 2 && verseLines.length > 0,
        });
        lastWasVerse = true;
        gapCount = 0;
      }
    } else {
      if (lastWasVerse) {
        lastWasVerse = false;
      }
      if (line.category !== "empty") {
        gapCount++;
      } else {
        gapCount++;
      }
    }
  }

  // Group into paragraphs
  const paragraphs: { index: number; text: string }[] = [];
  let currentLines: string[] = [];
  let paragraphIndex = 1;

  for (let i = 0; i < verseLines.length; i++) {
    const verseLine = verseLines[i];

    // Natural break: gap of 2+ non-verse lines creates a paragraph boundary
    if (verseLine.gapBefore && currentLines.length > 0) {
      paragraphs.push({
        index: paragraphIndex++,
        text: currentLines.join("\n"),
      });
      currentLines = [];
    }

    currentLines.push(verseLine.text);

    // Fixed-size break: every LINES_PER_PARAGRAPH lines
    if (currentLines.length >= LINES_PER_PARAGRAPH) {
      paragraphs.push({
        index: paragraphIndex++,
        text: currentLines.join("\n"),
      });
      currentLines = [];
    }
  }

  // Flush remaining lines
  if (currentLines.length > 0) {
    paragraphs.push({
      index: paragraphIndex++,
      text: currentLines.join("\n"),
    });
  }

  const title = `${section.title} (${section.englishTitle})`;

  return {
    chapterNumber: section.chapterNumber,
    title,
    paragraphs,
  };
}
