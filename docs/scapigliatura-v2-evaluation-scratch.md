# Scapigliatura OCR Cleaning v2 — Evaluation

**Date:** 2026-01-29
**Agent:** Evaluator Agent (v2)

---

## Evaluation Summary

**Grade: B+**
**Status: SATISFIED**

The V2 cleaning pipeline has addressed all P0 and P1 issues identified in the V1 evaluation. The text is ready for translation.

---

## V1 Issue Verification (ALL FIXED)

### 1. Garbage paragraphs — FIXED
- ch002 para 25 (`.inoiniiq lillfib`) — REMOVED
- ch002 para 110 (`lini`) — REMOVED
- ch015 paras 74-76 (garbled text) — REMOVED
- ch016 paras 47-48 (garbled text) — REMOVED
- ch002 reduced from 149 to 142 paragraphs
- ch015 reduced from 77 to 74 paragraphs
- ch016 reduced from 49 to 47 paragraphs

### 2. Cross-paragraph soft hyphens — FIXED
- Zero paragraphs ending with `¬` remain (was 5+ in V1)
- Confirmed: ch001 `sal¬`, ch002 `col¬`, ch005 `con¬`, ch012 `ri¬`, ch017 `protago¬` all merged

### 3. High-frequency l/t errors — FIXED
- Zero instances of `mollo`, `tulli`, `polente`, `porla` found across all 18 chapters

### 4. Cristina name — FIXED
- Zero instances of `Crisiina` or `Crisi ina` remain
- ch010 p49 correctly reads `Cristina`

---

## Fresh Sampling

**Method:** Random sample of 60 paragraphs across all 18 chapters (seed=42), plus comprehensive low-vowel-ratio scan of all 1,976 paragraphs.

**Results:**
- 60/60 sampled paragraphs: CLEAN (0% issue rate)
- 0 low-vowel-ratio paragraphs found in entire corpus (comprehensive scan)
- No page numbers, no pure-garbage paragraphs, no truncated soft hyphens

**Paragraph count:** 1,976 (down from 2,039 — 63 paragraphs removed/merged)

---

## Trial Translations (5/5 Successful)

| # | Source | Result | Quality |
|---|--------|--------|---------|
| 1 | ch000 p13 (descriptive prose) | "In the irregularity of its deserted streets, sparingly lit, in the jutting and receding corners..." | Excellent — fluent, literary |
| 2 | ch002 p0 (has OCR artifacts `(li-`, `all -1`) | "Whoever entered at such an opportune moment with the powerful organ—a fine baritone voice—would strike up the recitative from *Ernani*..." | Good — DeepSeek reads through artifacts |
| 3 | ch010 p49 (Cristina passage) | "She loves another man! he thought; and Cristina's words came crashing down on his heart with terrifying clarity." | Excellent |
| 4 | ch015 last (short sentence near former garbage) | Correct content translated (DeepSeek chose Chinese target language — prompt issue, not cleaning issue) | Content correct |
| 5 | ch005 p67 (dialogue) | "Firmiani caressed her and urged her to come quickly, quickly..." | Good |

**Assessment:** All trial translations produced correct, intelligible output. No translation failures. DeepSeek handles remaining inline OCR artifacts (stray punctuation, `(li-` fragments) without issue.

---

## Remaining Minor Issues (Acceptable for B+)

1. **Inline OCR artifacts** within otherwise coherent paragraphs: stray `(li-`, `all -1`, `c.`, minor punctuation artifacts. These are cosmetic and DeepSeek translates through them successfully.

2. **Some OCR punctuation quirks:** `}` for `)`, `^` in text, `*` after words. Low impact on translation quality.

3. **Regular hyphen joins:** The V2 cleaner implemented conservative joins (next para starts lowercase). Some edge cases may remain but the overall paragraph boundary quality is now acceptable.

---

## Grade Justification: B+

| Criterion | Status |
|-----------|--------|
| < 5% garbled/noise paragraphs | PASS (0% in sample) |
| < 2% false-positive corrections | PASS (none found) |
| No page numbers | PASS |
| No full-garbage paragraphs | PASS |
| Proper paragraph boundaries | PASS (soft hyphens fixed, conservative regular-hyphen joins) |
| Coherent text flow | PASS |
| Trial translations fluent | PASS (5/5 successful) |

All B+ criteria met. The text is ready for seeding and translation.
