/**
 * Process Epitome of Histories (Epitome Historiarum) by John Zonaras
 *
 * Source: Bonn CSHB edition (1841), OCR from Internet Archive
 * File: data/raw/epitome_of_histories/epitome.txt
 *
 * This script extracts the Greek text, separating it from:
 * - Latin prefaces and front matter
 * - Latin translation by Hieronymus Wolf
 * - Critical apparatus (textual variants)
 * - Source citations (FONTES)
 *
 * The file contains Books 1-6 only (Volume 1 of 3).
 *
 * Structure pattern:
 * 1. Greek original text (paragraphs containing Greek characters)
 * 2. Critical apparatus (lines with manuscript sigla like "1 post Θεός PW add δ᾽")
 * 3. FONTES section (source citations)
 * 4. Latin translation (paragraphs without Greek characters)
 * 5. Page headers like "ANNALIUM I 1. 19" or "IOANNIS ZONARAE"
 */

import * as fs from 'fs';
import * as path from 'path';

const RAW_FILE = path.join(__dirname, '../data/raw/epitome_of_histories/epitome.txt');
const OUTPUT_DIR = path.join(__dirname, '../data/processed/epitome-of-histories');

interface Chapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: Array<{ index: number; text: string }>;
  };
}

// Check if a line is primarily Greek (contains significant Greek characters)
function isGreekLine(line: string): boolean {
  // Greek and Extended Greek ranges
  const greekChars = line.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) || [];
  const latinChars = line.match(/[A-Za-z]/g) || [];

  // Consider it Greek if:
  // 1. More than 5 Greek characters, OR
  // 2. Greek chars are more than 40% of alphabetic chars
  if (greekChars.length > 5) return true;
  if (greekChars.length > 0 && latinChars.length > 0) {
    return greekChars.length / (greekChars.length + latinChars.length) > 0.4;
  }
  return greekChars.length > 0 && latinChars.length === 0;
}

// Check if a line is part of the critical apparatus
function isCriticalApparatus(line: string): boolean {
  // Critical apparatus lines typically contain sigla like A, B, C, P, W
  // and editorial terms like om, add, post, pro, cum, et, sic, cod., Ducang.
  // Examples:
  // "1 post Θεός PW add δ᾽, om ABG"
  // "4 δὲ om A. 8 καϑηρὰν A. 15 ὑπερέϑετο)] ἐπέϑετο A."
  // "12 τὸν om A. τὴν om Α."
  // "1 wal ἑρπετὰ καὶ θηρία A LXX."
  // "σις. καὶ ἄμφω. 7 ἀναδιδόμενον Iosephus."

  const trimmed = line.trim();

  // Contains manuscript sigla at word boundaries + editorial terms
  const hasSigla = /\b[ABCPWD]\b/.test(trimmed) || /\bPW\b/.test(trimmed) || /\bLXX\b/.test(trimmed);
  const hasEditorialTerm = /\b(om|add|post|pro|cum|sic|cod\.|codex|Colbert|Ducang|Wolfii?|Iosephus|mss|ita|alter|Genesis|Regum|Levit)\b/i.test(trimmed);

  // Starts with number followed by Greek/text (typical apparatus format)
  if (/^\d+\s+[\u0370-\u03FF\u1F00-\u1FFFa-zA-Z]/.test(trimmed)) {
    if (hasSigla || hasEditorialTerm) {
      return true;
    }
  }

  // Has multiple apparatus markers in one line (like "4 ... A. 8 ... A.")
  const multipleMarkers = trimmed.match(/\d+\s+[\u0370-\u03FF\u1F00-\u1FFFa-zA-Z]+.*\b[ABCPWD]\b.*\d+\s+[\u0370-\u03FF\u1F00-\u1FFFa-zA-Z]+/);
  if (multipleMarkers) return true;

  // Patterns like "αὐτῆς AW, αὐτὸς P." or "δ᾽ A, δὲ PW"
  if (/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCPWD]+[,.]/.test(trimmed) && hasSigla) {
    return true;
  }

  // Lines ending with manuscript sigla reference
  if (/\b[ABCPWD]+\.?\s*$/.test(trimmed) && hasEditorialTerm) {
    return true;
  }

  return false;
}

// Check if a line is a FONTES citation
function isFontes(line: string): boolean {
  return /^F[OοΟ][NνΝ][TτΤ][EεΕ][SσΣ]/i.test(line.trim());
}

// Check if a line is a page header
function isPageHeader(line: string): boolean {
  const trimmed = line.trim();

  // Patterns like "ANNALIUM I 1. 19" or "IOANNIS ZONARAE" or "ANNALIUM II 1. 123"
  if (/^ANNALIUM\s+[IVX]+\s*\d*\.?\s*\d*$/i.test(trimmed)) return true;
  if (/^IOANNIS\s+ZONARAE$/i.test(trimmed)) return true;
  if (/^\d+\s*\.?\s*IOANNIS\s+ZONARAE$/i.test(trimmed)) return true;

  // Just a number (page number)
  if (/^\d+$/.test(trimmed)) return true;

  return false;
}

