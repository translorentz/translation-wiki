/**
 * Year splitter module: splits the cleaned diary text into year-based sections.
 */

import type { DiaryEntry } from './types.js';

/**
 * Parse a year from a diary entry header line.
 * Handles patterns like:
 * - Dell'anno 1405
 * - Dell'anno Domini 1438
 * - Nell'anno 1361
 * - Dell'anno .Mccccim.
 * - Dell'anno .mcccclxxxxiv.
 * - Dell'anno Domini .mccccxxxix.
 * - Die 25 ianuarii .mcccclxxxxiv.
 */
export function parseYear(line: string): number | null {
  // Try Arabic numeral year first
  const arabicMatch = line.match(/\b(1[2-5]\d{2})\b/);
  if (arabicMatch) {
    return parseInt(arabicMatch[1]);
  }

  // Try Roman numeral year (in dots): .MCCCCXXXIX. etc.
  const romanMatch = line.match(/\.([MCDXLVI]+)\./i);
  if (romanMatch) {
    const year = romanToArabic(romanMatch[1]);
    if (year >= 1200 && year <= 1500) return year;
  }

  return null;
}

/**
 * Convert a Roman numeral string to Arabic number.
 */
export function romanToArabic(roman: string): number {
  const values: Record<string, number> = {
    'M': 1000, 'D': 500, 'C': 100, 'L': 50,
    'X': 10, 'V': 5, 'I': 1,
  };

  let result = 0;
  const upper = roman.toUpperCase();

  for (let i = 0; i < upper.length; i++) {
    const current = values[upper[i]] || 0;
    const next = i + 1 < upper.length ? (values[upper[i + 1]] || 0) : 0;

    if (current < next) {
      result -= current;
    } else {
      result += current;
    }
  }

  return result;
}

/**
 * Check if a line is a year entry header (starts a new year's entries).
 */
export function isYearEntryHeader(line: string): boolean {
  const trimmed = line.trim();
  if (/^(Dell'anno|Nell'anno)\s/i.test(trimmed)) return true;
  if (/^Anno\s+Domini\s/i.test(trimmed)) return true;
  return false;
}

/**
 * Split cleaned diary lines into year-based entries.
 * Groups entries by year for output.
 */
export function splitByYear(lines: string[]): DiaryEntry[] {
  const entries: DiaryEntry[] = [];
  let currentYear = 0;
  let currentLines: string[] = [];
  let headerText = '';

  for (const line of lines) {
    if (isYearEntryHeader(line)) {
      const year = parseYear(line);

      if (year && year !== currentYear) {
        // Save previous entry
        if (currentLines.length > 0) {
          entries.push({
            yearStart: currentYear || 1294,
            yearEnd: currentYear || 1294,
            text: currentLines.join('\n'),
          });
        }
        currentYear = year;
        currentLines = [line];
      } else {
        // Same year or couldn't parse — continue accumulating
        currentLines.push(line);
      }
    } else {
      currentLines.push(line);
    }
  }

  // Don't forget the last entry
  if (currentLines.length > 0) {
    entries.push({
      yearStart: currentYear || 1494,
      yearEnd: currentYear || 1494,
      text: currentLines.join('\n'),
    });
  }

  return entries;
}

/**
 * Group year entries by decade for file output.
 * Returns groups like: 1294-1309, 1310-1319, ..., 1490-1494
 */
export function groupByDecade(entries: DiaryEntry[]): Map<string, DiaryEntry[]> {
  const groups = new Map<string, DiaryEntry[]>();

  for (const entry of entries) {
    const decadeStart = Math.floor(entry.yearStart / 10) * 10;
    // For the first group (1294-1309), use a wider range
    let key: string;
    if (decadeStart < 1310) {
      key = '1294-1309';
    } else {
      const decadeEnd = decadeStart + 9;
      key = `${decadeStart}-${decadeEnd}`;
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  }

  return groups;
}

/**
 * Group entries into larger time periods for more manageable output files.
 * Periods:
 * - 1294-1377: Early period (Avignon papacy references)
 * - 1378-1417: Great Schism
 * - 1418-1447: Early Renaissance popes
 * - 1448-1464: Nicholas V, Calixtus III, Pius II
 * - 1465-1484: Paul II, Sixtus IV
 * - 1485-1494: Innocent VIII, Alexander VI
 */
export function groupByPeriod(entries: DiaryEntry[]): Map<string, DiaryEntry[]> {
  const periods: [number, number, string][] = [
    [1294, 1377, '1294-1377'],
    [1378, 1417, '1378-1417'],
    [1418, 1447, '1418-1447'],
    [1448, 1464, '1448-1464'],
    [1465, 1484, '1465-1484'],
    [1485, 1494, '1485-1494'],
  ];

  const groups = new Map<string, DiaryEntry[]>();

  for (const entry of entries) {
    for (const [start, end, key] of periods) {
      if (entry.yearStart >= start && entry.yearStart <= end) {
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(entry);
        break;
      }
    }
  }

  return groups;
}
