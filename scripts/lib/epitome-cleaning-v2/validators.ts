/**
 * Validation functions for cleaned Epitome text
 */

export interface ValidationResult {
  valid: boolean;
  greekRatio: number;
  latinRatio: number;
  apparatusIndicators: number;
  fontesFound: boolean;
  warnings: string[];
  score: number; // 0-100
}

/**
 * Calculate the ratio of Greek characters in text
 */
export function calculateGreekRatio(text: string): number {
  const greekChars = (text.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  const total = greekChars + latinChars;

  if (total === 0) return 0;
  return greekChars / total;
}

/**
 * Count apparatus indicators in text
 */
export function countApparatusIndicators(text: string): number {
  let count = 0;

  // Manuscript sigla - only count if isolated (not part of a Greek word)
  // Pattern: space + sigla + period/space (not part of a word)
  const siglaMatches = text.match(/\s[ABCPW]{2,}[.\s]/g) || [];
  count += siglaMatches.length;

  // Greek letter sigla
  const greekSiglaMatches = text.match(/\s[ΑΒΓΔ]{2,}[.\s]/g) || [];
  count += greekSiglaMatches.length;

  // Editor names
  const editorNames = [
    "Ducangius",
    "Ducangei",
    "Plutarchus",
    "Phatarchus",
    "Reimar",
    "Tzetzes",
    "Dionysii",
    "Halicarnassensis",
    "Livius",
    "CANGIUS",
    "Ducaxervs",
  ];
  for (const name of editorNames) {
    if (text.toLowerCase().includes(name.toLowerCase())) {
      count++;
    }
  }

  // Apparatus phrases
  const phrases = ["om A", "add A", "sic libri", "vulgo", "qui mox", "codices"];
  for (const phrase of phrases) {
    if (text.toLowerCase().includes(phrase.toLowerCase())) {
      count++;
    }
  }

  return count;
}

/**
 * Check for FONTES citations
 */
export function hasFontes(text: string): boolean {
  return /F[Oo][NnWw][Tt][Ee][Ss]\.?\s*Cap\./i.test(text);
}

/**
 * Detect remaining Latin contamination
 * More careful to not flag Greek text that contains Latin-looking sequences
 * Note: j/w characters are often OCR artifacts, not true Latin contamination
 */
export function countLatinIndicators(text: string): number {
  let count = 0;

  // Latin-only characters in Latin word contexts
  // Only count if they appear in what looks like a Latin word (surrounded by Latin letters)
  const latinWordPattern = /[a-zA-Z]*[jJwW][a-zA-Z]+/g;
  const latinWordMatches = text.match(latinWordPattern) || [];
  count += latinWordMatches.length;

  // Long Latin words (reliable indicators)
  const longLatinWords = [
    "quod",
    "autem",
    "igitur",
    "enim",
    "tamen",
    "quidem",
    "itaque",
    "deinde",
    "postea",
    "antea",
    "propterea",
  ];

  for (const word of longLatinWords) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const matches = text.match(regex) || [];
    count += matches.length * 2;
  }

  // Latin phrases (very reliable indicators)
  const latinPhrases = [
    /\bqui\s+et\b/gi,
    /\bquod\s+est\b/gi,
    /\bin\s+quo\b/gi,
    /\bad\s+quem\b/gi,
    /\bet\s+cetera\b/gi,
    /\bex\s+quo\b/gi,
  ];

  for (const phrase of latinPhrases) {
    const matches = text.match(phrase) || [];
    count += matches.length * 3;
  }

  return count;
}

/**
 * Validate a single paragraph
 */
export function validateParagraph(text: string): ValidationResult {
  const warnings: string[] = [];

  const greekRatio = calculateGreekRatio(text);
  const apparatusIndicators = countApparatusIndicators(text);
  const fontesFound = hasFontes(text);
  const latinIndicators = countLatinIndicators(text);

  // Calculate score
  let score = 100;

  // Penalize low Greek ratio - but only if significantly low
  if (greekRatio < 0.85) {
    score -= (0.85 - greekRatio) * 100;
    warnings.push(`Low Greek ratio: ${(greekRatio * 100).toFixed(1)}%`);
  } else if (greekRatio < 0.95) {
    // Small penalty for slightly low ratio
    score -= (0.95 - greekRatio) * 20;
  }

  // Penalize apparatus contamination - but less harshly
  if (apparatusIndicators > 2) {
    score -= (apparatusIndicators - 2) * 3;
    warnings.push(`Apparatus indicators: ${apparatusIndicators}`);
  }

  // Major penalty for FONTES
  if (fontesFound) {
    score -= 30;
    warnings.push("FONTES citation found");
  }

  // Penalize Latin contamination - only if significant
  if (latinIndicators > 5) {
    score -= (latinIndicators - 5);
    warnings.push(`Latin indicators: ${latinIndicators}`);
  }

  const latinRatio = 1 - greekRatio;

  return {
    valid: score >= 70,
    greekRatio,
    latinRatio,
    apparatusIndicators,
    fontesFound,
    warnings,
    score: Math.max(0, Math.min(100, score)),
  };
}

