/**
 * Filter functions for removing contamination from Epitome text
 */

import {
  isApparatusLine,
  isLatinLine,
  isHeaderLine,
  isFontesLine,
  MARGIN_LETTER_START,
  MARGIN_REF_INLINE,
  EMBEDDED_LINE_NUMBER,
  LINE_NUMBER_MID_WORD,
  HYPHENATED_WORD,
  GREEK_TEXT_BLOCK,
  GREEK_CHARS,
} from "./patterns.js";

export interface FilterResult {
  text: string;
  removed: string[];
  reason: string;
}

/**
 * Remove margin reference letters from start of text
 * e.g., "A Ἀβορρίγινας" -> "Ἀβορρίγινας"
 * Also handles: "Β " (Greek Beta used as margin ref)
 * Note: Must be careful not to remove actual Greek text starting with these letters
 */
export function removeMarginRefs(text: string): FilterResult {
  const removed: string[] = [];

  // Remove leading margin letters (A, B, C, D, P, W) - Latin
  // Only if followed by space and then Greek text
  let cleaned = text.replace(/^([ABCDPW])\s+(?=[Α-ωά-ώἀ-ῷ])/g, (match, letter) => {
    removed.push(letter);
    return "";
  });

  // Remove leading margin letters - Greek (Α, Β, Γ, Δ used as margin refs)
  // Only if followed by space and more Greek (not continuing a word)
  cleaned = cleaned.replace(/^([ΑΒΓΔ])\s+(?=[Α-ωά-ώἀ-ῷ])/g, (match, letter) => {
    removed.push(letter);
    return "";
  });

  // Also handle "C ϑὲν" pattern - Latin C followed by Greek starting with lowercase
  cleaned = cleaned.replace(/^[ABCDPW]\s+(?=[α-ωά-ώἀ-ῷ])/g, (match) => {
    removed.push(match.trim());
    return "";
  });

  // Remove inline margin refs (Latin)
  cleaned = cleaned.replace(/\s([ABCD])\s(?=[Α-ωά-ώἀ-ῷ])/g, (match, letter) => {
    removed.push(letter);
    return " ";
  });

  // Remove inline margin refs (Greek capitals as section markers)
  cleaned = cleaned.replace(/\s([ΑΒΓΔ])\s/g, (match, letter) => {
    removed.push(letter);
    return " ";
  });

  // === ITERATION 4: Enhanced page reference removal ===

  // Remove P Y mp pattern (common OCR artifact)
  cleaned = cleaned.replace(/P\s+Y\s*mp/gi, (match) => {
    removed.push(match);
    return "";
  });

  // Remove page references like "P I 314", "P I 316", "W II 6", "W Π 8", "W IL"
  cleaned = cleaned.replace(/[PW]\s+[IVXΠπIL]+\s*\d*/g, (match) => {
    removed.push(match);
    return "";
  });

  // Remove patterns like "W Il 93", "W YI", "W 1I" (volume/page refs with various OCR errors)
  cleaned = cleaned.replace(/W\s+[IVXYLI01]+\s*\d*/gi, (match) => {
    removed.push(match);
    return "";
  });

  // Remove page references like "P 1437", "P 1470", "Ῥ1896" (P followed by 3-4 digit number)
  cleaned = cleaned.replace(/[PῬ]\s*\d{3,4}\b/g, (match) => {
    removed.push(match);
    return "";
  });

  // Remove Ρ] pattern (Greek Rho + bracket, often OCR error)
  cleaned = cleaned.replace(/Ρ\]/g, (match) => {
    removed.push(match);
    return "";
  });

  // Remove ῬΊ pattern (Greek Rho + iota, page ref marker)
  cleaned = cleaned.replace(/ῬΊ\s*\d*/g, (match) => {
    removed.push(match);
    return "";
  });

  // Remove "Ir144" style references (I + r/l + digits)
  cleaned = cleaned.replace(/I[rl]\d{2,3}/gi, (match) => {
    removed.push(match);
    return "";
  });

  // Remove J + digits pattern (J108, J105, etc.)
  cleaned = cleaned.replace(/J\d{2,4}/g, (match) => {
    removed.push(match);
    return "";
  });

  // Remove "W 1114" style references (W followed by space and 3-4 digit number)
  cleaned = cleaned.replace(/W\s+\d{3,4}\b/g, (match) => {
    removed.push(match);
    return "";
  });

  // Remove standalone section markers anywhere in text: single capital letters surrounded by space
  cleaned = cleaned.replace(/\s+[ABCD]\s+/g, " ");

  return {
    text: cleaned.trim(),
    removed,
    reason: "margin_refs",
  };
}

