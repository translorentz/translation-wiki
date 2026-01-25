# Translation Gaps Audit Report

**Generated:** 2026-01-24
**Auditor:** Claude Code (Translation Quality Auditor Agent)
**Status:** IN PROGRESS

---

## Executive Summary

This audit identifies all translation gaps across the database, including:
1. **Placeholder text** — Paragraphs containing "[Translation pending — automated translation failed for this paragraph]"
2. **Empty translations** — Paragraphs with empty or whitespace-only text
3. **Missing translations** — Chapters that have source content but no translation at all

### Gap Counts by Category

| Category | Texts Affected | Total Gaps |
|----------|---------------|------------|
| Missing Translations (whole chapters) | 4 | 112 chapters |
| Placeholder Text | 9 | ~25 paragraphs |
| Empty Paragraphs | ~30+ | ~300 paragraphs |

---

## Part 1: Missing Translations (No Translation at All)

These chapters have source content but no translation record exists.

### Armenian Texts (hy)

| Text | Chapters Missing | Chapter Numbers |
|------|-----------------|-----------------|
| kaitser | 74 | 1-38, 41-76 (all except 39-40) |
| arshagouhi-teotig | 21 | 15-35 |
| anna-saroyan | 14 | 9-23 |

### Chinese Texts (zh)

| Text | Chapters Missing | Chapter Numbers |
|------|-----------------|-----------------|
| yili-zhushu | 3 | 49, 50, 51 |

**Total Missing: 112 chapters**

---

## Part 2: Placeholder Text Gaps

These chapters have translation versions containing placeholder text.

| Text | Language | Chapter | Paragraphs with Placeholders |
|------|----------|---------|------------------------------|
| liji-zhengyi | zh | 6 | 1 |
| liji-zhengyi | zh | 13 | 1 |
| liji-zhengyi | zh | 22 | 1 |
| liji-zhengyi | zh | 27 | 1 |
| liji-zhengyi | zh | 30 | 1 |
| liji-zhengyi | zh | 52 | 1 |
| liji-zhengyi | zh | 56 | 1 |
| liji-zhushu | zh | 16 | 1 |
| liji-zhushu | zh | 22 | 1 |
| arshagouhi-teotig | hy | 1 | 6 (full chapter) |
| arshagouhi-teotig | hy | 5 | 11 (full chapter) |
| shangshu-zhengyi | zh | 4 | 1 |
| anna-saroyan | hy | 1 | 5 (full chapter) |
| zuozhuan-zhengyi | zh | 3 | 1 |
| mengzi-zhushu | zh | 3 | 1 |
| rizhilu | zh | 27 | 1 |
| zhuziyulei | zh | 112 | 1 |

**Total Placeholder Paragraphs: ~35**

---

## Part 3: Empty Paragraph Gaps

These are chapters where some paragraphs have empty text despite having non-empty source.

### By Text (sorted by gap count)

| Text | Language | Chapters Affected | Total Empty Paragraphs |
|------|----------|-------------------|------------------------|
| zhuziyulei | zh | 39 | ~80 |
| tongjian | zh | 20 | ~80 |
| eustathius-odyssey | grc | 20+ | ~70 |
| yili-zhushu | zh | 16 | ~30 |
| gongyang-zhushu | zh | 12 | ~20 |
| zuozhuan-zhengyi | zh | 6 | ~10 |
| zhouli-zhushu | zh | 4 | ~4 |
| carmina-graeca | grc | 4 | ~7 |
| guliang-zhushu | zh | 2 | ~9 |
| zhouyi-zhengyi | zh | 3 | ~5 |
| fengsutongyi | zh | 1 | 4 |
| baihu-tong | zh | 1 | 1 |
| erya-zhushu | zh | 1 | 2 |
| guliang-zhuan | zh | 1 | 1 |
| historia-nova | grc | 1 | 1 |
| liji-zhengyi | zh | 1 | 1 |
| liji-zhushu | zh | 1 | 1 |
| rizhilu | zh | 1 | 1 |
| yashodhara-kaviyam | ta | 1 | 5 |
| udayanakumara-kaviyam | ta | 1 | 1 |

**Estimated Total Empty Paragraphs: ~350**

---

## Part 4: Fix Plan

### Phase 1: Fix Empty/Placeholder Paragraphs (Chinese, Greek, Latin, Italian)
Use `scripts/fill-translation-gaps.ts` which:
- Scans for empty paragraphs with non-empty source
- Translates only the missing paragraphs
- Creates new TranslationVersion with gaps filled

**Command:** `pnpm tsx scripts/fill-translation-gaps.ts --delay 3000`

### Phase 2: Fix Armenian Texts
Armenian texts need `scripts/translate-armenian.ts`:

1. **kaitser** (74 missing chapters)
   - `pnpm tsx scripts/translate-armenian.ts --text kaitser --start 1 --end 38 --delay 5000`
   - `pnpm tsx scripts/translate-armenian.ts --text kaitser --start 41 --end 76 --delay 5000`

2. **arshagouhi-teotig** (21 missing + 2 placeholder chapters)
   - `pnpm tsx scripts/translate-armenian.ts --text arshagouhi-teotig --start 1 --end 35 --delay 5000`

3. **anna-saroyan** (14 missing + 1 placeholder chapter)
   - `pnpm tsx scripts/translate-armenian.ts --text anna-saroyan --start 1 --end 23 --delay 5000`

### Phase 3: Fix Chinese Missing Chapters
- **yili-zhushu** chapters 49-51
  - `pnpm tsx scripts/translate-batch.ts --text yili-zhushu --start 49 --end 51 --delay 3000`

### Phase 4: Tamil Empty Paragraphs
- **yashodhara-kaviyam** ch1: 5 empty
- **udayanakumara-kaviyam** ch1: 1 empty

These need `scripts/translate-tamil.ts` with `--retranslate` flag or manual gap filling.

---

## Progress Log

### 2026-01-24 — Initial Audit
- [x] Catalogued all gaps via database queries
- [x] Created this audit document
- [ ] Phase 1: Fill empty/placeholder paragraphs (zh/grc/la)
- [ ] Phase 2: Translate missing Armenian chapters
- [ ] Phase 3: Translate missing Chinese chapters
- [ ] Phase 4: Fix Tamil empty paragraphs

---

## Notes

1. The existing `scripts/_check-translation-gaps.ts` found 186 chapter entries with issues (some chapters appear multiple times due to multiple translation versions).

2. Empty paragraphs are often caused by:
   - API timeout during translation
   - JSON parsing errors
   - Source paragraphs that are very long or contain unusual characters

3. Armenian texts have the most missing content because the translation workers were started recently and may not have completed.

4. The `fill-translation-gaps.ts` script only handles empty paragraphs, not placeholders. Placeholder paragraphs need different handling (they need to be identified and retranslated).
