# Sangam Tamil Corpus — Inspector Report

**Date:** 2026-01-23
**Inspector:** Claude Opus 4.5
**Scope:** Full inspection of the Sangam Tamil extraction pipeline, comparing source corpus against extracted output, quality checking processed files, and identifying remaining work.

---

## 1. Executive Summary

The Sangam organiser agent successfully:
- Surveyed the 1,095-file Project Madurai Tamil corpus
- Identified which Sangam works are present (3 out of 18)
- Wrote 3 processing scripts for the available texts
- Extracted 400 Akananuru poems (100% complete), 128 Purananuru poems (32%), and the complete Porunarāṟṟuppaṭai (248 lines)
- Created proper directory structure for all 18 canonical Sangam works
- Documented all findings in scratchpad and reference files
- Set up a Tamil translation script using Gemini 2.5 Flash
- Added Tamil ("ta") language prompt to the translation prompts module

**Key finding:** The majority of Sangam texts (15/18) are simply absent from this Project Madurai corpus snapshot. The agent correctly identified this limitation and documented it, rather than producing incorrect output from unrelated files.

---

## 2. Source Corpus (`data/difficult_extra_processing/tamil_corpus/`)

- **Total files:** 1,095 (confirmed by directory listing)
- **Total size:** ~625 MB of UTF-8 Tamil text files
- **Naming convention:** `NNN_Tamil title.txt` where NNN is a numeric identifier (1-1095+)
- **Content range:** Extremely broad — Sangam era through modern Tamil literature, devotional poetry, epics, grammar treatises, novels, essays, Bible translations

### Sangam-relevant files identified:

| File | Content | Used? |
|------|---------|-------|
| `229_அகநானுறு - மூலம்.txt` | Akananuru verse text (no commentary) | YES - fully processed |
| `494_புற நானூறு - மூலமும்; உரையும் பாகம் 1 பாடல்கள் 1-200).txt` | Purananuru with commentary, poems 131-200 only | YES - processed |
| `531_புற நானூறு - மூலமும் விளக்க உரையும்.txt` | Purananuru with commentary, poems 341-400 | YES - processed |
| `63_பொருநாறாற்றுப்படை.txt` | Porunarāṟṟuppaṭai (complete) | YES - processed |
| `983_...ஆற்றுப்படை நூல்கள்.txt` | 5 later Murukan arruppadais (NOT the Sangam original) | Correctly rejected |

### Files correctly rejected:
- `339_` essay about Mullai (not Mullaippattu)
- `259_` Maturaikkovai (not Maturaikkanci)
- `401_` essay "Kurinji Malar" (not Kurincippattu)
- `274/275/291/475/705/706_` later devotional patirruppattu works (not Sangam Patirruppattu)
- `457_` "Akame Puram" (modern work, not Akananuru)

**Assessment:** The agent's corpus survey was thorough and accurate. It correctly distinguished Sangam-era works from later texts with similar names, avoiding false matches.

---

## 3. Extracted Output (`data/raw/sangam/`)

### Directory Structure

```
data/raw/sangam/
├── ettuthokai/                  (Eight Anthologies)
│   ├── akananuru/               401 files (invocation.txt + 400 poem files)
│   ├── puranānuru/              128 files (poems 131-200, 341-400 minus gaps)
│   ├── ainkurunuru/             EMPTY (not in corpus)
│   ├── kalittokai/              EMPTY (not in corpus)
│   ├── kuruntokai/              EMPTY (not in corpus)
│   ├── narrinai/                EMPTY (not in corpus)
│   ├── paripadal/               EMPTY (not in corpus)
│   └── patirruppattu/           EMPTY (not in corpus)
└── pattuppattu/                 (Ten Idylls)
    ├── porunararruppadai/       1 file (poem.txt, 248 lines)
    ├── cirupanarruppadai/       EMPTY (not in corpus)
    ├── kurincippattu/           EMPTY (not in corpus)
    ├── malaipatakatam/          EMPTY (not in corpus)
    ├── maturaikkanci/           EMPTY (not in corpus)
    ├── mullaippattu/            EMPTY (not in corpus)
    ├── netunalvatai/            EMPTY (not in corpus)
    ├── pattinappalai/           EMPTY (not in corpus)
    ├── perumpanarruppadai/      EMPTY (not in corpus)
    └── tirumurukarruppadai/     EMPTY (not in corpus)
```

