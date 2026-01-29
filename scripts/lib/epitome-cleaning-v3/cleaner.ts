/**
 * Main cleaning pipeline for Zonaras Epitome Vol. 3
 *
 * Extracts clean Greek text from the OCR source, filtering out:
 * - Critical apparatus
 * - Latin translation
 * - Page headers and markers
 * - Front/back matter
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  countGreekChars,
  greekRatio,
  getBookNumber,
  isFrontMatter,
  isBackMatter,
  isPageHeader,
  hasPageMarker,
  hasCombinedSigla,
} from './patterns';
import { classifyLine, filterLines, FilterStats, isGreekLine } from './filters';
import { analyzeChapter, ChapterQuality, generateQualityReport } from './validators';

/**
 * Chapter output structure
 */
export interface Chapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: Array<{ index: number; text: string }>;
  };
}

/**
 * Cleaning options
 */
export interface CleaningOptions {
  rawFilePath: string;
  outputDir: string;
  verbose?: boolean;
  generateReport?: boolean;
}

/**
 * Clean a single line of Greek text (remove embedded artifacts)
 */
export function cleanGreekLine(line: string): string {
  let cleaned = line;

  // Remove line numbers at start (like "5" or "10" before Greek)
  cleaned = cleaned.replace(/^\s*\d{1,2}\s+(?=[A-Z\u0370-\u03FF\u1F00-\u1FFF])/, '');

  // Remove page reference markers embedded in text
  // Patterns: "P I11", "W III 4", "D III", "PIIIA", "W1II213"
  cleaned = cleaned.replace(/\s*[PWDBC]\s*[IVX1]+\s*[A-Z]?\d*\s*/g, ' ');

  // Remove margin sigla at end of line
  cleaned = cleaned.replace(/\s+[ABCDEPW]\s*$/g, '');

  // Remove inline margin numbers
  cleaned = cleaned.replace(/\s+\d{1,2}\s+(?=[A-Z\u0370-\u03FF\u1F00-\u1FFF])/g, ' ');
  cleaned = cleaned.replace(/\s+\d{1,2}\s*$/g, '');

  // Remove edition references that slip through - comprehensive list
  cleaned = cleaned.replace(/\b(RwpDi|EwpDi|BwpDi|wpDi|RbwpDi|Dwp|Owp|DwpJDi|RwpJDt|RwpJDi|AEwp|Rwp|Ewp|Bwp|Awp)\b/g, '');
  // Also remove any combined sigla patterns: "Greek RwpJDt," or "Greek AE,"
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDERW]w?p?J?D?[ti]?,\s*/g, ' ');
  // Remove AEwp, Rwp, Ewp in parentheses: "(wp)", "(Rwp)", "(AEwp)"
  cleaned = cleaned.replace(/\([ABCDERW]?w?p?\)/g, '');
  // Remove inline sigla like "AE," or "Rwp," appearing mid-text
  cleaned = cleaned.replace(/\b[ABCDE]wp,?\s*/g, '');

  // ====== NEW: Aggressive sigla and apparatus removal ======

  // Remove standalone sigla: Di, Ep, Ap, CD, Ww, etc.
  // Pattern: space + 1-2 capital letters + space (not at Greek word boundary)
  cleaned = cleaned.replace(/\s+Di\s+/g, ' ');
  cleaned = cleaned.replace(/\s+Ep\s+/g, ' ');
  cleaned = cleaned.replace(/\s+Ap\s+/g, ' ');
  cleaned = cleaned.replace(/\s+CD\s+/g, ' ');
  cleaned = cleaned.replace(/\s+Ww\*?\s*/g, ' ');
  cleaned = cleaned.replace(/\s+Hv\s+/g, ' ');

  // Remove "A gro" type OCR garbage
  cleaned = cleaned.replace(/\s+A\s+gro,?\s*/g, ' ');
  cleaned = cleaned.replace(/\s+A\s+fev\s*/g, ' ');

  // Remove Latin apparatus phrases that slip through
  cleaned = cleaned.replace(/typotheta\s+apud\.?\s*Di\s+inter\s+[\u0370-\u03FF\u1F00-\u1FFF]+\s+et\s+[\u0370-\u03FF\u1F00-\u1FFF]+/gi, '');
  cleaned = cleaned.replace(/ex\.\s*versu\s+[\u0370-\u03FF\u1F00-\u1FFF]+\s+[A-Z]\s*\(v\.\s*argum\.[^)]*\)/gi, '');
  cleaned = cleaned.replace(/\(v\.\s*argum\.[^)]*\)/gi, '');

  // Remove patterns like ""Apá A" or "Apá" - garbled OCR with quotes
  // This should become Ἀράβων (Arabs) but we can just clean the garbled sigla part
  cleaned = cleaned.replace(/[""]Apá\s+A\b/g, 'Ἀράβων');
  cleaned = cleaned.replace(/[""]Apá\b/g, 'Ἀράβων');
  // Also handle κατὰ "Apá - different quote type
  cleaned = cleaned.replace(/κατὰ\s+[""]Apá/g, 'κατὰ Ἀράβων');

  // Fix OCR corruption of "Ao- μενιακῶν" -> Ἀρμενιακῶν (Armenians)
  cleaned = cleaned.replace(/[""]Ao-\s*μενιακῶν/g, 'Ἀρμενιακῶν');
  cleaned = cleaned.replace(/τῶν\s+[""]Ao-\s*μενιακῶν/g, 'τῶν Ἀρμενιακῶν');

  // Remove floating sigla: CD, AB, etc. between Greek words
  cleaned = cleaned.replace(/([\u0370-\u03FF\u1F00-\u1FFF])\s+[ABCDE]{1,2}\s+([\u0370-\u03FF\u1F00-\u1FFF])/g, '$1 $2');

  // Remove "ῥαγκαβὲ D" type patterns (Greek + single sigla letter)
  cleaned = cleaned.replace(/([\u0370-\u03FF\u1F00-\u1FFF]+)\s+[ABCDERW]\s+\(/g, '$1 (');

  // Remove ὕψους Ὁ patterns (Ὁ used as sigla)
  cleaned = cleaned.replace(/ὕψους\s+Ὁ\s+/g, 'ὕψους ');
  cleaned = cleaned.replace(/αὐτὴν\s+CD\s+/g, 'αὐτὴν ');

  // Additional sigla patterns found in remaining contamination:
  // "ὑποσύραι ARwp, ὑποσῦραι CDi" - variant reading blocks
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDERW]+w?p?,\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE]+[Ddi]+/g, '');
  // "δεῦμα CDi, v." pattern
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE]{1,2}[Ddi]+,?\s*v\.\s*/g, '');
  // "quod tenent RwpD" - Latin apparatus
  cleaned = cleaned.replace(/quod\s+tenent\s+[ABCDERW]+w?p?D?/gi, '');
  // "omisso Greek, quod tenent" - Latin apparatus
  cleaned = cleaned.replace(/omisso\s+[\u0370-\u03FF\u1F00-\u1FFF]+,?\s*quod\s+tenent[^.]*\./gi, '');
  // "AD Psell." - sigla with source
  cleaned = cleaned.replace(/\s+[ABCDE]{1,2}\s+Psell\.?\s*/g, ' ');
  // "Π Πατζινάκαις" - page marker with Greek
  cleaned = cleaned.replace(/Π\s+Π([αε]τζ)/g, 'Π$1');
  // "MIL λούμενος" - OCR garbage
  cleaned = cleaned.replace(/\s+MIL\s+/g, ' ');
  // "τῶν À, Di," - sigla variants
  cleaned = cleaned.replace(/τῶν\s+À,\s*[ABCDE]+[Ddi]*,?\s*/g, 'τῶν ');
  // "κροίνοιεν ἂν μαγείοῳ προσεοι-" type hyphenated fragments
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+ἂν\s+[\u0370-\u03FF\u1F00-\u1FFF]+\s+[\u0370-\u03FF\u1F00-\u1FFF]+-\s*/g, '');

  // More sigla patterns:
  // "Wi" sigla
  cleaned = cleaned.replace(/\s+Wi\s+/g, ' ');
  // "Ai" sigla
  cleaned = cleaned.replace(/\s+Ai\s+/g, ' ');
  // "Dp" sigla
  cleaned = cleaned.replace(/\s+Dp\s+/g, ' ');
  // "Rw" sigla
  cleaned = cleaned.replace(/\s+Rw\s+/g, ' ');
  // "RwpDt" sigla
  cleaned = cleaned.replace(/\bRwpDt\b/g, '');
  // "CDi" sigla
  cleaned = cleaned.replace(/\bCDi\b/g, '');
  // "Ap" in apparatus context (followed by Greek)
  cleaned = cleaned.replace(/\s+Ap\s+([\u0370-\u03FF\u1F00-\u1FFF])/g, ' $1');
  // "omisso Greek" patterns
  cleaned = cleaned.replace(/omisso\s+[\u0370-\u03FF\u1F00-\u1FFF]+/gi, '');
  cleaned = cleaned.replace(/\bomisso\b/gi, '');

  // Remove isolated sigla in Greek context (but be careful not to remove Greek letters)
  // Pattern: Greek + space + single Latin letter + space/comma + Greek
  cleaned = cleaned.replace(/([\u0370-\u03FF\u1F00-\u1FFF])\s+[ABCDE]\s+([\u0370-\u03FF\u1F00-\u1FFF])/g, '$1 $2');

  // Remove sigla with comma/period patterns
  cleaned = cleaned.replace(/\s+[ABCDE][,.]\s*/g, ' ');

  // Remove cross-references like "(v. ad. XIV 11, 7)"
  cleaned = cleaned.replace(/\(v\.\s+ad\.?\s+[XIVLC]+\s*\d+[,.\s]*\d*\)/gi, '');

  // Remove OCR artifacts that look like page markers
  cleaned = cleaned.replace(/ΡΙΓΦΑ|MILI|ΘΗΤῸ/g, '');

  // Remove patterns like "om. Rwp" or "add. CE"
  cleaned = cleaned.replace(/\b(om|add|post|corr|del)\.\s*[ABCDERW]+[wp]*\b/gi, '');

  // Remove "À" followed by Greek (artifact)
  cleaned = cleaned.replace(/À\s*(?=[\u0370-\u03FF\u1F00-\u1FFF])/g, '');

  // Remove "w*p" patterns
  cleaned = cleaned.replace(/\bw\*p\b/g, '');

  // Remove isolated numbers like "-15" or "Ó11" or "θ"
  cleaned = cleaned.replace(/[ÓΌ]\d+\.?\s*/g, ' ');
  cleaned = cleaned.replace(/-\d+\s*/g, ' ');
  cleaned = cleaned.replace(/\bθ\s+\d+\b/g, '');

  // Remove "12 " type standalone numbers in Greek context
  cleaned = cleaned.replace(/\s+\d{1,2}\s+(?=["'])/g, ' ');

  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Remove apparatus fragments from a paragraph
 * Returns the cleaned paragraph, or null if the whole thing is apparatus
 */
export function removeApparatusFragments(paragraph: string): string | null {
  let cleaned = paragraph;

  // ====== NEW: Aggressive inline apparatus removal ======

  // Remove parenthetical apparatus with sigla: (λικίννιον ἘΠ, (ἀβσδ AE),
  // Pattern: opening paren + Greek + sigla letters + closing paren
  cleaned = cleaned.replace(/\([^)]*[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDERW][^)]*\)/g, '');

  // Remove variant reading blocks that got merged into paragraphs:
  // Pattern: "Greek AE, Greek B, Greek C" or "Greek AE, Greek διὰ τοῦτο"
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE],\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE],\s*[\u0370-\u03FF\u1F00-\u1FFF]+/g, '');

  // Remove Latin apparatus phrases that slipped through
  cleaned = cleaned.replace(/cuius\s+[\u0370-\u03FF\u1F00-\u1FFF]+\s+ead\.\s*m(an)?\.\s*est\s+correct[eu]m[^.]*\./gi, '');
  cleaned = cleaned.replace(/in\s+marg\.\s*add\.?:?[^.]*\./gi, '');

  // Remove page markers with Greek-look-alike characters
  // θΠΗΤῸ, W ΠΙ, W ΤΠ, D HI, Ὁ 394, Π|ὃ, etc.
  cleaned = cleaned.replace(/θ[ΠΗΤ]+[ῸΌ]?/g, '');
  cleaned = cleaned.replace(/[WDΠ]\s*[ΤΠΙ]+[ῸῚὶ]?\d*/g, '');
  cleaned = cleaned.replace(/Π\|[ὃὸ]\d*/g, '');
  cleaned = cleaned.replace(/[\u1F49\u1F4B\u1F4D]\s*\d{1,3}[€]?\s*/g, '');  // Ὁ 394, Ὁ 1 32€

  // Remove OCR garbage patterns
  cleaned = cleaned.replace(/[»«]\s*,\s*[ΕE]\]?\s*[-–]\s*,\s*,\s*[A-ZΑ-Ω]\s*[-–][^.]*\./g, '');
  cleaned = cleaned.replace(/\s*[»«]\s*,\s*[ΕE][^\s]*[-–][^.]*?\./g, '');

  // Remove embedded line numbers like "10 vog" or "15 ccu"
  cleaned = cleaned.replace(/\s+\d{1,2}\s+(vog|ccu|nis)\b/gi, ' ');

  // Remove sigla-heavy endings: "Greek A, Greek B."
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE],\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE]\.?\s*$/g, '');

  // NEW: Remove apparatus fragments (can be mid-paragraph)
  // Pattern: "προεβάλετο , προεβάλετο subscripto"
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+,\s+[\u0370-\u03FF\u1F00-\u1FFF]+\s+subscripto\s*"?/g, '');
  // Pattern at start: "αὐτῷ προεβάλετο RwpJDt, προεβάλετο"
  cleaned = cleaned.replace(/^[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDERW]w?p?J?D?[ti]?,\s*/g, '');

  // NEW: Remove embedded page markers like ΡΊΤΙΟΟΑ, ΡΊΓΤΑ, etc.
  cleaned = cleaned.replace(/Ρ[ΊΙ][ΤΓΠΤ][ΙΟΑ]+/g, '');

  // NEW: Remove patterns like "10 (0 πατρὶς" - numbers followed by parenthetical
  cleaned = cleaned.replace(/\d+\s*\(\d+\s*(?=[\u0370-\u03FF\u1F00-\u1FFF])/g, '');

  // NEW: Remove patterns like "φὼς Ὁ jaime vat eus wces" - mixed garbage with Latin
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[\u1F49\u1F4B\u1F4D]\s+[a-z]+\s+[a-z]+\s+[a-z]+\s+[a-z]+/gi, '');
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[\u1F49\u1F4B\u1F4D]\s+[a-z]+\s+[a-z]+\s+/gi, '');

  // NEW: Remove "ἕτερον IJ 8." type apparatus markers
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[IJ]+\s*\d+\.\s*/g, '');

  // NEW: Remove "ὑποστῆναι ....." type ellipses artifacts
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+\.{3,}\s*/g, '');

  // ====== NEW: More aggressive inline apparatus removal ======

  // Remove "typotheta apud. Di inter X et Y" patterns - comprehensive
  cleaned = cleaned.replace(/typotheta\s+apud\.?\s*[A-Za-z]*\.?\s*inter\s+[\u0370-\u03FF\u1F00-\u1FFF]+\s+et\s+[\u0370-\u03FF\u1F00-\u1FFF]+[^.]*\./gi, '');
  // More general pattern for any Latin apparatus phrases
  cleaned = cleaned.replace(/\b(typotheta|apud)\.\s*inter\s+[\u0370-\u03FF\u1F00-\u1FFF]+\s+et\s+[\u0370-\u03FF\u1F00-\u1FFF]+/gi, '');

  // Remove "ex. versu ῥαγκαβὲ D (v. argum. ad κοπί-" patterns
  cleaned = cleaned.replace(/ex\.?\s*versu\s+[\u0370-\u03FF\u1F00-\u1FFF]+\s+[A-Z][^.]*\./gi, '');

  // Remove standalone sigla that appear inline: Di, Ep, Ap, Ww, CD, etc.
  cleaned = cleaned.replace(/\s+Di\s+/g, ' ');
  cleaned = cleaned.replace(/\s+Ep\s+/g, ' ');
  cleaned = cleaned.replace(/\s+Ap\s+/g, ' ');
  cleaned = cleaned.replace(/\s+CD\s+/g, ' ');
  cleaned = cleaned.replace(/\s+Ww\*?,?\s*/g, ' ');
  cleaned = cleaned.replace(/\s+Hv\s+/g, ' ');

  // Remove floating single capital letters between Greek: "Greek A Greek"
  cleaned = cleaned.replace(/([\u0370-\u03FF\u1F00-\u1FFF])\s+[ABCDE]\s+([\u0370-\u03FF\u1F00-\u1FFF])/g, '$1 $2');

  // Remove "A gro," and "A fev" OCR garbage
  cleaned = cleaned.replace(/\s+A\s+gro,?\s*/gi, ' ');
  cleaned = cleaned.replace(/\s+A\s+fev\s*/gi, ' ');

  // ====== Original patterns below ======

  // Remove leading single letters that are page markers (like "B " at start)
  cleaned = cleaned.replace(/^[ABCDEPW]\s+(?=[ΑἈΒΓΔΕἘΖΗἨΘΙἸΚΛΜΝΞΟὈΠΡΣΤΥὙΦΧΨΩὨ])/, '');

  // Remove apparatus patterns in the middle of text
  // Pattern: "(ἀωϑήσεται vel εἰωθϑήσεται ἘΠ)" - parenthetical variants
  cleaned = cleaned.replace(/\([^)]*\b(vel|sive)\b[^)]*\)/gi, '');

  // Remove "v. ad. XIII..." cross-references
  cleaned = cleaned.replace(/v\.\s*ad\.?\s*[XIVLC]+\s*\d+[,.\s]*\d*/gi, '');

  // Remove "De futuro v. ad XIV" patterns
  cleaned = cleaned.replace(/De\s+futuro\s+v\.\s*ad\.?\s*[XIVLC]+/gi, '');

  // Remove "p. 382, 22 ss." page references
  cleaned = cleaned.replace(/p\.\s*\d+[,.\s]*\d*\s*(ss\.)?/gi, '');

  // Remove patterns like "nis v. ad. XIII 5,929 T"
  cleaned = cleaned.replace(/nis\s+v\.\s*ad\.?\s*[XIVLC]+\s*\d+[,.\s]*\d*\s*[A-Z]?/gi, '');

  // Remove patterns like "Kwp Di" or "Rwp Di"
  cleaned = cleaned.replace(/\b[KABCDE]?w?p\s*Di\b/gi, '');

  // Remove patterns like "ccu. τε xai" (OCR/apparatus artifact)
  cleaned = cleaned.replace(/\bccu\.\s*τε\s*xai\b/gi, '');

  // Remove "MI ΤΙ" type OCR artifacts (any spacing)
  cleaned = cleaned.replace(/MI\s*ΤΙ/g, '');
  cleaned = cleaned.replace(/,\s*MI\s*ΤΙ/g, ',');

  // Remove "nis T" type fragments
  cleaned = cleaned.replace(/\bnis\s+T\b/g, '');

  // Remove isolated Latin T in Greek context
  cleaned = cleaned.replace(/\s+T\s+(?=[\u0370-\u03FF\u1F00-\u1FFF])/g, ' ');

  // Remove isolated Greek theta (θ) before Greek words (likely margin note)
  cleaned = cleaned.replace(/θ\s+(?=ὀ)/g, '');

  // Remove variant reading blocks: "Greek1 SIGLA, Greek2 SIGLA2, Greek3"
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE]{1,2}[,.]?\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE]{1,2}[,.]?\s*[\u0370-\u03FF\u1F00-\u1FFF]+/g, '');

  // Remove double-dagger or cross-reference markers
  cleaned = cleaned.replace(/\s*[†‡]\s*/g, ' ');

  // Remove "v. " cross-references more broadly
  cleaned = cleaned.replace(/v\.\s+\d+/gi, '');

  // Remove loose "(sic)" patterns
  cleaned = cleaned.replace(/\(sic\)/gi, '');

  // Remove embedded page references like "ΡΊΠ110Ὰ"
  cleaned = cleaned.replace(/[ΡΡΙΠ]+\s*\d+\s*[ΆΑΟ]?/g, '');

  // Remove source citations: "G. M.", "L. G.", "Theoph.", etc.
  cleaned = cleaned.replace(/G\.\s*M\./g, '');
  cleaned = cleaned.replace(/L\.\s*G\./g, '');
  cleaned = cleaned.replace(/Theoph\.\s*[IV]*\.?\s*/gi, '');
  cleaned = cleaned.replace(/ΜΜουσουλέμ/g, '');

  // Remove variant patterns with commas: "Greek1, Greek2, Greek3" when followed by sigla
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s*,\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s*,\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE]/g, '');

  // Remove hanging apparatus markers: "ζη- --᾿" pattern (hyphen continuation artifacts)
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+-\s*--?᾿?\s*/g, '');

  // Remove "Ὁ" when used as sigla (followed by Greek or at sentence boundary)
  cleaned = cleaned.replace(/\bὉ\s+(?=[a-zα-ω])/g, '');

  // Remove standalone closing brackets with content before
  cleaned = cleaned.replace(/\s*[}\]]\d*\s*/g, ' ');

  // Remove patterns like "( [^" - parenthetical with bracket
  cleaned = cleaned.replace(/\(\s*\[[\^A-Z]\s*/g, '');

  // Remove "5$" and similar number+symbol combinations
  cleaned = cleaned.replace(/\d+\$\s*/g, '');

  // Remove isolated single Greek letters that are likely sigla (Α, Ὁ) at word boundaries
  cleaned = cleaned.replace(/\s+Α\s+(?=[\u0370-\u03FF\u1F00-\u1FFF])/g, ' ');

  // Remove ", παοιστάναι ἃ" type apparatus fragments
  cleaned = cleaned.replace(/,?\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ἃἄἅἂἆἀἁ]\s+/g, ' ');

  // Remove "ἣν δὲ, ὑπειλήφασι παρεστάναι" type partial variant readings
  // Pattern: standalone phrase that looks like variant list
  cleaned = cleaned.replace(/\bἣν\s+δὲ,\s+[\u0370-\u03FF\u1F00-\u1FFF]+\s+[\u0370-\u03FF\u1F00-\u1FFF]+\s+/g, ' ');

  // Remove "πρόδηλον, ἄδηλον. . τὸ ἀπο-" type fragments
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+,\s*[\u0370-\u03FF\u1F00-\u1FFF]+\.\s*\.\s*τὸ\s*[\u0370-\u03FF\u1F00-\u1FFF]+-\s*/g, ' ');

  // Remove fragments ending with hyphen followed by space (word breaks from OCR)
  // But only if followed by apparatus-like content
  cleaned = cleaned.replace(/-\s+nis\b/g, '');

  // Remove patterns ending in standalone numbers like "θ" followed by number
  cleaned = cleaned.replace(/\bθ\s*\d+\b/g, '');

  // Remove "12" type standalone numbers that look like margin notes
  cleaned = cleaned.replace(/\s+\d{1,2}\s+(?=")/g, ' ');

  // Remove page markers with Greek-like Roman numerals: }1Π, ΡΊΠ, etc.
  cleaned = cleaned.replace(/[}{\[\]]\d*[ΠIV]+\s*\d*/g, '');
  cleaned = cleaned.replace(/Ρ[ΊΙ]Π\d*[ΆΑA]?/g, '');

  // Remove Latin editorial terms in Greek context
  cleaned = cleaned.replace(/\b(om|dittogr|sic|corr|add|del|ante|post|lat)\b\.?\s*/gi, '');

  // Remove sigla variants pattern: "Greek SIGLA, Greek SIGLA"
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE]\s*,\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE]/g, '');

  // Remove sigla at word boundaries more aggressively
  cleaned = cleaned.replace(/\b[ABCDE]wp/g, '');
  cleaned = cleaned.replace(/\bRwp2?Di/g, '');
  cleaned = cleaned.replace(/\bAlwp/g, '');
  cleaned = cleaned.replace(/\bDEwp/g, '');

  // Remove "15 ccu." type margin references
  cleaned = cleaned.replace(/\d+\s*ccu\./gi, '');

  // Remove garbled apparatus like "ἣν δὲ, ὑπειλήφασι παρεστάναι Kwp Di, παοιστάναι ἃ"
  // Pattern: Greek + "Kwp Di," + Greek + single letter
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[KABCDE]?w?p\s*Di,?\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ἃἄἅἂἆἀἁ]\b/g, '');

  // Pattern 1: Greek word followed by sigla variant pattern, then Greek continuation
  const apparatusStartPattern = /^[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDERW]?w?p?D?i?,\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ἢὴἤὤ]\s*\([^)]+\)/;
  if (apparatusStartPattern.test(cleaned)) {
    const match = cleaned.match(/([ὁἡτοῦτῆςτὸτὴνκαὶδὲμὲνοὖνἐπὶπρὸςεἰςἐκἀπὸμετὰκατὰδιὰπερὶὑπὸπαρὰσὺν][\u0370-\u03FF\u1F00-\u1FFF\s]+[.;·])/);
    if (match) {
      const idx = cleaned.indexOf(match[0]);
      if (idx > 50) {
        cleaned = cleaned.substring(idx);
      }
    }
  }

  // Remove any remaining sigla-variant patterns inline
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE]{1,2}[,.]?\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE]{1,2}[,.]/g, ' ');

  // Remove apparatus fragments like "καταγγελομένον w*p"
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[w*]+p\b/g, '');

  // Remove "ϑεὸν om. Rwp" patterns
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+om\.\s*[ABCDERW]+w?p?/gi, '');

  // Remove apparatus that looks like "ἀκούσας C 4. ὃ ἀνόσιον" (sigla + number)
  cleaned = cleaned.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE]\s*\d+\.\s*[ὃὅ]\s+[\u0370-\u03FF\u1F00-\u1FFF]+/g, '');

  // Remove loose sigla patterns: "C 4." or "T " before Greek
  cleaned = cleaned.replace(/\s[ABCDET]\s*\d*\.\s*[ὃὅ]?\s*/g, ' ');

  // Apply general cleaning
  cleaned = cleanGreekLine(cleaned);

  // Clean up double spaces and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Check if result is mostly Greek and substantial
  if (cleaned.length < 30) return null;

  const ratio = greekRatio(cleaned);
  if (ratio < 0.7) return null;

  return cleaned;
}

