/**
 * Shared types for the Eustathius Commentary processing pipeline.
 */

export interface RhapsodyEntry {
  chapterNumber: number;
  bookLetter: string; // Greek letter: Α, Β, Γ, Δ, Ε, Ζ, Η, Θ, Ι, Κ, Λ, Μ
  title: string; // "Commentary on Odyssey Book N"
  startLine: number; // 0-indexed line where this book's commentary begins
  endLine: number; // 0-indexed line where it ends (exclusive)
}

export interface TextSection {
  chapterNumber: number;
  title: string;
  startLine: number;
  endLine: number;
  rawLines: string[];
}

export type LineCategory =
  | "commentary" // Greek commentary prose (the main content)
  | "page_header" // Page/section header (ΡΑΨΩΔΙΑ markers, edition page refs)
  | "margin_number" // Bekker-style margin numbers (10, 20, 30, 40, 50)
  | "page_number" // Edition page numbers (1379, 1380, etc.)
  | "empty" // Blank/whitespace lines
  | "noise"; // Short garbage, OCR artifacts, stray characters

export interface ClassifiedLine {
  lineNumber: number; // 0-indexed position in original file
  text: string;
  category: LineCategory;
}

export interface ExtractedCommentary {
  chapterNumber: number;
  title: string;
  paragraphs: { index: number; text: string }[];
}

export interface QualityReport {
  chapterNumber: number;
  title: string;
  totalRawLines: number;
  commentaryLineCount: number;
  headerLineCount: number;
  marginNumberCount: number;
  pageNumberCount: number;
  emptyLineCount: number;
  noiseLineCount: number;
  paragraphCount: number;
  avgParagraphLength: number;
  totalCharacters: number;
  greekCharPercent: number;
  digitCount: number;
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
