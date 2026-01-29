# OCR Quality Evaluation: La Scapigliatura e il 6 Febbraio

**Source:** `data/difficult_extra_processing/scapigliatura/arrighiscapigliatura_djvu.txt`
**Author:** Cletto Arrighi (1862)
**Lines:** ~14,135
**Date:** 2026-01-29

---

## Executive Summary

**Overall Grade: C+**

The OCR output is largely readable with the core Italian text intact and chapter structure preserved. However, it suffers from pervasive soft-hyphen line breaks (~1,431 occurrences), frequent OCR noise/garbled lines, systematic character misrecognitions, and scattered page markers. The text requires moderate automated cleaning but is fundamentally sound -- most paragraphs are intelligible. This is significantly easier than the Epitome of Histories (which had bilingual contamination) but harder than a clean modern scan.

---

## Chapter Structure

17 chapter headings found via `CAPITOLO` keyword:

| # | Line | Heading |
|---|------|---------|
| Intro | 58 | INTRODUZIONE |
| 1 | 852 | CAPITOLO PRIMO |
| 2 | 1283 | CAPITOLO SECONDO |
| 3 | 2193 | CAPITOLO TERZO |
| 4 | 2833 | CAPITOLO QUARTO |
| 5 | 3522 | CAPITOLO QUINTO |
| 6 | 4645 | CAPITOLO SESTO |
| 7 | 5289 | CAPITOLO SETTIMO |
| 8 | 5941 | CAPITOLO OTTAVO |
| 9 | 6811 | CAPITOLO NONO |
| 10 | 7465 | CAPITOLO DECIMO |
| 11 | 8268 | CAPITOLO UNDECIMO |
| 12 | 9106 | CAPITOLO DODICESIMO |
| 13 | 9758 | CAPITOLO TREDICESIMO |
| 14 | 11017 | CAPITOLO QUATTORDICESIMO |
| 15 | 12375 | CAPITOLO QUINDICESIMO |
| 16 | 12883 + 13248 | CAPITOLO SEDICESIMO (appears TWICE -- likely one is a sub-section or OCR duplication) |

**Note:** The text ends with "FINE." at line 14130. Chapter 7 heading has OCR noise appended: `CAPITOLO SETTIMO. ■ , 7`. The duplicate CAPITOLO SEDICESIMO needs investigation -- could be two parts of the final chapter or a scan artifact.

**Total structure: Introduction + 16 chapters.**

---

## Issue Breakdown

### 1. Soft Hyphens (¬) -- SEVERITY: HIGH, FREQUENCY: ~1,431 occurrences

The most pervasive issue. Words broken across lines with the `¬` character. These appear on virtually every page.

**Examples:**
- `pieni d'in¬ / gegno` -> `d'ingegno`
- `irre¬ / quieti` -> `irrequieti`
- `classi¬ / ficali` -> `classificati` (also a misrecognition -- see below)
- `Sca¬ / pigliatura` -> `Scapigliatura`
- `osser¬ / varli` -> `osservarli`

**Cleaning:** Straightforward regex: join line ending in `¬` with next line, removing the `¬`.

### 2. Page Numbers/Markers -- SEVERITY: MEDIUM, FREQUENCY: ~85 occurrences

Page numbers appear as standalone lines in the format `- N -` or `— N —`, surrounded by blank lines.

**Examples:**
- `— G -` (line 78, likely page 6)
- `- (i8 -` (line 2864, garbled "68")
- `38 —` (line 1428)
- `- 39 -` (line 1475)
- `— 99 —` (line 4214)
- `- 34 i -` (line 13936, garbled "341")
- `- 315 -` (line 14107)
- `- m -` (line 9869, garbled page number)

**Cleaning:** Regex for lines matching `^[-—\s]*\d+[-—\s]*$` plus surrounding blank lines. Some garbled variants need fuzzy matching.

### 3. OCR Noise / Garbled Lines -- SEVERITY: MEDIUM-HIGH, FREQUENCY: ~50-80 lines

Scattered lines of complete nonsense, typically from marginal annotations, bleed-through, or scan artifacts.

**Examples:**
- `.inoiniiq lillfib` (line 1470)
- `!!;"•< vlUhl?: fiV Vili (IO!! ifiTJO/ jlCl lt- *>.:1. • l.B` (line 4296)
- `dir. s-iJfo .srahdn'c 's#!.T '>»»•*.'• f>sv -r>,` (line 7051)
- `1 ... . u; ; i ■: C ■` (line 5621)
- `. (!• : 9` (line 5627)
- `4 * sy . • *` (line 5632)
- `,V^f i » *yj f.MiU ii. ' . . ? : • .'f l(' Hit -i*. yj* '*.?` (line 12699)
- `'fi! i` (line 13975)

**Cleaning:** Lines with high ratio of punctuation/symbols to letters can be detected and removed. Threshold: lines where non-alphabetic characters exceed ~60% of content.

### 4. Character Misrecognition -- SEVERITY: MEDIUM, FREQUENCY: Moderate (dozens of instances)

Systematic OCR substitutions throughout:

| OCR Output | Correct | Pattern |
|------------|---------|---------|
| `clic` | `che` | Very frequent -- `c`/`h` confusion |
| `classificali` | `classificati` | `l`/`t` confusion |
| `chiamala` | `chiamata` | `l`/`t` confusion |
| `continualo` | `continuato` | `l`/`t` confusion |
| `passalo` | `passato` | `l`/`t` confusion |
| `stala` | `stata` | `l`/`t` confusion |
| `porlate` | `portate` | `l`/`t` confusion |
| `lulli` | `tutti` | `l`/`t` confusion |
| `scrii` | `serii` | `i`/`e` confusion |
| `cruna` | `d'una` | Ligature misread |
| `CLETTG` | `CLETTO` | `G`/`O` confusion (title page) |
| `Mefìslofele` | `Mefistofele` | `l`/`t` confusion |
| `svoglialo` | `svogliato` | `l`/`t` confusion |