/**
 * Join continuation lines to form coherent paragraphs
 */
export function joinParagraphs(lines: string[]): string[] {
  const paragraphs: string[] = [];
  let currentParagraph = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      // Empty line - save current paragraph if exists
      if (currentParagraph.trim()) {
        paragraphs.push(cleanGreekLine(currentParagraph));
        currentParagraph = '';
      }
      continue;
    }

    // Check if this is a continuation (starts mid-sentence)
    const isContinuation =
      currentParagraph &&
      (
        // Starts with lowercase
        /^[a-z\u0371-\u03ff]/.test(trimmed) ||
        // Previous line ended without sentence-ending punctuation
        !/[.;·»"'\])]$/.test(currentParagraph.trim())
      );

    if (isContinuation) {
      currentParagraph += ' ' + trimmed;
    } else {
      // New paragraph
      if (currentParagraph.trim()) {
        paragraphs.push(cleanGreekLine(currentParagraph));
      }
      currentParagraph = trimmed;
    }
  }

  // Save final paragraph
  if (currentParagraph.trim()) {
    paragraphs.push(cleanGreekLine(currentParagraph));
  }

  return paragraphs;
}

/**
 * Post-process paragraphs to fix remaining issues
 */
export function postProcessParagraphs(paragraphs: string[]): string[] {
  const result: string[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    let para = paragraphs[i];

    // Skip if too short or empty
    if (!para || para.length < 10) continue;

    // ====== NEW: Skip entire paragraphs that are mostly apparatus ======

    // Skip paragraphs that are variant reading blocks
    // Pattern: "καὶ σκώμματα κατ' αὐτοῦ πεποιεῖσϑαι ὑπό τινων AE, καὶ σκώμματα..."
    if (/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE],\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE],/.test(para)) continue;

    // Skip paragraphs with heavy Latin apparatus (cuius, ead. man., etc.)
    if (/cuius\s+[\u0370-\u03FF\u1F00-\u1FFF]+\s+ead\./i.test(para)) continue;
    if (/ead\.\s*m(an)?\.\s*est\s+correct/i.test(para)) continue;

    // Skip paragraphs that are mostly garbage characters
    if (/^[»«\[\]{}()\s,.*\-–]+$/.test(para.replace(/[\u0370-\u03FF\u1F00-\u1FFF]/g, ''))) {
      const greekCount = (para.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) || []).length;
      if (greekCount < 30) continue;
    }

    // ====== Original patterns ======

    // Skip paragraphs that start with apparatus patterns
    if (/^βασιλεία\s+τοῦ\s+.*[ABCDE],/.test(para)) continue;
    if (/^[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE],\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE]/.test(para)) continue;

    // Remove embedded sigla that appear after hyphenation (like "ἐπιϑυ-Β μιῶν")
    para = para.replace(/-([ABCDE])\s+/g, '');
    para = para.replace(/ἐπιϑυ-Β\s*μιῶν/g, 'ἐπιϑυμιῶν');

    // Remove line numbers embedded in text (like "10 vog")
    para = para.replace(/\s+\d{1,2}\s+([a-zα-ω])/g, ' $1');

    // Remove W ΤΠ, W ΠῚ type page markers more aggressively
    para = para.replace(/W\s*[ΤΠΙI]+[Ὶ]?\s*/g, '');
    para = para.replace(/[\u1F49\u1F4B\u1F4D]\s*\d{1,3}[€\s]*/g, '');  // Remove "Ὁ 394", "Ὁ 1 32€" type page refs
    para = para.replace(/κατὰ\s+Ὁ\s*\d{3}\s+τὴν/g, 'κατὰ τὴν');  // Specific fix for "κατὰ Ὁ 394 τὴν"
    para = para.replace(/ὃ\s+I\s+/g, '');  // Remove "ὃ I" pattern
    para = para.replace(/\s+l\s+καὶ/g, ' καὶ');  // Remove stray "l" sigla
    para = para.replace(/\([^\)]*---[^\)]*\)/g, '');  // Remove parenthetical with dashes (apparatus)
    para = para.replace(/\([Σσ]τέφ[^\)]*\)/g, '');  // Remove Στέφ... apparatus

    // Remove apparatus blocks that start with "καϑαίρεσις" or contain "βασιλεία ... AE"
    para = para.replace(/καϑαίρεσις\s+"?[\u0370-\u03FF\u1F00-\u1FFF]+\s+βασιλεία[^χ]*?χώραν/g, 'χώραν');
    // More specific: "καϑαίρεσις "εοντίου βασιλεία Ἡψιμάρου" - handle smart quotes
    para = para.replace(/καϑαίρεσις\s+[""\u201C\u201D]?[\u0370-\u03FF\u1F00-\u1FFF]+\s+βασιλεία\s+[\u0370-\u03FF\u1F00-\u1FFF]+\s*/g, '');

    // Remove "ann. sequ." and surrounding apparatus
    para = para.replace(/ann\.\s*sequ\.[^.]*?\./gi, '');

    // Remove blocks containing "AE, βασιλεία"
    para = para.replace(/[ABCDE]{1,2},\s*βασιλεία[^.]*?ἔτη\s+[\u0370-\u03FF\u1F00-\u1FFF]+\s*/g, '');

    // Remove variant reading blocks: "καὶ σκώμματα κατ' αὐτοῦ ... AE, καὶ σκώμματα..."
    para = para.replace(/καὶ σκώμματα κατ[᾽']?\s*αὐτοῦ πεποιεῖσϑαι ὑπό τινων [ABCDE]{1,2},\s*καὶ σκώμματα[^.;]*?[ABCDE],\s*καὶ σκώμματα[^.;]*?[ABCDE]{1,2}\.?\s*/g, 'καὶ σκώμματα κατ᾽ αὐτοῦ πεποιεῖσϑαι ὑπό τινων. ');

    // Try to remove apparatus fragments
    const cleaned = removeApparatusFragments(para);
    if (!cleaned) continue;
    para = cleaned;

    // Final cleanup of page markers after removeApparatusFragments
    para = para.replace(/κατὰ\s+Ὁ\s*\d{3}\s+τὴν/g, 'κατὰ τὴν');
    para = para.replace(/[\u1F49]\s*\d{3}\s*/g, '');  // Any remaining Ὁ + number

    // Check Greek ratio - skip if too Latin
    const ratio = greekRatio(para);
    if (ratio < 0.5 && para.length > 30) {
      continue;
    }

    // Final check for apparatus patterns that slipped through
    if (hasCombinedSigla(para) && para.length < 100) {
      continue;
    }

    // Check for standalone sigla at end
    if (/\s+[ABCDE][,.]?\s*$/.test(para)) {
      // Remove the sigla
      para = para.replace(/\s+[ABCDE][,.]?\s*$/, '');
    }

    // Skip lines that are clearly apparatus entries
    if (/^\d+\s+[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE]/.test(para) && para.length < 80) {
      continue;
    }

    // Skip paragraphs that start with apparatus-like patterns
    if (/^[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDERW]w?p?D?i?,/.test(para)) {
      continue;
    }

    // Additional: remove any embedded apparatus fragments mid-paragraph
    // Pattern: "word1 SIGLA, word2 SIGLA"
    para = para.replace(/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE],\s*[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE][,.\s]/g, ' ');

    // Clean up any double spaces created
    para = para.replace(/\s+/g, ' ').trim();

    // Skip if too short after cleaning
    if (para.length < 30) continue;

    result.push(para);
  }

  return result;
}

