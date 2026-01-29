# Semeioseis Gnomikai V1 Cleaning Scratch Notes

## Text: Semeioseis Gnomikai (chapters 82-120) by Theodore Metochites
## Date: 2026-01-29

## Raw File Analysis
- File: `data/raw/semeioseis_gnomikai/semeioseis_gnomikai_82_120.txt`
- 9198 lines
- 39 chapter markers found (ΚΕΦ), but chapter 118 missing (merged with 117)
- Final: 38 chapters output (82-117, 119-120)

## Contamination Types Found
1. **Critical apparatus footnotes** - Most common. ~900 lines. Start with "N)" where N is a digit, contain manuscript sigla (C. Mon., C. Aug., C. Ciz., Cdd., Bloch., Fabric., Orell., Germ., Paris.)
2. **Latin commentary** - ~55 lines. Editorial notes ("sic Cdd.", "abest a C.", "fors. legendum", etc.)
3. **Page headers** - ~181 lines. "THEODORUS METOCHITA. NNN" repeated throughout
4. **Footnote markers** - Inline numbers like "1)", "2)", "*)" in Greek body text
5. **Arabic/Hebrew/Devanagari/CJK script** - ~51 lines. OCR artifacts from scan margins
6. **OCR noise** - ~515 lines. Isolated characters, pure punctuation, short garbage
7. **Page numbers** - ~37 standalone lines with just numbers
8. **Omicron-style footnote markers** - "1ο)", "2ο)" where OCR misread zero as omicron

## Key Challenges
- **Apparatus lines with high Greek ratio**: Many footnote lines discuss Greek variant readings, so they have significant Greek content. Required lowering Greek ratio threshold and adding specific pattern matches for sigla.
- **Chapter 118**: No ΚΕΦ marker found between chapters 117 and 119. Content appears merged into chapter 117.
- **Corrupted Greek numerals**: OCR mangled Greek numeral suffixes (e.g., πγ΄ became ταγ, νί instead of ϟ΄, etc.). Solved by mapping chapters by order of appearance.
- **Partial apparatus fragments**: After line-level filtering, apparatus text still leaked through when lines contained both Greek body text and apparatus notes. Required aggressive post-processing regex on assembled paragraphs.

## Cleaning Pipeline Architecture
1. **Line-level filtering** (`filters.py`): Remove entire lines that are page headers, footnotes, apparatus, Latin editorial, foreign script, OCR noise
2. **Inline cleaning** (`clean_inline_markers`): Remove footnote markers, foreign scripts, page number prefixes from retained lines
3. **Word rejoining**: Rejoin words broken across lines by hyphens
4. **Paragraph assembly**: Build paragraphs from clean lines, split on sentence boundaries
5. **Post-processing** (`post_clean_paragraph`): Final pass to catch remaining apparatus fragments in assembled paragraphs

## Self-Evaluation Results
- **38 chapters processed**, 126 paragraphs total
- **0% apparatus contamination** (0/126 paragraphs)
- **0% Latin text leakage** (0/126 paragraphs with any Latin 2+ char words)
- **0% page headers** remaining
- **0% footnote markers** in body text
- **0% foreign script** (Arabic, Hebrew, CJK)
- **Average paragraph length**: ~2500 chars
- **No very short paragraphs** (all >= 225 chars)
- **100% Greek ratio** (all paragraphs have high Greek character ratio)

## Grade Self-Assessment: A-
Exceeds all B+ targets. Minor concern: some OCR artifacts in the Greek text itself (missing spaces, corrupted letters) are inherent to the scan quality and cannot be fixed by pattern-based cleaning.

## Files Created
- `scripts/lib/semeioseis-cleaning-v1/patterns.py` - Regex patterns
- `scripts/lib/semeioseis-cleaning-v1/filters.py` - Detection functions
- `scripts/lib/semeioseis-cleaning-v1/validators.py` - Quality verification
- `scripts/lib/semeioseis-cleaning-v1/cleaner.py` - Main pipeline
- `data/processed/semeioseis-gnomikai/chapter-NNN.json` - 38 output files
