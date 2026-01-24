/**
 * Extract clean Greek verse text from processed Carmina Graeca JSON files.
 * Writes one .txt file per chapter to data/raw/carmina-graeca/
 *
 * Format matches data/raw/ptochoprodromos/Ptochoprodromos.txt:
 * - Title on first line
 * - Author on second line (if known)
 * - Blank line
 * - One verse line per text line
 * - No paragraph groupings
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_DIR = path.join(__dirname, '../data/processed/carmina-graeca');
const OUTPUT_DIR = path.join(__dirname, '../data/raw/carmina-graeca');

// Chapter metadata: slugs and known authors (based on actual JSON titles)
const CHAPTER_META: Record<number, { slug: string; author?: string }> = {
  1: { slug: 'alexios-komnenos', author: 'Ἀλέξιος Κομνηνός' },
  2: { slug: 'threnos-tamyrlankou' },
  3: { slug: 'georgillas-thanatikon-rodou', author: 'Ἐμμανουὴλ Γεωργιλλᾶς' },
  4: { slug: 'sklabos-symfora-kritis', author: 'Μανολῆς Σκλάβος' },
  5: { slug: 'sachlikis-a', author: 'Στέφανος Σαχλήκης' },
  6: { slug: 'sachlikis-b', author: 'Στέφανος Σαχλήκης' },
  7: { slug: 'peri-gerontos' },
  8: { slug: 'synaxarion-gadarou' },
  9: { slug: 'gadaros-lykos-aloupou' },
  10: { slug: 'paidiophrasta-tetrapoda' },
  11: { slug: 'poulologos' },
  12: { slug: 'torikologos' },
  13: { slug: 'peri-xeniteias' },
  14: { slug: 'eis-venetian' },
  15: { slug: 'pikatorios-rima-adin', author: 'Ἰωάννης Πικατόρος' },
  16: { slug: 'alphabetos-katanyktikos' },
  17: { slug: 'apollonios-tyrou' },
  18: { slug: 'vios-gerontos' },
  19: { slug: 'velisarios-diegesis' },
  20: { slug: 'georgillas-velisarios', author: 'Ἐμμανουὴλ Γεωργιλλᾶς' },
  21: { slug: 'rimada-velisariou' },
};

interface Paragraph {
  index: number;
  text: string;
}

interface ChapterJSON {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: Paragraph[];
  };
}

/**
 * Check if a line is likely editorial/apparatus rather than verse
 */
function isEditorialLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;

  // Lines that are mostly Latin characters (editorial notes in the source)
  const greekChars = (trimmed.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) || []).length;
  const latinChars = (trimmed.match(/[a-zA-Z]/g) || []).length;
  const totalAlpha = greekChars + latinChars;

  // If more than 50% Latin and line is longish, it's editorial
  if (totalAlpha > 10 && latinChars / totalAlpha > 0.5) return true;

  // Very short fragments that are likely noise (under 10 chars with weird chars)
  if (trimmed.length < 8 && /^[^α-ωά-ώἀ-ᾗ]*$/.test(trimmed)) return true;

  // Predominantly garbled text (more than 30% non-Greek non-space non-punctuation)
  const cleanedForCheck = trimmed.replace(/[\s.,;:᾽᾿·!?'"""«»—–\-()]/g, '');
  if (cleanedForCheck.length > 5) {
    const nonGreek = cleanedForCheck.replace(/[\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F]/g, '');
    if (nonGreek.length / cleanedForCheck.length > 0.6) return true;
  }

  // Known garbled OCR patterns (any length)
  if (/ργοΐοοίοβ|γμεξοῦ|ΥΧΎΣΥΟΣΣ|ὙΧΎΣΥΟΣΣ|πρηόξις ΤῊΣ|ἀννάσχου δαίωμαι|βαϑοὶύ Βατ/.test(trimmed)) return true;
  if (/ὙΘΙΒΌΠΙ|Τιϑστδηᾶ|γϑυβα|ἰνφέρνον Ῥ|ἴογίαββθ|ἴοχῦ\. τ᾽|οῃὰ βαῦμδβ|τὴῤεθος|Δααϊαϊ/.test(trimmed)) return true;
  // Lines ending with isolated colon (apparatus markers) that are very short
  if (trimmed.length < 15 && /:\s*$/.test(trimmed)) return true;
  // Lines with only apparatus sigla appended (like "καὶ ἐγὼ ΑΒ")
  if (trimmed.length < 15 && /\s[ΑΒΜΡΔαβ]{1,2}\s*$/.test(trimmed)) return true;
  // Lines with garbled parenthetical content that are short
  if (trimmed.length < 22 && /\(πρᾶγμα\)|οἵχὰ/.test(trimmed)) return true;

  // Very short lines (under 10 chars) are always garble fragments per Critic recommendation
  if (trimmed.length < 10) return true;

  // Lines that are predominantly uppercase Greek (likely garbled sigla or catchwords)
  // Check for sequences of 4+ uppercase Greek characters (basic + extended ranges)
  if (trimmed.length < 30 && /[Α-Ω\u1F08-\u1F0F\u1F18-\u1F1D\u1F28-\u1F2F\u1F38-\u1F3F\u1F48-\u1F4D\u1F59-\u1F5F\u1F68-\u1F6F]{4,}/.test(trimmed)) return true;

  // Lines that are just isolated sigla/abbreviations (like "ΚΝ ,")
  if (trimmed.length < 6 && /^[Α-Ω\s,.\-᾽]+$/.test(trimmed)) return true;

  return false;
}

/**
 * Check if a paragraph is editorial commentary (not verse)
 */
function isEditorialParagraph(para: Paragraph, allParas: Paragraph[]): boolean {
  const text = para.text;
  const lines = text.split('\n').filter(l => l.trim());

  // If very few lines and mostly Latin, it's editorial
  const totalChars = text.replace(/\s/g, '').length;
  const greekChars = (text.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) || []).length;

  if (totalChars > 20 && greekChars / totalChars < 0.4) return true;

  // Known editorial patterns - scholarly apparatus language
  if (text.includes('ἑκατονταετηρίδος') && text.includes('χειρογράφου')) return true;
  if (text.includes('ἐξεδόθη') && text.includes('τυπογρά')) return true;
  if (text.includes('ἀντιγραφέως')) return true;
  if (text.includes('κεφάλαια') && text.includes('ἔκδοσις')) return true;
  if (text.includes('ποιητὴς εἶναι') && text.includes('αὐτοκράτωρ')) return true;
  if (text.includes('ἐπιγραφήν') && text.includes('ἀναγινώσκεται')) return true;

  // Very short garbled paragraphs (OCR noise)
  if (totalChars < 30 && lines.length <= 1) {
    // Check if it looks like garbled OCR
    const nonGreekRatio = 1 - (greekChars / Math.max(1, totalChars));
    if (nonGreekRatio > 0.3) return true;
    // Short paragraphs with non-Greek script characters mixed in
    const latinLikeChars = (text.match(/[a-zA-Z]/g) || []).length;
    if (latinLikeChars > 0 && totalChars < 25) return true;
  }

  // Paragraphs that are obviously garbled fragments (short + nonsensical)
  if (lines.length === 1 && totalChars < 30) {
    // Check if the text forms any recognizable Greek words (at least 3+ chars)
    const words = text.trim().split(/\s+/);
    const veryShortWords = words.filter(w => w.replace(/[^α-ωά-ώἀ-ᾗΑ-Ω\u0370-\u03FF\u1F00-\u1FFF]/g, '').length < 3);
    if (veryShortWords.length > words.length * 0.6 && words.length > 1) return true;
  }

  // Paragraphs that are predominantly dots/dashes (corrupted)
  const dotsAndDashes = (text.match(/[.\-᾽·…—–―]+/g) || []).join('').length;
  if (totalChars > 0 && dotsAndDashes / totalChars > 0.5) return true;

  return false;
}

