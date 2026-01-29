# Semeioseis Gnomikai V3 Evaluation Scratch

## Status: COMPLETE
## Date: 2026-01-29
## Evaluator Grade: B
## Verdict: NOT SATISFIED (borderline)

## Summary

The V3 cleaning made substantial progress on all V2 issues. Latin apparatus contamination is dramatically reduced, asterisk markers in titles are fixed, and unhyphenated broken words are significantly reduced. However, residual contamination remains in multiple categories that collectively exceeds the 5% threshold for B+.

## Methodology

Sampled 18 chapters: 82, 83, 85, 88, 90, 94, 96, 97, 100, 103, 105, 109, 110, 113, 116, 119, plus spot-checks. Read full JSON content of each. Total sampled paragraphs: approximately 60-65.

---

## V2 Issues: Status

### 1. Latin Apparatus Notes: MOSTLY FIXED (was ~12-15%, now ~3-5%)

The vast majority of Latin apparatus contamination has been stripped. The specific V2 examples (Verba, inscripsit, Omisit, dicuntur, Item, postea, pro/dat/et apparatus notes, C. Mon. sigla) are all gone. However, several residual cases remain:

**Ch 105 para 3:** Full apparatus block survives:
`25 σαφ., σαφέστατ 3 μεγίστῳ , 6. μεγίστη. et : καὶ ἀνδρῶν καὶ χρημάτων ταῖς τε πρό τερον μάχαις.`
This contains page numbers (25, 3, 6), abbreviated sigla (σαφ.), and Latin `et`. This is a substantial apparatus block that should have been caught.

**Ch 113 para 4 (last paragraph):** Ends with `: 21 εὐνοίᾳ. μενοι ?`
This is a page reference (21) with a broken word fragment and question mark -- clearly apparatus.

**Ch 119 para 0:** Contains `συμφυροL συνδιατ. ,` -- garbled apparatus with uppercase L (sigla remnant) and abbreviated form.

**Ch 103 para 0:** Contains `οἰκισθεῖσα³)` (apparatus marker 3 with parenthesis) and `Κύθηρα ) :` (dangling parenthesis).

**Ch 103 para 1:** Contains `ἀν7. εκλογο ,` -- numeric artifact with period, likely apparatus page reference embedded in text.

**Ch 100 para 1:** Contains `πάντων.1` -- footnote number embedded in text.

**Estimated rate:** ~5-6 paragraphs out of ~65 sampled = ~8-9%. Extrapolating: ~12 paragraphs out of 144 = ~8%. Above the 5% threshold for B+.

### 2. Unhyphenated Broken Words: SIGNIFICANTLY IMPROVED (was ~60-70%, now ~15-25%)

Many of the obvious short-fragment breaks were fixed by the valid word list approach. Examples like `ψηφί σμασι` and `ἑκά στην` (from V2 Ch 82) are now correctly joined. However, many instances remain, particularly:

- Breaks where both fragments are > 4 characters (not caught by the short-fragment heuristic)
- Breaks where the first fragment happens to end in a valid short word

Examples of remaining breaks:
- Ch 82: `ἀπαλλάτ τειν` (should be ἀπαλλάττειν)
- Ch 83: `βασιλεῦ σινἁρμόζον` (should be βασιλεῦσιν ἁρμόζον -- here "σιν" was fused to next word)
- Ch 83: `ποριστι κὸντῶν` (should be ποριστικὸν τῶν)
- Ch 96: `ἀνθρώ πωνπράγματα` (should be ἀνθρώπων πράγματα -- fused without space)
- Ch 109: `κηρύγματές` (doubled sigma/accent)
- Ch 110: multiple instances of garbled words

**Estimated rate:** ~15-25% of paragraphs still contain at least one broken word. However, the density is much lower than V2 (V2 had 5-15 breaks per paragraph, V3 has 1-3 per affected paragraph).

**Impact on translation:** Moderate. Most of these can be inferred by DeepSeek from context. The fused-word cases (like `πωνπράγματα`) may be more problematic.

### 3. Asterisk Markers in Titles: MOSTLY FIXED (was 13%, now ~3%)

