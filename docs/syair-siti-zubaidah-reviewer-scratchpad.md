# Syair Siti Zubaidah — Reviewer Scratchpad

**Reviewer Agent**: Started 2026-01-28
**Status**: ROUND 2 COMPLETE — SATISFIED (B+)

## Review Summary

Processor output: 19 chapters, 2637 quatrains, all exactly 4 lines each.

### Defects Found

| Category | Count (quatrains affected) | Severity |
|----------|---------------------------|----------|
| Leaked page numbers as verse lines | 6 | HIGH (structural) |
| Embedded page refs (II 001, etc.) | 5 | MEDIUM |
| Tab characters (stanza remnants) | 24 | LOW |
| /N/ slash markers not stripped | 7 | MEDIUM |
| ! OCR not fully fixed | 18 | LOW |
| Merged words | 1 | LOW |
| **Total unique affected quatrains** | **~51** | |
| **Defect rate** | **1.9%** | |

### Critical Issues

1. **Leaked page numbers as verse lines** (6 quatrains): Roman numerals ("II", "III") and OCR-garbled page numbers ("S4", "\09", "J27", "i48", "ISS", "29 1", "30)") were not caught by `is_page_number()` which only matches `^\d{1,3}$`. These became verse lines in quatrains, displacing actual content and misaligning quatrain boundaries.

2. **Embedded page refs** (5 quatrains in ch19): Markers like "II 001", "II 021", "II 041", "II 061" appear mid-line. These are page numbers from a second volume numbering system.

3. **Tab characters remain** (24 quatrains): The `strip_inline_stanza_number` function requires digits+tab format, but some stanza markers have different formats. Tabs remain in output.

4. **Residual /N/ markers** (7 quatrains): Markers like `/66/`, `/88/`, `/ 106/` etc. not fully stripped because they lack the expected tab or have spaces.

### Pervasive OCR (NOT processor's fault)

The raw OCR quality is C+. These persist but are from the source, not processing failures:
- Period-in-word artifacts: 76 quatrains (e.g., "negeri.ku")
- Angle bracket artifacts: 15 quatrains (e.g., "tidal<", "nail<")
- dJ for "di": 15 quatrains
- Backslash artifacts: 6 quatrains

These are NOT counted as processor defects since the evaluation doc acknowledged C+ OCR quality and the processor was only expected to fix the systematic patterns listed.

### Sample Translations (10 quatrains)

All 10 sampled quatrains produce coherent English translations despite OCR noise:

1. **ch1 idx0**: "The people of Fabian rose up / Seeing the Chinese come hither / The people of Fabian all stood / Coming to attend the young jewel-master" -- CLEAR
2. **ch4 idx100**: About Zubaidah's matchless beauty, reluctance to propose -- CLEAR
3. **ch6 idx30**: About wanting to arrange marriage, the kingdom's affairs -- CLEAR
4. **ch10 idx50**: Court dialogue, Abdullah approaching the merchant -- CLEAR
5. **ch19 idx60**: Political discussion about installing a ruler -- CLEAR

All translations recoverable. OCR noise does not prevent understanding meaning.

### Raw Source Comparison

Compared 10 quatrains against raw file:
- Library stamp (lines 324-328) correctly stripped
- Introduction and bibliography correctly excluded
- Standalone numeric page numbers correctly stripped
- Content not accidentally deleted
- Archaic Malay preserved (not modernized)
- **One issue**: Line 329 ("II") leaked as a page number into ch1 idx12

### Grade Assessment

- **OCR Cleanliness**: B (systematic fixes applied, most ! and I→l fixed, but some gaps)
- **Structural Integrity**: B (all quatrains have 4 lines, but 6 have leaked page nums as verse lines)
- **Translatability**: A- (all sampled quatrains produce clear English; OCR noise does not block meaning)
- **Overall Grade**: B

The 1.9% defect rate is under the 3% threshold for B+, but the structural issue of leaked page numbers replacing actual verse lines is a higher-severity concern since it means those 6 quatrains have wrong content. This pulls the grade from B+ to B.

### Fix Requests for B+ Rating

To reach B+:
1. Fix `is_page_number()` to also catch Roman numerals (II, III, IV, etc.) and OCR-garbled variants
2. Fix `strip_inline_stanza_number()` to handle `/N/` markers without tabs and with spaces
3. Strip tab characters from all output lines
4. Strip embedded "II NNN" page references from mid-line positions
5. Handle the OCR-garbled page numbers: "S4", "J27", "i48", "ISS", "29 1", "30)" -- these are garbled versions of page numbers 54, 127, 148, 155, 291, 301 respectively