/**
 * Find content boundaries in the raw file
 */
export function findContentBoundaries(
  lines: string[]
): { start: number; end: number } {
  let start = 0;
  let end = lines.length;

  // Find start: first substantial Greek content about Constantine
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('Κωνσταντῖνος') && isGreekLine(line) && line.length > 50) {
      start = i;
      break;
    }
  }

  // Find end: back matter markers
  for (let i = start; i < lines.length; i++) {
    if (isBackMatter(lines[i])) {
      end = i;
      break;
    }
  }

  return { start, end };
}

/**
 * Main cleaning function
 */
export function cleanEpitomeVolume3(options: CleaningOptions): {
  chapters: Map<number, Chapter>;
  stats: FilterStats;
  quality: ChapterQuality[];
} {
  const { rawFilePath, outputDir, verbose = false, generateReport = true } = options;

  const log = verbose ? console.log : () => {};

  log('Loading raw text...');
  const rawText = fs.readFileSync(rawFilePath, 'utf-8');
  const allLines = rawText.split('\n');

  log(`Total lines in file: ${allLines.length}`);

  // Find content boundaries
  const { start, end } = findContentBoundaries(allLines);
  log(`Content boundaries: lines ${start + 1} to ${end}`);

  const contentLines = allLines.slice(start, end);

  // Phase 1: Filter lines
  log('Phase 1: Filtering lines...');
  const { included: filteredLines, stats } = filterLines(contentLines);
  log(`Filtered ${contentLines.length} -> ${filteredLines.length} lines`);

  // Phase 2: Build paragraphs
  log('Phase 2: Building paragraphs...');
  const rawParagraphs = joinParagraphs(filteredLines);
  log(`Built ${rawParagraphs.length} raw paragraphs`);

  // Phase 3: Post-process
  log('Phase 3: Post-processing...');
  const cleanedParagraphs = postProcessParagraphs(rawParagraphs);
  log(`Post-processed to ${cleanedParagraphs.length} paragraphs`);

  // Phase 4: Split into books
  log('Phase 4: Splitting into books...');
  const chapters = splitIntoBooks(cleanedParagraphs, allLines, start, end);

  // Phase 5: Validate quality
  log('Phase 5: Validating quality...');
  const quality: ChapterQuality[] = [];
  for (const [bookNum, chapter] of chapters) {
    const chapterQuality = analyzeChapter(bookNum, chapter.sourceContent.paragraphs);
    quality.push(chapterQuality);
    log(`Book ${bookNum}: ${chapterQuality.grade} (${chapterQuality.overallScore.toFixed(1)})`);
  }

  // Generate report
  if (generateReport) {
    const report = generateQualityReport(quality);
    const reportPath = path.join(outputDir, 'quality-report.md');
    fs.writeFileSync(reportPath, report);
    log(`Quality report written to ${reportPath}`);
  }

  return { chapters, stats, quality };
}

