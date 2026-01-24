/**
 * Quality Checker for Eustathius Commentary on Homer's Odyssey.
 *
 * Validates extracted commentary output and flags issues for review.
 */

import type { ClassifiedLine, ExtractedCommentary, QualityReport } from "./types.js";
import { greekCharPercent, latinCharPercent } from "./content-classifier.js";

/**
 * Run quality checks on extracted commentary.
 */
export function checkQuality(
  commentary: ExtractedCommentary,
  classified: ClassifiedLine[]
): QualityReport {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Count classifications
  let commentaryCount = 0;
  let headerCount = 0;
  let marginCount = 0;
  let pageNumCount = 0;
  let emptyCount = 0;
  let noiseCount = 0;

  for (const line of classified) {
    switch (line.category) {
      case "commentary":
        commentaryCount++;
        break;
      case "page_header":
        headerCount++;
        break;
      case "margin_number":
        marginCount++;
        break;
      case "page_number":
        pageNumCount++;
        break;
      case "empty":
        emptyCount++;
        break;
      case "noise":
        noiseCount++;
        break;
    }
  }

  // Compute paragraph stats
  const paragraphTexts = commentary.paragraphs.map((p) => p.text);
  const totalChars = paragraphTexts.reduce((sum, t) => sum + t.length, 0);
  const avgParagraphLength = paragraphTexts.length > 0
    ? totalChars / paragraphTexts.length
    : 0;

  // Compute Greek character percentage across all commentary
  const allText = paragraphTexts.join(" ");
  const gPercent = greekCharPercent(allText);
  const lPercent = latinCharPercent(allText);

  // Quality thresholds
  const isPreface = commentary.chapterNumber === 0;

  if (commentary.paragraphs.length === 0) {
    errors.push("No paragraphs extracted");
  }

  if (commentary.paragraphs.length < 3 && commentary.chapterNumber !== 0) {
    errors.push(`Very few paragraphs: ${commentary.paragraphs.length}`);
  }

  if (totalChars < 1000 && commentary.chapterNumber !== 0) {
    warnings.push(`Low total character count: ${totalChars}`);
  }

  if (!isPreface && gPercent < 0.6) {
    warnings.push(`Low Greek character percentage: ${(gPercent * 100).toFixed(1)}%`);
  }

  if (isPreface && lPercent < 0.3 && gPercent < 0.5) {
    warnings.push(`Preface has low Latin/Greek content: Latin=${(lPercent * 100).toFixed(1)}%, Greek=${(gPercent * 100).toFixed(1)}%`);
  }

  // Check for very short paragraphs (likely noise that leaked through)
  const shortParas = paragraphTexts.filter((t) => t.length < 20);
  if (shortParas.length > 0) {
    warnings.push(`${shortParas.length} paragraphs under 20 chars (possible noise)`);
  }

  // Check for remaining page/margin numbers in output
  const numbersInOutput = paragraphTexts.filter((t) => /^\d{3,4}\s/.test(t) || /\s\d{3,4}$/.test(t));
  if (numbersInOutput.length > 0) {
    warnings.push(`${numbersInOutput.length} paragraphs still contain page numbers`);
  }

  // Count remaining Arabic digits in output (should be minimal in Greek commentary)
  let digitCount = 0;
  for (const t of paragraphTexts) {
    for (const char of t) {
      if (char >= "0" && char <= "9") digitCount++;
    }
  }
  if (digitCount > 10) {
    warnings.push(`${digitCount} Arabic digit characters remain in output`);
  }

  // Check for remaining verse references "(Vers..." in output
  const versRefsRemaining = paragraphTexts.filter((t) => /\([VWνΝ][eοo][rv]/i.test(t));
  if (versRefsRemaining.length > 0) {
    warnings.push(`${versRefsRemaining.length} paragraphs still contain verse references`);
  }

  // Check commentary percentage of total lines
  const totalNonEmpty = commentaryCount + headerCount + marginCount + pageNumCount + noiseCount;
  if (totalNonEmpty > 0) {
    const commentaryPercent = commentaryCount / totalNonEmpty;
    if (commentaryPercent < 0.5) {
      warnings.push(`Low commentary percentage: ${(commentaryPercent * 100).toFixed(1)}% of non-empty lines`);
    }
  }

  // Noise percentage check
  if (totalNonEmpty > 0 && noiseCount / totalNonEmpty > 0.3) {
    warnings.push(`High noise percentage: ${((noiseCount / totalNonEmpty) * 100).toFixed(1)}%`);
  }

  // Determine status
  let status: "PASS" | "WARN" | "FAIL" = "PASS";
  if (warnings.length > 0) status = "WARN";
  if (errors.length > 0) status = "FAIL";

  return {
    chapterNumber: commentary.chapterNumber,
    title: commentary.title,
    totalRawLines: classified.length,
    commentaryLineCount: commentaryCount,
    headerLineCount: headerCount,
    marginNumberCount: marginCount,
    pageNumberCount: pageNumCount,
    emptyLineCount: emptyCount,
    noiseLineCount: noiseCount,
    paragraphCount: commentary.paragraphs.length,
    avgParagraphLength: Math.round(avgParagraphLength),
    totalCharacters: totalChars,
    greekCharPercent: Math.round(gPercent * 1000) / 10,
    digitCount,
    status,
    warnings,
    errors,
  };
}
