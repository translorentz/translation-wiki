/**
 * Process Epitome of Histories (Epitome Historiarum) by John Zonaras — Volume 2
 *
 * Source: Bonn CSHB edition (1844), OCR from Internet Archive
 * File: data/raw/epitome_of_histories/epitome_vol2.txt
 *
 * This script extracts the Greek text from Volume 2, separating it from:
 * - Latin prefaces and front matter
 * - Latin translation by Hieronymus Wolf
 * - Critical apparatus (textual variants)
 * - Source citations (FONTES)
 * - NOTAE (editorial notes at end of volume)
 *
 * Volume 2 contains Books 7-12 (LIBER SEPTIMUS through LIBER DUODECIMUS).
 * Output: chapter-007.json through chapter-012.json
 *
 * OCR artifacts handled:
 * - NONUSRS -> NONUS (Book 9)
 * - DECIMU fS -> DECIMUS (Book 10)
 * - DUODECIMUSRS -> DUODECIMUS (Book 12)
 * - Duplicate LIBER markers (deduplicated by tracking current book)
 */

import * as fs from 'fs';
import * as path from 'path';

const RAW_FILE = path.join(__dirname, '../data/raw/epitome_of_histories/epitome_vol2.txt');
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
  const trimmed = line.trim();

  // Contains manuscript sigla at word boundaries + editorial terms
  const hasSigla = /\b[ABCPWD]\b/.test(trimmed) || /\bPW\b/.test(trimmed) || /\bLXX\b/.test(trimmed);
  const hasEditorialTerm = /\b(om|add|post|pro|cum|sic|cod\.|codex|Colbert|Ducang|Wolfii?|Iosephus|mss|ita|alter|Genesis|Regum|Levit|Plutarchi?|Dionis?|Casaubon|Valesius|Trebell|Eutrop|Zosim|Ammian|Euseb|Lactant|Livium|Tzetzes|excerptum|potius|habet|habent|apud|Victor|vulgo|Regius|Parisiensis|scribit|inquit)\b/i.test(trimmed);

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

  // Page/line references typical of apparatus: "p. N v. N" or "p. NNN"
  if (/p\.\s*\d+\s*v\.\s*\d+/.test(trimmed) || /p\.\s*\d+\s+[a-z]/i.test(trimmed)) {
    return true;
  }

  // Lines containing "ubi ... dissensus" or "ubi ... annotatur" (apparatus meta-commentary)
  if (/ubi\s+.*\b(dissensus|annotatur|notatur)\b/i.test(trimmed)) {
    return true;
  }

  // Lines starting with Latin connectors followed by Greek words (apparatus pattern)
  if (/^(Han|sium|ubique)\s+[A-Z]{1,2}\b/i.test(trimmed)) {
    return true;
  }

  // Lines with "codex Regius" or similar manuscript references
  if (/codex\s+[A-Z][a-z]+/i.test(trimmed)) {
    return true;
  }

  // Lines containing "excerptum" followed by Latin name (Valesianum, etc.)
  if (/excerptum\s+[A-Z][a-z]+/i.test(trimmed)) {
    return true;
  }

  // Lines with "hoc loco" (apparatus term meaning "in this place")
  if (/\bhoc\s+loco\b/i.test(trimmed)) {
    return true;
  }

  // Lines referencing ancient authors in apparatus format (Livium, Eutropium, etc.)
  // These typically contain author names + "om" or variant markers
  if (/\b(Livium|Eutropium|Polybium|Dionysius|Plutarchus|Xiphilinum|Eusebius)\b/i.test(trimmed)) {
    return true;
  }

  // Lines starting with "v. N" (verse/line reference in apparatus)
  if (/^v\.\s*\d+\s+[\u0370-\u03FF\u1F00-\u1FFFa-zA-Z]/i.test(trimmed)) {
    return true;
  }

  // Lines containing "non leguntur apud" (not found in [author])
  if (/non\s+leguntur\s+apud/i.test(trimmed)) {
    return true;
  }

  // Lines with Ducangius/reposuit/codicibus patterns (editorial notes)
  if (/\b(Ducangius|reposuit|codicibus)\b/i.test(trimmed)) {
    return true;
  }

  // Lines starting with "ubique" (apparatus term)
  if (/^ubique\b/i.test(trimmed)) {
    return true;
  }

  return false;
}

// Check if a line is a FONTES citation
function isFontes(line: string): boolean {
  const trimmed = line.trim();
  // FONTES/ΕΌΝΤΕΒ (OCR can mangle it to Greek-like characters)
  return /^F[OοΟ][NνΝWwM][TτΤ][EεΕ][SσΣ]/i.test(trimmed) ||
         /^ΕΌΝΤΕΒ/i.test(trimmed) ||
         /^[FΕ][OοΟΌ][NνΝ][TτΤ][EεΕ][SσΣΒ]/i.test(trimmed) ||
         // Lines like "Cap. 1. Plutarchi..." are FONTES content
         /^Cap\.\s*\d+\./i.test(trimmed);
}

