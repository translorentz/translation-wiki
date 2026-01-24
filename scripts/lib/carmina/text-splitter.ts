/**
 * Text Splitter for Carmina Graeca Medii Aevi.
 *
 * Using title positions from title-finder, splits the file into 21 text sections.
 * Each section contains all lines between one title and the next.
 */

import type { TitleEntry, TextSection } from "./types.js";
import { CONTENT_END_LINE } from "./title-finder.js";

/**
 * Split the file lines into text sections based on title positions.
 */
export function splitTexts(lines: string[], titles: TitleEntry[]): TextSection[] {
  const sections: TextSection[] = [];
  const sorted = [...titles].sort((a, b) => a.startLine - b.startLine);

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const contentStart = current.endLine + 1;
    const contentEnd = next
      ? next.startLine - 1
      : Math.min(lines.length - 1, CONTENT_END_LINE);

    const rawLines = lines.slice(contentStart, contentEnd + 1);

    sections.push({
      chapterNumber: current.chapterNumber,
      title: current.title,
      englishTitle: current.englishTitle,
      contentStartLine: contentStart,
      contentEndLine: contentEnd,
      rawLines,
    });
  }

  return sections;
}

/**
 * Validate that sections are reasonable.
 */
export function validateSections(sections: TextSection[]): string[] {
  const warnings: string[] = [];

  for (const section of sections) {
    if (section.rawLines.length < 20) {
      warnings.push(`Chapter ${section.chapterNumber} ("${section.englishTitle}"): only ${section.rawLines.length} lines — very short`);
    }

    // Check for overlap (should never happen with sorted titles)
    const idx = sections.indexOf(section);
    if (idx > 0) {
      const prev = sections[idx - 1];
      if (section.contentStartLine <= prev.contentEndLine) {
        warnings.push(`Chapter ${section.chapterNumber} overlaps with chapter ${prev.chapterNumber}`);
      }
    }
  }

  if (sections.length !== 21) {
    warnings.push(`Expected 21 sections, got ${sections.length}`);
  }

  return warnings;
}
