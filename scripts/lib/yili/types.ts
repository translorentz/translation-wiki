/**
 * Type definitions for Yi Li (儀禮) text processing.
 *
 * The Yi Li traditionally includes Zheng Xuan's (鄭玄) commentary interspersed
 * within the main ritual text. This module defines types that support both
 * scenarios:
 *   1. Base text only (經/jing) — as found in some source editions
 *   2. Base text + commentary (經 + 注) — the standard scholarly format
 *
 * CURRENT SOURCE STATUS:
 * The raw files in data/yi_li/ contain ONLY the base text without commentary.
 * All paragraphs are typed as "text". If commentary-annotated source files
 * become available in the future, the parser can be extended to handle them.
 *
 * Commentary identification markers to look for in annotated editions:
 *   - 「注」or 「鄭注」or 「注曰」 before commentary blocks
 *   - 「○」or 「●」 as section dividers
 *   - Brackets 【】around commentary
 *   - 「經」(classic/main text) vs 「注」(commentary) labels
 *   - Indentation or smaller font size indicators
 */

export type ParagraphType = "text" | "commentary";

export interface YiLiParagraph {
  index: number;
  text: string;
  type: ParagraphType;
}

export interface YiLiChapter {
  chapterNumber: number;
  title: string;
  titleChinese: string;
  sourceContent: {
    paragraphs: YiLiParagraph[];
  };
}

/**
 * Traditional chapter titles of the Yi Li (17 chapters).
 * Used to generate bilingual titles for the processed output.
 */
export const YI_LI_CHAPTERS: { number: number; chinese: string; english: string }[] = [
  { number: 1, chinese: "士冠禮", english: "Capping Ceremony for a Gentleman" },
  { number: 2, chinese: "士昬禮", english: "Marriage Ceremony for a Gentleman" },
  { number: 3, chinese: "士相見禮", english: "Ceremony of Introduction for a Gentleman" },
  { number: 4, chinese: "鄉飲酒禮", english: "District Drinking Ceremony" },
  { number: 5, chinese: "鄉射禮", english: "District Archery Ceremony" },
  { number: 6, chinese: "燕禮", english: "Banquet Ceremony" },
  { number: 7, chinese: "大射", english: "Grand Archery" },
  { number: 8, chinese: "聘禮", english: "Ceremony of Embassy" },
  { number: 9, chinese: "公食大夫禮", english: "Duke's Feast for a Grand Officer" },
  { number: 10, chinese: "覲禮", english: "Ceremony of Audience" },
  { number: 11, chinese: "喪服", english: "Mourning Garments" },
  { number: 12, chinese: "士喪禮", english: "Funeral Ceremony for a Gentleman" },
  { number: 13, chinese: "既夕禮", english: "Eve-of-Burial Ceremony" },
  { number: 14, chinese: "士虞禮", english: "Sacrifice of Repose for a Gentleman" },
  { number: 15, chinese: "特牲饋食禮", english: "Single-Victim Offering Ceremony" },
  { number: 16, chinese: "少牢饋食禮", english: "Lesser Animal Offering Ceremony" },
  { number: 17, chinese: "有司", english: "The Assisting Officers" },
];
