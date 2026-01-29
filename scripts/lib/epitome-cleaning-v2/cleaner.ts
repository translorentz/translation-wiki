/**
 * Main cleaning pipeline for Epitome of Histories Vol 2
 */

import {
  cleanParagraph,
  filterParagraphs,
  mergeFragments,
  shouldFilterParagraph,
  isSectionStart,
} from "./filters.js";
import {
  validateChapter,
  generateQualityReport,
  calculateAggregateStats,
} from "./validators.js";
import {
  GREEK_CHARS,
  isLatinLine,
  isApparatusLine,
  isHeaderLine,
  isFontesLine,
} from "./patterns.js";

export interface ChapterData {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: Array<{ index: number; text: string }>;
  };
}

export interface CleaningStats {
  originalParagraphs: number;
  filteredParagraphs: number;
  removedAsLatin: number;
  removedAsApparatus: number;
  removedAsHeader: number;
  removedAsFontes: number;
  removedAsShort: number;
  finalParagraphs: number;
}

/**
 * Parse the raw source file and extract text for a specific book
 */
export function extractBookFromRaw(
  rawText: string,
  bookNumber: number
): string[] {
  const lines = rawText.split("\n");
  const bookLines: string[] = [];

  // Find the start of this book
  // Pattern: "LIBER SEPTIMUS" for book 7, "LIBER OCTAVUS" for book 8, etc.
  const bookNames: { [key: number]: string } = {
    7: "SEPTIMUS",
    8: "OCTAVUS",
    9: "NONUS",
    10: "DECIMUS",
    11: "UNDECIMUS",
    12: "DUODECIMUS",
  };

  const bookName = bookNames[bookNumber];
  if (!bookName) {
    throw new Error(`Unknown book number: ${bookNumber}`);
  }

  const startPattern = new RegExp(`LIBER\\s+${bookName}`, "i");
  const nextBookPattern = /LIBER\s+(SEPTIMUS|OCTAVUS|NONUS|DECIMUS|UNDECIMUS|DUODECIMUS)/i;

  let inBook = false;
  let foundStart = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!foundStart && startPattern.test(line)) {
      foundStart = true;
      inBook = true;
      continue;
    }

    if (inBook) {
      // Check if we've hit the next book
      if (foundStart && nextBookPattern.test(line) && !startPattern.test(line)) {
        break;
      }
      bookLines.push(line);
    }
  }

  return bookLines;
}

/**
 * Segment raw lines into paragraphs
 */
export function segmentIntoParagraphs(lines: string[]): string[] {
  const paragraphs: string[] = [];
  let currentPara = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines - they mark paragraph boundaries
    if (!trimmed) {
      if (currentPara.trim()) {
        paragraphs.push(currentPara.trim());
        currentPara = "";
      }
      continue;
    }

    // Skip obvious non-content lines
    if (isHeaderLine(trimmed)) continue;
    if (isFontesLine(trimmed)) continue;

    // Accumulate
    currentPara += " " + trimmed;
  }

  // Don't forget the last paragraph
  if (currentPara.trim()) {
    paragraphs.push(currentPara.trim());
  }

  return paragraphs;
}

/**
 * Clean a single chapter's paragraphs
 */
export function cleanChapter(
  paragraphs: Array<{ index: number; text: string }>
): { cleaned: Array<{ index: number; text: string }>; stats: CleaningStats } {
  const stats: CleaningStats = {
    originalParagraphs: paragraphs.length,
    filteredParagraphs: 0,
    removedAsLatin: 0,
    removedAsApparatus: 0,
    removedAsHeader: 0,
    removedAsFontes: 0,
    removedAsShort: 0,
    finalParagraphs: 0,
  };

  const kept: Array<{ index: number; text: string }> = [];

  for (const para of paragraphs) {
    const { filter, reason } = shouldFilterParagraph(para.text);

    if (filter) {
      stats.filteredParagraphs++;
      switch (reason) {
        case "latin":
          stats.removedAsLatin++;
          break;
        case "apparatus":
          stats.removedAsApparatus++;
          break;
        case "header":
          stats.removedAsHeader++;
          break;
        case "fontes":
          stats.removedAsFontes++;
          break;
        case "too_short":
        case "low_greek_ratio":
          stats.removedAsShort++;
          break;
      }
      continue;
    }

    // Clean the paragraph
    const cleaned = cleanParagraph(para.text);

    // Skip if cleaning made it too short
    if (cleaned.length < 10) {
      stats.removedAsShort++;
      stats.filteredParagraphs++;
      continue;
    }

    kept.push({
      index: para.index,
      text: cleaned,
    });
  }

  // Merge fragments
  const texts = kept.map((k) => k.text);
  const merged = mergeFragments(texts);

  // Re-index
  const final = merged.map((text, i) => ({
    index: i,
    text,
  }));

  stats.finalParagraphs = final.length;

  return { cleaned: final, stats };
}

/**
 * Process a chapter from its existing JSON data
 */
export function processChapterFromJson(data: ChapterData): {
  cleaned: ChapterData;
  stats: CleaningStats;
  report: string;
} {
  const { cleaned, stats } = cleanChapter(data.sourceContent.paragraphs);

  const cleanedData: ChapterData = {
    chapterNumber: data.chapterNumber,
    title: data.title,
    sourceContent: {
      paragraphs: cleaned,
    },
  };

  const report = generateQualityReport(data.chapterNumber, cleaned);

  return { cleaned: cleanedData, stats, report };
}

/**
 * Process all Vol 2 chapters (Books 7-12)
 */
export function processVolume2(
  chapters: ChapterData[]
): {
  cleanedChapters: ChapterData[];
  aggregateStats: {
    avgGreekRatio: number;
    avgScore: number;
    totalApparatusIndicators: number;
    chaptersWithFontes: number;
    grade: string;
  };
  perChapterStats: Map<number, CleaningStats>;
  fullReport: string;
} {
  const cleanedChapters: ChapterData[] = [];
  const perChapterStats = new Map<number, CleaningStats>();
  let fullReport = "# Epitome Vol 2 Cleaning Report\n\n";

  for (const chapter of chapters) {
    const { cleaned, stats, report } = processChapterFromJson(chapter);
    cleanedChapters.push(cleaned);
    perChapterStats.set(chapter.chapterNumber, stats);
    fullReport += report + "\n---\n\n";
  }

  const aggregateStats = calculateAggregateStats(
    cleanedChapters.map((c) => ({
      chapterNumber: c.chapterNumber,
      paragraphs: c.sourceContent.paragraphs,
    }))
  );

  fullReport =
    `# Summary\n\n` +
    `**Grade:** ${aggregateStats.grade}\n` +
    `**Average Score:** ${aggregateStats.avgScore.toFixed(1)}/100\n` +
    `**Average Greek Ratio:** ${(aggregateStats.avgGreekRatio * 100).toFixed(1)}%\n` +
    `**Total Apparatus Indicators:** ${aggregateStats.totalApparatusIndicators}\n` +
    `**Chapters with FONTES:** ${aggregateStats.chaptersWithFontes}\n\n` +
    `---\n\n` +
    fullReport;

  return { cleanedChapters, aggregateStats, perChapterStats, fullReport };
}
