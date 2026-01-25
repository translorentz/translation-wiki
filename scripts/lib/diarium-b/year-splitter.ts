/**
 * Year Splitter for Diarium Urbis Romae (Agent B)
 *
 * Splits the cleaned diary text into year-period files based on
 * year entry markers in the text.
 *
 * Year entry patterns:
 * - "Dell'anno YYYY ..." (most common)
 * - "Nell'anno YYYY ..."
 * - "Del ditto anno YYYY ..."
 * - "Dello ditto anno YYYY ..."
 * - "Eodem anno ..."
 * - "A dì NN ..." (continuation of current year)
 * - "Die .XXX. mensis ..." (Latin date, continuation)
 */

export interface YearEntry {
  year: number;
  lineIndex: number;
}

/**
 * Extracts year transitions from cleaned diary text.
 * Returns array of { year, lineIndex } marking where each new year begins.
 */
export function findYearTransitions(lines: string[]): YearEntry[] {
  const transitions: YearEntry[] = [];
  let currentYear = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Pattern 1: Dell'anno YYYY or Nell'anno YYYY
    let match = line.match(/^(?:Dell'anno|Nell'anno|Del ditto anno)\s+(?:Domini\s+)?\.?[Mm]?(\d{4})/);
    if (match) {
      const year = parseInt(match[1]);
      if (year >= 1294 && year <= 1500 && year !== currentYear) {
        currentYear = year;
        transitions.push({ year, lineIndex: i });
      }
      continue;
    }

    // Pattern 2: Roman numeral years in "Dell'anno" entries
    // e.g., "Dell'anno .Meccani." = 1441 (actually .Mccccxli.)
    // These are rare and often garbled; skip for now as they'll be caught by context

    // Pattern 3: "Dell'anno preditto" or "Dell'anno detto" — keeps current year
    // No transition needed

    // Pattern 4: "Anno Domini YYYY" in the text
    match = line.match(/Anno\s+Domini\s+\.?(\d{4})/);
    if (match) {
      const year = parseInt(match[1]);
      if (year >= 1294 && year <= 1500 && year !== currentYear) {
        currentYear = year;
        transitions.push({ year, lineIndex: i });
      }
    }

    // Pattern 5: Year in the form ".mcccclxxxxiv." (Roman numeral year)
    match = line.match(/\.m(c{0,4})(d?)(c{0,3})(l?)(x{0,3})(v?)(i{0,3})\./i);
    if (match) {
      // Parse Roman numeral year (simplified)
      // This is complex but rarely needed since most years are in Arabic
    }
  }

  return transitions;
}

/**
 * Groups lines into year periods for output files.
 */
export interface YearPeriod {
  label: string;
  startYear: number;
  endYear: number;
  startLine: number;
  endLine: number;
}

/**
 * Defines the output file periods and assigns line ranges.
 */
export function assignYearPeriods(lines: string[], transitions: YearEntry[]): YearPeriod[] {
  // Define output periods
  const periodDefs = [
    { label: '1294-1399', startYear: 1294, endYear: 1399 },
    { label: '1400-1419', startYear: 1400, endYear: 1419 },
    { label: '1420-1439', startYear: 1420, endYear: 1439 },
    { label: '1440-1459', startYear: 1440, endYear: 1459 },
    { label: '1460-1479', startYear: 1460, endYear: 1479 },
    { label: '1480-1484', startYear: 1480, endYear: 1484 },
    { label: '1485-1494', startYear: 1485, endYear: 1494 },
  ];

  const periods: YearPeriod[] = [];

  for (const def of periodDefs) {
    // Find the first transition in this period
    const firstTransition = transitions.find(t => t.year >= def.startYear && t.year <= def.endYear);
    if (!firstTransition) continue;

    // Find the first transition in the NEXT period (to determine end)
    const nextPeriodDef = periodDefs.find(p => p.startYear > def.endYear);
    let endLine: number;

    if (nextPeriodDef) {
      const nextTransition = transitions.find(t => t.year >= nextPeriodDef.startYear);
      endLine = nextTransition ? nextTransition.lineIndex - 1 : lines.length - 1;
    } else {
      endLine = lines.length - 1;
    }

    // Trim trailing blank lines from the end
    while (endLine > firstTransition.lineIndex && !lines[endLine].trim()) {
      endLine--;
    }

    periods.push({
      label: def.label,
      startYear: def.startYear,
      endYear: def.endYear,
      startLine: firstTransition.lineIndex,
      endLine,
    });
  }

  // Handle the beginning: everything before the first year transition is preamble
  if (transitions.length > 0 && transitions[0].lineIndex > 0) {
    // There might be text before the first year entry (e.g., the heading and initial fragment)
    const preambleEnd = transitions[0].lineIndex - 1;
    // Trim trailing blanks
    let trimEnd = preambleEnd;
    while (trimEnd > 0 && !lines[trimEnd].trim()) trimEnd--;

    if (trimEnd > 0) {
      // Prepend to the first period
      if (periods.length > 0) {
        periods[0].startLine = 0;
      }
    }
  }

  return periods;
}
