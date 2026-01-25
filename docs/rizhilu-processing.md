# Rizhilu (日知錄) Processing Documentation

## Source File
- **Path**: `data/raw/rizhilu/pg25262.txt`
- **Size**: 16,880 lines (~1.5 MB)
- **Origin**: Project Gutenberg eBook #25262
- **Encoding**: UTF-8 (simplified Chinese)

## About the Text

**Title**: 日知錄 (Rizhilu) - "Record of Daily Knowledge" or "Record of Knowledge Gained Day by Day"

**Author**: 顧炎武 (Gu Yanwu, 1613-1682)
- One of the greatest scholars of the early Qing dynasty
- Founder of the "practical learning" (實學) and evidential research (考據學) movements
- Known for his meticulous philological and historical investigations

**Genre**: Scholarly miscellany (筆記/札記) covering:
- Classical philology and textual criticism
- History and historical geography
- Government and political institutions
- Ethics and philosophy
- Economics and local customs

**Composition**: Compiled over 30+ years of study; the preface mentions "積三十餘年，乃成一編" (accumulated over more than thirty years, forming this compilation).

## Integrity Check Results

### Volume Structure
- **Total volumes**: 32 (all present, ●卷一 through ●卷三十二)
- **Total sections**: 1,010 (marked with ○ symbol)
- **Content ends**: Line 16521 (last line of actual text)
- **Gutenberg footer starts**: Line 16530

### Volume Statistics
| Volume | Lines | Sections |
|--------|-------|----------|
| 卷一 | 452 | 53 |
| 卷二 | 480 | 41 |
| 卷三 | 365 | 42 |
| 卷四 | 717 | 76 |
| 卷五 | 562 | 49 |
| 卷六 | 406 | 50 |
| 卷七 | 573 | 56 |
| 卷八 | 546 | 14 |
| 卷九 | 652 | 20 |
| 卷十 | 359 | 13 |
| 卷十一 | 535 | 17 |
| 卷十二 | 431 | 15 |
| 卷十三 | 661 | 37 |
| 卷十四 | 359 | 22 |
| 卷十五 | 541 | 19 |
| 卷十六 | 330 | 17 |
| 卷十七 | 585 | 21 |
| 卷十八 | 505 | 23 |
| 卷十九 | 352 | 18 |
| 卷二十 | 490 | 30 |
| 卷二十一 | 610 | 35 |
| 卷二十二 | 387 | 21 |
| 卷二十三 | 656 | 41 |
| 卷二十四 | 575 | 50 |
| 卷二十五 | 318 | 17 |
| 卷二十六 | 528 | 29 |
| 卷二十七 | 1034 | 19 |
| 卷二十八 | 372 | 25 |
| 卷二十九 | 383 | 21 |
| 卷三十 | 417 | 25 |
| 卷三十一 | 793 | 51 |
| 卷三十二 | 864 | 43 |

### Issues Found
1. **Line 15223**: Volume marker ●卷三十一 appears inline with preceding text (not on its own line)
   - Text: `盖伯有为厉，理固有之。而蕃俗之畏鬼神，则又不可以常情论矣。●卷三十一`
   - **Solution**: Split at ●卷 marker during processing

2. **Preface**: Short author's preface before 卷一 (lines 37-40)
   - Will be included as Chapter 0 or merged with Chapter 1

3. **Character encoding**: Text uses simplified Chinese (现代简体字)
   - This is fine for processing; no conversion needed

## Chapter Structure Decision

**Decision**: One chapter per volume (32 chapters total)

**Rationale**:
- Volumes are reasonably sized (300-1000 lines each)
- The 32-volume structure is the traditional division of the work
- Each volume has a coherent topical focus
- Breaking into 1010 tiny chapters (one per section) would be unwieldy

**Preface handling**: Include as a prologue paragraph in Chapter 1

## Processing Rules

1. **Strip Gutenberg boilerplate**:
   - Header: Lines 1-28 (before "日知錄")
   - Footer: Lines 16530+ (after "*** END OF THE PROJECT GUTENBERG EBOOK")

2. **Volume markers**: `●卷一`, `●卷二`, etc.
   - Become chapter boundaries
   - Extract volume number for chapter title

3. **Section markers**: `○` followed by section title
   - Create new paragraph with the title as the first line
   - Content of the section follows in subsequent lines until next ○ or ●

4. **Paragraph handling**:
   - Text is mostly continuous prose wrapped at arbitrary line lengths
   - Join lines within a section until a blank line or new marker
   - Each section becomes one or more paragraphs

5. **Chapter titles**: Use format "日知錄 卷X (Rizhilu Vol. X)"

## Output Format

```json
{
  "chapterNumber": 1,
  "title": "日知錄 卷一 (Rizhilu Vol. 1)",
  "sourceContent": {
    "paragraphs": [
      { "index": 1, "text": "○三易\n夫子言包羲氏始画八卦..." },
      { "index": 2, "text": "○重卦不始文王\n大卜裳《三易》之法..." }
    ]
  }
}
```

## Processing Script
- **Script**: `scripts/process-rizhilu.ts`
- **Output**: `data/processed/rizhilu/chapter-001.json` through `chapter-032.json`

## Seed Database Entry

### Author
```typescript
{
  slug: "gu-yanwu",
  name: "Gu Yanwu",
  nameOriginalScript: "顧炎武",
  era: "1613-1682",
  description: "One of the greatest scholars of the early Qing dynasty, known for his emphasis on practical learning (實學) and evidential research. His Rizhilu represents decades of philological, historical, and philosophical investigation."
}
```

### Text
```typescript
{
  slug: "rizhilu",
  title: "Record of Daily Knowledge (Rizhilu)",
  titleOriginalScript: "日知錄",
  authorSlug: "gu-yanwu",
  languageCode: "zh",
  description: "A monumental work of Qing scholarship compiled over 30 years, covering philology, textual criticism, history, geography, government, and ethics. Gu Yanwu's rigorous evidential approach influenced generations of scholars.",
  sourceUrl: "https://www.gutenberg.org/ebooks/25262",
  textType: "prose",
  processedDir: "data/processed/rizhilu",
  compositionYear: 1670,
  compositionEra: "Early Qing Dynasty"
}
```

## Translation Notes

The Rizhilu covers diverse topics requiring broad knowledge:
- Classical Chinese philology (經學)
- Historical geography (地理考證)
- Institutional history (制度史)
- Textual criticism (校勘學)

The DeepSeek translation should handle this well given its training on Chinese classical texts. The language-specific prompt for zh already includes Neo-Confucian terminology guidance, which is partially applicable here.

## Translation Status

**Started**: 2026-01-24

**Workers**:
- Worker 1: chapters 1-8 (log: /tmp/rizhilu-worker1.log)
- Worker 2: chapters 9-16 (log: /tmp/rizhilu-worker2.log)
- Worker 3: chapters 17-24 (log: /tmp/rizhilu-worker3.log)
- Worker 4: chapters 25-32 (log: /tmp/rizhilu-worker4.log)

**Parameters**: `--delay 5000` (5 seconds between chapters)
