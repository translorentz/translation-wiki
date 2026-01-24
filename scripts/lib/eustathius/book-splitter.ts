/**
 * Book Splitter for Eustathius Commentary on Homer's Odyssey.
 *
 * Identifies the boundaries between Odyssey book commentaries using
 * ΡΑΨΩΔΙΑ section headers. The OCR garbles these headers heavily,
 * but the Greek letter (A-Λ) identifying the Odyssey book is usually
 * recoverable.
 *
 * Volume 1 structure (commentariiadhom01eust_djvu.txt):
 * - Lines 1-100: Internet Archive header, corrupted title page
 * - Lines 103-176: Latin preface about the edition
 * - Lines 178-283: Greek prooemium (general introduction to the Odyssey commentary)
 * - Lines 284+: Commentary organized by Rhapsody (Books 1-11)
 * - Last ~50 lines: Back matter (library cards, garble)
 *
 * Volume 2 structure (commentariiadhom02eust_djvu.txt):
 * - Lines 1-125: Internet Archive header, corrupted title/front matter
 * - Lines 126-137: Argument/synopsis for Book 12
 * - Lines 138+: Commentary organized by Rhapsody (Books 12-24)
 * - Line 19517: "Τέλος τῷ Θεῷ δόξα χαὶ τιμή."
 * - Lines 19518+: Back matter (library cards, garble)
 *
 * Each ΡΑΨΩΔΙΑ header appears as a garbled version of "ΡΑΨΩΙΔΙΑ X. Vs NNN-NNN. PPP"
 * where X is the book letter and PPP is the edition page number.
 */

import type { RhapsodyEntry, TextSection } from "./types.js";

/**
 * Hardcoded book boundaries for Volume 1 based on analysis of the ΡΑΨΩΔΙΑ headers.
 *
 * The book letter in the header identifies which Odyssey book:
 * A=1, B=2, Γ=3, Δ=4, E=5, Z=6, H=7, Θ=8, I=9, K=10, Λ=11
 *
 * Note: Multiple ΡΑΨΩΔΙΑ headers appear within each book (they mark
 * verse-range subsections). The FIRST occurrence of a new letter marks
 * the start of commentary on a new Odyssey book.
 */
