/**
 * Commentary Extractor for Eustathius Commentary on Homer's Odyssey.
 *
 * Extracts classified commentary lines, cleans OCR artifacts,
 * strips margin/page annotations, normalizes text, and groups
 * into paragraphs suitable for the translation wiki display.
 *
 * Key differences from the Carmina verse-extractor:
 * 1. This is PROSE -- paragraphs are defined by content breaks, not fixed line counts
 * 2. Commentary lines often wrap across multiple raw lines (hyphenated words)
 * 3. Margin numbers (10, 20, 30, 40, 50) and page numbers are embedded in text
 * 4. Verse references like "(Vers. 15.)" are KEPT (they're part of the commentary)
 * 5. Paragraph breaks are created at verse reference transitions for readability
 */

import type { ClassifiedLine, ExtractedCommentary, TextSection } from "./types.js";
import { stripMarginAnnotations } from "./content-classifier.js";

/**
 * Maximum characters per paragraph before forcing a break.
 * Commentary paragraphs should be ~500-1000 chars for readable display.
 */
const MAX_PARAGRAPH_CHARS = 800;

/**
 * Pattern: Verse reference that can serve as a paragraph break point.
 * "(Vers. N.)" or "( Vers. N. )" or "(Vers, N.)" or "(Wers. N.)"
 * Note: After Round 2 cleanup, most verse refs are stripped by stripMarginAnnotations.
 * This pattern catches any that survive (for paragraph-breaking purposes only).
 */
const VERSE_REF_BREAK = /\(\s*[VWνΝ][eοo][rvau][sσ][,.]\s*\d+[^)]*\)/;

/**
 * All verse reference patterns for stripping from final paragraph text.
 * These are applied AFTER line joining to catch any that span line boundaries.
 * Ordered from most specific to most broad.
 */
