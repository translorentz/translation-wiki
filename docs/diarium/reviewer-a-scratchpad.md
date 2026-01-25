# Primary Text Reviewer A — Scratchpad

## Assignment
Review and critique Primary Text Agent A's work on scan 1. Communicate via `joint-a.md`.

## Working Notes

### Session 1 (2026-01-24)

#### Initial Review of Agent A's Output

Agent A has produced output files in `clean_copy_a/`:
- `preface.txt` (40KB)
- `diary-1294-1377.txt` (10KB)
- `diary-1378-1417.txt` (31KB)
- `diary-1418-1447.txt` (49KB)
- `diary-1448-1464.txt` (44KB)
- `diary-1465-1484.txt` (341KB)
- `diary-1485-1494.txt` (133KB)
- `diary-full.txt` (610KB)
- `altro-principio.txt` (6KB)

#### Key Findings

The output is severely contaminated with footnote material. The footnote removal pipeline fails because:

1. **Scholarly footnotes** (starting with `(1)`, `(2)`, etc.) are multi-line and their continuations look like normal prose. The `looksLikeFootnoteContinuation()` heuristic catches almost NONE of them.

2. **Two-column footnote layout**: The Tommasini edition prints scholarly notes in two columns at the page bottom. OCR captures these as interleaved short lines from left and right columns. This distinctive pattern (alternating half-width lines with bibliographic content) is not detected.

3. **Apparatus criticus continuations** (the `(a)`, `(b)` lines that list manuscript variants) also span multiple lines and their continuations are not caught.

#### Understanding the Source Text Layout

Each "page" in the OCR follows this structure:
```
[page header: YEAR DIARIA RERUM ROMANARUM PAGE_NUM or PAGE_NUM STEPHANI INFESSURAE YEAR]

[diary text with editorial line numbers 5/10/15/20/25/30 at margins]
[diary text continues...]

[apparatus criticus: (a) ... (b) ... etc., listing variant readings]
[apparatus may span 2-4 lines]

[scholarly notes: (1) ... (2) ... etc., often in TWO COLUMNS]
[scholarly notes may span 10-20 lines]

[next page header]
```

The KEY insight is: within each page block, footnotes are ALWAYS at the bottom. The first `(a)` or `(1)` line marks the transition from diary text to footnotes, and everything from there to the next page header is footnotes.

#### Specific Patterns in Two-Column Footnotes

The two-column scholarly footnotes create a distinctive OCR pattern:
- Lines are shorter than normal diary text (typically 30-50 chars vs 60-80)
- Left and right column content alternates
- Content includes: author names, "loc. cit.", "Cf.", volume/page numbers, Latin quotations in guillemets
- They appear between the apparatus criticus block and the next page header

#### Footnote Call Marker Inventory

From sampling the source text, these inline markers appear in the diary text:
- `(^)`, `(')`, `(o)`, `(ss)`, `W` (at line start)
- `(0`, `(**)`, `(^^)`, `(^>`, `(^*)`, `('')`
- `(.)`, `<^)`, `(=)`, `(^^^)`
- Garbled versions: `(**\`, `C'^)`, `(0,`
- Superscript numbers in parens: `(')`, `(^^)`, `('')`

#### What Agent A's Code Does Well

- Page header detection (`isPageHeader`) is quite thorough with many patterns
- The section boundary detection (`splitter.ts`) correctly identifies the structural sections
- The year splitting logic works for clean year headers
- Hyphen rejoining handles the basic case correctly
- Space normalization works

#### What Needs Fixing (Priority Order)

1. Footnote removal must use positional/structural detection (page boundary approach)
2. Footnote call markers need much broader regex coverage
3. Folio reference patterns need expansion
4. Garbled line number detection
5. `||` -> `|` OCR variants

#### Wrote Critique

Full critique posted to `joint-a.md` under "Reviewer A's Critique". Grade: D.
Main recommendation: switch from content-based heuristics to position-based footnote detection using page boundaries.

#### Waiting For

- Agent A to respond and update its pipeline
- Bridge reviewer annotations (none yet)

### Round 2 Review (after Agent A's code revision)

Agent A rewrote cleaner.ts (14KB -> 24KB) with proper tagging system and footnote state propagation. Massive improvement -- scholarly footnotes now removed, diary text reads coherently.

**Grade: D -> B-**

Remaining issues (all fixable with regex additions):
- ~80 single pipe `|` chars (garbled `||` page breaks)
- ~37 folio references surviving (regex too narrow)
- ~30 garbled line numbers at line start (OCR: IO=10, etc.)
- ~200+ footnote call markers in various garbled forms
- 3 `W` markers at line start
- 1 apparatus line leak in altro-principio (`(a.)` pattern)

All of these are incrementally fixable. The structural problem (footnote removal) is now SOLVED. What remains is regex pattern expansion for edge cases.

Posted Round 2 critique to joint-a.md.

### Additional Quantitative Analysis (Round 2 Addendum)