**Key pattern:** The dominant misrecognition is `l` for `t` (and vice versa). This is extremely systematic and suggests the font's `t` was consistently misread. The `clic`/`che` substitution is also very frequent.

**Cleaning:** Dictionary-based correction for common words, plus targeted regex for `clic` -> `che` (context-dependent). The `l`/`t` confusion is harder -- requires dictionary lookup or statistical correction.

### 5. Stray Single Characters and Short Fragments -- SEVERITY: LOW-MEDIUM, FREQUENCY: ~30-50

Single characters or very short fragments from marginal OCR noise:

**Examples:**
- `j` (line 26)
- `j*.` (line 35)
- `i` (line 2837)
- `t` (line 7011)
- `il` (line 7008)
- `11` (line 7058)
- `'1` (line 14061)

**Cleaning:** Remove isolated lines of 1-2 characters that are not part of dialogue or text.

### 6. Leading Pipe/Bracket Characters -- SEVERITY: LOW, FREQUENCY: ~30 lines

OCR artifacts from margin marks or scan edges appear as leading `\`, `|`, `>`, `(`, `{` characters on otherwise valid lines.

**Examples:**
- `\ scandaloso processo dinanzi ai tribunali` (line 2804)
- `| stava altercando con due ignobili ceffi` (line 4203)
- `(vita scioperata e viziosa` (line 4207)
- `> gran sacerdote da palcoscenico` (line 5688)

**Cleaning:** Strip leading `\|>({[` characters followed by space from lines.

### 7. Punctuation Noise -- SEVERITY: LOW, FREQUENCY: Moderate

Extra dots, semicolons, spaces within punctuation from OCR misreading:

**Examples:**
- `da. cui • sono • trascinati` (should be `da cui sono trascinati`)
- `, , ,` scattered through dialogue
- `— di ss' ella` (should be `diss'ella`)
- `Firmiàni` / `Firmiani` (inconsistent accents)
- Superscript markers: `1`, `?`, `!` appearing as stray characters after sentences

**Cleaning:** Normalize punctuation spacing; remove isolated mid-sentence dots/bullets.

### 8. Footnote Markers and Text -- SEVERITY: LOW, FREQUENCY: Rare (~2-3)

- `f) Vedi tulli i Vocabolari.` (line 108) -- footnote with `l`/`t` error
- `(*)` reference on line 100

**Cleaning:** Detect and remove footnote lines (lines starting with single-char markers like `f)`, `*)`).

### 9. Blank Line Clusters -- SEVERITY: LOW, FREQUENCY: Throughout

Clusters of 3-8 blank lines appear between paragraphs and around page breaks. Standard paragraph spacing is 1-2 blank lines.

**Cleaning:** Collapse multiple blank lines to a single blank line.

### 10. Title Page / Front Matter -- SEVERITY: LOW, FREQUENCY: Lines 1-57

The first ~57 lines contain title page, dedication, and publisher info with some OCR noise. The actual text begins at line 58 ("INTRODUZIONE").

**Cleaning:** Strip or separate front matter.

---

## Overall Quality Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| Text readability | B- | Most paragraphs readable despite issues |
| Character accuracy | C | Systematic `l`/`t` and `clic`/`che` errors throughout |
| Structural integrity | B+ | Chapters clearly marked, paragraph boundaries mostly intact |
| Noise level | C | Garbled lines every ~150-200 lines |
| Punctuation accuracy | C+ | Moderate noise but usually parseable |

---

## Recommended Cleaning Approach

**Difficulty: MODERATE** -- Easier than Epitome, harder than clean modern scans.

### Phase 1: Structural cleanup (automated, straightforward)
1. Remove front matter (lines 1-57)
2. Remove page number lines (`- N -` pattern + garbled variants)
3. Collapse multiple blank lines to single
4. Remove garbled noise lines (high symbol-to-letter ratio)
5. Remove stray single-character lines
6. Strip leading margin characters (`\`, `|`, `>`, etc.)

### Phase 2: Soft-hyphen rejoining (automated, straightforward)
1. Join lines ending in `¬` with next line, removing `¬`

### Phase 3: Character correction (automated, moderate difficulty)
1. `clic` -> `che` (context-sensitive -- only when standalone word, not part of longer words)
2. Common `l`/`t` misrecognitions via dictionary lookup (e.g., `stala`->`stata`, `continualo`->`continuato`, `lulli`->`tutti`)
3. Punctuation normalization (remove mid-word dots/bullets, fix spacing)

### Phase 4: Validation
1. Sample 50+ paragraphs across all chapters
2. Check for remaining garbled text
3. Verify chapter boundaries
4. Assess `l`/`t` correction accuracy (avoid false positives)

### Estimated effort
- Phase 1-2: ~2 hours scripting, near-100% automated
- Phase 3: ~4-6 hours scripting + dictionary building, ~90% automated
- Phase 4: ~1-2 hours manual review
- **Total: ~1 day of work**

The `l`/`t` confusion is the most challenging issue because naive find-replace will produce false positives. A word-frequency approach comparing against an Italian dictionary would be most reliable.
