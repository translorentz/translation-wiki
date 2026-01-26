/**
 * Process "Cent'anni" (A Hundred Years) by Giuseppe Rovani (1857-1858)
 *
 * Source: Liber Liber / Project Manuzio e-book (DjVu OCR text)
 * Location: data/raw/la_giovinezza/cento_anni/Cent'anni_djvu.txt
 * Language: Italian
 *
 * Structure:
 *   - Preludio (Prelude)
 *   - 20 "Libri" (Books): LIBRO PRIMO through LIBRO VENTESIMO
 *   - Each Libro has a summary header and prose content
 *   - Page numbers scattered throughout (to be removed)
 *   - Some Roman numeral section markers within books
 *
 * This novel spans 100 years of Italian history (1750-1850), centered on Milan,
 * covering the Enlightenment, French Revolution, Napoleonic period, and Risorgimento.
 *
 * Usage: pnpm tsx scripts/process-cento-anni.ts
 */

import * as fs from "fs";
import * as path from "path";

const RAW_FILE = path.resolve(
  "data/raw/la_giovinezza/cento_anni/Cent'anni_djvu.txt"
);
const OUTPUT_DIR = path.resolve("data/processed/cento-anni");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

// Italian book ordinals for titles
const LIBRO_ORDINALS: Record<string, string> = {
  PRIMO: "First",
  SECONDO: "Second",
  TERZO: "Third",
  QUARTO: "Fourth",
  QUINTO: "Fifth",
  SESTO: "Sixth",
  SETTIMO: "Seventh",
  OTTAVO: "Eighth",
  NONO: "Ninth",
  DECIMO: "Tenth",
  UNDECIMO: "Eleventh",
  DUODECIMO: "Twelfth",
  DECIMOTERZO: "Thirteenth",
  DECIMOQUARTO: "Fourteenth",
  DECIMOQUINTO: "Fifteenth",
  DECIMOSESTO: "Sixteenth",
  DECIMOSETTIMO: "Seventeenth",
  DECIMOTTAVO: "Eighteenth",
  DECIMONONO: "Nineteenth",
  VENTESIMO: "Twentieth",
};

/**
 * Check if a line is a page number (standalone digit)
 */
function isPageNumber(line: string): boolean {
  const trimmed = line.trim();
  // Match 1-3 digit numbers standing alone
  return /^\d{1,3}$/.test(trimmed);
}

/**
 * Check if a line is a Roman numeral section divider
 */
function isRomanNumeralDivider(line: string): boolean {
  const trimmed = line.trim();
  // Match Roman numerals like II, III, IV, V, VI, VII, IX, X, XI, XII, etc.
  // But NOT single letters that might be OCR errors (M, MI, etc.)
  return /^[IVX]{1,7}$/.test(trimmed) && trimmed !== "M" && trimmed !== "MI";
}

/**
 * Check if a line is part of the front matter (Liber Liber metadata)
 */
function isFrontMatter(line: string): boolean {
  const trimmed = line.trim();
  const frontMatterPatterns = [
    /^www\.liberliber\.it$/i,
    /^QUESTO E-BOOK:/,
    /^TITOLO:/,
    /^AUTORE:/,
    /^TRADUZIONE E NOTE:/,
    /^NOTE:$/,
    /^DIRITTI D'AUTORE:/,
    /^LICENZA:/,
    /^TRATTO DA:/,
    /^CODICE ISBN:/,
    /^la EDIZIONE ELETTRONICA/,
    /^INDICE DI AFFIDABILITA/,
    /^ALLA EDIZIONE ELETTRONICA HANNO CONTRIBUITO:/,
    /^REVISIONE:/,
    /^PUBBLICATO DA:/,
    /^Informazioni sul "progetto Manuzio"/,
    /^Il "progetto Manuzio"/,
    /^Aiuta anche tu il "progetto Manuzio"/,
    /^E-text$/,
    /^Editoria, Web design, Multimedia$/,
    /^http:\/\//,
    /^pi$/,
    /^G\]$/,
    /^Marco Calvo$/,
    /^Marina De.?[Ss]tasio/,
    /^Clelia Mussari/,
    /^Claudio Paganelli/,
    /@.*\.(inet|it|net)$/,
  ];

  return frontMatterPatterns.some((pattern) => pattern.test(trimmed));
}

/**
 * Extract LIBRO sections from the raw content
 */
