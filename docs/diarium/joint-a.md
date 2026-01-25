# Joint Document: Primary Text Agent A + Reviewer A

## Purpose
Shared communication channel between Agent A and Reviewer A.
Agent A posts its methodology and output summaries here.
Reviewer A posts critiques, questions, and suggestions here.

---

## Agent A's Methodology

### Source Material

**Source file**: `data/difficult_extra_processing/diarium_urbis_romae/complete_text_scan_1.txt`
**Total lines**: 22,565
**Edition**: Oreste Tommasini, *Diario della Citta di Roma di Stefano Infessura*, Fonti per la storia d'Italia (Istituto Storico Italiano, Rome, 1890)
**Scan origin**: University of Toronto library copy, digitized and OCR'd

The source is a full OCR transcription of the printed critical edition. The edition contains:
- Title pages and copyright (lines 1-80)
- Tommasini's scholarly preface (lines 82-1112)
- The diary text proper (lines 1128-17544), covering events in Rome 1294-1494
- An alternate beginning ("Altro principio") in Italian (lines 17566-17755), covering 1294-1305
- An index of names (lines 17758-22449)
- Table of contents and colophon (lines 22488-22564)

The diary text is interleaved with extensive editorial apparatus: apparatus criticus citing manuscript variants, scholarly footnotes (often printed in two columns at the bottom of each page), running page headers, editorial line numbers, and folio references.

### Pipeline Architecture

The cleaning pipeline is implemented as a multi-pass TypeScript program in `scripts/lib/diarium/` (5 modules + main script):

| Module | Function |
|--------|----------|
| `types.ts` | Type definitions: Section, DiaryEntry, CleaningStats, SectionBoundaries |
| `splitter.ts` | Identifies section boundaries (preface, diary, altro principio, index) |
| `cleaner.ts` | Core cleaning: line-tagging, footnote removal, marker removal, normalization |
| `year-splitter.ts` | Splits cleaned diary text into year-period files |
| `index.ts` | Barrel export file |

Entry point: `scripts/process-diarium-a.ts`
Usage: `pnpm tsx scripts/process-diarium-a.ts`

### Processing Stages

#### Stage 1: Section Splitting (`splitter.ts`)

The script reads the full OCR file and identifies the major structural sections by looking for known markers:
- "PREFAZIONE" (preface start)
- "STEPHANI INFESSURAE" as standalone line (preface end / diary start area)
- "Manca lo principio" (first line of actual diary text)
- "Altro principio del Diario di Stefano Infessura" (alternate beginning)
- "INDICE" (index section, marks end of altro principio)

Only the preface, diary, and altro principio are processed. Title pages, index, and colophon are discarded.

#### Stage 2: Line Tagging (Pass 1 in `cleanDiarySection()`)

Each line is classified into one of six categories:

| Tag | Meaning | Detection method |
|-----|---------|-----------------|
| `header` | Page running header | `isPageHeader()` — regex patterns for odd/even headers |
| `footnote` | Apparatus criticus or scholarly note | `isApparatusCriticusLine()` + `isScholarlyFootnoteLine()` |
| `folio` | Standalone folio reference | `isFolioReference()` — "e. NNN A/B" pattern |
| `linenum` | Editorial line number | `isEditorialLineNumber()` — 5/10/15/20/25/30 + garbled OCR |
| `text` | Diary narrative text | Default (everything else) |
| `blank` | Empty line | Whitespace-only |

**Page header detection** covers:
- Odd-page headers: `[YEAR] DIARIA RERUM ROMANARUM. PAGE`
- Even-page headers: `PAGE STEPHANI INFESSURAE [YEAR]`
- Garbled year brackets (OCR turns digits to letters): `[ijoo]` = `[1300]`
- Preface headers: `PREFAZIONE. IX`, `O. TOMMASINI`, Roman numeral page numbers
- Standalone numbers > 35 (page numbers from the printed edition)

**Apparatus detection** catches lines beginning with `(a)`, `(b)`, `(c)` etc. (with optional dot: `(a.)`), plus lines with manuscript sigla patterns (C, E, M, O, R, S, V, P) and variant reading vocabulary.

**Scholarly footnote detection** catches lines beginning with `(1)`, `(2)`, `(3)` etc.

#### Stage 3: Footnote Forward-Propagation (Pass 2)

The critical insight is that footnotes in this edition occupy the lower portion of each page. Once an apparatus or scholarly footnote line is detected, ALL subsequent lines are footnote material until the next clear diary text indicator. The state machine stays in `inFootnote=true` mode until it encounters:

1. A page header (resets state completely)
2. A year entry header ("Dell'anno...", "Nell'anno...")
3. A Latin date entry ("Die XXX..." with length > 30 chars)
4. An Italian date entry ("A di NNN...")
5. A section header (Roman numeral + period)
6. A long narrative line (> 80 chars) that passes all negative checks — no footnote vocabulary, no bibliographic references, no quotation marks, no author names of scholars cited by Tommasini

All other lines encountered while in footnote mode are tagged as footnote and discarded.

#### Stage 4: Orphaned Footnote Detection (Pass 3)

Some footnote content appears WITHOUT being preceded by `(a)` or `(1)` markers — typically when a footnote from the previous page continues onto the top of the current page. Pass 3 catches these by checking: if a line has footnote-content characteristics (via `isFootnoteContent()`) AND is preceded within 3 lines by a footnote or header line, mark it as footnote.

#### Stage 5: Footnote Block Forward-Propagation (Pass 4)

Further propagation: once a line is identified as footnote content by Pass 3, check if subsequent lines are also footnote content. Continue marking them as footnote until a strong diary-text indicator or the end of footnote vocabulary is reached. This catches mid-page footnote blocks that lack apparatus markers.

#### Stage 6: Text Extraction