const VOL1_BOOK_BOUNDARIES: RhapsodyEntry[] = [
  // Chapter 0: Latin Preface + Greek Prooemium (lines 103-283)
  {
    chapterNumber: 0,
    bookLetter: "Prooemium",
    title: "Preface and Prooemium",
    startLine: 102, // 0-indexed: line 103
    endLine: 283, // exclusive: up to line 284 where Book A starts
  },
  // Chapter 1: Commentary on Odyssey Book 1 (Alpha)
  // The Book 1 commentary ends with the Kybebe/Rhea discussion.
  // Line 5021 ends with "κατεχό-" (hyphenated), lines 5027-5029 contain the
  // continuation "μενος ... δηλοῦσιν οἱ παλαιοί. καὶ οὕτω μὲν Ἀγάδε."
  // which concludes the Book 1 discussion. The ΡΑΨΩΔΙΑ B header at line 5024
  // is a page-level marker but the actual Book 2 commentary begins at line 5030
  // with "(Vers, 19.)" discussing Odyssey 2.19 (the assembly scene).
  {
    chapterNumber: 1,
    bookLetter: "Α",
    title: "Commentary on Odyssey Book 1",
    startLine: 283, // Line 284 (0-indexed): "ΡΑΨΩΙΔ4Ι. A40 Υε.ι--. 03"
    endLine: 5029, // Include continuation lines; Book 2 content starts at 5030
  },
  // Chapter 2: Commentary on Odyssey Book 2 (Beta)
  // Starts at "(Vers, 19.)" on line 5030, discussing Odyssey Book 2 verse 19.
  // Ends just before the actual Book 3 (Gamma) header at line 6974.
  // Note: The garbled header "ΡΑΨ.141].4 D 9. 2} --- 57. 111" at line 6974
  // has "D" which is OCR for Γ (Gamma). The verse refs from line 6978 onward
  // (Vers. 22, 26, 28 etc.) reference Odyssey Book 3 verses, confirming this
  // is the true start of Book 3 commentary.
  {
    chapterNumber: 2,
    bookLetter: "Β",
    title: "Commentary on Odyssey Book 2",
    startLine: 5029, // Line 5030: "(Vers, 19.) Ὅτι..."
    endLine: 6973, // Up to the actual Book Γ header at line 6974
  },
  // Chapter 3: Commentary on Odyssey Book 3 (Gamma)
  // The garbled header at line 6974 "ΡΑΨ.141].4 D 9. 2} --- 57. 111" is
  // actually Gamma (OCR renders Γ as "D" or "]"). Verse numbers from line 6978
  // clearly reference Od. 3.22+. The header at line 8120 "ΡΑΨΩΙ ΔΙΑ I|
  // Vs355a—534) 131" is a CONTINUATION header within Book 3 (verses 355-534).
  {
    chapterNumber: 3,
    bookLetter: "Γ",
    title: "Commentary on Odyssey Book 3",
    startLine: 6973, // Line 6974: "ΡΑΨ.141].4 D 9. 2} --- 57. 111"
    endLine: 8900, // Up to first Book Δ header
  },
  // Chapter 4: Commentary on Odyssey Book 4 (Delta)
  {
    chapterNumber: 4,
    bookLetter: "Δ",
    title: "Commentary on Odyssey Book 4",
    startLine: 8900, // Line 8901: "ΡΑΨΙΩΙΔ4174 4. δε. 46--62. 145"
    endLine: 11931, // Up to first Book E header
  },
  // Chapter 5: Commentary on Odyssey Book 5 (Epsilon)
  {
    chapterNumber: 5,
    bookLetter: "Ε",
    title: "Commentary on Odyssey Book 5",
    startLine: 11931, // Line 11932: "190 ΡΑΨΙΩΙΔ417.4 E Vs. αἰ--ὅο."
    endLine: 14523, // Up to first Book Z header
  },
  // Chapter 6: Commentary on Odyssey Book 6 (Zeta)
  {
    chapterNumber: 6,
    bookLetter: "Ζ",
    title: "Commentary on Odyssey Book 6",
    startLine: 14523, // Line 14524: "ΡῬΡΑΨΙΩ 141... Z 3. ιοο---118. 241"
    endLine: 16131, // Up to first Book H header
  },
  // Chapter 7: Commentary on Odyssey Book 7 (Eta)
  {
    chapterNumber: 7,
    bookLetter: "Η",
    title: "Commentary on Odyssey Book 7",
    startLine: 16131, // Line 16132: "270 ΡΑΨΙΩΙΔΙΑ H — Vsaiá2—21060."
    endLine: 16981, // Up to first Book Θ header
  },
  // Chapter 8: Commentary on Odyssey Book 8 (Theta)
  {
    chapterNumber: 8,
    bookLetter: "Θ",
    title: "Commentary on Odyssey Book 8",
    startLine: 16981, // Line 16982: "284 ΡΑΨΩΙΔΙ14Α 6 Vs75—88."
    endLine: 18943, // Up to first Book I header
  },
  // Chapter 9: Commentary on Odyssey Book 9 (Iota)
  {
    chapterNumber: 9,
    bookLetter: "Ι",
    title: "Commentary on Odyssey Book 9",
    startLine: 18943, // Line 18944: "ΡΑΨΙ1417..4. 1. Ys3—354. 319"
    endLine: 22577, // Up to first Book K header
  },
  // Chapter 10: Commentary on Odyssey Book 10 (Kappa)
  {
    chapterNumber: 10,
    bookLetter: "Κ",
    title: "Commentary on Odyssey Book 10",
    startLine: 22577, // Line 22578: "384 ΡΑΨΩΏΙΔΙ.Α K Vs237—501"
    endLine: 24456, // Up to first Book Λ header
  },
  // Chapter 11: Commentary on Odyssey Book 11 (Lambda)
  {
    chapterNumber: 11,
    bookLetter: "Λ",
    title: "Commentary on Odyssey Book 11",
    startLine: 24456, // Line 24457: "418 ΡΑΨΩΙΔ4Ι.Α 4. - 297---307."
    endLine: 25833, // End of content before back matter
  },
];

