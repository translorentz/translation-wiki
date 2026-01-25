# Master Reviewer Documentation — Diarium Urbis Romae

## Summary

The Master Reviewer reconciled outputs from Agent A and Agent B to produce a clean, translation-ready text of Stefano Infessura's *Diarium Urbis Romae* (Diary of the City of Rome), covering events from 1294 to 1494.

## Final Output

**Location:** `data/raw/diarium-urbis-romae/`

| File | Description | Lines |
|------|-------------|-------|
| `diary-full.txt` | Complete reconciled diary | 7,253 |
| `altro-principio.txt` | Alternative beginning (Italian dialect version of 1294-1305) | 65 |
| `diary-year-*.txt` | Year-based chapter splits (7 files) | varies |

## Reconciliation Methodology

### 1. Base Selection

**Agent A's output was used as the base text** (as recommended by the Bridge Reviewer).

Rationale:
- Superior line continuity (no broken sentences)
- Better apparatus block removal
- Structural coherence as continuous narrative
- Grade: B+ vs Agent B's B-

### 2. Cleanup Pipeline

The reconciliation applied a multi-pass cleanup:

**Pass 1: Line Removal**
- Removed entire lines matching apparatus patterns
- 70+ patterns for scholarly vocabulary (Gregorovius, "scrive solo", "aggiunge", etc.)
- Colophon and apparatus block detection
- Lines starting with manuscript sigla

**Pass 2: Page Header Removal**
- DIARIA RERUM ROMANARUM headers (4 patterns)
- STEPHANI INFESSURAE headers
- Garbled page numbers

**Pass 3: Caret and Pipe Cleanup**
- Triple carets (^^^) at line start
- Double carets (^^) inline
- Word-attached carets (superscript markers)
- Manuscript sigla with carets (R^, S', C^)
- All pipe characters (column boundaries)

**Pass 4: Inline Marker Removal**
- Parenthetical markers: ('), (-^, (*, (0, etc.
- Folio references: c. 123 A
- Bracket numbers: [123]
- Witness markers: W at line start

**Pass 5: Word Corrections**
- Cross-referenced Agent B for specific readings
- Applied known corrections: dissali -> disseli, etc.

**Pass 6: Whitespace Normalization**
- Multiple spaces to single
- Multiple blank lines to single
- Trailing space removal

### 3. Verification

Final output verified:
- 0 remaining carets
- 0 remaining pipes
- 0 remaining page headers
- 0 remaining apparatus vocabulary
- 53 year markers preserved (diary structure intact)

## Scripts Created

Located in: `scripts/lib/diarium-master/`

| Script | Purpose |
|--------|---------|
| `cleanup-patterns.ts` | 50+ regex patterns for artifact removal |
| `reconcile.ts` | Main reconciliation pipeline |
| `split-years.ts` | Year-based chapter splitting |
| `verify.ts` | Quality verification |

## Known Limitations

1. **OCR Quality**: Some OCR garbles remain in the source text (e.g., "nuUo" for "nullo", "coUeio" for "colleio"). These are from the original scans and would require manual correction.

2. **Year Splitting**: The early sections (1294-1377) are narrative overviews rather than dated entries, making automatic year-based splitting less precise.

3. **Hyphenation**: Some hyphenated words at line breaks may not be perfectly rejoined.

## Translation Readiness

The output is ready for the translation pipeline:
- Clean Italian/Latin text
- No scholarly apparatus
- No page headers or footnote markers
- Continuous narrative suitable for paragraph-based translation

## Artifact Statistics

| Artifact | Before | After |
|----------|--------|-------|
| Carets (^^) | 40 | 0 |
| Pipes (\|) | 41 | 0 |
| Page headers | 4 | 0 |
| Apparatus lines | ~100 | 0 |
| Lines removed | - | 107 |
| Final line count | 7,360 | 7,253 |

## Next Steps

1. Process `diary-full.txt` through the standard text processing pipeline
2. Seed into database with appropriate chapter splits
3. Run translation batch with Italian/Latin language settings
4. Consider manual review of early sections (1294-1377) for improved year detection

---

*Master Reviewer reconciliation completed: 2026-01-24*
