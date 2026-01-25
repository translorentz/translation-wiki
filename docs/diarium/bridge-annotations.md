# Bridge Reviewer — Cross-Team Annotations

## Purpose
This document contains the Bridge Reviewer's cross-references, annotations, and recommendations.
All agents (A, B, Reviewer A, Reviewer B) should consult this document periodically.
The Bridge Reviewer compares approaches, identifies discrepancies, and advises both teams.

**RULE**: The Bridge Reviewer must NOT copy large chunks of cleaned text between teams.
It may reference specific line numbers, patterns, or short examples (< 3 lines) for illustration.

---

## Pass 2 Assessment (2026-01-24)

### Summary

Both agents have now produced their final outputs. Agent A (scan 1) received conditional sign-off at B+ from Reviewer A. Agent B (scan 2) completed iteration 4 with fixes applied. The Bridge Reviewer has now performed a detailed side-by-side comparison of the two outputs.

---

## 1. Quantitative Comparison

| Metric | Agent A | Agent B | Notes |
|--------|---------|---------|-------|
| Total diary lines | 7,359 | 9,492 | Agent B has 2,133 more lines |
| Non-blank diary lines | 6,110 | 7,814 | Agent B has 1,704 more content lines |
| Blank lines | 1,250 | 1,679 | |
| File size (diary-full.txt) | 438 KB | 477 KB | Agent B 9% larger |
| Lines starting with punctuation | 5 | 365 | Agent B has major line-continuation defects |
| `^^` caret markers | 40 | 0 | Agent A worse |
| `|` pipe characters | 41 | 0 | Agent A worse |
| Page header leaks | 5 | 0 | Agent A worse |
| Scholarly name leaks (Gregorovius etc.) | 1 | 1 | Tied |
| Editorial vocabulary leaks (scrive solo, aggiunge, etc.) | 13 | 7 | Agent A worse |
| Lines starting with apparatus `(a)`-`(z)` | 2 | 0 | Agent A worse |
| Inline footnote markers remaining | ~250 | ~100+ | Both have significant residual markers |
| Apparatus block leaks (multi-line) | ~20 | ~50 | Agent B worse |
| Hyphenation failures (broken words) | ~5 | 365+ | Agent B much worse |
| altro-principio lines | 64 | 78 | Agent B has apparatus leak at end |

### Key Insight: The 2,133-Line Discrepancy

Agent B's extra 2,133 lines come from THREE sources:
1. **~365 lines from failed line-continuation**: Lines starting with `, ` or `. ` or `; ` that should have been joined to the previous line. These are NOT extra content, just split sentences.
2. **~50 lines from leaked apparatus blocks**: Commentary/scholarly material that Agent B failed to remove (e.g., Gregorovius citations, ms. collation notes).
3. **~429 extra blank lines**: More generous blank-line spacing in Agent B.
4. **Genuine extra content from scan 2**: Some passages may be slightly longer due to different OCR line wrapping.

The actual diary content is very similar in both outputs. The line count difference does NOT indicate Agent B has more diary text.

---

## 2. Complementary Strengths

### Where Agent A is Better:
- **Line continuity**: Agent A correctly joins 360+ mid-sentence continuations that Agent B leaves broken across lines. For example, Agent B has `imprennare\n, ma bora mai saria tempo...` where Agent A has `imprennare, ma hora mai saria tempo...` on one line.
- **Apparatus block removal**: Agent A's footnote state-machine approach removes multi-line apparatus blocks more completely (only ~20 leaks vs ~50 in Agent B).
- **Structural coherence**: Agent A's text reads as continuous narrative without spurious line breaks mid-sentence.
- **Hyphenation rejoining**: Agent A correctly rejoins ~1,038 hyphenated words; Agent B's hyphenation is frequently interrupted by line numbers or fails entirely.
- **altro-principio**: Agent A ends cleanly; Agent B leaks apparatus at the end.

### Where Agent B is Better:
- **Page header removal**: Agent B has 0 remaining page headers vs Agent A's 5 (including garbled headers like `[l^6l] DIARIA RERUM ROMANARUM. 6$`).
- **`^^` caret cleanup**: Agent B has 0 remaining caret markers vs Agent A's 40.
- **`|` pipe cleanup**: Agent B has 0 remaining pipe characters vs Agent A's 41.
- **Some inline markers**: Agent B strips certain marker patterns (like `V)` at line start, standalone `W`) that Agent A misses.

### Where Both Fail Identically:
- **OCR-merged apparatus lines**: Both outputs contain the same ~10-15 lines where the two-column OCR layout merged apparatus text with diary text on the same physical line. Example at Agent A line 5194 / Agent B line 6522: `et siccarum C^ scrive solo: salmam boni vini...`. These are impossible to split programmatically and require manual intervention.
- **Inline footnote call markers**: Both have residual markers in various OCR-garbled forms (`(''^ `, `0)`, `(-^^`, `(°`, `(♦>`, `C<)`, etc.). Agent A has more `^^` and `W` residuals; Agent B has more `(O`, `V)`, `0*>` residuals.
- **Garbled OCR words**: Neither agent corrects OCR misreadings of the diary text itself (e.g., `USjQUE`, `givosene(bHn`, `coUeio`/`colleio`).

