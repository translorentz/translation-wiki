/**
 * Text Cleaner for Diarium Urbis Romae (Agent B)
 *
 * Performs the core text cleaning operations:
 * 1. Remove page headers (STEPHANI INFESSURAE, DIARIA RERUM ROMANARUM, page numbers, year markers)
 * 2. Remove footnotes (both textual variant notes and commentary notes)
 * 3. Fix hyphenated line breaks
 * 4. Normalize spacing (remove OCR extra spaces)
 * 5. Remove line numbers embedded in text (5, 10, 15, 20, 25, 30 at line starts)
 * 6. Remove manuscript sigla markers (c. 1B, c. 7A, etc.)
 * 7. Clean up inline apparatus references (W, (a), (b), etc. in text)
 */

import { CleaningStats, FootnoteBlock } from './types.js';

/**
 * Checks if a line is a page header that should be removed.
 */
export function isPageHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Combined year + title + page number header:
  // "[1484]  DIARIA  RERUM  ROMANARUM.  109"
  // Also catches garbled year markers: [i484], [M84], [l48>], [*49ó], [149°], [*453]
  if (/\[?[\d*iIlMH>][\dA-Za-z°óÌ%$>S]{2,4}[}\]Ì]?\s+DIARI[AÀE]\s+RERUM\s+ROM/i.test(trimmed)) return true;
  if (/\[?\d{4}\]?\s+DIARI[AE]\s+RERUM\s+ROMAN/i.test(trimmed)) return true;

  // Title header alone (with possible garbled ROMAN ARUM, ROM ANARUM, ROMANARUM)
  if (/^DIARI[AÀ]\s+RERUM\s+ROM\s*AN\s*ARUM\.?\s*\d*\s*$/i.test(trimmed)) return true;
  // Garbled: "DIARIA RERUM \" ROM ANARUM." or with extra quotes/spaces
  if (/DIARI[AÀE]\s+RERUM\s+["\s]*ROM/i.test(trimmed) && /ARUM/i.test(trimmed) && trimmed.length < 80) return true;
  // Garbled lowercase: "[*453] diaria rerum romanarum. 55"
  if (/\[.{3,5}\]\s+diaria\s+rerum/i.test(trimmed)) return true;
  // Handle DIÀRIA (A-grave at position 3): D-I-À-R-I-A
  if (/DI[ÀA]RI?[AÀ]?\s+RERUM/i.test(trimmed) && /ROM/i.test(trimmed) && trimmed.length < 80) return true;

  // Author header: "STEPHANI INFESSURAE" with extensive OCR garbling
  // Catches: STEPHANI, STEPHAKI, STEPHATKl, STEPHANl, STEPHAN1, STEPHANJ, STE>HANI, £PHANI
  if (/^(?:\S+\s+)?ST[EÈ]PHANI\s+INFESSURA[EÈ]?\s*(?:\[\d{4}\])?\s*$/i.test(trimmed)) return true;
  // OCR variant: "Ìj8  STEPHANI  INFESSURAÈ  [1484]"
  if (/ST[EÈ]PHANI\s+INFESSURA/i.test(trimmed) && trimmed.length < 60) return true;
  // Fuzzy STEPHANI: any word starting with ST/STE that is 7-9 chars, mostly uppercase,
  // followed by a word starting with INF/rNF/1NF that is 9-11 chars
  // Catches: STEPHAKI, STEPHATKl, STEPHANl, STEPHAN1, STEPHANJ, STE>HANI, STEPHÀNI
  if (/\bST[A-ZÀÈ>][A-Za-zÀÈÙ>]{4,6}[lI1iJj]\s+[r1I]?[Nn]?[Ff]?[Ee]?[Ss]?[Ss]?[Uu]?[Rr]?[Aa]?[EÈe]?/i.test(trimmed) && trimmed.length < 80) {
    // Verify it looks like a header line (not diary text) -- must have INFESSUR somewhere
    if (/[Ii1r]?[Nn]?[Ff][Ee][Ss][Ss][Uu][Rr]/i.test(trimmed) || /INFESSUR/i.test(trimmed)) return true;
  }
  // Simpler approach: line contains STEPHA + any 2-3 chars + space + INFESSUR (case insensitive, accent tolerant)
  if (/STEPHA[A-ZÀÈÙa-zàèù>]{1,4}\s+[r1I]?N?F?E?S?S?U?R?A?E?/i.test(trimmed)) {
    if (/INFESS[UÙ]R|nfess[uù]r/i.test(trimmed) && trimmed.length < 80) return true;
  }
  // Direct patterns for the remaining leaks:
  // STEPHÀNI (A-grave), STEPHANJ (J for I), INFESSÙRAE (U-grave)
  if (/STEPH[ÀA]N[IJlj1]\s+[Ii1r]?NFESS[UÙ]R/i.test(trimmed) && trimmed.length < 80) return true;
  // Any line containing both STEPHA-something and INFESS-something (with possible garbling)
  if (/STEPHA/i.test(trimmed) && /[1IirlN]?NFESS/i.test(trimmed) && trimmed.length < 80) return true;
  // Catch STEPHANI with garbled first char or prefix: £PHANI, >HANI, etc.
  if (/[£>]PH[A-Z]{2,4}\s+INFESSUR/i.test(trimmed) && trimmed.length < 80) return true;
  // Note: "fracSTEPHAKI" (header merged onto end of diary line) is handled
  // in cleanInlineMarkers() as an inline strip, not as a full line removal.
  // Catch standalone INFESSURAE on its own line (OCR split from STEPHANI above)
  if (/^\s*[r1I]?NFESSURA[EÈ]?\s*$/i.test(trimmed)) return true;
  // Also lowercase "infessurae" alone
  if (/^\s*infessurae\s*$/i.test(trimmed)) return true;
  // Combined STEPHÀNI + infessurae (mixed case due to OCR)
  if (/STEPH[ÀA]N[IJlj1i]\s+infessura/i.test(trimmed) && trimmed.length < 80) return true;

  // Editor name (preface headers)
  if (/^O\.\s*TOMM?\s*ASINI\.?\s*$/i.test(trimmed)) return true;

  // Preface header
  if (/^PREFAZIONE\.?\s*$/i.test(trimmed)) return true;

  // Year marker alone: [YYYY] or [YYYY}
  if (/^\[?\s*\d{4}\s*[}\]]\s*$/.test(trimmed)) return true;
  // Year marker on own line: [1304], [J494], etc.
  if (/^\[?[IJ1]?[34]\d\d[}\]]\s*$/.test(trimmed)) return true;
  // OCR-garbled year markers: [i484], [H39], [M7o], [i447], [M84], [i4S8], [M9l], [>4°5]
  // Pattern: [...] where bracket content is 2-5 chars with at least one digit
  // and the content looks like a garbled 4-digit year (mix of digits + OCR substitutions)
  if (/^\[.{2,5}\]\s*$/.test(trimmed)) {
    const bracketContent = trimmed.replace(/^\[/, '').replace(/\]\s*$/, '');
    // Must contain at least one digit
    if (/\d/.test(bracketContent)) {
      // And the rest should be OCR substitution chars (i/1, H/4, S/5, o/0, M/m, >/l, °/0, etc.)
      // or actual digits. Reject if it looks like a real word (e.g., [domini])
      if (!/^[a-z]{4,}$/i.test(bracketContent) && bracketContent.length <= 5) return true;
    }
  }

  // Page number alone (1-3 digits)
  if (/^\*?\d{1,3}\s*$/.test(trimmed)) return true;
  // Page numbers with OCR garbling: "IOJ", "12 1", "6$", "IOI", "*T45"
  if (/^[I1]\s*\d{1,2}[A-Za-z$]?\s*$/.test(trimmed) && trimmed.length <= 5) return true;
  if (/^[I1O]\s*[O0]\s*[I1JjT]\s*$/.test(trimmed)) return true;  // IOI, IOJ, etc.
  if (/^\*?[A-Z]?\d{2,3}\s*$/.test(trimmed) && trimmed.length <= 5) return true;  // *T45, etc.

  // Roman numerals alone on a line (preface page numbers)
  if (/^[IVXLCDM]{1,8}\.?\s*$/.test(trimmed) && trimmed.length <= 10) return true;
  // OCR-garbled Roman numerals: "Vili" = VIII, "Ili" = III
  if (/^[VIXLvixl][iIlLvV]{1,5}\s*$/.test(trimmed) && trimmed.length <= 7) return true;

  // "St. Infessura. NN" footer
  if (/^St\.\s*Infessura\.?\s*\d*\s*$/i.test(trimmed)) return true;
  // "Sr. Infessura. 6*" etc.
  if (/^S[rt]\.\s*Infessura\.?\s*\d*\*?\s*$/i.test(trimmed)) return true;

  return false;
}

