# Bridge Reviewer — Scratchpad

## Assignment
Cross-reference both teams' work. Read all scratchpads and joint docs.
Write annotations in `bridge-annotations.md` that all agents can consult.
Advise both teams without copying text wholesale between them.

## Pass 2 Working Notes (2026-01-24)

### Methodology
1. Read all scratchpads (Agent A, Agent B, Reviewer A, Reviewer B)
2. Examined both diary-full.txt outputs line by line in sampled sections
3. Ran quantitative artifact counts (grep -c for markers, headers, patterns)
4. Compared matching passages side-by-side at 5 points in the text
5. Identified the root cause of the 2,133-line discrepancy
6. Assessed translation readiness for both outputs

### Critical Finding: Agent B Line-Continuation Defect

The most important finding of Pass 2 is that Agent B has 365 lines starting with `, ` or `. ` or `; ` -- these are mid-sentence continuations where the text was broken across lines and NOT rejoined. This means ~365 sentences in Agent B's output are split across two lines with the continuation starting with punctuation.

Root cause: Agent B's hyphenation fix (`fixHyphenation()`) only handles lines ending with `-` (hyphen). It does NOT handle the case where a line break occurs mid-sentence without a hyphen -- typically where the OCR wrapped text at column width. Agent A's approach either has broader line-joining logic or the scan 1 OCR produces fewer of these breaks.

This is a fundamental structural defect in Agent B's output. Any translator (human or AI) would treat these as separate paragraphs or fragments, producing garbled translation.

### Artifact Comparison Summary

| Artifact Type | Agent A Count | Agent B Count | Winner |
|---------------|---------------|---------------|--------|
| `^^` carets | 40 | 0 | Agent B |
| `|` pipes | 41 | 0 | Agent B |
| Page headers | 5 | 0 | Agent B |
| Apparatus line starts `(a)`-`(z)` | 2 | 0 | Agent B |
| Apparatus block leaks | ~20 | ~50 | Agent A |
| Scholarly name leaks | 1 | 1 | Tie |
| Editorial vocab leaks | 13 | 7 | Agent B |
| Lines starting w/ punctuation | 5 | 365 | Agent A |
| OCR-merged apparatus | ~10 | ~10 | Tie |
| altro-principio end leak | No | Yes | Agent A |

### Why Agent A is the Better Base

Despite Agent B having cleaner marker removal in some categories, Agent A is the superior base text because:

1. **Narrative continuity**: 360+ fewer sentence breaks means the text reads as continuous prose
2. **Apparatus removal**: 30+ fewer leaked apparatus blocks
3. **Structural integrity**: The footnote state-machine approach produces cleaner section transitions
4. **Hyphenation**: 1,038 words correctly rejoined vs Agent B's ~1,631 (but with 365 failures)

Agent A's remaining issues (40 `^^`, 41 `|`, 5 headers) are trivially fixable with 3 regex patterns. Agent B's issues (365 broken lines, 50 apparatus leaks) require structural logic changes.

### Cross-Reference Value of Agent B

Agent B remains valuable as a SECONDARY reference for:
- Confirming word readings where Agent A's OCR garbles (e.g., `dissali` vs `disseli`)
- Confirming dates where Agent A has garbled digits (e.g., `i^` vs `16`)
- Verifying that no diary content was falsely removed by Agent A's more aggressive pipeline
- Providing alternative OCR readings for reconciliation of ambiguous words

### OCR-Merged Lines (Unsplittable in Both)

Both outputs contain approximately 10-15 lines where the OCR merged two-column apparatus with diary text on the same physical scan line. These are identical in both outputs because they come from the same physical book. The Master Reviewer must manually handle these by identifying the diary/apparatus boundary within each line.

Key examples:
- `et siccarum C^ scrive solo: salmam boni vini...` (both outputs, same position)
- `et con molta festa e giubilo C^ Et in quel di Virginio Orsino...` (end of diary, both)
- Several lines in the 1440s section where manuscript collation notes are merged

### Translation Readiness Assessment

Agent A output could be fed to a translation pipeline NOW with the understanding that:
- ~40+41+5 = 86 artifact lines will produce garbage output (easily identifiable and removable post-translation)
- ~20 leaked footnote lines will produce scholarly-sounding translations that don't match the diary register
- ~10-15 merged lines will produce partially garbled output

For a ~7,000-line text, this represents a ~1.5% artifact rate, which is acceptable for initial AI translation with manual cleanup afterwards.

Agent B output should NOT be fed to a translator in its current state due to the 365 broken sentences.

### Sign-Off Decision

- Agent A: B+ CONFIRMED -- conditional sign-off granted
- Agent B: B- -- sign-off NOT granted
- Bridge annotations: COMPLETE for Master Reviewer's use
- Reconciliation guidance: PROVIDED

The Master Reviewer has sufficient information to produce the final reconciled text using Agent A as base and Agent B as cross-reference.

---

## Pass 1 Working Notes (Historical)

### Initial Assessment (Pass 1)

**Agent A Status:**
- Completed thorough analysis of scan 1 (22,565 lines)
- Identified all major OCR patterns: page headers, footnote types, markers, folio refs
- Designed multi-pass TypeScript pipeline strategy
- Has NOT yet produced any output files
- Approach: programmatic cleaning via scripts in `scripts/lib/diarium/`

**Agent B Status:**
- Produced full set of output files (10 files, 28,177 total lines)
- Files: preface.txt, diary-1294-1399.txt through diary-1485-1494.txt, diary-full.txt, altro-principio.txt
- Quality: POOR -- major issues remain throughout

### Cross-Scan OCR Comparison Notes

The two scans are of the SAME physical book (1890 Tommasini edition). Differences are purely OCR artifacts, not textual variants. Where one scan garbles a word, the other often reads it correctly. This is the fundamental value of having two independent clean copies.

---
