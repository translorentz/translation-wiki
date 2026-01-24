/**
 * Processes the Yi Zhou Shu (逸周書) raw text files into structured JSON.
 *
 * The raw files are in data/raw/yi_zhou_shu/, named like:
 *   01_度訓解第一.txt, 02_命訓.txt, ..., 62_周書序.txt
 *
 * Each file contains:
 * - Line 1: Title (Chinese chapter title)
 * - Line 2: Empty line
 * - Line 3+: Content paragraphs (may be single long paragraph or multiple separated by blank lines)
 *
 * CRITICAL: Commentary is inline within [square brackets] — these are PRESERVED verbatim.
 * The □ characters represent lacunae (damaged/missing text) — preserved as-is.
 *
 * Some files have a duplicate section: the base text first (with punctuation), then a
 * running commentary version (without punctuation, mixing base text with Kong Chao's glosses).
 * The duplicate section is detected and removed.
 *
 * Output: data/processed/yi-zhou-shu/chapter-NNN.json (chapter-001 through chapter-062)
 *
 * Usage: pnpm tsx scripts/process-yi-zhou-shu.ts
 */

import fs from "fs";
import path from "path";

const RAW_DIR = path.resolve("data/raw/yi_zhou_shu");
const OUTPUT_DIR = path.resolve("data/processed/yi-zhou-shu");

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

/**
 * Detect whether a paragraph is a "commentary duplicate" — a running version
 * of the base text mixed with inline commentary, lacking punctuation.
 *
 * In some Yi Zhou Shu files, the text appears twice:
 * 1. Clean base text with proper modern punctuation (，。；：「」etc.)
 * 2. A running commentary version without punctuation, mixing base text
 *    with Kong Chao's glosses.
 *
 * Heuristic: A commentary paragraph typically has a very low ratio of
 * punctuation marks to total characters compared to the base text.
 */
function isCommentaryDuplicate(
  paragraph: string,
  baseParagraph: string
): boolean {
  const punctuation = /[，。；：、「」『』（）《》〈〉？！]/g;
  const paraMarks = (paragraph.match(punctuation) || []).length;
  const paraLen = paragraph.length;
  const baseMarks = (baseParagraph.match(punctuation) || []).length;
  const baseLen = baseParagraph.length;

  if (paraLen < 50 || baseLen < 50) return false;

  const paraRatio = paraMarks / paraLen;
  const baseRatio = baseMarks / baseLen;

  // Strategy 1: Clear punctuation disparity
  if (baseRatio > 0.015 && paraRatio < 0.005) {
    const baseChars = baseParagraph.replace(punctuation, "").substring(0, 6);
    const paraStart = paragraph.substring(0, 20);
    if (paraStart.includes(baseChars)) {
      return true;
    }
  }

  // Strategy 2: Same opening text with significantly lower punctuation ratio
  if (baseRatio > 0.08 && paraRatio < baseRatio * 0.5) {
    const baseChars = baseParagraph.replace(punctuation, "").substring(0, 6);
    const paraStartClean = paragraph.replace(punctuation, "").substring(0, 30);
    if (paraStartClean.includes(baseChars)) {
      return true;
    }
  }

  return false;
}

/**
 * Remove commentary duplicate paragraphs from the content.
 */
function removeCommentaryDuplicates(paragraphs: string[]): string[] {
  if (paragraphs.length <= 1) return paragraphs;

  const result: string[] = [paragraphs[0]];

  for (let i = 1; i < paragraphs.length; i++) {
    if (isCommentaryDuplicate(paragraphs[i], paragraphs[0])) {
      continue;
    }
    result.push(paragraphs[i]);
  }

  return result;
}

/**
 * Process a single raw file into a ProcessedChapter object.
 */