/**
 * Determines if a line is part of a footnote/apparatus block.
 *
 * Two types:
 * 1. Textual variant notes: dense manuscript sigla, words like "Così", "manca", "corregge"
 *    e.g., "(a) Danno questo principio i mss. A B1 BJ C*C* F F1..."
 *    e.g., "C1 a questo luogo seguono interpolazioni..."
 * 2. Commentary notes: start with "(N)" — scholarly references
 *    e.g., "(1) Cf. Gio. Villani, Croniche, VIII, cap. 63."
 *
 * Key heuristic: a line is apparatus if it contains a high density of single-letter
 * manuscript sigla (A, B, C, E, M, R, S, etc. with optional digit suffix) separated by spaces.
 */
export function isApparatusLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Commentary footnote: starts with (N) where N is a digit
  if (/^\s*\(\d+\)\s+/.test(trimmed)) return true;
  // Also catch (N) with no space (OCR garbling): "(1)Arch. di Stato..."
  if (/^\s*\(\d+\)\S/.test(trimmed)) return true;

  // Variant apparatus: starts with (a), (b), etc.
  if (/^\s*\([a-z]\)\s+/.test(trimmed)) {
    return true;
  }
  // Also catch (a)Word with no space (OCR garbling)
  if (/^\s*\([a-z]\)\S/.test(trimmed)) {
    return true;
  }

  // Lines that are continuations of variant apparatus
  // These contain dense manuscript sigla patterns
  if (hasHighSiglaDensity(trimmed)) return true;

  // Lines with variant reading patterns (sigla interspersed with "che" separators)
  if (hasVariantReadingPattern(trimmed)) return true;

  // Lines containing MULTIPLE inline apparatus markers (a), (b), (c) etc.
  // If a line has 2+ of these markers, it's certainly apparatus text
  const inlineMarkers = trimmed.match(/\([a-z]\)/g);
  if (inlineMarkers && inlineMarkers.length >= 2) return true;

  // Lines with "in margine" + sigla patterns (editorial apparatus language)
  if (/in\s+margine\b/i.test(trimmed) && /\([a-z]\)/.test(trimmed)) return true;

  // Lines containing "mss." or "Altri mss." patterns (manuscript references)
  if (/\bAltri\s+mss\.?\b/i.test(trimmed)) return true;

  // Lines starting with manuscript references: "In R1 manca", "Così C C1", etc.
  if (/^\s*(?:In\s+[A-Z]\d?|Così\s+[A-Z]|[A-Z]\d?\s+[a-z]\s|[A-Z]\d?\s+[A-Z]\d?\s+[a-z])/i.test(trimmed)) {
    if (hasApparatusContent(trimmed)) return true;
  }

  // Lines ending with "In [SIGLA]" (introducing a variant from a specific manuscript)
  // e.g., "...li conservatori et 26 caporioni In E"
  if (/\bIn\s+[ABCEFGLMNOPRSTVY]\d?\s*$/.test(trimmed)) return true;

  // Lines containing "In [SIGLA] manca" pattern (apparatus note about missing text)
  // e.g., "In R1 manca da et fecerone a porta", "In 3 manca da..."
  if (/\bIn\s+(?:[ABCEFGLMNOPRSTVY]\d?|\d)\s+manca\b/i.test(trimmed)) return true;

  // Lines containing "manca in [SIGLA]" or "manca da ... a ..." with sigla
  if (/\bmanca\b/i.test(trimmed) && /\b[ABCEFGLMNOPRSTVY]\d?\b/.test(trimmed)) {
    // Only if it also has apparatus-style content (not diary "manca lo principio")
    if (/\bIn\s+[ABCEFGLMNOPRSTVY]|\bmanca\s+(?:da|in|il\s+resto|tutto)\b|\bche\s+manca\b/i.test(trimmed)) return true;
  }

  // Lines containing editorial language about manuscripts
  if (/\b(?:stessa\s+mano|rimanda\s+in|aggiunge\s+il\s+resto|brano\s+tra|rimandando\s+a\s+c\.|copista|variante\s+introdotta|nota\s+marginale)\b/i.test(trimmed)) return true;

  // Lines containing apparatus vocabulary + at least one sigla token
  if (/\b(?:erroneamente|[Cc]osì|sopprime|corregge|lezione)\b/.test(trimmed)) {
    const siglaCount = (trimmed.match(/\b[ABCEFGLMNOPRSTVY]\d?\b/g) || []).filter(m => /^[ABCEFGLMNOPRSTVY]\d?$/.test(m)).length;
    if (siglaCount >= 1) return true;
  }

  // Lines that look like scholarly citations (commentary continuations)
  if (/^\s*(?:Cf\.|loc\.\s*cit|op\.\s*cit|ed\.|p\.\s*\d|col\.\s*\d|vol\.\s*\d|t\.\s*\d)/i.test(trimmed)) return true;

  // Lines containing "Cf." anywhere (scholarly citation - never used in diary text)
  if (/\bCf\.\s/i.test(trimmed)) return true;

  // Lines containing archival/bibliographic references
  if (/\bArch\.\s*(?:Vat|Soc|di\s*Stato|stor)\b/i.test(trimmed)) return true;

  // Lines starting with page numbers followed by colon/quote (bibliography references)
  if (/^\s*\d{1,4}\s*:\s*«/.test(trimmed)) return true;

  // Lines with quoted Latin fragments typical of commentary: « ... »
  if (/^\s*«\s/.test(trimmed) && /»/.test(trimmed) && trimmed.length < 80) return true;
  // Continuation of quoted Latin
  if (/^\s*«\s/.test(trimmed) && !trimmed.includes('disse') && !trimmed.includes('pap')) return true;

  return false;
}

