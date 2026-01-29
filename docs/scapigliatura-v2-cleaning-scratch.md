# Scapigliatura V2 Cleaning — Scratch Notes

**Date:** 2026-01-29
**Agent:** Cleaning Agent V2

---

## Approach

Created a post-processing pipeline at `scripts/lib/scapigliatura-cleaning-v2/postprocess.py` that reads V1 output JSON and applies targeted fixes for all issues identified by the V1 evaluator.

## Fixes Applied

### P0 — Must Fix (DONE)

1. **Garbage paragraph removal:** Tightened noise detection with:
   - Short fragment filter (< 8 chars, must be known Italian word)
   - Paragraphs starting with punctuation (< 30 chars) removed
   - Word plausibility check for paragraphs < 100 chars (60% threshold) and 100-500 chars (50% threshold)
   - Mid-word uppercase ASCII letter detection (>= 3 for short paras, >= 4 for all)
   - All flagged garbage removed: ch002 para 25 (`inoiniiq lillfib`), ch002 para 110 (`lini`), ch015 paras 74-76, ch016 paras 47-48

2. **Cross-paragraph soft hyphen merge:** Added `merge_soft_hyphen_paragraphs()` that detects paragraphs ending with `¬` and merges them with the next paragraph. Fixed: ch001 (`sal¬`), ch002 (`col¬`), ch005 (`con¬`), ch012 (`ri¬`), ch017 (`protago¬`)

### P1 — Should Fix (DONE)

3. **Additional l/t corrections:** Added `mollo`->`molto`, `tulli`->`tutti`, `polente`->`potente`, `porla`->`porta`, plus variants (`mollissimo`, `parlili`, `lulto/lulla/lullo/lulli/lulle`, `vollò`, `allento`/`allenlo`/`allenli`)

4. **Cristina fix:** `Crisiina`->`Cristina` and `Crisi ina`->`Cristina` (regex with optional space)

### P2 — Nice to Have (DONE)

5. **Trailing garbage strip:** Detects non-Italian trailing fragments after sentence-ending punctuation, and words ending paragraphs with no vowels or >70% consonants

6. **Regular hyphen join:** Merges paragraphs where one ends with `word-` and the next starts lowercase

## Results

- **Before:** 2,039 paragraphs across 18 chapters
- **After:** 1,976 paragraphs (63 removed/merged)
- Breakdown: garbage removal + soft hyphen merges + regular hyphen joins

## Bug Found During Development

The V1 `is_noise_paragraph` used `[A-ZÀ-Ÿ]` to match uppercase letters, but the Unicode range U+00C0-U+0178 includes lowercase accented characters (`à`, `è`, `ì`, `ò`, `ù`). This caused false positives when checking for mid-word uppercase. Fixed by using ASCII-only `[A-Z]` for uppercase detection.

## Verification

All evaluator-flagged paragraphs confirmed fixed:
- ch002 para 25 (`.inoiniiq lillfib`) -- REMOVED
- ch002 para 110 (`lini`) -- REMOVED
- ch015 paras 74-76 (garbled text) -- REMOVED
- ch016 paras 47-48 (garbled text) -- REMOVED
- ch001 para 47 (`sal¬`) -- MERGED
- ch002 para 2 (`col¬`) -- MERGED
- ch005 para 69 (`con¬`) -- MERGED
- ch012 para 14 (`ri¬`) -- MERGED
- ch017 para 7 (`protago¬`) -- MERGED
- No remaining `Crisiina`/`Crisi ina` in any chapter
- No remaining `mollo`/`tulli`/`polente`/`porla` in any chapter
- All 18 chapter files valid JSON with non-empty paragraphs

## Self-Grade: B+

P0 and P1 issues fully resolved. P2 improvements applied. Remaining noise is limited to inline OCR artifacts within otherwise coherent paragraphs (e.g., stray `(li-`, `all -1` fragments), which DeepSeek can handle per the evaluator's trial translations.
