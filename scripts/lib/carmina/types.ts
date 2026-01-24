/**
 * Shared types for the Carmina Graeca processing pipeline.
 */

export interface TitleEntry {
  chapterNumber: number;
  startLine: number; // 0-indexed line number where title begins
  endLine: number; // 0-indexed line number where title ends (same as start for single-line)
  title: string; // Cleaned Greek title
  englishTitle: string;
}

export interface TextSection {
  chapterNumber: number;
  title: string;
  englishTitle: string;
  contentStartLine: number; // first line after title
  contentEndLine: number; // last line before next title
  rawLines: string[]; // all lines in this section (excluding title lines)
}

export type LineCategory =
  | "verse"
  | "verse_numbered"
  | "apparatus"
  | "introduction"
  | "empty"
  | "noise";

export interface ClassifiedLine {
  lineNumber: number; // 0-indexed position in original file
  text: string;
  category: LineCategory;
}

export interface ExtractedVerse {
  chapterNumber: number;
  title: string; // "Greek (English)"
  paragraphs: { index: number; text: string }[];
}

export interface QualityReport {
  chapterNumber: number;
  title: string;
  verseLineCount: number;
  apparatusLineCount: number;
  noiseLineCount: number;
  emptyLineCount: number;
  introductionLineCount: number;
  paragraphCount: number;
  avgLineLength: number;
  minLineLength: number;
  maxLineLength: number;
  greekCharPercent: number;
  siglaContamination: string[]; // lines with leaked sigla
  leadingNumbersRemaining: string[]; // lines still starting with numbers
  status: "PASS" | "WARN" | "FAIL";
  warnings: string[];
  errors: string[];
}

export interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}
