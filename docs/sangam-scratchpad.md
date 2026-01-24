# Sangam Tamil Corpus Organiser — Scratchpad

## Session 1 (2026-01-23)

### Task
Survey the 1095-file Project Madurai Tamil corpus and identify/extract the Ettuthokai (Eight Anthologies) and Pattuppāṭṭu (Ten Idylls) works.

### Corpus Survey Results

The corpus contains 1095 text files from Project Madurai. Files are named with a numeric prefix (1-1095) followed by the Tamil title. The collection covers a very wide range of Tamil literature from Sangam era through modern times, including:
- Sangam classical poetry (very sparse — see below)
- Bhakti literature (Tevaram, Tiruvaymoli, etc.)
- Medieval Tamil grammar (Tolkappiyam, Nannul, etc.)
- Epics (Silappathikaram, Manimegalai, Kambaramayanam)
- Jain/Buddhist texts
- Colonial and modern prose, novels, essays
- Devotional minor literature (pillaitamil, antati, kovai, etc.)
- Bible translations
- Historical/scholarly works

### Works Found (Ettuthokai)

| # | Work | File(s) | Status | Notes |
|---|------|---------|--------|-------|
| 1 | Naṟṟiṇai (நற்றிணை) | **NOT FOUND** | ABSENT | No file in corpus |
| 2 | Kuṟuntokai (குறுந்தொகை) | **NOT FOUND** | ABSENT | No file in corpus |
| 3 | Aiṅkuṟunūṟu (ஐங்குறுநூறு) | **NOT FOUND** | ABSENT | No file in corpus |
| 4 | Patiṟṟuppattu (பதிற்றுப்பத்து) | **NOT FOUND** | ABSENT | Only later "patirruppattu antati" devotional works |
| 5 | Paripāṭal (பரிபாடல்) | **NOT FOUND** | ABSENT | No file in corpus |
| 6 | Kalittokai (கலித்தொகை) | **NOT FOUND** | ABSENT | Only "kalitturai" devotional works |
| 7 | Akanāṉūṟu (அகநானூறு) | 229_அகநானுறு - மூலம்.txt | **PROCESSED** | 9111 lines, verse-only text, 400/400 poems extracted (complete) |
| 8 | Puṟanāṉūṟu (புறநானூறு) | 494_... + 531_... | **PROCESSED** | Only verses 131-200 and 341-400 (with commentary). 128 poems extracted |

### Works Found (Pattuppāṭṭu)

| # | Work | File(s) | Status | Notes |
|---|------|---------|--------|-------|
| 1 | Tirumurukāṟṟuppaṭai | **NOT FOUND** (only later imitations in 983_) | ABSENT | File 983 has 5 different Murukan arruppadais — NOT the Sangam original |
| 2 | Porunarāṟṟuppaṭai | 63_பொருநாறாற்றுப்படை.txt | **PROCESSED** | Complete (248 lines) |
| 3 | Ciṟupāṇāṟṟuppaṭai | **NOT FOUND** | ABSENT | |
| 4 | Perumpāṇāṟṟuppaṭai | **NOT FOUND** | ABSENT | |
| 5 | Mullaippāṭṭu | **NOT FOUND** (339_ is an essay ABOUT mullai, not the poem) | ABSENT | |
| 6 | Maturaikkāñci | **NOT FOUND** (259_ is Maturaikkovai, a different work) | ABSENT | |
| 7 | Neṭunalvāṭai | **NOT FOUND** | ABSENT | |
| 8 | Kuṟiñcippāṭṭu | **NOT FOUND** (401_ is an essay "Kurinji Malar") | ABSENT | |
| 9 | Paṭṭiṉappālai | **NOT FOUND** | ABSENT | |
| 10 | Malaipaṭukaṭām | **NOT FOUND** | ABSENT | |

### Summary of Available Texts

**Successfully processed:**
1. Akananuru (அகநானூறு) — 400 poems (complete), 7157 verse lines
2. Purananuru (புறநானூறு) — 128 poems (verses 131-200 and 341-400 only), 2083 verse lines
3. Porunarāṟṟuppaṭai — complete (248 verse lines)

**Total: 3 out of 18 Sangam works are present in this corpus.**

The other 15 works are simply NOT in the Project Madurai collection (or at least not in this 1095-file snapshot of it).

### Format Patterns Discovered

#### Project Madurai Header
All files follow this structure:
```
Title: [Tamil title]
Author: [author/editor]
Source: https://www.projectmadurai.org/pm_etexts/utf8/pmuniNNNN.html
==============================
[blank]
[BOM character]
[romanized title]
[Tamil title]
[romanized title]
In tamil script, unicode/utf-8 format
Acknowledgements:
[credits...]
© Project Madurai, 1998-20XX.
[standard disclaimer]
```

#### Akananuru Format
- Verse-only text (மூலம்) with no commentary
- Section headers: "1. களிற்றியாணை நிரை", "2. மணிமிடை பவளம்", "3. நித்திலக்கோவை"
- Each poem: standalone poem number, verse lines, embedded line markers (multiples of 5), total line count
- Key insight: poem boundaries identified by CONSECUTIVE standalone numbers (total_count + poem_number)

#### Purananuru Format
- Text with commentary (மூலமும் உரையும்)
- Each poem: "NNN. [Poet Name]", prose intro, verse text, "திணை" colophon, "உரை" commentary, "விளக்கம்" explanation, separator "---"
- Verse extracted by finding short Tamil lines between prose intro and colophon

