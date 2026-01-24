/**
 * Title Finder for Carmina Graeca Medii Aevi.
 *
 * Uses a hardcoded ground-truth map of all 21 title positions (verified by
 * manual inspection and subagent exploration), plus a heuristic validator
 * that confirms the hardcoded positions match the actual file content.
 */

import type { TitleEntry } from "./types.js";

/**
 * Ground truth: verified title positions (0-indexed line numbers).
 * These were discovered through systematic grep + manual verification.
 */
const TITLE_MAP: TitleEntry[] = [
  { chapterNumber: 1, startLine: 1110, endLine: 1110, title: "Ἀλεξίου Κομνηνοῦ ποίημα παραινετικόν", englishTitle: "Admonitory Poem of Alexios Komnenos" },
  { chapterNumber: 2, startLine: 2662, endLine: 2662, title: "Θρῆνος περὶ Ταμυρλάγγου", englishTitle: "Lament about Tamerlane" },
  { chapterNumber: 3, startLine: 2863, endLine: 2864, title: "Ἐμμανουὴλ Γεωργιλλᾶ — Θανατικὸν τῆς Ρόδου", englishTitle: "Georgillas' Plague of Rhodes" },
  { chapterNumber: 4, startLine: 4037, endLine: 4039, title: "Μανολῆ Σκλάβου — Ἡ Συμφορὰ τῆς Κρήτης", englishTitle: "Sklabos' Misfortune of Crete" },
  { chapterNumber: 5, startLine: 4711, endLine: 4714, title: "Γραφαὶ καὶ στίχοι Στεφάνου τοῦ Σαχλήκη", englishTitle: "Writings of Sachlikis" },
  { chapterNumber: 6, startLine: 5634, endLine: 5639, title: "Γραφαὶ καὶ στίχοι Στεφάνου τοῦ Σαχλήκη (Β´)", englishTitle: "More Writings of Sachlikis" },
  { chapterNumber: 7, startLine: 7241, endLine: 7241, title: "Περὶ γέροντος νὰ μὴν πάρῃ κορίτσι", englishTitle: "About an Old Man Not Marrying a Girl" },
  { chapterNumber: 8, startLine: 7602, endLine: 7602, title: "Συναξάριον τοῦ τιμημένου γαδάρου", englishTitle: "Synaxarion of the Honored Donkey" },
  { chapterNumber: 9, startLine: 8352, endLine: 8352, title: "Γαδάρου, λύκου κι ἀλουποῦς διήγησις ὡραία", englishTitle: "Tale of Donkey, Wolf, and Fox" },
  { chapterNumber: 10, startLine: 9314, endLine: 9314, title: "Διήγησις παιδιόφραστος τῶν τετραπόδων ζώων", englishTitle: "Childish Tale of Four-legged Animals" },
  { chapterNumber: 11, startLine: 11388, endLine: 11388, title: "Πουλολόγος", englishTitle: "Poulologos (Tale of the Birds)" },
  { chapterNumber: 12, startLine: 12470, endLine: 12470, title: "Διήγησις τοῦ Τωρικολόγου", englishTitle: "Tale of the Tricologos" },
  { chapterNumber: 13, startLine: 12668, endLine: 12668, title: "Περὶ τῆς ξενιτείας", englishTitle: "On Living Abroad" },
  { chapterNumber: 14, startLine: 13622, endLine: 13622, title: "Εἰς Βενετίαν", englishTitle: "To Venice" },
  { chapterNumber: 15, startLine: 13776, endLine: 13781, title: "Ῥίμα θρηνητικὴ εἰς τὸν πικρὸν καὶ ἀκόρεστον Ἅδην — Ἰωάννου Πικατόρου", englishTitle: "Pikatorios' Lament on Hades" },
  { chapterNumber: 16, startLine: 14834, endLine: 14835, title: "Ἀλφάβητος κατανυκτικὸς καὶ ψυχωφελὴς περὶ τοῦ ματαίου κόσμου", englishTitle: "Penitential Alphabet" },
  { chapterNumber: 17, startLine: 15128, endLine: 15129, title: "Διήγησις πολυπαθοῦς Ἀπολλωνίου τοῦ Τύρου", englishTitle: "Tale of Apollonius of Tyre" },
  { chapterNumber: 18, startLine: 16638, endLine: 16639, title: "Βίος καὶ πολιτεία τινὸς δοκιμωτάτου καὶ σοφωτάτου γέροντος", englishTitle: "Life of a Wise Elder" },
  { chapterNumber: 19, startLine: 18463, endLine: 18464, title: "Διήγησις ὡραιοτάτη τοῦ θαυμαστοῦ ἀνδρὸς τοῦ λεγομένου Βελισαρίου", englishTitle: "Tale of Belisarius" },
  { chapterNumber: 20, startLine: 19501, endLine: 19502, title: "Ἐμμανουὴλ Γεωργιλλᾶ — Ἱστορικὴ ἐξήγησις περὶ Βελισαρίου", englishTitle: "Georgillas' History of Belisarius" },
  { chapterNumber: 21, startLine: 21072, endLine: 21072, title: "Ῥιμάδα περὶ Βελισαρίου", englishTitle: "Rhyme on Belisarius" },
];

