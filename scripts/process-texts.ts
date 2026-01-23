/**
 * Processes raw text files into structured paragraph-aligned JSON format
 * suitable for database seeding.
 *
 * Usage: pnpm process:texts [--text zhuziyulei|ceremonialis]
 *
 * Input:  data/raw/{text}/
 * Output: data/processed/{text}/chapter-NNN.json
 *
 * Output format per chapter:
 * {
 *   chapterNumber: number,
 *   title: string,
 *   sourceContent: {
 *     paragraphs: [{ index: number, text: string }]
 *   }
 * }
 */

import fs from "fs";
import path from "path";

// ============================================================
// Zhu Zi Yu Lei processing
// ============================================================

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

function processZhuziYulei(): void {
  const rawDir = path.resolve("data/raw/zhuziyulei");
  const outDir = path.resolve("data/processed/zhuziyulei");

  if (!fs.existsSync(rawDir)) {
    console.error(`Raw directory not found: ${rawDir}`);
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });

  // Support both chapter_N.txt and chapter-NNN.json formats
  const files = fs
    .readdirSync(rawDir)
    .filter((f) => f.startsWith("chapter") && (f.endsWith(".txt") || f.endsWith(".json")))
    .sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""));
      const numB = parseInt(b.replace(/\D/g, ""));
      return numA - numB;
    });

  if (files.length === 0) {
    console.error("No chapter files found in raw directory.");
    return;
  }

  console.log(`Processing ${files.length} chapters of Zhu Zi Yu Lei...\n`);

  let totalParagraphs = 0;

  for (const file of files) {
    const chapterNumber = parseInt(file.replace(/\D/g, ""));
    let title: string;
    let rawParagraphs: string[];

    if (file.endsWith(".txt")) {
      // Plain text format: first line is title, subsequent lines are paragraphs
      const content = fs.readFileSync(path.join(rawDir, file), "utf-8");
      const lines = content.split("\n");
      title = lines[0]?.trim() ?? `Chapter ${chapterNumber}`;
      rawParagraphs = lines.slice(1);
    } else {
      // JSON format from ctext API: { title, fulltext: string[] }
      const raw = JSON.parse(fs.readFileSync(path.join(rawDir, file), "utf-8"));
      title = raw.title;
      rawParagraphs = raw.fulltext;
    }

    // Filter out empty paragraphs and trim whitespace
    const paragraphs = rawParagraphs
      .map((text) => text.trim())
      .filter((text) => text.length > 0)
      .map((text, i) => ({ index: i, text }));

    const processed: ProcessedChapter = {
      chapterNumber,
      title,
      sourceContent: { paragraphs },
    };

    const outFile = path.join(outDir, `chapter-${String(chapterNumber).padStart(3, "0")}.json`);
    fs.writeFileSync(outFile, JSON.stringify(processed, null, 2), "utf-8");
    totalParagraphs += paragraphs.length;

    process.stdout.write(
      `  [${chapterNumber}] ${title} — ${paragraphs.length} paragraphs\n`
    );
  }

  console.log(`\nZhu Zi Yu Lei: ${files.length} chapters, ${totalParagraphs} total paragraphs`);
}

// ============================================================
// De Ceremoniis processing
// ============================================================

function processDeCeremoniis(): void {
  const rawDir = path.resolve("data/raw/ceremonialis");
  const outDir = path.resolve("data/processed/ceremonialis");
  const rawFile = path.join(rawDir, "ceremonialis.txt");

  if (!fs.existsSync(rawFile)) {
    console.error(`Raw file not found: ${rawFile}`);
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });

  const fullText = fs.readFileSync(rawFile, "utf-8");
  const lines = fullText.split("\n");

  // Filter to non-empty lines
  const contentLines = lines
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  console.log(`Processing De Ceremoniis (${contentLines.length} non-empty lines)...\n`);

  // Structure: first line is the file title/header.
  // Lines starting with a number pattern like "1.3" or "2.41" are chapter/section markers
  // (book.page reference from the Reiske edition). Each such line starts a new chapter.
  // All other lines are paragraphs within the current chapter.

  const chapterMarkerPattern = /^(\d+)\.(\d+)\s/;

  interface ChapterAccum {
    number: number;
    title: string;
    paragraphs: string[];
  }

  const chapters: ChapterAccum[] = [];
  let current: ChapterAccum | null = null;

  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i];

    if (i === 0) {
      // Skip the file header line
      continue;
    }

    const match = line.match(chapterMarkerPattern);
    if (match) {
      // Save previous chapter if it has content
      if (current && current.paragraphs.length > 0) {
        chapters.push(current);
      }
      const titleText = cleanTitle(line);
      current = {
        number: 0, // assigned after collection
        title: titleText,
        paragraphs: [],
      };
    } else if (current) {
      current.paragraphs.push(cleanText(line));
    } else {
      // Lines before the first chapter marker (proem/introduction)
      current = {
        number: 0,
        title: cleanTitle(line.slice(0, 100)),
        paragraphs: [cleanText(line)],
      };
    }
  }

  // Save last chapter
  if (current && current.paragraphs.length > 0) {
    chapters.push(current);
  }

  // Assign sequential chapter numbers
  for (let i = 0; i < chapters.length; i++) {
    chapters[i].number = i + 1;
  }

  console.log(`  Identified ${chapters.length} chapters\n`);

  let totalParagraphs = 0;

  for (const chapter of chapters) {
    const paragraphs = chapter.paragraphs.map((text, i) => ({ index: i, text }));

    const processed: ProcessedChapter = {
      chapterNumber: chapter.number,
      title: chapter.title,
      sourceContent: { paragraphs },
    };

    const outFile = path.join(
      outDir,
      `chapter-${String(chapter.number).padStart(3, "0")}.json`
    );
    fs.writeFileSync(outFile, JSON.stringify(processed, null, 2), "utf-8");
    totalParagraphs += paragraphs.length;

    process.stdout.write(
      `  [${chapter.number}] ${chapter.title.slice(0, 60)} — ${paragraphs.length} paragraphs\n`
    );
  }

  console.log(`\nDe Ceremoniis: ${chapters.length} chapters, ${totalParagraphs} total paragraphs`);
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200); // Truncate very long "titles"
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\u00AD/g, "") // Remove soft hyphens
    .replace(/ﬁ/g, "fi") // Fix common ligature OCR artifacts
    .replace(/ﬂ/g, "fl")
    .replace(/ﬀ/g, "ff")
    .normalize("NFC") // Unicode normalization
    .trim();
}

// ============================================================
// Main
// ============================================================

function main() {
  const args = process.argv.slice(2);
  const textArg = args.find((a) => !a.startsWith("--"));
  const textFlag = args.indexOf("--text");
  const textName = textFlag >= 0 ? args[textFlag + 1] : textArg;

  if (textName === "zhuziyulei") {
    processZhuziYulei();
  } else if (textName === "ceremonialis") {
    processDeCeremoniis();
  } else {
    // Process both
    console.log("=== Processing Zhu Zi Yu Lei ===\n");
    processZhuziYulei();
    console.log("\n=== Processing De Ceremoniis ===\n");
    processDeCeremoniis();
  }
}

main();