// Check if a line is part of NOTAE section (editorial notes at end)
function isNotae(line: string): boolean {
  return /^(?:\d+\s+)?NOTAE\.?\s*\d*\s*$/i.test(line.trim()) ||
         /^NOTAE\.\s+\d+/i.test(line.trim()) ||
         /^\d+\s+NOTAE\./i.test(line.trim());
}

// Check if a line is a page header
function isPageHeader(line: string): boolean {
  const trimmed = line.trim();

  // Patterns like "ANNALIUM VII 1. 19" or "IOANNIS ZONARAE" or "ANNALIUM XII 1. 123"
  if (/^ANNALIUM\s+[IVXL]+\s*\d*\.?\s*\d*$/i.test(trimmed)) return true;
  if (/^IOANNIS\s+ZONARAE$/i.test(trimmed)) return true;
  if (/^\d+\s*\.?\s*IOANNIS\s+ZONARAE$/i.test(trimmed)) return true;

  // Just a number (page number)
  if (/^\d+$/.test(trimmed)) return true;

  // Page reference like "P I 314" or "W II 6"
  if (/^[PWC]\s+[IVX]+\s+\d+$/.test(trimmed)) return true;

  return false;
}

// Check if a line is a book marker - extended for Books 7-12 with OCR artifact handling
function isBookMarker(line: string): { isMarker: boolean; bookNum?: number } {
  const trimmed = line.trim();

  // Handle OCR artifacts in book markers
  // NONUSRS -> NONUS, DECIMU fS -> DECIMUS, DUODECIMUSRS -> DUODECIMUS
  const normalizedLine = trimmed
    .replace(/NONUSRS/i, 'NONUS')
    .replace(/DECIMU\s*fS/i, 'DECIMUS')
    .replace(/DUODECIMUSRS/i, 'DUODECIMUS');

  const match = normalizedLine.match(/^LIBER\s+(PRIMUS|SECUNDUS|TERTIUS|QUARTUS|QUINTUS|SEXTUS|SEPTIMUS|OCTAVUS|NONUS|DECIMUS|UNDECIMUS|DUODECIMUS|TERTIUS\s*DECIMUS|QUARTUS\s*DECIMUS|QUINTUS\s*DECIMUS|SEXTUS\s*DECIMUS|SEPTIMUS\s*DECIMUS|DUODEVICESIMUS|UNDEVICESIMUS)\.?$/i);

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
      'TERTIUS DECIMUS': 13,
      'QUARTUS DECIMUS': 14,
      'QUINTUS DECIMUS': 15,
      'SEXTUS DECIMUS': 16,
      'SEPTIMUS DECIMUS': 17,
      'DUODEVICESIMUS': 18,
      'UNDEVICESIMUS': 19,
    };
    const bookWord = match[1].toUpperCase().replace(/\s+/g, ' ');
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
  // Also handle page refs at start: "P I 4732 l. Ἔξ ἀρχῆς"
  const match = trimmed.match(/^(?:[PWC]\s+[IVX]+\s+\d+\s+)?(\d+)[.,l]\s*[\u0370-\u03FF\u1F00-\u1FFF]/);
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
  console.log('Processing Epitome of Histories Volume 2 (Books 7-12)...');

  const rawText = fs.readFileSync(RAW_FILE, 'utf-8');
  const lines = rawText.split('\n');

  // Find where actual content begins (after LIBER SEPTIMUS)
  let contentStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const bookCheck = isBookMarker(lines[i]);
    if (bookCheck.isMarker && bookCheck.bookNum === 7) {
      contentStart = i + 1;
      break;
    }
  }

  console.log(`Content starts at line ${contentStart + 1}`);

  // Find where NOTAE section begins (skip editorial notes at end)
  let notaeStart = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (isNotae(lines[i])) {
      // Find the first NOTAE marker
      notaeStart = i;
    }
  }
  // More robust: find the actual start of NOTAE section
  for (let i = contentStart; i < lines.length; i++) {
    if (/^632\s*[-—–]?\s*NOTAE\./i.test(lines[i].trim())) {
      notaeStart = i;
      break;
    }
  }
  console.log(`NOTAE section starts at line ${notaeStart + 1}, will stop processing there`);

  // Process line by line, extracting Greek content
  const chapters: Chapter[] = [];
  let currentBook = 7;
  let currentSection = 0;
  let currentParagraphs: Array<{ index: number; text: string }> = [];
  let currentParagraphText = '';
  let paragraphIndex = 0;
  let lastLineWasGreek = false;
  let processedBooks = new Set<number>();

  for (let i = contentStart; i < notaeStart; i++) {
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
      // Skip duplicate book markers (OCR artifact)
      if (processedBooks.has(bookCheck.bookNum)) {
        console.log(`  Skipping duplicate marker for Book ${bookCheck.bookNum}`);
        continue;
      }

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
      processedBooks.add(currentBook);
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
          chapterNumber: bookNum,
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
  console.log(`Books processed: ${bookChapters.size} (Books 7-12)`);
  console.log(`Total paragraphs: ${totalParagraphs}`);
  console.log(`Total characters: ${totalChars.toLocaleString()}`);
}

// Run if called directly
if (require.main === module) {
  processText();
}

export { processText };
