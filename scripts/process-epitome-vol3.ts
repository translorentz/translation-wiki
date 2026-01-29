/**
 * Process Epitome of Histories (Epitome Historiarum) Volume 3 by John Zonaras
 *
 * Source: Bonn CSHB edition (1897), OCR from Internet Archive
 * File: data/raw/epitome_of_histories/epitome_vol3.txt
 *
 * This script extracts the Greek text, separating it from:
 * - Latin prefaces and front matter
 * - Latin translation by Hieronymus Wolf
 * - Critical apparatus (textual variants)
 * - Source citations (FONTES)
 *
 * Volume 3 contains Books 13-18 (the final six books).
 *
 * Structure pattern:
 * 1. Greek original text (paragraphs containing Greek characters)
 * 2. Critical apparatus (lines with manuscript sigla like "1 post Θεός PW add δ᾽")
 * 3. FONTES section (source citations)
 * 4. Latin translation (paragraphs without Greek characters)
 * 5. Page headers like "ANNALIUM XIII 1. 19" or "IOANNIS ZONARAE"
 */

import * as fs from 'fs';
import * as path from 'path';

const RAW_FILE = path.join(__dirname, '../data/raw/epitome_of_histories/epitome_vol3.txt');
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
  // Critical apparatus lines typically contain sigla like A, B, C, D, E, P, W
  // and editorial terms like om, add, post, pro, cum, et, sic, cod., Ducang.
  // Volume 3 uses sigla: A (Parisinus 1715), B (Vindobon. 16), C (Monac. 324),
  // D (Monac. 93), E (Monac. 325)
  // Examples:
  // "1 post Θεός PW add δ᾽, om ABG"
  // "4 δὲ om A. 8 καϑηρὰν A. 15 ὑπερέϑετο)] ἐπέϑετο A."
  // "9 λικιννίον AR constanter"
  // "4 γεγέννηται E, γεγένητο DwpDi"

  const trimmed = line.trim();

  // Contains manuscript sigla at word boundaries + editorial terms
  const hasSigla = /\b[ABCDEPW]\b/.test(trimmed) || /\bPW\b/.test(trimmed) ||
                   /\bLXX\b/.test(trimmed) || /\bAR\b/.test(trimmed) ||
                   /\bDwp\b/.test(trimmed) || /\bDi\b/.test(trimmed) ||
                   /\bOwp\b/.test(trimmed) || /\bRwp\b/.test(trimmed) ||
                   /\bB[s*]\b/.test(trimmed) || /\bwp\b/.test(trimmed);

  const hasEditorialTerm = /\b(om|add|post|pro|cum|sic|cod\.|codex|Colbert|Ducang|Wolfii?|Iosephus|mss|ita|alter|Genesis|Regum|Levit|constanter|corr|falso|consuevit|v\.\s+ad|vs\.|extr|invitis|del|tatum|punctis|suppl|notat)\b/i.test(trimmed);

  // Starts with number followed by Greek/text (typical apparatus format)
  if (/^\d+\s+[\u0370-\u03FF\u1F00-\u1FFFa-zA-Z]/.test(trimmed)) {
    if (hasSigla || hasEditorialTerm) {
      return true;
    }
  }

  // Has multiple apparatus markers in one line (like "4 ... A. 8 ... A.")
  const multipleMarkers = trimmed.match(/\d+\s+[\u0370-\u03FF\u1F00-\u1FFFa-zA-Z]+.*\b[ABCDEPW]\b.*\d+\s+[\u0370-\u03FF\u1F00-\u1FFFa-zA-Z]+/);
  if (multipleMarkers) return true;

  // Patterns like "αὐτῆς AW, αὐτὸς P." or "δ᾽ A, δὲ PW"
  if (/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDEPW]+[,.]/.test(trimmed) && hasSigla) {
    return true;
  }

  // Lines ending with manuscript sigla reference
  if (/\b[ABCDEPW]+\.?\s*$/.test(trimmed) && hasEditorialTerm) {
    return true;
  }

  // References to other sections like "v. ad XIII 1,5" or "II p. 622, 15"
  if (/\bv\.\s+(ad\s+)?[XIVLC]+\s+\d+/.test(trimmed) || /\b[IVX]+\s+p\.\s+\d+/.test(trimmed)) {
    return true;
  }

  // Lines with apparatus notation patterns
  if (/\]\s+[IVXLC]+\s+p\.\s+\d+/.test(trimmed)) {
    return true;
  }

  // Lines that look like apparatus (short, with manuscript refs)
  // Pattern: single Greek word + manuscript sigla
  if (/^[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDEPW]+[,.\s]/.test(trimmed) && trimmed.length < 80) {
    return true;
  }

  // Lines ending with "wp" or "Di" (common edition references)
  if (/\bwp\s*$/i.test(trimmed) || /\bDi\s*$/i.test(trimmed) || /\bRwp\s*$/i.test(trimmed)) {
    return true;
  }

  // Lines containing "]" which often indicates apparatus cross-reference
  if (/]\s*[IVXLC]+\s+p\./.test(trimmed)) {
    return true;
  }

  // Short lines with apparatus-like patterns
  if (trimmed.length < 100 && /\b(RbwpDi|RwpDi|EwpDi|BwpDi|wpDi)\b/.test(trimmed)) {
    return true;
  }

  // Lines with manuscript sigla followed by comma or period (variant readings)
  // Pattern: Greek text + space + single capital letter + comma/period
  // e.g., "βασιλεία τοῦ μεγάλου Κωνσταντίνου AE,"
  if (/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE][,.\s]/.test(trimmed) && trimmed.length < 150) {
    // Contains manuscript sigla pattern
    return true;
  }

  // Lines with isolated sigla in the middle of Greek text
  // e.g., "Κωνσταντίνου D περὶ τῆς"
  if (/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE]\s+[\u0370-\u03FF\u1F00-\u1FFF]+/.test(trimmed) && trimmed.length < 150) {
    return true;
  }

  // Lines starting with Greek letter followed by apparatus patterns
  // e.g., "ἴ δυσίν A falso"
  if (/^[\u0370-\u03FF\u1F00-\u1FFF]/.test(trimmed) && /\b(falso|nam|nisi|sed|enim|cum|quod)\b/i.test(trimmed)) {
    return true;
  }

  // Lines containing "om." pattern (omitted variants)
  if (/\bom\.\s*[ABCDE]/.test(trimmed)) {
    return true;
  }

  // Lines with colophon patterns (scribe notes at end of manuscripts)
  if (/ἐτελειώϑη|ἐγράφει|χειρὸς|ἁμαρτωλοῦ|μοναχοῦ|ἁμαρτιῶν|ἁγία\s+τριὰσ|nomen\s+evanuit/.test(trimmed)) {
    return true;
  }

  // Lines containing Latin phrases common in apparatus (with Greek)
  if (/\b(adhibere|exeunte|sequentis|enuntiato|suppl\.|punctis)\b/i.test(trimmed)) {
    return true;
  }

  // Lines ending with a single uppercase letter followed by comma (sigla)
  // e.g., "...Κωνσταντίνου AE," or "...σταυροῦ C"
  if (/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE][,.]?\s*$/.test(trimmed) && trimmed.length < 120) {
    return true;
  }

  // Lines starting with "l " or "add." or number followed by sigla pattern
  if (/^l\s+[\u0370-\u03FF\u1F00-\u1FFF]/.test(trimmed) && /[ABCDE][,.]/.test(trimmed)) {
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

  // Patterns like "ANNALIUM XIII 1. 19" or "IOANNIS ZONARAE"
  if (/^ANNALIUM\s+[XIVLC]+\s*\d*\.?\s*\d*$/i.test(trimmed)) return true;
  if (/^IOANNIS\s+ZONARAE$/i.test(trimmed)) return true;
  if (/^\d+\s*\.?\s*IOANNIS\s+ZONARAE$/i.test(trimmed)) return true;
  if (/^Zonarae\s+Epitome/i.test(trimmed)) return true;
  if (/^ZONAR\.\s+EPIT\./i.test(trimmed)) return true;

  // Just a number (page number)
  if (/^\d+$/.test(trimmed)) return true;

  // Page headers with Roman numerals
  if (/^[XIVLC]+\s+Praefatio/i.test(trimmed)) return true;
  if (/^Praefatio\.\s+[XIVLC]+$/i.test(trimmed)) return true;

  return false;
}