/**
 * Hardcoded book boundaries for Volume 2 based on analysis of ΡΑΨΩΔΙΑ / ΟΔΥΣΣΕΙΑ headers.
 *
 * Volume 2 covers Odyssey Books 12-24 (Μ through Ω).
 * OCR garbles the book letters heavily:
 *   M=12, N=13, Ξ=14 (OCR: "X"), O=15, Π=16 (OCR: "H"), P=17,
 *   Σ=18 (OCR: "X"), T=19 (OCR: "Z3"), Y=20, Φ=21 (OCR: "d"),
 *   X=22, Ψ=23 (OCR: "Ὁ"), Ω=24 (OCR: "90"/"ZA")
 *
 * The content summaries (arguments) before each header confirm book identity.
 */
const VOL2_BOOK_BOUNDARIES: RhapsodyEntry[] = [
  // Chapter 12: Commentary on Odyssey Book 12 (Mu)
  // Content summary: "Sirens, Scylla and Charybdis, cattle of Helios"
  // Header: "OA4YEZZEIAEX M. OMHPOY ῬᾺ ΨΩΣΤΆ ΤΑ."
  // Commentary begins: "Ὅτι ἐν τῇ μὶ ταύτῃ ῥαψῳδίᾳ τὴν περιήγησιν ἀπαρτίζει..."
  {
    chapterNumber: 12,
    bookLetter: "Μ",
    title: "Commentary on Odyssey Book 12",
    startLine: 126, // Line 127: Start of argument text for Book 12
    endLine: 2344, // Up to Book N header
  },
  // Chapter 13: Commentary on Odyssey Book 13 (Nu)
  // Content: "Phaeacians deposit sleeping Odysseus in Ithaca, Poseidon turns ship to stone"
  // Header: "ΟΔΥΣΣΕΙΑ͂Σ N OMHPOY ῬΑΨΩΙΔ41Ι4Α."
  {
    chapterNumber: 13,
    bookLetter: "Ν",
    title: "Commentary on Odyssey Book 13",
    startLine: 2344, // Line 2345: "ΟΔΥΣΣΕΙΑ͂Σ N OMHPOY..."
    endLine: 3680, // Up to Book Ξ header
  },
  // Chapter 14: Commentary on Odyssey Book 14 (Xi)
  // Content: "Odysseus at Eumaeus' farm, conversation and pretended identity"
  // Header line 3681: "ia PAWOQIAIA:X" (X is OCR for Ξ)
  // Confirmed by content: "Ξενισμὸς Ὀδυσσέως... παρ᾽ Εὐμαίῳ" (hospitality of Odysseus by Eumaeus)
  {
    chapterNumber: 14,
    bookLetter: "Ξ",
    title: "Commentary on Odyssey Book 14",
    startLine: 3680, // Line 3681: "ia PAWOQIAIA:X"
    endLine: 5670, // Up to Book O header area
  },
  // Chapter 15: Commentary on Odyssey Book 15 (Omicron)
  // Content: "Athena sends Telemachus home, Theoclymenus taken aboard"
  // Header: "1ο O42YZ£EZEIAX O OMHPOY PAWOIAI.A."
  {
    chapterNumber: 15,
    bookLetter: "Ο",
    title: "Commentary on Odyssey Book 15",
    startLine: 5670, // Line 5671: start of argument for Book 15
    endLine: 6988, // Up to Book Π header area
  },
  // Chapter 16: Commentary on Odyssey Book 16 (Pi)
  // Content: "Telemachus arrives at farm, Eumaeus sent to city, Odysseus recognized by his son"
  // Header: "O4YXZEIAZ H. ὉΜΉΡΟΥ. PAWOIAIA." (H is OCR garble for Π)
  // Confirmed by: "ἀναγνωρισμὸς Ὀδυσσέως" (recognition of Odysseus by Telemachus)
  {
    chapterNumber: 16,
    bookLetter: "Π",
    title: "Commentary on Odyssey Book 16",
    startLine: 6988, // Line 6989+: before the header area for Book 16
    endLine: 8260, // Up to Book P (Rho, 17) header area
  },
  // Chapter 17: Commentary on Odyssey Book 17 (Rho)
  // Content: "Telemachus tells Penelope about his journey, Odysseus brought to city by Eumaeus,
  //           the dog recognizes his master"
  // Header: "OA4YZXZXEIA£Z.P.OMHPOY PAWO1414."
  {
    chapterNumber: 17,
    bookLetter: "Ρ",
    title: "Commentary on Odyssey Book 17",
    startLine: 8260, // Line 8261+: argument text for Book 17
    endLine: 9775, // Up to Book Σ (18) header area
  },
  // Chapter 18: Commentary on Odyssey Book 18 (Sigma)
  // Content: "Boxing match of Odysseus and Irus, Penelope appears to suitors"
  // Header: "O4Y£ZZEIAZ X. OMHPOY PA ΨΩΙ414." (X is OCR for Σ)
  {
    chapterNumber: 18,
    bookLetter: "Σ",
    title: "Commentary on Odyssey Book 18",
    startLine: 9775, // Line 9776+: argument text
    endLine: 11188, // Up to Book T (19) header area
  },
  // Chapter 19: Commentary on Odyssey Book 19 (Tau)
  // Content: "Removal of arms with Telemachus, conversation with Penelope,
  //           recognition by Eurycleia through the scar, boar hunt on Parnassus"
  // Header: "PAUWO2oIAI.A Z3." (garbled, Z3 ~ T/Tau)
  {
    chapterNumber: 19,
    bookLetter: "Τ",
    title: "Commentary on Odyssey Book 19",
    startLine: 11188, // Line 11189+: header area for Book 19
    endLine: 13168, // Up to Book Y (20) header area
  },
  // Chapter 20: Commentary on Odyssey Book 20 (Upsilon)
  // Content: "Odysseus plans to kill maidservants but reconsiders,
  //           conversation with Eumaeus and Philoetius, suitors' gathering"
  // Header: "τὴν O4Y£XZEIAZ Y OMHPOY PAWDOIAI A."
  {
    chapterNumber: 20,
    bookLetter: "Υ",
    title: "Commentary on Odyssey Book 20",
    startLine: 13168, // Line 13169+: argument text
    endLine: 14350, // Up to Book Φ (21) header area
  },
  // Chapter 21: Commentary on Odyssey Book 21 (Phi)
  // Content: "Penelope proposes the bow contest, Odysseus strings the bow
  //           and shoots through the axes"
  // Header: "ΟΔΥΣΣΈΕΈΙΑ͂Σ d. OMHPOY PAWDQIAI .." (d is OCR for Φ)
  {
    chapterNumber: 21,
    bookLetter: "Φ",
    title: "Commentary on Odyssey Book 21",
    startLine: 14350, // Line 14351+: argument for Book 21
    endLine: 15748, // Up to Book X (22) header area
  },
  // Chapter 22: Commentary on Odyssey Book 22 (Chi)
  // Content: "Slaughter of the suitors, punishment of maidservants and Melanthius"
  // Header: "04YXEZEIAEX X.OMHPOY PAWOQIAIA."
  {
    chapterNumber: 22,
    bookLetter: "Χ",
    title: "Commentary on Odyssey Book 22",
    startLine: 15748, // Line 15749+: argument text
    endLine: 17110, // Up to Book Ψ (23) header area
  },
  // Chapter 23: Commentary on Odyssey Book 23 (Psi)
  // Content: "Recognition of Odysseus by Penelope, summary of wanderings,
  //           departure with Telemachus"
  // Header: "OAYZZEIAZ£X Ὁ OMHPOY PAWOIAIA." (Ὁ is OCR for Ψ)
  {
    chapterNumber: 23,
    bookLetter: "Ψ",
    title: "Commentary on Odyssey Book 23",
    startLine: 17110, // Line 17111+: argument text
    endLine: 18230, // Up to Book Ω (24) header area
  },
  // Chapter 24: Commentary on Odyssey Book 24 (Omega)
  // Content: "Hermes leads suitors' souls to Hades, Odysseus meets Laertes,
  //           peace with Ithacans"
  // Header: "O4YZZEIAX 90. OMHPOY ΡΑΨΩΣΥΖΙ ZA." (90/ZA = Ω)
  // Ends with: "Τέλος τῷ Θεῷ δόξα χαὶ τιμή." (line 19517)
  {
    chapterNumber: 24,
    bookLetter: "Ω",
    title: "Commentary on Odyssey Book 24",
    startLine: 18230, // Line 18231+: argument text
    endLine: 19518, // Line 19517 is "Τέλος τῷ Θεῷ δόξα χαὶ τιμή."
  },
];

