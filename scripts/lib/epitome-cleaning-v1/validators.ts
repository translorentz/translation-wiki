/**
 * Validators for verifying Greek text quality after cleaning
 */

import { GREEK_WORD_PATTERN, LATIN_WORD_PATTERN, OCR_SUBSTITUTION_WORDS } from './patterns.js';
import { getLatinRatio } from './filters.js';

/**
 * Validation result for a chapter
 */
export interface ChapterValidation {
  chapterNumber: number;
  totalParagraphs: number;
  cleanParagraphs: number;
  removedParagraphs: number;
  averageGreekRatio: number;
  maxLatinRatio: number;
  contaminations: {
    fontes: number;
    apparatus: number;
    highLatinRatio: number;
  };
  issues: string[];
  passed: boolean;
}

/**
 * Validation result for a paragraph
 */
export interface ParagraphValidation {
  index: number;
  greekWordCount: number;
  latinWordCount: number;
  greekRatio: number;
  latinRatio: number;
  length: number;
  issues: string[];
  passed: boolean;
}

/**
 * Validate a single paragraph
 */
export function validateParagraph(
  text: string,
  index: number
): ParagraphValidation {
  const greekWords = text.match(GREEK_WORD_PATTERN) || [];
  const allLatinWords = text.match(LATIN_WORD_PATTERN) || [];
  // Filter out known OCR substitution words that aren't true Latin
  const latinWords = allLatinWords.filter(w => !OCR_SUBSTITUTION_WORDS.has(w));
  const totalWords = greekWords.length + latinWords.length;

  const greekRatio = totalWords > 0 ? greekWords.length / totalWords : 1;
  const latinRatio = totalWords > 0 ? latinWords.length / totalWords : 0;

  const issues: string[] = [];

  // Check for high Latin ratio (>5% is concerning for apparatus, but allow OCR errors)
  if (latinRatio > 0.05) {
    issues.push(`High Latin ratio: ${(latinRatio * 100).toFixed(1)}%`);
  }

  // Check for very short paragraphs
  if (text.trim().length < 20 && totalWords < 3) {
    issues.push('Very short paragraph');
  }

  // Check for empty or whitespace-only
  if (text.trim().length === 0) {
    issues.push('Empty paragraph');
  }

  // For B+ grade: passed if no severe issues
  // - latinRatio <= 5% (allow for OCR errors)
  // - no empty or very short paragraphs
  const severIssues = issues.filter(i =>
    i.includes('Empty') || i.includes('Very short')
  );

  return {
    index,
    greekWordCount: greekWords.length,
    latinWordCount: latinWords.length,
    greekRatio,
    latinRatio,
    length: text.length,
    issues,
    passed: severIssues.length === 0 && latinRatio <= 0.05,
  };
}

/**
 * Validate an entire chapter
 */
export function validateChapter(
  paragraphs: Array<{ index: number; text: string }>,
  chapterNumber: number,
  removedCount: number = 0,
  contaminations = { fontes: 0, apparatus: 0, highLatinRatio: 0 }
): ChapterValidation {
  const validations = paragraphs.map(p => validateParagraph(p.text, p.index));

  const totalGreekRatio =
    validations.reduce((sum, v) => sum + v.greekRatio, 0) / validations.length;
  const maxLatinRatio = Math.max(...validations.map(v => v.latinRatio), 0);

  const issues: string[] = [];

  // Check overall Greek ratio (should be >98%)
  if (totalGreekRatio < 0.98) {
    issues.push(
      `Low overall Greek ratio: ${(totalGreekRatio * 100).toFixed(1)}%`
    );
  }

  // Check max Latin ratio (threshold at 10% for B+ - allows for OCR errors)
  if (maxLatinRatio > 0.10) {
    issues.push(
      `Paragraph with high Latin: ${(maxLatinRatio * 100).toFixed(1)}%`
    );
  }

  // Check for too many failed paragraphs (>5% Latin threshold)
  // For B+ grade: allow up to 10% of paragraphs to have issues
  const failedCount = validations.filter(v => !v.passed).length;
  if (failedCount > paragraphs.length * 0.10) {
    issues.push(`Too many problematic paragraphs: ${failedCount}`);
  }

  return {
    chapterNumber,
    totalParagraphs: paragraphs.length + removedCount,
    cleanParagraphs: paragraphs.length,
    removedParagraphs: removedCount,
    averageGreekRatio: totalGreekRatio,
    maxLatinRatio,
    contaminations,
    issues,
    passed: issues.length === 0,
  };
}

/**
 * Generate a quality report for multiple chapters
 */
export function generateQualityReport(
  validations: ChapterValidation[]
): string {
  const lines: string[] = [];

  lines.push('# Epitome of Histories Vol. 1 Quality Report');
  lines.push('');

  // Summary statistics
  const totalOriginal = validations.reduce(
    (sum, v) => sum + v.totalParagraphs,
    0
  );
  const totalClean = validations.reduce((sum, v) => sum + v.cleanParagraphs, 0);
  const totalRemoved = validations.reduce(
    (sum, v) => sum + v.removedParagraphs,
    0
  );
  const avgGreekRatio =
    validations.reduce((sum, v) => sum + v.averageGreekRatio, 0) /
    validations.length;

  const totalFontes = validations.reduce(
    (sum, v) => sum + v.contaminations.fontes,
    0
  );
  const totalApparatus = validations.reduce(
    (sum, v) => sum + v.contaminations.apparatus,
    0
  );

  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Chapters processed**: ${validations.length}`);
  lines.push(`- **Original paragraphs**: ${totalOriginal}`);
  lines.push(`- **Clean paragraphs**: ${totalClean}`);
  lines.push(
    `- **Removed paragraphs**: ${totalRemoved} (${((totalRemoved / totalOriginal) * 100).toFixed(1)}%)`
  );
  lines.push(`- **Average Greek ratio**: ${(avgGreekRatio * 100).toFixed(1)}%`);
  lines.push('');

  lines.push('## Contamination Removed');
  lines.push('');
  lines.push(`- FONTES citations: ${totalFontes}`);
  lines.push(`- Apparatus notes: ${totalApparatus}`);
  lines.push('');

  // Per-chapter details
  lines.push('## Chapter Details');
  lines.push('');

  for (const v of validations) {
    const status = v.passed ? 'PASS' : 'NEEDS REVIEW';
    lines.push(
      `### Chapter ${v.chapterNumber} [${status}]`
    );
    lines.push(
      `- Paragraphs: ${v.cleanParagraphs} (removed ${v.removedParagraphs})`
    );
    lines.push(`- Greek ratio: ${(v.averageGreekRatio * 100).toFixed(1)}%`);
    if (v.maxLatinRatio > 0.01) {
      lines.push(`- Max Latin ratio: ${(v.maxLatinRatio * 100).toFixed(1)}%`);
    }
    if (v.issues.length > 0) {
      lines.push('- Issues:');
      for (const issue of v.issues) {
        lines.push(`  - ${issue}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