/**
 * Checks if a line contains apparatus-specific language and manuscript sigla.
 */
function hasApparatusContent(line: string): boolean {
  // Apparatus language
  const apparatusWords = /(?:mss?\.|[Cc]osì|manca|corregge|aggiunt|lezione|variante|soppresso|interpola|amanuens)/i;
  if (apparatusWords.test(line)) return true;

  // High density of manuscript sigla
  if (hasHighSiglaDensity(line)) return true;

  return false;
}

/**
 * Detects lines with high density of manuscript sigla.
 * Manuscript sigla are: A, B, C, E, F, G, L, M, N, O, P, R, S, T, V, Y
 * often with digit suffixes: C1, C2, R1, S1, etc.
 * Sometimes with symbols: C*, R', P8
 */
function hasHighSiglaDensity(line: string): boolean {
  // Count sigla-like tokens: single uppercase letter optionally followed by digit or symbol
  const siglaPattern = /\b[A-Z]\d?[\*']?\b/g;
  const matches = line.match(siglaPattern) || [];

  // Filter out common words that happen to be single uppercase letters in diary text
  // (e.g., "I" at start of sentence in Italian)
  const realSigla = matches.filter(m => {
    // Allow: A, B, C, E, F, G, L, M, N, O, P, R, S, T, V, Y (ms. sigla used in this edition)
    return /^[ABCEFGLMNOPRSTVY]\d?[\*']?$/.test(m);
  });

  // If a line has 4+ manuscript sigla tokens, it's likely apparatus
  if (realSigla.length >= 4) return true;

  // Or 3+ sigla plus apparatus language
  if (realSigla.length >= 3 && /(?:manca|corregge|[Cc]osì|In\s+\w|aggiunt)/i.test(line)) return true;

  // Or 3+ consecutive sigla in sequence (e.g., "M R S" or "C C1 E")
  // This indicates a manuscript listing even without apparatus vocabulary
  if (/\b[ABCEFGLMNOPRSTVY]\d?\s+[ABCEFGLMNOPRSTVY]\d?\s+[ABCEFGLMNOPRSTVY]\d?\b/.test(line)) return true;

  return false;
}

/**
 * Detects lines with inline apparatus markers that indicate apparatus text.
 * Pattern: `(N)` followed closely by manuscript sigla like `C M` or `R1 S`.
 * Example: "pioggia (1) C M et andò per tutto..."
 * Also detects lines with multiple inline (a)-(z) markers interspersed with sigla.
 */
function hasInlineApparatusMarkers(line: string): boolean {
  // Pattern: (N) or (a)-(z) followed by 1+ ISOLATED manuscript sigla
  // e.g., "(1)  C  M  et" or "(j) R1 per" or "(g) M Iuliae"
  // The sigla must be isolated (followed by space, comma, or another sigla)
  if (/\(\d+\)\s+[ABCEFGLMNOPRSTVY]\d?(?:\s|,|$)/.test(line)) return true;
  if (/\([a-z]\)\s+[ABCEFGLMNOPRSTVY]\d?(?:\s|,|$)/.test(line)) return true;

  // Pattern: manuscript sigla sequences: "C  M " or "R1  S " (2+ isolated sigla in sequence)
  // Must be truly isolated (word boundaries on both sides)
  const siglaSequence = /\b[ABCEFGLMNOPRSTVY]\d?\b\s+\b[ABCEFGLMNOPRSTVY]\d?\b(?:\s|,|;|$)/g;
  const seqMatches = line.match(siglaSequence);
  if (seqMatches && seqMatches.length >= 1) {
    // Also require (N) or (a)-(z) marker somewhere in the line
    if (/\(\d+\)|\([a-z]\)/.test(line)) return true;
  }

  // Pattern: line starts with a word and then has (N) followed by sigla
  // e.g., "pioggia (1) C M et andò..."
  if (/^\w+\s+\(\d+\)\s+[ABCEFGLMNOPRSTVY]\d?\b/.test(line)) return true;

  return false;
}

/**
 * Detects lines that contain variant reading patterns typical of apparatus.
 * These are lists of manuscript variant readings, where the same word/phrase
 * is given with different manuscript sigla:
 * e.g., "è pregna V che soreta ci prenda V1 che soreta ci prenni O1..."
 * e.g., "soreta sia prena R1 che sorata è prena O1 che soreta è prenna"
 *
 * Key pattern: isolated manuscript sigla (single uppercase letter + optional digit)
 * interspersed with Italian text, typically separated by "che" or semicolons.
 */
function hasVariantReadingPattern(line: string): boolean {
  // Count sigla tokens (single uppercase letter + optional digit)
  // Exclude matches followed by "." (abbreviations like S. = San, P. = Papa)
  const siglaPattern = /\b[ABCEFGLMNOPRSTVY]\d?(?=\s|$|[,;:])/g;
  const siglaMatches = line.match(siglaPattern) || [];

  // If 2+ sigla AND the line contains repeated conjunctions typical of variant lists
  // Pattern: sigla + "che" repeated = variant reading list
  if (siglaMatches.length >= 2) {
    // Count "che" or ";" separators between readings
    const separators = (line.match(/\bche\b|;/gi) || []).length;
    if (separators >= 2 && siglaMatches.length >= 2) return true;

    // Also detect: sigla immediately followed by "che" on the same line
    // e.g., "R1 che sorata è prena O1 che soreta è prenna"
    if (/\b[ABCEFGLMNOPRSTVY]\d?\s+che\s/i.test(line) && siglaMatches.length >= 2) return true;
  }

  return false;
}

/**
 * Identifies footnote/apparatus blocks in the text.
 * These blocks consist of consecutive apparatus lines.
 *
 * Strategy: Once we find a line that starts an apparatus/commentary block,
 * we greedily extend it forward, consuming lines that look like:
 * - More apparatus lines
 * - Commentary continuations
 * - Short lines typical of two-column footnote layout
 * - Blank lines between footnote entries
 *
 * We stop when we hit:
 * - A page header (STEPHANI INFESSURAE, etc.)
 * - A clear diary text line (starts with year entry pattern, or is a long line
 *   that doesn't look like commentary)
 */
export function identifyFootnoteBlocks(lines: string[], startLine: number, endLine: number): FootnoteBlock[] {
  const blocks: FootnoteBlock[] = [];
  let i = startLine;

  while (i <= endLine) {
    if (isApparatusLine(lines[i])) {
      const blockStart = i;
      i++;

      // Extend the block forward
      while (i <= endLine) {
        const currentTrimmed = lines[i].trim();

        if (!currentTrimmed) {
          // Blank line: check if apparatus/commentary continues after it
          let j = i + 1;
          while (j <= endLine && !lines[j].trim()) j++;
          if (j <= endLine) {
            const nextTrimmed = lines[j].trim();
            if (isApparatusLine(lines[j]) || isCommentaryBlockContinuation(lines[j])) {
              i = j;
              continue;
            }
            // Also continue if the next non-blank line is short (< 55 chars)
            // and not clearly diary text, AND within the next 10 lines there's
            // another apparatus line or page break marker.
            // This handles two-column footnotes that span across blank lines.
            if (nextTrimmed.length < 55 && !isDiaryTextStart(nextTrimmed)) {
              // Look ahead for more apparatus or end-of-page markers
              let hasMoreApparatus = false;
              for (let k = j + 1; k <= Math.min(j + 10, endLine); k++) {
                const kTrimmed = (lines[k] || '').trim();
                if (isApparatusLine(lines[k]) || isPageHeader(lines[k])) {
                  hasMoreApparatus = true;
                  break;
                }
                if (isDiaryTextStart(kTrimmed) && kTrimmed.length > 60) {
                  break; // Clear diary text nearby — don't consume
                }
              }
              if (hasMoreApparatus) {
                i = j;
                continue;
              }
            }
          }
          break;
        }

        // Page headers end the footnote block
        if (isPageHeader(lines[i])) break;

        // Clear diary text markers end the block
        if (isDiaryTextStart(currentTrimmed)) break;

        // If this line is apparatus, keep going
        if (isApparatusLine(lines[i])) {
          i++;
          continue;
        }

        // Commentary block continuation
        if (isCommentaryBlockContinuation(lines[i])) {
          i++;
          continue;
        }

        // If the line is short (< 60 chars) and we're in a commentary block,
        // it's likely a continuation of the two-column footnote layout
        if (currentTrimmed.length < 60 && blockStart < i) {
          // But not if it looks like clear diary text
          if (!isDiaryTextStart(currentTrimmed)) {
            i++;
            continue;
          }
        }

        // Look-ahead: if within the next 5 lines there's another apparatus line,
        // consume this line as part of the block (handles multi-line apparatus entries
        // that contain Italian paraphrases mixed with sigla)
        if (blockStart < i) {
          let foundMore = false;
          for (let ahead = i + 1; ahead <= Math.min(i + 5, endLine); ahead++) {
            if (lines[ahead] && isApparatusLine(lines[ahead])) {
              foundMore = true;
              break;
            }
          }
          if (foundMore && !isDiaryTextStart(currentTrimmed)) {
            i++;
            continue;
          }
        }

        // Not apparatus — stop
        break;
      }

      // Only add the block if it's at least 1 line
      if (i > blockStart) {
        blocks.push({
          startLine: blockStart,
          endLine: i - 1,
          type: /^\s*\(\d+\)/.test(lines[blockStart].trim()) ? 'commentary' : 'variant'
        });
      }
    } else {
      i++;
    }
  }

  return blocks;
}

/**
 * Checks if a line clearly starts diary text (not apparatus).
 * Diary text starts with characteristic patterns.
 */
function isDiaryTextStart(trimmed: string): boolean {
  // Year entry markers
  if (/^(?:Dell'anno|Nell'anno|Del ditto anno|Dello ditto anno)\s/i.test(trimmed)) return true;

  // Date entry markers
  if (/^(?:A\s+dì|Lo\s+dì|Et\s+a\s+dì)\s+\d/i.test(trimmed)) return true;

  // Latin date markers
  if (/^(?:Eodem\s+anno|Die\s+\.?[xvi]|Item\s+die|Interea\s+vero|Quare\s+dictus|Quod\s+ita|Octavo|Tertia\s+decima|Vigesim|Eadem\s+die|Redeuntes\s+igitur|Videntes\s+igitur)/i.test(trimmed)) return true;

  // Long lines that look like narrative text (> 70 chars, starts with lowercase continuation)
  // These are rarely footnotes — but exclude lines with scholarly/apparatus vocabulary
  // Also exclude lines with high sigla density (manuscript references)
  if (trimmed.length > 70 && /^[a-z]/.test(trimmed)) {
    if (hasHighSiglaDensity(trimmed)) return false;  // apparatus continuation
    // Lines containing inline (N) markers followed by manuscript sigla are apparatus
    if (hasInlineApparatusMarkers(trimmed)) return false;
    // Lines that look like variant reading lists (sigla + repeated variant readings)
    if (hasVariantReadingPattern(trimmed)) return false;
    if (!/(?:manca|corregge|mss?\.|[Cc]osì|erroneamente|Muratori|Nibby|Analisi|Cf\.|Tomassett|Villani|Pastor|Burchard|Arch\.\s*Soc|Arch\.\s*di|Rer\.\s*It|loc\.\s*cit|op\.\s*cit|annotaz|manoscritto|edizione|interpolazione|vol\.\s*\d|cap\.\s*\d|st\.\s*patr|vocato|notaro|camera\s+havrebbe)/i.test(trimmed)) return true;
  }

  // Long lines starting with uppercase that look like diary narrative (not apparatus)
  if (trimmed.length > 75 && /^[A-Z]/.test(trimmed)) {
    if (hasHighSiglaDensity(trimmed)) return false;  // apparatus continuation
    if (hasInlineApparatusMarkers(trimmed)) return false;
    if (hasVariantReadingPattern(trimmed)) return false;
    if (!/(?:Cf\.|Così|In\s+[A-Z]\d|Fu\s+prefer|Si\s+cita|Arch\.\s*di|Tomassett|Muratori|Pastor|Villani|Rer\.\s*It|Arch\.\s*Soc|Scalibast|vocato|manca|corregge|mss?\.|erroneamente|interpolazione|lezione|recano\s+nel)/i.test(trimmed)) return true;
  }

  return false;
}

/**
 * Checks if a position starts a multi-line commentary block.
 * Commentary blocks start with (N) and can span many lines.
 */
function isCommentaryBlock(lines: string[], pos: number, endLine: number): boolean {
  return /^\s*\(\d+\)\s+/.test(lines[pos].trim());
}

/**
 * Checks if a line is a continuation of a commentary footnote.
 * Commentary continuation lines are typically:
 * - Short lines containing scholarly references
 * - Lines with Latin/German quoted text in « »
 * - Lines referencing pages, volumes, editions
 * - Lines that are part of two-column commentary layout (generally shorter than diary text)
 *
 * Key insight: diary text lines are typically 60-90 chars in the normalized form.
 * Commentary footnote continuation lines are typically 30-55 chars because they
 * were typeset in a narrower column.
 */
function isCommentaryBlockContinuation(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Scholarly reference patterns
  if (/^(?:p\.\s*\d|col\.\s*\d|Cf\.|loc\.\s*cit|ibid|op\.\s*cit)/i.test(trimmed)) return true;

  // Latin/German quoted text (commentary often cites sources in these languages)
  if (/^«\s?/.test(trimmed)) return true;

  // Short lines that look like bibliography
  if (/(?:ed\.|vol\.|t\.\s*[IVX]|\d{4}[),;]|cap\.\s*\d|st\.\s*patr|Arch\.\s*Soc|Croniche|Hist\.|Chron\.|Diar\.|pontif|Ann\.|interpolazione)/i.test(trimmed)) return true;

  // Lines containing typical scholarly/commentary vocabulary
  if (/(?:loc\.\s*cit|erroneamente|Muratori|annotaz|cf\.\s|manoscritto|edizione|codic|Villani|Bernard|Tommasini|Contelori|Ciacconi|Filangieri|Tomassetti|Adinolfi|Coppi|Torrigio|Pastor|Burchard|Thouasne|Potthast|Burchardi|Nibby|Analisi\s+stor|interpolazione|\bmanca\b.*\b[ABCEFGLMNOPRSTVY]\d?\b|recano\s+nel\s+testo)/i.test(trimmed)) return true;

  // Lines containing bibliographic notation
  if (/(?:ms\.\s*\w|loc\.\s*cit|op\.\s*cit|Rer\.\s*It|Soc\.\s*rom|st\.\s*patr|Scr\.\s*t)/i.test(trimmed)) return true;

  // Short lines within footnote blocks (two-column layout)
  // These are continuation lines that are notably shorter than diary text
  if (trimmed.length < 50 && /[.;:,»]$/.test(trimmed)) return true;

  // Lines starting with lowercase that look like continuation of commentary
  if (/^[a-z]/.test(trimmed) && trimmed.length < 60) return true;

  // Lines starting with Italian prepositions/articles (commentary continuation of Italian text)
  if (/^(?:di|del|della|od|nel|dal|che|al)\s+/i.test(trimmed) && trimmed.length < 65) return true;

  // Lines containing volume/page references: ", I, 235" or ", II, 67" etc.
  if (/,\s*[IVX]+,\s*\d+/.test(trimmed)) return true;

  // Lines containing footnote-typical patterns
  if (/(?:Fu preferita|Si cita|Cf\.|stampa:|nota :|annota :|chiude :|recano :|reca :|tenimento|fosse anteriore|vuol derivata|Arch\.\s*di\s*Stato|Lett\.\s*ad)/i.test(trimmed)) return true;

  // Lines referencing specific geographic/archival patterns typical of commentary
  if (/(?:stor\.\-top|dint\.\s*di\s*Roma|della\s*carta)/i.test(trimmed)) return true;

  return false;
}

/**
 * Removes embedded line numbers at the start of diary text lines.
 * The edition uses line numbers every 5 lines: 5, 10, 15, 20, 25, 30
 */
export function removeLineNumbers(line: string): string {
  // Pattern: starts with a number (5,10,15,20,25,30) followed by 2+ spaces and text
  const match = line.match(/^(\s*)(5|10|15|20|25|30)\s{2,}(.+)$/);
  if (match) {
    return match[1] + match[3];
  }
  // Also handle "1 5" (OCR splits "15" into "1 5")
  const match2 = line.match(/^(\s*)([12]\s*[05])\s{2,}(.+)$/);
  if (match2) {
    return match2[1] + match2[3];
  }
  return line;
}

/**
 * Removes manuscript folio markers embedded in the text.
 * e.g., "c. 1B", "c 34 b", "c. 90 b", "C.51B"
 */
export function removeManuscriptMarkers(line: string): string {
  let cleaned = line;

  // Remove "| c. NNN a/b" and "| c NNN" patterns (column breaks + folio refs)
  cleaned = cleaned.replace(/\s*\|\s*c\.?\s*\d+\s*[aAbBvr]?\s*/g, ' ');

  // Remove standalone folio refs: "c. NNN" where it appears inline
  cleaned = cleaned.replace(/\bc\.?\s*\d{1,3}\s*[aAbBvr]\b/g, '');
  // C.51B pattern
  cleaned = cleaned.replace(/\bC\.\s*\d{1,3}\s*[aAbBvr]\b/g, '');

  // Remove pipe characters used as column breaks
  cleaned = cleaned.replace(/\s*\|\s*/g, ' ');

  // Clean up double spaces from removals
  cleaned = cleaned.replace(/  +/g, ' ');

  return cleaned;
}

/**
 * Removes inline apparatus markers from diary text.
 * These are: W, (a), (b), (c), (*), (^), superscript markers
 * that refer to variant readings in the apparatus below.
 *
 * NOTE: We keep the text-level markers like (d), W, etc. because
 * they are part of the published edition's notation. Only strip
 * obvious OCR noise.
 */
export function cleanInlineMarkers(line: string): string {
  let cleaned = line;

  // Remove "[>405]" type garbled year markers embedded in text
  cleaned = cleaned.replace(/\[>\d{3,4}\]\s*/g, '');

  // Remove "c  1 B" etc. embedded folio numbers
  cleaned = cleaned.replace(/\s+c\s+\d+\s*[AB]\s*/g, ' ');

  // Remove inline apparatus markers (OCR garbles of superscript footnote refs)
  // These take various forms due to OCR garbling:
  //   W, CO, W>, (a), (b), <c), <*), 0), ('), «), CD, Ci), Cp), Cm), Oj), (f >, <2), <_d)
  //   ©, ^, *, 00, 0>)

  // Pattern: isolated W not part of a word (OCR of superscript annotation marker)
  // W surrounded by spaces or at word boundary (not "W" in words like "USQUE")
  // Run in loop to handle consecutive W W patterns (source often has doubles)
  let prevW = '';
  do {
    prevW = cleaned;
    cleaned = cleaned.replace(/\s+W\s+/g, ' ');
  } while (cleaned !== prevW);
  cleaned = cleaned.replace(/\s+W([,;:.])/g, '$1');
  cleaned = cleaned.replace(/\s+W$/g, '');

  // Pattern: CO, CD (OCR of superscript markers)
  // Run in loop to handle consecutive CO CO patterns
  let prevCO = '';
  do {
    prevCO = cleaned;
    cleaned = cleaned.replace(/\s+C[OD]\s+/g, ' ');
  } while (cleaned !== prevCO);
  cleaned = cleaned.replace(/\s+C[OD]([,;:.])/g, '$1');

  // Pattern: 00, 0) (OCR garble of note markers)
  cleaned = cleaned.replace(/\s+00\s+/g, ' ');
  cleaned = cleaned.replace(/\s+00([,;:.])/g, '$1');  // "word 00," -> "word,"
  cleaned = cleaned.replace(/\s+0\)\s*/g, ' ');
  cleaned = cleaned.replace(/\s+0>\)\s*/g, ' ');

  // Pattern: (a), (b), ...(z) — inline variant markers
  // These are small superscript references to the apparatus below
  cleaned = cleaned.replace(/\s*<[a-z]\s*[)>]\s*/g, ' ');  // <c), <f >
  cleaned = cleaned.replace(/\s*\([a-z]\s*[)>]\s*/g, ' ');  // (a), (b)
  cleaned = cleaned.replace(/\s*<_[a-z]\s*[)>]\s*/g, ' ');  // <_d)
  cleaned = cleaned.replace(/\s*\(\*\)\s*/g, ' ');  // (*)
  cleaned = cleaned.replace(/\s*<\*\)\s*/g, ' ');  // <*)
  cleaned = cleaned.replace(/\s*\('\)\s*/g, ' ');  // (')

  // Pattern: (N) at end of sentences — commentary footnote markers
  // Only strip when they appear inline (not at start of lines)
  cleaned = cleaned.replace(/\s*\(\d+\)\s*([,;:.])/g, '$1');  // (1). (2);
  cleaned = cleaned.replace(/\s*\(\d+\)\s*$/g, '');  // trailing (1)
  cleaned = cleaned.replace(/\s+\(\d+\)\s+/g, ' ');  // mid-sentence (1)
  // Also (0 without closing paren (OCR garble of (1))
  cleaned = cleaned.replace(/\s*\(0\s*([,;:.])/g, '$1');  // (0.
  cleaned = cleaned.replace(/\s*\(0\s*$/g, '');  // trailing (0
  cleaned = cleaned.replace(/\s+\(0\s+/g, ' ');  // mid-sentence (0

  // Pattern: <N) where N is a digit (OCR garble of (N))
  cleaned = cleaned.replace(/\s*<\d+\)\s*/g, ' ');  // <2), <1)

  // Pattern: <*> (apparatus reference marker)
  cleaned = cleaned.replace(/\s*<\*>\s*/g, ' ');

  // Pattern: OCR garbles: ©, C«), Ci), Cp), Cf), Cm), Oj), O)
  cleaned = cleaned.replace(/\s*[©]\s*/g, ' ');
  cleaned = cleaned.replace(/\s*C[«ipf]\)\s*/g, ' ');
  cleaned = cleaned.replace(/\s*C[mtn]\)\s*/g, ' ');
  cleaned = cleaned.replace(/\s*Cf>\s*/g, ' ');  // Cf> garble of (f)
  cleaned = cleaned.replace(/\s*O[j]\)\s*/g, ' ');
  cleaned = cleaned.replace(/\s*O\)\s*/g, ' ');

  // FIX 3: Extended inline marker patterns
  // Pattern: C[a-gx*°»)>]) — OCR garble of (a) through (g), (*) footnote references
  // e.g., Ca), Cb), Cc), Cd), Ce), Cf), Cg), C*), C°), C»), C>), Cx)
  cleaned = cleaned.replace(/\s*C[a-gx\*°»)>]\)\s*/g, ' ');
  // Pattern: C1) when clearly a footnote marker (not manuscript siglum C1)
  // Only strip when preceded by a word character (inline position)
  cleaned = cleaned.replace(/(\w)\s*C1\)\s*/g, '$1 ');

  // Pattern: standalone W surrounded by spaces (garbled superscript) — 22 instances
  // Already handled above for \s+W\s+ but ensure we catch all edge cases
  // (The existing patterns handle most cases; this is a redundant safety net)

  // Pattern: standalone CO surrounded by spaces (garbled superscript) — 8 instances
  // Already handled above for \s+C[OD]\s+ but ensure edge cases at start/end of line
  cleaned = cleaned.replace(/^CO\s+/g, '');  // CO at start of line
  cleaned = cleaned.replace(/\s+CO$/g, '');  // CO at end of line

  // Pattern: COC2), COC1), etc. — OCR garble of (C2), (c2) apparatus markers
  cleaned = cleaned.replace(/\s*COC[12]\)\s*/g, ' ');
  // Pattern: C2>, C2) at end of word — garbled apparatus marker
  cleaned = cleaned.replace(/\s*C[12][>)]\s*/g, ' ');

  // Pattern: (") — 3 instances — garbled footnote marker
  cleaned = cleaned.replace(/\s*\("\)\s*/g, ' ');

  // Pattern: (<<) and (>>) — 14 instances — garbled footnote markers
  cleaned = cleaned.replace(/\s*\(«\)\s*/g, ' ');
  cleaned = cleaned.replace(/\s*\(»\)\s*/g, ' ');
  // Also catch ® (OCR of (r) or similar marker) followed by (»)
  cleaned = cleaned.replace(/\s*®\s*\(»\)\s*/g, ' ');
  cleaned = cleaned.replace(/\s*®\s*/g, ' ');

  // Pattern: <•> — garbled footnote reference marker
  cleaned = cleaned.replace(/\s*<•>\s*/g, ' ');
  // Pattern: <D — garbled footnote marker (stray angle bracket + D)
  cleaned = cleaned.replace(/\s*<D\s+/g, ' ');
  cleaned = cleaned.replace(/\s*<D([.,;:])/g, '$1');  // <D. -> .
  cleaned = cleaned.replace(/\s*<D$/g, '');
  // Pattern: f*> — garbled footnote marker
  cleaned = cleaned.replace(/\s*f\*>\s*/g, ' ');
  // Pattern: (*> — garbled footnote marker
  cleaned = cleaned.replace(/\s*\(\*>\s*/g, ' ');

  // Pattern: W> at end of word (garbled marker, e.g., "Georgium W>")
  cleaned = cleaned.replace(/\s+W>\s*/g, ' ');

  // Pattern: STEPHANI/STEPHAKI/STEPHATKl merged at end of diary line by OCR column merge
  // e.g., "...senta fracSTEPHAKI" -> "...senta frac"
  cleaned = cleaned.replace(/STEPHA[A-Z][A-Za-z]{1,3}\s*$/g, '');

  // Pattern: Manuscript siglum merged at end of word (OCR column merge)
  // e.g., "RoS1" (= Roma + S1), "MonC2" (= Monte + C2)
  // Strip trailing [SIGLA][12] when preceded by lowercase letter (word end)
  cleaned = cleaned.replace(/([a-z])[ABCEFGLMNOPRSTVY][12*z]\s*$/g, '$1');
  // Also C2> pattern at end of words
  cleaned = cleaned.replace(/([a-z])[ABCEFGLMNOPRSTVY][12][>)]\s*$/g, '$1');

  // Clean trailing whitespace from the removal
  cleaned = cleaned.replace(/\s+$/g, '');

  // Pattern: ^, W> at word boundaries
  cleaned = cleaned.replace(/\s*\^\s*/g, ' ');
  cleaned = cleaned.replace(/\s+W>\s*/g, ' ');

  // Pattern: ~ followed by letters (OCR garbles)
  cleaned = cleaned.replace(/~[a-z]>\s*/g, '');

  // Pattern: isolated « or » (stray quote marks from apparatus removal)
  cleaned = cleaned.replace(/\s+«\s*([,;:.])/g, '$1');
  cleaned = cleaned.replace(/\s+«\s*$/g, '');
  cleaned = cleaned.replace(/^\s*«\s+/, '');

  // Pattern: trailing "c" or "b\" (garbled folio refs)
  cleaned = cleaned.replace(/\s+[bc]\s*$/g, '');
  cleaned = cleaned.replace(/\s+b\\\s+/g, ' ');

  // Pattern: stray hyphen before word (from hyphenation artifacts)
  cleaned = cleaned.replace(/\s+-(\w)/g, ' $1');  // " -ditto" -> " ditto"

  // Pattern: "jj" or "||" (OCR of column break markers)
  cleaned = cleaned.replace(/\s+jj\s+/g, ' ');
  cleaned = cleaned.replace(/\s+\|\|\s+/g, ' ');

  // Pattern: "j " followed by uppercase (garbled marker before name/place)
  cleaned = cleaned.replace(/\s+j\s+([A-Z])/g, ' $1');  // " j Patriarca" -> " Patriarca"

  // Pattern: "T " before proper name (garbled pipe/marker)
  // Only when T is isolated and before a proper name
  cleaned = cleaned.replace(/,\s+T\s+([A-Z])/g, ', $1');  // ", T Austa" -> ", Austa"

  // Pattern: te) teO te*) tè) — OCR garble of (e), (O), etc. where ( became t
  // Use space replacement to avoid merging adjacent words
  cleaned = cleaned.replace(/t[eè]\)\s*/g, ' ');  // te) or tè) -> space
  cleaned = cleaned.replace(/t[eè]O\s*/g, ' ');  // teO or tèO -> space
  cleaned = cleaned.replace(/t[eè]\*\)\s*/g, ' ');  // te*) or tè*) -> space

  // Pattern: 'W' merged with preceding word (no space before W)
  cleaned = cleaned.replace(/(\w)W\b/g, '$1');  // fuitW -> fuit

  // Pattern: '>), '>) (garbled markers)
  cleaned = cleaned.replace(/\s*['']\s*>\)\s*/g, ' ');

  // Pattern: "I " before lowercase word when I is isolated (garbled marker)
  cleaned = cleaned.replace(/\s+I\s+([a-z])/g, ' $1');  // " I subito" -> " subito"

  // Pattern: e. NN a/b (folio reference embedded inline)
  cleaned = cleaned.replace(/\s*e\.\s*\d+\s*[ab]?\s*/g, ' ');

  // Cleanup: multiple spaces after removals
  cleaned = cleaned.replace(/  +/g, ' ');
  // Cleanup: space before punctuation (from marker removal)
  cleaned = cleaned.replace(/\s+([,;:.!?])/g, '$1');

  return cleaned;
}

