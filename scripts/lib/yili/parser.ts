/**
 * Parser for Yi Li (儀禮) raw text files.
 *
 * This parser handles two scenarios:
 *   1. Base text only (current source) — each non-empty line is a "text" paragraph
 *   2. Base text with Zheng Xuan commentary — identified by markers (see below)
 *
 * COMMENTARY DETECTION:
 * If commentary were present, it would be identified by these patterns:
 *   - Lines beginning with 「注」, 「鄭注」, 「注曰」, 「鄭玄注」
 *   - Lines enclosed in 【...】brackets
 *   - Lines following a 「○」or 「●」delimiter after main text
 *   - Any line where the first character/word is a known commentary marker
 *
 * CURRENT STATE:
 * The raw files in data/yi_li/ contain ONLY the base text (經). No commentary
 * markers have been found in any of the 17 chapter files. All paragraphs
 * are output with type="text".
 *
 * PARAGRAPH MARKING:
 * Since the database schema stores paragraphs as { index, text } without a
 * native "type" field, commentary paragraphs would be prefixed with [注]
 * in their text content to distinguish them from main text.
 */

import { YiLiParagraph, ParagraphType } from "./types";

/**
 * Known commentary marker patterns (regex).
 * These would identify the start of a commentary block if present.
 */
const COMMENTARY_MARKERS: RegExp[] = [
  /^注[：:]/, // 注：...
  /^注曰[：:]?/, // 注曰...
  /^鄭注[：:]?/, // 鄭注...
  /^鄭玄注[：:]?/, // 鄭玄注...
  /^【注】/, // 【注】...
  /^○\s*注/, // ○ 注...
  /^●\s*注/, // ● 注...
];

/**
 * Determines whether a line of text is commentary based on known markers.
 */
export function isCommentaryLine(line: string): boolean {
  const trimmed = line.trim();
  return COMMENTARY_MARKERS.some((marker) => marker.test(trimmed));
}

/**
 * Strips commentary markers from the beginning of a line, leaving just
 * the commentary content.
 */
export function stripCommentaryMarker(line: string): string {
  let text = line.trim();
  for (const marker of COMMENTARY_MARKERS) {
    text = text.replace(marker, "").trim();
  }
  return text;
}

/**
 * Parses a raw Yi Li chapter file into structured paragraphs.
 *
 * Each non-empty line becomes a paragraph. Lines matching commentary
 * markers are typed as "commentary" with a [注] prefix in the text;
 * all other lines are typed as "text".
 *
 * @param rawContent - The full text content of a raw chapter file
 * @returns Array of parsed paragraphs with index, text, and type
 */
export function parseYiLiChapter(rawContent: string): YiLiParagraph[] {
  const lines = rawContent.split("\n");
  const paragraphs: YiLiParagraph[] = [];
  let index = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    let type: ParagraphType;
    let text: string;

    if (isCommentaryLine(trimmed)) {
      type = "commentary";
      const content = stripCommentaryMarker(trimmed);
      // Prefix with [注] so the paragraph is clearly identified as commentary
      // in the database, since the schema uses { index, text } without a type field
      text = `[注] ${content}`;
    } else {
      type = "text";
      text = trimmed;
    }

    paragraphs.push({ index, text, type });
    index++;
  }

  return paragraphs;
}

/**
 * Validates the parsed output of a chapter.
 * Returns an object with validation status and diagnostics.
 */
export function validateChapter(paragraphs: YiLiParagraph[]): {
  valid: boolean;
  totalParagraphs: number;
  textParagraphs: number;
  commentaryParagraphs: number;
  hasContent: boolean;
  warnings: string[];
} {
  const textParas = paragraphs.filter((p) => p.type === "text");
  const commParas = paragraphs.filter((p) => p.type === "commentary");
  const warnings: string[] = [];

  if (paragraphs.length === 0) {
    warnings.push("No paragraphs found — empty chapter");
  }

  if (textParas.length === 0 && paragraphs.length > 0) {
    warnings.push("No main text paragraphs found — all paragraphs are commentary");
  }

  // Check for very short paragraphs that might be artifacts
  const shortParas = paragraphs.filter((p) => p.text.length < 3);
  if (shortParas.length > 0) {
    warnings.push(
      `${shortParas.length} very short paragraphs (< 3 chars) found — possible artifacts`
    );
  }

  return {
    valid: paragraphs.length > 0 && textParas.length > 0,
    totalParagraphs: paragraphs.length,
    textParagraphs: textParas.length,
    commentaryParagraphs: commParas.length,
    hasContent: paragraphs.length > 0,
    warnings,
  };
}
