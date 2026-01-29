# Scapigliatura OCR Cleaning v1 — Evaluation

**Date:** 2026-01-29
**Agent:** Evaluator Agent (v1)

---

## Evaluation Summary

**Grade: B-**
**Status: NOT SATISFIED**

The cleaning pipeline has done solid foundational work -- soft hyphens, page numbers, `clic`->`che`, and participle l/t corrections are all well handled. However, several categories of remaining issues push this below B+ threshold.

---

## Sampling Methodology

Sampled 70+ paragraphs across all 18 chapters (ch000-ch017), with at least 3 paragraphs per chapter. Compared against cleaner's stated corrections. Ran 5 trial translations via DeepSeek.

---

## Issue Categories

### 1. CRITICAL: Garbled Noise Paragraphs Still Present (~3-4%)

Multiple paragraphs of pure OCR garbage survived the noise filter, particularly at chapter boundaries:

| Chapter | Para | Content |
|---------|------|---------|
| ch002, para 1 | `, iv ... v ., •; jssnooao'to-i slitt erà un giovine tra i 22 e i 2o anni...` | Garbled prefix |
| ch002, para 25 | `.inoiniiq lillfib` | Pure noise |
| ch002, para 110 | `lini` | Fragment |
| ch010, para 1 | Ends with `;il 1 \"\" « ■ ■` | Trailing garbage |
| ch014, para 6 | Ends with `.«tini renna* f oq usi ce'.-oh` | Trailing garbage |
| ch014, para 7 | Ends with `ci-iée^oaau hutjqeu` | Trailing garbage |
| ch015, para 74 | `;iivi tj-m a: -, r.l olilWrt» ISO OS'A't;...` | **Entire paragraph is garbage** |
| ch015, para 75 | `50 : b 1 tei-* (S riAU-O/...` | **Entire paragraph is garbage** |
| ch015, para 76 | `live;? ,u.:> ni cDontóii^...` | **Entire paragraph is garbage** |
| ch016, para 47 | `.cio/àrt oaoy noa` | Pure noise |
| ch016, para 48 | `.oùtooùY li jóiigkyu` | Pure noise |

**Impact:** DeepSeek cannot translate these. Trial translation #5 returned "text appears garbled." These will produce translation failures or nonsense output.

### 2. SIGNIFICANT: Truncated/Split Paragraphs (~5-7%)

Regular hyphens at line breaks were NOT joined, causing many paragraphs to be split mid-word:

| Chapter | Para | Truncated at |
|---------|------|-------------|
| ch000, para 76 | `non avesse svilup-` |
| ch000, para 101 | `illumi-` |
| ch001, para 12 | `dia-` |
| ch001, para 47 | `sal¬` (unjoined soft hyphen!) |
| ch002, para 2 | `col¬` (unjoined soft hyphen!) |
| ch003, para 3 | `pie-` |
| ch004, para 3 | `do-` |
| ch005, para 69 | `con¬` (unjoined soft hyphen!) |
| ch008, para 6 | `confes-` |
| ch012, para 14 | `ri¬` (unjoined soft hyphen!) |
| ch017, para 7 | `protago¬` (unjoined soft hyphen!) |

**Two sub-issues:**
- Regular hyphen splits (`-`) not joined -- acknowledged by cleaner
- **Several `¬` soft hyphens NOT joined** -- these should have been caught. E.g., ch001 para 47 ends with `sal¬`, ch002 para 2 ends with `col¬`, ch005 para 69 ends with `con¬`. The cleaner claimed 1,431 soft hyphens joined, but some at paragraph boundaries were missed.

### 3. MODERATE: Remaining l/t and OCR Word Errors (~3-4%)

| Chapter | Para | Error | Should Be |
|---------|------|-------|-----------|
| ch000, para 2 | `Sca¬` (end, truncated) | `Scapigliatura` |
| ch000, para 5 | `porla` | `porta` |
| ch000, para 5 | `tulli` | `tutti` |
| ch000, para 9 | `ielle` | unclear |
| ch000, para 12 | `lutt'altro`, `tult'ab tro` | `tutt'altro` |
| ch000, para 12 | `tulli` | `tutti` |
| ch000, para 39 | `polente` | `potente` |
| ch001, para 10 | `mollo` | `molto` |
| ch002, para 0 | `polente` | `potente` |
| ch003, para 16 | `Emanuele` preserved (correct), but `ili` noise |
| ch003, para 23 | `Crisiina` | `Cristina` (OCR `i` for `t`) |
| ch005, para 0 | `Crisi ina` | `Cristina` (space-split) |
| ch010, para 5 | `porla` | `porta` |

The `l/t` errors in common words like `mollo`->`molto`, `tulli`->`tutti`, `polente`->`potente`, `porla`->`porta` are pervasive (I found 10+ instances). The participle pattern fix was good, but these high-frequency non-participle words were missed.

`Crisiina`/`Crisi ina` for `Cristina` appears at least 10 times across the text -- a consistent OCR misread.

### 4. MODERATE: Inline Noise Characters (~2-3%)

Stray symbols, numbers, and artifacts within otherwise clean paragraphs:

- ch002, para 23: `Teodoro s'arrestò di botto collo sguardo fisso aldi'uscio` -- `aldi'` should be `all'`
- ch003, para 9: ends with `fi di lei collo` then continues normally -- `fi` is noise
- ch003, para 10: starts with `E aneli ' 1 io dico` -- `aneli ' 1` should be `anch'`
- ch002, para 70: ends with `.rmoixcg` -- trailing noise
- ch004, para 80: `pd^off imi a la forza` -- garbled
- ch004, para 81: `^jjRppeiPariima gelida` -- garbled prefix

