/**
 * Types for the Diarium Urbis Romae cleaning pipeline (Agent B)
 */

export interface DiarySection {
  type: 'frontmatter' | 'preface' | 'diary' | 'appendix' | 'index' | 'backmatter';
  startLine: number;
  endLine: number;
  title?: string;
}

export interface DiaryEntry {
  yearStart: number;
  yearEnd: number;
  startLine: number;
  endLine: number;
  content: string[];
}

export interface CleaningStats {
  totalLinesInput: number;
  pageHeadersRemoved: number;
  footnotesRemoved: number;
  hyphenationsFixed: number;
  extraSpacesFixed: number;
  blankLinesNormalized: number;
  totalLinesOutput: number;
}

export interface PageHeader {
  lineNumber: number;
  text: string;
  type: 'year_marker' | 'title_header' | 'author_header' | 'page_number' | 'roman_numeral';
}

export interface FootnoteBlock {
  startLine: number;
  endLine: number;
  type: 'variant' | 'commentary';
}
