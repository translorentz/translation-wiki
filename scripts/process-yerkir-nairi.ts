/**
 * Processes Yeghishe Charents' "Yerkir Nairi" (Land of Nairi) raw text into structured JSON.
 *
 * The raw files are organized as:
 * - 01_*.txt: Preface (Arajaban)
 * - 02_*.txt: Part One (Masn Arajin)
 * - 03_*.txt: Part Two (Masn Erkrord)
 * - 04_*.txt: Part Three and Final (Masn Yerrord yev Verjin)
 * - 05_*.txt: Epilogue (Verjaban)
 *
 * The text uses zero-width spaces (U+200B) as emphasis markers for proper nouns and
 * important terms (not as paragraph boundaries). The script joins text across these
 * markers and creates proper paragraph structure.
 *
 * Parts 1-3 have epigraphs (quotes from other works) at the beginning that should be
 * kept separate from the main text.
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
  filePrefix: string;
  titleArm: string;
  titleEng: string;
  keepAsSingleChapter: boolean;
  hasEpigraph: boolean;
}

const PARTS: PartConfig[] = [
  {
    filePrefix: "01",
    titleArm: "\u0531\u057c\u0561\u057b\u0561\u0562\u0561\u0576", // Preface
    titleEng: "Preface",
    keepAsSingleChapter: true,
    hasEpigraph: false,
  },
  {
    filePrefix: "02",
    titleArm: "\u0544\u0561\u057d\u0576 \u0561\u057c\u0561\u057b\u056b\u0576", // Part One
    titleEng: "Part One: The City and Its Inhabitants",
    keepAsSingleChapter: false,
    hasEpigraph: true,
  },
  {
    filePrefix: "03",
    titleArm: "\u0544\u0561\u057d\u0576 \u0565\u0580\u056f\u0580\u0578\u0580\u0564", // Part Two
    titleEng: "Part Two: Toward Nairi",
    keepAsSingleChapter: false,
    hasEpigraph: true,
  },
  {
    filePrefix: "04",
    titleArm: "\u0544\u0561\u057d\u0576 \u0565\u0580\u0580\u0578\u0580\u0564 \u0587 \u057e\u0565\u0580\u057b\u056b\u0576", // Part Three and Final
    titleEng: "Part Three and Final: The Land of Nairi",
    keepAsSingleChapter: false,
    hasEpigraph: true,
  },
  {
    filePrefix: "05",
    titleArm: "\u054e\u0565\u0580\u057b\u0561\u0562\u0561\u0576", // Epilogue
    titleEng: "Epilogue",
    keepAsSingleChapter: true,
    hasEpigraph: false,
  },
];

function findRawFile(filePrefix: string): string | null {
  const files = fs.readdirSync(RAW_DIR);
  const match = files.find((f) => f.startsWith(filePrefix));
  return match ? path.join(RAW_DIR, match) : null;
}

/**
 * Removes zero-width spaces and joins text properly.
 * Zero-width spaces in this text mark emphasized terms, not paragraph breaks.
 */
function removeZeroWidthSpaces(text: string): string {
  return text.replace(/\u200B/g, "");
}

/**
 * Detects if a line looks like an ALL CAPS title line.
 * Armenian uppercase letters are in the range U+0531-U+0556.
 */
function isAllCapsArmenian(line: string): boolean {
  if (line.length === 0) return false;
  // Check if line contains Armenian and is mostly uppercase
  const armenianUpperRange = /[\u0531-\u0556]/;
  const armenianLowerRange = /[\u0561-\u0587]/;
  const hasUpperArmenian = armenianUpperRange.test(line);
  const hasLowerArmenian = armenianLowerRange.test(line);
  // If it has uppercase Armenian and no lowercase Armenian, it's all caps
  return hasUpperArmenian && !hasLowerArmenian;
}

/**
 * Detects if a line looks like an epigraph attribution (author citation).
 * Examples: "V. TERYAN", "E. Ch. <<AMENAPOEM>>"
 */
