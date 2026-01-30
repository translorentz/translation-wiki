/**
 * Processes the Huang Di Nei Jing (黃帝內經) raw text into structured JSON.
 *
 * Raw files are volume-based:
 *   Suwen_001_第一卷.txt through Suwen_024_第二十四卷.txt (24 volumes)
 *   Lingshu_025_第一卷.txt through Lingshu_036_第十二卷.txt (12 volumes)
 *
 * This script splits by individual chapter headings (篇) within each volume,
 * producing ~164 chapters: Suwen 1-81, 2 遺篇 (82-83), Lingshu 1-81 (84-164).
 *
 * Usage: pnpm tsx scripts/process-huangdi-neijing.ts
 */

import fs from "fs";
import path from "path";

const RAW_DIR = path.resolve("data/raw/huangdi_neijing");
const OUTPUT_DIR = path.resolve("data/processed/huangdineijing");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

// Chinese numeral to integer conversion
function chineseToNumber(s: string): number {
  const digits: Record<string, number> = {
    "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
    "六": 6, "七": 7, "八": 8, "九": 9, "十": 10, "百": 100,
  };

  let result = 0;
  let current = 0;

  for (const ch of s) {
    const val = digits[ch];
    if (val === undefined) return -1;

    if (val === 10) {
      result += (current || 1) * 10;
      current = 0;
    } else if (val === 100) {
      result += (current || 1) * 100;
      current = 0;
    } else {
      current = val;
    }
  }
  result += current;
  return result;
}

// Regex to match chapter headings
// Matches lines like: 上古天真論篇第一, 陰陽應象大論第五, 靈蘭秘典論八, 素問•刺法論篇第七十二(遺篇)
const HEADING_RE = /^(.+?)第?([一二三四五六七八九十百]+)(\(遺篇\))?$/;

// Also match the 素問• prefixed 遺篇 headings
const YIPIAN_HEADING_RE = /^素問[•·](.+)篇第([一二三四五六七八九十百]+)\(遺篇\)$/;

interface RawChapter {
  heading: string;
  sectionNumber: number; // The number within Suwen or Lingshu
  isYipian: boolean;
  section: "Suwen" | "Lingshu";
  lines: string[];
}