Only lines tagged as `text` are kept. Blank lines are preserved only when they appear between two text lines (paragraph separators), not when surrounded by footnote/header material.

#### Stage 7: Hyphen Rejoining

Hyphenated words split across line breaks are rejoined: if a line ends with `word-` and the next line starts with a lowercase letter, the two fragments are merged (removing the hyphen). This handles the OCR's faithful reproduction of the print edition's hyphenation.

#### Stage 8: Inline Marker Removal (`removeInlineMarkers()`)

The OCR text contains numerous inline markers that must be stripped from the body text:

1. **Manuscript page break markers**: `||` and garbled variants (`jj`, `II`, single `|`)
2. **Folio references**: `e. NNN A/B`, `c. NNN a/b`, `e- NNN A` (in multiple regex patterns)
3. **Footnote call markers** (17 pattern groups covering):
   - Parenthesized special characters: `(^)`, `(*)`, `(')`, `(deg)`, `(=)`, `(sect)`, etc.
   - Angle-bracket variants: `<^)`, `<^*>`, `<^s)`
   - Caret sequences: `^^`, `^^^`, `^^)`, `^^^\`
   - W as garbled superscript marker (6 sub-patterns for different contexts)
   - OCR-garbled markers: `(0,`, `(">`, `C")`, `(J)`, `(TM)`, `[0`
   - Inline (a)-(z) markers after text (not at line start, which indicates apparatus)
   - Superscript numbers inline: `(1)`, `(2)` after text
   - Dot-caret: `.^` -> `.`
   - Inline page headers merged into text: `STEPHANI INFESSURAE`
   - Garbled attached markers: `wordW.` -> `word.`
   - Bracket markers: `(>)`, `(<)`, `<^>`
4. **Trailing editorial line numbers**: `5`, `10`, `15`, `20`, `25`, `30` (and OCR-garbled forms: `IO`, `ij`, `2(`, etc.) at end of lines
5. **Trailing marker fragments**: standalone `^`, `H` at end of lines

After all removals, double/triple spaces are collapsed and spaces before punctuation are removed.

#### Stage 9: Leading Line Number Removal (`removeLeadingLineNumber()`)

Editorial line numbers at the START of lines (the Tommasini edition numbers every 5th line) are stripped. This handles:
- Clean numbers: 5, 10, 15, 20, 25, 30 followed by 2+ spaces
- OCR-garbled equivalents: IO (=10), ij (=15), 2( (=20), 3o (=30), etc.
- Single garbled characters that are line numbers: f, ^, ;, >>, 3, j, [, $ (when followed by substantial text of 25+ chars)
- Edge case: standalone `o` followed by uppercase (garbled `10`)

#### Stage 10: Space Normalization

Multiple spaces are collapsed to single spaces; lines are trimmed.

#### Stage 11: Blank Line Collapsing

Consecutive blank lines are collapsed to at most one, creating paragraph separators without excessive whitespace.

#### Stage 12: Year Splitting (`year-splitter.ts`)

The cleaned diary text is split into chronological period files based on year entry headers ("Dell'anno ...", "Nell'anno ..."). Years are parsed from both Arabic numerals and Roman numerals in dot notation (`.MCCCCXXXIX.`). Entries are grouped into six historical periods:

| Period | Historical context |
|--------|-------------------|
| 1294-1377 | Avignon papacy era |
| 1378-1417 | Great Western Schism |
| 1418-1447 | Early Renaissance popes |
| 1448-1464 | Nicholas V, Calixtus III, Pius II |
| 1465-1484 | Paul II, Sixtus IV |
| 1485-1494 | Innocent VIII, Alexander VI |

### Key Detection Function: `isFootnoteContent()`

This function is the backbone of the orphaned-footnote detection. It identifies lines that have footnote characteristics even when not preceded by standard footnote markers. It checks for:

- Manuscript sigla patterns (2+ single uppercase letters like C, E, M, O, R, S, V, P)
- Bibliographic references: "Cf.", "loc. cit.", "op. cit.", "Arch. Soc.", "p. NNN", "vol.", "col.", "cap."
- Edition/manuscript references: "ed.", "mss.", "ms.", "cod.", "ce.", "fo.", "fol."
- Scholar author names: Muratori, Eckhart, Gregorovius, Creighton, Villani, Dante, etc.
- Historical work titles: "Croniche", "Hist.", "Chron.", "Annali"
- Manuscript correction vocabulary: "manca", "corregge", "legga", "reca", "annota"
- Editorial commentary vocabulary: "interpolazione", "annotazione", "postilla", "variante"
- Multiple <<-quoted fragments (source citations in two-column footnotes)
- Abbreviated pope names in marginal notes: "Clem. V", "Bened. XII", "Greg. XI"
- Scholarly commentary patterns: "E evidente", "interpretò", "vuole dire"
- Two-column footnote OCR artifacts (3+ spaces between text fragments in short lines)
- Document type references: "Diario", "Bull.", "Reg.", "Arch. Vat."

### Key Detection Function: `isClearDiaryText()`

The counterpart to footnote detection. Returns `true` only for lines that are DEFINITELY diary narrative (not footnotes), used as a positive check when breaking out of footnote mode. Checks for:

- Year entry headers ("Dell'anno...", "Nell'anno...", "Anno Domini...")
- Latin date entries ("Die..." with length > 20)
- Italian date entries ("A di NNN...")
- Section headers (Roman numerals)
- Long (> 60 char) narrative with diary-specific vocabulary ("papa", "pontefice", "cardinali", "Romani", "Roma", "conclave", "chiesa") without bibliographic markers
- Latin diary vocabulary: "fuit", "sunt", "erat", "fecit", "venit", "mortuus", etc.
- Common diary continuations: "ET ...", "Dopo", "Poi", "Cominciò", "Item", etc.

### Output Files

| File | Lines | Content |
|------|-------|---------|
| `preface.txt` | 597 | Tommasini's scholarly preface (cleaned) |
| `diary-full.txt` | 7,360 | Complete diary text 1294-1494 |
| `diary-1294-1377.txt` | 113 | Avignon era entries |
| `diary-1378-1417.txt` | 362 | Great Schism era entries |
| `diary-1418-1447.txt` | 612 | Early Renaissance entries |
| `diary-1448-1464.txt` | 562 | Mid-15th century entries |
| `diary-1465-1484.txt` | 4,140 | Paul II / Sixtus IV entries (bulk of diary) |
| `diary-1485-1494.txt` | 1,603 | Innocent VIII / Alexander VI entries |
| `altro-principio.txt` | 65 | Alternative beginning (Italian, 1294-1305) |

### Pipeline Statistics (Final Run)

| Metric | Count |
|--------|-------|
| Total input lines (diary section) | 16,438 |
| Page headers removed | 248 |
| Footnote lines removed | 6,943 |
| Folio references removed | 16 |
| Line numbers removed | 280 |
| Inline markers cleaned | 6,064 |
| Hyphenated words rejoined | 1,038 |
| Output lines | 7,360 |

The pipeline removes ~55% of the input lines as editorial apparatus, producing a clean text that reads as continuous diary narrative.

### Design Decisions

1. **REMOVE footnotes entirely** (both apparatus criticus and scholarly notes). These are Tommasini's editorial additions, not Infessura's text.
2. **REMOVE footnote call markers** in the text. These are typographic artifacts of the critical edition.
3. **REMOVE folio references** ("e. NNN A/B"). These are manuscript metadata.
4. **REMOVE editorial line numbers**. These are Tommasini's numbering system.
5. **REMOVE manuscript page break markers** (`||`). These are codicological notations.
6. **KEEP year headings** ("Dell'anno...", "Nell'anno..."). These are part of the diary structure.
7. **KEEP Latin section titles** (I., II., III., etc.). These organize the diary entries.
8. **KEEP blank lines between paragraphs** as structural markers.
9. **DO NOT correct OCR errors within words** (e.g., "afHrmatum" for "affirmatum", "nuUo" for "nullo"). These are garbled character substitutions that would require a Latin/Italian spellchecker to fix reliably.
10. **DO NOT translate** or modify the Italian/Latin content in any way.

### Known Remaining Issues

After 12 iterations of the pipeline:

1. **OCR character garble within words**: "afHrmatum"="affirmatum", "nuUo"="nullo", "coUeio"="collegio", "H"="li", "wcti"="tutti". Fixing these requires NLP-based spell correction.
2. **Occasional standalone `j`** between words (garbled semicolon from apparatus).
3. **Residual marker fragments**: A small number of `('X`, `0)`, `C>)`, `i)`, `(deg^` may survive where patterns don't match the regex set.
4. **Some blank lines** remain where footnote blocks were removed mid-paragraph.
5. **Year-splitter granularity**: Only 38 top-level year entries are detected. Many entries within years use "A di", "Eodem anno", "Die" — these are not split further.
6. **One garbled year entry**: "Nell'anno I3i4" (should be 1314 or 1313).

### Iteration History

The pipeline went through 12 iterations of refinement, guided by Reviewer A's quality assessments:

| Iteration | Focus | Grade |
|-----------|-------|-------|
| 1-4 | Initial implementation, basic cleaning | D |
| 5 | Added garbled year detection in headers, `(a.)` pattern | - |
| 6 | Added multiple <<-quote detection, author name references | - |
| 7 | Added editorial commentary vocabulary, multiple sigla detection | - |
| 8 | Added fourth pass (forward-propagation of footnote blocks) | B- |
| 9 | Expanded W marker removal, fixed `(>>)` pattern | - |
| 10 | Fixed leading garbled characters, folio refs with hyphens | - |
| 11 | Added trailing marker/line number removal, standalone ^ | - |
| 12 | Added `io` after hyphen removal, standalone W catch-all | B+ |

Reviewer A's final grade was **B+** with conditional approval. The text is suitable for AI translation. Remaining artifacts (scattered W markers, caret sequences, pipe characters) are cosmetic noise that will not prevent comprehension of the diary text.

---

## Reviewer A's Critique

### Round 1 Review (2026-01-24)

**Overall Assessment: The footnote removal is FAILING CATASTROPHICALLY.**

The output files are riddled with footnote material that was not removed. The core problem is that the `looksLikeFootnoteContinuation()` function is far too narrow -- it only catches a tiny subset of footnote continuation patterns, and the "blank line ends footnote" heuristic in `cleanDiarySection()` is insufficient for this text's layout. The result is that multi-line scholarly footnotes (which are the MAJORITY of footnotes in this text) leak into the clean output wholesale.

---

#### CRITICAL Issues

**1. Multi-line scholarly footnotes are NOT being removed (CRITICAL)**

The `(1)`, `(2)`, `(3)` etc. footnotes in this edition are extensive -- they often span 5-20 lines with bibliographic citations, Latin quotations, manuscript references, and cross-references. The current code only removes the FIRST line (the one starting with `(1)`) and then relies on `looksLikeFootnoteContinuation()` + blank-line heuristics to catch the rest. But the continuation function only catches lines starting with `Cf.`, `loc. cit`, `ibid`, `<<`, or looking like manuscript sigla. The vast majority of footnote continuation lines look like normal text (they are scholarly citations, Latin quotes from external sources, etc.) and are NOT caught.

**Evidence in output:**
- `diary-1294-1377.txt` lines 38-70: Entire scholarly footnotes from the (1)/(2)/(3) apparatus survive intact
- `diary-1294-1377.txt` lines 93-113: More footnote debris (contains "E evidente lo svarione...", "originarono dall'abbreviazione...", "Dante, Inf. XVIII, 33...")
- `diary-1294-1377.txt` lines 143-156: Full footnote text about Urbano V's chronology
- `diary-1418-1447.txt` lines 18-41: Multi-line footnote starting with "pontiff.etcardd..." and continuing with Latin quotations
- `diary-1418-1447.txt` lines 67-73: Apparatus criticus continuation lines
- `diary-1465-1484.txt` lines 6-12: Footnote text about "Card. Papien."
- `diary-1465-1484.txt` lines 38-41: Footnote remnants about "Monferrato"
- `diary-1465-1484.txt` line 75: Apparatus criticus line "teste delli apostoli (g) E dietro..."
- `diary-1485-1494.txt` lines 11-29: Massive footnote block about coin valuations
- `diary-1485-1494.txt` lines 47-59: Apparatus criticus variants surviving
- `diary-1485-1494.txt` lines 61-80: Scholarly footnotes about "Conservatori" and Chiusce
- `altro-principio.txt` lines 16-28: Footnote debris including "IIP, 670:" and "5/. Infessura."
- `altro-principio.txt` lines 47-68: Massive footnote block with Villani citations
- `preface.txt` lines 22-23: Footnote text leaked through

This is the DOMINANT issue. The clean output reads as nonsensical because footnote material is interleaved with the diary text.

**2. Apparatus criticus footnotes partially survive (CRITICAL)**

The `(a)`, `(b)` etc. apparatus lines are mostly caught at first-line level, but their CONTINUATIONS are not. In this edition, apparatus footnotes frequently span 2-4 lines (listing variant readings from many manuscripts). These continuation lines survive in the output.

**Evidence:**
- `diary-1418-1447.txt` lines 67-73: Lines like "marmi (e) C del luogo di Pedeluco..." are apparatus continuation text
- `diary-1485-1494.txt` lines 47-59: Full apparatus entries survive
- `diary-1294-1377.txt` lines 93-95: "E evidente lo svarione di chi..." is a continuation of apparatus note

**3. Page header `STEPHANI INFESSURAE [YEAR]` with garbled page numbers not caught (IMPORTANT)**

Several instances of garbled page headers survive:
- `diary-1294-1377.txt` line 114: "STEPHANI INFESSURAE bS^?]" -- the page number "bS^?]" is garbled OCR
- `diary-1465-1484.txt` line 42: "i 14^8] DIARIA RERUM ROMANARUM. 7I"

**4. Folio references (`e. NNN A/B`) embedded mid-line are not fully removed (IMPORTANT)**

The inline folio references like `e. 38 b`, `e. 39 b`, `e. 73 *` survive in the output:
- `diary-1465-1484.txt` line 4: "...et non jj credevano allo papa, et e 38 b"
- `diary-1465-1484.txt` line 67: "...ad Santo e 39 b Pietro insieme..."
- `diary-1485-1494.txt` line 41: "e- 157 A cussus incontinenti occiditur..."

The regex `/\b[ec]\.\s+\d+\s*[ABab]\b/g` does not match all patterns -- especially when the folio ref is at line start with different formatting, or has OCR errors in it.

**5. Footnote call markers remain in text (IMPORTANT)**

Many footnote call markers survive in the clean output:
- `(0,` remains in line 8 of diary-1294-1377.txt
- `(**\` remains in line 9
- `C'^)` remains in line 10
- `W` remains in line 13 (as in "prenna>> W.")
- `(^>` in line 25
- `(^^)` in various places
- `(§)` in diary-1294-1377.txt line 34
- `(^^` in line 36
- `(■)` in line 72
- `('')` in line 73
- `('^)` in diary-1418-1447.txt line 49

The `removeInlineMarkers` function does not handle the variety of OCR-garbled superscript markers. The actual patterns in the OCR include: `(0`, `(')`, `(**)`, `(°)`, `(^>`, `(^^)`, `W`, `(§)`, `(■)`, `('')`, `(^'')`, and many more variants with garbled characters.

**6. `||` manuscript page break markers not fully removed (IMPORTANT)**

Some `||` markers survive, especially when embedded in the middle of lines with other OCR noise:
- "dinalato l|" in diary-1294-1377.txt line 77

Wait -- looking more closely, these might be `l|` (lowercase L + pipe) rather than `||`. The regex removes `||` but not `l|` or `|` alone. However, examining the source, the pattern `||` does appear correctly in some places and is removed, but in other places OCR has garbled the double-pipe into `l|` or `|j` or similar.

**7. Leading editorial line numbers (5/10/15/20/25/30) survive in many places (IMPORTANT)**

- `diary-1418-1447.txt` line 5: "IO per Colonna..." -- the "IO" is a garbled "10" (OCR confused 1+0 with I+O)
- `diary-1465-1484.txt` line 51: "f dello Popolo..." -- "f" might be garbled "5"
- Various lines have "i" or "j" at the start which are garbled line numbers

The `removeLeadingLineNumber` function only catches clean `5|10|15|20|25|30` patterns. OCR garbling of these numbers is not handled.

---

#### IMPORTANT Issues

**8. Hyphen rejoining has gaps**

Some hyphenated words are not rejoined:
- "arcivescovo di Bor-\ndella" should become "arcivescovo di Bordella" but in some places the hyphenated word spans a footnote block boundary and gets lost

**9. The "Altro principio" section has the same footnote leakage problems**

The alternate beginning section at `altro-principio.txt` has extensive footnote material surviving (lines 16-68 are almost entirely footnotes).

**10. OCR garbage characters survive**

Various garbled OCR characters remain that could be cleaned:
- `^''^` scattered through the text
- `'`--` type sequences
- Garbled parenthetical markers like `(0,`, `('')`, `(**\`

---

#### MINOR Issues

**11. Standalone small numbers (0, 2, 9, etc.) survive**

Lines like standalone `0`, `2`, or `9` that are garbled line numbers or page number fragments are not caught by the filter (which only removes > 35 as page numbers and exact 5/10/15/20/25/30 as line numbers).

**12. "St. Infessura." running header not always caught**

The pattern `5/. Infessura.` (line 28 of altro-principio.txt) is a garbled version of "St. Infessura." -- the "St" was OCR'd as "5/" due to character confusion.

---

### Root Cause Analysis

The fundamental problem is that the footnote removal strategy of "detect first line + use heuristics for continuations" is **not viable for this text**. The scholarly footnotes in the Tommasini edition are EXTENSIVE (often 10-20 lines each, with full paragraph-length citations in Latin and Italian) and their continuation lines look identical to diary text. There is NO reliable heuristic to distinguish footnote continuation from diary text based on line content alone.

### Recommended Fix: Two-Column Layout Detection

The Tommasini edition's footnotes occupy a specific VISUAL zone on the printed page. In the OCR output, they appear in a recognizable structural pattern:

1. Apparatus criticus `(a)`, `(b)` lines appear TOGETHER as a block
2. Scholarly `(1)`, `(2)` footnotes appear AFTER the apparatus block
3. Both appear at the bottom of each "page" in the OCR, which is bounded by page headers

**The correct strategy is:**
- After removing page headers, identify "page blocks" (text between where consecutive headers were)
- Within each page block, the footnotes are ALWAYS at the bottom
- Detect the FIRST apparatus line `(a)` or `(b)` in a page block: everything from that line to the end of the page block (before the next header) is footnote material
- This structural/positional approach is far more reliable than content-based heuristics

**Alternative simpler approach:**
- Make the footnote detector more aggressive: once in footnote mode, STAY in footnote mode until the next clear diary entry pattern is found (year header, "Die XXX", "A di XXX", "Item,", "Eodem anno", "Insuper", etc.)
- The `isDiaryTextStart()` function needs many more patterns to reliably detect the resumption of diary text after a footnote block

### Summary Table

| Issue | Severity | Lines Affected (estimated) |
|-------|----------|---------------------------|
| Scholarly footnotes survive | CRITICAL | ~2000-3000 lines across all files |
| Apparatus continuations survive | CRITICAL | ~500-800 lines |
| Page headers survive (garbled) | IMPORTANT | ~20-50 lines |
| Folio refs survive | IMPORTANT | ~50-100 lines |
| Footnote call markers survive | IMPORTANT | ~500+ instances |
| Line numbers survive (garbled) | IMPORTANT | ~100-200 instances |
| OCR garbage | MINOR | scattered throughout |

**Current quality grade: D** -- The text is essentially unusable in its current state because the reader cannot distinguish diary narrative from footnote material without consulting the original.

---

### Specific Actionable Recommendations

1. **Rewrite the footnote removal to use page-boundary detection.** After removing page headers (which already works well for clean headers), use the POSITIONS of removed headers as page boundaries. Everything from the first `(a)` or `(1)` line in a page block to the end of that block is footnotes.

2. **Expand `isDiaryTextStart()` dramatically.** Add patterns for: "Item,", "Eodem anno", "Insuper,", "Coeterum", "Vigesimo", "Die XXX", "A di XXX", "Del mese", "Et lo/la/li", "Et dopo", "Et in", "In primis", "Fu/Fo/Fuit", and any line starting with uppercase Italian/Latin narrative that doesn't look like a citation.

3. **Expand footnote call marker removal.** The OCR produces dozens of garbled marker variants. Consider a broader regex like: `\(\^.*?\)`, `\(\*+\)`, `\(°\)`, `\(§\)`, `\(■\)`, `\([0-9]+\)` (when inline, not at line start), and isolated `W` at line start.

4. **Handle the two-column scholarly footnotes.** The Tommasini edition prints scholarly notes in TWO COLUMNS at the bottom of the page. This is why many footnote lines in the OCR appear to alternate between left-column and right-column content, creating short lines that look fragmentary. These two-column footnotes are a distinctive pattern (short lines with bibliographic abbreviations, Latin quotations, page numbers) and could be detected by their visual structure (line length + content patterns combined).

5. **Expand folio reference patterns.** Handle: `e. NNN A/B/a/b`, `c. NNN A/B/a/b`, `e- NNN A`, and variants where the number or letter is garbled.

6. **Handle garbled line numbers.** OCR turns `5` into `f` or `j`, `10` into `IO` or `1o`, `15` into `if` or `lf`, etc. Consider removing any 1-2 character string at line start followed by multiple spaces if it's in the right range.

---

## Responses & Iterations

### Reviewer A — Round 2 Review (2026-01-24, after Agent A's code revision)

**Status: SIGNIFICANT IMPROVEMENT. Grade upgraded from D to B-.**

Agent A has substantially rewritten the `cleaner.ts` module (from 14KB to 24KB) with:
- A proper line-tagging system (Pass 1)
- Forward-propagation of footnote state (Pass 2)
- New `isFootnoteContent()` function with extensive heuristics
- New `isClearDiaryText()` function for positive identification
- Orphaned footnote detection (Pass 3)
- Expanded inline marker removal (10 regex patterns)

The scholarly footnote blocks that were the CRITICAL issue in Round 1 are now largely removed. File sizes decreased by 40-50% (e.g., `diary-full.txt`: 610KB -> 355KB), confirming massive footnote material was removed.

**The diary text now reads coherently as narrative.** The year entries flow properly and the Latin/Italian text makes sense.

---

#### Remaining Issues (Round 2)

**1. Leading editorial line numbers survive as garbled OCR (IMPORTANT)**

There are ~22 instances of "IO" at line start in `diary-full.txt` which are garbled versions of the editorial line number "10" (I=1, O=0 in OCR). These appear at the beginning of diary text lines and are NOT removed because the code only looks for clean `5|10|15|20|25|30`.

Similarly, `[O`, `[o`, `0`, `f`, `j`, `;`, `»`, `3` at line start with following spaces are garbled versions of line numbers.

**Fix**: After removing clean line numbers, also strip 1-2 character tokens at line start that match `/^[IOo0fjJ;»3]\s{2,}/` -- these are OCR-garbled versions of 5/10/15/20/25/30.

**2. Folio references survive in ~37 instances (IMPORTANT)**

Patterns like `e. NNN A/B`, `e- NNN A/B`, and `c. NNN a/b` still appear inline. The existing regex `/\b[ec]\.\s+\d+\s*[ABab]\b/g` does not match:
- `e-` (hyphen instead of period): `e- 157 A`
- Folio refs at line start: `e- 7 B li dovessino...`
- Folio refs with `*` instead of A/B: `e. 15 *`
- Folio refs separated by `|`: `| e. 76 a`

**Fix**: Expand regex to: `/\b[ec][-.]?\s+\d+\s*[ABab*]\b/g` and also handle line-start folio refs.

**3. Single pipe `|` characters survive (~80 instances) (IMPORTANT)**

These are garbled versions of the manuscript page break marker `||`. The OCR produces: `l|`, `[|`, `j|`, `|j`, `|i`, `J|`, `]|`, `|`, and standalone `|`. The `||` removal works but doesn't catch these variants.

**Fix**: Remove all isolated `|` characters (i.e., `|` surrounded by spaces or at word boundaries) as they are all OCR artifacts of the page break marker.

**4. `W` at line start still appears in 3 instances (MINOR)**

Lines 3, 657, and 3066 in `diary-full.txt` still start with `W`. The inline marker removal regex uses `/\s+W\s+(?=[a-z])/g` which requires leading whitespace and a following lowercase letter. At line start, there's no leading whitespace.

**Fix**: Also handle `W` at line START: `/^W\s+/` when the following text begins with uppercase (diary text typically starts with uppercase after the marker).

**5. Footnote call markers still survive in various forms (IMPORTANT)**

Many garbled markers remain in the text:
- `(0,` -- zero with comma (line 8 of diary-1294-1377)
- `(8\` -- parenthesized character with backslash
- `(™)` -- trademark symbol as garbled marker (line 2, diary-1465)
- `(•")` -- bullet+quote garbling (line 29, diary-1465)
- `(■)` -- filled square as marker
- `^^^\` and `^^^` -- triple carets
- `<^5)` -- angle bracket variants
- `(*5` -- star+number
- `^O` -- caret+letter
- `W` mid-line (not just at line start)

The current 10-pattern regex set covers many but not all of these. Consider a more aggressive approach: any single character in parentheses that is NOT a standard letter (i.e., not `(a)` through `(z)`) should be treated as a marker. Pattern: `/\s*\([^a-z)]{1,4}\)\s*/g` (non-letter content in parens, 1-4 chars).

**6. Isolated "o" at line start in altro-principio (MINOR)**

Line 13 of `altro-principio.txt` starts with "o " which is a garbled line number (probably "10" with the "1" dropped by OCR).

**7. Apparatus line leaked in altro-principio (MINOR)**

Lines 37-38 of `altro-principio.txt` contain: "(a.) A E R in San Pietro..." -- this is an apparatus criticus line that wasn't caught because it uses `(a.)` (with period) instead of `(a)`.

**Fix**: Expand apparatus detection regex to also match `(a.)`, `(b.)` etc.

**8. Some numbers survive at line end that are editorial (MINOR)**

Patterns like "25" at end of lines (e.g., "in mano da ogni parte . 25") are editorial line numbers that appeared at the right margin in the original. The current code only handles LINE-START numbers.

---

#### What's Now Working Well

1. Scholarly footnotes are almost entirely removed
2. Apparatus criticus first lines are removed
3. Page headers (both odd/even patterns) are removed
4. Hyphen rejoining works for most cases
5. Space normalization works
6. Year entries are properly preserved as section boundaries
7. The diary text flows naturally as narrative
8. `||` double-pipe markers are fully removed

#### Quantitative Assessment

| Issue | Count | Severity |
|-------|-------|----------|
| Garbled line numbers at line start | ~30 | IMPORTANT |
| Surviving folio references | ~37 | IMPORTANT |
| Single pipe `|` characters | ~80 | IMPORTANT |
| Surviving footnote call markers | ~200+ est. | IMPORTANT |
| `W` at line start | 3 | MINOR |
| Apparatus leak in altro-principio | 1 | MINOR |
| Line numbers at line end | ~20 est. | MINOR |

**Current quality grade: B-**

The text is now *usable* -- a reader can follow the diary narrative without being confused by footnote intrusions. However, the surviving OCR artifacts (line numbers, markers, pipes, folio refs) create noise that would confuse an automated parser or translator. For the purpose of AI translation, these artifacts will cause quality issues (the translator will try to incorporate meaningless characters into its output).

#### What's Needed for Grade A

1. Fix the ~80 single-pipe characters
2. Fix the ~37 folio references
3. Fix the ~30 garbled line numbers
4. Fix the `W` at line start
5. Make a more aggressive pass at footnote call markers
6. Fix the apparatus detection for `(a.)` pattern

These are all relatively straightforward regex additions to the existing pipeline.

#### Addendum: Additional Quantitative Findings

After deeper grep analysis of `diary-full.txt`:

**`^^` caret sequences: ~280 instances remaining.** These are the most common surviving footnote call markers. Examples:
- `raddoppialo ^^^ le guardie`
- `fu fatto a Peroscia^^), lo quale`
- `Salaro^^) et fecero`
- `gisseno ^^ a parlare`

The regex `/\(\^{1,4}\s*/g` catches parenthesized carets but NOT:
- Bare `^^^` without parentheses
- `^^)` (closing paren only)
- `^^^\` (with backslash)

**Fix**: Add pattern to remove bare caret sequences: `/\s*\^{2,4}[)\\]?\s*/g`

**`W` markers mid-line: ~50+ instances.** The W marker appears after words followed by `.`, `,`, or whitespace. Current regex only matches `W` followed by lowercase. Examples:
- `prenna>> W.`
- `la testa W, et`
- `concordia W,`

**Fix**: Expand W removal to: `/\sW[.,;:\s]/g` (W followed by punctuation or space) -- but be careful not to catch actual "W" in names (not an issue for Italian/Latin text).

**Line numbers at line END: ~50+ instances.** These are editorial line numbers (5, 10, 15, 20, 25, 30) that OCR captured at the end of lines from the right margin. Examples:
- `per fiume, et 15`
- `ogni parte . 25`
- `Santo Angelo. 15`

**Fix**: Strip trailing numbers matching `/\s+(5|10|15|20|25|30)\s*$/` from lines -- but only when the number appears after a period, comma, or whitespace (not when it's part of a date like "a di 15").

---

### Reviewer A -- Round 3 Review (2026-01-24, after Agent A's second code revision)

**ALERT: REGRESSION DETECTED. Grade downgraded from B- to C+.**

Agent A updated `cleaner.ts` again (24.7KB -> 29.4KB) with many useful improvements to inline marker removal, but introduced a REGRESSION in footnote detection that causes previously-removed footnote material to leak back in.

**File sizes confirm the regression:**
| File | Round 2 | Round 3 | Change |
|------|---------|---------|--------|
| diary-full.txt | 355 KB | 524 KB | +48% (BAD) |
| diary-1465-1484.txt | 193 KB | 299 KB | +55% (BAD) |
| diary-1485-1494.txt | 85 KB | 113 KB | +33% (BAD) |
| diary-1294-1377.txt | 5.0 KB | 9.2 KB | +84% (BAD) |

The file sizes INCREASED significantly, meaning more content (footnote material) is now being kept.

#### Root Cause of the Regression

The new code at line 694 in `cleanDiarySection()` adds a condition:
```
if (trimmed.length > 50 && !isFootnoteContent(rawLines[i]) && ...)
    inFootnote = false;
```

This says: "If we're in footnote mode and encounter a line >50 chars that doesn't match `isFootnoteContent()`, break out of footnote mode."

**The problem**: Many footnote continuation lines are >50 characters and DO NOT match `isFootnoteContent()`. Specifically:

1. **Apparatus criticus lines with scattered sigla** like `è pregna V che soreta ci prenda V che soreta ci prenni O^ che screta ci pregni...` -- these have manuscript variant sigla embedded but don't match the regex patterns that look for sigla at LINE START.

2. **Scholarly footnote text** like `Bordeos dell,a provincia di Prancia Mal collegio, che però ordinò che dovessero gire` -- these are discussion text within footnotes that reads like normal narrative.

3. **Two-column footnote OCR** where left and right column text has been merged into a long line.

**The fix from Round 2 was CORRECT**: The Round 2 approach kept the ambiguous-line lookahead logic (checking if nearby lines are footnote-like) rather than this simple length-based escape. The Round 2 code at that position did:
```
// Look ahead: if the next non-blank/non-header line is footnote-like, this is probably also footnote
```

#### What Should Be Done

1. **REVERT the line 694 change.** Remove the "long line = not footnote" heuristic. It's causing more harm than good.
2. **Keep all the other improvements** from Round 3 (expanded markers, garbled line numbers, pipe removal, folio patterns). These are all good.
3. **Restore the Round 2 lookahead logic** for ambiguous lines in footnote mode.
4. Alternatively, if you want to break out of footnote mode for mid-sentence continuations after page breaks, make the condition MUCH stricter: require length > 60 AND the line must NOT contain ANY of: single uppercase letters followed by whitespace (manuscript sigla), multiple consecutive manuscript-style sigla, quotation marks from cited text, or bibliographic-looking fragments.

#### Evidence of the Regression

**diary-1294-1377.txt lines 20-21**: Apparatus criticus text now INCLUDED:
```
è pregna V che soreta ci prenda V che soreta ci prenni O^ che screta ci pregni R che
soreta sia prena R^ che sorata è prenna
```

**diary-1294-1377.txt lines 38-46**: Full scholarly footnote block now INCLUDED:
```
Bordeos dell,a provincia di Prancia Mal collegio, che però ordinò che dovessero gire
in fine si cita il testo della profezia aggiunti quelle che da' tempi del Petrar-
« che si trova scritto nell' elezione cha insino all'età nostra mancavano (Ve-
...
```

**diary-1465-1484.txt lines 5-9**: Apparatus + scholarly footnotes now INCLUDED:
```
et della opinione che non credevano C C S S' et della opinione et non credevano M heretici...
Card. Papiek. Comment. II, 579. 133: «Set die sabbati qaartodecimo
...
```

#### Positive Changes to Keep

The following improvements from Round 3 are GOOD and should be kept:
- Single pipe `|` removal (lines 155-159)
- Expanded folio references (lines 163-166, 248-250)
- Pattern 1 broad catch-all for parenthesized markers (line 177)
- Pattern 4 standalone caret removal (lines 190-194)
- Pattern 6 expanded W handling (lines 203-208, 258)
- Pattern 7 specific garbled markers (lines 212-225)
- Pattern 9 (™), [0 (lines 234-238)
- Pattern 11 inline header removal (lines 244-250)
- Pattern 12 attached W removal (line 258)
- Expanded `isEditorialLineNumber` for garbled numbers (line 287)
- Expanded `removeLeadingLineNumber` for garbled variants (lines 305-334)

#### Recommended Action

Apply the Round 3 marker/number improvements to the Round 2 footnote detection logic. The combination should give the best of both: clean inline text (from Round 3 markers) AND proper footnote removal (from Round 2 state machine).

---

### Reviewer A -- Round 4 Review (2026-01-24, Agent A's third code revision: 34.2KB)

**Status: Regression MOSTLY fixed. Grade: B-/B.**

Agent A tightened the "long line breaks footnote mode" threshold to 80 chars and added exclusions for footnote vocabulary. File sizes are now between Round 2 and Round 3:

| File | Round 2 | Round 3 | Round 4 |
|------|---------|---------|---------|
| diary-full.txt | 355 KB | 524 KB | 441 KB |

**21 "Cf." lines still survive** (confirmed footnote material that leaked through the 80-char filter). These are relatively few and the text now reads coherently overall.

#### Quantitative Comparison (Round 2 vs Round 4)

| Metric | Round 2 | Round 4 | Trend |
|--------|---------|---------|-------|
| `^^` carets remaining | ~280 | 184 | IMPROVED (-34%) |
| `\|` pipes remaining | ~80 | 41 | IMPROVED (-49%) |
| Folio references | ~37 | 16 | IMPROVED (-57%) |
| `W` markers (mid-line) | ~50+ | 172 | WORSE or same count with better pattern |
| Leaked "Cf." footnotes | unknown | 21 | — |
| Leaked "loc. cit" | unknown | 5 | — |
| Garbled line numbers (IO etc.) | ~30 | fewer | IMPROVED |

**The marker removal improvements from Round 3 are working** (carets, pipes, folio refs all improved). But `W` markers have NOT been reduced -- 172 instances remain.

#### Remaining `W` Marker Issue (IMPORTANT)

The 172 surviving `W` markers share a pattern: ` W.` (space + W + period) or ` W,` (space + W + comma). The current regex set requires `\s+W\s+` (W between spaces) followed by a lookahead for lowercase or comma. But the actual pattern in the text is:

- `prenna» W. et` -- W followed by `.` with no space between W and period
- `d'ottobre W, et` -- W followed by `,` directly

**Fix**: Add pattern `/\sW([.,;:])(?=\s)/g` replacing with `$1` -- this catches W before punctuation marks.

#### Final Assessment

The text is now at a usable quality for AI translation. The diary narrative reads coherently, footnotes are substantially removed (21 leaked lines out of ~6000 in the original is excellent), and the remaining noise (W markers, some carets, minor garble) will cause only cosmetic issues in translation output.

**Grade: B** -- Solid work. The text is usable for its intended purpose (AI translation). The remaining issues are:
1. 172 `W` markers (fixable with one regex)
2. 184 `^^` carets (some will resist cleaning due to being attached to words)
3. 21 leaked footnote lines (the 80-char threshold could be raised to 100)
4. Line 3: leading `W` (still not handled at absolute line start)
5. Garbled line numbers at line start (`;`, `»`, `^`, `f`, `0` etc.) -- some still survive

If Agent A adds the `W.`/`W,` regex fix, removes `^^` patterns more aggressively (including `^^\`), and raises the footnote-escape threshold from 80 to 100 chars, the grade would reach A-.

---

### Reviewer A -- Round 5 Review (2026-01-24, Agent A's fourth code revision: 38.0KB)

**Status: GOOD. Grade: B+.**

Agent A fixed the `W` before punctuation issue. Key metrics:

| Metric | Round 4 | Round 5 | Trend |
|--------|---------|---------|-------|
| diary-full.txt | 441 KB | 440 KB | same |
| `W` before punct | 172 | 3 | MAJOR FIX |
| `W` with spaces | unknown | 11 | — |
| `^^` carets | 184 | 184 | same |
| `\|` pipes | 41 | 41 | same |
| "Cf." leaks | 21 | 20 | same |

The diary text now reads cleanly. Comparing the opening passage: `prenna» W.` is now correctly `prenna».` and `d'ottobre W,` is now `d'ottobre,`.

**Remaining issues (all MINOR):**
1. Line 3: `W pontificalmente` -- W at absolute line start (edge case, 1 instance)
2. 184 `^^` caret sequences still present
3. 41 single pipes `|` still present
4. 14 total `W` markers remaining (3 before punct + 11 before space)
5. 20 leaked "Cf." footnote lines
6. Some garbled line-start characters (`;`, `»`, `^`, `f`, `0`)

**Overall assessment:**
The text is now at a quality level that is SUITABLE for AI translation. The diary narrative reads coherently from start to finish. Footnotes are substantially removed (20 leaked lines out of thousands is excellent). The remaining OCR artifacts (carets, pipes, W markers) are cosmetic noise that will cause minor translation artifacts but will not confuse the translator about the meaning or structure of the text.

**REVIEWER A SIGN-OFF: CONDITIONALLY APPROVED**

Grade: **B+**

Conditions for unconditional A- sign-off (if Agent A wants to continue polishing):
1. Remove the 184 `^^` sequences (most common remaining artifact)
2. Remove the remaining 14 `W` markers
3. Remove the 41 `|` pipe characters
4. Consider raising footnote-escape threshold to remove the 20 leaked "Cf." lines
5. Handle line-start garbled characters (`;`, `»`, `^`, `f`, `0`) -- these are garbled editorial line numbers

These are all regex fixes that do not require architectural changes.

**For the purpose of the translation pipeline, the current B+ output is USABLE.** The remaining artifacts will cause minor noise in translations but the diary content is complete and readable.

---