function isEpigraphAttribution(line: string): boolean {
  // Short line (under 60 chars) that looks like an attribution
  if (line.length > 60) return false;
  // Pattern: starts with initial(s) + period, or contains guillemets
  const hasInitials = /^[A-Z\u0531-\u0556]\.\s*[A-Z\u0531-\u0556]/.test(line);
  const hasGuillemets = line.includes("\u00AB") || line.includes("\u00BB"); // << >>
  return hasInitials || hasGuillemets;
}

/**
 * Detects if a line looks like an epigraph quote line.
 * These are usually short and end with ellipsis.
 */
function isEpigraphQuote(line: string): boolean {
  if (line.length > 80) return false;
  const hasEllipsis = line.includes("\u2026") || line.endsWith("...");
  const endsWithArmenianPeriod = line.endsWith("\u0589"); // Armenian full stop
  // Epigraph quotes are short and either have ellipsis or don't end with period
  return hasEllipsis || (line.length < 60 && !endsWithArmenianPeriod);
}

/**
 * Extracts the header lines (title, subtitle, epigraph) from the beginning of a part.
 * Returns the header lines and the remaining main content.
 */
function extractHeaderAndContent(
  content: string,
  hasEpigraph: boolean
): { headerLines: string[]; mainContent: string } {
  const lines = content.split("\n");
  const headerLines: string[] = [];
  let mainContentStart = 0;

  let i = 0;
  // Skip leading empty lines
  while (i < lines.length && lines[i].trim().length === 0) i++;

  // Collect all header lines (titles, subtitles, epigraph)
  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.length === 0) {
      i++;
      continue;
    }

    // Check if this is still header material
    const isTitle = isAllCapsArmenian(line);
    const isAttribution = isEpigraphAttribution(line);
    const isQuote = hasEpigraph && isEpigraphQuote(line);

    // Main content starts when we hit a line that's:
    // - Long (> 100 chars), or
    // - Ends with Armenian period and is moderately long, or
    // - Doesn't look like title/attribution/quote
    const isMainText =
      line.length > 100 ||
      (line.length > 60 && line.endsWith("\u0589")) ||
      (!isTitle && !isAttribution && !isQuote && line.length > 40);

    if (isMainText) {
      mainContentStart = i;
      break;
    }

    headerLines.push(line);
    i++;
  }

  mainContentStart = i;
  const mainContent = lines.slice(mainContentStart).join("\n");
  return { headerLines, mainContent };
}

/**
 * Creates proper paragraphs from the main content.
 * Paragraphs are separated by blank lines.
 * Adjacent non-empty lines are joined with spaces.
 */
function createParagraphs(content: string): { index: number; text: string }[] {
  const paragraphs: { index: number; text: string }[] = [];
  const lines = content.split("\n");

  let currentParagraph: string[] = [];
  let paragraphIndex = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0) {
      // Blank line - finalize current paragraph
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(" ").replace(/\s+/g, " ").trim();
        if (text.length > 0) {
          paragraphs.push({ index: paragraphIndex++, text });
        }
        currentParagraph = [];
      }
    } else {
      currentParagraph.push(trimmedLine);
    }
  }

  // Don't forget the last paragraph
  if (currentParagraph.length > 0) {
    const text = currentParagraph.join(" ").replace(/\s+/g, " ").trim();
    if (text.length > 0) {
      paragraphs.push({ index: paragraphIndex++, text });
    }
  }

  return paragraphs;
}

/**
 * Splits paragraphs into roughly equal chapters based on paragraph count.
 */
