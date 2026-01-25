/**
 * Types for the Diarium Urbis Romae (Infessura) cleaning pipeline.
 */

/** Structural section of the OCR text */
export interface Section {
  name: string;
  startLine: number; // 0-indexed
  endLine: number;   // exclusive
  lines: string[];
}

/** A cleaned diary entry (one or more year entries) */
export interface DiaryEntry {
  yearStart: number;
  yearEnd: number;
  text: string;
}

/** Cleaning statistics */
export interface CleaningStats {
  totalLinesRead: number;
  headerLinesRemoved: number;
  footnoteLinesRemoved: number;
  folioRefsRemoved: number;
  lineNumbersRemoved: number;
  markersRemoved: number;
  hyphensRejoined: number;
  spacesNormalized: number;
  blankLinesCollapsed: number;
  outputLines: number;
}

/** Section boundaries identified in the OCR */
export interface SectionBoundaries {
  prefaceStart: number;
  prefaceEnd: number;
  diaryStart: number;
  diaryEnd: number;
  altroPrincipioStart: number;
  altroPrincipioEnd: number;
  indexStart: number;
}