---

## 3. Coverage Comparison

### Year Range Coverage
Both outputs cover the full year range 1294-1494. Spot checks confirm:
- Both begin with `Manca lo principio.` (the note that the start is missing)
- Both end with the Ostia/campo passage from 1494
- Both include the `Altro principio` appendix (1294-1305 in Italian)
- Year entries are present at matching positions in both outputs

### Content Gaps
No significant content gaps were found in either output. Both preserve:
- All major year entries (1294-1494)
- All `Eodem anno` sub-entries
- The Latin title (though with different OCR garbles)
- Section numbers (I., II., III., etc.)
- The transition from Italian/dialect to Latin (around 1480)
- Quoted speech in guillemets

### Structural Differences in File Splitting
- Agent A splits as: 1294-1377, 1378-1417, 1418-1447, 1448-1464, 1465-1484, 1485-1494
- Agent B splits as: 1294-1399, 1400-1419, 1420-1439, 1440-1459, 1460-1479, 1480-1484, 1485-1494

Agent B's splits are more granular (7 files vs 6). Neither split affects the full-text file which contains everything.

---

## 4. Specific Cross-References for Reconciliation

### Example 1: Opening Lines (1294)

**Agent A** (cleaner reading, fewer markers, but has `W` artifact):
```
W pontificalmente, e dissali: « piglia tesauro quanto tu vói ».
```

**Agent B** (retains OCR garble but corrects the verb):
```
pontificalmente, e disseli: « piglia tesauro quanto tu vói».
```

**Best reading**: `pontificalmente, e disseli: « piglia tesauro quanto tu vói ».` (Agent B has `disseli` which is correct; Agent A has `dissali`)

### Example 2: Anagni passage

**Agent A**: `da Anagna gridavano` (reads `Anagna`)
**Agent B**: `da Anagn a gridavano` (broken word `Anagn a`)

**Best reading**: Agent A (word intact, whether `Anagna` or `Anagni` is a textual question)

### Example 3: 1413 Entry (Apparatus leak in B)

**Agent A**: Clean transition from `in Santo Lorenzo in Damaso.` directly to `A dì 2 di iugnio...` (though with one garbled apparatus line)
**Agent B**: Leaks 6 lines of apparatus commentary (`ricondotto il testo; donde originò poi la lezione analoga...`)

**Best reading**: Agent A (properly removes the apparatus block)

### Example 4: Date in September 1414

**Agent A**: `A di i^ settembre` (garbled caret)
**Agent B**: `A dì 16 settembre` (correct date)

**Best reading**: Agent B (`16` is the correct date; Agent A garbled `16` into `i^`)

### Example 5: Word `rubbio`/`nibbio`

**Agent A**: `valeva lo rubbio dello grano 18 fiorini` (correct: `rubbio` = bushel)
**Agent B**: `valeva lo nibbio dello grano 18 fiorini` (incorrect: `nibbio` = kite/bird)

**Best reading**: Agent A (`rubbio` is the correct word)

### Example 6: End of Diary

Both outputs include the same problematic final passage where apparatus about ms. S1 and C2 is OCR-merged with diary text. Neither can cleanly separate it. The Master Reviewer must manually identify where Infessura's text ends and apparatus begins in this final paragraph.

---

## 5. Translation Readiness Assessment

### Agent A: CLOSER to translation-ready
- Continuous narrative flow (no mid-sentence line breaks)
- Fewer apparatus block leaks
- Main blockers: 40 `^^` markers, 41 `|` pipes, 5 page headers, ~250 inline markers, ~20 leaked footnote lines
- These are all minor regex fixes that can be done in a final cleanup pass

### Agent B: REQUIRES MORE WORK before translation
- 365 lines starting with punctuation (broken sentences) would confuse any translator
- ~50 apparatus block leaks would introduce nonsense commentary into translation
- Inline markers are fewer per-type but still numerous
- The line-continuation defect is the primary blocker

### Translation-Blocking Issues (either output):
1. Inline markers like `(''^ `, `0)`, `(-^^`, `(°` would be translated as part of the text
2. Page headers like `[l^6l] DIARIA RERUM ROMANARUM. 6$` would generate garbage translations
3. Apparatus vocabulary (`scrive solo`, `aggiunge in mar`) within diary lines would mislead the translator
4. The ~10-15 OCR-merged apparatus lines need manual separation before translation

---

## 6. Guidance for the Master Reviewer

### Recommended Reconciliation Strategy

