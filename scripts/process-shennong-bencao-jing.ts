/**
 * Process Shennong Bencao Jing (Divine Farmer's Classic of Materia Medica)
 *
 * Structure: 3 main sections (上經/中經/下經), each with subsections by material type.
 * The preface (序) becomes chapter 1, then each subsection header becomes a chapter.
 * Within each chapter, entries are separated by blank lines.
 */

import fs from "fs";
import path from "path";

const RAW_FILE = path.resolve(__dirname, "../data/raw/shennong_bencao_jing/shennong_bencao_jing.txt");
const OUTPUT_DIR = path.resolve(__dirname, "../data/processed/shennong-bencao-jing");

// Subsection headers and their English translations
const SUBSECTION_TITLES: Record<string, string> = {
  "玉石部上品": "Jade and Stone — Upper Grade",
  "草部上品": "Herbs — Upper Grade",
  "木部上品": "Trees — Upper Grade",
  "米穀部上品": "Grains — Upper Grade",
  "蟲獸部上品": "Insects and Animals — Upper Grade",
  "果菜部上品": "Fruits and Vegetables — Upper Grade",
  "玉石部中品": "Jade and Stone — Middle Grade",
  "草部中品": "Herbs — Middle Grade",
  "木部中品": "Trees — Middle Grade",
  "米穀部中品": "Grains — Middle Grade",
  "蟲獸部中品": "Insects and Animals — Middle Grade",
  "果菜部中品": "Fruits and Vegetables — Middle Grade",
  "玉石部下品": "Jade and Stone — Lower Grade",
  "草部下品": "Herbs — Lower Grade",
  "木部下品": "Trees — Lower Grade",
  "米穀部下品": "Grains — Lower Grade",
  "蟲獸部下品": "Insects and Animals — Lower Grade",
  "果菜部下品": "Fruits and Vegetables — Lower Grade",
};

// Also match the section headers that appear on their own lines
const SECTION_HEADERS = new Set(["上經", "中經", "下經"]);

interface Chapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

function isSubsectionHeader(line: string): string | null {
  const trimmed = line.trim();
  if (SUBSECTION_TITLES[trimmed]) return trimmed;
  return null;
}

function main() {
  const rawText = fs.readFileSync(RAW_FILE, "utf-8");
  const lines = rawText.split("\n");

  const chapters: Chapter[] = [];
  let chapterNum = 0;

  // Chapter 1: Preface (序) — lines before the first subsection header
  // The raw file starts with 上經, then 序, then preface text, then 玉石部上品
  const prefaceParagraphs: string[] = [];
  let i = 0;

  // Collect preface lines until we hit the first subsection header
  while (i < lines.length) {
    const header = isSubsectionHeader(lines[i].trim());
    if (header) break;

    const trimmed = lines[i].trim();
    // Skip section headers like 上經, 中經, 下經 and the 序 label
    if (trimmed && !SECTION_HEADERS.has(trimmed) && trimmed !== "序") {
      prefaceParagraphs.push(trimmed);
    }
    i++;
  }

  if (prefaceParagraphs.length > 0) {
    chapterNum++;
    chapters.push({
      chapterNumber: chapterNum,
      title: "序 (Preface)",
      sourceContent: {
        paragraphs: prefaceParagraphs.map((text, idx) => ({ index: idx, text })),
      },
    });
  }

  // Process subsection chapters
  while (i < lines.length) {
    const header = isSubsectionHeader(lines[i].trim());
    if (header) {
      chapterNum++;
      const englishTitle = SUBSECTION_TITLES[header];
      const title = `${header} (${englishTitle})`;

      // Collect entries until next subsection header or section header
      i++;
      const entries: string[] = [];
      let currentEntry = "";

      while (i < lines.length) {
        const trimmed = lines[i].trim();

        // Check if this is a new subsection header
        if (isSubsectionHeader(trimmed)) break;

        // Skip bare section headers (上經, 中經, 下經)
        if (SECTION_HEADERS.has(trimmed)) {
          i++;
          continue;
        }

        if (trimmed === "") {
          // Blank line = entry separator
          if (currentEntry) {
            entries.push(currentEntry);
            currentEntry = "";
          }
        } else {
          // Continuation or new content
          if (currentEntry) {
            currentEntry += trimmed;
          } else {
            currentEntry = trimmed;
          }
        }
        i++;
      }

      // Don't forget the last entry
      if (currentEntry) {
        entries.push(currentEntry);
      }

      if (entries.length > 0) {
        chapters.push({
          chapterNumber: chapterNum,
          title,
          sourceContent: {
            paragraphs: entries.map((text, idx) => ({ index: idx, text })),
          },
        });
      }
    } else {
      i++;
    }
  }

  // Write output
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const chapter of chapters) {
    const filename = `chapter-${String(chapter.chapterNumber).padStart(3, "0")}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(chapter, null, 2), "utf-8");
  }

  console.log(`Processed ${chapters.length} chapters:`);
  for (const ch of chapters) {
    console.log(`  Chapter ${ch.chapterNumber}: ${ch.title} (${ch.sourceContent.paragraphs.length} paragraphs)`);
  }
}

main();
