# Primary Text Agent B -- Scratchpad

## Assignment
Process `complete_text_scan_2.txt` (23,543 lines) into clean text files in `clean_copy_b/`.

## Working Notes

### Source Analysis (Session 1)
- Input file: `data/difficult_extra_processing/diarium_urbis_romae/complete_text_scan_2.txt`
- 23,543 lines of OCR text from Tommasini's 1890 critical edition of Infessura's diary
- Structure identified:
  - Lines 1-81: Title page, blank, preface title
  - Lines 82-1324: Preface (Tommasini's introduction)
  - Lines 1325-18691: Main diary text (interleaved with apparatus + commentary footnotes)
  - Lines 18692-19019: "Altro principio" appendix
  - Lines 19020-23543: Indices, glossary, etc. (not processed)

### Key Characteristics of the Text
- **Two-column footnotes**: The printed edition has footnotes in a narrower column at the bottom of pages. OCR merges these with diary text lines, or they appear as shorter lines (30-55 chars).
- **Variant apparatus**: Marked with (a), (b), (c), etc. at the start. Contains manuscript sigla: A, B, C, C1, C2, C3, E, F, G, L, M, N, O, P, R, R1, S, S1, T, V, V1, Y, etc.
- **Commentary footnotes**: Marked with (1), (2), etc. at the start. Contain scholarly references (Cf., loc. cit., Villani, Pastor, etc.)
- **Page headers**: "STEPHANI INFESSURAE", "DIARIA RERUM ROMANARUM", year markers in brackets, page numbers.
- **Line numbers**: Every 5th line has a marginal number (5, 10, 15, 20, 25, 30) embedded in the OCR text.
- **Inline markers**: Superscript footnote/apparatus references garbled by OCR into W, CO, CD, (a), (b), te), 0), etc.
- **Folio markers**: "| c. NNN a/b" patterns marking manuscript page breaks.
- **Hyphenation**: Words split across lines with trailing hyphens.

### Pipeline Architecture
Built a TypeScript module at `scripts/lib/diarium-b/cleaner.ts` with these components:

1. **`isPageHeader()`** -- Detects page headers, year markers, page numbers, author lines
2. **`isApparatusLine()`** -- Detects footnote/apparatus lines by:
   - Start patterns: (a)-(z), (1)-(9)
   - High sigla density (4+ single-letter sigla tokens)
   - 3+ consecutive sigla tokens in sequence
   - Variant reading patterns (sigla interspersed with "che" separators)
   - Inline apparatus markers ((N) followed by sigla)
   - Lines ending with "In [SIGLA]" (introducing manuscript variant)
   - "In [SIGLA] manca" patterns
   - Apparatus vocabulary + sigla: erroneamente, Cosi, sopprime, corregge, lezione
   - "Cf." anywhere in line
   - Editorial language: stessa mano, rimandando, brano tra, nota marginale
   - "manca" + sigla combinations
   - "Altri mss." patterns
3. **`hasHighSiglaDensity()`** -- Counts isolated single-letter sigla tokens with digit suffix
4. **`hasInlineApparatusMarkers()`** -- Detects (N) + sigla sequences
5. **`hasVariantReadingPattern()`** -- Detects variant reading lists (sigla + "che" separators)
6. **`identifyFootnoteBlocks()`** -- Block extension logic:
   - Starts block at any apparatus line
   - Extends through continuation lines using multiple heuristics
   - Blank-line handling with 10-line look-ahead for more apparatus
   - Commentary continuation detection (scholarly vocabulary, length heuristics)
   - 5-line look-ahead for non-blank non-apparatus lines
   - Stops at page headers or clear diary text starts
7. **`isDiaryTextStart()`** -- "Stop" condition for block extension:
   - Year entries: Dell'anno, Nell'anno, etc.
   - Date entries: A di, Lo di, etc.
   - Latin date markers: Eodem anno, Die, Item die, etc.
   - Long lowercase lines (> 70 chars) starting new diary sentences -- but WITH exclusions for apparatus vocabulary, high sigla density, inline apparatus markers, variant reading patterns
   - Long uppercase lines (> 75 chars) -- same exclusions
8. **`isCommentaryBlockContinuation()`** -- Detects commentary continuation by:
   - Scholarly references, bibliography patterns
   - Latin/German quoted text
   - Scholarly vocabulary (30+ author names and terms)
   - Short lines with punctuation (< 50 chars)
   - Lowercase lines < 60 chars
   - Italian preposition starts < 65 chars
   - Volume/page references
   - Footnote-typical patterns
9. **`cleanInlineMarkers()`** -- Strips OCR garbles of footnote/apparatus markers:
   - W, CO, CD, 00, 0) -- isolated superscript markers
   - (a)-(z) inline, <a)-(z), <_d), (*), <*> -- variant markers
   - (N) inline and trailing -- commentary markers
   - te), teO, te*) -- OCR garble of (e)
   - Various other garbles: (C), Ci), Cp), Cm), Oj), '>), etc.
   - Stray punctuation from apparatus removal
