# Sangam Tamil Corpus — Reference Guide

## Current State (2026-01-23)

### Processed Texts

| Text | Collection | Poems | Verse Lines | Source File | Output Dir |
|------|-----------|-------|-------------|-------------|------------|
| Akananuru (அகநானூறு) | Ettuthokai | 400/400 | 7,157 | `229_அகநானுறு - மூலம்.txt` | `data/raw/sangam/ettuthokai/akananuru/` |
| Purananuru (புறநானூறு) | Ettuthokai | 128/400 | 2,083 | `494_...txt` + `531_...txt` | `data/raw/sangam/ettuthokai/puranānuru/` |
| Porunarāṟṟuppaṭai (பொருநர் ஆற்றுப்படை) | Pattuppāṭṭu | 1 (complete) | 248 | `63_பொருநாறாற்றுப்படை.txt` | `data/raw/sangam/pattuppattu/porunararruppadai/` |

### Missing Texts (NOT in this corpus)

**Ettuthokai (6 missing):**
- Naṟṟiṇai (நற்றிணை) — 400 poems
- Kuṟuntokai (குறுந்தொகை) — 401 poems
- Aiṅkuṟunūṟu (ஐங்குறுநூறு) — 500 poems
- Patiṟṟuppattu (பதிற்றுப்பத்து) — ~80 poems (some lost)
- Paripāṭal (பரிபாடல்) — 22 surviving poems
- Kalittokai (கலித்தொகை) — 150 poems

**Pattuppāṭṭu (9 missing):**
- Tirumurukāṟṟuppaṭai (திருமுருகாற்றுப்படை) — 317 lines
- Ciṟupāṇāṟṟuppaṭai (சிறுபாணாற்றுப்படை) — 269 lines
- Perumpāṇāṟṟuppaṭai (பெரும்பாணாற்றுப்படை) — 500 lines
- Mullaippāṭṭu (முல்லைப்பாட்டு) — 103 lines
- Maturaikkāñci (மதுரைக்காஞ்சி) — 782 lines
- Neṭunalvāṭai (நெடுநல்வாடை) — 188 lines
- Kuṟiñcippāṭṭu (குறிஞ்சிப்பாட்டு) — 261 lines
- Paṭṭiṉappālai (பட்டினப்பாலை) — 301 lines
- Malaipaṭukaṭām (மலைபடுகடாம்) — 583 lines

---

## File Locations

### Source Corpus
```
data/difficult_extra_processing/tamil_corpus/     (1095 files, read-only)
```

### Output (clean text)
```
data/raw/sangam/
├── ettuthokai/
│   ├── akananuru/
│   │   ├── invocation.txt          (16 lines)
│   │   └── poem-001.txt ... poem-400.txt   (400 poems, complete)
│   ├── puranānuru/
│   │   ├── poem-131.txt ... poem-200.txt   (69 poems)
│   │   └── poem-341.txt ... poem-400.txt   (59 poems)
│   ├── narrinai/           (empty — not in corpus)
│   ├── kuruntokai/         (empty — not in corpus)
│   ├── ainkurunuru/        (empty — not in corpus)
│   ├── patirruppattu/      (empty — not in corpus)
│   ├── paripadal/          (empty — not in corpus)
│   └── kalittokai/         (empty — not in corpus)
└── pattuppattu/
    ├── porunararruppadai/
    │   └── poem.txt                (248 lines, complete)
    ├── tirumurukarruppadai/  (empty — not in corpus)
    ├── cirupanarruppadai/    (empty — not in corpus)
    ├── perumpanarruppadai/   (empty — not in corpus)
    ├── mullaippattu/         (empty — not in corpus)
    ├── maturaikkanci/        (empty — not in corpus)
    ├── netunalvatai/         (empty — not in corpus)
    ├── kurincippattu/        (empty — not in corpus)
    ├── pattinappalai/        (empty — not in corpus)
    └── malaipatakatam/       (empty — not in corpus)
```

### Scripts
```
scripts/sangam/
├── clean-akananuru.ts        (tokenizer + sequential poem detection)
├── clean-porunar.ts          (line number stripping)
└── clean-puranānuru.ts       (commentary/verse separation)
```

### Documentation
```
docs/
├── sangam-scratchpad.md      (session notes, technical decisions)
└── sangam-reference.md       (this file)
```

---

## Processing Scripts

