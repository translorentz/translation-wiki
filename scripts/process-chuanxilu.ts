/**
 * Processes the raw Chuan Xi Lu (傳習錄) text files into structured JSON.
 *
 * Each volume (卷) becomes a chapter. Each numbered section within a volume
 * becomes a paragraph. Bracketed reference numbers like [1], [13] are removed.
 */

import fs from "fs";
import path from "path";

const RAW_DIR = path.resolve("data/raw/chuanxilu");
const OUT_DIR = path.resolve("data/processed/chuanxilu");

interface Paragraph {
  index: number;
  text: string;
}

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: Paragraph[];
  };
}

function cleanText(text: string): string {
  // Remove bracketed reference numbers like [1], [13], [57]
  return text.replace(/\[\d+\]/g, "").trim();
}

function processVolume(
  rawText: string,
  chapterNumber: number,
  title: string
): ProcessedChapter {
  const lines = rawText.split("\n");
  const paragraphs: Paragraph[] = [];
  let currentSection: string[] = [];
  let paragraphIndex = 0;

  function flushSection() {
    if (currentSection.length === 0) return;
    const text = cleanText(currentSection.join("\n").trim());
    if (text) {
      paragraphs.push({ index: paragraphIndex, text });
      paragraphIndex++;
    }
    currentSection = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if line is a standalone section number (just a number on its own line)
    if (/^\d+$/.test(trimmed)) {
      // Flush previous section
      flushSection();
      continue;
    }

    if (trimmed === "") {
      // Blank line: if we have content, it's a paragraph break within a section
      // We group all text between section numbers as one paragraph
      if (currentSection.length > 0) {
        currentSection.push("");
      }
      continue;
    }

    currentSection.push(trimmed);
  }

  // Flush last section
  flushSection();

  return {
    chapterNumber,
    title,
    sourceContent: { paragraphs },
  };
}

function main() {
  if (!fs.existsSync(RAW_DIR)) {
    console.error(`Raw directory not found: ${RAW_DIR}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const volumes = [
    { file: "卷上.txt", chapterNumber: 1, title: "卷上 (Volume 1)" },
    { file: "卷中.txt", chapterNumber: 2, title: "卷中 (Volume 2)" },
    { file: "卷下.txt", chapterNumber: 3, title: "卷下 (Volume 3)" },
  ];

  for (const vol of volumes) {
    const filePath = path.join(RAW_DIR, vol.file);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      continue;
    }

    const rawText = fs.readFileSync(filePath, "utf-8");
    const chapter = processVolume(rawText, vol.chapterNumber, vol.title);

    const outPath = path.join(OUT_DIR, `chapter-${vol.chapterNumber}.json`);
    fs.writeFileSync(outPath, JSON.stringify(chapter, null, 2), "utf-8");

    console.log(
      `Processed ${vol.file} → chapter-${vol.chapterNumber}.json (${chapter.sourceContent.paragraphs.length} paragraphs)`
    );
  }

  console.log("\nDone.");
}

main();