/**
 * Fixes hyphenated words split across lines.
 */
export function fixHyphenation(currentLine: string, nextLine: string): [string, string] | null {
  // Check if current line ends with a hyphen (word split)
  const hyphenMatch = currentLine.match(/^(.+?)(\w+)-\s*$/);
  if (!hyphenMatch) return null;

  // Check if next line starts with a word continuation
  const nextMatch = nextLine.match(/^\s*(\w+)(.*)/);
  if (!nextMatch) return null;

  const prefix = hyphenMatch[1];
  const wordStart = hyphenMatch[2];
  const wordEnd = nextMatch[1];
  const restOfNext = nextMatch[2];

  const fixedCurrent = prefix + wordStart + wordEnd;
  const fixedNext = restOfNext.trimStart();

  return [fixedCurrent, fixedNext];
}

/**
 * Normalizes spacing in a line.
 */
export function normalizeSpacing(line: string): string {
  const match = line.match(/^(\s*)(.*)/);
  if (!match) return line;

  const indent = match[1];
  const content = match[2];

  // Normalize multiple spaces to single
  const normalized = content.replace(/  +/g, ' ');

  return indent + normalized;
}

/**
 * Checks if a line contains trailing line-number that should be stripped.
 * Pattern: diary text followed by a space and then a bare number 5/10/15/20/25/30 at end
 */