/**
 * Clean a verse line: remove stray editorial marks, normalize
 */
function cleanVerseLine(line: string): string {
  let cleaned = line.trim();

  // Remove leading/trailing quotation marks that are editorial
  cleaned = cleaned.replace(/^[""]/, '');
  cleaned = cleaned.replace(/[""]$/, '');

  // Remove stray isolated manuscript sigla or garble prefixes at start
  // "δδ " is a known OCR garble prefix (Ch11)
  cleaned = cleaned.replace(/^δδ\s+/, '');

  // Remove trailing periods that are editorial (verse usually doesn't end with .)
  // Actually, some verse does have periods - leave them

  // NFC normalize
  cleaned = cleaned.normalize('NFC');

  return cleaned;
}

function processChapter(chapterNum: number): { lineCount: number; issues: string[] } {
  const inputFile = path.join(INPUT_DIR, `chapter-${String(chapterNum).padStart(3, '0')}.json`);
  const meta = CHAPTER_META[chapterNum];

  if (!fs.existsSync(inputFile)) {
    return { lineCount: 0, issues: [`File not found: ${inputFile}`] };
  }

  const data: ChapterJSON = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const issues: string[] = [];

  // Extract Greek title (before the parenthetical English)
  const titleMatch = data.title.match(/^([^(]+)/);
  const greekTitle = titleMatch ? titleMatch[1].trim() : data.title;

  // Collect all verse lines from all paragraphs
  const verseLines: string[] = [];

  for (const para of data.sourceContent.paragraphs) {
    // Skip clearly editorial paragraphs
    if (isEditorialParagraph(para, data.sourceContent.paragraphs)) {
      issues.push(`Skipped editorial paragraph ${para.index}: "${para.text.substring(0, 60)}..."`);
      continue;
    }

    const lines = para.text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Skip lines that are clearly editorial
      if (isEditorialLine(trimmed)) {
        issues.push(`Skipped editorial line in para ${para.index}: "${trimmed.substring(0, 60)}"`);
        continue;
      }

      const cleaned = cleanVerseLine(trimmed);
      if (cleaned) {
        verseLines.push(cleaned);
      }
    }
  }

  // Build output file
  const slug = meta?.slug || `chapter-${String(chapterNum).padStart(2, '0')}`;
  const outputFile = path.join(OUTPUT_DIR, `chapter-${String(chapterNum).padStart(2, '0')}-${slug}.txt`);

  const outputLines: string[] = [];
  outputLines.push(greekTitle);
  if (meta?.author) {
    outputLines.push(meta.author);
  }
  outputLines.push('');  // blank line separator
  outputLines.push(...verseLines);
  outputLines.push('');  // trailing newline

  fs.writeFileSync(outputFile, outputLines.join('\n'), 'utf-8');

  return { lineCount: verseLines.length, issues };
}

// Main
console.log('=== Extracting Carmina Graeca verse text ===\n');

let totalLines = 0;
const allIssues: Record<number, string[]> = {};

for (let i = 1; i <= 21; i++) {
  const { lineCount, issues } = processChapter(i);
  totalLines += lineCount;
  allIssues[i] = issues;

  const meta = CHAPTER_META[i];
  console.log(`Chapter ${String(i).padStart(2, '0')} (${meta?.slug}): ${lineCount} lines, ${issues.length} issues`);
  if (issues.length > 0) {
    issues.forEach(issue => console.log(`  - ${issue}`));
  }
}

console.log(`\nTotal: ${totalLines} verse lines across 21 chapters`);
console.log('Output written to data/raw/carmina-graeca/');