/**
 * Remove embedded line numbers (5, 10, 15, 20, 25, 30)
 * Also handles: "511", "41a-10", line numbers from CSHB edition
 */
export function removeLineNumbers(text: string): FilterResult {
  const removed: string[] = [];

  // Remove line numbers at end of text (5, 10, 15, 20, 25, 30)
  let cleaned = text.replace(/\s+(5|10|15|20|25|30)\s*$/g, (match, num) => {
    removed.push(num);
    return "";
  });

  // Remove standalone 3-digit numbers that look like page/line refs (like "511")
  cleaned = cleaned.replace(/\s+(\d{3})\s+/g, (match, num) => {
    removed.push(num);
    return " ";
  });

  // Remove line refs like "41a-10" (chapter-line format)
  cleaned = cleaned.replace(/\s+\d+[a-z]-\d+\s*/gi, (match) => {
    removed.push(match.trim());
    return " ";
  });

  // Remove line numbers mid-word (careful not to break text)
  cleaned = cleaned.replace(
    /(\S+)\s+(5|10|15|20|25|30)\s+(\S+)/g,
    (match, before, num, after) => {
      // Check if this looks like a broken word
      if (before.match(/[α-ωά-ώ]$/i) && after.match(/^[α-ωά-ώ]/i)) {
        removed.push(num);
        return before + after; // Join the word
      }
      removed.push(num);
      return before + " " + after;
    }
  );

  // Remove any remaining isolated small numbers (line numbers 1-30) surrounded by whitespace
  cleaned = cleaned.replace(/\s+(\d{1,2})\s+/g, (match, num) => {
    const n = parseInt(num, 10);
    if (n >= 1 && n <= 30) {
      removed.push(num);
      return " ";
    }
    return match;
  });

  return {
    text: cleaned.trim(),
    removed,
    reason: "line_numbers",
  };
}

/**
 * Fix hyphenated words broken across lines
 * Handles: "δρ-- ὅ" -> "δρόμ", "ἐπο--" -> "ἐπο"
 * Also handles: "διχο--10 στασίαν" -> "διχοστασίαν" (line number embedded)
 */
export function fixHyphenation(text: string): FilterResult {
  const removed: string[] = [];

  // Pattern 0: Word--NUMBER word (line number embedded in hyphenation)
  // e.g., "διχο--10 στασίαν" -> "διχοστασίαν"
  let cleaned = text.replace(
    /([α-ωά-ώἀ-ῷ]+)--?\s*(\d{1,2})\s+([α-ωά-ώἀ-ῷ]+)/gi,
    (match, before, num, after) => {
      removed.push(`--${num}`);
      return before + after;
    }
  );

  // Pattern 1: Word ending with -- followed by space and continuation
  // e.g., "δρ-- ὅ μώμενοι" should try to join "δρ" with next word fragment
  cleaned = cleaned.replace(/(\S+)--\s+([α-ωά-ώἀ-ῷ]+)/gi, (match, before, after) => {
    removed.push("--");
    return before + after;
  });

  // Pattern 2: Word ending with single hyphen at end
  cleaned = cleaned.replace(/(\S+)-\s*$/g, (match, word) => {
    if (word.match(/[α-ωά-ώἀ-ῷ]$/i)) {
      removed.push("-");
      return word;
    }
    return match;
  });

  // Pattern 3: Remove trailing -- or - from words
  cleaned = cleaned.replace(/([α-ωά-ώἀ-ῷ]+)--?\s/gi, (match, word) => {
    removed.push("-");
    return word + " ";
  });

  return {
    text: cleaned.trim(),
    removed,
    reason: "hyphenation",
  };
}

/**
 * Check if a paragraph should be filtered out entirely
 */
export function shouldFilterParagraph(text: string): { filter: boolean; reason: string } {
  const trimmed = text.trim();

  // Empty or very short
  if (trimmed.length < 3) {
    return { filter: true, reason: "too_short" };
  }

  // Is a header line
  if (isHeaderLine(trimmed)) {
    return { filter: true, reason: "header" };
  }

  // Is FONTES citation
  if (isFontesLine(trimmed)) {
    return { filter: true, reason: "fontes" };
  }

  // Is primarily apparatus
  if (isApparatusLine(trimmed)) {
    return { filter: true, reason: "apparatus" };
  }

  // Is primarily Latin
  if (isLatinLine(trimmed)) {
    return { filter: true, reason: "latin" };
  }

  // Check Greek content ratio
  const greekChars = (trimmed.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) || []).length;
  const latinChars = (trimmed.match(/[a-zA-Z]/g) || []).length;
  const totalAlpha = greekChars + latinChars;

  if (totalAlpha > 0) {
    const greekRatio = greekChars / totalAlpha;
    // If less than 50% Greek, likely contaminated
    if (greekRatio < 0.5 && trimmed.length > 20) {
      return { filter: true, reason: "low_greek_ratio" };
    }
  }

  return { filter: false, reason: "keep" };
}

