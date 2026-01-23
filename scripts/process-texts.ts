/**
 * Processes raw text files into structured paragraph-aligned JSON format
 * suitable for database seeding.
 *
 * Usage: pnpm process:texts [--text zhuzi-yulei|de-ceremoniis]
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

interface CtextRaw {
  title: string;
  fulltext: string[];
}

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

function processZhuziYulei(): void {
  const rawDir = path.resolve("data/raw/zhuzi-yulei");
  const outDir = path.resolve("data/processed/zhuzi-yulei");

  if (!fs.existsSync(rawDir)) {
    console.error(`Raw directory not found: ${rawDir}`);
    console.error("Run 'pnpm acquire:ctext' first.");
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });

  const files = fs
    .readdirSync(rawDir)
    .filter((f) => f.startsWith("chapter-") && f.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    console.error("No chapter files found in raw directory.");
    return;
  }

  console.log(`Processing ${files.length} chapters of Zhu Zi Yu Lei...\n`);

  let totalParagraphs = 0;

  for (const file of files) {
    const chapterNumber = parseInt(file.replace("chapter-", "").replace(".json", ""));
    const raw: CtextRaw = JSON.parse(
      fs.readFileSync(path.join(rawDir, file), "utf-8")
    );

    // Filter out empty paragraphs and trim whitespace
    const paragraphs = raw.fulltext
      .map((text, index) => ({
        index,
        text: text.trim(),
      }))
      .filter((p) => p.text.length > 0)
      .map((p, i) => ({ index: i, text: p.text })); // Re-index after filtering

    const processed: ProcessedChapter = {
      chapterNumber,
      title: raw.title,
      sourceContent: { paragraphs },
    };

    const outFile = path.join(outDir, `chapter-${String(chapterNumber).padStart(3, "0")}.json`);
    fs.writeFileSync(outFile, JSON.stringify(processed, null, 2), "utf-8");
    totalParagraphs += paragraphs.length;

    process.stdout.write(
      `  [${chapterNumber}] ${raw.title} — ${paragraphs.length} paragraphs\n`
    );
  }

  console.log(`\nZhu Zi Yu Lei: ${files.length} chapters, ${totalParagraphs} total paragraphs`);
}

// ============================================================
// De Ceremoniis processing
// ============================================================

function processDeCeremoniis(): void {
  const rawDir = path.resolve("data/raw/de-ceremoniis");
  const outDir = path.resolve("data/processed/de-ceremoniis");
  const rawFile = path.join(rawDir, "full-text.txt");

  if (!fs.existsSync(rawFile)) {
    console.error(`Raw file not found: ${rawFile}`);
    console.error("Run 'pnpm acquire:archive' first.");
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });

  const fullText = fs.readFileSync(rawFile, "utf-8");
  const lines = fullText.split("\n");

  console.log(`Processing De Ceremoniis (${lines.length} lines)...\n`);

  // The Reiske edition OCR is complex. This is a best-effort structural parser.
  // The text has page breaks (form feeds or blank line clusters) and chapter headings.
  // Greek text and Latin text appear on alternating pages or sections.
  //
  // Strategy: Split into pages, then group pages into chapters.
  // Chapter headings in the Reiske edition typically contain "CAPUT" or numbered sections.

  // Split into pages (separated by multiple blank lines or form feed characters)
  const pages = splitIntoPages(lines);
  console.log(`  Found ${pages.length} pages\n`);

  // Attempt to identify chapter boundaries
  const chapters = identifyChapters(pages);
  console.log(`  Identified ${chapters.length} chapters\n`);

  let totalParagraphs = 0;

  for (const chapter of chapters) {
    const processed: ProcessedChapter = {
      chapterNumber: chapter.number,
      title: chapter.title,
      sourceContent: { paragraphs: chapter.paragraphs },
    };

    const outFile = path.join(
      outDir,
      `chapter-${String(chapter.number).padStart(3, "0")}.json`
    );
    fs.writeFileSync(outFile, JSON.stringify(processed, null, 2), "utf-8");
    totalParagraphs += chapter.paragraphs.length;

    process.stdout.write(
      `  [${chapter.number}] ${chapter.title} — ${chapter.paragraphs.length} paragraphs\n`
    );
  }

  console.log(`\nDe Ceremoniis: ${chapters.length} chapters, ${totalParagraphs} total paragraphs`);
}

function splitIntoPages(lines: string[]): string[][] {
  const pages: string[][] = [];
  let currentPage: string[] = [];

  let blankLineCount = 0;
  for (const line of lines) {
    if (line.trim() === "" || line === "\f") {
      blankLineCount++;
      if (blankLineCount >= 4 && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        blankLineCount = 0;
      }
    } else {
      blankLineCount = 0;
      currentPage.push(line);
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

interface RawChapter {
  number: number;
  title: string;
  paragraphs: { index: number; text: string }[];
}

function identifyChapters(pages: string[][]): RawChapter[] {
  const chapters: RawChapter[] = [];
  let currentChapter: { title: string; lines: string[] } | null = null;
  let chapterNumber = 0;

  // Patterns that indicate a new chapter/section in the Reiske edition
  const chapterPattern = /^(CAPUT|CAP\.|ΚΕΦΑΛΑΙΟΝ|Περὶ|De\s)/i;
  const romanNumeralPattern = /^[IVXLCDM]+[\.\s]/;

  for (const page of pages) {
    const pageText = page.join(" ").trim();

    // Check if this page starts a new chapter
    const firstLine = page[0]?.trim() ?? "";
    const isNewChapter =
      chapterPattern.test(firstLine) ||
      (romanNumeralPattern.test(firstLine) && firstLine.length < 100);

    if (isNewChapter) {
      // Save previous chapter
      if (currentChapter && currentChapter.lines.length > 0) {
        chapterNumber++;
        chapters.push(buildChapter(chapterNumber, currentChapter.title, currentChapter.lines));
      }
      currentChapter = {
        title: cleanTitle(firstLine),
        lines: page.slice(1), // Rest of the page after title
      };
    } else if (currentChapter) {
      currentChapter.lines.push(...page);
    } else {
      // Before first chapter detected — treat as chapter 1
      currentChapter = {
        title: cleanTitle(firstLine),
        lines: page,
      };
    }
  }

  // Save last chapter
  if (currentChapter && currentChapter.lines.length > 0) {
    chapterNumber++;
    chapters.push(buildChapter(chapterNumber, currentChapter.title, currentChapter.lines));
  }

  // If no chapters were identified, just split into fixed-size chunks
  if (chapters.length === 0 && pages.length > 0) {
    console.warn("  Warning: Could not identify chapter structure. Splitting by page groups.");
    const allLines = pages.flat();
    const chunkSize = 50; // lines per "chapter"
    for (let i = 0; i < allLines.length; i += chunkSize) {
      chapterNumber++;
      const chunk = allLines.slice(i, i + chunkSize);
      chapters.push(buildChapter(chapterNumber, `Section ${chapterNumber}`, chunk));
    }
  }

  return chapters;
}

function buildChapter(number: number, title: string, lines: string[]): RawChapter {
  // Group consecutive non-empty lines into paragraphs
  const paragraphs: { index: number; text: string }[] = [];
  let currentParagraph: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      if (currentParagraph.length > 0) {
        paragraphs.push({
          index: paragraphs.length,
          text: cleanText(currentParagraph.join(" ")),
        });
        currentParagraph = [];
      }
    } else {
      currentParagraph.push(trimmed);
    }
  }

  // Don't forget the last paragraph
  if (currentParagraph.length > 0) {
    paragraphs.push({
      index: paragraphs.length,
      text: cleanText(currentParagraph.join(" ")),
    });
  }

  return { number, title, paragraphs };
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

  if (textName === "zhuzi-yulei") {
    processZhuziYulei();
  } else if (textName === "de-ceremoniis") {
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