function extractLibros(content: string): {
  preludio: string;
  libros: { title: string; ordinal: string; content: string }[];
} {
  const lines = content.split("\n");
  const libros: { title: string; ordinal: string; content: string }[] = [];

  let preludioLines: string[] = [];
  let currentLibro: { title: string; ordinal: string; lines: string[] } | null =
    null;
  let inPreludio = false;
  let pastFrontMatter = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip front matter
    if (!pastFrontMatter) {
      if (trimmed === "PRELUDIO") {
        pastFrontMatter = true;
        inPreludio = true;
        continue;
      }
      continue;
    }

    // Check for LIBRO header
    const libroMatch = trimmed.match(/^LIBRO\s+(\w+)$/);
    if (libroMatch) {
      // Save previous libro if exists
      if (currentLibro) {
        libros.push({
          title: currentLibro.title,
          ordinal: currentLibro.ordinal,
          content: currentLibro.lines.join("\n"),
        });
      }

      // End preludio
      if (inPreludio) {
        inPreludio = false;
      }

      // Start new libro
      currentLibro = {
        title: `LIBRO ${libroMatch[1]}`,
        ordinal: libroMatch[1],
        lines: [],
      };
      continue;
    }

    // Collect content
    if (inPreludio) {
      preludioLines.push(line);
    } else if (currentLibro) {
      currentLibro.lines.push(line);
    }
  }

  // Save last libro
  if (currentLibro) {
    libros.push({
      title: currentLibro.title,
      ordinal: currentLibro.ordinal,
      content: currentLibro.lines.join("\n"),
    });
  }

  return {
    preludio: preludioLines.join("\n"),
    libros,
  };
}

/**
 * Clean content: remove page numbers, front matter remnants, normalize whitespace
 */
function cleanContent(content: string): string {
  const lines = content.split("\n");
  const cleanedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip page numbers
    if (isPageNumber(trimmed)) {
      continue;
    }

    // Skip front matter remnants
    if (isFrontMatter(trimmed)) {
      continue;
    }

    // Skip empty lines at the beginning
    if (cleanedLines.length === 0 && trimmed === "") {
      continue;
    }

    cleanedLines.push(line);
  }

  return cleanedLines.join("\n").trim();
}

/**
 * Split content into paragraphs, preserving section structure
 */
function splitIntoParagraphs(
  content: string
): { index: number; text: string }[] {
  const paragraphs: { index: number; text: string }[] = [];
  const cleanedContent = cleanContent(content);

  // Split on double newlines (blank lines)
  const blocks = cleanedContent.split(/\n\s*\n/);

  let index = 0;
  for (const block of blocks) {
    // Join lines within a paragraph
    const lines = block.split("\n");
    const joinedLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip page numbers and front matter
      if (isPageNumber(trimmed) || isFrontMatter(trimmed)) {
        continue;
      }

      // Keep Roman numeral dividers as separate markers
      if (isRomanNumeralDivider(trimmed)) {
        // If we have accumulated text, save it first
        if (joinedLines.length > 0) {
          const text = joinedLines.join(" ").trim();
          if (text) {
            paragraphs.push({ index, text });
            index++;
          }
          joinedLines.length = 0;
        }
        // Add the section marker
        paragraphs.push({ index, text: `[${trimmed}]` });
        index++;
        continue;
      }

      if (trimmed) {
        joinedLines.push(trimmed);
      }
    }

    // Save remaining text
    if (joinedLines.length > 0) {
      const text = joinedLines.join(" ").trim();
      if (text) {
        paragraphs.push({ index, text });
        index++;
      }
    }
  }

  return paragraphs;
}

/**
 * Extract the chapter summary (first paragraph-like block after LIBRO header)
 */