### clean-akananuru.ts
- **Input**: Single file with verse-only text, embedded line markers, section headers
- **Algorithm**: Tokenize into (num, text, section), find poem numbers by checking if preceded by another number or section header, extract text tokens between boundaries
- **Coverage**: 400/400 poems (100%)
- **Fixes applied**:
  - FIX 1: Normalize split numbers ("1 5" -> "15") — OCR artifact in source (poems 104, 396)
  - FIX 2: Extract synthetic total_count from embedded annotations (".129-18", ".399-18") — enables detection of poems 130 and 400
  - FIX 3: Handle duplicate/mistyped poem numbers (source has "130" twice instead of "130, 131", and "318" twice instead of "318, 319") — fixes poems 131 and 319
  - Colophon/footer stripping: Stops verse extraction at "முற்றிற்று" or English footer text

### clean-porunar.ts
- **Input**: Single file with metadata block, verse text with trailing line numbers
- **Algorithm**: Find verse start (after metadata), strip trailing numbers, stop at colophon
- **Coverage**: Complete (248/248 lines)

### clean-puranānuru.ts
- **Input**: Two files with commentary (verses 131-200, 341-400)
- **Algorithm**: Detect poem headers ("NNN. Poet"), find verse block between prose intro and colophon line, strip embedded numbers
- **Coverage**: 128/130 available poems (1 failed verse extraction)
- **Known limitation**: Only 130 out of 400 poems are in the corpus at all

---

## Corpus Catalog (Other Notable Works)

For future processing, these works in the corpus might be of interest:

### Classical Tamil Grammar
| File | Title | Notes |
|------|-------|-------|
| 100 | தொல்காப்பியம் | Tolkappiyam (oldest Tamil grammar) |
| 500 | தொல்காப்பியம் பொருளதிகாரம் | Tolkappiyam Porulatikaram |
| 516 | தொல்காப்பியம் எழுத்ததிகாரம் | Tolkappiyam Eluttatikaram |
| 147 | நன்னூல் | Nannul (medieval grammar) |

### Pathinenkilkanakku (18 Minor Classics)
| File | Title | Notes |
|------|-------|-------|
| 1 | திருக்குறள் | Tirukkural |
| 16 | நாலடியார் | Naladiyar |
| 36 | பழமொழி நானூறு | Palamoli Nanuru |
| 587 | முது மொழிக் காஞ்சி | Mutumolikkanci |
| 121 | முத்தொள்ளாயிரம் | Muttollaayiram |

### Five Great Epics
| File | Title | Notes |
|------|-------|-------|
| 46, 111 | சிலப்பதிகாரம் | Silappathikaram (3 parts) |
| 141 | மணிமேகலை | Manimegalai |
| 35, 602 | சூளாமணி | Sulamani |
| 507 | குண்டலகேசி | Kundalakesi (fragments) |
| 62, 549 | வளையாபதி | Valaiyapati (fragments) |

### Bhakti Literature
| File | Title | Notes |
|------|-------|-------|
| 150-196 | தேவாரம் | Tevaram (12 parts) |
| 3, 94, 222 | திருவாசகம் | Tiruvacakam |
| 4, 9, 10 | திருமந்திரம் | Tirumantiram |
| 180-191 | திருப்புகழ் | Tiruppukal (4 parts) |
| 5-7 | நாலாயிர திவ்ய பிரபந்தம் | Nālāyira Divya Prabandham |

---

## Language / Encoding Notes

- All files are UTF-8 encoded Tamil Unicode
- Tamil script range: U+0B80–U+0BFF
- Some files contain BOM (U+FEFF) at start
- Text uses standard Tamil Unicode characters, no special/private-use characters observed
- Classical Tamil orthography is preserved (including rare archaic characters)

---

## Known Issues & Future Work

1. **Akananuru COMPLETE**: All 400 poems successfully extracted (previously 5 were missing due to source file formatting issues, now fixed).

2. **Purananuru gaps**: Verses 1-130 and 201-340 are not in this corpus. Need alternative sources.

3. **15 missing Sangam works**: Not available in this corpus snapshot. Need to check:
   - Full Project Madurai website catalog
   - Tamil Virtual Academy (tamilvu.org)
   - University of Cologne Tamil lexicography project

4. **Verse verification**: The extracted poems have not been verified against critical editions. Line counts should be checked against published scholarship.

5. **Metadata enrichment**: Each poem should ideally have:
   - Poet name
   - Tiṇai (thematic landscape)
   - Tuṟai (poetic situation/mode)
   - Patron (for heroic poems)
   This metadata exists in the Purananuru commentary files but not in the Akananuru source-text file.