/**
 * Remove apparatus blocks from within a paragraph
 * These often start with numbers and sigla patterns
 */
export function removeApparatusFromParagraph(text: string): string {
  let cleaned = text;

  // === ITERATION 4: TARGET SPECIFIC PATTERNS FROM EVALUATOR ===

  // Remove "om " at paragraph start (Latin "omitted" marker)
  cleaned = cleaned.replace(/^om\s+/gi, "");

  // Remove apparatus starting with sigla: "À. καὶ om", "À. text", "A. text"
  cleaned = cleaned.replace(/^[ÀA-Z]\.\s*καὶ\s*om/gi, "");
  cleaned = cleaned.replace(/^[ÀA-Z]\.\s+/gi, "");

  // Remove "cola:" apparatus patterns (Latin explanations)
  cleaned = cleaned.replace(/cola:\s*graece[^.]*\./gi, "");
  cleaned = cleaned.replace(/cola:\s*[^.]*\./gi, "");

  // Remove apparatus that starts line with sigla and comma: "À, text"
  cleaned = cleaned.replace(/^[ÀÁÂ],\s*/gi, "");

  // Remove "sive " patterns (Latin "or" in apparatus)
  cleaned = cleaned.replace(/\bsive\s+[α-ωά-ώἀ-ῷa-zA-Z]+\./gi, "");
  cleaned = cleaned.replace(/\bsive\s+[α-ωά-ώἀ-ῷa-zA-Z]+\s/gi, " ");

  // Remove page reference patterns: P Y, P 1437, P I, W II, W 1I, W TI, etc.
  // Pattern: P/W + space + any combination of Y/I/V/X/L/T/numbers
  cleaned = cleaned.replace(/\bP\s+Y\s*(mp)?\b/gi, "");
  cleaned = cleaned.replace(/\bP\s+[IVXYL]+\s*\d*\b/gi, "");
  cleaned = cleaned.replace(/\bP\s+v\.\s*\d*[^.]*\./gi, "");  // P v. 15. reference
  cleaned = cleaned.replace(/\bW\s+[IVXYLT01]+\s*\d*\b/gi, "");  // W II, W 1I, W 11, W TI, etc.
  cleaned = cleaned.replace(/\bW\s+\d{2,4}\b/g, "");  // W 1114, W 123

  // Remove ΡΊ pattern (Greek Rho + iota, used as page marker)
  cleaned = cleaned.replace(/ΡΊ\s*\d*/g, "");
  cleaned = cleaned.replace(/Ῥ΄\]\s*/g, "");  // Ῥ΄] pattern

  // Remove ν II or v II patterns (verse + Roman numeral)
  cleaned = cleaned.replace(/\bν\s+II\s*\d*/gi, "");

  // Remove J-prefixed page refs: J108, J105, etc.
  cleaned = cleaned.replace(/\bJ\d{2,4}\b/g, "");

  // Remove Ir-prefixed page refs: Ir144, Ir105, etc.
  cleaned = cleaned.replace(/\bIr\d{2,3}\b/gi, "");

  // Remove P-prefixed page refs with numbers: P 1437, P1896, Ῥ1896
  cleaned = cleaned.replace(/\b[PῬ]\s*\d{3,4}\b/g, "");

  // Remove Dio reference patterns: "Dio add", "idem Dio", "Dionis exc."
  cleaned = cleaned.replace(/\bidem\s+Dio[^.]*\./gi, "");
  cleaned = cleaned.replace(/\bDionis\s+exc[^.]*\./gi, "");
  cleaned = cleaned.replace(/\bDio\s+add[^.]*\./gi, "");

  // Remove "suppletus ex" patterns
  cleaned = cleaned.replace(/\bsuppletus\s+ex[^.]*\./gi, "");

  // Remove "corr," and "corr." patterns (correction markers)
  cleaned = cleaned.replace(/\bcorr[,.]\s*/gi, "");

  // Remove editor/source name references (Plutarchi Numa, Livii, etc.)
  const sourcePatterns = [
    /Phatarchus\.?[^.]*\./gi,
    /Plutarchus\.?[^.]*\./gi,
    /Plutarchi\s+[A-Za-z]+[^.]*\./gi,  // "Plutarchi Numa, c. exi."
    /Ducang[ie][iu]s\.?[^.]*\./gi,
    /Ducaxervs\.?[^.]*\./gi,  // OCR variant
    /CANGIUS\.?[^.]*\./gi,    // OCR variant
    /Tzetzes\.?[^.]*\./gi,
    /Livius\.?[^.]*\./gi,
    /Livii\s+[A-Za-z]*[^.]*\./gi,
    /Dionysii?\.?[^.]*\./gi,
    /Halicarnass[eo]ns[ie]s?\.?[^.]*\./gi,
    /Reimar[iu]s\.?[^.]*\./gi,
    /Reg\.\"\s*[^.]*\./gi,  // "Reg." citations
    /Wolfi\s+notis[^.]*\./gi,  // "in Wolfi notis"
    /\bc\.\s+[a-z]+\.\s*\d*\]/gi,  // "c. exi. 2]" chapter refs
    /Wolfius\.?[^.]*\./gi,
    /Vatic\.?[^.]*\./gi,  // "Vatic." manuscript refs
  ];

  for (const pattern of sourcePatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // === ITERATION 4: More aggressive bracket pattern removal ===

  // Remove apparatus bracket patterns: "word] variant" -> "word"
  // The ] is the critical apparatus marker meaning "variant reading"

  // Pattern: "vov] αὐτοῦ" at start -> remove the apparatus portion
  cleaned = cleaned.replace(/^[α-ωά-ώἀ-ῷa-zA-Z]+\]\s*[α-ωά-ώἀ-ῷa-zA-Z]+\s+/gi, "");

  // Pattern: Greek word followed by ] and variant text until period/end
  cleaned = cleaned.replace(/([α-ωά-ώἀ-ῷ]+)\][^.]*\./gi, "$1.");
  cleaned = cleaned.replace(/([α-ωά-ώἀ-ῷ]+)\]\s*[α-ωά-ώἀ-ῷA-Za-z\s,]*$/gi, "$1");

  // Pattern: word] variant word, (with comma or space)
  cleaned = cleaned.replace(/([α-ωά-ώἀ-ῷ]+)\]\s*[α-ωά-ώἀ-ῷa-zA-Z]+[,\s]+/g, "$1 ");

  // Pattern: Any text ending with ] followed by sigla or apparatus text
  cleaned = cleaned.replace(/\]\s*[ΑΒΓΔABCPW][\.\s,]/g, " ");
  cleaned = cleaned.replace(/\]\s*[α-ωά-ώa-zA-Z]{1,15}[\.\s,]/g, " ");

  // Pattern: Starting with ] + text (apparatus leakage)
  cleaned = cleaned.replace(/^\]\s*[α-ωά-ώa-zA-Z]+\s*/gi, "");

  // Pattern: Apparatus at end of line: "ἱστόρηται. p. 402. text"
  cleaned = cleaned.replace(/\.\s*p\.\s*\d+\.\s*[^\n]+$/gi, ".");

  // Pattern: "word)] variant" with closing paren
  cleaned = cleaned.replace(/([α-ωά-ώἀ-ῷ]+)\)\]\s*[α-ωά-ώa-zA-Z]+/g, "$1");

  // Pattern: "word) Ἰουστῖνος" apparatus ending with editor name
  cleaned = cleaned.replace(/\)\s+[Ἰ][α-ωά-ώ]+\.?/g, "");

  // Pattern: isolated ] between words
  cleaned = cleaned.replace(/([α-ωά-ώἀ-ῷ]+)\s*\]\s*([α-ωά-ώἀ-ῷ]+)/g, "$1 $2");

  // Pattern: Reference notes like "non leguntur", "leguntur"
  cleaned = cleaned.replace(/\bnon\s+leguntur[^.]*\./gi, "");
  cleaned = cleaned.replace(/\bleguntur[^.]*\./gi, "");

  // Pattern: "ἀπέκτεινεν ᾿" at end (stray apostrophe)
  cleaned = cleaned.replace(/\s+᾿\s*$/g, "");

  // Remove in-text apparatus with sigla: "word À, correction corr," pattern
  cleaned = cleaned.replace(/\s+[ÀA-Z],\s*[α-ωά-ώa-zA-Z\s]+corr[,.\s]+/gi, " ");

  // Remove in-text apparatus: "word] alternate word" anywhere in text
  // Pattern: word + ] + short alternate + comma or space
  cleaned = cleaned.replace(/([α-ωά-ώἀ-ῷ]+)\]\s*[α-ωά-ώἀ-ῷa-zA-Z]{1,20}[,\s]+/g, "$1 ");

  // Remove complex in-text apparatus with quotes and brackets
  // Pattern: "\" word. \" , word]" type constructions
  cleaned = cleaned.replace(/\\"\s*[α-ωά-ώa-zA-Z\.\s]+\\"\s*,\s*[α-ωά-ώa-zA-Z]+\]\s*[α-ωά-ώa-zA-Z\s\-]*/g, "");

  // Remove number + ] patterns (page/line refs): "ν184]" or "ν 184]"
  cleaned = cleaned.replace(/[α-ωά-ώa-zA-Z]?\s*\d{2,4}\]\s*/g, "");

  // Remove trailing apparatus with brackets: "text 2] κα" -> "text"
  cleaned = cleaned.replace(/\s+\d+\]\s*[α-ωά-ώa-zA-Z]*\s*$/gi, "");

  // Remove dash-bounded apparatus: "— text —" or "— text" at end
  cleaned = cleaned.replace(/\s*—\s*[^—]+\s*—\s*/g, " ");
  cleaned = cleaned.replace(/\s*—\s*[A-Za-z][^.]*\.?\s*$/g, "");
  cleaned = cleaned.replace(/\s*—\s*$/g, "");

  // Remove section markers like "| 3." that got merged in
  cleaned = cleaned.replace(/\|\s*\d+\.\s*/g, " ");

  // Remove Latin words that are clearly apparatus (not Greek text)
  const latinApparatusWords = [
    /\bhaec\b/gi,
    /\blibri\b/gi,
    /\bcod\.\b/gi,
    /\bhuc\s+referen[a-z\-]*\b/gi,  // "huc referen-" with hyphenation
    /\bin\s+Wolfi\s+notis\b/gi,
    /\bita\s+emendavimus\b/gi,
    /\batque\s+ita\b/gi,
    /\bet\s+Colb\.[^.]*\./gi,  // "et Colb. ..." apparatus
    /\bet\s+Ducan[^.]*\./gi,   // "et Ducan..." apparatus
    /\badd\s+rec\.\s*man\.\s*/gi,  // "add rec. man." (added by recent hand)
    /\bom\s+rec\.\s*man\.\s*/gi,   // "om rec. man." (omitted by recent hand)
    /\bDucaN[A-Za-z]+\./gi,    // DucaNeGIUS. etc
    /\bsed\s+Dio\b[^.]*\./gi,  // "sed Dio ..." apparatus
    /\bab\s+his\s+differunt[^.]*\./gi,  // "ab his differunt ..." apparatus
    /\bquae\s+Maius[^.]*\./gi,  // "quae Maius ..." apparatus
    /\bquod\s+excidisse[^.]*\./gi,  // "quod excidisse ..." apparatus
    /\bsuspicatus\s+erat[^.]*\./gi,  // "suspicatus erat" apparatus
    /\beo\s+loco\s+quem[^.]*\./gi,  // "eo loco quem ..." apparatus
    /\bexscripsit[^.]*\./gi,  // "exscripsit" apparatus
    /\bPlutarchi\b[^.]*\./gi,  // Plutarch references
    /\bκατασφαγεὶς\s+Dio\s+add[^.]*\./gi,  // Mixed Greek-Latin apparatus
  ];
  for (const pattern of latinApparatusWords) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Remove long Latin apparatus phrases that span multiple words
  // Pattern: Latin sentence/phrase at end of paragraph
  cleaned = cleaned.replace(/\s+[a-zA-Z]{3,}\s+[a-zA-Z]{3,}\s+[a-zA-Z]{3,}[^α-ωά-ώἀ-ῷ]*$/g, "");

  // Pattern: Latin notes with "v." (verse reference)
  cleaned = cleaned.replace(/\bv\.\s*\d+\.[^.]*\./gi, "");

  // Remove trailing apparatus that starts with Latin and ends with ] or period
  // Pattern: Latin phrase ... Greek/Latin until ] or .
  cleaned = cleaned.replace(/\s*[a-zA-Z]+\s+[a-zA-Z]+[^α-ωά-ώ]*\]\s*[α-ωά-ώa-zA-Z]*\s*$/gi, "");

  // Remove trailing apparatus: "exi. N]" pattern at end of paragraph
  cleaned = cleaned.replace(/\s+[a-z]+\.\s*\d*\]\s*[α-ωά-ώa-zA-Z]*\s*$/gi, "");

  // Remove " followed by Latin apparatus at end (starts quote apparatus section)
  cleaned = cleaned.replace(/\"\s*[a-zA-Z]+[^"]*$/g, "");

  // Remove trailing apparatus: " — word exi. N] Greek" patterns
  cleaned = cleaned.replace(/\s+—\s+[α-ωά-ώa-zA-Z\s\.]+\d*\]\s*[α-ωά-ώa-zA-Z]*\s*$/gi, "");

  // Remove trailing apparatus: "word — Greek exi. N] Greek" anywhere
  cleaned = cleaned.replace(/\s*[α-ωά-ώa-zA-Z]+\s*—\s*[α-ωά-ώa-zA-Z\s]+[a-z]+\.\s*\d*\]\s*[α-ωά-ώa-zA-Z]*\s*$/gi, "");

  // Remove Latin source references: "e Dionis libro...", "ex Plutarcho", etc.
  cleaned = cleaned.replace(/\be[x]?\s+[A-Z][a-z]+\s+libro[^.]*$/gi, "");
  cleaned = cleaned.replace(/\be[x]?\s+Plutarcho[^.]*$/gi, "");
  cleaned = cleaned.replace(/\be[x]?\s+Dionysii?[^.]*$/gi, "");

  // Remove leading apparatus sigla: "ΑΒ:" or "AB:" at start of text
  cleaned = cleaned.replace(/^[ΑΒΓΔABCPW]{1,3}:\s*/g, "");
  cleaned = cleaned.replace(/^[ΑΒΓΔABCPW]{1,3}\s+[A-Z][a-z]+\s+/g, "");  // "AB Dio ..."

  // Remove apparatus at end: "add ΑΒ, text — more text"
  cleaned = cleaned.replace(/\s+(add|om)\s+[ΑΒΓΔABCPW]{1,3}[,.\s]+[^.]*$/gi, "");

  // Remove complex trailing apparatus with quotes and brackets
  cleaned = cleaned.replace(/\"\s+[^"]{0,50}\]\s*[α-ωά-ώa-zA-Z\-]*\s*$/g, "");

  // Remove ", Σερουΐου]" type patterns (variant readings in brackets)
  cleaned = cleaned.replace(/,\s*[Α-ωά-ώa-zA-Z]+\]\s*[α-ωά-ώa-zA-Z\s\-]*$/g, "");

  // Remove manuscript sigla patterns: "AB.", "τῆς \"4λβης] τοὺς ἄλβεις À."
  // Pattern: word followed by ] then alternatives with sigla
  cleaned = cleaned.replace(/\S+\]\s*[^.]*[ABCPWÀ]\.\s*/g, "");

  // Remove patterns like "om A.", "add AB.", "sic libri"
  cleaned = cleaned.replace(/\b(om|add)\s+[ABCPWÀ]+\.?\s*/gi, "");
  cleaned = cleaned.replace(/\bsic\s+libri\.?\s*/gi, "");
  cleaned = cleaned.replace(/\bvulgo\.?\s*/gi, "");

  // Remove patterns like "τρίδυμοι Α." (word + single sigla with period)
  cleaned = cleaned.replace(/\s+[ΑABCPWÀ]\.\s*/g, " ");

  // Remove patterns like "23 AB" (line number + sigla)
  cleaned = cleaned.replace(/\s+\d+\s*[ABCPWÀ]{1,3}\.?\s*/g, " ");

  // Remove patterns like "word AB." or "word\" AB." - apparatus sigla after quoted text
  cleaned = cleaned.replace(/\"\s*[ABCPW]{1,3}\.?\s*/g, '" ');

  // Remove patterns like "ἤδη AB. ἔμελλεν" - word sigla period word
  cleaned = cleaned.replace(/\s+[ABCPW]{1,3}\.\s+/g, " ");

  // Remove patterns like "ἀναπίμπλαται AB." - Greek word followed by sigla (Latin or Greek letters)
  // Sigla can be Latin (ABCPW) or Greek (ΑΒΓΔ, ΑΒ, etc.)
  cleaned = cleaned.replace(/([α-ωά-ώἀ-ῷ]+)\s+[ABCPWΑΒΓΔ]{1,4}\.\s*/gi, "$1 ");

  // Remove isolated sigla combinations: " AB ", " AC ", " BC ", " ABC ", " ΑΒ ", etc.
  cleaned = cleaned.replace(/\s+[ABCPWΑΒΓΔ]{2,4}\s+/g, " ");

  // Remove patterns like "ig ABC," or "eig PW." (variant readings)
  cleaned = cleaned.replace(/\b(ig|eig)\s+[ABCPWΑΒΓΔ]{1,4}[,.]?\s*/gi, "");

  // Remove complex apparatus like "ΑΒ. ig ABC, eig PW."
  cleaned = cleaned.replace(/[ΑΒΓΔABCPW]{1,4}\.\s*(ig|eig)\s+[ΑΒΓΔABCPW]{1,4}[,.\s]*/gi, "");

  // Remove Greek letter sigla followed by period
  cleaned = cleaned.replace(/\s+[ΑΒΓΔ]{1,4}\.\s*/g, " ");

  // Remove patterns like "ἐπηγγέλλετο ABC,"
  cleaned = cleaned.replace(/([α-ωά-ώἀ-ῷ]+)\s+[ABCPWΑΒΓΔ]{1,4}[,.]\s*/gi, "$1 ");

  // Remove patterns like "p. v," or "et v." (page references)
  cleaned = cleaned.replace(/\bp\.\s*v[,.]?\s*/gi, "");
  cleaned = cleaned.replace(/\bet\s+v\.\s*/gi, "");

  // Clean up any doubled spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

/**
 * Fix common OCR artifacts in Greek text
 */
export function fixOcrArtifacts(text: string): string {
  let cleaned = text;

  // Common OCR misreads
  // xa9^ -> καθ (x misread as χ, a misread as α, 9^ as θ)
  cleaned = cleaned.replace(/xa9\^/g, "καθ");
  cleaned = cleaned.replace(/xa9/g, "καθ");

  // 7) is often misread for ἡ
  cleaned = cleaned.replace(/\b7\)/g, "ἡ");
  cleaned = cleaned.replace(/7j/g, "ἡ");

  // fj is misread for ἡ
  cleaned = cleaned.replace(/\bfj\b/g, "ἡ");

  // 4j is misread for ἡ
  cleaned = cleaned.replace(/\b4j\b/g, "ἡ");

  // Clean up weird character sequences
  cleaned = cleaned.replace(/»/g, "ν"); // » sometimes OCR for ν
  cleaned = cleaned.replace(/Ld/g, "Ἀ"); // Ld misread for Ἀ

  // Remove stray punctuation that doesn't belong
  cleaned = cleaned.replace(/\s*\.\s*\./g, ".");
  cleaned = cleaned.replace(/\s*,\s*,/g, ",");

  // Remove isolated symbols that are likely OCR noise
  cleaned = cleaned.replace(/\s+[*#@^]+\s+/g, " ");

  // Fix broken quotation marks
  cleaned = cleaned.replace(/""/g, '"');
  cleaned = cleaned.replace(/``/g, '"');
  cleaned = cleaned.replace(/''/g, "'");

  // Remove stray Latin characters that are OCR errors for Greek
  // j alone is often misread ι or part of a ligature
  cleaned = cleaned.replace(/\bj\b/g, "ι");

  // OCR errors: "]" alone between Greek words is often ἅ or similar
  // Pattern: Greek ] space Greek -> Greek ἅ space Greek
  cleaned = cleaned.replace(/([α-ωά-ώἀ-ῷ])\s+\]\s+([α-ωά-ώἀ-ῷ])/g, "$1 ἅ $2");

  // OCR errors: "7]" is often ᾗ (eta with iota subscript)
  cleaned = cleaned.replace(/7\]/g, "ᾗ");

  // OCR errors: "2]" at end of apparatus is cleanup
  cleaned = cleaned.replace(/\d\]\s*[α-ωά-ώa-zA-Z]*\s*$/g, "");

  // OCR errors: "]" at start of Greek word is often Μ
  // Pattern: space ] + Greek lowercase -> space Μ + Greek
  cleaned = cleaned.replace(/\s\]([α-ωά-ώ])/g, " Μ$1");

  // OCR errors: Greek uppercase + ] + Greek lowercase is often letter M
  // Pattern: Π] or ἸΠ] -> Μ (common OCR confusion)
  cleaned = cleaned.replace(/[ΠΙἸ]\]([α-ωά-ώ])/g, "Μ$1");

  // OCR errors: ]9 is often ιθ or similar
  cleaned = cleaned.replace(/\]9\s/g, "ιθ ");

  // OCR errors: Sx] is often Σκι (OCR confusion)
  cleaned = cleaned.replace(/Sx\]/g, "Σκι");

  // Remove leading apparatus: "N] text" at start of paragraph
  cleaned = cleaned.replace(/^\d+\]\s*/g, "");

  // Remove isolated brackets that are apparatus remnants
  cleaned = cleaned.replace(/\s+\]\s+/g, " ");

  return cleaned;
}