// Check if a line is a book marker for Volume 3 (Books 13-18)
function isBookMarker(line: string): { isMarker: boolean; bookNum?: number } {
  const trimmed = line.trim().toUpperCase();

  // Volume 3 book markers:
  // LIBER TERTIVS DECIMVS (13) - but this doesn't appear, content starts without marker
  // LIBER QVARTVS DECIMVS (14)
  // LIBER QVINTVS DECIMVS (15)
  // LIBER SEXTVS DECIMVS (16)
  // LIBER DECIMVS SEPTIMVS (17)
  // LIBER DVODEVICESIMVS (18)

  const bookPatterns: Array<{ pattern: RegExp; bookNum: number }> = [
    { pattern: /^LIBER\s+TERTI[UV]S\s+DECIM[UV]S\.?$/, bookNum: 13 },
    { pattern: /^LIBER\s+Q[UV]ART[UV]S\s+DECIM[UV]S\.?$/, bookNum: 14 },
    { pattern: /^LIBER\s+Q[UV]INT[UV]S\s+DECIM[UV]S\.?$/, bookNum: 15 },
    { pattern: /^LIBER\s+SEXT[UV]S\s+DECIM[UV]S\.?$/, bookNum: 16 },
    { pattern: /^LIBER\s+DECIM[UV]S\s+SEPTIM[UV]S\.?$/, bookNum: 17 },
    { pattern: /^LIBER\s+D[UV]ODEVICESIM[UV]S\.?$/, bookNum: 18 },
    { pattern: /^LIBER\s+[UV]NDEVICESIM[UV]S\.?$/, bookNum: 19 }, // Just in case
  ];

  for (const { pattern, bookNum } of bookPatterns) {
    if (pattern.test(trimmed)) {
      return { isMarker: true, bookNum };
    }
  }

  return { isMarker: false };
}

