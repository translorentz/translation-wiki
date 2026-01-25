# Primary Text Agent A — Scratchpad

## Assignment
Process `complete_text_scan_1.txt` (22,565 lines) into clean text files in `clean_copy_a/`.

## Source File Structure Analysis (22,565 lines)

| Section | Lines | Description |
|---------|-------|-------------|
| Title pages | 1-73 | Istituto Storico Italiano masthead, title, publisher |
| Copyright notice | 74-80 | "DIRITTI RISERVATI" |
| PREFAZIONE | 82-1112 | Tommasini's scholarly preface (pp. VII-XXXII) |
| Diary title | 1115-1126 | Latin title "STEPHANI INFESSURAE CIVIS ROMANI..." |
| Diary text (main) | 1128-17544 | The actual diary (1294-1494) with interleaved footnotes |
| "Altro principio" | 17566-17755 | Alternative beginning (1294-1305), Italian |
| INDICE | 17758-22449 | Index of names, glossary, corrections |
| CONTENUTO DEL VOLUME | 22488-22531 | Table of contents |
| Colophon/library card | 22532-22564 | Printer info + U of Toronto library card |

## OCR Patterns Identified

### Page Headers (must remove)
- Odd pages: `[YEAR]  DIARIA  RERUM  ROMANARUM.  PAGE_NUM`
- Even pages: `PAGE_NUM  STEPHANI  INFESSURAE  [YEAR]`
- Also: `PREFAZIONE.  ROMAN_NUM` in the preface
- Also: `O.  TOMMASINI` or `O.TOMMASINI` (author running header)

### Footnote Patterns (must remove)
- Apparatus criticus: Lines starting with `(a)`, `(b)`, `(c)` etc., citing ms. sigla
- Scholarly notes: Lines starting with `(1)`, `(2)`, `(3)` etc.
- Multi-line footnotes: scholarly notes can span many lines with citations

### Within-text Markers (must remove)
- Footnote call markers: `(^)`, `(')`, `(^*)`, `W`, `<^)`, `(°)`, etc.
- Folio references: `e.  NNN  A/B`, `c.  NNN  a/b`
- Line numbers: editorial 5/10/15/20/25/30 at start of lines
- Manuscript page breaks: `||`

### OCR Errors
- Extra whitespace between words
- Garbled Roman numerals: Vili=VIII, Ili=III
- Garbled page numbers in headers
- Hyphenated words across lines
- `RERUMROMANARUM` missing space, `ROMAN ARUM` with space
- Some lowercase in headers: `stephani  infessurae`

## Cleaning Strategy

### Approach: Multi-pass TypeScript Pipeline
1. Split into sections (title pages, preface, diary, altro principio, index)
2. For preface: remove page headers + footnotes, rejoin hyphens, normalize spaces
3. For diary: remove page headers + footnotes + folio refs + line numbers + markers, rejoin hyphens, normalize
4. For "altro principio": same as diary cleaning
5. Discard: title pages, index, colophon (not part of the text itself)

### Key Decisions
- REMOVE footnotes entirely (both apparatus and scholarly) — they are editorial
- REMOVE footnote markers in text — editorial addition
- REMOVE folio references — manuscript metadata
- REMOVE line numbers — editorial numbering
- REMOVE `||` markers — manuscript page breaks
- KEEP the year headings (Dell'anno, Nell'anno, etc.) as section markers
- KEEP Latin section titles (I., II., etc.)
- Split output by year ranges for manageability

## Progress
- [x] Analyzed full file structure
- [x] Identified all patterns to clean
- [x] Designed pipeline strategy
- [x] Built TypeScript modules in scripts/lib/diarium/ (5 files)
- [x] Processing preface (597 output lines)
- [x] Processing diary (7360 output lines, split into 6 period files)
- [x] Processing "altro principio" (65 output lines)
- [x] Writing clean output files
- [x] Documenting methodology in joint-a.md

## Pipeline Results (Final — 12 iterations)

| File | Lines | Content |
|------|-------|---------|
| `preface.txt` | 597 | Tommasini's scholarly preface |
| `diary-full.txt` | 7360 | Complete diary text |
| `diary-1294-1377.txt` | 113 | Entries 1294-1377 |
| `diary-1378-1417.txt` | 362 | Entries 1378-1417 |
| `diary-1418-1447.txt` | 612 | Entries 1418-1447 |
| `diary-1448-1464.txt` | 562 | Entries 1448-1464 |
| `diary-1465-1484.txt` | 4140 | Entries 1465-1484 |
| `diary-1485-1494.txt` | 1603 | Entries 1485-1494 |
| `altro-principio.txt` | 65 | Alternative beginning (1294-1305) |

### Statistics (Main Diary)
- Total input lines: 16,438
- Page headers removed: 248
- Footnote lines removed: 6,943
- Folio references removed: 16
- Line numbers removed: 280
- Inline markers cleaned: 6,064
- Hyphenated words rejoined: 1,038
- Output lines: 7,360

### Known Remaining Issues
1. Some garbled characters within words remain (OCR misreadings): `afHrmatum`=affirmatum, `nuUo`=nullo, `coUeio`=collegio, `H`=li, `wcti`=tutti
2. Occasional standalone `j` between words (garbled `;`)
3. Some residual marker fragments: `('X`, `0)`, `C>)`, `i)`, `(°^`
4. Some blank lines remain where footnote blocks were removed mid-paragraph
5. Year-splitter finds only 38 top-level year entries; many entries within years use "A dì", "Eodem anno", "Die" — these are not split further
6. The "Nell'anno I3i4" entry has garbled year (should be 1314 or 1313)

---