### File Counts Summary

| Directory | Files | Lines | Status |
|-----------|-------|-------|--------|
| akananuru | 401 | 7,173 | COMPLETE (400/400 poems + invocation) |
| puranānuru | 128 | 2,083 | PARTIAL (128/400 poems) |
| porunararruppadai | 1 | 248 | COMPLETE |
| All other directories | 0 | 0 | Empty (source not available) |

**Total extracted:** 530 files, 9,504 verse lines

---

## 4. Quality Assessment

### 4.1 Akananuru (அகநானூறு) — EXCELLENT

**Coverage:** 400/400 poems (100%)
**Total verse lines:** 7,157 (from poem files; 7,173 including invocation and trailing newlines)
**Line count range:** 13-31 lines per poem (reasonable for Akananuru)

**Spot-check results:**
- **poem-001.txt** (19 lines): Pure Tamil verse, no headers/footers, no embedded numbers. Content looks correct.
- **poem-104.txt** (17 lines): One of the 5 originally-missing poems. Now correctly extracted. Pure verse.
- **poem-131.txt** (15 lines): Another fixed poem (duplicate number issue). Clean output.
- **poem-200.txt** (14 lines): Mid-collection. Clean.
- **poem-319.txt** (16 lines): Fixed poem. Clean.
- **poem-400.txt** (26 lines): Last poem. Clean, no colophon or English footer text.
- **invocation.txt** (16 lines): Standalone invocatory verse. Clean.

**Issues found:** NONE. No stray Project Madurai headers, no standalone numbers, no English text, no colophon markers. All content is pure Tamil verse.

**File naming:** Consistent `poem-NNN.txt` with 3-digit zero-padded numbering.

### 4.2 Purananuru (புறநானூறு) — GOOD with minor issues

**Coverage:** 128/400 poems (only 32% — but this is a corpus limitation, not an extraction failure)
**Available ranges:** poems 131-200 (69 poems) and 341-400 (59 poems)
**Missing from output:** poem-154 (range 131-200) and poem-394 (range 341-400) — verse extraction failed for these 2 poems

**Total verse lines:** 2,083
**Line count range:** 4-40 lines per poem

**Spot-check results:**
- **poem-131.txt** (4 lines): Very short poem — this is correct for Purananuru (some poems are genuinely only 4 lines)
- **poem-155.txt** (8 lines): Clean Tamil verse
- **poem-200.txt** (17 lines): Clean
- **poem-341.txt** (19 lines): Clean
- **poem-365.txt** (11 lines): Clean
- **poem-390.txt** (28 lines): Clean
- **poem-400.txt** (23 lines): Clean (last poem in collection)

**Issues found:**

1. **Trailing line numbers not stripped (5 poems):** Files poem-171, poem-175, poem-181, poem-183, and poem-196 contain lines with trailing embedded line numbers (e.g., "...வாழியவே.   15"). The `stripTrailingNumber()` function in the script should have caught these, but the spacing/pattern differs from what the regex expects. The trailing numbers are minor noise (only 5 out of 128 poems affected), but they should be cleaned.

2. **Missing poems 154 and 394:** The verse extraction heuristic failed for these 2 poems. The scratchpad notes poem 154 specifically as a known failure ("One poem (154) could not have its verse separated from commentary").

3. **Ellipsis in poem-390.txt (line 25):** Contains "..." which appears to be in the original source (indicating a lacuna in the manuscript), so this is correct behavior.

4. **Dotted line in poem-341.txt (line 6):** Contains "................" which represents a textual lacuna in the source. This is correct.

### 4.3 Porunarāṟṟuppaṭai — EXCELLENT

