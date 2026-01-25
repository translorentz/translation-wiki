# Primary Text Reviewer B — Scratchpad

## Assignment
Review and critique Primary Text Agent B's work on scan 2. Communicate via `joint-b.md`.

## Working Notes

### 2026-01-24: Initial Review

**Status of Agent B's work:** Agent B has produced 10 files in `clean_copy_b/`:
- `preface.txt` (1,068 lines)
- `altro-principio.txt` (145 lines)
- `diary-1294-1399.txt` (381 lines)
- `diary-1400-1419.txt` (633 lines)
- `diary-1420-1439.txt` (653 lines)
- `diary-1440-1459.txt` (1,337 lines)
- `diary-1460-1479.txt` (1,050 lines)
- `diary-1480-1484.txt` (6,486 lines)
- `diary-1485-1494.txt` (2,936 lines)
- `diary-full.txt` (13,488 lines)
Total: 28,177 lines across all files.

**Agent B has NOT posted any methodology or notes** in the scratchpad or joint-b.md.

### Critical Findings — SEVERITY: VERY HIGH

Agent B's output is essentially a LIGHTLY PROCESSED copy of the OCR text. The only cleaning performed appears to be:
1. Collapsing extra spaces between words
2. Removing title pages / front matter
3. Splitting into year-range files

**The following are NOT removed (all are required removals):**

1. **FOOTNOTES** — Scholarly footnotes remain in the text.
   - Example (preface.txt line 22-24): "1 Arcb. Soc. rotti, si. patr. XI, 481-640." / "2 Io. Georgii Eccardi Corpus bistoric. medii devi, voL II."
   - In diary files: long footnote paragraphs with "Cf.", "loc. cit.", "ed. cit.", scholarly citations

2. **CRITICAL APPARATUS / MANUSCRIPT VARIANTS** — Lines beginning with (a), (b), (c), etc. that record textual variants between manuscripts.
   - 49+ instances in diary-1480-1484.txt alone
   - Example: "(a) Rx per amor della guerra de Toscana"
   - Example: "(b) E e li fraticelli (c) R1 che lo fraporioni"

3. **PAGE HEADERS** — "STEPHANI INFESSURAE", "O. TOMMASINI", "PREFAZIONE." remain
   - 6 instances of "STEPHANI INFESSURAE" in diary-1480-1484.txt alone
   - Multiple "O. TOMMASINI" in preface

4. **LINE NUMBERS** — Numbers 5, 10, 15, 20, 25 embedded in body text (every-5th-line numbering from the printed edition)
   - Example: "la campana di Anagni sonava a stuormo..." has "5" at the start
   - "io et lo papa respus'e..." has "io" which is actually "10"

5. **FOOTNOTE REFERENCE MARKERS** — Superscript indicators like (a), (b), W, te), to), etc. remain inline
   - "(") pontificalmente" — this is a manuscript variant marker
   - "li Colonnesi W" — "W" is a footnote indicator
   - "Benedictus XI (f) b\ 1 0" — garbled footnote reference

6. **FOLIO REFERENCES** — "c 1 B", "c. 53*" — manuscript folio references remain
   - "| che voleva far c 1 B" — folio ref embedded in text

7. **YEAR MARKERS IN BRACKETS** — "[1304]", "[1405]", "[H82]", "[*A%4]" — page headers with year
   - Should be stripped; the year appears in the text itself

8. **SCHOLARLY COMMENTARY** — Extended commentary passages from Tommasini remain mixed with diary text
   - Entire paragraphs of Italian/Latin scholarly notes
   - References to other scholars' works (Gregorovius, Creighton, Voigt, etc.)

### Quality Grade: F (FAIL)

The output cannot be considered "clean text" in any meaningful sense. The fundamental task — separating Infessura's diary text from the editorial apparatus — has not been performed. What Agent B produced is essentially the OCR text with whitespace normalized, which represents perhaps 5-10% of the total cleaning work required.

### Structural Observations

The file structure (splitting by year ranges) is reasonable, but:
- The preface file includes the chronological concordance table (dates list) which is editorial, not Infessura's text
- The preface includes Tommasini's editorial footnotes
- The "Altro principio" section mixes diary text with footnotes and apparatus

