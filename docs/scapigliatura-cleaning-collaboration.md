# Scapigliatura Cleaning — Collaboration Doc

**Text:** La Scapigliatura e il 6 Febbraio (Cletto Arrighi, 1862)
**Source:** `data/difficult_extra_processing/scapigliatura/arrighiscapigliatura_djvu.txt`
**Output:** `data/processed/scapigliatura-e-il-6-febbraio/`

---

## Cleaning Agent v1 — Status: COMPLETE

**Self-grade: B**

### What was done
- Built Python pipeline at `scripts/lib/scapigliatura-cleaning-v1/`
- Processed all 14,135 lines into 18 chapters (intro + 16 chapters; CAPITOLO SEDICESIMO split into 2 sections)
- Output: 2,039 paragraphs in JSON format

### Corrections applied
1. Front matter removed (lines 1-57)
2. Page number lines removed (~212 lines, various formats)
3. Garbled noise lines removed (~191 lines, symbol-ratio heuristic)
4. Noise paragraphs filtered (short garbled text, vowel/pattern heuristic)
5. Soft hyphens joined (~1,431 `¬` breaks)
6. `clic` -> `che` (all standalone instances)
7. l/t dictionary corrections (50+ specific words)
8. Pattern-based `-ala`/`-alo` -> `-ata`/`-ato` with Italian word safelist
9. Leading margin characters stripped
10. Footnote lines removed
11. Punctuation normalized (stray bullets, double commas, inline `¬`)

### Known remaining issues for Evaluator review
1. **Regular hyphen line breaks** not joined (e.g., `imbar-` stays split)
2. **OCR artifacts within paragraphs**: stray `(li-`, `all -1`, `c.` fragments
3. **Broken proper names**: `Crisi ina` (Cristina), `Emani` (Ernani)
4. **Non-participle l/t errors**: `mollo`/`molto`, `potenle`/`potente`, `parlili`/`partiti` — only participle endings handled
5. **Possible over-filtering**: Short legitimate dialogue lines may have been removed by aggressive noise filter (threshold 0.8)
6. **Remaining garbled text**: Some longer garbled passages (60+ chars) may survive within paragraphs

### For the Evaluator
Please sample at least 50 paragraphs across all chapters and assess:
- Contamination rate (garbled text, noise fragments)
- l/t correction accuracy (false positives? missed corrections?)
- Paragraph boundary quality (are paragraphs properly delimited?)
- Chapter structure correctness (18 chapters, proper boundaries)
- Whether the noise paragraph filter was too aggressive or too lenient

---

## Evaluator v1 — Status: COMPLETE

**Grade: B-**
**Verdict: NOT SATISFIED**

### Summary
Sampled 70+ paragraphs across all 18 chapters. Ran 5 trial translations via DeepSeek. The foundational cleaning (soft hyphens, page numbers, `clic`->`che`, participle l/t) is solid. However, remaining issues prevent B+ certification.

### Required Fixes (Priority Order)

**P0 — Must Fix Before Translation:**

1. **Remove pure-garbage paragraphs** that survived the noise filter:
   - ch002 para 25 (`.inoiniiq lillfib`)
   - ch002 para 110 (`lini`)
   - ch015 paras 74-76 (entire paragraphs of garbled text)
   - ch016 paras 47-48 (`.cio/àrt oaoy noa`, `.oùtooùY li jóiigkyu`)
   - DeepSeek CANNOT translate these; trial translation returned "text appears garbled"

2. **Fix missed `¬` soft hyphens at paragraph boundaries** — the join logic only works within paragraphs, not across them. These paragraphs end with `¬` and need to be merged with the next paragraph:
   - ch001 para 47 (`sal¬`)
   - ch002 para 2 (`col¬`)
   - ch005 para 69 (`con¬`)
   - ch012 para 14 (`ri¬`)
   - ch017 para 7 (`protago¬`)

**P1 — Should Fix:**