/**
 * Split paragraphs into books based on book markers and content
 */
function splitIntoBooks(
  paragraphs: string[],
  allLines: string[],
  contentStart: number,
  contentEnd: number
): Map<number, Chapter> {
  const chapters = new Map<number, Chapter>();

  // Find book markers in original content
  const bookBoundaries: Array<{ line: number; book: number }> = [];

  for (let i = contentStart; i < contentEnd; i++) {
    const bookNum = getBookNumber(allLines[i]);
    if (bookNum) {
      bookBoundaries.push({ line: i, book: bookNum });
    }
  }

  // Initialize Book 13 (starts at beginning of content)
  let currentBook = 13;
  let paragraphIndex = 0;
  let currentParagraphs: Array<{ index: number; text: string }> = [];

  // Simple approach: allocate paragraphs proportionally based on position
  // This is imperfect but workable for now
  const totalParagraphs = paragraphs.length;
  const totalContent = contentEnd - contentStart;

  // Calculate rough positions of book boundaries
  const bookStarts: Map<number, number> = new Map();
  bookStarts.set(13, 0);

  for (const boundary of bookBoundaries) {
    const relativePosition = (boundary.line - contentStart) / totalContent;
    const estimatedParaIndex = Math.floor(relativePosition * totalParagraphs);
    bookStarts.set(boundary.book, estimatedParaIndex);
  }

  // Assign paragraphs to books
  const sortedBooks = Array.from(bookStarts.entries()).sort((a, b) => a[0] - b[0]);

  for (let i = 0; i < sortedBooks.length; i++) {
    const [bookNum, startIdx] = sortedBooks[i];
    const endIdx = i < sortedBooks.length - 1 ? sortedBooks[i + 1][1] : totalParagraphs;

    const bookParagraphs = paragraphs.slice(startIdx, endIdx);

    chapters.set(bookNum, {
      chapterNumber: bookNum,
      title: `Book ${bookNum}`,
      sourceContent: {
        paragraphs: bookParagraphs.map((text, idx) => ({
          index: idx,
          text,
        })),
      },
    });
  }

  // Ensure all books 13-18 exist
  for (let book = 13; book <= 18; book++) {
    if (!chapters.has(book)) {
      chapters.set(book, {
        chapterNumber: book,
        title: `Book ${book}`,
        sourceContent: { paragraphs: [] },
      });
    }
  }

  return chapters;
}