function extractSummaryAndContent(content: string): {
  summary: string;
  mainContent: string;
} {
  const cleanedContent = cleanContent(content);
  const lines = cleanedContent.split("\n");

  // The summary is typically in italics in the original, appearing as a block
  // right after the LIBRO header. It's a long line describing the chapter contents.
  // Find the first substantial paragraph
  let summaryLines: string[] = [];
  let mainLines: string[] = [];
  let foundSummary = false;
  let inSummary = false;
  let blankCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!foundSummary) {
      // Skip initial empty lines
      if (trimmed === "") {
        continue;
      }

      // Start collecting summary
      inSummary = true;
      foundSummary = true;
    }

    if (inSummary) {
      if (trimmed === "") {
        blankCount++;
        // Two consecutive blank lines or one blank followed by non-summary text
        if (blankCount >= 2) {
          inSummary = false;
          mainLines = lines.slice(i + 1);
          break;
        }
      } else {
        // Check if this looks like main content (starts with typical prose patterns)
        if (
          blankCount > 0 &&
          (trimmed.match(/^[A-Z][a-z]/) || // Starts with capital letter word
            trimmed.match(/^«/) || // Starts with quote
            trimmed.match(/^—/))
        ) {
          // Starts with em-dash
          inSummary = false;
          mainLines = lines.slice(i);
          break;
        }
        blankCount = 0;
        summaryLines.push(trimmed);
      }
    }
  }

  // If we never found the end, assume everything is main content
  if (inSummary && summaryLines.length > 0) {
    // The summary is typically one or two long paragraphs
    // If it's very long, it's probably all main content
    const summaryText = summaryLines.join(" ");
    if (summaryText.length > 1500 || summaryLines.length > 10) {
      return { summary: "", mainContent: cleanedContent };
    }
  }

  return {
    summary: summaryLines.join(" ").trim(),
    mainContent: mainLines.join("\n").trim(),
  };
}

/**
 * Create English title for a libro
 */
function createEnglishTitle(ordinal: string): string {
  const english = LIBRO_ORDINALS[ordinal] || ordinal;
  return `Book ${english} (Libro ${ordinal.charAt(0) + ordinal.slice(1).toLowerCase()})`;
}

function main(): void {
  console.log("Processing Cent'anni (A Hundred Years) by Giuseppe Rovani");
  console.log("=".repeat(70));

  // Read raw file
  const rawContent = fs.readFileSync(RAW_FILE, "utf-8");
  console.log(`\nRaw file: ${rawContent.length.toLocaleString()} characters`);

  // Extract sections
  const { preludio, libros } = extractLibros(rawContent);
  console.log(`Found: Preludio + ${libros.length} Libros\n`);

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const chapters: ProcessedChapter[] = [];

  // Process Preludio as chapter 1
  const preludioParagraphs = splitIntoParagraphs(preludio);
  chapters.push({
    chapterNumber: 1,
    title: "Prelude (Preludio)",
    sourceContent: { paragraphs: preludioParagraphs },
  });

  // Process each Libro
  for (let i = 0; i < libros.length; i++) {
    const libro = libros[i];
    const chapterNumber = i + 2; // Preludio is 1, so books start at 2

    const { summary, mainContent } = extractSummaryAndContent(libro.content);

    // Include summary as first paragraph if it exists
    let paragraphs: { index: number; text: string }[] = [];
    if (summary) {
      paragraphs.push({ index: 0, text: `[Summary: ${summary}]` });
      const mainParagraphs = splitIntoParagraphs(mainContent);
      // Re-index main paragraphs
      for (let j = 0; j < mainParagraphs.length; j++) {
        paragraphs.push({ index: j + 1, text: mainParagraphs[j].text });
      }
    } else {
      paragraphs = splitIntoParagraphs(libro.content);
    }

    const title = createEnglishTitle(libro.ordinal);
    chapters.push({
      chapterNumber,
      title,
      sourceContent: { paragraphs },
    });
  }

  // Write chapter files
  let totalParagraphs = 0;
  let totalChars = 0;

  console.log("CHAPTER LISTING");
  console.log("=".repeat(70));

  for (const chapter of chapters) {
    const fileName = `chapter-${String(chapter.chapterNumber).padStart(3, "0")}.json`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(chapter, null, 2) + "\n", "utf-8");

    const paraCount = chapter.sourceContent.paragraphs.length;
    const charCount = chapter.sourceContent.paragraphs.reduce(
      (sum, p) => sum + p.text.length,
      0
    );
    totalParagraphs += paraCount;
    totalChars += charCount;

    const shortTitle =
      chapter.title.length > 55
        ? chapter.title.substring(0, 52) + "..."
        : chapter.title;
    console.log(
      `  ${fileName}: ${paraCount} para, ${charCount.toLocaleString()} chars - ${shortTitle}`
    );
  }

  console.log("\n" + "=".repeat(70));
  console.log(
    `TOTAL: ${chapters.length} chapters, ${totalParagraphs} paragraphs, ${totalChars.toLocaleString()} characters`
  );
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log("=".repeat(70));
}

main();