// Check if a line is a book marker
function isBookMarker(line: string): { isMarker: boolean; bookNum?: number } {
  const trimmed = line.trim();
  const match = trimmed.match(/^LIBER\s+(PRIMUS|SECUNDUS|TERTIUS|QUARTUS|QUINTUS|SEXTUS|SEPTIMUS|OCTAVUS|NONUS|DECIMUS|UNDECIMUS|DUODECIMUS|TERTIUS\s*DECIMUS|QUARTUS\s*DECIMUS|QUINTUS\s*DECIMUS|SEXTUS\s*DECIMUS|SEPTIMUS\s*DECIMUS|DUODEVICESIMUS|UNDEVICESIMUS)\.?$/i);

  if (match) {
    const latinNums: Record<string, number> = {
      'PRIMUS': 1,
      'SECUNDUS': 2,
      'TERTIUS': 3,
      'QUARTUS': 4,
      'QUINTUS': 5,
      'SEXTUS': 6,
      'SEPTIMUS': 7,
      'OCTAVUS': 8,
      'NONUS': 9,
      'DECIMUS': 10,
      'UNDECIMUS': 11,
      'DUODECIMUS': 12,
    };
    const bookWord = match[1].toUpperCase();
    return { isMarker: true, bookNum: latinNums[bookWord] || parseInt(bookWord) };
  }
  return { isMarker: false };
}

// Check if a line is a chapter/section start
function isChapterStart(line: string): { isStart: boolean; chapterNum?: number } {
  const trimmed = line.trim();

  // Pattern: starts with number, period or comma, then Greek text
  // Example: "1, Θεός ἐστι μὲν ἀνενδεὴς φύσις"
  // Example: "13. Ἔν τούτῳ τῷ χρόνω"
  const match = trimmed.match(/^(\d+)[.,]\s*[\u0370-\u03FF\u1F00-\u1FFF]/);
  if (match) {
    return { isStart: true, chapterNum: parseInt(match[1]) };
  }
  return { isStart: false };
}