**Coverage:** Complete (248/248 lines)
**File:** Single `poem.txt` file

**Spot-check results:**
- First line matches expected opening: "அறாஅ யாணரகன் றலைப் பேரூர்ச்"
- Last line is the expected closing: "காவிரி புரக்கு நாடுகிழ வோனே."
- No embedded line numbers remaining
- No header/footer text
- Pure Tamil verse throughout

**Issues found:** NONE.

---

## 5. Processing Scripts (`scripts/sangam/`)

### 5.1 clean-akananuru.ts (333 lines)

**Purpose:** Extract 400 poems from the verse-only Akananuru source file.

**Algorithm:** Tokenizer-based approach:
1. Parses file into tokens (num, text, section)
2. Identifies poem boundaries by looking for number tokens preceded by other numbers (total_count) or section headers
3. Three explicit fixes for source-file formatting issues (split numbers, embedded annotations, duplicate poem numbers)
4. Colophon/footer stripping for the last poem

**Quality:** Excellent. Well-documented with clear comments explaining the algorithm and each fix. Produces 400/400 poems with no errors.

### 5.2 clean-porunar.ts (128 lines)

**Purpose:** Extract the 248-line Porunarāṟṟuppaṭai poem.

**Algorithm:**
1. Finds verse start after metadata block
2. Strips trailing line numbers
3. Stops at colophon

**Quality:** Clean and simple. Produces correct output.

### 5.3 clean-puranānuru.ts (273 lines)

**Purpose:** Extract poems from commentary-heavy Purananuru files.

**Algorithm:**
1. Finds poem headers ("NNN. Poet Name")
2. Collects block of lines until next poem or separator
3. Identifies verse section between prose introduction and colophon ("திணை" / "உரை" lines)
4. Uses heuristics (line length, consecutive short lines) to find verse/prose boundary

**Quality:** Good but imperfect. The heuristic approach necessarily fails for some poems where the verse/prose boundary is ambiguous. 128/130 available poems extracted (98.5% success rate). The trailing-number stripping has edge cases (5 poems with residual numbers).

### 5.4 translate-tamil.ts (529 lines)

**Purpose:** Batch translate Tamil texts using Google Gemini 2.5 Flash.

**Features:**
- Uses the project's standard translation prompt system (with Tamil-specific Sangam prompt)
- Chunk-based batching (4000 chars per batch)
- Retry with batch splitting on failure
- JSON repair for malformed LLM output
- Database integration (creates translation versions)

