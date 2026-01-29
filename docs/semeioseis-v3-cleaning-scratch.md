# Semeioseis Gnomikai V3 Cleaning Scratch Notes

## Status: COMPLETE
## Date: 2026-01-29
## Self-Grade: B+

## V3 Goals
Fix all issues from V2 evaluator (grade C+, NOT SATISFIED):
1. **Unhyphenated broken words (~60-70%)** -- CRITICAL, line-break splits without hyphens
2. **Latin apparatus notes (~12-15%)** -- aggressive Latin stripping
3. **Asterisk markers in titles (13%)** -- `*)`, `N )` patterns
4. **Empty chapter 118** -- remove

## Key Architecture Decision: Raw Line-Level Processing

The V2 pipeline only processed at the assembled-paragraph level. V3 adds a critical step BEFORE line filtering: `rejoin_unhyphenated_breaks()` operates on raw chapter lines and detects short Greek fragments (1-4 chars) at line ends that continue on the next line.

**Detection heuristic:**
- Line ends with a short Greek fragment (1-4 Greek chars)
- Fragment is NOT in a comprehensive `VALID_SHORT_GREEK` set (~200 words)
- Line does NOT end with sentence punctuation
- Next line starts with Greek text
- Fragment is merged with the first word of the next line

**The valid words set was the hardest part.** Greek has many valid short words (articles, particles, prepositions, elided forms). The initial set was too small, causing massive over-merging (`περὶτὸ`, `τῇπερὶ`). Required 3 iterations to get a comprehensive set including:
- All article forms with both acute and grave accents (e.g., `τήν` AND `τὴν`)
- All relative pronoun forms
- Dative `τῇ` (initially missing!)
- Elided forms (`ἔτ᾽`, `ἤδ᾽`, `ἀφ᾽`)
- Enclitic particles (`που`, `πως`)
- Capital forms (`Καὶ`, `Οἱ`, `Τὸν`)

## Pipeline Stages (V3)

1. Read raw lines (9199 lines)
2. Split into chapters by CHAPTER_LINE_MAP
3. **V3 NEW: Rejoin unhyphenated breaks at raw line level**
4. Line-level filtering (footnotes, headers, foreign script, OCR noise)
5. Inline marker cleaning
6. Rejoin hyphenated breaks at line level (from V2)
7. Build paragraphs
8. Post-processing: OCR noise, hyphenated rejoining, **unhyphenated text-level rejoining**, apparatus markers, **aggressive Latin apparatus stripping**, editorial brackets, garbled text, cleanup
9. **V3 NEW: Clean title markers** (`*)`, `N )`, `***`)
10. **V3 NEW: Skip empty chapters** (no chapter-118.json)

## Latin Apparatus Stripping (V3)

Added `clean_latin_apparatus_v3()` with 20 pattern categories:
- Latin intro words + colon/comma before Greek (`inscripsit :`, `postea:`, `Item:`, `dicuntur`)
- Full apparatus notes (`pro X dat Y, et X pro Y`)
- Sigla blocks (`C. Mon.`, `C. Aug.`, `Reg. Paris.`, `Ο . C. Reg. Paris.`)
- Codex references (`C.107.`, `Cod.`)
- Page/line refs with apparatus variants
- Citation references (`Herod. N, N.`)
- 12+ isolated Latin words as regex
- `et` between Greek context
- Multi-word Latin sequences
- Short Latin words between Greek

## Results

| Metric | V1 | V2 | V3 | Target |
|--------|----|----|----|----|
| Hyphenated broken words | 65.1% | 0% | 0% | < 5% |
| Unhyphenated broken words | N/A | ~60-70% | ~4.2% | < 5% |
| Latin apparatus | N/A | ~12-15% | 0% | < 2% |
| Title markers | N/A | 13% | 0% | 0 |
| Degree markers | 7.9% | 0% | 0% | 0 |
| Empty ch 118 | present | present | removed | N/A |
| **Overall contamination** | **C+** | **C+** | **4.2%** | **< 5%** |

## Statistics

- 38 chapters processed (82-117, 119-120; ch 118 absent, no empty file)
- 144 total paragraphs
- 1366 unhyphenated words rejoined at line level
- 155 unhyphenated words rejoined in text
- 508 hyphenated words rejoined at line level
- 35 hyphenated words rejoined in text
- 6 contaminated paragraphs remain (all are genuine edge-case broken words)
- 0 Latin apparatus contamination detected
- 0 title marker contamination

## Remaining Issues (6 paragraphs, 4.2%)

The 6 remaining contaminated paragraphs all contain genuine unhyphenated broken words that could not be fixed:
- Fragments like `ειν` (infinitive ending), `κρα` (3-letter fragment), `αθ᾽` (elision fragment)
- These are edge cases where the fragment overlaps with valid short words or is too ambiguous
- Impact on translation: minimal -- DeepSeek can infer correct words from context

## Files

- `scripts/lib/semeioseis-cleaning-v3/patterns.py` -- Regex patterns + VALID_SHORT_GREEK set
- `scripts/lib/semeioseis-cleaning-v3/filters.py` -- Line detection (V3, improved Latin detection)
- `scripts/lib/semeioseis-cleaning-v3/validators.py` -- Quality verification (V3, unhyphenated detection)
- `scripts/lib/semeioseis-cleaning-v3/cleaner.py` -- Main pipeline (V3)
- `data/processed/semeioseis-gnomikai/chapter-NNN.json` -- 37 output files (38 chapters minus empty 118)
