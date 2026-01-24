/**
 * Validator for parsed Greek text chapters.
 * Checks for common issues: empty content, apparatus contamination,
 * low Greek character ratio, missing text, etc.
 */

import type { ParsedChapter, ChapterQualityReport } from './types';
import { getGreekCharPercent, hasApparatusRemnants } from './text-extractor';

/**
 * Validate a single parsed chapter and produce a quality report.
 */
export function validateChapter(chapter: ParsedChapter): ChapterQualityReport {
  const paragraphs = chapter.sourceContent.paragraphs;
  const issues: string[] = [];

  // Compute statistics
  const paragraphCount = paragraphs.length;
  const totalCharacters = paragraphs.reduce((sum, p) => sum + p.text.length, 0);
  const paragraphLengths = paragraphs.map(p => p.text.length);
  const averageParagraphLength = paragraphCount > 0 ? totalCharacters / paragraphCount : 0;
  const shortestParagraph = paragraphCount > 0 ? Math.min(...paragraphLengths) : 0;
  const longestParagraph = paragraphCount > 0 ? Math.max(...paragraphLengths) : 0;
  const emptyParagraphs = paragraphs.filter(p => p.text.trim().length === 0).length;

  // Check Greek character percentage (across all paragraphs)
  const allText = paragraphs.map(p => p.text).join(' ');
  const greekCharPercent = getGreekCharPercent(allText);

  // Check for non-Greek content (apparatus remnants)
  let hasNonGreekContent = false;
  for (const p of paragraphs) {
    if (hasApparatusRemnants(p.text)) {
      hasNonGreekContent = true;
      issues.push(`Paragraph ${p.index}: possible apparatus remnants detected`);
    }
  }

  // Quality checks
  if (paragraphCount === 0) {
    issues.push('No paragraphs found');
  }

  if (totalCharacters === 0) {
    issues.push('No text content');
  }

  if (totalCharacters > 0 && greekCharPercent < 50) {
    issues.push(`Low Greek character ratio: ${greekCharPercent.toFixed(1)}%`);
  }

  if (emptyParagraphs > 0) {
    issues.push(`${emptyParagraphs} empty paragraph(s)`);
  }

  if (shortestParagraph > 0 && shortestParagraph < 10) {
    issues.push(`Very short paragraph detected (${shortestParagraph} chars)`);
  }

  // Check for very long paragraphs that might indicate mis-parsing
  if (longestParagraph > 10000) {
    issues.push(`Very long paragraph detected (${longestParagraph} chars)`);
  }

  // Determine overall status
  let status: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
  if (paragraphCount === 0 || totalCharacters === 0) {
    status = 'FAIL';
  } else if (greekCharPercent < 50 || hasNonGreekContent || emptyParagraphs > 0) {
    status = 'WARN';
  } else if (issues.length > 0) {
    status = 'WARN';
  }

  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    paragraphCount,
    totalCharacters,
    averageParagraphLength: Math.round(averageParagraphLength),
    shortestParagraph,
    longestParagraph,
    emptyParagraphs,
    greekCharPercent: Math.round(greekCharPercent * 10) / 10,
    hasNonGreekContent,
    issues,
    status,
  };
}

/**
 * Validate all chapters and produce a summary.
 */
export function validateAllChapters(chapters: ParsedChapter[]): {
  reports: ChapterQualityReport[];
  summary: {
    totalChapters: number;
    totalParagraphs: number;
    totalCharacters: number;
    passCount: number;
    warnCount: number;
    failCount: number;
  };
} {
  const reports = chapters.map(validateChapter);

  const summary = {
    totalChapters: chapters.length,
    totalParagraphs: chapters.reduce(
      (sum, ch) => sum + ch.sourceContent.paragraphs.length, 0
    ),
    totalCharacters: reports.reduce((sum, r) => sum + r.totalCharacters, 0),
    passCount: reports.filter(r => r.status === 'PASS').length,
    warnCount: reports.filter(r => r.status === 'WARN').length,
    failCount: reports.filter(r => r.status === 'FAIL').length,
  };

  return { reports, summary };
}

/**
 * Print a formatted validation report to console.
 */
export function printValidationReport(
  reports: ChapterQualityReport[],
  summary: { totalChapters: number; totalParagraphs: number; totalCharacters: number; passCount: number; warnCount: number; failCount: number }
): void {
  console.log('\n=== Validation Report ===\n');
  console.log(`Total chapters: ${summary.totalChapters}`);
  console.log(`Total paragraphs: ${summary.totalParagraphs}`);
  console.log(`Total characters: ${summary.totalCharacters.toLocaleString()}`);
  console.log(`PASS: ${summary.passCount} | WARN: ${summary.warnCount} | FAIL: ${summary.failCount}\n`);

  // Print details for non-passing chapters
  const problemChapters = reports.filter(r => r.status !== 'PASS');
  if (problemChapters.length > 0) {
    console.log('Issues found:\n');
    for (const r of problemChapters) {
      console.log(`  [${r.status}] Chapter ${r.chapterNumber}: ${r.title}`);
      for (const issue of r.issues) {
        console.log(`    - ${issue}`);
      }
    }
  }

  // Print sample of first few chapters
  console.log('\nFirst 3 chapters (sample):');
  for (const r of reports.slice(0, 3)) {
    console.log(`  Ch${r.chapterNumber} "${r.title}": ${r.paragraphCount} paragraphs, ${r.totalCharacters} chars, ${r.greekCharPercent}% Greek [${r.status}]`);
  }
}