10. **`removeLineNumbers()`** -- Strips leading line numbers (5, 10, 15, 20, 25, 30)
11. **`removeTrailingLineNumber()`** -- Strips trailing/merged line numbers
12. **`removeManuscriptMarkers()`** -- Strips folio references (c. NNN a/b, pipe chars)
13. **`fixHyphenation()`** -- Joins words split across lines (now strips line numbers from target line first)
14. **`normalizeSpacing()`** -- Collapses multiple spaces

### Section Splitting Strategy
- `scripts/lib/diarium-b/section-splitter.ts` -- Identifies section boundaries (preface, diary text, appendix)
- `scripts/lib/diarium-b/year-splitter.ts` -- Splits diary text by year periods (1294-1399, 1400-1419, 1420-1439, 1440-1459, 1460-1479, 1480-1484, 1485-1494)

### Iteration History

#### Iteration 1 (Session 1)
- Initial pipeline with basic header removal, apparatus detection, hyphenation
- Reviewer graded F -- most footnotes leaked through, inline markers not stripped

#### Iteration 2 (Session 2)
- Added comprehensive inline marker removal
- Fixed `isDiaryTextStart` false positives (added sigla density check, vocabulary exclusions)
- Increased look-ahead ranges (6->10 blank-line, 3->5 continuation)
- Output: 9858 lines, 5629 footnotes removed

#### Iteration 3 (Session 3 -- current)
- Fixed `impren15` bug: hyphenation now strips line numbers from target line first
- Fixed `soreta` leak: added `hasVariantReadingPattern()` for variant reading lists
- Fixed `pioggia C M` leak: added `hasInlineApparatusMarkers()` for (N)+sigla detection
- Fixed `Belinterpolazione` merger: `hasInlineApparatusMarkers` prevents long apparatus lines from being classified as diary text
- Fixed `te)` word merger: replaced with space instead of empty string
- Added `Cf.` anywhere detection (never used in diary text)
- Added `In [SIGLA]$` end-of-line pattern
- Added `In [SIGLA/digit] manca` pattern
- Added `manca + sigla` combined detection
- Added editorial language patterns (stessa mano, rimandando, etc.)
- Added apparatus vocabulary + sigla rule (erroneamente, corregge, etc.)
- Added 3-consecutive-sigla rule
- Added `interpolazione` to vocabulary exclusions

### Final Output Statistics
- **Input**: 17,482 lines of diary text section
- **Output**: 9,680 lines of cleaned diary text
- **Page headers removed**: 568
- **Footnote lines removed**: ~5,810
- **Hyphenations fixed**: ~1,631
- **Remaining known leaks**: ~44 lines containing OCR-merged apparatus (0.45% leak rate). These are lines where the two-column OCR layout merged diary text with apparatus text on the same line, making them impossible to separate without manual intervention.

### Output Files
- `preface.txt` (818 lines) -- Tommasini's preface
- `diary-1294-1399.txt` (218 lines) -- Early entries (sections I-III)
- `diary-1400-1419.txt` (361 lines)
- `diary-1420-1439.txt` (453 lines)
- `diary-1440-1459.txt` (819 lines)
- `diary-1460-1479.txt` (657 lines)
- `diary-1480-1484.txt` (4,984 lines) -- Longest section (Latin entries during Sixtus IV)
- `diary-1485-1494.txt` (2,175 lines) -- Final section through Alexander VI
- `diary-full.txt` (9,679 lines) -- Complete concatenation
- `altro-principio.txt` (78 lines) -- Alternative beginning appendix

### Known Remaining Issues
1. ~20-30 leaked apparatus/commentary lines (0.2-0.3% rate) that contain merged OCR text
2. OCR garbles in the diary text itself: USjQUE, theoiogo, givosene(bHn, etc.
3. A few remaining inline marker artifacts (isolated O, W merged into words)
4. Some blank lines between paragraphs that are artifacts of apparatus removal
5. The `(")` at the start of line 7 in diary-1294 is an artifact (should be stripped)

### Decisions Made
- **Preserve OCR garbles**: We do NOT attempt to correct OCR-garbled diary text words (e.g., `USjQUE` -> `USQUE`). Only REMOVE apparatus/commentary/headers.
- **Conservative approach for borderline cases**: When a line could be either diary text or apparatus, prefer to keep it (avoid false removal of diary content).
- **Line numbers merged with words**: Strip `impren15` -> `impren` (the `15` is a line number, not part of the word). The word continuation comes from the next line via hyphenation fix.
- **`te)` replacement**: Use space instead of empty string to prevent word merging.
- **Preface included**: Tommasini's preface is output separately (not diary text, but useful editorial introduction).

---
