# Syair Siti Zubaidah — Raw Text Evaluation

**File:** `data/raw/syar_siti/syar_siti.txt`
**Size:** 12,453 lines, ~333 KB
**Evaluator:** Claude Code (text evaluation agent)
**Date:** 2026-01-28

---

## 1. Text Structure Analysis

### Sections of the File

| Section | Line Range | Description |
|---------|-----------|-------------|
| Table of Contents | 1–8 | OCR of TOC page ("KATA PENGANTAR", "DAFTAR ISI", etc.) |
| Scholarly Introduction (Pendahuluan) | 10–44 | Modern Indonesian academic introduction |
| Story Summary (Ringkasan Cerita) | 47–246 | Prose retelling of the plot in modern Indonesian |
| **Syair Poetry (Transliteration)** | **247–12443** | The actual syair text — this is what we want |
| Bibliography (Daftar Pustaka) | 12444–12453 | Three bibliographic references |

The syair begins at **line 247** with the header "TRANSLITERASI / SYAIR SITI ZUBAIDAH" followed by the first quatrain at line 249. The syair ends at **line 12443** with the final verse line "Muatap dan tangis tidak bersudah". The bibliography follows immediately at line 12444.

### Organization

The syair has **no named cantos, chapters, or episodes**. It is a continuous narrative poem. However, there are two numbering systems embedded in the text:

1. **Page numbers** (standalone lines): Numbers like `9`, `10`, `12`, `117`, `372`, etc. appear on their own lines, corresponding to printed book pages. Range: pages 9–380. There are **~368 standalone page number lines**.

2. **Stanza/quatrain reference numbers** (inline): Markers like `111`, `1241`, `1481`, `1991`, etc. appear at the start of certain lines, tab-separated from the verse text. These appear to be **cumulative quatrain numbers from the original manuscript**, appearing roughly every 10th quatrain. Pattern: `/N/` markers (29 total, e.g., `/5/`, `/26/`, `/98/`) and `NNNN\t` markers (35 total, e.g., `111\t`, `1241\t`). The highest visible stanza number is approximately **1106** (line 12090: `II 001`), suggesting the poem contains over 1,100 numbered quatrains in the original manuscript.

### Quatrain Structure

Estimated **~2,638 quatrains** (10,553 content lines / 4 lines per quatrain). The standard form is a 4-line stanza (pantun/syair form) with AAAA end-rhyme:

```
Orang Fabian naik berperi
Melihat Cina datang kemari
Orang Fabian semuanya berdiri
Datang mengadap muda jauhari
```

### Formatting Inconsistency (IMPORTANT)

The text has **two different formatting styles** that alternate:

- **Dense format** (lines 249–268, 320–346, etc.): Four verse lines appear consecutively with no blank lines between them. Quatrains are separated by a blank line or page number.
- **Spaced format** (lines 272–318, 9078–9098, etc.): Each verse line is followed by a blank line, making quatrains appear as 8 lines (4 text + 4 blank).

This inconsistency appears to come from the original OCR/scan process (different page layouts). A processing script must normalize this.

---

## 2. OCR Quality Assessment

### Sampling Method
Sampled ~60 quatrains across the text: lines 249–268 (beginning), 3000–3099 (early-middle), 6000–6097 (middle), 9000–9099 (late-middle), 12000–12100 (near end).

### Common OCR Error Patterns

**A. Character substitutions (FREQUENT)**
| OCR Error | Correct | Example (line) |
|-----------|---------|----------------|
| `!` for `l` or `i` | `l`/`i` | `sambi!` → `sambil` (6058), `dapa!` → `dapat` (32) |
| `J` for `j` | `j` | `Jafar` OK, but `JaJu` → `lalu` (various) |
| `I` for `l` | `l` | `Ialu` → `lalu` (272), `Iaki` → `laki` (6131) |
| `1` for `l` | `l` | `1a` → `Ia` (312), `1alu` → `lalu` |
| `0` for `O` | `O`/`o` | `0J` → `Di` (276) |
| `D` for `Di` | `Di` | varies |
| `9` for `g` or `d` | `g`/`d` | `9i` → `di` (280) |
| `+` for `t` | `t` | `mu+stika` → `mustika` (6065) |

**B. Broken/merged words (MODERATE)**
- `Rrunainyatidaklagiterperi` (line 322) — merged words: "Ramainya tidak lagi terperi"
- `orang sebarang` vs `orangsebarang` — occasional merges
- `bermobon` → `bermohon` (298)