/**
 * Write chapters to output directory
 */
export function writeChapters(chapters: Map<number, Chapter>, outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const [bookNum, chapter] of chapters) {
    if (chapter.sourceContent.paragraphs.length === 0) {
      console.log(`Skipping Book ${bookNum} - no paragraphs`);
      continue;
    }

    const paddedNum = String(bookNum).padStart(3, '0');
    const outputPath = path.join(outputDir, `chapter-${paddedNum}.json`);

    fs.writeFileSync(outputPath, JSON.stringify(chapter, null, 2));
    console.log(`Wrote ${outputPath} (${chapter.sourceContent.paragraphs.length} paragraphs)`);
  }
}

/**
 * Print summary statistics
 */
export function printSummary(
  chapters: Map<number, Chapter>,
  stats: FilterStats,
  quality: ChapterQuality[]
): void {
  console.log('\n=== Cleaning Complete ===');
  console.log('');
  console.log('Filter Statistics:');
  console.log(`  Total lines: ${stats.total}`);
  console.log(`  Included: ${stats.included}`);
  console.log(`  Excluded:`);
  for (const [reason, count] of Object.entries(stats.excluded)) {
    if (count > 0) {
      console.log(`    ${reason}: ${count}`);
    }
  }
  console.log(`  Low confidence: ${stats.lowConfidence}`);
  console.log('');

  const totalParagraphs = Array.from(chapters.values())
    .reduce((sum, ch) => sum + ch.sourceContent.paragraphs.length, 0);
  const totalChars = Array.from(chapters.values())
    .reduce(
      (sum, ch) =>
        sum + ch.sourceContent.paragraphs.reduce((s, p) => s + p.text.length, 0),
      0
    );

  console.log('Output Statistics:');
  console.log(`  Books: ${chapters.size}`);
  console.log(`  Total paragraphs: ${totalParagraphs}`);
  console.log(`  Total characters: ${totalChars.toLocaleString()}`);
  console.log('');

  console.log('Quality Grades:');
  const avgScore =
    quality.reduce((sum, q) => sum + q.overallScore, 0) / quality.length;
  console.log(`  Average score: ${avgScore.toFixed(1)}`);
  for (const q of quality) {
    console.log(`  Book ${q.chapterNumber}: ${q.grade} (${q.overallScore.toFixed(1)})`);
  }
}
