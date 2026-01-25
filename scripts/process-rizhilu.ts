/**
 * Processes the Rizhilu (日知錄) raw text into structured JSON.
 *
 * Source: Project Gutenberg eBook #25262
 * Author: Gu Yanwu (顧炎武, 1613-1682)
 *
 * The raw file structure:
 * - Lines 1-28: Project Gutenberg header (stripped)
 * - Lines 29-40: Title, author credit, preface
 * - Lines 42-16521: 32 volumes of content
 * - Lines 16530+: Project Gutenberg footer (stripped)
 *
 * Volume markers: ●卷一, ●卷二, ... ●卷三十二
 * Section markers: ○三易, ○重卦不始文王, etc.
 *
 * Each volume becomes one chapter.
 * Each section (○) becomes one paragraph within that chapter.
 *
 * Usage: pnpm tsx scripts/process-rizhilu.ts
 */

import fs from "fs";
import path from "path";

const RAW_FILE = path.resolve("data/raw/rizhilu/pg25262.txt");
const OUTPUT_DIR = path.resolve("data/processed/rizhilu");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

// Chinese numeral to Arabic numeral conversion
const CHINESE_NUMERALS: Record<string, number> = {
  "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
  "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
  "十一": 11, "十二": 12, "十三": 13, "十四": 14, "十五": 15,
  "十六": 16, "十七": 17, "十八": 18, "十九": 19, "二十": 20,
  "二十一": 21, "二十二": 22, "二十三": 23, "二十四": 24, "二十五": 25,
  "二十六": 26, "二十七": 27, "二十八": 28, "二十九": 29, "三十": 30,
  "三十一": 31, "三十二": 32,
};

function parseChineseNumeral(str: string): number {
  // Direct lookup first
  if (CHINESE_NUMERALS[str]) {
    return CHINESE_NUMERALS[str];
  }
  // Fallback for any edge cases
  return 0;
}