// Check if a line is a chapter/section start marker (for internal structure)
function isSectionMarker(line: string): boolean {
  const trimmed = line.trim();
  // Section headers like "CONSTANTINVS MAGNVS RERVM POTITVR" (all caps Latin)
  if (/^[A-Z]{4,}(\s+[A-Z]+)+\.?\s*$/.test(trimmed)) {
    return true;
  }
  return false;
}

// Clean up a Greek text line
function cleanGreekLine(line: string): string {
  // Remove line numbers that appear in margin (like "5" or "10" or "15" at start)
  let cleaned = line.replace(/^\s*\d+\s*(?=[A-Z\u0370-\u03FF\u1F00-\u1FFF])/, '');

  // Remove manuscript references embedded in text (like "P I 70" or "W I 48" or "D III")
  cleaned = cleaned.replace(/\b[ABCDEPW]\s*[IVX]+\s*\d*\b/g, '');

  // Remove page reference markers at end
  cleaned = cleaned.replace(/\s*[PWABCDE]\s*$/g, '');

  // Remove inline page references like "D III" or "B I"
  cleaned = cleaned.replace(/\s+[ABCDEPW]\s+[IVX]+\s*$/g, '');

  // Remove inline margin numbers (like "5" or "10" appearing mid-text after Greek)
  cleaned = cleaned.replace(/\s+\d{1,2}\s+(?=[A-Z\u0370-\u03FF\u1F00-\u1FFF])/g, ' ');

  // Remove trailing margin numbers
  cleaned = cleaned.replace(/\s+\d{1,2}\s*$/g, '');

  // Remove edition references that slip through (like "RwpDi" "wpDi" etc.)
  cleaned = cleaned.replace(/\b(RwpDi|EwpDi|BwpDi|wpDi|RbwpDi)\b/g, '');

  // Remove standalone edition sigla references
  cleaned = cleaned.replace(/\bDwp\b/g, '');
  cleaned = cleaned.replace(/\bOwp\b/g, '');

  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

// Check if line is part of front matter / preface
function isFrontMatter(line: string): boolean {
  const trimmed = line.trim();

  // German text in preface
  if (/\b(und|der|die|das|ist|nicht|auch|mit|aus|bei|für|zur|vom|zum|des|dem|den|ein|eine|einer)\b/i.test(trimmed)) {
    return true;
  }

  // Latin preface section markers
  if (/^PRAEFATIO/i.test(trimmed)) return true;
  if (/^FRIDERICO\s+HULTSCHIO/i.test(trimmed)) return true;
  if (/^CORPUS\s+SCRIPTORUM/i.test(trimmed)) return true;
  if (/^EDITIO\s+EMENDATIOR/i.test(trimmed)) return true;
  if (/^ACADEMIAE\s+LITTERARUM/i.test(trimmed)) return true;
  if (/^BONNAE$/i.test(trimmed)) return true;
  if (/^IMPENSIS/i.test(trimmed)) return true;
  if (/^MDCCC/i.test(trimmed)) return true;
  if (/^TOMUS\s+III/i.test(trimmed)) return true;
  if (/^EX\s+RECENSIONE/i.test(trimmed)) return true;
  if (/^EDIDIT$/i.test(trimmed)) return true;
  if (/^Seribebam\s+Dresdae/i.test(trimmed)) return true;

  return false;
}

// Check if we've reached the back matter (indexes, etc.)
function isBackMatter(line: string): boolean {
  const trimmed = line.trim();

  // Index sections at end of volume
  if (/^INDEX\s+(ANNOTATIONUM|HISTORICVS|AVCTORVM)/i.test(trimmed)) return true;
  if (/^FINIS$/i.test(trimmed)) return true;

  return false;
}

function processText(): void {
  console.log('Processing Epitome of Histories Volume 3 (Books 13-18)...');

  const rawText = fs.readFileSync(RAW_FILE, 'utf-8');
  const lines = rawText.split('\n');

  // Find where actual Greek content begins (after preface)
  // Book 13 starts with Greek text about Constantine the Great
  // Look for first substantial Greek content
  let contentStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Look for the first Greek paragraph about Constantine
    if (line.includes('Κωνσταντῖνος') && isGreekLine(line) && line.length > 50) {
      contentStart = i;
      break;
    }
  }

  // Find where back matter begins (INDEX sections)
  let contentEnd = lines.length;
  for (let i = contentStart; i < lines.length; i++) {
    if (isBackMatter(lines[i])) {
      contentEnd = i;
      console.log(`Back matter starts at line ${i + 1} - stopping there`);
      break;
    }
  }

  console.log(`Content starts at line ${contentStart + 1}`);

  // Process line by line, extracting Greek content
  const bookChapters: Map<number, Chapter> = new Map();
  let currentBook = 13; // Volume 3 starts with Book 13
  let currentParagraphs: Array<{ index: number; text: string }> = [];
  let currentParagraphText = '';
  let paragraphIndex = 0;
  let lastLineWasGreek = false;
  let inFrontMatter = false;
  let totalLinesProcessed = 0;

  // Initialize Book 13
  bookChapters.set(13, {
    chapterNumber: 13,
    title: 'Book 13',
    sourceContent: { paragraphs: [] }
  });

  for (let i = contentStart; i < contentEnd; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    totalLinesProcessed++;

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
      // Save current paragraphs to current book before moving to new book
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

      // Save to current book
      const existingBook = bookChapters.get(currentBook);
      if (existingBook) {
        existingBook.sourceContent.paragraphs.push(...currentParagraphs);
      }

      // Move to new book
      currentBook = bookCheck.bookNum;
      currentParagraphs = [];
      paragraphIndex = 0;

      // Initialize new book if not exists
      if (!bookChapters.has(currentBook)) {
        bookChapters.set(currentBook, {
          chapterNumber: currentBook,
          title: `Book ${currentBook}`,
          sourceContent: { paragraphs: [] }
        });
      }

      console.log(`Found Book ${currentBook} at line ${i + 1}`);
      continue;
    }

    // Skip front matter
    if (isFrontMatter(trimmedLine)) {
      lastLineWasGreek = false;
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

    // Skip section markers (Latin headers)
    if (isSectionMarker(trimmedLine)) {
      lastLineWasGreek = false;
      continue;
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

  // Save remaining paragraphs to current book
  const existingBook = bookChapters.get(currentBook);
  if (existingBook) {
    existingBook.sourceContent.paragraphs.push(...currentParagraphs);
  }

  // Create output directory if not exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write output files (one per book)
  for (const [bookNum, chapter] of bookChapters) {
    if (chapter.sourceContent.paragraphs.length === 0) {
      console.log(`Skipping Book ${bookNum} - no paragraphs`);
      continue;
    }

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
  console.log(`Lines processed: ${totalLinesProcessed}`);
  console.log(`Books processed: ${bookChapters.size} (Books 13-${Math.max(...bookChapters.keys())})`);
  console.log(`Total paragraphs: ${totalParagraphs}`);
  console.log(`Total characters: ${totalChars.toLocaleString()}`);
}

// Run if called directly
if (require.main === module) {
  processText();
}

export { processText };
