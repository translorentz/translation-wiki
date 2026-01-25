/**
 * Master reconciliation script for Diarium Urbis Romae
 * 
 * Takes Agent A's output as base and applies cleanup patterns to produce
 * the final clean text. Cross-references Agent B for specific word corrections.
 */

import * as fs from 'fs';
import * as path from 'path';
import { applyAllCleanups } from './cleanup-patterns';

const AGENT_A_DIR = 'data/difficult_extra_processing/diarium_urbis_romae/clean_copy_a';
const AGENT_B_DIR = 'data/difficult_extra_processing/diarium_urbis_romae/clean_copy_b';
const OUTPUT_DIR = 'data/raw/diarium-urbis-romae';

interface ReconciliationStats {
  originalLines: number;
  cleanedLines: number;
  removedLines: number;
  caretCount: number;
  pipeCount: number;
  headerCount: number;
}

/**
 * Known word corrections from cross-referencing Agent B
 * Format: [incorrect, correct]
 */
const WORD_CORRECTIONS: [RegExp, string][] = [
  // From Bridge Reviewer examples
  [/\bdissali\b/g, 'disseli'],       // Agent B correct: "e disseli"
  [/\bi\^\s+settembre\b/gi, '16 settembre'],  // Agent A garbled date
  
  // Common OCR corrections (both scans agree on correct reading)
  [/\bcoUeio\b/g, 'colleio'],
  [/\bcoUegio\b/g, 'collegio'],
  
  // Hyphenation joins that may be broken
  [/im\s*-\s*prennare/g, 'imprennare'],
];

/**
 * Lines to completely remove (apparatus leaks identified by pattern)
 */
const LINE_REMOVAL_PATTERNS: RegExp[] = [
  // Apparatus lines that start with scholarly content
  /^\s*\([a-z]\)\s*Cf\./i,
  /^\s*Gregorovius/i,
  /^\s*traduce in italiano/,
  /^\s*inscribitur Diarum/,
  /^\s*postilla di mano del/,
  /^\s*annotazione di mano/,
  /^\s*brano tra \* manca/,
  /^\s*Conti, Hist\. suor/,
  /^\s*I Conti, Hist/,
  /^\s*E a c\. \d+ incomincia/,
  /^\s*E più oltre nel marg/,
  /^\s*d'altra mano:/,
  /^\s*Il brano che segue/,
  /^\s*cosi sta nel d° cod/,
  /^\s*annota in margine/,
  /^\s*si rimanda.*al ms\./,
  /^\s*segue immediatamente:/,
  
  // Latin apparatus titles/headings that leaked
  /^phani Infessurae de bello/,
  /^dum regem Neapolis liber/,
  
  // Garbled footnote blocks
  /^ccetiam usqu/,
  /^vocati Angelici/,
  /^cantis se Federicum/,
  
  // Witness references at line start
  /^\s*[CEMS][12\^]+\s+(?:traduce|scrive|aggiunge)/,
  
  // OCR-merged apparatus lines (end of diary specific)
  /inscribitur Diarum de Sebastiano/,
  /marg\. estemo/,
  /marg\. esterno/,
  /ripiglia gli avvenimenti da Branca/,
  /Il brano che segue trovasi/,
  /annotaiione di mano recente/,
  /annotazione di mano recente/,
  /^\d+\s+\[l\d+\]/,  // Lines like "26 [l494]"
  /^Recordome io Sebastiano.*decembre 1495/,  // Next diary (Branca de' Talini) starts here
  /In è aggiunto il seguente brano/,
  /C è aggiunto il seguente brano/,
  /come seguita nel testo/,
  /teggiata piuttosto a narrazione/,
  /l'un diarista che all'altro/,
  /suade a negarla all'I\./,
  /tempo di poco anteriore/,
  /sto latino: ripiglia/,
  /fantulo in brachiis/,
  /regni Neapolitani rebus ut videre est/,
  /parole, al ms\..*segue immediatamente/,
  
  // Colophon lines from end of manuscript
  /e li fu predetto il pontificato/,
  /da s\. Francesco di\s*$/,
  /Paola, chiamato in quel tempo/,
  /et egli si chiamò Giulio/,
  /quale hebbe finalmente in$/,
  
  // Additional apparatus patterns found in middle sections
  /^2 e che, da che nacque/,
  /^26 \[l494\]/,
  /Lo stesso testo, corretto/,
  /La stessa legione in/,
  /Tutto il resto sino/,
  /Manca, seguendo l'antica/,
  /è soppresso$/,
  /è corretta a e\./,
  /nel quale invece si legge/,
  /corretto poi a e\./,
  /come vicecamerario/,
  /dai Registri del/,
  /nell'Arch\. di Stato/,
  /si legge a suo luogo/,
  /ma è aggiunto in un richiamo/,
  /ne fanno cenno/,
  /si accenna alla/,
  /In C M questo passaggio/,
  /^\s*Roma, p\. \d+/,
  /^\s*Tarazona.*Cf\./,
  /questo passaggio si legge in tal modo/,
  /Orsino.*le ha mandate alla Mentana Tutto/,
  /supplito con aggiunte/,
  /defendevano con molto valore.*Lo stesso testo/,
  /a faoco.*Agabbito/,
  /mr\. Ginolfo.*La stessa legione/,
  /assai feriti Id\. in/,
  /^mr\. Ginolfo/,
  /^a faoco/,
];

