/**
 * Chapter splitter for TEI-XML parsed content.
 * Converts the hierarchical TextDivision tree into flat chapter-level units
 * suitable for the wiki's chapter-based display.
 */

import type { TextDivision, ChapterConfig, ParsedChapter } from './types';
import { cleanGreekText } from './text-extractor';

/**
 * Split a tree of TextDivisions into a flat array of ParsedChapters.
 * The splitting strategy depends on the ChapterConfig.
 */
export function splitIntoChapters(
  divisions: TextDivision[],
  config: ChapterConfig
): ParsedChapter[] {
  const chapters: ParsedChapter[] = [];
  let chapterCounter = 1;

  if (hasBookLevel(divisions)) {
    // Text has books containing sub-divisions (chapters or sections)
    // e.g., Zosimus: book > chapter > section
    // e.g., Marcianus: book > section > paragraph
    for (const book of divisions) {
      if (book.level !== 'book') continue;

      const bookN = book.n;
      const bookNumber = parseNumber(bookN);

      for (const chapter of book.children) {
        // Use the configured chapterLevel to determine what counts as a "chapter"
        // within a book. For Zosimus this is 'chapter', for Marcianus it's 'section'.
        if (chapter.level !== config.chapterLevel) continue;

        // Skip index/table-of-contents divs
        if ((chapter as any).subtype === 'index') continue;

        const chapterN = chapter.n;
        const levelLabel = config.chapterLevel === 'section' ? 'Section' : 'Chapter';
        const title = config.includeParentInTitle
          ? `Book ${bookN}, ${levelLabel} ${chapterN}`
          : `${levelLabel} ${chapterN}`;

        const paragraphs = extractChapterParagraphs(chapter, config);

        if (paragraphs.length > 0) {
          chapters.push({
            chapterNumber: chapterCounter,
            title: config.titlePrefix ? `${config.titlePrefix} ${title}` : title,
            bookNumber,
            originalN: `${bookN}.${chapterN}`,
            sourceContent: {
              paragraphs: paragraphs.map((text, i) => ({ index: i + 1, text })),
            },
          });
          chapterCounter++;
        }
      }
    }
  } else {
    // Flat structure: chapters (possibly with sections) at top level
    for (const div of divisions) {
      if (div.level === 'chapter' || div.level === 'section') {
        const divN = div.n;
        const title = formatChapterTitle(divN, config);

        const paragraphs = extractChapterParagraphs(div, config);

        if (paragraphs.length > 0) {
          chapters.push({
            chapterNumber: chapterCounter,
            title: config.titlePrefix ? `${config.titlePrefix} ${title}` : title,
            originalN: divN,
            sourceContent: {
              paragraphs: paragraphs.map((text, i) => ({ index: i + 1, text })),
            },
          });
          chapterCounter++;
        }
      }
    }
  }

  return chapters;
}

/**
 * Extract paragraph texts from a chapter-level division.
 */
function extractChapterParagraphs(
  chapter: TextDivision,
  config: ChapterConfig
): string[] {
  const paragraphs: string[] = [];

  if (config.sectionsAsParagraphs && chapter.children.length > 0) {
    // Each section becomes a paragraph
    for (const section of chapter.children) {
      // Collect all text from this section
      const sectionTexts = collectAllText(section);
      const joined = sectionTexts.join(' ');
      const cleaned = cleanGreekText(joined);
      if (cleaned) {
        paragraphs.push(cleaned);
      }
    }
  } else if (chapter.children.length > 0) {
    // Merge all sections into paragraphs based on <p> elements
    const allTexts = collectAllText(chapter);
    for (const text of allTexts) {
      const cleaned = cleanGreekText(text);
      if (cleaned) {
        paragraphs.push(cleaned);
      }
    }
  }

  // Also include any direct paragraphs at the chapter level
  if (chapter.paragraphs.length > 0 && paragraphs.length === 0) {
    for (const p of chapter.paragraphs) {
      const cleaned = cleanGreekText(p);
      if (cleaned) {
        paragraphs.push(cleaned);
      }
    }
  }

  return paragraphs;
}

/**
 * Collect all text recursively from a division and its children.
 * Returns text grouped by the deepest paragraph-level units.
 */
function collectAllText(division: TextDivision): string[] {
  const texts: string[] = [];

  // Add direct paragraphs
  for (const p of division.paragraphs) {
    const cleaned = cleanGreekText(p);
    if (cleaned) {
      texts.push(cleaned);
    }
  }

  // Recurse into children
  for (const child of division.children) {
    texts.push(...collectAllText(child));
  }

  return texts;
}

/**
 * Check if the top-level divisions include a 'book' level.
 */
function hasBookLevel(divisions: TextDivision[]): boolean {
  return divisions.some(d => d.level === 'book');
}

/**
 * Format a chapter title from division number and configured level.
 */
function formatChapterTitle(n: string, config: ChapterConfig): string {
  if (n === 'pr' || n === 'praef') {
    return 'Preface';
  }
  const levelLabel = config.chapterLevel === 'section' ? 'Section' : 'Chapter';
  return `${levelLabel} ${n}`;
}

/**
 * Parse a division number, handling special cases like "pr".
 */
function parseNumber(n: string): number {
  const num = parseInt(n, 10);
  return isNaN(num) ? 0 : num;
}
