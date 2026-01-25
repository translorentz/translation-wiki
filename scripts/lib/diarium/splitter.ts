/**
 * Splitter module: identifies section boundaries in the OCR text
 * and extracts the preface, diary, and "altro principio" sections.
 */

import type { SectionBoundaries } from './types.js';

/**
 * Identify section boundaries in the full OCR text.
 * Uses known structural markers to find where each section begins/ends.
 */
export function identifySections(lines: string[]): SectionBoundaries {
  let prefaceStart = -1;
  let prefaceEnd = -1;
  let diaryStart = -1;
  let diaryEnd = -1;
  let altroPrincipioStart = -1;
  let altroPrincipioEnd = -1;
  let indexStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Preface starts with "PREFAZIONE" (around line 82)
    if (prefaceStart === -1 && line === 'PREFAZIONE') {
      prefaceStart = i;
    }

    // Diary title: "STEPHANI  INFESSURAE" as a standalone line (around line 1115)
    // The diary text starts a few lines after this with "Manca lo principio."
    if (diaryStart === -1 && prefaceStart !== -1 &&
        /^STEPHANI\s+INFESSURAE\s*$/.test(line)) {
      // Mark the preface as ending here
      prefaceEnd = i;
      // The diary content actually starts a few lines later after the title block
      // Look for "Manca lo principio" which is the first line of diary text
      // (OCR has multiple spaces between words, so use regex)
      for (let j = i; j < Math.min(i + 20, lines.length); j++) {
        if (/Manca\s+lo\s+principio/i.test(lines[j])) {
          diaryStart = j;
          break;
        }
      }
    }

    // "Altro principio del Diario di Stefano Infessura"
    if (altroPrincipioStart === -1 && diaryStart !== -1 &&
        /Altro\s+principio\s+del\s+Diario/i.test(line)) {
      diaryEnd = i;
      altroPrincipioStart = i;
    }

    // INDICE section — marks end of "Altro principio"
    if (indexStart === -1 && altroPrincipioStart !== -1 &&
        line === 'INDICE') {
      altroPrincipioEnd = i;
      indexStart = i;
      break; // We don't need to scan further
    }
  }

  // Validate we found all sections
  if (prefaceStart === -1) throw new Error('Could not find PREFAZIONE');
  if (diaryStart === -1) throw new Error('Could not find diary start (Manca lo principio)');
  if (diaryEnd === -1) throw new Error('Could not find diary end (Altro principio)');
  if (altroPrincipioEnd === -1) throw new Error('Could not find INDICE section');

  return {
    prefaceStart,
    prefaceEnd,
    diaryStart,
    diaryEnd,
    altroPrincipioStart,
    altroPrincipioEnd,
    indexStart,
  };
}

/**
 * Extract a section of lines by its boundaries.
 */
export function extractSection(lines: string[], start: number, end: number): string[] {
  return lines.slice(start, end);
}