/**
 * Count occurrences of patterns for statistics
 */
function countPatterns(text: string): { carets: number; pipes: number; headers: number } {
  const carets = (text.match(/\^\^/g) || []).length;
  const pipes = (text.match(/\|/g) || []).length;
  const headers = (text.match(/DIARIA RERUM ROMANARUM/g) || []).length;
  return { carets, pipes, headers };
}

/**
 * Apply word corrections based on cross-reference
 */
function applyWordCorrections(text: string): string {
  let result = text;
  for (const [pattern, replacement] of WORD_CORRECTIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Remove entire lines that match apparatus patterns
 */
function removeApparatusLines(text: string): string {
  const lines = text.split('\n');
  const filtered = lines.filter(line => {
    for (const pattern of LINE_REMOVAL_PATTERNS) {
      if (pattern.test(line)) {
        return false;
      }
    }
    return true;
  });
  return filtered.join('\n');
}

/**
 * Clean OCR-merged apparatus from the end of lines
 * These are cases where diary text and apparatus share the same line
 */
function cleanMergedApparatus(text: string): string {
  // Pattern: diary text followed by apparatus content on same line
  const mergedPatterns: [RegExp, string][] = [
    // Folio references inline
    [/\s*c\. \d+\s*[AB]\s*/g, ' '],
    
    // Apparatus fragments with slashes
    [/\s*\/\/\s*brano tra.*$/gm, ''],
    
    // Manuscript sigla inline
    [/\s+n\. iii S rimanda.*$/gm, ''],
    [/\s+n\. 111 sg\.\s*.*$/gm, ''],
    
    // Editor names and page references inline
    [/\s+ii Conti, Hist\. suor.*$/gm, ''],
    
    // Remove trailing apparatus markers
    [/\s*\^\d+\s*$/gm, ''],
    
    // Clean up remaining OCR garbage at line ends
    [/\s*°\\$/gm, ''],
    [/\s*\*\"$/gm, ''],
    
    // Remove appended apparatus blocks after diary text
    [/\s+Id\. in R, corretto poi.*$/gm, ''],
    [/\s+La stessa legione.*$/gm, ''],
    [/\s+Lo stesso testo.*$/gm, ''],
  ];
  
  let result = text;
  for (const [pattern, replacement] of mergedPatterns) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Main reconciliation function
 */
export function reconcile(inputPath: string, outputPath: string, verbose = true): ReconciliationStats {
  const inputText = fs.readFileSync(inputPath, 'utf-8');
  const originalLines = inputText.split('\n').length;
  
  // Count artifacts before cleanup
  const beforeCounts = countPatterns(inputText);
  
  if (verbose) {
    console.log('Input: ' + inputPath);
    console.log('Original lines: ' + originalLines);
    console.log('Before cleanup: ' + beforeCounts.carets + ' carets, ' + beforeCounts.pipes + ' pipes, ' + beforeCounts.headers + ' headers');
  }
  
  // Step 1: Remove apparatus lines
  let text = removeApparatusLines(inputText);
  
  // Step 2: Apply all cleanup patterns
  text = applyAllCleanups(text, verbose);
  
  // Step 3: Clean merged apparatus
  text = cleanMergedApparatus(text);
  
  // Step 4: Apply word corrections
  text = applyWordCorrections(text);
  
  // Step 5: Final whitespace normalization
  text = text
    .replace(/  +/g, ' ')           // Multiple spaces
    .replace(/\n{3,}/g, '\n\n')     // Multiple blank lines
    .replace(/ +$/gm, '')           // Trailing spaces
    .trim();
  
  const cleanedLines = text.split('\n').length;
  const afterCounts = countPatterns(text);
  
  if (verbose) {
    console.log('After cleanup: ' + afterCounts.carets + ' carets, ' + afterCounts.pipes + ' pipes, ' + afterCounts.headers + ' headers');
    console.log('Cleaned lines: ' + cleanedLines);
    console.log('Removed lines: ' + (originalLines - cleanedLines));
  }
  
  // Write output
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, text, 'utf-8');
  
  if (verbose) {
    console.log('Output written to: ' + outputPath);
  }
  
  return {
    originalLines,
    cleanedLines,
    removedLines: originalLines - cleanedLines,
    caretCount: afterCounts.carets,
    pipeCount: afterCounts.pipes,
    headerCount: afterCounts.headers,
  };
}

/**
 * Process all diary files
 */
export function reconcileAll(): void {
  const files = [
    'diary-full.txt',
    'altro-principio.txt',
  ];
  
  let totalStats = {
    originalLines: 0,
    cleanedLines: 0,
    removedLines: 0,
  };
  
  for (const file of files) {
    const inputPath = path.join(AGENT_A_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);
    
    if (fs.existsSync(inputPath)) {
      console.log('\n=== Processing ' + file + ' ===');
      const stats = reconcile(inputPath, outputPath);
      totalStats.originalLines += stats.originalLines;
      totalStats.cleanedLines += stats.cleanedLines;
      totalStats.removedLines += stats.removedLines;
    }
  }
  
  console.log('\n=== TOTAL ===');
  console.log('Original lines: ' + totalStats.originalLines);
  console.log('Cleaned lines: ' + totalStats.cleanedLines);
  console.log('Removed lines: ' + totalStats.removedLines);
}

// Run if called directly
if (require.main === module) {
  reconcileAll();
}