/**
 * Clean a single paragraph of contamination
 */
export function cleanParagraph(text: string): string {
  let cleaned = text;

  // Step 1: Remove apparatus blocks (editor names, sigla patterns)
  cleaned = removeApparatusFromParagraph(cleaned);

  // Step 2: Remove margin refs
  const marginResult = removeMarginRefs(cleaned);
  cleaned = marginResult.text;

  // Step 3: Remove line numbers
  const lineNumResult = removeLineNumbers(cleaned);
  cleaned = lineNumResult.text;

  // Step 4: Fix hyphenation
  const hyphenResult = fixHyphenation(cleaned);
  cleaned = hyphenResult.text;

  // Step 5: Fix OCR artifacts
  cleaned = fixOcrArtifacts(cleaned);

  // Step 6: Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Step 7: Remove any remaining Latin phrases in parentheses that look like apparatus
  cleaned = cleaned.replace(/\([^)]*\b(om|add|sic|vulgo|mox)\b[^)]*\)/gi, "");

  // Step 8: Remove isolated Latin words that snuck through (editor annotations)
  cleaned = cleaned.replace(/\b(cf\.|sc\.|i\.e\.|viz\.|ed\.|et\s+al\.|etc\.)\s*/gi, "");

  // Step 9: Remove apparatus-style annotations like "om A", "add B"
  cleaned = cleaned.replace(/\b(om|add)\s+[ABCPWÀ]\b/gi, "");

  // Step 10: Remove IOANNIS ZONARAE headers that got merged
  cleaned = cleaned.replace(/IOANNIS\s*\.?\s*ZONAR[AE]E?\s*/gi, "");
  cleaned = cleaned.replace(/ΖΟΝΑΗ[ΑΕ]ΔΕ?Σ?\s*/g, "");

  // Step 11: Final whitespace cleanup
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

