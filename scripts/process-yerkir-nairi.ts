/**
 * Processes Yeghishe Charents' "Yerkir Nairi" (Land of Nairi) raw text into structured JSON.
 *
 * The raw files are organized as:
 * - 01_Առաջաբան.txt: Preface (Arajaban)
 * - 02_Մասն_առաջին.txt: Part One (Masn Arajin)
 * - 03_Մասն_առաջին.txt: Part Two (Masn Erkrord)
 * - 04_Մասն_երրորդ_և_վերջին.txt: Part Three and Final (Masn Yerrord yev Verjin)
 * - 05_Վերջաբան.txt: Epilogue (Verjaban)
 *
 * The text uses zero-width spaces (U+200B) as section/paragraph markers.
 * Each large part is split into chapters of roughly 10-15 sections each.
 *
 * Usage: pnpm tsx scripts/process-yerkir-nairi.ts
 */

import fs from "fs";
import path from "path";

const RAW_DIR = path.resolve("data/raw/yerkir_nairi");
const OUTPUT_DIR = path.resolve("data/processed/yerkir-nairi");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

// Structure of the book
interface PartConfig {
  file: string;
  titleArm: string;
  titleEng: string;
  subtitle?: string;
  sectionsPerChapter: number;
}

const PARTS: PartConfig[] = [
  {
    file: "01_Առաջաբան.txt",
    titleArm: "Առաջաբան",
    titleEng: "Preface",
    sectionsPerChapter: 999, // Keep as single chapter
  },
  {
    file: "02_Մասն_առաջին.txt",
    titleArm: "Մասն առաջին",
    titleEng: "Part One: The City and Its Inhabitants",
    subtitle: "Քաղաք և իր բնակիչներ",
    sectionsPerChapter: 12,
  },
  {
    file: "03_Մասն_երկրորդ.txt",
    titleArm: "Մասն երկրորդ",
    titleEng: "Part Two: Toward Nairi",
    subtitle: "Դեպի Նաիրի",
    sectionsPerChapter: 12,
  },
  {
    file: "04_Մասն_երրորդ_և_վերջին.txt",
    titleArm: "Մասն երրորդ և վերջին",
    titleEng: "Part Three and Final: The Land of Nairi",
    subtitle: "Դեպի Նաիրի",
    sectionsPerChapter: 12,
  },
  {
    file: "05_Վերջաբան.txt",
    titleArm: "Վերջաբան",
    titleEng: "Epilogue",
    sectionsPerChapter: 999, // Keep as single chapter
  },
];

function findRawFile(partialName: string): string | null {
  const files = fs.readdirSync(RAW_DIR);
  // Match by the number prefix
  const prefix = partialName.substring(0, 2); // "01", "02", etc.
  const match = files.find((f) => f.startsWith(prefix));
  return match ? path.join(RAW_DIR, match) : null;
}

function splitBySections(content: string): string[] {
  // Split by zero-width space (U+200B)
  const sections = content.split("\u200B");
  return sections.map((s) => s.trim()).filter((s) => s.length > 0);
}

function cleanSection(text: string): string {
  // Remove any leading/trailing whitespace
  let cleaned = text.trim();

  // Normalize multiple newlines to single newlines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned;
}

function createParagraphsFromSections(sections: string[]): { index: number; text: string }[] {
  const paragraphs: { index: number; text: string }[] = [];
  let paragraphIndex = 0;

  for (const section of sections) {
    // Split section by newlines to create individual paragraphs
    const lines = section.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    for (const line of lines) {
      paragraphs.push({
        index: paragraphIndex++,
        text: line,
      });
    }
  }

  return paragraphs;
}

function main() {
  console.log("Processing Yerkir Nairi (Land of Nairi) by Yeghishe Charents");
  console.log("=".repeat(60));

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let globalChapterNumber = 0;
  const chapters: ProcessedChapter[] = [];

  for (const part of PARTS) {
    const rawFile = findRawFile(part.file);
    if (!rawFile) {
      console.error(`  [err] Could not find file matching: ${part.file}`);
      continue;
    }

    console.log(`\nProcessing: ${path.basename(rawFile)}`);
    console.log(`  Title: ${part.titleEng}`);

    const content = fs.readFileSync(rawFile, "utf-8");
    const sections = splitBySections(content);
    console.log(`  Found ${sections.length} sections`);

    // Determine how to split into chapters
    const numChapters = Math.ceil(sections.length / part.sectionsPerChapter);

    for (let chapterIdx = 0; chapterIdx < numChapters; chapterIdx++) {
      globalChapterNumber++;
      const startSection = chapterIdx * part.sectionsPerChapter;
      const endSection = Math.min(startSection + part.sectionsPerChapter, sections.length);
      const chapterSections = sections.slice(startSection, endSection);

      // Create chapter title
      let title: string;
      if (numChapters === 1) {
        title = `${part.titleArm} — ${part.titleEng}`;
      } else {
        title = `${part.titleArm} (${chapterIdx + 1}/${numChapters}) — ${part.titleEng}`;
      }

      const paragraphs = createParagraphsFromSections(chapterSections.map(cleanSection));

      const chapter: ProcessedChapter = {
        chapterNumber: globalChapterNumber,
        title,
        sourceContent: { paragraphs },
      };

      chapters.push(chapter);

      console.log(
        `    Chapter ${globalChapterNumber}: sections ${startSection + 1}-${endSection}, ${paragraphs.length} paragraphs`
      );
    }
  }

  // Write all chapters to files
  console.log("\nWriting chapter files...");
  for (const chapter of chapters) {
    const fileName = `chapter-${String(chapter.chapterNumber).padStart(3, "0")}.json`;
    fs.writeFileSync(path.join(OUTPUT_DIR, fileName), JSON.stringify(chapter, null, 2) + "\n");
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log(`Total chapters: ${chapters.length}`);
  console.log(`Total paragraphs: ${chapters.reduce((sum, c) => sum + c.sourceContent.paragraphs.length, 0)}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main();