function main() {
  console.log("Processing Rizhilu (日知錄)...\n");

  const raw = fs.readFileSync(RAW_FILE, "utf-8");
  const allLines = raw.split("\n");

  console.log(`Total lines in source file: ${allLines.length}`);

  // Find the content boundaries
  const startMarker = "*** START OF THE PROJECT GUTENBERG EBOOK";
  const endMarker = "*** END OF THE PROJECT GUTENBERG EBOOK";

  let startLine = 0;
  let endLine = allLines.length;

  for (let i = 0; i < allLines.length; i++) {
    if (allLines[i].includes(startMarker)) {
      startLine = i + 1;
    }
    if (allLines[i].includes(endMarker)) {
      endLine = i;
      break;
    }
  }

  console.log(`Content starts at line ${startLine + 1}, ends at line ${endLine}`);

  // Extract content lines (skip the Gutenberg header)
  const contentLines = allLines.slice(startLine, endLine);

  // Find where the actual book content starts (after "顧炎武著" and preface)
  let bookStart = 0;
  for (let i = 0; i < contentLines.length; i++) {
    if (contentLines[i].includes("●卷一")) {
      bookStart = i;
      break;
    }
  }

  // Extract preface (between "序" and ●卷一)
  let preface = "";
  for (let i = 0; i < bookStart; i++) {
    const line = contentLines[i].trim();
    if (line === "序") {
      // Collect preface lines
      for (let j = i + 1; j < bookStart; j++) {
        const prefaceLine = contentLines[j].trim();
        if (prefaceLine && !prefaceLine.includes("●")) {
          preface += prefaceLine;
        }
      }
      break;
    }
  }

  console.log(`Preface found: ${preface.length} characters`);
  console.log(`Book content starts at line ${bookStart + startLine + 1}\n`);

  // Parse volumes
  interface Volume {
    number: number;
    title: string;
    sections: { title: string; content: string }[];
  }

  const volumes: Volume[] = [];
  let currentVolume: Volume | null = null;
  let currentSection: { title: string; content: string } | null = null;
  let lineBuffer: string[] = [];

  for (let i = bookStart; i < contentLines.length; i++) {
    let line = contentLines[i];

    // Check for volume marker (might be inline with previous text)
    const volumeMatch = line.match(/●卷([\u4e00-\u9fa5]+)/);
    if (volumeMatch) {
      // Save previous section if any
      if (currentSection && lineBuffer.length > 0) {
        currentSection.content = lineBuffer.join("").trim();
        lineBuffer = [];
      }

      // Save previous volume if any
      if (currentVolume) {
        volumes.push(currentVolume);
      }

      const volumeNum = parseChineseNumeral(volumeMatch[1]);
      currentVolume = {
        number: volumeNum,
        title: `卷${volumeMatch[1]}`,
        sections: [],
      };
      currentSection = null;

      // Handle case where volume marker is inline with text
      const idx = line.indexOf("●卷");
      if (idx > 0) {
        // Text before the marker belongs to previous section
        const beforeMarker = line.substring(0, idx).trim();
        if (beforeMarker && volumes.length > 0) {
          const lastVol = volumes[volumes.length - 1];
          if (lastVol.sections.length > 0) {
            lastVol.sections[lastVol.sections.length - 1].content += beforeMarker;
          }
        }
      }

      console.log(`  Found volume: ${currentVolume.title} (volume ${volumeNum})`);
      continue;
    }

    // Check for section marker
    if (line.startsWith("○")) {
      // Save previous section
      if (currentSection && lineBuffer.length > 0) {
        currentSection.content = lineBuffer.join("").trim();
        lineBuffer = [];
      }

      // Start new section
      const sectionTitle = line.substring(1).trim(); // Remove ○
      currentSection = { title: sectionTitle, content: "" };
      if (currentVolume) {
        currentVolume.sections.push(currentSection);
      }
      continue;
    }

    // Regular content line
    const trimmed = line.trim();
    if (trimmed) {
      lineBuffer.push(trimmed);
    }
  }

  // Save last section and volume
  if (currentSection && lineBuffer.length > 0) {
    currentSection.content = lineBuffer.join("").trim();
  }
  if (currentVolume) {
    volumes.push(currentVolume);
  }

  console.log(`\nTotal volumes parsed: ${volumes.length}`);

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Write chapters
  let totalSections = 0;
  let totalChars = 0;

  for (const volume of volumes) {
    const paragraphs: { index: number; text: string }[] = [];

    // Add preface to volume 1
    if (volume.number === 1 && preface) {
      paragraphs.push({
        index: 1,
        text: `○序\n${preface}`,
      });
    }

    // Add sections as paragraphs
    for (const section of volume.sections) {
      const paragraphIndex = paragraphs.length + 1;
      // Include section title in the paragraph text for context
      const text = section.content
        ? `○${section.title}\n${section.content}`
        : `○${section.title}`;
      paragraphs.push({ index: paragraphIndex, text });
    }

    const chapter: ProcessedChapter = {
      chapterNumber: volume.number,
      title: `日知錄 ${volume.title} (Rizhilu Vol. ${volume.number})`,
      sourceContent: { paragraphs },
    };

    const fileName = `chapter-${String(volume.number).padStart(3, "0")}.json`;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, fileName),
      JSON.stringify(chapter, null, 2) + "\n"
    );

    const charCount = paragraphs.reduce((sum, p) => sum + p.text.length, 0);
    totalSections += volume.sections.length;
    totalChars += charCount;

    console.log(
      `  Chapter ${volume.number}: "${volume.title}" — ${paragraphs.length} paragraphs, ${charCount.toLocaleString()} chars → ${fileName}`
    );
  }

  console.log(`\n========================================`);
  console.log(`Processing complete!`);
  console.log(`  Total chapters: ${volumes.length}`);
  console.log(`  Total sections: ${totalSections}`);
  console.log(`  Total characters: ${totalChars.toLocaleString()}`);
  console.log(`  Output: ${OUTPUT_DIR}`);
  console.log(`========================================\n`);
}

main();