/** Volume 1: Start of actual content (after IA header and corrupted title page) */
const VOL1_CONTENT_START_LINE = 102;

/** Volume 1: End of content (before University of Toronto library card back matter) */
const VOL1_CONTENT_END_LINE = 25833;

/** Volume 2: Start of actual content (after IA header and front matter garble) */
const VOL2_CONTENT_START_LINE = 126;

/** Volume 2: End of content (after "Τέλος τῷ Θεῷ..." before library card) */
const VOL2_CONTENT_END_LINE = 19518;

/**
 * Pattern to detect ΡΑΨΩΔΙΑ section headers (highly garbled by OCR).
 * The key is the "ΡΑΨ" or "ΡΡΑΨ" prefix which is unique to these headers.
 * OCR corrupts the rest (ΩΙΔΙΑ) with numerals, spaces, and wrong characters.
 * Also matches garbled forms missing the Ρ (e.g., "ΑΨ 47." or "»ΑΨΩΙΔΙ").
 */
const RHAPSODIA_PATTERN = /[»Ῥ]*Ρ{0,2}ΑΨ[ΙΩΏΣΨ1-9\s.,]*[ΩΏΙΊ1ΣΤ][ΔΙ41][ΑΙ4.,\s\d]*/;

/**
 * Pattern to detect ΟΔΥΣΣΕΙΑ headers used in Volume 2.
 * The Volume 2 headers take the form "ΟΔΥΣΣΕΙΑΣ X ΟΜΗΡΟΥ ΡΑΨΩΙΔΙΑ"
 * or garbled variants like "O4YXZEIAZ", "O42YZ£EZEIAX", etc.
 */
