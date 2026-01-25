/**
 * Section Splitter for Diarium Urbis Romae
 *
 * Identifies the major structural sections of the OCR text:
 * 1. Front matter (title pages, lines 1-94)
 * 2. Preface (PREFAZIONE, lines 95-1336)
 * 3. Main diary text (lines 1337-18818)
 * 4. "Altro principio" appendix (lines 18819-19018)
 * 5. Index / back matter (lines 19019-end)
 */

import { DiarySection } from './types.js';

/**
 * Identifies the major structural sections of the complete OCR text.
 */
export function identifySections(lines: string[]): DiarySection[] {
  const sections: DiarySection[] = [];

  // Find PREFAZIONE start
  let prefaceStart = -1;
  for (let i = 0; i < Math.min(200, lines.length); i++) {
    if (/^\s*PREFAZIONE\s*$/.test(lines[i])) {
      prefaceStart = i;
      break;
    }
  }

  // Front matter: everything before PREFAZIONE
  if (prefaceStart > 0) {
    sections.push({
      type: 'frontmatter',
      startLine: 0,
      endLine: prefaceStart - 1,
      title: 'Title Pages'
    });
  }

  // Find diary start: "I.   Post  -Curiam  Romanam..." or the Latin heading
  let diaryStart = -1;
  for (let i = prefaceStart; i < Math.min(1500, lines.length); i++) {
    if (/Post\s*-?\s*Curiam\s+Romanam/.test(lines[i]) ||
        /USjQUE\s+AD\s+ALEXANDRI/.test(lines[i]) ||
        /USQUE\s+AD\s+ALEXANDRI/.test(lines[i])) {
      // Back up to find the section number (I. or similar)
      diaryStart = i;
      // Check if previous non-blank line is the section marker
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        if (/^\s*I\.\s+Post/.test(lines[j]) || /^\s*I\.\s*$/.test(lines[j])) {
          diaryStart = j;
          break;
        }
      }
      break;
    }
  }

  // Preface section
  if (prefaceStart >= 0 && diaryStart > prefaceStart) {
    sections.push({
      type: 'preface',
      startLine: prefaceStart,
      endLine: diaryStart - 1,
      title: 'Prefazione (Tommasini)'
    });
  }

  // Find "Altro principio" (alternative beginning / appendix)
  let altroPrincipioStart = -1;
  for (let i = Math.max(0, lines.length - 6000); i < lines.length; i++) {
    if (/Altro\s+principio\s+del\s+Diario/.test(lines[i])) {
      altroPrincipioStart = i;
      break;
    }
  }

  // Find INDICE (index) start - first occurrence after the diary text
  let indexStart = -1;
  const searchFrom = altroPrincipioStart > 0 ? altroPrincipioStart : Math.floor(lines.length * 0.7);
  for (let i = searchFrom; i < lines.length; i++) {
    if (/^\s*INDICE\s*$/.test(lines[i])) {
      indexStart = i;
      break;
    }
  }

  // Main diary text
  if (diaryStart >= 0) {
    const diaryEnd = altroPrincipioStart > 0 ? altroPrincipioStart - 1 :
                     (indexStart > 0 ? indexStart - 1 : lines.length - 1);
    sections.push({
      type: 'diary',
      startLine: diaryStart,
      endLine: diaryEnd,
      title: 'Diaria Rerum Romanarum'
    });
  }

  // Altro principio appendix
  if (altroPrincipioStart > 0 && indexStart > altroPrincipioStart) {
    sections.push({
      type: 'appendix',
      startLine: altroPrincipioStart,
      endLine: indexStart - 1,
      title: 'Altro principio del Diario'
    });
  }

  // Index / back matter
  if (indexStart > 0) {
    sections.push({
      type: 'index',
      startLine: indexStart,
      endLine: lines.length - 1,
      title: 'Indice'
    });
  }

  return sections;
}

/**
 * Splits diary text into year-based entries using year markers.
 * Year markers appear as [YYYY] on their own line (page headers),
 * or as "Dell'anno YYYY", "Nell'anno YYYY", etc. in the text.
 */
export function splitByYearPeriods(lines: string[], startLine: number, endLine: number): Map<string, { start: number; end: number }> {
  const periods = new Map<string, { start: number; end: number }>();

  // Define the time periods for output files
  const periodRanges = [
    { label: '1294-1399', startYear: 1294, endYear: 1399 },
    { label: '1400-1419', startYear: 1400, endYear: 1419 },
    { label: '1420-1439', startYear: 1420, endYear: 1439 },
    { label: '1440-1459', startYear: 1440, endYear: 1459 },
    { label: '1460-1479', startYear: 1460, endYear: 1479 },
    { label: '1480-1484', startYear: 1480, endYear: 1484 },
    { label: '1485-1494', startYear: 1485, endYear: 1494 },
  ];

  // Find year transitions by scanning for year markers in the text
  let currentYear = 1294;
  let periodStartLine = startLine;

  const yearTransitions: { year: number; line: number }[] = [];

  for (let i = startLine; i <= endLine; i++) {
    const line = lines[i];

    // Check for year markers: [YYYY] in page headers
    const yearHeaderMatch = line.match(/^\s*\[(\d{4})\]/);
    if (yearHeaderMatch) {
      const year = parseInt(yearHeaderMatch[1]);
      if (year >= 1294 && year <= 1500) {
        yearTransitions.push({ year, line: i });
      }
      continue;
    }

    // Check for year in diary entries: Dell'anno YYYY, Nell'anno YYYY
    const yearEntryMatch = line.match(/(?:Dell'anno|Nell'anno|Del ditto anno)\s+(?:Domini\s+)?\.?(\d{4}|[Mm]\w+)/);
    if (yearEntryMatch) {
      const yearStr = yearEntryMatch[1];
      const year = parseInt(yearStr);
      if (!isNaN(year) && year >= 1294 && year <= 1500) {
        yearTransitions.push({ year, line: i });
      }
    }
  }

  // Now assign line ranges to periods
  for (const period of periodRanges) {
    // Find first line that belongs to this period
    let pStart = -1;
    let pEnd = -1;

    for (const trans of yearTransitions) {
      if (trans.year >= period.startYear && trans.year <= period.endYear) {
        if (pStart === -1 || trans.line < pStart) {
          pStart = trans.line;
        }
        if (pEnd === -1 || trans.line > pEnd) {
          pEnd = trans.line;
        }
      }
    }

    if (pStart >= 0) {
      // Extend pEnd to just before the next period's first transition
      const nextPeriod = periodRanges.find(p => p.startYear > period.endYear);
      if (nextPeriod) {
        const nextStart = yearTransitions.find(t => t.year >= nextPeriod.startYear);
        if (nextStart) {
          pEnd = nextStart.line - 1;
        } else {
          pEnd = endLine;
        }
      } else {
        pEnd = endLine;
      }

      periods.set(period.label, { start: pStart, end: pEnd });
    }
  }

  return periods;
}
