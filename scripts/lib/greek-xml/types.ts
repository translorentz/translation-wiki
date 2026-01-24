/**
 * Types for the Greek XML (TEI/EpiDoc) parsing pipeline.
 * Handles First1KGreek corpus files from Perseus Digital Library.
 */

/** Metadata extracted from TEI header */
export interface TextMetadata {
  title: string;
  author: string;
  editor: string;
  date: string;
  urn: string;
  language: string;
  sourceUrl?: string;
}

/** Structural hierarchy levels in the text */
export type DivisionLevel = 'book' | 'chapter' | 'section' | 'paragraph';

/** A single structural division (book, chapter, or section) */
export interface TextDivision {
  level: DivisionLevel;
  n: string; // the @n attribute value (e.g., "1", "pr" for praefatio)
  children: TextDivision[];
  paragraphs: string[]; // text content at this level
}

/** Configuration for how to split text into chapters */
export interface ChapterConfig {
  /** Which division level to use as "chapter" for output.
   * For Zosimus: split at 'chapter' level within each book
   * For Diognetus: split at 'chapter' level (no books)
   * For Sophistici Elenchi: split at 'chapter' level (flat)
   */
  chapterLevel: DivisionLevel;

  /** Whether to include the parent division in the chapter title
   * e.g., "Book 1, Chapter 3" vs just "Chapter 3"
   */
  includeParentInTitle: boolean;

  /** Whether sections within a chapter should become separate paragraphs
   * or be merged into a single paragraph per chapter.
   * true = each section is a paragraph
   * false = entire chapter content is one paragraph
   */
  sectionsAsParagraphs: boolean;

  /** Optional prefix for chapter titles */
  titlePrefix?: string;
}

/** A parsed chapter ready for output */
export interface ParsedChapter {
  chapterNumber: number;
  title: string;
  bookNumber?: number; // for texts with books
  originalN: string; // original @n value (may be "pr", "1", etc.)
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

/** Quality report for a parsed chapter */
export interface ChapterQualityReport {
  chapterNumber: number;
  title: string;
  paragraphCount: number;
  totalCharacters: number;
  averageParagraphLength: number;
  shortestParagraph: number;
  longestParagraph: number;
  emptyParagraphs: number;
  greekCharPercent: number;
  hasNonGreekContent: boolean;
  issues: string[];
  status: 'PASS' | 'WARN' | 'FAIL';
}

/** Overall processing result for a text */
export interface ProcessingResult {
  metadata: TextMetadata;
  chapters: ParsedChapter[];
  quality: ChapterQualityReport[];
  summary: {
    totalChapters: number;
    totalParagraphs: number;
    totalCharacters: number;
    passCount: number;
    warnCount: number;
    failCount: number;
  };
}

/** Known text configurations keyed by TLG identifier */
export const TEXT_CONFIGS: Record<string, {
  slug: string;
  authorSlug: string;
  authorName: string;
  authorNameOriginal: string;
  title: string;
  era: string;
  compositionYear: number;
  textType: 'prose' | 'poetry';
  chapterConfig: ChapterConfig;
}> = {
  'tlg0646.tlg004': {
    slug: 'diognetum',
    authorSlug: 'pseudo-justinus',
    authorName: 'Pseudo-Justinus Martyr',
    authorNameOriginal: 'Ψευδο-Ἰουστῖνος',
    title: 'Epistle to Diognetus (Epistula ad Diognetum)',
    era: '2nd century CE',
    compositionYear: 160,
    textType: 'prose',
    chapterConfig: {
      chapterLevel: 'chapter',
      includeParentInTitle: false,
      sectionsAsParagraphs: true,
    },
  },
  'tlg4084.tlg001': {
    slug: 'historia-nova',
    authorSlug: 'zosimus',
    authorName: 'Zosimus',
    authorNameOriginal: 'Ζώσιμος',
    title: 'New History (Historia Nova)',
    era: '5th-6th century CE',
    compositionYear: 500,
    textType: 'prose',
    chapterConfig: {
      chapterLevel: 'chapter',
      includeParentInTitle: true,
      sectionsAsParagraphs: true,
    },
  },
  'tlg4193.tlg012': {
    slug: 'sophistici-elenchi-paraphrasis',
    authorSlug: 'anonymus-aristotelicus',
    authorName: 'Anonymous Aristotelian Commentator',
    authorNameOriginal: 'Ἀνώνυμος',
    title: 'Paraphrase on the Sophistical Refutations (In Sophisticos Elenchos Paraphrasis)',
    era: 'Late Antiquity',
    compositionYear: 400,
    textType: 'prose',
    chapterConfig: {
      chapterLevel: 'chapter',
      includeParentInTitle: false,
      sectionsAsParagraphs: false,
    },
  },
  'tlg3156.tlg001': {
    slug: 'hesiod-theogony-exegesis',
    authorSlug: 'anonymous-hesiod',
    authorName: 'Anonymous',
    authorNameOriginal: 'Ἀνώνυμος',
    title: 'Exegesis on Hesiod\'s Theogony (Exegesis in Hesiodi Theogoniam)',
    era: 'Late Antiquity',
    compositionYear: 500,
    textType: 'prose',
    chapterConfig: {
      chapterLevel: 'section',
      includeParentInTitle: false,
      sectionsAsParagraphs: false,
    },
  },
  'tlg4003.tlg001': {
    slug: 'periplus-maris-exteri',
    authorSlug: 'marcianus',
    authorName: 'Marcianus of Heraclea',
    authorNameOriginal: 'Μαρκιανὸς Ἡρακλεώτης',
    title: 'Circumnavigation of the Outer Sea (Periplus Maris Exteri)',
    era: '5th century CE',
    compositionYear: 400,
    textType: 'prose',
    chapterConfig: {
      chapterLevel: 'section',
      includeParentInTitle: true,
      sectionsAsParagraphs: false,
    },
  },
  'tlg4003.tlg002': {
    slug: 'periplus-maris-interni',
    authorSlug: 'marcianus',
    authorName: 'Marcianus of Heraclea',
    authorNameOriginal: 'Μαρκιανὸς Ἡρακλεώτης',
    title: 'Menippus\' Circumnavigation of the Inner Sea (Periplus Maris Interni)',
    era: '5th century CE',
    compositionYear: 400,
    textType: 'prose',
    chapterConfig: {
      chapterLevel: 'section',
      includeParentInTitle: true,
      sectionsAsParagraphs: false,
    },
  },
  'tlg4003.tlg003': {
    slug: 'artemidori-geographia',
    authorSlug: 'marcianus',
    authorName: 'Marcianus of Heraclea',
    authorNameOriginal: 'Μαρκιανὸς Ἡρακλεώτης',
    title: 'Artemidorus\' Geography (Artemidori Geographia)',
    era: '5th century CE',
    compositionYear: 400,
    textType: 'prose',
    chapterConfig: {
      chapterLevel: 'section',
      includeParentInTitle: false,
      sectionsAsParagraphs: false,
    },
  },
};
