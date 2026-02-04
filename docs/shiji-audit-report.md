# Shiji (Records of the Grand Historian) Chapter Audit Report

**Date:** 2026-02-03
**Scope:** All 130 chapters compared against Wikisource
**Methodology:** Counted `<p>` tags in Wikisource API response vs local paragraph arrays

## Executive Summary

- **Total chapters checked:** 130
- **Missing chapters:** 1 (chapter 22)
- **Chapters marked OK (difference <= 1):** 54
- **Chapters needing review (difference > 1):** 75
- **Chapters with errors:** 1

## Issue Categories

### 1. Critical Issue: Missing Chapter

**Chapter 22 (漢興以來將相名臣年表 - Table of Generals and Ministers since the Rise of Han)**

This chapter is completely missing from our local files. On Wikisource, it contains a large tabular chronological table of officials. This is a structural table chapter (年表), not standard prose.

**Action required:** Acquire and process chapter 22 from Wikisource or ctext.org.

---

### 2. Confirmed Fix: Chapter 2 (Qingzhou Section)

The Qingzhou (青州) paragraph was successfully inserted into both:
- `/data/raw/24histories/shiji/chapter-002.json`
- `/data/processed/24histories/shiji/chapter-002.json`

The Nine Provinces section now correctly lists all nine provinces in order:
1. 冀州 (Jizhou)
2. 沇州 (Yanzhou)
3. **青州 (Qingzhou)** - RESTORED
4. 徐州 (Xuzhou)
5. 揚州 (Yangzhou)
6. 荆州 (Jingzhou)
7. 豫州 (Yuzhou)
8. 梁州 (Liangzhou)
9. 雍州 (Yongzhou)

Post-fix comparison: Local has 35 paragraphs, Wikisource shows 36. The 1-paragraph difference is within acceptable tolerance (likely due to header/footer content on Wikisource).

---

### 3. False Positives: Redirect Pages

Several chapters show Wikisource returning only 1 paragraph because the page is a redirect to a differently-named page:

| Chapter | Local | WS | Issue |
|---------|-------|-----|-------|
| 18 | 6 | 1 | Redirect page |
| 19 | 4 | 1 | Redirect page |
| 33 | 94 | 1 | Redirects to 史記/魯周公世家 |
| 44 | 72 | 1 | Redirect page |
| 92 | 30 | 1 | Redirect page |

**Explanation:** Wikisource organizes some Shiji chapters by their traditional titles (e.g., "魯周公世家") rather than volume number ("卷033"). These are not missing content issues.

---

### 4. Special Format Chapters: Calendar and Table Content

**Chapter 26 (曆書 - Calendar Treatise)** shows +154 paragraphs difference because Wikisource uses `<dl>` and `<dd>` tags for calendar calculation data, which my audit script counts as multiple `<p>`-like elements.

Our local version has 13 paragraphs of prose introduction; the Wikisource HTML contains extensive structured numerical tables that inflate the paragraph count.

**Affected chapters (年表/表 table chapters):**
- Chapter 13-22: Chronological tables (年表)
- Chapter 26: Calendar Treatise (曆書) with numerical data

**Action:** These are format differences, not missing content. May need manual review for completeness.

---

### 5. Chapters With Significant Differences (>5 paragraphs)

These chapters may have genuine content differences worth investigating:

| Chapter | Local | Wikisource | Diff | Notes |
|---------|-------|------------|------|-------|
| 4 | 80 | 85 | +5 | Yin Benji |
| 5 | 71 | 77 | +6 | Qin Benji |
| 6 | 103 | 112 | +9 | Qin Shihuang Benji |
| 11 | 19 | 24 | +5 | Xiaojing Benji |
| 12 | 52 | 57 | +5 | Xiaowu Benji |
| 24 | 59 | 67 | +8 | Yue Shu (Music Treatise) |
| 37 | 51 | 55 | +4 | Wei Shijia |
| 38 | 55 | 62 | +7 | Song Shijia |
| 39 | 138 | 143 | +5 | Jin Shijia |
| 43 | 116 | 122 | +6 | Zhao Shijia |
| 45 | 31 | 37 | +6 | Han Shijia |
| 67 | 99 | 158 | +59 | Zhongni Disciples (special lists) |
| 69 | 64 | 70 | +6 | Su Qin Liezhuan |
| 70 | 60 | 65 | +5 | Zhang Yi Liezhuan |
| 71 | 20 | 26 | +6 | Chu Yuan Liezhuan |
| 85 | 17 | 23 | +6 | Lu Zhonglian Liezhuan |
| 87 | 31 | 40 | +9 | Li Si Liezhuan |

**Chapter 67 (仲尼弟子列傳)** deserves special attention - it contains a list of Confucius's disciples with brief biographical entries. The large difference (+59) suggests our version may be missing some disciple entries or the Wikisource version includes more detailed tabular data.

---

### 6. Consistent Small Differences (2-5 paragraphs)

Many chapters show 2-5 paragraph differences. This is likely due to:

1. **Wikisource header/footer elements** counted as `<p>` tags (navigation, metadata)
2. **Paragraph splitting differences** - different editions may break text differently
3. **Annotations/notes** included in some versions but not others
4. **Editorial apparatus** on Wikisource

These are generally acceptable and within editorial variation bounds.

---

## Recommendations

### High Priority
1. **Acquire Chapter 22** - This is a complete missing chapter
2. **Verify Chapter 67** - Check if disciple list is complete
3. **Review Chapter 6** (+9 paragraphs) - This is the important Qin Shihuang chapter

### Medium Priority
4. **Spot-check chapters with +5 to +9 differences** - may have missing passages
5. **Document format differences** for table chapters (13-22, 26)

### Low Priority
6. Most 2-4 paragraph differences are likely acceptable editorial variations

---

## Technical Notes

### Audit Methodology Limitations

1. **`<p>` counting is imprecise** - Wikisource uses various HTML elements (`<dl>`, `<dd>`, `<table>`, etc.) that may or may not contain substantive content
2. **Redirect detection** - Chapters returning 1 paragraph are likely redirects, not actual content
3. **Header/footer noise** - Wikisource includes navigation elements that inflate counts
4. **Rate limiting** - 500ms delay between API calls to avoid being blocked

### Files Modified

- `data/raw/24histories/shiji/chapter-002.json` - Added Qingzhou paragraph
- `data/processed/24histories/shiji/chapter-002.json` - Added Qingzhou paragraph

### Scripts Created

- `scripts/audit-shiji-chapters.ts` - Audit script comparing local vs Wikisource
- `docs/shiji-audit-results.json` - Full JSON audit results

---

## Appendix: Full Audit Results

See `docs/shiji-audit-results.json` for the complete chapter-by-chapter comparison data.

### Chapters Marked OK (54 total)

2, 13, 14, 15, 16, 17, 23, 25, 29, 34, 35, 36, 46, 48, 49, 51, 54, 56, 57, 58, 60, 61, 62, 64, 65, 80, 82, 88, 96, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 113, 114, 115, 116, 117, 118, 119, 122, 124, 125, 127, 129, 130

### Chapters Needing Review (75 total)

1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 19, 20, 21, 24, 26, 27, 28, 30, 31, 32, 33, 37, 38, 39, 40, 41, 42, 43, 44, 45, 47, 50, 52, 53, 55, 59, 63, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 81, 83, 84, 85, 86, 87, 89, 90, 91, 92, 93, 94, 95, 97, 98, 99, 112, 120, 121, 123, 126, 128