After detailed grep analysis of `diary-full.txt`:
- `^^` caret sequences: ~280 remaining (most common surviving marker)
- `W` mid-line markers: ~50+ remaining (before punctuation)
- `|` single-pipe: ~80 remaining (garbled `||`)
- Folio references: ~37 remaining (various patterns)
- Line numbers at line END: ~50+ (right-margin editorial numbers)
- Line numbers at line START (garbled): ~30 (IO=10, etc.)

All posted as addendum to joint-a.md Round 2.

### Completeness Verification

Checked critical test case: paragraph split across page boundary (lines 3355-3389 in source). The hyphen-rejoining correctly reconnects "Ro-" + "mani" across the footnote block. The diary text is COMPLETE -- no content lost.

The year-splitter has a minor issue: "EL 1378..." is not recognized as a year header (only "Dell'anno", "Nell'anno", "Anno Domini" are recognized). This causes the 1378 entry to land in the 1294-1377 file. MINOR issue.

### Assessment Summary

- **Round 1 Grade: D** (footnotes not removed)
- **Round 2 Grade: B-** (footnotes removed, but ~500 inline artifacts remain)
- **Needed for Grade A**: Fix the ~500 remaining OCR artifacts (all regex-based fixes)
- **Text completeness: VERIFIED** (no diary content lost)
- **Text coherence: GOOD** (diary reads as narrative)

### Round 3 Review: REGRESSION DETECTED

Agent A updated cleaner.ts (24.7KB -> 29.4KB) with good improvements to inline markers BUT introduced a regression in footnote detection. The new "long line = break out of footnote mode" heuristic (line 694) is too aggressive and lets footnote text back in.

- **File sizes INCREASED**: diary-full.txt went from 355KB to 524KB (+48%)
- **Footnote material has leaked back**: apparatus criticus lines, scholarly footnotes survive
- **Grade: C+** (regressed from B-)

The Round 3 inline marker improvements are GOOD. The Round 2 footnote detection logic was better. Agent A needs to combine both.

Posted Round 3 critique to joint-a.md.

### Summary of Reviews

| Round | Cleaner Size | diary-full.txt | Grade | Key Issue |
|-------|-------------|---------------|-------|-----------|
| 1 | 14 KB | 610 KB | D | Footnotes not removed at all |
| 2 | 24.7 KB | 355 KB | B- | Good removal, residual markers |
| 3 | 29.4 KB | 524 KB | C+ | REGRESSION in detection logic |

**Best approach**: Round 2 footnote detection + Round 3 inline marker cleanup.

### Round 4 Review (Agent A's third code revision, 34.2KB)

Regression from Round 3 mostly fixed. Footnotes are being removed again. Inline markers improved.

Key metrics:
- diary-full.txt: 441 KB (between Round 2's 355KB and Round 3's 524KB)
- 21 "Cf." footnote lines still leak through (80-char threshold too low)
- 184 `^^` carets (down from 280 in Round 2)
- 172 `W` markers (still high -- regex doesn't catch `W.` and `W,`)
- 41 `|` pipes (down from 80 in Round 2)
- 16 folio references (down from 37 in Round 2)

**Grade: B** (up from C+ in Round 3, comparable to B- in Round 2 but with better inline cleanup)

Updated summary table:

| Round | Cleaner Size | diary-full.txt | Grade | Key Issue |
|-------|-------------|---------------|-------|-----------|
| 1 | 14 KB | 610 KB | D | Footnotes not removed at all |
| 2 | 24.7 KB | 355 KB | B- | Good removal, residual markers |
| 3 | 29.4 KB | 524 KB | C+ | REGRESSION in detection logic |
| 4 | 34.2 KB | 441 KB | B | Regression fixed, markers improved |

Remaining fixes needed for A-:
1. `/\sW([.,;:])(?=\s)/g` to catch W before punctuation (172 instances)
2. Aggressive `^^` and `^^\` removal (184 instances)
3. Raise footnote-escape threshold from 80 to 100+ chars (21 leaked footnotes)
4. Handle line-start garbled markers (`;`, `»`, `^`, `f`, `0`)
5. Handle `W` at absolute line start (3 instances)

Posted Round 4 critique to joint-a.md.

### Round 5 Review (Agent A's fourth revision, 38.0KB, output at 13:23)

Agent A fixed `W` before punctuation: 172 -> 3 instances. Other metrics unchanged.
**Grade: B+**

Summary of progress:
| Round | Cleaner Size | diary-full.txt | Grade | Key Fix |
|-------|-------------|---------------|-------|---------|
| 1 | 14 KB | 610 KB | D | (initial) |
| 2 | 24.7 KB | 355 KB | B- | Footnote state machine |
| 3 | 29.4 KB | 524 KB | C+ | REGRESSION (80-char escape) |
| 4 | 34.2 KB | 441 KB | B | Regression fixed (mostly) |
| 5 | 38.0 KB | 440 KB | B+ | W before punct fixed |

**CONDITIONALLY APPROVED** for translation pipeline use.

Remaining artifacts (all minor, all regex-fixable):
- 184 `^^` carets
- 41 `|` pipes
- 14 `W` markers
- 20 leaked footnote lines
- ~30 garbled line-start chars

---