**C. Library stamp OCR artifact (lines 324–328)**
```
PERPU>TAK" ~
PUS ~ T rE ~ B I .".~ 0 A ~
PE j ,Ff 11 I GA j B~'I~S A
OEP ~TE Ell P~NOIOI( A N
DAN KEBUOAYAAN
```
This is an OCR scan of a library stamp ("PERPUSTAKAAN PUSAT PEMBINAAN BAHASA DEPARTEMEN PENDIDIKAN DAN KEBUDAYAAN"). Appears once.

**D. Garbled line endings (OCCASIONAL)**
- `membeu ,-________ _ _ -,` (line 318) — trailing OCR noise
- `terpeo` → `terperi` (6044)
- Stray punctuation: `_`, `•`, `~`

**E. Inconsistent spacing**
- Some lines have trailing spaces
- Tab characters mixed with spaces for stanza number alignment

### OCR Quality Grade: **C+ (Significant issues, but patterned and fixable)**

The errors are numerous but highly systematic. The `!`→`l`/`i` and `I`→`l` substitutions account for the vast majority of issues. A regex-based cleanup pass can fix 80–90% of OCR errors. The remaining 10–20% would require manual review or dictionary-based correction. The text is readable and the meaning is recoverable in virtually all cases.

---

## 3. Language Assessment

### Language Identification
The syair is in **Classical Malay (Bahasa Melayu Klasik)**, specifically in the literary register used in traditional Malay court poetry. The scholarly introduction and story summary are in **modern Indonesian (Bahasa Indonesia)**.

Language code for the project: **`ms`** (Malay).

### Code-Switching
- **Arabic/Islamic vocabulary** is pervasive (typical of Malay court literature): `titah`, `tafakur`, `sembahyang`, `Quran`, `tobat`, `zinah`, `halal`, `haram`, `bismillah`, `alhamdulillah`, `salat`, `imam`, `duli`, `halifah`, etc.
- **Sanskrit/Old Javanese loanwords**: `baginda`, `mahkota`, `perdana`, `menteri`, `hulubalang`, `balairung`, `permaisuri`, `istana`
- No significant passages in other languages.

### Vocabulary Difficulty for AI Translation
**MODERATE-HIGH.** Classical Malay poses specific challenges:
- Archaic word forms: `tiada` (not), `nan` (that), `konon` (reportedly), `seraya` (while), `peri` (manner/way)
- Court register vocabulary: `duli` (dust = royal person), `titah` (royal command), `bersabda` (to speak royally), `semayam` (to sit royally)
- Formulaic phrases repeated throughout: "terlalu suka di dalamnya dada" (exceedingly happy in his heart), "manis berseri" (sweetly radiant)
- Islamic religious terminology embedded naturally in the narrative
- Place names and character names that must not be translated

### Dialectal/Archaic Forms
The text uses standard Classical Malay literary language, not a regional dialect. The Sambas (West Kalimantan) provenance affects the manuscript tradition but not the literary register of the syair itself.

---

## 4. Content Completeness

### Completeness Assessment
The text appears **substantially complete**. The narrative runs from the opening encounter between Cucu Wangkang and Sultan Abidin through to the reunion of Sultan Abidin with Siti Zubaidah and the return to Negeri Kumbayat. The final quatrains describe the ruined state of Negeri Kumbayat upon their return — this matches the expected ending of the Syair Siti Zubaidah tradition.

The page numbers run from 9 to 380 (372 pages of syair text), which is consistent with a complete text.

### Quatrain Formatting Consistency
- Overwhelmingly consistent 4-line quatrains
- The dual formatting (dense vs. spaced) does not affect content — only blank line spacing differs
- No obviously missing quatrains detected (narrative flows continuously)
- A few lines appear garbled (see OCR section) but none are completely unreadable

### Corrupt Sections
- **Lines 324–328**: Library stamp OCR (must be removed)
- **Line 318**: Trailing OCR noise (`,-________ _ _ -,`)
- **Line 384**: Truncated line (`Kopi juktmg pagilab`) — unclear meaning, likely OCR corruption
- Otherwise, no sections are garbled beyond recognition

---

## 5. Processing Recommendations

### What to Strip
1. **Lines 1–246**: Introduction, summary, and header — all modern Indonesian prose, not part of the syair
2. **Lines 12444–12453**: Bibliography
3. **Standalone page numbers**: Lines matching `^\s*\d+\s*$` within the syair section
4. **Library stamp**: Lines 324–328
5. **Inline stanza reference numbers**: Strip leading `NNN\t` patterns and `/N/\t` patterns from verse lines
6. **"TRANSLITERASI" / "SYAIR SITI ZUBAIDAH" header**: Lines 247–248