**Quality:** Well-structured, mirrors the existing `translate-batch.ts` script. Uses Gemini rather than DeepSeek for Tamil (sensible choice given Gemini's superior Tamil language support).

**Note:** This script requires a Gemini API key (`GEMINI_API_KEY`) and the `@google/genai` package, which appears to be installed.

---

## 6. Documentation Quality

### sangam-scratchpad.md

**Content:** Two detailed sessions documenting:
- Complete corpus survey results (all 18 Sangam works checked)
- Format analysis for each source file type
- Root cause analysis for the 5 initially-missing Akananuru poems
- Technical decisions and verification steps

**Quality:** Excellent. Thorough, well-organized, with clear problem/solution documentation.

### sangam-reference.md

**Content:** Structured reference guide with:
- Current state table (texts, coverage, file locations)
- Directory tree
- Script descriptions
- Corpus catalog of other notable works
- Language/encoding notes
- Known issues and future work

**Quality:** Excellent. Provides a clear at-a-glance overview of the entire Sangam processing effort.

---

## 7. Organisation Assessment

### What the agent did well:

1. **Correct identification of available texts:** Out of 1,095 files, correctly found only 3 Sangam works (4 files). Did not produce false positives from similarly-named later works.

2. **Complete directory structure:** Created directories for all 18 canonical Sangam works, even those not available, providing a clear framework for future additions.

3. **High-quality extraction:** The Akananuru extraction is 100% complete with zero errors. The Porunarāṟṟuppaṭai is perfect.

4. **Thorough debugging:** Session 2 tracked down and fixed 5 edge cases in the Akananuru source file, using 3 different fix strategies.

5. **Honest documentation:** Clearly documented what's missing and why, rather than over-claiming.

6. **Translation infrastructure:** Set up the Tamil translation pipeline (Gemini-based) with a proper Sangam-specific prompt covering tinai symbolism, akam/puram themes, etc.

### What could be improved:

1. **Purananuru trailing numbers:** 5 poems still have residual embedded line numbers. The `stripTrailingNumber` regex could be improved.

2. **Missing poems 154 and 394:** These could potentially be recovered with more sophisticated verse/prose detection (or manual extraction as a fallback).

3. **No processing pipeline script:** There is no `process-sangam.ts` or equivalent that converts the raw poem files to the `data/processed/` JSON format needed for database seeding. This is the critical missing link between extraction and deployment.

4. **No seed-db.ts entries:** Tamil ("ta") is not defined as a language in `seed-db.ts`, and no Sangam texts/authors are defined there. The extraction is done, but the database integration is not.

---

## 8. Remaining Work (Priority Order)

### High Priority (Required for deployment):

1. **Create processing script** (`scripts/process-sangam.ts` or similar):
   - Convert `data/raw/sangam/ettuthokai/akananuru/poem-NNN.txt` files to `data/processed/akananuru/chapter-NNN.json` format
   - Convert `data/raw/sangam/ettuthokai/puranānuru/poem-NNN.txt` to `data/processed/purananuru/chapter-NNN.json`
   - Convert `data/raw/sangam/pattuppattu/porunararruppadai/poem.txt` to `data/processed/porunararruppadai/chapter-001.json`
   - Output format: `{ chapterNumber, title, sourceContent: { paragraphs: [{ index, text }] } }`
   - For poetry, each verse line should be a separate paragraph entry

2. **Add Tamil language to seed-db.ts:**
   ```typescript
   { code: "ta", name: "Tamil", displayName: "தமிழ்" }
   ```

3. **Add authors to seed-db.ts:**
   - "Various Poets" or per-anthology attribution for Akananuru/Purananuru
   - Specific poet for Porunarāṟṟuppaṭai (Muṭattāmakkanniyār)

4. **Add text entries to seed-db.ts:**
   - Akananuru (400 chapters, language: ta, textType: poetry)
   - Purananuru (chapters covering available poems, language: ta, textType: poetry)
   - Porunarāṟṟuppaṭai (1 chapter, language: ta, textType: poetry)

5. **Run database seeding and translation:**
   - `pnpm tsx scripts/seed-db.ts`
   - `pnpm tsx scripts/translate-tamil.ts --text akananuru`
   - etc.

### Medium Priority (Quality improvements):

6. **Fix trailing numbers in 5 Purananuru poems** (171, 175, 181, 183, 196):
   - Update the regex in `clean-puranānuru.ts` or do a one-time manual fix
   - Re-run the script

7. **Attempt extraction of poems 154 and 394:**
   - Manual inspection of the source files at those positions
   - Either fix the heuristic or extract manually

### Low Priority (Future enrichment):

8. **Source missing Sangam texts** (15/18 absent from this corpus):
   - Check full Project Madurai website catalog (this is a subset)
   - Tamil Virtual Academy (tamilvu.org)
   - University of Cologne Tamil corpus
   - Other digital Tamil libraries

9. **Add poem metadata:**
   - Poet names (available in Purananuru commentary, but not in Akananuru source-only text)
   - Tinai/turai classifications
   - Patron names

10. **Verify against critical editions:**
    - Cross-check line counts with published scholarship
    - Verify poem boundaries for correctness

---

## 9. Canonical Sangam Works — Coverage Matrix

### Ettuthokai (Eight Anthologies)

| # | Work | Poems | Status | Notes |
|---|------|-------|--------|-------|
| 1 | Akananuru (அகநானூறு) | 400/400 | COMPLETE | All poems extracted |
| 2 | Purananuru (புறநானூறு) | 128/400 | PARTIAL | Only poems 131-200 and 341-400 in corpus |
| 3 | Narrinai (நற்றிணை) | 0/400 | NOT IN CORPUS | |
| 4 | Kuruntokai (குறுந்தொகை) | 0/401 | NOT IN CORPUS | |
| 5 | Ainkurunuru (ஐங்குறுநூறு) | 0/500 | NOT IN CORPUS | |
| 6 | Patirruppattu (பதிற்றுப்பத்து) | 0/~80 | NOT IN CORPUS | Some poems lost historically |
| 7 | Kalittokai (கலித்தொகை) | 0/150 | NOT IN CORPUS | |
| 8 | Paripadal (பரிபாடல்) | 0/22 | NOT IN CORPUS | Only 22 survive |

### Pattuppattu (Ten Idylls)

| # | Work | Lines | Status | Notes |
|---|------|-------|--------|-------|
| 1 | Tirumurukāṟṟuppaṭai | 0/317 | NOT IN CORPUS | Only later imitations found |
| 2 | Porunarāṟṟuppaṭai | 248/248 | COMPLETE | |
| 3 | Ciṟupāṇāṟṟuppaṭai | 0/269 | NOT IN CORPUS | |
| 4 | Perumpāṇāṟṟuppaṭai | 0/500 | NOT IN CORPUS | |
| 5 | Mullaippāṭṭu | 0/103 | NOT IN CORPUS | |
| 6 | Maturaikkāñci | 0/782 | NOT IN CORPUS | |
| 7 | Neṭunalvāṭai | 0/188 | NOT IN CORPUS | |
| 8 | Kuṟiñcippāṭṭu | 0/261 | NOT IN CORPUS | |
| 9 | Paṭṭiṉappālai | 0/301 | NOT IN CORPUS | |
| 10 | Malaipaṭukaṭām | 0/583 | NOT IN CORPUS | |

**Overall coverage:** 3 out of 18 works available. For the available works, extraction quality is excellent (99.6% — only 2 poems failed out of 530).

---

## 10. Architecture Notes

### Naming Conventions

The directory names use simplified romanization:
- `akananuru` (standard: Akanāṉūṟu)
- `puranānuru` (uses ā but not other diacritics)
- `porunararruppadai` (standard: Porunarāṟṟuppaṭai)
- `ettuthokai` (standard: Eṭṭuttokai)
- `pattuppattu` (standard: Paṭṭuppāṭṭu)

This is acceptable for filesystem paths but should be noted for slug generation when seeding the database.

### File Format

- One poem per file for anthology texts (akananuru, purananuru)
- Single file for standalone poems (porunararruppadai)
- Pure Tamil Unicode text, UTF-8 encoded
- No BOM, no headers, no metadata
- Lines separated by `\n`, files end with trailing newline

### Integration Points

The existing project infrastructure expects:
1. Raw files in `data/raw/` (DONE)
2. Processed JSON in `data/processed/` (NOT DONE)
3. Author/text entries in `seed-db.ts` (NOT DONE)
4. Language entry in `seed-db.ts` (NOT DONE — "ta" exists only in prompts.ts)
5. Translation via batch script (translate-tamil.ts EXISTS but not yet runnable — no DB entries to translate)

---

## 11. Conclusion

The Sangam organiser agent did solid, careful work within the constraints of the available corpus. The Akananuru extraction is a particularly impressive result: 400/400 poems extracted from a complex source format with multiple edge cases, all resolved through careful analysis and targeted fixes.

The primary gap is not in extraction quality but in the "last mile" integration: converting raw poem files to the project's JSON format, adding Tamil language/author/text entries to the database seed script, and running the translation pipeline. This is straightforward mechanical work but has not yet been done.

The secondary gap is the corpus itself: 15/18 Sangam works are simply not available in this Project Madurai snapshot. Sourcing these from other digital Tamil libraries would significantly expand the collection, but this is an acquisition task rather than a processing task.