const VERS_STRIP_PATTERNS = [
  /\(\s*[VWνΝ][eοo\s][rvau][sσ][,.\s]\s*\d+[^)]{0,20}\)/g,
  /\(\s*[VW]\s*[eο]?[rv][sσ][.,]?\s*\d+[\s\d.—–\-]*[.)J}\]]/g,
  /\(\s*V\s+ers[.,]?\s*\d*[^)]{0,15}\)/g,
  /\(\s*V\s*[eE]?[rvea]+[sσa]?[.,']?\s*[^)]{0,20}\)/g,
  /\(\s*[VW][eE]?r[sσva]+[.,]?\s*\)/g,
  /\(\s*[VWνΝ][eοo\s][rvau][sσ][,.\s]\s*\d+[\s\d.—–\-]*/g,
];

/**
 * Pattern: Hyphenation at end of line (word split across lines).
 * The line ends with a hyphen after a word fragment.
 */
const HYPHENATED_END = /[α-ωά-ώἀ-ῶa-zA-Z]-\s*$/;

/**
 * Clean a commentary line: strip margin annotations, normalize Unicode.
 */
function cleanCommentaryLine(text: string): string {
  let cleaned = text;

  // Strip margin annotations (page numbers, Bekker numbers)
  cleaned = stripMarginAnnotations(cleaned);

  // Unicode NFC normalization
  cleaned = cleaned.normalize("NFC");

  // Collapse multiple spaces to single
  cleaned = cleaned.replace(/\s{2,}/g, " ");

  // Remove stray asterisks that are page-margin markers
  cleaned = cleaned.replace(/^\s*\*\s*/, "");

  // Remove isolated quotation artifacts
  cleaned = cleaned.replace(/^["'"]\s+/, "");

  // Final trim
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Join lines, handling hyphenation across line breaks.
 */
function joinLines(lines: string[]): string {
  if (lines.length === 0) return "";

  let result = lines[0] || "";

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i] || "";
    if (!currentLine) continue;

    // Check if previous line ended with hyphenation
    if (HYPHENATED_END.test(result)) {
      // Join without space, removing the hyphen
      result = result.replace(/-\s*$/, "") + currentLine;
    } else {
      // Normal join with space
      result = result + " " + currentLine;
    }
  }

  return result;
}

/**
 * Split a long text block into paragraphs at verse reference boundaries.
 * Falls back to character-count-based splitting if no verse references found.
 */
function splitIntoParagraphs(text: string): string[] {
  if (text.length <= MAX_PARAGRAPH_CHARS) {
    return [text];
  }

  const paragraphs: string[] = [];
  let remaining = text;

  while (remaining.length > MAX_PARAGRAPH_CHARS) {
    // Find a verse reference to split at (near the target length)
    const searchStart = Math.max(0, MAX_PARAGRAPH_CHARS * 0.5);
    const searchEnd = Math.min(remaining.length, MAX_PARAGRAPH_CHARS * 1.2);
    const searchRegion = remaining.substring(Math.floor(searchStart), Math.floor(searchEnd));

    const match = searchRegion.match(VERSE_REF_BREAK);
    if (match && match.index !== undefined) {
      // Split BEFORE the verse reference
      const splitPoint = Math.floor(searchStart) + match.index;
      const para = remaining.substring(0, splitPoint).trim();
      if (para) paragraphs.push(para);
      remaining = remaining.substring(splitPoint).trim();
    } else {
      // No verse reference found -- split at sentence boundary (period + space)
      const searchRegion2 = remaining.substring(
        Math.floor(MAX_PARAGRAPH_CHARS * 0.6),
        Math.floor(MAX_PARAGRAPH_CHARS * 1.1)
      );
      const periodMatch = searchRegion2.match(/\.\s+/);
      if (periodMatch && periodMatch.index !== undefined) {
        const splitPoint = Math.floor(MAX_PARAGRAPH_CHARS * 0.6) + periodMatch.index + periodMatch[0].length;
        const para = remaining.substring(0, splitPoint).trim();
        if (para) paragraphs.push(para);
        remaining = remaining.substring(splitPoint).trim();
      } else {
        // Last resort: split at MAX_PARAGRAPH_CHARS
        const para = remaining.substring(0, MAX_PARAGRAPH_CHARS).trim();
        if (para) paragraphs.push(para);
        remaining = remaining.substring(MAX_PARAGRAPH_CHARS).trim();
      }
    }
  }

  if (remaining.trim()) {
    paragraphs.push(remaining.trim());
  }

  return paragraphs;
}

/**
 * Extract and clean commentary from classified lines, grouping into paragraphs.
 */
export function extractCommentary(
  section: TextSection,
  classified: ClassifiedLine[]
): ExtractedCommentary {
  // Collect commentary lines
  const commentaryLines: string[] = [];

  for (const line of classified) {
    if (line.category === "commentary") {
      const cleaned = cleanCommentaryLine(line.text);
      if (cleaned.length > 0) {
        commentaryLines.push(cleaned);
      }
    }
  }

  // Join all commentary lines into continuous text blocks
  // First, identify natural breaks (gaps of 2+ non-commentary lines)
  const blocks: string[][] = [];
  let currentBlock: string[] = [];
  let gapCount = 0;

  for (const line of classified) {
    if (line.category === "commentary") {
      const cleaned = cleanCommentaryLine(line.text);
      if (cleaned.length > 0) {
        if (gapCount >= 3 && currentBlock.length > 0) {
          // Natural break: start a new block
          blocks.push(currentBlock);
          currentBlock = [];
        }
        currentBlock.push(cleaned);
        gapCount = 0;
      }
    } else {
      gapCount++;
    }
  }
  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  // Join lines within each block, then split into paragraphs
  const allParagraphs: string[] = [];

  for (const block of blocks) {
    const joined = joinLines(block);
    if (joined.length > 0) {
      const paras = splitIntoParagraphs(joined);
      allParagraphs.push(...paras);
    }
  }

  // Post-process: strip any remaining verse references from paragraph text
  // (some may span line boundaries and survive per-line cleaning)
  const cleanedParagraphs = allParagraphs.map((text) => {
    let cleaned = text;
    for (const pattern of VERS_STRIP_PATTERNS) {
      cleaned = cleaned.replace(pattern, " ");
    }
    // Strip verse refs with no number, no closing paren
    cleaned = cleaned.replace(/\(\s*[VW][eE]?r[sσva]+[.,]?\s*(?=[Α-ΩἈ-Ὧα-ωά-ώἀ-ῶ᾿])/g, "");
    // Also strip any bare margin numbers that survived (digit+o pattern)
    cleaned = cleaned.replace(/(?:^|\s)\d[oO0](?:\s|$)/g, " ");
    // Strip isolated 1-2 digit numbers surrounded by spaces (Bekker margins)
    cleaned = cleaned.replace(/\s+\d{1,2}\s+/g, " ");
    // Collapse multiple spaces
    cleaned = cleaned.replace(/\s{2,}/g, " ");
    return cleaned.trim();
  });

  // Filter out very short paragraphs that are likely noise leakage
  // Real commentary paragraphs are at least 30+ chars of actual Greek content
  const filteredParagraphs = cleanedParagraphs.filter((text) => {
    if (text.length < 20) return false;
    // For paragraphs 20-50 chars, also check if they have meaningful Greek content
    if (text.length < 50) {
      let greekCount = 0;
      for (const char of text) {
        const code = char.codePointAt(0);
        if (code && ((code >= 0x0370 && code <= 0x03ff) || (code >= 0x1f00 && code <= 0x1fff))) {
          greekCount++;
        }
      }
      // Must be at least 40% Greek to be considered real content
      return greekCount / text.length > 0.4;
    }
    return true;
  });

  // Number the paragraphs
  const paragraphs = filteredParagraphs.map((text, idx) => ({
    index: idx + 1,
    text,
  }));

  return {
    chapterNumber: section.chapterNumber,
    title: section.title,
    paragraphs,
  };
}