const ODYSSEIA_HEADER_PATTERN = /O[A4][Y4][XZΣΞ][XZΣΞE]*EIA|ΟΔΥΣΣ[ΕΈ]/;

export type VolumeNumber = 1 | 2;

/**
 * Return the hardcoded book boundary map for the specified volume.
 */
export function getBookBoundaries(volume: VolumeNumber = 1): RhapsodyEntry[] {
  if (volume === 2) {
    return [...VOL2_BOOK_BOUNDARIES];
  }
  return [...VOL1_BOOK_BOUNDARIES];
}

/**
 * Validate that book boundaries match the actual file content.
 * Checks that ΡΑΨΩΔΙΑ or ΟΔΥΣΣΕΙΑ headers exist near the expected positions.
 */
export function validateBoundaries(lines: string[], volume: VolumeNumber = 1): string[] {
  const warnings: string[] = [];
  const boundaries = volume === 2 ? VOL2_BOOK_BOUNDARIES : VOL1_BOOK_BOUNDARIES;

  for (const entry of boundaries) {
    if (entry.chapterNumber === 0) continue; // Skip preface

    // Check that a ΡΑΨΩΔΙΑ or ΟΔΥΣΣΕΙΑ header exists within ±5 lines of startLine
    let found = false;
    for (let i = Math.max(0, entry.startLine - 5); i <= Math.min(lines.length - 1, entry.startLine + 5); i++) {
      const lineText = lines[i] || "";
      if (RHAPSODIA_PATTERN.test(lineText) || ODYSSEIA_HEADER_PATTERN.test(lineText)) {
        found = true;
        break;
      }
    }
    if (!found) {
      // For Volume 2, also check for argument text (Greek content summary paragraphs)
      // which appear before the formal header in some books
      if (volume === 2) {
        let hasGreekContent = false;
        for (let i = entry.startLine; i <= Math.min(lines.length - 1, entry.startLine + 15); i++) {
          const lineText = lines[i] || "";
          if (lineText.length > 50) {
            let greekCount = 0;
            for (const ch of lineText) {
              const code = ch.codePointAt(0);
              if (code && ((code >= 0x0370 && code <= 0x03ff) || (code >= 0x1f00 && code <= 0x1fff))) {
                greekCount++;
              }
            }
            if (greekCount / lineText.length > 0.4) {
              hasGreekContent = true;
              break;
            }
          }
        }
        if (!hasGreekContent) {
          warnings.push(`Book ${entry.chapterNumber} (${entry.bookLetter}): no header or Greek content found near line ${entry.startLine}`);
        }
      } else {
        warnings.push(`Book ${entry.chapterNumber} (${entry.bookLetter}): no ΡΑΨΩΔΙΑ header found near line ${entry.startLine}`);
      }
    }

    // Check that the section has reasonable content
    const sectionLength = entry.endLine - entry.startLine;
    if (sectionLength < 100) {
      warnings.push(`Book ${entry.chapterNumber} (${entry.bookLetter}): very short section (${sectionLength} lines)`);
    }
  }

  return warnings;
}