### What Correct Cleaning Requires

For each page of the diary text:
1. Remove the page header (STEPHANI INFESSURAE / DIARIO DELLA CITTA DI ROMA)
2. Remove the line numbers (5, 10, 15, 20, 25 at margins)
3. Remove footnote markers from the body text: (a), (b), W, CO, 00, (c>, etc.
4. Remove the entire critical apparatus block (lines beginning (a), (b), etc.)
5. Remove all footnotes (numbered notes with scholarly references)
6. Remove folio references (| c XX)
7. Rejoin hyphenated words across lines
8. Normalize whitespace
9. Preserve ONLY Infessura's actual narrative text

### Technical Analysis -- Pipeline Scripts

Agent B wrote TWO sets of modules:
- `scripts/lib/diarium/` -- more sophisticated cleaner (not used by main script)
- `scripts/lib/diarium-b/` -- the modules actually imported by `scripts/clean-diarium-b.ts`

The `diarium-b/` cleaner has correct architecture:
1. First pass: identify footnote blocks via `identifyFootnoteBlocks()`
2. Second pass: skip footnote lines, remove page headers, strip line numbers/markers
3. Normalize spacing, fix hyphenation, collapse blank lines

Root cause of failures:
The detection heuristics are too conservative and miss many OCR-garbled patterns:
- Year headers with garbled digits: [i4o4], [H82], [*A%4]
- Apparatus lines with garbled parentheses: <a) instead of (a)
- Short apparatus lines with only 2-3 sigla (threshold set at 4)
- Commentary continuations not matching "Croniche", volume/page patterns
- Inline markers (W, CO, 00, (c>, etc.) not stripped at all

The pipeline has the right skeleton but needs approx 50% more pattern coverage.

### Bridge Annotations Status

No cross-team observations have been posted yet. Will check back after Agent B updates.

### 2026-01-24: Re-evaluation of Iteration 3

**Grade: B- (below sign-off threshold of B+)**

Major improvement from the initial F. Agent B's pipeline now works fundamentally correctly -- the vast majority of footnotes, apparatus blocks, and commentary have been removed. The output reads as coherent diary narrative for most of its 9,679 lines.

**Quantitative findings:**
- 43 page headers remain (STEPHANI/INFESSURAE/DIARIA RERUM + garbled year markers)
- 54 apparatus lines with manuscript sigla leaked through
- 143 inline footnote markers (Cg), Ce), W, CO, etc.)
- 42 folio references
- ~15 commentary lines
- 35 hyphenation remnants
- Total: ~337 items with artifacts (~3.5% of lines)
- Substantive issues (could corrupt translation): ~112
- Cosmetic issues (harmless noise): ~178

**What Agent B got RIGHT:**
- 5,800+ footnote lines correctly removed
- 568 page headers correctly removed
- 1,631 hyphenations correctly fixed
- All explicit `(a)`-`(z)` apparatus line starts removed
- "Cf.", "loc. cit.", "ed. cit." completely eliminated
- Gregorovius/Creighton scholarly references almost fully eliminated (1 leak)
- Commentary paragraphs largely removed
- Pipe characters fully removed
- Output correctly reduced from 17,500 to 9,679 lines

**What still needs fixing:**
1. OCR-garbled page headers not caught by regex (STEPHAKI, STEPHATKl, rNFESSURAE, [i484], [H39], etc.)
2. Lines with 2+ manuscript sigla (R1, C1, M, S, V combinations) not removed
3. `C[a-z]\)` pattern inline markers not stripped (OCR garble of `(a)` footnote refs)
4. Standalone W and CO not stripped
5. Folio references `c. NNN` not stripped

**Decision: Request iteration 4 with 3 targeted fixes.** The fixes are mechanical regex improvements, not architectural changes. Agent B's pipeline skeleton is sound; it just needs expanded pattern coverage for OCR garbling.

### Next Steps

1. Re-evaluation written in joint-b.md -- DONE
2. Wait for Agent B to implement fixes 1-3
3. Review iteration 4 when available
4. Sign off expected at B+ if fixes are applied correctly

---
