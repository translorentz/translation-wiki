/**
 * Validation functions for cleaned Zonaras Epitome text
 *
 * Checks for remaining contamination and quality metrics
 */

import { countGreekChars, countLatinChars, greekRatio, hasCombinedSigla } from './patterns';

/**
 * Quality metrics for a paragraph
 */
export interface ParagraphQuality {
  index: number;
  text: string;
  greekCharCount: number;
  latinCharCount: number;
  greekRatio: number;
  length: number;
  issues: string[];
  score: number; // 0-100
}

/**
 * Quality metrics for a chapter
 */
export interface ChapterQuality {
  chapterNumber: number;
  totalParagraphs: number;
  totalCharacters: number;
  averageGreekRatio: number;
  problematicParagraphs: ParagraphQuality[];
  overallScore: number;
  grade: string;
}

/**
 * Check for remaining apparatus contamination
 */
export function checkApparatusContamination(text: string): string[] {
  const issues: string[] = [];

  // Check for sigla patterns
  if (hasCombinedSigla(text)) {
    issues.push('Combined sigla detected');
  }

  // Check for single sigla followed by punctuation (variant reading pattern)
  if (/[\u0370-\u03FF\u1F00-\u1FFF]+\s+[ABCDE][,.]/.test(text)) {
    issues.push('Single sigla with variant pattern');
  }

  // Check for cross-references
  if (/v\.\s+ad\s+[XIVLC]+\s+\d+/i.test(text)) {
    issues.push('Cross-reference detected');
  }
  if (/\b[IVX]+\s+p\.\s+\d+/.test(text)) {
    issues.push('Page reference detected');
  }

  // Check for editorial terms
  if (/\b(om\.|add\.|post|corr\.|falso|constanter)\b/i.test(text)) {
    issues.push('Editorial term detected');
  }

  // Check for manuscript names
  if (/\b(Parisinus|Vindobon|Monac|Wolfii?|Ducang)\b/i.test(text)) {
    issues.push('Manuscript name detected');
  }

  return issues;
}

/**
 * Check for Latin leakage
 */
export function checkLatinLeakage(text: string): string[] {
  const issues: string[] = [];
  const ratio = greekRatio(text);

  // Check ratio
  if (ratio < 0.5 && text.length > 30) {
    issues.push(`Low Greek ratio: ${(ratio * 100).toFixed(1)}%`);
  }

  // Check for common Latin translation indicators
  if (/\b(igitur|enim|autem|vero|itaque|ergo|tamen|neque|quoque|quidem)\b/i.test(text)) {
    issues.push('Latin translation indicator detected');
  }

  // Check for Latin sentences
  if (/\b[A-Z][a-z]+\s+[a-z]+\s+[a-z]+\s+[a-z]+\b/.test(text) && ratio < 0.7) {
    issues.push('Possible Latin sentence');
  }

  return issues;
}

/**
 * Check for page/margin artifacts
 */
export function checkPageArtifacts(text: string): string[] {
  const issues: string[] = [];

  // Page markers
  if (/\bP\s*[IVX]+\s*\d*[A-Z]?\b/.test(text)) {
    issues.push('Page marker (P) detected');
  }
  if (/\bW\s*[IVX]+\s*\d*\b/.test(text)) {
    issues.push('Page marker (W) detected');
  }
  if (/\bD\s*[IVX]+\s*\d*\b/.test(text)) {
    issues.push('Page marker (D) detected');
  }

  // Standalone numbers that look like margin numbers
  if (/\s\d{1,2}\s(?=[A-Z\u0370-\u03FF])/.test(text)) {
    issues.push('Possible margin number');
  }

  return issues;
}

/**
 * Check for fragmentation issues
 */
export function checkFragmentation(text: string): string[] {
  const issues: string[] = [];

  // Very short paragraphs
  if (text.length < 50) {
    issues.push('Very short paragraph');
  }

  // Starts with lowercase Latin (not Greek - Greek lowercase starts are normal)
  if (/^[a-z]/.test(text.trim())) {
    issues.push('Starts with lowercase Latin');
  }

  // Ends mid-word or sentence (but not Greek sentence endings)
  if (/[^.;·\]"'»)\sοςνηιρυωαεὴςόνῆῖρύωὰὲ]$/.test(text.trim())) {
    // More lenient - Greek sentences can end with various letters
    const lastChar = text.trim().slice(-1);
    if (/[A-Za-z]/.test(lastChar) && !/[.;·]/.test(text.trim().slice(-3))) {
      issues.push('Possible incomplete ending');
    }
  }

  // Contains clearly broken patterns (single letter surrounded by spaces)
  if (/\s[ABCDE]\s(?!καὶ|δὲ|τε|μὲν|γὰρ|οὖν)/.test(text)) {
    issues.push('Possible broken text');
  }

  return issues;
}

/**
 * Analyze quality of a single paragraph
 */
export function analyzeParagraph(index: number, text: string): ParagraphQuality {
  const issues: string[] = [];

  // Check for apparatus
  issues.push(...checkApparatusContamination(text));

  // Check for Latin
  issues.push(...checkLatinLeakage(text));

  // Check for artifacts
  issues.push(...checkPageArtifacts(text));

  // Check for fragmentation
  issues.push(...checkFragmentation(text));

  const greekChars = countGreekChars(text);
  const latinChars = countLatinChars(text);
  const ratio = greekRatio(text);

  // Calculate score
  let score = 100;
  score -= issues.length * 10; // -10 per issue
  score -= Math.max(0, (0.8 - ratio) * 50); // Penalize low Greek ratio
  score = Math.max(0, Math.min(100, score));

  return {
    index,
    text,
    greekCharCount: greekChars,
    latinCharCount: latinChars,
    greekRatio: ratio,
    length: text.length,
    issues,
    score,
  };
}

