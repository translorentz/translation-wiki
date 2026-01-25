# Translation Gaps Audit Report

**Generated:** 2026-01-24
**Auditor:** Claude Code (Translation Quality Auditor Agent)
**Status:** PARTIALLY COMPLETE (API authentication failure)

---

## Executive Summary

This audit identified and attempted to fix all translation gaps across the database:
1. **Placeholder text** — Paragraphs containing "[Translation pending — automated translation failed for this paragraph]"
2. **Empty translations** — Paragraphs with empty or whitespace-only text
3. **Missing translations** — Chapters that have source content but no translation at all

### Gap Fixing Results

| Phase | Status | Details |
|-------|--------|---------|
| Phase 1a (Empty paragraphs) | COMPLETE | 107 chapters fixed, 0 failures |
| Phase 1b (Placeholder paragraphs) | PARTIAL | 18 chapters fixed, 20 failed (API auth error) |
| Phase 2 (Armenian) | NOT STARTED | Blocked by API auth failure |
| Phase 3 (Chinese missing) | NOT STARTED | Blocked by API auth failure |
| Phase 4 (Tamil) | NOT STARTED | Blocked by API auth failure |

---

## Fix Run 1: Empty Paragraph Gaps (COMPLETE)

**Script:** `scripts/fill-translation-gaps.ts`
**Time:** 2026-01-24 ~20:50-21:40 UTC

Found 266 gaps across 107 chapters (empty paragraphs only).
All 107 chapters successfully filled.

Texts fixed:
- baihu-tong, erya-zhushu, fengsutongyi, guliang-zhuan, guliang-zhushu
- gongyang-zhushu, historia-nova, liji-zhengyi, liji-zhushu, rizhilu
- tongjian, udayanakumara-kaviyam, yashodhara-kaviyam, yili-zhushu
- zhouli-zhushu, zhouyi-zhengyi, zhuziyulei, zuozhuan-zhengyi
- carmina-graeca, eustathius-odyssey

---

## Fix Run 2: Placeholder Paragraphs (PARTIAL - API FAILURE)

**Script:** `scripts/fill-translation-gaps.ts` (updated to include placeholder detection)
**Time:** 2026-01-24 ~21:56-23:30 UTC

Found 257 gaps across 38 chapters (placeholders + empty).
- **18 chapters successfully filled**
- **20 chapters failed** (DeepSeek API key authentication failure mid-run)

### Successfully Fixed

Armenian texts:
- anna-saroyan ch1: 5 gaps filled
- arshagouhi-teotig ch1, 5, 9, 13, 17, 21, 24, 29, 33: all gaps filled
- kaitser ch44, 45, 50: all gaps filled

Chinese texts:
- liji-zhengyi ch6 (x2), ch22 (x2), ch30: filled

### Failed (API Auth Error)

These chapters still have placeholder text and need re-running when API key is valid:

| Text | Chapter | Reason |
|------|---------|--------|
| liji-zhengyi | 13, 27, 56 | API authentication failure |
| liji-zhushu | 16, 22 | API authentication failure |
| mengzi-zhushu | 3 | API authentication failure |
| rizhilu | 27 | API authentication failure |
| shangshu-zhengyi | 4 (x2) | API authentication failure |
| tongjian | 23, 43 | API authentication failure |
| yili-zhushu | 49, 50, 51 | API authentication failure |
| zhuziyulei | 112 | API authentication failure |
| zuozhuan-zhengyi | 3 | API authentication failure |

---

## Remaining Gaps (as of 2026-01-24 23:30)

### Chapters with Placeholder Text Still Remaining

| Text | Language | Chapters |
|------|----------|----------|
| arshagouhi-teotig | hy | 9 chapters |
| liji-zhengyi | zh | 6 chapters |
| liji-zhushu | zh | 2 chapters |
| kaitser | hy | 1 chapter |
| rizhilu | zh | 1 chapter |
| shangshu-zhengyi | zh | 1 chapter |
| zhuziyulei | zh | 1 chapter |
| anna-saroyan | hy | 1 chapter |
| zuozhuan-zhengyi | zh | 1 chapter |
| mengzi-zhushu | zh | 1 chapter |

### Chapters Without Any Translation

| Text | Language | Chapters Missing |
|------|----------|-----------------|
| kaitser | hy | 74 chapters (1-38, 41-76) |
| arshagouhi-teotig | hy | ~21 chapters (15-35) |
| anna-saroyan | hy | ~14 chapters (9-23) |
| yili-zhushu | zh | 3 chapters (49, 50, 51) |

---

## To Complete the Audit

When the DeepSeek API key is renewed/fixed:

1. **Re-run gap filler:**
   ```bash
   set -a && source .env.local && set +a && pnpm tsx scripts/fill-translation-gaps.ts --delay 3000
   ```

2. **Translate missing Armenian chapters:**
   ```bash
   pnpm tsx scripts/translate-armenian.ts --text kaitser --start 1 --end 38 --delay 5000
   pnpm tsx scripts/translate-armenian.ts --text kaitser --start 41 --end 76 --delay 5000
   pnpm tsx scripts/translate-armenian.ts --text arshagouhi-teotig --start 1 --end 35 --delay 5000
   pnpm tsx scripts/translate-armenian.ts --text anna-saroyan --start 1 --end 23 --delay 5000
   ```

3. **Translate missing Chinese chapters:**
   ```bash
   pnpm tsx scripts/translate-batch.ts --text yili-zhushu --start 49 --end 51 --delay 3000
   ```

---

## Script Enhancement Made

Updated `/Users/bryancheong/claude_projects/translation-wiki/scripts/fill-translation-gaps.ts` to detect both empty paragraphs AND placeholder text:

```typescript
// Before: only empty paragraphs
if (tp.text.trim() === "") {

// After: empty OR placeholder
const isEmpty = tp.text.trim() === "";
const isPlaceholder = tp.text.includes("[Translation pending");
if (isEmpty || isPlaceholder) {
```

---

## Notes

1. The DeepSeek API key became invalid mid-run. Error: `401 Authentication Fails, Your api key: ****9072 is invalid`

2. Some Chinese classical texts (liji-zhengyi, liji-zhushu) had persistent JSON parsing errors even before the auth failure, suggesting very long or complex source paragraphs.

3. The first run (empty paragraphs only) was 100% successful, filling all 266 gaps across 107 chapters.

4. Armenian texts (arshagouhi-teotig, kaitser, anna-saroyan) had many placeholder gaps because their translation workers had not completed before this audit.