function main() {
  // Collect all volume files in order
  const suwen = fs
    .readdirSync(RAW_DIR)
    .filter((f) => f.startsWith("Suwen_") && f.endsWith(".txt"))
    .sort();
  const lingshu = fs
    .readdirSync(RAW_DIR)
    .filter((f) => f.startsWith("Lingshu_") && f.endsWith(".txt"))
    .sort();

  console.log(`Found ${suwen.length} Suwen volumes, ${lingshu.length} Lingshu volumes`);

  const allChapters: RawChapter[] = [];

  // Process all volumes
  for (const file of [...suwen, ...lingshu]) {
    const section: "Suwen" | "Lingshu" = file.startsWith("Suwen") ? "Suwen" : "Lingshu";
    const raw = fs.readFileSync(path.join(RAW_DIR, file), "utf-8");
    const lines = raw.split("\n");

    // Find all chapter heading positions in this file (two-pass for 遺篇 handling)
    let rawHeadings: { lineIdx: number; heading: string; num: number; isYipian: boolean }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (line.startsWith("（")) continue;

      // Check for 素問• prefixed 遺篇 heading
      const yipianMatch = line.match(YIPIAN_HEADING_RE);
      if (yipianMatch) {
        const num = chineseToNumber(yipianMatch[2]);
        rawHeadings.push({ lineIdx: i, heading: line, num, isYipian: true });
        continue;
      }

      // Check for regular heading
      const match = line.match(HEADING_RE);
      if (match) {
        const num = chineseToNumber(match[2]);
        if (num < 1 || num > 100) continue;
        if (line.length > 30) continue;
        rawHeadings.push({ lineIdx: i, heading: line, num, isYipian: !!match[3] });
      }
    }

    // Remove placeholder headings whose number matches a 遺篇 heading
    const yipianNums = new Set(rawHeadings.filter((h) => h.isYipian).map((h) => h.num));
    const headings = rawHeadings.filter((h) => !(yipianNums.has(h.num) && !h.isYipian));

    // Extract chapter content between headings
    for (let h = 0; h < headings.length; h++) {
      const startLine = headings[h].lineIdx + 1;
      const endLine = h + 1 < headings.length ? headings[h + 1].lineIdx : lines.length;

      const chapterLines: string[] = [];
      for (let i = startLine; i < endLine; i++) {
        chapterLines.push(lines[i]);
      }

      allChapters.push({
        heading: headings[h].heading,
        sectionNumber: headings[h].num,
        isYipian: headings[h].isYipian,
        section,
        lines: chapterLines,
      });
    }
  }

  // Sort and assign sequential chapter numbers
  // Suwen regular (1-81), Suwen 遺篇 (82-83), then Lingshu (84-164)
  const suwenRegular = allChapters
    .filter((c) => c.section === "Suwen" && !c.isYipian)
    .sort((a, b) => a.sectionNumber - b.sectionNumber);
  const suwenYipian = allChapters
    .filter((c) => c.section === "Suwen" && c.isYipian)
    .sort((a, b) => a.sectionNumber - b.sectionNumber);
  const lingshuChapters = allChapters
    .filter((c) => c.section === "Lingshu")
    .sort((a, b) => a.sectionNumber - b.sectionNumber);

  console.log(`\nSuwen: ${suwenRegular.length} regular + ${suwenYipian.length} yipian`);
  console.log(`Lingshu: ${lingshuChapters.length} chapters`);

  const ordered = [...suwenRegular, ...suwenYipian, ...lingshuChapters];
  console.log(`Total: ${ordered.length} chapters\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (let i = 0; i < ordered.length; i++) {
    const ch = ordered[i];
    const chapterNumber = i + 1;

    // Build title
    let sectionLabel: string;
    if (ch.section === "Suwen" && !ch.isYipian) {
      sectionLabel = `Suwen Chapter ${ch.sectionNumber}`;
    } else if (ch.isYipian) {
      sectionLabel = `Suwen Chapter ${ch.sectionNumber}, Lost Chapter`;
    } else {
      sectionLabel = `Lingshu Chapter ${ch.sectionNumber}`;
    }
    const title = `${ch.heading} (${sectionLabel})`;

    // Extract paragraphs from lines (split on blank lines)
    const paragraphs: { index: number; text: string }[] = [];
    let currentParagraph = "";
    let paragraphIndex = 1;

    for (const line of ch.lines) {
      const trimmed = line.trim();
      // Skip editorial notes
      if (trimmed.startsWith("（") && trimmed.endsWith("）")) continue;

      if (!trimmed) {
        if (currentParagraph) {
          paragraphs.push({ index: paragraphIndex, text: currentParagraph });
          paragraphIndex++;
          currentParagraph = "";
        }
      } else {
        // Accumulate non-blank lines into current paragraph
        currentParagraph = currentParagraph
          ? currentParagraph + "\n" + trimmed
          : trimmed;
      }
    }
    // Flush last paragraph
    if (currentParagraph) {
      paragraphs.push({ index: paragraphIndex, text: currentParagraph });
    }

    const chapter: ProcessedChapter = {
      chapterNumber,
      title,
      sourceContent: { paragraphs },
    };

    const fileName = `chapter-${String(chapterNumber).padStart(3, "0")}.json`;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, fileName),
      JSON.stringify(chapter, null, 2) + "\n"
    );

    console.log(
      `  Chapter ${chapterNumber}: "${ch.heading}" — ${paragraphs.length} paragraphs → ${fileName}`
    );
  }

  console.log(`\nDone. ${ordered.length} chapters written to ${OUTPUT_DIR}`);
}

main();
