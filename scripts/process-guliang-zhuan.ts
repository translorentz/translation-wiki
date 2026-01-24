/**
 * Processes the Guliang Zhuan (穀梁傳) raw text into structured JSON.
 *
 * The raw files are organized by duke (one file per duke):
 *   01_隱公.txt through 12_哀公.txt
 *
 * Each file contains year sections separated by:
 *   ====================
 *   隱公元年
 *   ====================
 *
 * Within each year section, each line is a chronicle entry with commentary.
 *
 * Output: One chapter per duke, with each chronicle entry as a paragraph.
 * Year headers are preserved as separate paragraphs (prefixed with【】markers)
 * to provide context in the parallel display.
 *
 * Usage: pnpm tsx scripts/process-guliang-zhuan.ts
 */

import fs from "fs";
import path from "path";

const RAW_DIR = path.resolve("data/raw/guliang_zhuan");
const OUTPUT_DIR = path.resolve("data/processed/guliang-zhuan");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

// Duke names in order with English translations
const DUKES = [
  { file: "01_隱公.txt", chinese: "隱公", english: "Duke Yin", years: "722–712 BCE" },
  { file: "02_桓公.txt", chinese: "桓公", english: "Duke Huan", years: "711–694 BCE" },
  { file: "03_莊公.txt", chinese: "莊公", english: "Duke Zhuang", years: "693–662 BCE" },
  { file: "04_閔公.txt", chinese: "閔公", english: "Duke Min", years: "661–660 BCE" },
  { file: "05_僖公.txt", chinese: "僖公", english: "Duke Xi", years: "659–627 BCE" },
  { file: "06_文公.txt", chinese: "文公", english: "Duke Wen", years: "626–609 BCE" },
  { file: "07_宣公.txt", chinese: "宣公", english: "Duke Xuan", years: "608–591 BCE" },
  { file: "08_成公.txt", chinese: "成公", english: "Duke Cheng", years: "590–573 BCE" },
  { file: "09_襄公.txt", chinese: "襄公", english: "Duke Xiang", years: "572–542 BCE" },
  { file: "10_昭公.txt", chinese: "昭公", english: "Duke Zhao", years: "541–510 BCE" },
  { file: "11_定公.txt", chinese: "定公", english: "Duke Ding", years: "509–495 BCE" },
  { file: "12_哀公.txt", chinese: "哀公", english: "Duke Ai", years: "494–468 BCE" },
];

function processFile(filePath: string): { index: number; text: string }[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split("\n");
  const paragraphs: { index: number; text: string }[] = [];
  let paragraphIndex = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip blank lines
    if (!line) {
      i++;
      continue;
    }

    // Detect year header block: ====, title, ====
    if (line === "====================" && i + 2 < lines.length) {
      const titleLine = lines[i + 1]?.trim();
      const closingLine = lines[i + 2]?.trim();

      if (closingLine === "====================") {
        // This is a year header — add as a marked paragraph
        paragraphs.push({
          index: paragraphIndex++,
          text: `【${titleLine}】`,
        });
        i += 3; // Skip past the header block
        continue;
      }
    }

    // Skip standalone separator lines (shouldn't happen after above logic, but safety)
    if (line === "====================") {
      i++;
      continue;
    }

    // Regular content line — this is a chronicle entry with commentary
    paragraphs.push({
      index: paragraphIndex++,
      text: line,
    });
    i++;
  }

  return paragraphs;
}

function main() {
  console.log("Processing Guliang Zhuan (穀梁傳)...\n");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalParagraphs = 0;

  for (let chapterIdx = 0; chapterIdx < DUKES.length; chapterIdx++) {
    const duke = DUKES[chapterIdx];
    const chapterNumber = chapterIdx + 1;
    const filePath = path.join(RAW_DIR, duke.file);

    if (!fs.existsSync(filePath)) {
      console.error(`  [err] File not found: ${filePath}`);
      continue;
    }

    const paragraphs = processFile(filePath);
    totalParagraphs += paragraphs.length;

    const title = `${duke.chinese} (${duke.english}, ${duke.years})`;

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
      `  Chapter ${chapterNumber}: ${duke.chinese} (${duke.english}) — ${paragraphs.length} paragraphs → ${fileName}`
    );
  }

  console.log(`\nDone. ${DUKES.length} chapters, ${totalParagraphs} total paragraphs.`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

main();