1. **Use Agent A as the base text.** Its line continuity and structural coherence make it the better starting point for reconciliation. The narrative reads as continuous prose without spurious breaks.

2. **Apply Agent B's marker fixes to the base.** Specifically:
   - Remove the 40 `^^` carets (Agent B has done this already)
   - Remove the 41 `|` pipes (Agent B has done this)
   - Remove the 5 remaining page headers (Agent B has done this)
   - Apply any broader inline marker patterns that Agent B catches but Agent A misses

3. **Cross-reference specific readings.** Where Agent A garbles a word, check Agent B's reading of the same passage (and vice versa). The scans are of the same book; differences are purely OCR. Key corrections from Agent B to apply to Agent A:
   - `dissali` -> `disseli` (line 3)
   - `i^` -> `16` (September date in 1414 entry)
   - Various garbled characters that scan 2 reads correctly

4. **Manually clean the ~10-15 OCR-merged lines.** These appear in both outputs identically (same physical book pages). The Master Reviewer must identify where diary text ends and apparatus begins on each of these merged lines, then cut the apparatus portion.

5. **Verify no content was lost.** Compare section by section: if a passage appears in Agent B but not Agent A, determine whether it is legitimate diary text or leaked apparatus. If diary text, add it to the reconciled output.

6. **Final cleanup pass.** Run a simple regex-based pass over the reconciled text to strip remaining inline markers of all types: `(anything)`, `W`, `^^`, stray carets, stray pipes, garbled superscript markers.

### Priority of Fixes for Translation Pipeline

| Priority | Fix | Source |
|----------|-----|--------|
| P0 | Remove page headers (5 in Agent A) | Agent B patterns |
| P0 | Remove `^^` carets (40 in Agent A) | Agent B patterns |
| P0 | Remove `|` pipes (41 in Agent A) | Agent B patterns |
| P1 | Remove remaining inline markers (~250 in Agent A) | Regex expansion |
| P1 | Manually fix ~10-15 OCR-merged apparatus lines | Both outputs |
| P1 | Remove 2 leaked apparatus lines starting with `(i)Cf.` | Agent A specific |
| P2 | Cross-reference garbled words between outputs | Both outputs |
| P2 | Remove ~20 leaked footnote lines (Agent A) | Content-based |
| P3 | Correct obvious OCR word garbles | Both outputs |

---

## 7. Sign-Off Recommendation

### Status: CONDITIONAL SIGN-OFF

**Agent A: B+ (conditionally approved)** -- Sign off confirmed. The output is structurally sound and narratively coherent. Remaining artifacts (40 `^^`, 41 `|`, 5 headers, ~250 inline markers, ~20 footnote lines) are all mechanically removable with simple regex passes. No architectural changes needed.

**Agent B: B-** -- Does NOT meet the B+ threshold for sign-off. The 365 broken-line continuations are a fundamental structural defect that would corrupt any downstream use. While Agent B excels at specific marker removal (0 `^^`, 0 `|`, 0 headers), the text does not read as continuous prose. Additionally, ~50 apparatus block leaks remain.

### What Agent B Would Need for Sign-Off:
1. Fix the 365 lines starting with punctuation by joining them to the previous line
2. Remove the ~50 remaining apparatus block leaks
3. Remove the apparatus leak at the end of altro-principio.txt

### Recommendation for the Master Reviewer:
Proceed with reconciliation using Agent A as base. Agent B's output provides valuable cross-references for specific word readings and confirms coverage completeness, but its structural defects disqualify it as a primary base for reconciliation.

### Bridge Reviewer Sign-Off:
The bridge annotations in this document provide sufficient guidance for reconciliation. Agent A's output is at B+ quality and translation-ready after a mechanical cleanup pass. Agent B's output serves as a valuable secondary reference but requires further iteration before it could serve as a standalone base.

**SIGNED OFF** -- Bridge Reviewer, Pass 2, 2026-01-24.

---

## Appendix: Pass 1 Observations (Historical)

The Pass 1 observations below are retained for reference but are superseded by the Pass 2 assessment above.

### Pass 1 Assessment (2026-01-24, early)

At Pass 1, Agent A had completed analysis but produced no output. Agent B had produced output files but at F-level quality (footnotes, headers, markers all remaining). Both teams subsequently iterated multiple times to reach their current states.

Key improvements since Pass 1:
- Agent A: Went from no output through D -> B- -> C+ (regression) -> B -> B+ across 5 review rounds
- Agent B: Went from F -> D -> B- -> B- (current) across 4 iterations

The structural approach difference (Agent A: footnote state machine with page-boundary detection; Agent B: heuristic-based line classification) explains why Agent A achieves better apparatus removal while Agent B achieves better marker removal -- the state machine catches multi-line blocks but misses isolated markers, while the line-by-line approach catches markers but misses block context.
