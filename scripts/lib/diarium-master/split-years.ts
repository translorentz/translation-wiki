/**
 * Split the full diary into year-based chapter files
 * 
 * The Diarium Urbis Romae covers events from 1294 to 1494.
 * This script splits the full text into manageable year-based chapters.
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_FILE = 'data/raw/diarium-urbis-romae/diary-full.txt';
const OUTPUT_DIR = 'data/raw/diarium-urbis-romae';

// Year markers found in the text
const YEAR_PATTERNS = [
  /^Nell'anno\s+(\d{4})/,
  /^Nell'anno\s+(\d+)\s+/,
  /^Dell'anno\s+(\d{4})/,
  /^Dell'anno\.(\d{4})/,
  /^Dell'anno\s+Domini\.?(\d{4})/,
  /^A\s+di\s+\d+.*(\d{4})/,
  /^Anno\s+Domini\s+(\d{4})/,
  /^III\.\s+HISTORIE/,  // Section header, around 1376
  /^li\.\s+Quando la corte/,  // Section header, around 1305
];

interface YearSection {
  startLine: number;
  endLine: number;
  year: number | null;
  title: string;
  content: string[];
}

/**
 * Parse year from line if it contains a year marker
 */
function parseYear(line: string): number | null {
  // Try various year patterns
  let match = line.match(/\b1[234]\d{2}\b/);
  if (match) {
    return parseInt(match[0], 10);
  }
  
  // Roman numeral years
  match = line.match(/\bmcccc[lx]*[iv]*/i);
  if (match) {
    // Basic MCCCC parsing (1400s)
    const roman = match[0].toLowerCase();
    if (roman.includes('mcccc')) {
      let year = 1400;
      const suffix = roman.replace('mcccc', '');
      if (suffix.includes('xc')) year += 90;
      else if (suffix.includes('lxxx')) year += 80;
      else if (suffix.includes('lxx')) year += 70;
      else if (suffix.includes('lx')) year += 60;
      else if (suffix.includes('l')) year += 50;
      else if (suffix.includes('xl')) year += 40;
      else if (suffix.includes('xxx')) year += 30;
      else if (suffix.includes('xx')) year += 20;
      else if (suffix.includes('x')) year += 10;
      // Handle units
      const units = suffix.replace(/[lx]/g, '');
      if (units.includes('iv')) year += 4;
      else if (units.includes('ix')) year += 9;
      else {
        year += (units.match(/i/g) || []).length;
        if (units.includes('v')) year += 5;
      }
      return year;
    }
  }
  
  return null;
}

/**
 * Check if a line is a year entry marker
 */
function isYearEntry(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("Nell'anno") ||
    trimmed.startsWith("Dell'anno") ||
    trimmed.startsWith('Anno Domini') ||
    /^III\.\s+HISTORIE/.test(trimmed) ||
    /^li\.\s+Quando/.test(trimmed)
  );
}

/**
 * Split diary into year-based sections
 */
export function splitIntoYears(): void {
  const text = fs.readFileSync(INPUT_FILE, 'utf-8');
  const lines = text.split('\n');
  
  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  // Identify year transitions
  const yearBreaks: number[] = [];
  let currentYear: number | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const year = parseYear(line);
    
    if (year && year !== currentYear && isYearEntry(line)) {
      yearBreaks.push(i);
      currentYear = year;
    }
  }
  
  // Group into year ranges for chapters
  // We will create chapters that span logical year ranges
  const chapters = [
    { name: 'diary-year-1294-1377', startYear: 1294, endYear: 1377 },
    { name: 'diary-year-1378-1417', startYear: 1378, endYear: 1417 },
    { name: 'diary-year-1418-1447', startYear: 1418, endYear: 1447 },
    { name: 'diary-year-1448-1464', startYear: 1448, endYear: 1464 },
    { name: 'diary-year-1465-1479', startYear: 1465, endYear: 1479 },
    { name: 'diary-year-1480-1484', startYear: 1480, endYear: 1484 },
    { name: 'diary-year-1485-1494', startYear: 1485, endYear: 1494 },
  ];
  
  // Find line ranges for each chapter based on year mentions
  for (const chapter of chapters) {
    let startLine = 0;
    let endLine = lines.length - 1;
    let foundStart = false;
    let currentYearInRange = false;
    
    for (let i = 0; i < lines.length; i++) {
      const year = parseYear(lines[i]);
      
      if (year) {
        if (year >= chapter.startYear && year <= chapter.endYear) {
          if (!foundStart && isYearEntry(lines[i])) {
            startLine = i;
            foundStart = true;
          }
          currentYearInRange = true;
        } else if (year > chapter.endYear && currentYearInRange) {
          endLine = i - 1;
          break;
        }
      }
    }
    
    // Extract and write chapter
    const chapterLines = lines.slice(startLine, endLine + 1);
    const outputPath = path.join(OUTPUT_DIR, chapter.name + '.txt');
    fs.writeFileSync(outputPath, chapterLines.join('\n'), 'utf-8');
    
    console.log('Created ' + chapter.name + '.txt: ' + chapterLines.length + ' lines');
  }
  
  console.log('\nYear-based split complete.');
}

// Run if called directly
if (require.main === module) {
  splitIntoYears();
}
