# Diarium Urbis Romae Paragraph Segmentation Fix (v2)

## Date: 2026-01-24

## Problem

The previous version of `scripts/process-diarium.ts` had two major issues:

### 1. Section Headers Concatenated with Diary Text

The raw source file contains section headers from the critical edition's table of contents that should be stripped, not included in the diary text. These headers were being concatenated with the preceding paragraph.

**Example (Chapter 3 before fix):**
```
"...guastaro lo altare malore con quattro colonne di diaspro. III. HlSTORIE DOPO IL RITORNO DELLA CORTE ROMANA DA Avignone."
```

The section header "III. HlSTORIE DOPO IL RITORNO DELLA CORTE ROMANA DA Avignone." is an edition artifact (table of contents heading) that should NOT appear in the diary text.

### 2. Over-consolidated Paragraphs

The paragraph segmentation logic was too conservative, creating giant single paragraphs by ignoring blank lines in the source.

## Root Cause Analysis

Looking at the raw source (`data/raw/diarium-urbis-romae/diary-full.txt`), lines 95-101:
```
et tutte l'altre arse, et guastaro lo altare malore con quattro colonne di diaspro.

III. HlSTORIE DOPO IL RITORNO DELLA CORTE ROMANA

DA Avignone.

EL 1378 nel mese di luglio...
```

The section header spans multiple lines with blank lines before and after, but the script was not detecting these as apparatus lines.

## Section Headers Identified

The following edition artifacts were found in the raw source:

| Line | Text | Type |
|------|------|------|
| 31 | `li. Quando la corte era in Pranza.` | Section II header (OCR: "li." = "II.") |
| 97-99 | `III. HlSTORIE DOPO IL RITORNO DELLA CORTE ROMANA` / `DA Avignone.` | Section III header |
| 454 | `DALLO PONTIFICATO DE MARTINO PAPA QUINTO.` | Section IV header |
| 2134-2139 | `VI. De bello commisso inter Sixtum...` | Section VI header (Latin) |
| 2548 | `VII..Mcccc. Lxxxiiii.` | Section VII header |

## Fix Applied

### 1. Added Section Header Detection

Added `SECTION_HEADER_PATTERNS` array with patterns to detect:
- Roman numeral section headers: `III. HISTORIE...`, `VI. De bello...`
- OCR variants: `li.` for `II.`
- All-caps edition titles: `DALLO PONTIFICATO DE MARTINO PAPA QUINTO.`
- Short all-caps continuation lines: `DA Avignone.`
- Latin section headers: `De bello commisso...`, `CUM tempore Sixti...`

### 2. Added `isSectionHeader()` Function

New function that checks a line against section header patterns before checking apparatus patterns.

### 3. Enhanced `cleanInlineApparatus()`

Added patterns to strip section headers that may have been concatenated mid-line:
- `III. HlSTORIE DOPO IL RITORNO...`
- `DA Avignone.`
- `li. Quando la corte era in Pranza.`

### 4. Improved Paragraph Segmentation

Changed `createParagraphs()` to:
- Treat ANY blank line as a paragraph break (more aggressive)
- Enforce max paragraph length (~800 chars) to prevent over-consolidation
- Still respect entry start patterns (date markers) as paragraph breaks

## Results

### Before Fix
- 66 chapters, 66 paragraphs (each chapter was one giant paragraph)
- Section headers contaminating diary text
- Chapter 3 ended with `...III. HlSTORIE DOPO IL RITORNO DELLA CORTE ROMANA DA Avignone.`

### After Fix
- 64 chapters, 440 paragraphs (better segmentation)
- All section headers stripped
- Chapter 3 now ends correctly with `...quattro colonne di diaspro.`

## Verification

```bash
# Check that no section headers remain
grep -l "PONTIFICATO\|HlSTORIE\|HISTORIE\|Avignone\.|De bello" data/processed/diarium-urbis-romae/*.json
# Result: No matches

# Check chapter 3 content
jq '.sourceContent.paragraphs[0].text' data/processed/diarium-urbis-romae/chapter-003.json
# Result: Ends with "...quattro colonne di diaspro."
```

## Files Modified

- `scripts/process-diarium.ts` - Added section header detection and improved paragraph segmentation

## Files Regenerated

- All 65 chapter JSON files in `data/processed/diarium-urbis-romae/`

## Notes

Some chapters intentionally have only 1 paragraph because they are short entries covering a single event. This is correct behavior - not all diary entries span multiple paragraphs.

The blank lines in the OCR output don't always correspond to logical paragraph breaks (some are mid-sentence OCR artifacts). The script now uses blank lines as paragraph breaks, which produces better results overall but may occasionally split mid-sentence where the OCR had an erroneous blank line.