3. **Add high-frequency l/t word corrections:** `mollo`->`molto`, `tulli`->`tutti`, `polente`->`potente`, `porla`->`porta`. Found 10+ instances across the text.

4. **Fix `Crisiina`/`Crisi ina` -> `Cristina`:** Appears 10+ times. Simple string replacement.

**P2 — Nice to Have:**

5. **Strip trailing garbage from paragraphs:** Many end with noise like `.rmoixcg`, `ci-iée^oaau hutjqeu`, `;il 1 \"\" « ■ ■`.

6. **Join regular-hyphen line breaks** (at least the conservative case where next paragraph starts lowercase).

### Full evaluation details
See `docs/scapigliatura-v1-evaluation-scratch.md` for complete paragraph-level findings, trial translation results, and grading breakdown.

---

## Cleaning Agent v2 — Status: COMPLETE

**Self-grade: B+**

### What was done
- Built post-processing pipeline at `scripts/lib/scapigliatura-cleaning-v2/postprocess.py`
- Reads V1 output, applies all P0/P1/P2 fixes, overwrites output
- Result: 2,039 -> 1,976 paragraphs (63 removed/merged)

### All evaluator issues addressed

**P0 (FIXED):**
1. All pure-garbage paragraphs removed (ch002/25, ch002/110, ch015/74-76, ch016/47-48) via tightened noise detection
2. Cross-paragraph `¬` soft hyphens merged (ch001/47, ch002/2, ch005/69, ch012/14, ch017/7)

**P1 (FIXED):**
3. Added l/t corrections: `mollo`->`molto`, `tulli`->`tutti`, `polente`->`potente`, `porla`->`porta` + variants
4. Fixed `Crisiina`/`Crisi ina` -> `Cristina`

**P2 (FIXED):**
5. Trailing garbage stripped from paragraphs
6. Regular-hyphen line breaks joined (conservative: next para starts lowercase)

### Verification
All 18 chapter files valid JSON. Zero remaining instances of flagged garbage, broken soft hyphens, `Crisiina`, or `mollo`/`tulli`/`polente`/`porla`.

### For the Evaluator
Please re-sample to confirm B+ grade. Key areas to verify:
- No false removals of legitimate short dialogue paragraphs
- l/t corrections did not introduce false positives
- Hyphen joins produced correct word forms
- Trailing garbage strip did not truncate legitimate content

Full details: `docs/scapigliatura-v2-cleaning-scratch.md`

---

## Evaluator v2 — Status: COMPLETE

**Grade: B+**
**Verdict: SATISFIED**

### Summary
Sampled 60 paragraphs (random, seed=42) across all 18 chapters plus comprehensive low-vowel scan of all 1,976 paragraphs. Ran 5 trial translations via DeepSeek. All V1 issues confirmed fixed. Zero contaminated paragraphs found in sample (0% issue rate). All trial translations produced fluent, correct English output.

### V1 Issues — ALL VERIFIED FIXED
1. Garbage paragraphs removed (ch002/25, ch002/110, ch015/74-76, ch016/47-48)
2. Cross-paragraph soft hyphens merged (0 remaining)
3. l/t words corrected (0 remaining `mollo`/`tulli`/`polente`/`porla`)
4. `Cristina` name fixed (0 remaining `Crisiina`/`Crisi ina`)

### B+ Criteria — ALL MET
- < 5% garbled paragraphs: PASS (0%)
- < 2% false positives: PASS (none found)
- No page numbers: PASS
- No full-garbage paragraphs: PASS
- Proper paragraph boundaries: PASS
- Trial translations fluent: PASS (5/5)

Full details: `docs/scapigliatura-v2-evaluation-scratch.md`

---

## Next Steps
Text is APPROVED for seeding and translation. Proceed with:
1. Add to `scripts/seed-db.ts` (genre: `literature`, language: `it-literary-19c`)
2. `pnpm tsx scripts/seed-db.ts`
3. `pnpm tsx scripts/translate-batch.ts --text scapigliatura-e-il-6-febbraio`
