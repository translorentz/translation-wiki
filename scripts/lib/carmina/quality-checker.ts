/**
 * Quality Checker for Carmina Graeca Medii Aevi.
 *
 * Validates extracted verse output and flags issues for review.
 */

import type { ClassifiedLine, ExtractedVerse, QualityReport } from "./types.js";
import { isGreekLetter } from "./title-finder.js";

/** Pattern: isolated manuscript sigla */
const SIGLA_CHECK = /(?:^|[\s.,;:᾿'()])([ΑΒΜΡΔ])(?:[\s.,;:᾿'()]|$)/;

/** Pattern: leading number remaining after extraction */
const LEADING_NUMBER_CHECK = /^\d{1,4}\s+/;

/**
 * Run quality checks on extracted verse.
 */
export function checkQuality(
  verse: ExtractedVerse,
  classified: ClassifiedLine[]
): QualityReport {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Count classifications
  let verseCount = 0;
  let apparatusCount = 0;
  let noiseCount = 0;
  let emptyCount = 0;
  let introCount = 0;

  for (const line of classified) {
    switch (line.category) {
      case "verse":
      case "verse_numbered":
        verseCount++;
        break;
      case "apparatus":
        apparatusCount++;
        break;
      case "noise":
        noiseCount++;
        break;
      case "empty":
        emptyCount++;
        break;
      case "introduction":
        introCount++;
        break;
    }
  }

  // Collect all verse lines from paragraphs
  const allVerseLines: string[] = [];
  for (const para of verse.paragraphs) {
    const lines = para.text.split("\n");
    allVerseLines.push(...lines);
  }

  // Compute line length stats
  const lengths = allVerseLines.map((l) => l.length);
  const avgLength = lengths.length > 0 ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
  const minLength = lengths.length > 0 ? Math.min(...lengths) : 0;
  const maxLength = lengths.length > 0 ? Math.max(...lengths) : 0;

  // Compute Greek character percentage across all verse
  const allText = allVerseLines.join(" ");
  let greekCount = 0;
  let totalAlpha = 0;
  for (const char of allText) {
    if (isGreekLetter(char)) {
      greekCount++;
      totalAlpha++;
    } else if (/[a-zA-Z]/.test(char)) {
      totalAlpha++;
    }
  }
  const greekPercent = totalAlpha > 0 ? greekCount / totalAlpha : 0;

  // Check for sigla contamination
  const siglaContamination: string[] = [];
  for (const line of allVerseLines) {
    if (SIGLA_CHECK.test(` ${line} `)) {
      siglaContamination.push(line.substring(0, 80));
    }
  }

  // Check for remaining leading numbers
  const leadingNumbers: string[] = [];
  for (const line of allVerseLines) {
    if (LEADING_NUMBER_CHECK.test(line)) {
      leadingNumbers.push(line.substring(0, 80));
    }
  }

  // Thresholds
  if (allVerseLines.length < 10) {
    errors.push(`Verse count too low: ${allVerseLines.length} (FAIL threshold: <10)`);
  }
  if (allVerseLines.length < 30) {
    warnings.push(`Low verse count: ${allVerseLines.length}`);
  }
  if (allVerseLines.length > 800) {
    warnings.push(`High verse count: ${allVerseLines.length}`);
  }
  if (avgLength < 20 && allVerseLines.length > 0) {
    errors.push(`Average line length too short: ${avgLength.toFixed(1)} chars (FAIL threshold: <20)`);
  }
  if (avgLength < 30 && allVerseLines.length > 0) {
    warnings.push(`Short average line length: ${avgLength.toFixed(1)} chars`);
  }
  if (siglaContamination.length > 0) {
    warnings.push(`Sigla contamination: ${siglaContamination.length} lines with isolated Α/Β/Μ/Ρ/Δ`);
  }
  if (leadingNumbers.length > 0) {
    warnings.push(`${leadingNumbers.length} lines still have leading numbers after extraction`);
  }
  if (greekPercent < 0.79 && allVerseLines.length > 0) {
    warnings.push(`Low Greek character percentage: ${(greekPercent * 100).toFixed(1)}%`);
  }
  if (verse.paragraphs.length < 3 && allVerseLines.length > 30) {
    warnings.push(`Very few paragraphs: ${verse.paragraphs.length}`);
  }

  const totalNonEmpty = verseCount + apparatusCount + noiseCount + introCount;
  if (totalNonEmpty > 0 && (noiseCount + apparatusCount) / totalNonEmpty > 0.7) {
    errors.push(`>70% of content is noise+apparatus (${((noiseCount + apparatusCount) / totalNonEmpty * 100).toFixed(1)}%)`);
  }

  // Determine status
  let status: "PASS" | "WARN" | "FAIL" = "PASS";
  if (warnings.length > 0) status = "WARN";
  if (errors.length > 0) status = "FAIL";

  return {
    chapterNumber: verse.chapterNumber,
    title: verse.title,
    verseLineCount: allVerseLines.length,
    apparatusLineCount: apparatusCount,
    noiseLineCount: noiseCount,
    emptyLineCount: emptyCount,
    introductionLineCount: introCount,
    paragraphCount: verse.paragraphs.length,
    avgLineLength: Math.round(avgLength * 10) / 10,
    minLineLength: minLength,
    maxLineLength: maxLength,
    greekCharPercent: Math.round(greekPercent * 1000) / 10,
    siglaContamination: siglaContamination.slice(0, 10), // limit to 10 examples
    leadingNumbersRemaining: leadingNumbers.slice(0, 10),
    status,
    warnings,
    errors,
  };
}