export function removeTrailingLineNumber(line: string): string {
  // Remove trailing line numbers: "some text here 5" or "some text here 15"
  let cleaned = line.replace(/\s+(5|10|15|20|25|30)\s*$/, '');

  // Also handle line numbers merged with the last word (no space before number):
  // "impren15" -> "impren", "non15" -> "non", "domi20" -> "domi"
  // Only strip if the remaining text forms a plausible word fragment
  cleaned = cleaned.replace(/([a-z])(5|10|15|20|25|30)\s*$/, '$1');

  // And at the end of a line before any trailing spaces:
  cleaned = cleaned.replace(/([a-z])(5|10|15|20|25|30)\s+/, '$1 ');

  return cleaned;
}

/**
 * FIX 2: Detects lines that are apparatus entries with 2+ manuscript sigla.
 * These are lines where OCR merged diary text with variant readings.
 * 
 * A line is considered apparatus if:
 * - It contains 3+ isolated single-uppercase-letter tokens (like R1 C1 M or S V1 R1)
 * - OR it contains 2+ sigla AND editorial vocabulary (rimanda, aggiunto, corretto, etc.)
 * 
 * We are careful NOT to remove valid diary lines where Italian words happen to
 * be single uppercase letters.
 */
export function isSiglaApparatusLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Count numbered sigla (R1, C1, C2, S1, S2, V1, M1, etc.) — these are unambiguous
  // Also match OCR variants: "R 1" (space between), "Rz" (z for 2), "R*" etc.
  const numberedSigla = (trimmed.match(/\b[ABCEFGLMNOPRSTVY][12*z]\b/g) || []);
  // Also count "R 1" pattern (space between letter and digit)
  const spacedSigla = (trimmed.match(/\b[ABCEFGLMNOPRSTVY]\s+[12]\b/g) || []);

  // Count single-letter sigla — but only when they appear isolated
  // (not as part of words like "A dì" or "È evidente")
  const singleSigla = (trimmed.match(/(?:^|\s)[ABCEFGLMNOPRSTVY](?=\s|$|[,;:])/g) || []);

  const totalNumbered = numberedSigla.length + spacedSigla.length;
  const totalSigla = totalNumbered + singleSigla.length;

  // Editorial vocabulary that indicates apparatus context
  const editorialVocab = /\b(?:rimanda|aggiunto|corretto|correzione|leggesi|variante|l'antica|alterato|mss\.|manca\s+(?:da|in|il)|annota\s+in\s+margine|d'altro\s+carattere|sostituita|lacuna\s+interposta|ex\s+abrupto|interpolazione|mal[ae]\s+interpret|abbreviatura|incerto\s+se|altri\s+mt?s|le\s+edd\.|Stephani\s+infessur|intitolatone|a\s+c\.\s*\d)\b/i;

  // Rule 1: 3+ total sigla tokens means this is definitely apparatus
  if (totalSigla >= 3) return true;

  // Rule 2: 2+ numbered sigla (like R1 C1) is very strong evidence
  if (totalNumbered >= 2) return true;

  // Rule 3: 1 numbered siglum + 1 single-letter siglum = apparatus
  // A numbered siglum (R1, C2, etc.) is an unambiguous apparatus marker;
  // if combined with any other siglum, the line is apparatus.
  if (totalNumbered >= 1 && singleSigla.length >= 1) return true;

  // Rule 4: 2+ total sigla + editorial vocabulary
  if (totalSigla >= 2 && editorialVocab.test(trimmed)) return true;

  // Rule 5: 1+ numbered siglum + editorial vocabulary
  if (totalNumbered >= 1 && editorialVocab.test(trimmed)) return true;

  // Rule 6: Lines that are clearly apparatus commentary about manuscripts
  // Contains editorial vocab + any siglum reference pattern
  if (editorialVocab.test(trimmed) && /\b[ABCEFGLMNOPRSTVY][12]?\b/.test(trimmed)) {
    // Double-check: must not be a diary entry start pattern
    if (!/^(?:Dell'anno|Nell'anno|A\s+d[iì]|Lo\s+d[iì]|Et\s+a|Eodem|Die\s)/i.test(trimmed)) {
      return true;
    }
  }

  // Rule 7a: Sigla merged with adjacent word (no word boundary)
  // Patterns: COC2), RoS1, MonC2, ERR1, C2> (OCR merged siglum with text)
  // Count merged sigla: letter+digit patterns where the siglum is embedded
  const mergedSigla = (trimmed.match(/[A-Za-z][ABCEFGLMNOPRSTVY][12]/g) || []);
  if (mergedSigla.length >= 2) return true;
  if (mergedSigla.length >= 1 && totalNumbered >= 1) return true;
  // Merged siglum + 2+ single-letter sigla = apparatus
  if (mergedSigla.length >= 1 && singleSigla.length >= 2) return true;

  // Rule 7b: Numbered siglum followed by variant reading pattern
  // Pattern: [diary text] [R1/C2/etc.] [variant text that is clearly alternative]
  // e.g., "palazzo R1 che dovunque andavano..."
  if (totalNumbered >= 1) {
    // If the line has a numbered siglum with text both before and after it,
    // and the text after introduces a variant (different phrasing)
    // Check for patterns like: word R1 word (siglum in middle of text = variant marker)
    const siglaInMiddle = /\w+\s+[ABCEFGLMNOPRSTVY][12*z]\s+\w+/.test(trimmed);
    // Also check for siglum at start of line followed by text (variant reading continuation)
    const siglaAtStart = /^[ABCEFGLMNOPRSTVY][12*z]\s+/.test(trimmed);
    if (siglaInMiddle || siglaAtStart) {
      // Additional safety: not a diary entry start
      if (!/^(?:Dell'anno|Nell'anno|A\s+d[iì]|Lo\s+d[iì]|Et\s+a|Eodem|Die\s)/i.test(trimmed)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Main cleaning function: processes an array of lines and returns cleaned output.
 */
export function cleanDiaryText(lines: string[], startLine: number, endLine: number): { cleaned: string[]; stats: CleaningStats } {
  const stats: CleaningStats = {
    totalLinesInput: endLine - startLine + 1,
    pageHeadersRemoved: 0,
    footnotesRemoved: 0,
    hyphenationsFixed: 0,
    extraSpacesFixed: 0,
    blankLinesNormalized: 0,
    totalLinesOutput: 0,
  };

  // First pass: identify footnote blocks to skip
  const footnoteBlocks = identifyFootnoteBlocks(lines, startLine, endLine);
  const footnoteLines = new Set<number>();
  for (const block of footnoteBlocks) {
    for (let i = block.startLine; i <= block.endLine; i++) {
      footnoteLines.add(i);
    }
    stats.footnotesRemoved += (block.endLine - block.startLine + 1);
  }

  // Second pass: process lines
  const result: string[] = [];
  let i = startLine;

  while (i <= endLine) {
    // Skip footnote lines
    if (footnoteLines.has(i)) {
      i++;
      continue;
    }

    let line = lines[i];

    // Skip page headers
    if (isPageHeader(line)) {
      stats.pageHeadersRemoved++;
      i++;
      continue;
    }

    // Remove line numbers
    line = removeLineNumbers(line);

    // Remove trailing line numbers
    line = removeTrailingLineNumber(line);

    // Remove manuscript markers
    line = removeManuscriptMarkers(line);

    // Clean inline markers
    line = cleanInlineMarkers(line);

    // Normalize spacing
    const beforeSpacing = line;
    line = normalizeSpacing(line);
    if (line !== beforeSpacing) {
      stats.extraSpacesFixed++;
    }

    // Handle hyphenation (look ahead to next meaningful line)
    if (line.match(/\w+-\s*$/)) {
      let nextIdx = i + 1;
      while (nextIdx <= endLine &&
             (footnoteLines.has(nextIdx) || isPageHeader(lines[nextIdx]) || !lines[nextIdx].trim())) {
        nextIdx++;
      }
      if (nextIdx <= endLine) {
        // Strip leading line numbers from next line before hyphenation join
        // (line numbers are 5, 10, 15, 20, 25, 30 at the start of lines)
        let nextLineForHyphen = removeLineNumbers(lines[nextIdx]);
        // Also normalize spacing so multi-space gaps don't interfere
        nextLineForHyphen = normalizeSpacing(nextLineForHyphen);
        const fix = fixHyphenation(line, nextLineForHyphen);
        if (fix) {
          line = fix[0];
          lines[nextIdx] = fix[1] ? '  ' + fix[1] : '';
          stats.hyphenationsFixed++;
        }
      }
    }

    // Add the cleaned line
    const trimmed = line.trim();
    if (trimmed) {
      result.push(trimmed);
    } else {
      // Normalize blank lines: max one consecutive
      if (result.length > 0 && result[result.length - 1] !== '') {
        result.push('');
        stats.blankLinesNormalized++;
      }
    }

    i++;
  }

  // FIX 2: Post-processing pass
  // First, strip trailing merged sigla from lines (caused by hyphenation joins)
  // Pattern: word ending with S1, C2, R1 etc. where siglum merged during hyphen join
  const cleanedResult: string[] = [];
  for (const line of result) {
    if (line === '') {
      cleanedResult.push(line);
    } else {
      let cleaned = line;
      // Strip trailing merged siglum: lowercase letter + uppercase siglum letter + digit
      cleaned = cleaned.replace(/([a-z])[ABCEFGLMNOPRSTVY][12*z]\s*$/g, '$1');
      // Also strip trailing C2>, C2) etc.
      cleaned = cleaned.replace(/([a-z])[ABCEFGLMNOPRSTVY][12][>)]\s*$/g, '$1');
      // Strip trailing COC2) etc. (garbled inline markers left at end of line)
      cleaned = cleaned.replace(/\s*COC[12]\)\s*$/g, '');
      cleaned = cleaned.trim();
      if (cleaned) {
        cleanedResult.push(cleaned);
      }
    }
  }

  // Then, remove lines with 2+ manuscript sigla
  // This catches apparatus entries that leaked through the main cleaning passes
  // (typically lines where OCR merged diary text with variant readings)
  const postProcessed: string[] = [];
  let siglaLinesRemoved = 0;
  for (const line of cleanedResult) {
    if (line === '') {
      postProcessed.push(line);
    } else if (isSiglaApparatusLine(line)) {
      siglaLinesRemoved++;
    } else {
      postProcessed.push(line);
    }
  }

  // Remove trailing blank lines
  while (postProcessed.length > 0 && postProcessed[postProcessed.length - 1] === '') {
    postProcessed.pop();
  }

  // Remove consecutive blank lines that may have formed after sigla line removal
  const finalResult: string[] = [];
  for (const line of postProcessed) {
    if (line === '' && finalResult.length > 0 && finalResult[finalResult.length - 1] === '') {
      continue; // Skip consecutive blank lines
    }
    finalResult.push(line);
  }

  stats.totalLinesOutput = finalResult.length;
  // Log sigla lines removed (added to footnotes count for reporting)
  stats.footnotesRemoved += siglaLinesRemoved;
  return { cleaned: finalResult, stats };
}