/**
 * Validate an entire chapter
 */
export function validateChapter(
  paragraphs: Array<{ index: number; text: string }>
): {
  overall: ValidationResult;
  problemParagraphs: Array<{ index: number; issues: string[] }>;
} {
  const allText = paragraphs.map((p) => p.text).join(" ");
  const overall = validateParagraph(allText);

  const problemParagraphs: Array<{ index: number; issues: string[] }> = [];

  for (const para of paragraphs) {
    const result = validateParagraph(para.text);
    if (!result.valid || result.warnings.length > 0) {
      problemParagraphs.push({
        index: para.index,
        issues: result.warnings,
      });
    }
  }

  return { overall, problemParagraphs };
}

/**
 * Generate a quality report for a chapter
 */
export function generateQualityReport(
  chapterNumber: number,
  paragraphs: Array<{ index: number; text: string }>
): string {
  const { overall, problemParagraphs } = validateChapter(paragraphs);

  let report = `## Chapter ${chapterNumber} Quality Report\n\n`;
  report += `**Overall Score:** ${overall.score.toFixed(1)}/100\n`;
  report += `**Greek Ratio:** ${(overall.greekRatio * 100).toFixed(1)}%\n`;
  report += `**Apparatus Indicators:** ${overall.apparatusIndicators}\n`;
  report += `**FONTES Found:** ${overall.fontesFound ? "YES" : "No"}\n`;
  report += `**Valid:** ${overall.valid ? "YES" : "NO"}\n\n`;

  if (overall.warnings.length > 0) {
    report += `### Warnings\n`;
    for (const warning of overall.warnings) {
      report += `- ${warning}\n`;
    }
    report += "\n";
  }

  if (problemParagraphs.length > 0) {
    report += `### Problem Paragraphs (${problemParagraphs.length})\n`;
    for (const prob of problemParagraphs.slice(0, 10)) {
      // Show first 10
      report += `- Para ${prob.index}: ${prob.issues.join(", ")}\n`;
    }
    if (problemParagraphs.length > 10) {
      report += `- ... and ${problemParagraphs.length - 10} more\n`;
    }
  }

  return report;
}

/**
 * Calculate aggregate statistics for multiple chapters
 */
export function calculateAggregateStats(
  chapters: Array<{
    chapterNumber: number;
    paragraphs: Array<{ index: number; text: string }>;
  }>
): {
  avgGreekRatio: number;
  avgScore: number;
  totalApparatusIndicators: number;
  chaptersWithFontes: number;
  grade: string;
} {
  let totalGreekRatio = 0;
  let totalScore = 0;
  let totalApparatus = 0;
  let fontesCount = 0;

  for (const chapter of chapters) {
    const { overall } = validateChapter(chapter.paragraphs);
    totalGreekRatio += overall.greekRatio;
    totalScore += overall.score;
    totalApparatus += overall.apparatusIndicators;
    if (overall.fontesFound) fontesCount++;
  }

  const n = chapters.length || 1;
  const avgScore = totalScore / n;

  // Determine grade
  let grade: string;
  if (avgScore >= 90) grade = "A";
  else if (avgScore >= 85) grade = "A-";
  else if (avgScore >= 80) grade = "B+";
  else if (avgScore >= 75) grade = "B";
  else if (avgScore >= 70) grade = "B-";
  else if (avgScore >= 65) grade = "C+";
  else if (avgScore >= 60) grade = "C";
  else if (avgScore >= 55) grade = "D+";
  else if (avgScore >= 50) grade = "D";
  else grade = "F";

  return {
    avgGreekRatio: totalGreekRatio / n,
    avgScore,
    totalApparatusIndicators: totalApparatus,
    chaptersWithFontes: fontesCount,
    grade,
  };
}