#### Porunarāṟṟuppaṭai Format
- Metadata block (author, patron, genre, line count)
- Verse with embedded trailing line numbers (e.g., "விளக்கழ லுருவின் விசியுறு பச்சை              5")
- Colophon "பொருநர் ஆற்றுப்படை முற்றிற்று."

### Processing Issues

1. **Akananuru ambiguity (RESOLVED)**: 5 poems (104, 131, 319, 396, 400) were initially missed due to three distinct formatting issues in the source file: split numbers ("1 5" instead of "15"), embedded annotations replacing standalone total_counts, and duplicate/mistyped poem numbers. All fixed in Session 2 — now 400/400 complete.

2. **Purananuru partial**: Only 2 out of 4+ expected part files are present. Verses 1-130 and 201-340 are missing from this corpus.

3. **Purananuru verse extraction**: One poem (154) could not have its verse separated from commentary. The prose/verse boundary detection is heuristic.

### Technical Decisions

- **Output format**: One poem per file (`poem-NNN.txt`), clean Tamil text only
- **Line numbers removed**: All embedded line markers stripped
- **No transliteration**: Output is pure Unicode Tamil script
- **Invocation poems**: Stored separately as `invocation.txt`
- **Scripts**: TypeScript in `scripts/sangam/`, using only `fs` and `path` (no external deps)

### What Remains

1. **Other notable classical texts in the corpus** (for future processing):
   - Tolkappiyam (100, 500, 516): Tamil grammar, oldest extant
   - Tirukkural (1): Ethical couplets
   - Silappathikaram (46, 111): Epic
   - Manimegalai (141): Epic
   - Nālāyira Divya Prabandham: Vaishnava devotional
   - Tevaram: Saiva devotional
   - Various Pathinenkilkanakku texts (Naladiyar, Palamoli Nanuru, etc.)

2. **Missing Sangam texts**: 15 of 18 works are absent. These would need to be sourced from:
   - Project Madurai website directly (may have more texts not in this snapshot)
   - Tamil Virtual Academy (tamilvu.org)
   - University of Cologne Tamil corpus
   - Other digital Tamil libraries

3. **Quality improvements possible**:
   - ~~Fix the 5 missing Akananuru poems manually~~ DONE (see Session 2 below)
   - Verify poem line counts against known critical editions
   - Add metadata (poet name, tiṇai, tuṟai) for each poem

---

## Session 2 (2026-01-23, continued)

### Task
Fix the 5 missing Akananuru poems (104, 131, 319, 396, 400) by identifying and addressing the root causes in the source file formatting.

### Root Cause Analysis

The 5 missing poems had 3 distinct types of formatting issues:

#### Type 1: Split numbers (OCR artifact)
- **Poems 104 and 396**: The total_count "15" appears as "1 5" (with a space) in the source file
- Lines affected: 2463, 8981
- The tokenizer saw "1 5" as a text token, not a number
- **Fix**: Pre-normalize lines matching `/^\d+\s+\d+$/` by removing internal spaces

#### Type 2: Embedded annotations replacing standalone total_count
- **Poems 130 and 400**: Instead of a standalone total_count number, the last verse line has a tab-separated annotation like `.129-18` or `.399-18` (poem_number-line_count)
- Lines affected: 3062, 9078
- The annotations mean "poem 129 has 18 lines" etc.
- **Fix**: Detect annotation pattern `\t.NNN-NN` at end of line, emit the line count (NN) as a synthetic number token

#### Type 3: Duplicate/mistyped poem numbers
- **Poems 131 and 319**: The source file has the PREVIOUS poem's number repeated instead of the correct number
  - "130" appears twice (line 3063 and 3081) — second should be "131"
  - "318" appears twice (line 7247 and 7266) — second should be "319"
- **Fix**: If poem N not found, search for a SECOND occurrence of (N-1) with valid predecessor after the position where (N-1) was already found

#### Bonus: Colophon/footer in last poem
- **Poem 400**: Being the last poem, had no boundary to stop at, so colophon ("அகநானுறு  முற்றிற்று") and English footer ("This page was last updated...") were included
- **Fix**: Stop verse extraction at lines containing "முற்றிற்று" or starting with "This page was"

### Additional Discovery: Tab-annotated lines

The source file has 11 lines with tab characters. Three patterns:
1. `.NNN-NN` annotations (poem_number-line_count): lines 3062, 5656, 9078
2. Trailing `\t.` (lone period after tab): lines 3795, 4218, 4333, 5000, 6414, 8123, 9090, 9108
3. Trailing `\t` with whitespace: line 8940

The `.NNN-NN` annotations on lines 3062 and 9078 are at poem boundaries (end of poems 129, 399). The one on line 5656 is mid-poem (within poem 246, at line 10) — it's just a line-count marker and doesn't affect poem detection.

All tab content is stripped from text tokens in the output.

### Results

- **Before**: 395/400 poems, 7,162 verse lines
- **After**: 400/400 poems (100% complete), 7,157 verse lines
- Section breakdown: 120 + 180 + 100 = 400 poems (correct for Akananuru's 3 sections)

### Verification

Cross-checked annotations against extracted data:
- ".129-18" annotation: poem 129 output has 18 lines (confirmed)
- ".399-18" annotation: poem 399 output has 18 lines (confirmed)

Spot-checked all 5 previously-missing poems against source file line numbers:
- Poem 104 (17 lines): matches source lines 2465-2481
- Poem 130 (14 lines): matches source lines 3064-3079
- Poem 131 (15 lines): matches source lines 3082-3098
- Poem 319 (16 lines): matches source lines 7267-7284
- Poem 396 (19 lines): matches source lines 8983-9001
- Poem 400 (26 lines): matches source lines 9080-9109 (excluding colophon/footer)