/**
 * Analyze quality of a chapter
 */
export function analyzeChapter(
  chapterNumber: number,
  paragraphs: Array<{ index: number; text: string }>
): ChapterQuality {
  const analyses = paragraphs.map(p => analyzeParagraph(p.index, p.text));

  const totalChars = analyses.reduce((sum, a) => sum + a.length, 0);
  const avgRatio = analyses.length > 0
    ? analyses.reduce((sum, a) => sum + a.greekRatio, 0) / analyses.length
    : 0;

  const problematicParagraphs = analyses.filter(a => a.issues.length > 0 || a.score < 70);
  const avgScore = analyses.length > 0
    ? analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length
    : 0;

  // Calculate overall score
  let overallScore = avgScore;

  // Adjust for problematic paragraph ratio
  const problemRatio = problematicParagraphs.length / analyses.length;
  if (problemRatio > 0.25) {
    overallScore -= 15;
  } else if (problemRatio > 0.15) {
    overallScore -= 10;
  } else if (problemRatio > 0.05) {
    overallScore -= 5;
  }

  // Adjust for average Greek ratio
  if (avgRatio < 0.8) {
    overallScore -= (0.8 - avgRatio) * 30;
  }

  overallScore = Math.max(0, Math.min(100, overallScore));

  // Assign grade
  let grade: string;
  if (overallScore >= 90) grade = 'A';
  else if (overallScore >= 85) grade = 'A-';
  else if (overallScore >= 80) grade = 'B+';
  else if (overallScore >= 75) grade = 'B';
  else if (overallScore >= 70) grade = 'B-';
  else if (overallScore >= 65) grade = 'C+';
  else if (overallScore >= 60) grade = 'C';
  else if (overallScore >= 55) grade = 'C-';
  else if (overallScore >= 50) grade = 'D+';
  else if (overallScore >= 45) grade = 'D';
  else grade = 'F';

  return {
    chapterNumber,
    totalParagraphs: paragraphs.length,
    totalCharacters: totalChars,
    averageGreekRatio: avgRatio,
    problematicParagraphs,
    overallScore,
    grade,
  };
}

/**
 * Generate a quality report
 */
export function generateQualityReport(chapters: ChapterQuality[]): string {
  const lines: string[] = [];

  lines.push('# Epitome Volume 3 Quality Report');
  lines.push('');
  lines.push('## Summary');
  lines.push('');

  const avgScore = chapters.reduce((sum, c) => sum + c.overallScore, 0) / chapters.length;
  const totalParagraphs = chapters.reduce((sum, c) => sum + c.totalParagraphs, 0);
  const totalProblematic = chapters.reduce((sum, c) => sum + c.problematicParagraphs.length, 0);

  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Chapters | ${chapters.length} |`);
  lines.push(`| Total Paragraphs | ${totalParagraphs} |`);
  lines.push(`| Problematic Paragraphs | ${totalProblematic} (${((totalProblematic / totalParagraphs) * 100).toFixed(1)}%) |`);
  lines.push(`| Average Score | ${avgScore.toFixed(1)} |`);
  lines.push(`| Average Grade | ${scoreToGrade(avgScore)} |`);
  lines.push('');

  lines.push('## Chapter Grades');
  lines.push('');
  lines.push('| Chapter | Paragraphs | Problematic | Greek Ratio | Score | Grade |');
  lines.push('|---------|------------|-------------|-------------|-------|-------|');

  for (const chapter of chapters) {
    lines.push(`| Book ${chapter.chapterNumber} | ${chapter.totalParagraphs} | ${chapter.problematicParagraphs.length} | ${(chapter.averageGreekRatio * 100).toFixed(1)}% | ${chapter.overallScore.toFixed(1)} | ${chapter.grade} |`);
  }

  lines.push('');
  lines.push('## Issue Breakdown by Chapter');
  lines.push('');

  for (const chapter of chapters) {
    if (chapter.problematicParagraphs.length === 0) continue;

    lines.push(`### Book ${chapter.chapterNumber}`);
    lines.push('');

    // Group issues
    const issueGroups: Record<string, number> = {};
    for (const para of chapter.problematicParagraphs) {
      for (const issue of para.issues) {
        issueGroups[issue] = (issueGroups[issue] || 0) + 1;
      }
    }

    lines.push('| Issue | Count |');
    lines.push('|-------|-------|');
    for (const [issue, count] of Object.entries(issueGroups).sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${issue} | ${count} |`);
    }
    lines.push('');

    // Sample problematic paragraphs
    lines.push('**Sample Problematic Paragraphs:**');
    lines.push('');
    const samples = chapter.problematicParagraphs.slice(0, 5);
    for (const para of samples) {
      const preview = para.text.length > 100 ? para.text.slice(0, 100) + '...' : para.text;
      lines.push(`- Index ${para.index}: "${preview}"`);
      lines.push(`  - Issues: ${para.issues.join(', ') || 'Low score'}`);
      lines.push(`  - Score: ${para.score.toFixed(0)}, Greek: ${(para.greekRatio * 100).toFixed(1)}%`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function scoreToGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D+';
  if (score >= 45) return 'D';
  return 'F';
}
