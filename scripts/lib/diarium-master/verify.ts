/**
 * Verification script for Diarium Urbis Romae reconciliation
 * 
 * Checks the quality of the reconciled output by looking for remaining artifacts.
 */

import * as fs from 'fs';

const OUTPUT_FILE = 'data/raw/diarium-urbis-romae/diary-full.txt';

interface VerificationResult {
  passed: boolean;
  issues: string[];
  stats: {
    totalLines: number;
    nonBlankLines: number;
    carets: number;
    pipes: number;
    headers: number;
    apparatusPatterns: number;
    yearMarkers: number;
  };
}

/**
 * Check for remaining artifacts
 */
export function verify(): VerificationResult {
  const text = fs.readFileSync(OUTPUT_FILE, 'utf-8');
  const lines = text.split('\n');
  
  const issues: string[] = [];
  
  // Count artifacts
  const carets = (text.match(/\^/g) || []).length;
  const pipes = (text.match(/\|/g) || []).length;
  const headers = (text.match(/DIARIA RERUM ROMANARUM/g) || []).length;
  
  // Check for apparatus patterns
  const apparatusPatterns = [
    /Gregorovius/gi,
    /Lo stesso testo/gi,
    /La stessa legione/gi,
    /è corretta a e\./gi,
    /corretto poi a/gi,
    /inscribitur/gi,
    /postilla di mano/gi,
    /brano tra \*/gi,
    /traduce in italiano/gi,
    /Id\. in R/gi,
  ];
  
  let apparatusCount = 0;
  for (const pattern of apparatusPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      apparatusCount += matches.length;
      issues.push('Found ' + matches.length + ' matches for: ' + pattern.source);
    }
  }
  
  // Count year markers (good - shows diary structure)
  const yearMarkers = (text.match(/Nell'anno\s+\d+|Dell'anno/g) || []).length;
  
  // Check for excessive single carets (likely remaining artifacts)
  if (carets > 10) {
    issues.push('High caret count: ' + carets + ' (should be < 10)');
  }
  
  if (pipes > 5) {
    issues.push('High pipe count: ' + pipes + ' (should be < 5)');
  }
  
  if (headers > 0) {
    issues.push('Page headers remaining: ' + headers);
  }
  
  if (apparatusCount > 5) {
    issues.push('Apparatus vocabulary remaining: ' + apparatusCount + ' instances');
  }
  
  const stats = {
    totalLines: lines.length,
    nonBlankLines: lines.filter(l => l.trim().length > 0).length,
    carets,
    pipes,
    headers,
    apparatusPatterns: apparatusCount,
    yearMarkers,
  };
  
  console.log('=== Verification Results ===');
  console.log('Total lines: ' + stats.totalLines);
  console.log('Non-blank lines: ' + stats.nonBlankLines);
  console.log('Carets remaining: ' + stats.carets);
  console.log('Pipes remaining: ' + stats.pipes);
  console.log('Headers remaining: ' + stats.headers);
  console.log('Apparatus vocabulary: ' + stats.apparatusPatterns);
  console.log('Year markers found: ' + stats.yearMarkers);
  console.log('');
  
  if (issues.length === 0) {
    console.log('PASSED: No significant issues found.');
  } else {
    console.log('ISSUES FOUND:');
    for (const issue of issues) {
      console.log('  - ' + issue);
    }
  }
  
  return {
    passed: issues.length === 0,
    issues,
    stats,
  };
}

// Run if called directly
if (require.main === module) {
  verify();
}
