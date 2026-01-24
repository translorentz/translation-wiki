/**
 * Processes the Fengsu Tongyi (風俗通義) raw text into structured JSON.
 *
 * The raw files are in data/raw/Fengsu_Tongyi_Chapters/ named 01-11 with Chinese titles.
 * File 01 is the Preface (no section separators).
 * Files 02-11 are the 10 numbered chapters, each containing:
 * - An introductory paragraph
 * - Sections separated by ==================== lines
 * - Section titles between separator lines (e.g., "三皇", "五帝")
 * - Content paragraphs separated by blank lines
 *
 * Processing rules:
 * - Strip ==================== separator lines
 * - Strip blank lines
 * - Each remaining non-blank line becomes its own paragraph
 *   (section headers between separators are KEPT as their own paragraph,
 *    as they are meaningful section titles within each chapter)
 * - Trim whitespace from each paragraph
 *
 * Output: data/processed/fengsutongyi/chapter-NNN.json (11 files)
 *   chapter-001 = Preface (序)
 *   chapter-002 through chapter-011 = Chapters 1-10
 *
 * Usage: pnpm tsx scripts/process-fengsu-tongyi.ts
 */

import fs from "fs";
import path from "path";

const RAW_DIR = path.resolve("data/raw/Fengsu_Tongyi_Chapters");
const OUTPUT_DIR = path.resolve("data/processed/fengsutongyi");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

// File-to-chapter mapping with titles
const FILE_MAP: { file: string; chapterNumber: number; title: string }[] = [
  { file: "01_風俗通義序.txt", chapterNumber: 1, title: "風俗通義序 (Preface)" },
  { file: "02_皇霸第一.txt", chapterNumber: 2, title: "皇霸第一 (Kings and Hegemons)" },
  { file: "03_正失第二.txt", chapterNumber: 3, title: "正失第二 (Correcting Errors)" },
  { file: "04_愆禮第三.txt", chapterNumber: 4, title: "愆禮第三 (Ritual Violations)" },
  { file: "05_過譽第四.txt", chapterNumber: 5, title: "過譽第四 (Excessive Praise)" },
  { file: "06_十反第五.txt", chapterNumber: 6, title: "十反第五 (Ten Reversals)" },
  { file: "07_聲音第六.txt", chapterNumber: 7, title: "聲音第六 (Sounds and Music)" },
  { file: "08_窮通第七.txt", chapterNumber: 8, title: "窮通第七 (Adversity and Success)" },
  { file: "09_祀典第八.txt", chapterNumber: 9, title: "祀典第八 (Sacrificial Rites)" },
  { file: "10_怪神第九.txt", chapterNumber: 10, title: "怪神第九 (Strange Spirits)" },
  { file: "11_山澤第十.txt", chapterNumber: 11, title: "山澤第十 (Mountains and Marshes)" },
];

const SEPARATOR = "====================";

function processFile(filePath: string): string[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split("\n");

  const paragraphs: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip separator lines
    if (trimmed === SEPARATOR) {
      continue;
    }

    // Skip blank lines
    if (!trimmed) {
      continue;
    }

    // Each non-blank, non-separator line is its own paragraph.
    // In these Classical Chinese source files, each line represents
    // a distinct paragraph or section header.
    paragraphs.push(trimmed);
  }

  return paragraphs;
}

function main() {
  console.log(`Processing Fengsu Tongyi (風俗通義)...`);
  console.log(`  Raw dir: ${RAW_DIR}`);
  console.log(`  Output dir: ${OUTPUT_DIR}`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalParagraphs = 0;

  for (const entry of FILE_MAP) {
    const filePath = path.join(RAW_DIR, entry.file);

    if (!fs.existsSync(filePath)) {
      console.error(`  [ERROR] File not found: ${entry.file}`);
      continue;
    }

    const paragraphs = processFile(filePath);

    const chapter: ProcessedChapter = {
      chapterNumber: entry.chapterNumber,
      title: entry.title,
      sourceContent: {
        paragraphs: paragraphs.map((text, idx) => ({
          index: idx + 1,
          text,
        })),
      },
    };

    const fileName = `chapter-${String(entry.chapterNumber).padStart(3, "0")}.json`;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, fileName),
      JSON.stringify(chapter, null, 2) + "\n"
    );

    totalParagraphs += paragraphs.length;
    console.log(
      `  Chapter ${entry.chapterNumber}: "${entry.title}" — ${paragraphs.length} paragraphs -> ${fileName}`
    );
  }

  console.log(`\nDone. ${FILE_MAP.length} chapters, ${totalParagraphs} total paragraphs.`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

main();