/** Content starts after front matter */
const CONTENT_START_LINE = 1110;
/** Content ends before back matter (bibliography, indices) */
const CONTENT_END_LINE = 22885;

/**
 * Check if a character is an uppercase Greek letter (including accented forms).
 */
function isUppercaseGreek(char: string): boolean {
  const code = char.codePointAt(0);
  if (code === undefined) return false;

  // Basic uppercase Greek: Α-Ω (U+0391-U+03A9)
  if (code >= 0x0391 && code <= 0x03a9) return true;
  // Accented uppercase: Ά, Έ, Ή, Ί, Ό, Ύ, Ώ
  if (code === 0x0386 || (code >= 0x0388 && code <= 0x038a) || code === 0x038c || code === 0x038e || code === 0x038f) return true;
  // Extended Greek uppercase with breathing/accent (U+1F08-U+1F0F, U+1F18-U+1F1D, etc.)
  if (code >= 0x1f08 && code <= 0x1f0f) return true;
  if (code >= 0x1f18 && code <= 0x1f1d) return true;
  if (code >= 0x1f28 && code <= 0x1f2f) return true;
  if (code >= 0x1f38 && code <= 0x1f3f) return true;
  if (code >= 0x1f48 && code <= 0x1f4d) return true;
  if (code >= 0x1f59 && code <= 0x1f5f) return true; // odd-numbered only for U+1F59-5F
  if (code >= 0x1f68 && code <= 0x1f6f) return true;
  if (code >= 0x1f88 && code <= 0x1f8f) return true;
  if (code >= 0x1f98 && code <= 0x1f9f) return true;
  if (code >= 0x1fa8 && code <= 0x1faf) return true;
  if (code >= 0x1fb8 && code <= 0x1fbc) return true;
  if (code >= 0x1fc8 && code <= 0x1fcc) return true;
  if (code >= 0x1fd8 && code <= 0x1fdb) return true;
  if (code >= 0x1fe8 && code <= 0x1fec) return true;
  if (code >= 0x1ff8 && code <= 0x1ffc) return true;

  return false;
}

/**
 * Check if a character is a lowercase Greek letter (including accented forms).
 */
function isLowercaseGreek(char: string): boolean {
  const code = char.codePointAt(0);
  if (code === undefined) return false;

  // Basic lowercase Greek: α-ω (U+03B1-U+03C9) + final sigma ς (U+03C2)
  if (code >= 0x03b1 && code <= 0x03c9) return true;
  if (code === 0x03c2) return true; // ς
  // Accented lowercase: ά, έ, ή, ί, ό, ύ, ώ, ΐ, ΰ
  if (code === 0x03ac || code === 0x03ad || code === 0x03ae || code === 0x03af) return true;
  if (code === 0x03cc || code === 0x03cd || code === 0x03ce) return true;
  if (code === 0x0390 || code === 0x03b0) return true;
  // Extended Greek lowercase with breathing/accent
  if (code >= 0x1f00 && code <= 0x1f07) return true;
  if (code >= 0x1f10 && code <= 0x1f15) return true;
  if (code >= 0x1f20 && code <= 0x1f27) return true;
  if (code >= 0x1f30 && code <= 0x1f37) return true;
  if (code >= 0x1f40 && code <= 0x1f45) return true;
  if (code >= 0x1f50 && code <= 0x1f57) return true;
  if (code >= 0x1f60 && code <= 0x1f67) return true;
  if (code >= 0x1f70 && code <= 0x1f7d) return true;
  if (code >= 0x1f80 && code <= 0x1f87) return true;
  if (code >= 0x1f90 && code <= 0x1f97) return true;
  if (code >= 0x1fa0 && code <= 0x1fa7) return true;
  if (code >= 0x1fb0 && code <= 0x1fb4) return true;
  if (code === 0x1fb6 || code === 0x1fb7) return true;
  if (code >= 0x1fc2 && code <= 0x1fc4) return true;
  if (code === 0x1fc6 || code === 0x1fc7) return true;
  if (code >= 0x1fd0 && code <= 0x1fd3) return true;
  if (code === 0x1fd6 || code === 0x1fd7) return true;
  if (code >= 0x1fe0 && code <= 0x1fe7) return true;
  if (code >= 0x1ff2 && code <= 0x1ff4) return true;
  if (code === 0x1ff6 || code === 0x1ff7) return true;

  return false;
}