The `*)` and `N )` patterns have been stripped. However:
- Ch 83 title: `ταγὍτι μὴ καθάπαξ ἑαυτὸν δοτέον τῇ...` -- stray `ταγ` prefix contamination (likely OCR artifact from previous line)

### 4. Empty Chapter 118: FIXED
Chapter 118 file has been removed. 37 files remain (82-117, 119-120). Wait -- I count 38 files in the directory listing (82 through 120 minus 118 = 38). The cleaner said 37. This is actually 38 chapters, not 37. Minor discrepancy in the cleaner's self-count.

---

## New Issues Found in V3

### Issue 1: Remaining Apparatus Markers
Several `³)`, `) :`, `?` apparatus markers survive in body text beyond those noted above.

### Issue 2: Garbled/Fused Words
The unhyphenated break fixing sometimes fused words without spaces:
- `βασιλεῦ σινἁρμόζον` → fused "σιν" into next word
- `πωνπράγματα` → two words fused
- `ἐνταῦθα` type fusions

### Issue 3: OCR Noise in Ch 110
Chapter 110 contains significant OCR noise including duplicate characters (e.g., `ρίαις , ρίαις`) and garbled text sequences that appear to be scanning artifacts.

---

## Contamination Summary

| Category | Affected (sampled) | Estimated Rate | V2 Rate |
|----------|-------------------|----------------|---------|
| Latin apparatus notes | ~5-6/65 | ~8% | ~12-15% |
| Unhyphenated broken words | ~12-16/65 | ~20% | ~60-70% |
| Title contamination | ~1/38 | ~3% | 13% |
| OCR noise/artifacts | ~3/65 | ~5% | ~1% |
| Apparatus markers (°, *, digits) | ~3/65 | ~5% | 8% |

**Composite contamination rate** (paragraphs with ANY issue): approximately 20-25 out of 65 sampled = ~30-38%. However, many of these are the unhyphenated broken words which are lower severity.

**Excluding unhyphenated broken words** (which the cleaner argued should be acceptable since DeepSeek can infer): approximately 8-10 out of 65 = ~12-15%.

## Grade Justification: B

The V3 cleaning made real, substantial progress:
- Latin apparatus: 12-15% down to ~8% (significant improvement but still above 5%)
- Unhyphenated breaks: 60-70% down to ~20% (massive improvement)
- Title markers: 13% down to ~3% (well fixed)
- Chapter 118: removed

However, the remaining Latin apparatus contamination at ~8% is still above the 5% threshold for B+. The specific cases in Ch 105, Ch 113, and Ch 119 are substantial -- Ch 105 para 3 contains a multi-line apparatus block that should have been caught. The unhyphenated broken words at ~20% are much improved but still widespread.

I'm giving B rather than B+ because:
1. Latin apparatus/page references still exceed 5% when counting all apparatus-related contamination (page numbers, sigla, footnote markers)
2. Several of the remaining cases are quite obvious (full apparatus blocks, not subtle)
3. The fused-word artifacts from the unhyphenated break fixing introduced new noise

I'm giving B rather than C+ because:
1. The improvement from V2 is substantial across all categories
2. The Latin apparatus rate dropped from 12-15% to ~8%
3. The unhyphenated break rate dropped from 60-70% to ~20%
4. The remaining issues are lower severity than V2's issues
5. The text is approaching usability for translation

## Required for V4 (if pursued)

### Priority 1: Remaining Apparatus Blocks
The Ch 105 para 3 apparatus block is the most egregious remaining contamination. Pattern: sequences containing page numbers (bare 2-3 digit numbers followed by periods or Greek abbreviations), combined with Latin words like `et`.

### Priority 2: Apparatus Markers/Fragments
Strip remaining `³)`, `) :`, `.1`, `. N` patterns that are clearly page/footnote references embedded in text.

### Priority 3: Fused Words
Some of the unhyphenated break fixes fused words without proper spacing. Review the joining logic to ensure a space is maintained between words that were on separate lines.

### Priority 4: Ch 110 OCR Noise
Chapter 110 has more residual OCR noise than other chapters. May benefit from targeted cleaning.

### Priority 5: Ch 83 Title
Remove the `ταγ` prefix from the title.