// Clean up a Greek text line
function cleanGreekLine(line: string): string {
  // Remove line numbers that appear in margin (like "5" or "10" or "15" at start)
  let cleaned = line.replace(/^\s*\d+\s*(?=[A-Z\u0370-\u03FF\u1F00-\u1FFF])/, '');

  // Remove manuscript references embedded in text (like "P I 70" or "W I 48")
  cleaned = cleaned.replace(/\b[ABCPWD]\s*[IVX]+\s*\d+\b/g, '');

  // Remove page reference markers
  cleaned = cleaned.replace(/\s*[PWABCD]\s*$/g, '');

  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

function processText(): void {
  console.log('Processing Epitome of Histories...');

  const rawText = fs.readFileSync(RAW_FILE, 'utf-8');
  const lines = rawText.split('\n');

  // Find where actual content begins (after LIBER PRIMUS)
  let contentStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const bookCheck = isBookMarker(lines[i]);
    if (bookCheck.isMarker && bookCheck.bookNum === 1) {
      contentStart = i + 1;
      break;
    }
  }

  console.log(`Content starts at line ${contentStart + 1}`);

  // Process line by line, extracting Greek content
  const chapters: Chapter[] = [];
  let currentBook = 1;
  let currentSection = 0;
  let currentParagraphs: Array<{ index: number; text: string }> = [];
  let currentParagraphText = '';
  let paragraphIndex = 0;
  let inGreekSection = false;
  let lastLineWasGreek = false;

  for (let i = contentStart; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      // If we were in a Greek paragraph, close it
      if (currentParagraphText.trim()) {
        const cleaned = cleanGreekLine(currentParagraphText);
        if (cleaned.length > 10) { // Only keep substantial paragraphs
          currentParagraphs.push({
            index: paragraphIndex++,
            text: cleaned
          });
        }
        currentParagraphText = '';
      }
      lastLineWasGreek = false;
      continue;
    }

    // Check for book markers
    const bookCheck = isBookMarker(trimmedLine);
    if (bookCheck.isMarker && bookCheck.bookNum) {
      // Save current chapter before moving to new book
      if (currentParagraphs.length > 0) {
        chapters.push({
          chapterNumber: chapters.length + 1,
          title: `Book ${currentBook}, Section ${currentSection}`,
          sourceContent: { paragraphs: [...currentParagraphs] }
        });
        currentParagraphs = [];
        paragraphIndex = 0;
      }
      currentBook = bookCheck.bookNum;
      currentSection = 0;
      console.log(`Found Book ${currentBook}`);
      continue;
    }

    // Skip page headers
    if (isPageHeader(trimmedLine)) continue;

    // Skip FONTES lines and following source citations
    if (isFontes(trimmedLine)) {
      lastLineWasGreek = false;
      continue;
    }

    // Skip critical apparatus
    if (isCriticalApparatus(trimmedLine)) {
      lastLineWasGreek = false;
      continue;
    }

    // Check for section start
    const sectionCheck = isChapterStart(trimmedLine);
    if (sectionCheck.isStart && sectionCheck.chapterNum) {
      // Save previous section
      if (currentParagraphText.trim()) {
        const cleaned = cleanGreekLine(currentParagraphText);
        if (cleaned.length > 10) {
          currentParagraphs.push({
            index: paragraphIndex++,
            text: cleaned
          });
        }
        currentParagraphText = '';
      }

      if (currentParagraphs.length > 0 || currentSection > 0) {
        if (currentParagraphs.length > 0) {
          chapters.push({
            chapterNumber: chapters.length + 1,
            title: `Book ${currentBook}, Section ${currentSection}`,
            sourceContent: { paragraphs: [...currentParagraphs] }
          });
        }
        currentParagraphs = [];
        paragraphIndex = 0;
      }

      currentSection = sectionCheck.chapterNum;
      inGreekSection = true;
    }

    // Check if this is a Greek line
    if (isGreekLine(trimmedLine)) {
      if (!lastLineWasGreek && currentParagraphText.trim()) {
        // New Greek section after Latin, save previous paragraph
        const cleaned = cleanGreekLine(currentParagraphText);
        if (cleaned.length > 10) {
          currentParagraphs.push({
            index: paragraphIndex++,
            text: cleaned
          });
        }
        currentParagraphText = '';
      }

      // Add to current paragraph
      currentParagraphText += ' ' + trimmedLine;
      lastLineWasGreek = true;
      inGreekSection = true;
    } else {
      // Latin text - skip it
      if (lastLineWasGreek && currentParagraphText.trim()) {
        // End of Greek paragraph
        const cleaned = cleanGreekLine(currentParagraphText);
        if (cleaned.length > 10) {
          currentParagraphs.push({
            index: paragraphIndex++,
            text: cleaned
          });
        }
        currentParagraphText = '';
      }
      lastLineWasGreek = false;
      inGreekSection = false;
    }
  }

  // Save last section
  if (currentParagraphText.trim()) {
    const cleaned = cleanGreekLine(currentParagraphText);
    if (cleaned.length > 10) {
      currentParagraphs.push({
        index: paragraphIndex++,
        text: cleaned
      });
    }
  }
  if (currentParagraphs.length > 0) {
    chapters.push({
      chapterNumber: chapters.length + 1,
      title: `Book ${currentBook}, Section ${currentSection}`,
      sourceContent: { paragraphs: [...currentParagraphs] }
    });
  }

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Combine sections by book for cleaner output
  const bookChapters: Map<number, Chapter> = new Map();
  let globalChapterNum = 1;

  for (const chapter of chapters) {
    const bookMatch = chapter.title.match(/Book (\d+)/);
    if (bookMatch) {
      const bookNum = parseInt(bookMatch[1]);
      const existing = bookChapters.get(bookNum);

      if (existing) {
        // Merge paragraphs
        const baseIndex = existing.sourceContent.paragraphs.length;
        for (const para of chapter.sourceContent.paragraphs) {
          existing.sourceContent.paragraphs.push({
            index: baseIndex + para.index,
            text: para.text
          });
        }
      } else {
        bookChapters.set(bookNum, {
          chapterNumber: globalChapterNum++,
          title: `Book ${bookNum}`,
          sourceContent: { paragraphs: [...chapter.sourceContent.paragraphs] }
        });
      }
    }
  }

  // Write output files (one per book)
  for (const [bookNum, chapter] of bookChapters) {
    const paddedNum = String(bookNum).padStart(3, '0');
    const outputPath = path.join(OUTPUT_DIR, `chapter-${paddedNum}.json`);

    const outputChapter = {
      chapterNumber: bookNum,
      title: `Book ${bookNum}`,
      sourceContent: chapter.sourceContent
    };

    fs.writeFileSync(outputPath, JSON.stringify(outputChapter, null, 2));
    console.log(`Wrote ${outputPath} (${chapter.sourceContent.paragraphs.length} paragraphs)`);
  }

  // Summary statistics
  const totalParagraphs = Array.from(bookChapters.values())
    .reduce((sum, ch) => sum + ch.sourceContent.paragraphs.length, 0);
  const totalChars = Array.from(bookChapters.values())
    .reduce((sum, ch) => sum + ch.sourceContent.paragraphs.reduce((s, p) => s + p.text.length, 0), 0);

  console.log('\n=== Processing Complete ===');
  console.log(`Books processed: ${bookChapters.size}`);
  console.log(`Total paragraphs: ${totalParagraphs}`);
  console.log(`Total characters: ${totalChars.toLocaleString()}`);
}

// Run if called directly
if (require.main === module) {
  processText();
}

export { processText };
