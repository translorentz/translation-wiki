/**
 * Processes the Gaoshi Zhuan (高士傳) raw text into structured JSON.
 *
 * The raw file is a single 185-line text with:
 * - Line 1: 序 (Preface title)
 * - Line 2: Preface text
 * - Line 3: 卷上被衣 (Volume 1 header merged with first entry name)
 * - Lines 4-58: Volume 1 entries (name + biography pairs)
 * - Line 59: 卷中漢陰丈人 (Volume 2 header merged with first entry name)
 * - Lines 60-128: Volume 2 entries
 * - Line 129: 卷下王霸 (Volume 3 header merged with first entry name)
 * - Lines 130-185: Volume 3 entries
 *
 * Each biography entry is 2 lines: person's name, then biography text.
 * Exception: 丘訢 (line 145-147) has a third line with a verse eulogy.
 *
 * Output: 4 chapter JSON files (Preface + 3 Volumes)
 *
 * Usage: pnpm tsx scripts/process-gaoshi-zhuan.ts
 */

import fs from "fs";
import path from "path";

const RAW_FILE = path.resolve("data/raw/gaoshi_zhuan/高士傳.txt");
const OUTPUT_DIR = path.resolve("data/processed/gaoshizhuan");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

/**
 * Parse a volume's lines into biography entries.
 * Each entry is a name line followed by one or more biography lines.
 * The general pattern is name + single biography line, but some entries
 * (e.g., 丘訢) have additional verse/eulogy lines.
 */
function parseVolumeEntries(
  lines: string[]
): { name: string; biographyLines: string[] }[] {
  const entries: { name: string; biographyLines: string[] }[] = [];

  let i = 0;
  while (i < lines.length) {
    const nameLine = lines[i].trim();
    if (!nameLine) {
      i++;
      continue;
    }

    // This line is the person's name
    const entry = { name: nameLine, biographyLines: [] as string[] };

    // Next line(s) are biography text
    i++;
    while (i < lines.length) {
      const nextLine = lines[i].trim();
      if (!nextLine) {
        i++;
        continue;
      }

      // Check if this line looks like a person's name (short, no punctuation marks typical of prose)
      // Names are typically 2-5 characters with no commas, periods, or quotation marks
      // Biography lines are longer and contain punctuation
      const isLikelyName =
        nextLine.length <= 6 &&
        !nextLine.includes("，") &&
        !nextLine.includes("。") &&
        !nextLine.includes("「") &&
        !nextLine.includes("：");

      // Also check if this could be a continuation (verse eulogy) -- these are longer
      // and contain parallel prose markers like commas
      if (isLikelyName && entry.biographyLines.length > 0) {
        // This is the next person's name, stop here
        break;
      }

      entry.biographyLines.push(nextLine);
      i++;
    }

    if (entry.biographyLines.length > 0) {
      entries.push(entry);
    }
  }

  return entries;
}

function main() {
  if (!fs.existsSync(RAW_FILE)) {
    console.error(`Raw file not found: ${RAW_FILE}`);
    process.exit(1);
  }

  const rawText = fs.readFileSync(RAW_FILE, "utf-8");
  const allLines = rawText.split("\n").filter((_, idx, arr) => {
    // Keep all lines but trim trailing empty
    return true;
  });

  // Remove trailing empty lines
  while (allLines.length > 0 && allLines[allLines.length - 1].trim() === "") {
    allLines.pop();
  }

  console.log(`Total lines (non-empty end): ${allLines.length}`);
  console.log(`Line 1: "${allLines[0]}"`);
  console.log(`Line 2 (first 30 chars): "${allLines[1].substring(0, 30)}..."`);
  console.log(`Line 3: "${allLines[2]}"`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const chapters: ProcessedChapter[] = [];

  // ============================================================
  // Chapter 1: Preface (序)
  // ============================================================
  const prefaceTitle = allLines[0].trim(); // 序
  const prefaceText = allLines[1].trim();

  chapters.push({
    chapterNumber: 1,
    title: "序 (Preface)",
    sourceContent: {
      paragraphs: [{ index: 0, text: prefaceText }],
    },
  });

  // ============================================================
  // Find volume boundaries
  // ============================================================
  // Line indices (0-based): line 2 = 卷上被衣, line 58 = 卷中漢陰丈人, line 128 = 卷下王霸
  const volumeHeaders = [
    { lineIndex: 2, prefix: "卷上", title: "卷上 (Volume 1)", chapterNumber: 2 },
    { lineIndex: -1, prefix: "卷中", title: "卷中 (Volume 2)", chapterNumber: 3 },
    { lineIndex: -1, prefix: "卷下", title: "卷下 (Volume 3)", chapterNumber: 4 },
  ];

  // Find actual line indices for volume headers
  for (let i = 2; i < allLines.length; i++) {
    const line = allLines[i].trim();
    if (line.startsWith("卷中")) {
      volumeHeaders[1].lineIndex = i;
    } else if (line.startsWith("卷下")) {
      volumeHeaders[2].lineIndex = i;
    }
  }

  console.log(
    `\nVolume boundaries: V1@line${volumeHeaders[0].lineIndex + 1}, V2@line${volumeHeaders[1].lineIndex + 1}, V3@line${volumeHeaders[2].lineIndex + 1}`
  );

  // ============================================================
  // Process each volume
  // ============================================================
  for (let v = 0; v < volumeHeaders.length; v++) {
    const vol = volumeHeaders[v];
    const headerLine = allLines[vol.lineIndex].trim();

    // Extract first entry name from merged header (e.g., "卷上被衣" → "被衣")
    const firstName = headerLine.replace(vol.prefix, "");

    // Determine end of this volume
    const endIndex =
      v < volumeHeaders.length - 1
        ? volumeHeaders[v + 1].lineIndex
        : allLines.length;

    // Build the lines for this volume: first entry name + rest of lines
    const volumeLines = [firstName, ...allLines.slice(vol.lineIndex + 1, endIndex)];

    // Parse entries
    const entries = parseVolumeEntries(volumeLines);

    // Convert entries to paragraphs (name as header paragraph, biography as content paragraph)
    const paragraphs: { index: number; text: string }[] = [];
    let paragraphIndex = 0;

    for (const entry of entries) {
      // Person's name as a section header paragraph
      paragraphs.push({ index: paragraphIndex, text: entry.name });
      paragraphIndex++;

      // Biography text (join multiple lines with newline if there are continuation lines)
      const bioText = entry.biographyLines.join("\n");
      paragraphs.push({ index: paragraphIndex, text: bioText });
      paragraphIndex++;
    }

    chapters.push({
      chapterNumber: vol.chapterNumber,
      title: vol.title,
      sourceContent: { paragraphs },
    });

    console.log(
      `  ${vol.title}: ${entries.length} entries → ${paragraphs.length} paragraphs`
    );
  }

  // ============================================================
  // Write output files
  // ============================================================
  for (const chapter of chapters) {
    const fileName = `chapter-${String(chapter.chapterNumber).padStart(3, "0")}.json`;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, fileName),
      JSON.stringify(chapter, null, 2) + "\n"
    );
    console.log(
      `  → ${fileName}: "${chapter.title}" (${chapter.sourceContent.paragraphs.length} paragraphs)`
    );
  }

  console.log(`\nDone. Output: ${OUTPUT_DIR}`);
  console.log(`Total chapters: ${chapters.length}`);
}

main();
