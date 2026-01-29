# Epitome of Histories: Paragraph Mismatch Investigation & Fix

**Date:** 2026-01-28
**Texts affected:** `epitome-historiarum-v1` (18 chapters), `epitome-historiarum-v2` (1 chapter)

## Problem

Interlinear translation paragraphs do not align with source paragraphs for Epitome of Histories chapters. The visible symptom: translations at a given paragraph index do not correspond to the source text at the same index (content is shifted/offset), and some paragraphs show no translation at all.

## Investigation Findings

### 1. Paragraph Count Match (Misleading)

All chapters have **equal paragraph counts** between source and translation (diff = 0 for all 19 chapters). This is because `translate-batch.ts` pre-allocates the output array with empty strings for every expected index (line 299 in `translateBatch()`), so the count always matches even when translations are missing.

### 2. Empty Translation Paragraphs

170 total empty translation paragraphs across 17 of 19 chapters:

| Chapter | Total Paras | Empty Trans | Avg Source Para Length |
|---------|-------------|-------------|----------------------|
| 1 | 181 | 6 | 638 chars |
| 2 | 161 | 7 | 518 chars |
| 3 | 279 | 15 | 365 chars |
| 4 | 184 | 31 | 486 chars |
| 5 | 184 | 13 | 484 chars |
| 6 | 366 | 49 | 318 chars |
| 7 | 88 | 5 | 1402 chars |
| 8 | 113 | 8 | 1032 chars |
| 9 | 122 | 9 | 1062 chars |
| 10 | 152 | 6 | 1195 chars |
| 11 | 114 | 6 | 977 chars |
| 12 | 140 | 8 | 953 chars |
| 13 | 102 | 0 | 1080 chars |
| 14 | 107 | 1 | 1130 chars |
| 15 | 110 | 0 | 1328 chars |
| 16 | 123 | 3 | 1119 chars |
| 17 | 110 | 1 | 1453 chars |
| 18 | 95 | 1 | 1156 chars |

V2 chapter 7: 88 paragraphs, 2 empty.

### 3. Content Alignment Shift

Verified on chapter 4: non-empty translations are **content-shifted** relative to their source paragraphs. For example:
- Source paragraph 48: about persuasion and gathering of maidens
- Translation paragraph 48: about Mordecai (which corresponds to source paragraph 55)

The shift accumulates around clusters of empty paragraphs.

### 4. Root Cause

**The LLM (DeepSeek) merges adjacent source paragraphs in its translation output.** When the batch translation script sends N paragraphs, the LLM sometimes returns fewer than N translations because it treats adjacent short fragments as one continuous passage.

The `translateBatch()` function's realignment logic (lines 298-318 in `translate-batch.ts`) uses "closest index" matching to assign translations to expected indices. When the LLM returns wrong index numbers or fewer items, this causes:
1. Some indices get no translation (empty string)
2. Other indices get translations that correspond to different source paragraphs (content shift)

**Contributing factor:** Chapters 1-6 have significantly shorter average paragraph lengths (318-638 chars) compared to chapters 7-18 (953-1453 chars). The shorter paragraphs in chapters 1-6 are more likely to be merged by the LLM, explaining the much higher empty counts in those chapters.

### 5. Source Data Quality

The source data for chapters 1-6 appears to have been processed with a different (earlier) script that created more granular paragraph splits from the OCR. Chapters 7-18 have properly merged paragraphs that better represent natural paragraph boundaries.

## Fix Applied

**Retranslation of all affected chapters** using `--retranslate` flag on `translate-batch.ts`:

```bash
# 4 parallel workers
pnpm tsx scripts/translate-batch.ts --text epitome-historiarum-v1 --start 1 --end 6 --retranslate --delay 2000
pnpm tsx scripts/translate-batch.ts --text epitome-historiarum-v1 --start 7 --end 12 --retranslate --delay 2000
pnpm tsx scripts/translate-batch.ts --text epitome-historiarum-v1 --start 14 --end 18 --retranslate --delay 2000
pnpm tsx scripts/translate-batch.ts --text epitome-historiarum-v2 --retranslate --delay 2000
```

The `--retranslate` flag deletes existing translation versions and creates fresh translations.

**Note:** Retranslation alone may not fully resolve the issue if the LLM continues to merge paragraphs. The underlying realignment logic in `translateBatch()` is the same. However, retranslation gives a fresh chance for each batch, and the stochastic nature of LLM output means many previously-failed alignments will succeed on retry.

## Permanent Fix (2026-01-28, Session 22)

### Database Audit

Re-queried all chapters for source vs translation paragraph count mismatches:

```sql
SELECT t.slug, c.chapter_number,
  jsonb_array_length(c.source_content->'paragraphs') AS source_count,
  jsonb_array_length(tv.content->'paragraphs') AS translation_count
FROM chapters c JOIN texts t ON c.text_id = t.id
JOIN translations tr ON tr.chapter_id = c.id
JOIN translation_versions tv ON tv.id = tr.current_version_id
WHERE jsonb_array_length(c.source_content->'paragraphs') != jsonb_array_length(tv.content->'paragraphs')
```

**Result:** Only 1 chapter with count mismatch across the entire database: `elegia` chapter 4 (source: 2, translation: 3).

Note: The epitome-historiarum issue was primarily **content shift** within matching counts (empty paragraphs + shifted indices), not a raw count mismatch. The old realignment heuristic masked the count issue by pre-allocating empty slots.

### Changes to `scripts/translate-batch.ts`

1. **Retry on count mismatch** (`translateBatch` refactored):
   - New `parseTranslationResponse()` function: parses LLM response and reports whether indices match exactly
   - New `realignParagraphs()` function: extracted best-effort fallback (only used after all retries exhausted)
   - `translateBatch()` now retries up to 2 times (`MISMATCH_MAX_RETRIES = 2`) when paragraph count or indices don't match, before falling back to realignment
   - Each retry logs: `[mismatch] expected N paragraphs, got M -- retrying (1/2)`

2. **Post-chapter verification** (in `translateChapter`):
   - After all batches complete, verifies `translated.length === sourceContent.paragraphs.length`
   - Verifies each `translated[i].index === sourceContent.paragraphs[i].index`
   - If either check fails: logs `[ALIGN ERROR]` and **refuses to save** the chapter, returning false
   - This prevents misaligned data from ever reaching the database

### Changes to `src/server/translation/prompts.ts`

1. **System prompt**: Added explicit count requirement with the actual batch size interpolated: "You MUST return EXACTLY the same number of paragraphs as the input (N paragraphs)"
2. **User prompt**: Now includes: "Translate the following N paragraphs (indices: 0, 1, 2, ...). Return exactly N translated paragraphs."
3. Added an example showing expected behavior for 5-paragraph input

### Summary of Defense-in-Depth

| Layer | What it does | When it triggers |
|-------|-------------|-----------------|
| Prompt | Tells LLM exact count + indices expected | Every API call |
| Batch retry | Retries batch up to 2x on mismatch | When LLM returns wrong count |
| Best-effort realign | Maps returned paragraphs to closest indices | After all retries exhausted |
| Chapter verification | Blocks save if final count/indices wrong | Before DB write |