/**
 * Check if a character is any Greek letter (upper or lower).
 */
export function isGreekLetter(char: string): boolean {
  return isUppercaseGreek(char) || isLowercaseGreek(char);
}

/**
 * Determine if a line is an ALL-CAPS Greek title line.
 * Criteria: >50% of alphabetic characters are uppercase Greek, length > 5.
 */
export function isAllCapsGreekLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length <= 5) return false;

  let uppercaseCount = 0;
  let lowercaseCount = 0;

  for (const char of trimmed) {
    if (isUppercaseGreek(char)) uppercaseCount++;
    else if (isLowercaseGreek(char)) lowercaseCount++;
  }

  const totalAlpha = uppercaseCount + lowercaseCount;
  if (totalAlpha < 3) return false; // not enough letters to judge

  return uppercaseCount / totalAlpha > 0.5;
}

/**
 * Return the hardcoded title map.
 */
export function getTitleMap(): TitleEntry[] {
  return [...TITLE_MAP];
}

/**
 * Validate that the hardcoded title positions match the actual file content.
 * Returns a list of warnings if any titles don't match.
 */
export function validateTitles(lines: string[]): string[] {
  const warnings: string[] = [];

  for (const entry of TITLE_MAP) {
    // Check that the title line(s) exist and look like ALL-CAPS Greek
    for (let i = entry.startLine; i <= entry.endLine; i++) {
      if (i >= lines.length) {
        warnings.push(`Chapter ${entry.chapterNumber}: line ${i} is beyond file length (${lines.length})`);
        continue;
      }
      const line = lines[i];
      if (!isAllCapsGreekLine(line) && line.trim().length > 3) {
        // Allow short connector lines like "ΚΑΙ" or blank lines within multi-line titles
        const trimmed = line.trim();
        if (trimmed.length > 5) {
          warnings.push(`Chapter ${entry.chapterNumber}: line ${i} doesn't look ALL-CAPS: "${trimmed.substring(0, 60)}"`);
        }
      }
    }

    // Check that content after the title looks like verse/introduction (not more title)
    const afterTitle = entry.endLine + 3; // skip blank lines
    if (afterTitle < lines.length) {
      const nextLine = lines[afterTitle]?.trim();
      if (nextLine && isAllCapsGreekLine(nextLine) && nextLine.length > 20) {
        warnings.push(`Chapter ${entry.chapterNumber}: line ${afterTitle} after title also looks ALL-CAPS — title may extend further`);
      }
    }
  }

  return warnings;
}

/**
 * Run heuristic title detection to discover ALL-CAPS Greek title lines.
 * Used for comparison/validation against the hardcoded map.
 */
export function detectTitlesHeuristic(lines: string[]): { line: number; text: string }[] {
  const detected: { line: number; text: string }[] = [];

  for (let i = CONTENT_START_LINE; i < Math.min(lines.length, CONTENT_END_LINE); i++) {
    const line = lines[i];
    if (isAllCapsGreekLine(line) && line.trim().length > 10) {
      detected.push({ line: i, text: line.trim() });
    }
  }

  return detected;
}

export { CONTENT_START_LINE, CONTENT_END_LINE };