/**
 * Split the file into text sections based on book boundaries.
 */
export function splitBooks(lines: string[], volume: VolumeNumber = 1): TextSection[] {
  const sections: TextSection[] = [];
  const boundaries = volume === 2 ? VOL2_BOOK_BOUNDARIES : VOL1_BOOK_BOUNDARIES;

  for (const entry of boundaries) {
    const startLine = entry.startLine;
    const endLine = Math.min(entry.endLine, lines.length);
    const rawLines = lines.slice(startLine, endLine);

    sections.push({
      chapterNumber: entry.chapterNumber,
      title: entry.title,
      startLine,
      endLine,
      rawLines,
    });
  }

  return sections;
}

/**
 * Detect ΡΑΨΩΔΙΑ headers in the file (for validation/exploration).
 * Also detects ΟΔΥΣΣΕΙΑ-style headers used in Volume 2.
 */
export function detectRhapsodiaHeaders(lines: string[]): { line: number; text: string }[] {
  const detected: { line: number; text: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || "";
    if (RHAPSODIA_PATTERN.test(line) || ODYSSEIA_HEADER_PATTERN.test(line)) {
      detected.push({ line: i, text: line.trim() });
    }
  }

  return detected;
}

/** Legacy aliases for backwards compatibility */
const CONTENT_START_LINE = VOL1_CONTENT_START_LINE;
const CONTENT_END_LINE = VOL1_CONTENT_END_LINE;

export { CONTENT_START_LINE, CONTENT_END_LINE, VOL1_CONTENT_START_LINE, VOL1_CONTENT_END_LINE, VOL2_CONTENT_START_LINE, VOL2_CONTENT_END_LINE };
