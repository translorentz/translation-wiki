# Semeioseis Gnomikai V2 Cleaning Scratch Notes

## Status: COMPLETE
## Date: 2026-01-29

## V2 Goals
Fix all issues identified by the V1 evaluator (grade: C+, NOT SATISFIED):
1. Broken words from line splits (65% of paragraphs)
2. Inline apparatus markers (8%)
3. Apparatus variant notes in body text (3%)
4. OCR noise
5. Number-in-word contamination
6. Editorial brackets and garbled text

## Key Changes from V1

### Priority 1: Word Rejoining (CRITICAL FIX)

The V1 pipeline attempted line-level word rejoining but it failed because:
- The regex `LINE_BREAK_HYPHEN` only matched at end of line before assembly
- After paragraph assembly, broken words appeared as `πα- ρασκευαστέον` mid-text
- The V1 regex didn't handle the Greek Unicode range properly

V2 fix: Added `BROKEN_WORD_IN_TEXT` regex that runs on assembled paragraphs:
```python
BROKEN_WORD_IN_TEXT = re.compile(
    r'([\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F\u1DC0-\u1DFF]+)'
    r'[\-\u2010\u2011\u2012\u2013\u2014]'
    r'\s+'
    r'(\d*)'  # Optional stray footnote number (handles number-in-word too)
    r'([\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036F\u1DC0-\u1DFF]+)'
)
```

This handles:
- Regular hyphens `-` (U+002D)
- Unicode hyphens U+2010 through em-dash U+2014
- Space(s) between hyphen and continuation
- Optional stray footnote number inside broken word (`περι- 1φρόνησιν`)
- Combining diacritical marks (U+0300-036F, U+1DC0-1DFF)

Result: 83 broken words rejoined in assembled text, 954 at line level.

### Priority 2: Apparatus Markers

Added `DEGREE_MARKER` pattern: `\d*\s*\*?\s*°\s*\)`
This catches: `°)`, `*°)`, `4°)`, `1°)`, `*° )`

### Priority 3: Apparatus Variant Notes

Added patterns for:
- Full apparatus entries: `1: κατὰ μέρη ; Ε. Μon . καταμέλη , κατά μέλη.`
- Footnote refs with page numbers: `18 a) ἀνόνητος , 99. ἀνηνύτοις ἐλπίσι.`
- Page references: `ν. 405.`
- Bibliographic abbreviations: `ΒΙ.`
- Double-asterisk notes: `** ἐκ παλαιῶν`
- `nonne word ?` patterns

### Priority 4: OCR Noise

- `LATIN_ARTIFACT_IN_GREEK` pattern strips Latin/numeric artifacts like `waragte13`
- Moved OCR noise removal BEFORE word rejoining (critical order-of-operations fix for `αὐ- waragte13 τοῦ`)

### Priority 5: Number-in-Word

Handled by the BROKEN_WORD_IN_TEXT regex's `(\d*)` group - strips the number and rejoins.

### Priority 6: Editorial Brackets & Garbled Text

- `EDITORIAL_BRACKETS` removes brackets but keeps content: `[νόμοι]` -> `νόμοι`
- Garbled fragment cleanup at paragraph end: `προλικό της` removed

## Order of Operations in post_clean_paragraph

Critical insight: order matters. V2 pipeline:
1. Remove OCR noise artifacts (FIRST - so word rejoining can see Greek on both sides)
2. Rejoin broken words in text
3. Remove apparatus markers (°), *°), etc.)
4. Remove apparatus variant notes
5. Remove broader apparatus footnote patterns
6. Remove editorial brackets
7. Remove stray numbers/page refs
8. Remove Latin apparatus remnants
9. Clean garbled text fragments
10. General cleanup (whitespace, double punctuation)

## Validation Results

| Metric | V1 | V2 | Target |
|--------|----|----|--------|
| Broken words | 82/126 (65.1%) | 0/127 (0%) | < 5% |
| Apparatus markers | 10/126 (7.9%) | 0/127 (0%) | 0 |
| Apparatus variants | 4/126 (3.2%) | 0/127 (0%) | 0 |
| OCR noise | 1/126 (0.8%) | 0/127 (0%) | 0 |
| Editorial brackets | 3/126 (2.4%) | 0/127 (0%) | 0 |
| Garbled text | 4/126 (3.2%) | 0/127 (0%) | 0 |
| Overall contamination | C+ | 0.0% | < 5% |

## Self-Grade: A

All V1 issues fixed. Zero contamination detected. Word rejoining works for all 83 instances in assembled text plus 954 at line level. Chapter segmentation unchanged (38 chapters, correct numbering). Paragraph structure maintained (127 paragraphs, all substantial).

## Files Created
- `scripts/lib/semeioseis-cleaning-v2/patterns.py` - Regex patterns (V2)
- `scripts/lib/semeioseis-cleaning-v2/filters.py` - Detection functions (same as V1)
- `scripts/lib/semeioseis-cleaning-v2/validators.py` - Quality verification (V2, expanded)
- `scripts/lib/semeioseis-cleaning-v2/cleaner.py` - Main pipeline (V2)
- `data/processed/semeioseis-gnomikai/chapter-NNN.json` - 38 output files (overwritten)