function splitIntoChapters(
  paragraphs: { index: number; text: string }[],
  keepAsSingle: boolean
): { index: number; text: string }[][] {
  if (keepAsSingle || paragraphs.length <= 60) {
    return [paragraphs];
  }

  const targetParagraphsPerChapter = 60;
  const numChapters = Math.ceil(paragraphs.length / targetParagraphsPerChapter);
  const chaptersContent: { index: number; text: string }[][] = [];
  const paragraphsPerChapter = Math.ceil(paragraphs.length / numChapters);

  for (let i = 0; i < numChapters; i++) {
    const start = i * paragraphsPerChapter;
    const end = Math.min(start + paragraphsPerChapter, paragraphs.length);
    const chapterParagraphs = paragraphs.slice(start, end).map((p, idx) => ({
      index: idx,
      text: p.text,
    }));
    if (chapterParagraphs.length > 0) {
      chaptersContent.push(chapterParagraphs);
    }
  }

  return chaptersContent;
}

function main() {
  console.log("Processing Yerkir Nairi (Land of Nairi) by Yeghishe Charents");
  console.log("=".repeat(60));

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let globalChapterNumber = 0;
  const chapters: ProcessedChapter[] = [];

  for (const part of PARTS) {
    const rawFile = findRawFile(part.filePrefix);
    if (!rawFile) {
      console.error(`  [err] Could not find file matching prefix: ${part.filePrefix}`);
      continue;
    }

    console.log(`\nProcessing: ${path.basename(rawFile)}`);
    console.log(`  Title: ${part.titleEng}`);

    // Read and clean content
    let content = fs.readFileSync(rawFile, "utf-8");
    content = removeZeroWidthSpaces(content);

    // Extract header and main content
    const { headerLines, mainContent } = extractHeaderAndContent(
      content,
      part.hasEpigraph
    );

    if (headerLines.length > 0) {
      console.log(`  Header lines: ${headerLines.length}`);
      for (const h of headerLines) {
        console.log(`    - "${h.substring(0, 50)}${h.length > 50 ? "..." : ""}"`);
      }
    }

    // Create paragraphs from main content
    const allParagraphs = createParagraphs(mainContent);
    console.log(`  Total paragraphs (main content): ${allParagraphs.length}`);

    // Split into chapters
    const chapterContents = splitIntoChapters(allParagraphs, part.keepAsSingleChapter);

    for (let chapterIdx = 0; chapterIdx < chapterContents.length; chapterIdx++) {
      globalChapterNumber++;

      // Create chapter title
      let title: string;
      if (chapterContents.length === 1) {
        title = `${part.titleArm} \u2014 ${part.titleEng}`;
      } else {
        title = `${part.titleArm} (${chapterIdx + 1}/${chapterContents.length}) \u2014 ${part.titleEng}`;
      }

      // For the first chapter of each part, prepend header as separate paragraphs
      let paragraphs = chapterContents[chapterIdx];

      if (chapterIdx === 0 && headerLines.length > 0) {
        // Create header paragraphs
        const headerParagraphs: { index: number; text: string }[] = [];
        let headerIdx = 0;

        for (const line of headerLines) {
          if (line.length > 0) {
            headerParagraphs.push({ index: headerIdx++, text: line });
          }
        }

        // Reindex main content paragraphs
        const mainParagraphs = paragraphs.map((p, idx) => ({
          index: headerIdx + idx,
          text: p.text,
        }));

        paragraphs = [...headerParagraphs, ...mainParagraphs];
      }

      const chapter: ProcessedChapter = {
        chapterNumber: globalChapterNumber,
        title,
        sourceContent: { paragraphs },
      };

      chapters.push(chapter);

      console.log(`    Chapter ${globalChapterNumber}: ${paragraphs.length} paragraphs`);
    }
  }

  // Write all chapters to files
  console.log("\nWriting chapter files...");
  for (const chapter of chapters) {
    const fileName = `chapter-${String(chapter.chapterNumber).padStart(3, "0")}.json`;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, fileName),
      JSON.stringify(chapter, null, 2) + "\n"
    );
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log(`Total chapters: ${chapters.length}`);
  console.log(
    `Total paragraphs: ${chapters.reduce(
      (sum, c) => sum + c.sourceContent.paragraphs.length,
      0
    )}`
  );
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main();