### 5. MINOR: Punctuation Artifacts (~1-2%)

Various stray punctuation marks: `}` instead of `)`, `^` in text, `*` after words, `;` in odd positions. These are cosmetic but numerous.

---

## Trial Translations

| # | Source | Result | Quality |
|---|--------|--------|---------|
| 1 | Ch0 para 12 (OCR artifacts: `liitt*altro`, `parlili`, `aneli'essa`, `tult'ab tro`) | DeepSeek produced fluent English, correctly interpreting through the noise | Acceptable |
| 2 | Ch2 para 0 (`polente (li-`, `Emani all -1`) | DeepSeek translated correctly, guessing `Ernani` | Acceptable |
| 3 | Ch3 para 8 (truncated: `era affasci`) | DeepSeek guessed "captivating" for the truncated word | Marginal -- truncation loses content |
| 4 | Ch3 para 31 (clean) | Perfect translation | Good |
| 5 | Ch15 para 74 (pure garbage) | DeepSeek refused: "text appears garbled" | **Failure** |

**Assessment:** DeepSeek can work through moderate OCR noise in otherwise coherent Italian prose. However, truncated paragraphs lose content, and pure garbage paragraphs cause complete translation failures.

---

## Paragraph Count Audit

| Chapter | Paragraphs | Notes |
|---------|-----------|-------|
| ch000 | 111 | Long intro, some truncated paras |
| ch001 | 58 | OK |
| ch002 | 149 | Contains noise paras (25, 110) |
| ch003 | 84 | Contains `Crisiina` throughout |
| ch004 | 115 | Some garbled fragments |
| ch005 | 185 | Very long chapter, mostly clean |
| ch006 | 94 | Spot-checked, moderate |
| ch007 | 84 | Spot-checked, moderate |
| ch008 | ~120 | OK |
| ch009 | ~85 | Not fully sampled |
| ch010 | ~110 | Trailing garbage in places |
| ch011 | ~115 | Not fully sampled |
| ch012 | ~100 | Political/historical chapter, mostly quotes |
| ch013 | ~170 | Not fully sampled |
| ch014 | ~195 | Trailing garbage artifacts |
| ch015 | 77 | **3 pure garbage paragraphs at end (74-76)** |
| ch016 | 49 | **2 pure garbage paragraphs at end (47-48)** |
| ch017 | ~135 | Spot-checked, moderate |

Total: ~2,039 paragraphs (matches cleaner's count)

---

## Grade Justification: B-

| Criterion | Status | Notes |
|-----------|--------|-------|
| < 5% garbled/noise paras | BORDERLINE (~4-5%) | 15+ pure noise paras + 20+ with inline garbage |
| < 2% false-positive corrections | PASS | Did not find false positives in l/t corrections |
| No page numbers | PASS | None found |
| No garbled lines | FAIL | Multiple full-garbage paragraphs remain |
| Proper paragraph boundaries | FAIL | ~5-7% truncated at hyphens, including missed `¬` joins |
| Coherent text flow | MARGINAL | Truncated paras break reading flow |
| Trial translations fluent | PARTIAL | 3/5 OK, 1 marginal (truncation), 1 failure (garbage) |

---

## Required Fixes for B+ (Priority Order)

### P0 (Must Fix)
1. **Remove remaining pure-garbage paragraphs:** ch002 para 25, ch002 para 110, ch015 paras 74-76, ch016 paras 47-48. These are 100% noise and will cause translation failures.

2. **Fix missed `¬` soft hyphens at paragraph boundaries:** ch001 para 47 (`sal¬`), ch002 para 2 (`col¬`), ch005 para 69 (`con¬`), ch012 para 14 (`ri¬`), ch017 para 7 (`protago¬`). The current join logic appears to only work within paragraphs, not across paragraph boundaries. These need to be merged with the following paragraph.

### P1 (Should Fix)
3. **Add high-frequency l/t corrections:** `mollo`->`molto`, `tulli`->`tutti`, `polente`->`potente`, `porla`->`porta`, `lulli`->`tutti`. These appear dozens of times and are clear, unambiguous corrections.

4. **Fix `Crisiina`->`Cristina` and `Crisi ina`->`Cristina`:** This is a character name that appears 10+ times. Simple string replacement.

### P2 (Nice to Have)
5. **Strip trailing garbage from paragraphs:** Many paragraphs end with noise like `.rmoixcg`, `ci-iée^oaau hutjqeu`, `;il 1 \"\" « ■ ■`. A regex to strip non-Italian trailing fragments would help.

6. **Join regular-hyphen line breaks:** `svilup-` + next para, `illumi-` + next para, etc. This is acknowledged as unfixed by the cleaner. Even a conservative approach (only join when the next paragraph starts with a lowercase letter) would help.

---

## Summary

The cleaning pipeline has done good work on the core OCR issues (soft hyphens, page numbers, `clic`, participle l/t). But the remaining pure-garbage paragraphs, missed soft-hyphen joins at paragraph boundaries, and pervasive `mollo`/`tulli`/`polente` errors keep this at B- rather than B+. The P0 fixes (garbage removal and cross-paragraph `¬` joins) are essential before translation can proceed.