function processFile(
  filePath: string,
  chapterNumber: number
): ProcessedChapter | null {
  const rawContent = fs.readFileSync(filePath, "utf-8").trim();
  const lines = rawContent.split("\n");

  if (lines.length < 1) {
    console.warn(`  [warn] Empty file: ${filePath}`);
    return null;
  }

  // Line 1 is the Chinese title
  const title = lines[0].trim();

  // Skip blank lines after title to find content start
  let contentStart = 1;
  while (contentStart < lines.length && lines[contentStart].trim() === "") {
    contentStart++;
  }

  if (contentStart >= lines.length) {
    console.warn(`  [warn] No content after title in: ${filePath}`);
    return null;
  }

  const content = lines.slice(contentStart).join("\n");

  // Split into paragraphs by blank lines
  let rawParagraphs = content
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, "").trim()) // Join lines within a paragraph
    .filter((p) => p.length > 0);

  // Remove commentary duplicate paragraphs (running text without punctuation)
  rawParagraphs = removeCommentaryDuplicates(rawParagraphs);

  if (rawParagraphs.length === 0) {
    console.warn(`  [warn] No content paragraphs in: ${filePath}`);
    return null;
  }

  // Build paragraph objects with 0-based indexing
  const paragraphs: Paragraph[] = rawParagraphs.map((text, idx) => ({
    index: idx,
    text,
  }));

  return {
    chapterNumber,
    title,
    sourceContent: { paragraphs },
  };
}

/**
 * Main processing function.
 */
function main() {
  console.log("Processing Yi Zhou Shu (逸周書)...\n");

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Read all files and sort by numeric prefix
  const files = fs
    .readdirSync(RAW_DIR)
    .filter((f) => f.endsWith(".txt"))
    .sort((a, b) => {
      const numA = parseInt(a.split("_")[0]);
      const numB = parseInt(b.split("_")[0]);
      return numA - numB;
    });

  console.log(`Found ${files.length} raw files in ${RAW_DIR}\n`);

  let processedCount = 0;
  let totalParagraphs = 0;
  let totalChars = 0;
  let totalBrackets = 0;

  for (const file of files) {
    // Extract chapter number from filename prefix
    const numMatch = file.match(/^(\d+)_/);
    if (!numMatch) {
      console.warn(`  [skip] Cannot parse chapter number: ${file}`);
      continue;
    }
    const chapterNumber = parseInt(numMatch[1]);

    const filePath = path.join(RAW_DIR, file);
    const chapter = processFile(filePath, chapterNumber);

    if (!chapter) continue;

    // Count brackets for verification
    const chapterText = chapter.sourceContent.paragraphs
      .map((p) => p.text)
      .join("");
    const openBrackets = (chapterText.match(/\[/g) || []).length;
    const closeBrackets = (chapterText.match(/\]/g) || []).length;
    totalBrackets += openBrackets;

    const bracketInfo =
      openBrackets > 0
        ? ` [${openBrackets}/${closeBrackets} brackets]`
        : "";

    // Write output JSON
    const outputFile = `chapter-${String(chapterNumber).padStart(3, "0")}.json`;
    const outputPath = path.join(OUTPUT_DIR, outputFile);
    fs.writeFileSync(outputPath, JSON.stringify(chapter, null, 2) + "\n");

    const charCount = chapter.sourceContent.paragraphs.reduce(
      (sum, p) => sum + p.text.length,
      0
    );
    totalParagraphs += chapter.sourceContent.paragraphs.length;
    totalChars += charCount;
    processedCount++;

    console.log(
      `  [ok]  Ch ${String(chapterNumber).padStart(2, " ")}: "${chapter.title}" — ${chapter.sourceContent.paragraphs.length} para, ${charCount} chars${bracketInfo}`
    );
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log(`Processed: ${processedCount} chapters`);
  console.log(`Total paragraphs: ${totalParagraphs}`);
  console.log(`Total characters: ${totalChars}`);
  console.log(`Total commentary brackets: ${totalBrackets}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`${"=".repeat(70)}`);
}

main();