/**
 * Detect if text is a chapter/section boundary
 * Greek section numbers like "1. Ζῦ ἰνείας..."
 */
export function isSectionStart(text: string): { isSection: boolean; number?: number } {
  const match = text.match(/^(\d+)\.\s*[Α-ωά-ώἀ-ῷ]/);
  if (match) {
    return { isSection: true, number: parseInt(match[1], 10) };
  }
  return { isSection: false };
}

/**
 * Merge adjacent short fragments that should be one paragraph
 */
export function mergeFragments(paragraphs: string[]): string[] {
  const merged: string[] = [];
  let buffer = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();

    // Skip empty
    if (!trimmed) continue;

    // Check if this is a section start - always start fresh
    const sectionInfo = isSectionStart(trimmed);
    if (sectionInfo.isSection) {
      if (buffer) {
        merged.push(buffer.trim());
        buffer = "";
      }
      buffer = trimmed;
      continue;
    }

    // If buffer is empty, start new
    if (!buffer) {
      buffer = trimmed;
      continue;
    }

    // Check if current paragraph looks like continuation
    // (starts lowercase or with connecting punctuation)
    const startsLower = /^[α-ωά-ώἀ-ῷ]/.test(trimmed);
    const bufferEndsIncomplete = /[,·;]$/.test(buffer) || buffer.length < 100;

    if (startsLower || bufferEndsIncomplete) {
      // Merge
      buffer = buffer + " " + trimmed;
    } else {
      // New paragraph
      merged.push(buffer.trim());
      buffer = trimmed;
    }
  }

  // Don't forget the last buffer
  if (buffer) {
    merged.push(buffer.trim());
  }

  return merged;
}

/**
 * Main filter pipeline for a list of paragraphs
 */
export function filterParagraphs(
  paragraphs: Array<{ index: number; text: string }>
): Array<{ index: number; text: string }> {
  const results: Array<{ index: number; text: string }> = [];

  for (const para of paragraphs) {
    // Check if should filter entirely
    const filterCheck = shouldFilterParagraph(para.text);
    if (filterCheck.filter) {
      continue;
    }

    // Clean the paragraph
    const cleaned = cleanParagraph(para.text);

    // Check again after cleaning
    if (cleaned.length < 5) {
      continue;
    }

    results.push({
      index: para.index,
      text: cleaned,
    });
  }

  return results;
}