### Translatable Syair Range
**Lines 249–12443** (after stripping page numbers, stamp, and header).

### Display Mode
**Poetry.** This is a syair — narrative verse in quatrains. Should use `textType: "poetry"` in the database. Each quatrain should be one paragraph unit (4 lines displayed together). Line numbers every 5th line in the left gutter would work well.

### Chaptering Strategy
Since the syair has no internal chapter divisions, chaptering must be imposed. Options:

**Recommended: Chapter by page number groups (~20 pages per chapter = ~19 chapters)**
The printed page numbers (9–380) provide natural breakpoints. Group roughly 20 pages per chapter for ~19 chapters of manageable length. This gives each chapter approximately 130–140 quatrains.

Alternative: Use the inline stanza reference numbers (e.g., every 100 quatrains), but these are sparse and inconsistently placed.

### Cleaning Steps Needed
1. Strip introduction (lines 1–248), bibliography (12444+), and library stamp (324–328)
2. Remove standalone page number lines
3. Strip inline stanza numbers from verse lines (regex: `^\d+\s*\t` → empty)
4. Strip `/N/\s*\t` markers from verse lines
5. Normalize blank lines: collapse spaced-format sections so every quatrain is exactly 4 consecutive lines separated by one blank line
6. OCR correction pass (automated):
   - `!` → `l` when preceded by a letter and followed by a lowercase letter or space (e.g., `sambi!` → `sambil`)
   - Restore common `I`→`l` substitutions at word beginnings before lowercase (`Ialu` → `lalu`)
   - Fix `9i` → `di`, `0J` → `Di`
   - Fix `+` → `t` in known words
   - Remove trailing OCR noise (underscores, tildes, stray punctuation)
7. Group every 4 consecutive non-blank lines into a quatrain
8. Assign chapter boundaries based on page number groups

### Malay-Specific Translation Prompt Considerations
A custom prompt for Classical Malay (`ms`) should include:
- **Register**: This is court poetry; maintain formal/elevated English register
- **Formulaic phrases**: Many set phrases repeat (e.g., "terlalu suka di dalamnya dada", "manis berseri"). Translate consistently throughout.
- **Royal vocabulary**: `Baginda` = His/Her Majesty; `duli` = (royal epithet); `titah` = royal command; `sembah` = obeisance/petition; `semayam` = to be seated (royally)
- **Islamic terms**: Preserve Arabic-origin terms where appropriate (e.g., keep "salat" not "prayer", or provide both)
- **Names**: Do not translate character names (Sultan Abidin, Siti Zubaidah, Cucu Wangkang, Jafar Sidik, etc.) or place names (Negeri Kumbayat, Negeri Cina, Pulau Peringgai)
- **Verse form**: The English translation should read as natural English verse or elevated prose — do not attempt to reproduce the AAAA rhyme scheme, but maintain a poetic register
- **Syair convention**: Each quatrain is a self-contained unit of meaning. Translate quatrain-by-quatrain.

---

## 6. Final Readiness Grade

### Grade: **B- (Minor-to-moderate cleanup needed, straightforward processing)**

### Justification
- The text is **complete** and covers the full narrative
- The syair section is clearly demarcated (lines 249–12443)
- OCR errors are **systematic and patterned** — the majority can be fixed with regex substitutions
- The formatting inconsistency (dense vs. spaced) is annoying but mechanically solvable
- No manual transcription or re-OCR is needed
- The language (Classical Malay) is well within AI translation capability, though a good prompt is essential
- The main challenge is the OCR cleanup, which requires a careful processing script but no manual intervention

### Recommendation: **PASS**

This text is ready for the processing pipeline. It fits **Workflow B (OCR Processing)** from the reference guide — a multi-step processing script with OCR cleanup, formatting normalization, and quatrain grouping. Estimated development effort for the processing script: moderate (comparable to the Carmina Graeca or Lombards pipelines).

### Estimated Output
- ~2,600 quatrains across ~19 chapters
- Total translatable content: ~10,500 verse lines
- Language: `ms` (Malay) — new language to add to the languages table
- Text type: poetry
- Author: "Anonymous" or "Unknown" (traditional Malay syair, no attributed author)
- Title: "The Syair of Siti Zubaidah (Syair Siti Zubaidah)"
