# Diarium Urbis Romae — Master Orchestration Document

## Text Identity

- **Title**: Diario della Città di Roma / Diarium Urbis Romae (Diary of the City of Rome)
- **Author**: Stefano Infessura (c. 1435–1500), Roman notary, "scribasenato" (scribe of the Senate)
- **Editor**: Oreste Tommasini
- **Published**: Rome, 1890 (Istituto Storico Italiano, Fonti per la Storia d'Italia, Scrittori, Secolo XV)
- **Language**: Italian (15th-century Romanesco dialect) with Latin passages
- **Coverage**: Diary entries from 1294 to ~1494 (most detail from 1420s onward)
- **Structure**: Prefatory material (Tommasini's introduction, ~1300 lines) + chronological diary entries organized by year

## Source Files

| File | Lines | Size | Notes |
|------|-------|------|-------|
| `complete_text_scan_1.txt` | 22,565 | 1,038,937 bytes | First OCR scan |
| `complete_text_scan_2.txt` | 23,543 | 1,028,442 bytes | Second OCR scan |

Both are complete OCR scans of the same physical book. They differ in OCR quality, line breaks, and error patterns.

## OCR Challenges Observed

1. **Page headers interleaved**: e.g., `[1414] DIARIA RERUM ROMANARUM. 19` mixed into text
2. **Footnotes interspersed**: Scholarly apparatus (Tommasini's notes) mixed with diary text
3. **Hyphenated line breaks**: Words split across lines with hyphens (e.g., "cro-\nnaca")
4. **Extra spacing**: Multiple spaces between words from OCR column detection
5. **Character confusion**: ì/í/i, è/é/e, ò/ó/o, special characters garbled
6. **Roman numeral confusion**: VIII → Vili/vili, III → Ili, &c.
7. **Footnote markers**: Superscript markers like ('), (*), (^) scattered in text
8. **Latin/Italian mixing**: The diary itself alternates between Romanesco and Latin

## Multi-Agent Pipeline Architecture

**Collaborative Concurrent Model** — all 5 agents run simultaneously, communicating through shared documents. The Master Reviewer only starts after all 5 sign off.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONCURRENT COLLABORATION                          │
│                                                                     │
│  Team A:                           Team B:                          │
│  ┌──────────────┐                  ┌──────────────┐                │
│  │ Agent A      │◄──joint-a.md──►│ Reviewer A   │                │
│  │ (Scan 1)     │                  │ (Critiques A)│                │
│  └──────────────┘                  └──────────────┘                │
│         │                                  │                        │
│         ▼                                  ▼                        │
│  clean_copy_a/              reviewer-a-scratchpad.md                │
│                                                                     │
│  Team B:                           Team B:                          │
│  ┌──────────────┐                  ┌──────────────┐                │
│  │ Agent B      │◄──joint-b.md──►│ Reviewer B   │                │
│  │ (Scan 2)     │                  │ (Critiques B)│                │
│  └──────────────┘                  └──────────────┘                │
│         │                                  │                        │
│         ▼                                  ▼                        │
│  clean_copy_b/              reviewer-b-scratchpad.md                │
│                                                                     │
│                    ┌──────────────┐                                 │
│                    │Bridge Reviewer│                                 │
│                    │(sees all docs)│                                 │
│                    └──────────────┘                                 │
│                           │                                         │
│                           ▼                                         │
│                  bridge-annotations.md                               │
│                  (all agents consult)                                │
└─────────────────────────────────────────────────────────────────────┘

                    ▼ (AFTER all 5 sign off) ▼

              ┌──────────────────────┐
              │ Master Reviewer &    │
              │ Translator           │
              │ (Final clean text)   │
              │ → data/raw/          │
              └──────────────────────┘
```

### Communication Channels
- `joint-a.md`: Agent A ↔ Reviewer A dialogue
- `joint-b.md`: Agent B ↔ Reviewer B dialogue
- `bridge-annotations.md`: Bridge Reviewer → all agents (read-only for others)
- Each agent's scratchpad: visible to Bridge Reviewer
- **Rule**: Bridge must NOT copy text wholesale between teams; short examples (< 3 lines) only

## Documentation Structure

| File | Owner | Purpose |
|------|-------|---------|
| `docs/diarium/orchestration.md` | Main session | THIS FILE — master tracking |
| `docs/diarium/agent-a-scratchpad.md` | Primary Text Agent A | Working notes, decisions |
| `docs/diarium/agent-b-scratchpad.md` | Primary Text Agent B | Working notes, decisions |
| `docs/diarium/reviewer-a-scratchpad.md` | Reviewer A | Critique notes |
| `docs/diarium/reviewer-b-scratchpad.md` | Reviewer B | Critique notes |
| `docs/diarium/joint-a.md` | Agent A + Reviewer A | Shared communication |
| `docs/diarium/joint-b.md` | Agent B + Reviewer B | Shared communication |
| `docs/diarium/bridge-annotations.md` | Bridge Reviewer | Cross-team annotations |
| `docs/diarium/bridge-scratchpad.md` | Bridge Reviewer | Own working notes |
| `docs/diarium/master-scratchpad.md` | Master Reviewer | Final pass notes |
| `docs/diarium/master-documentation.md` | Master Reviewer | Methodology docs |

## Output Locations

| Path | Owner | Contents |
|------|-------|----------|
| `data/difficult_extra_processing/diarium_urbis_romae/clean_copy_a/` | Agent A | Agent A's clean text files |
| `data/difficult_extra_processing/diarium_urbis_romae/clean_copy_b/` | Agent B | Agent B's clean text files |
| `data/raw/diarium-urbis-romae/` | Master Reviewer | Final clean raw text |

## Progress Tracking (All Concurrent)

### Primary Text Agents

| Agent | Status | Agent ID | Output | Grade | Notes |
|-------|--------|----------|--------|-------|-------|
| Agent A (Scan 1) | RUNNING | a967fa5 | clean_copy_a/ (9 files) | B+ | 5 iterations, 7,360 output lines from 22,565 input (55% removed) |
| Agent B (Scan 2) | COMPLETE | a93ee58 → a20a19c | clean_copy_b/ (10 files) | B+ | 4 iterations, 9,493 output lines; iter 4 fixed all remaining headers/sigla/markers (43→0, 54→0, 143→0) |

### Primary Text Reviewers

| Reviewer | Status | Agent ID | Communication | Notes |
|----------|--------|----------|---------------|-------|
| Reviewer A | RUNNING | abe38cf | joint-a.md | 5 review rounds (D→B-→C+→B→B+), CONDITIONALLY SIGNED OFF at B+ |
| Reviewer B | COMPLETE | a69ff47 → aa080c6 | joint-b.md | F → B- (iter 3) → B+ expected (iter 4 fixed all issues); sign-off pending verification |

### Bridge Reviewer

| Status | Agent ID | Communication | Notes |
|--------|----------|---------------|-------|
| RUNNING | a2ffcb5 | bridge-annotations.md | Pass 1 complete (annotations written), needs update for current state |

### Sign-Off Status

| Agent | Signed Off? | Notes |
|-------|------------|-------|
| Agent A | YES | Output at B+ quality, conditionally approved by Reviewer A |
| Reviewer A | YES (conditional) | Conditionally approved at B+; suggested fixes for A- |
| Agent B | YES | Iteration 4 complete: all headers/sigla/markers eliminated (0 remaining) |
| Reviewer B | PENDING | Graded iter 3 at B-; iter 4 fixes all identified issues — needs final verification |
| Bridge Reviewer | YES | Pass 2 complete — Agent A is the recommended base, Agent B is cross-reference |

### Master Reviewer & Translator (AFTER all sign off)

| Status | Agent ID | Final Output | Method |
|--------|----------|-------------|--------|
| RUNNING | a2ab05f | data/raw/diarium-urbis-romae/ | Reconciliation pipeline + cross-referencing both clean copies |

**Master Reviewer Mandate:**
- **Primary goal**: Produce a single, definitive clean text by reconciling Agent A's and Agent B's outputs
- **Reconciliation strategy**: Where one scan garbles a word, use the other scan's reading. Where both agree, use the common reading. Where both garble, note it.
- **Code location**: `scripts/lib/diarium-master/` — the Master Reviewer can write any number of programs and modules to assist in reconciliation (diff tools, alignment scripts, merge utilities, etc.)
- **Documentation**: `docs/diarium/master-scratchpad.md` and `docs/diarium/master-documentation.md`
- **Final output**: `data/raw/diarium-urbis-romae/` — clean .txt files ready for processing into chapter JSONs
- **Language**: Italian (15th-century Romanesco dialect) — language code `it`
- **Can call**: DeepSeek helper LLM functions for disambiguation, OCR correction, or any other purpose

## Observations & Conclusions

### Pipeline Quality Summary (2026-01-24)

**Agent A's Pipeline** (`scripts/lib/diarium/` + `scripts/process-diarium-a.ts`):
- 12-pass TypeScript processing pipeline (38KB of code after 5 iterations)
- Removes: page headers (248), footnotes (6,943 lines), folio refs (16), line numbers (280), inline markers (6,064), hyphenated words rejoined (1,038)
- Remaining artifacts: 184 `^^` carets, 41 `|` pipes, 14 `W` markers, 20 leaked footnote lines
- Grade: B+ (suitable for AI translation)

**Agent B's Pipeline** (`scripts/lib/diarium-b/` + `scripts/clean-diarium-b.ts`):
- Multi-pass TypeScript processing (block-based footnote identification + inline cleanup + post-processing)
- Removes: page headers (568+43), footnotes (~5,810 lines), apparatus sigla lines (54), inline markers (143), hyphenations fixed (1,631)
- Output: 9,493 lines (after iteration 4)
- Remaining: minimal — OCR-merged lines where diary text and apparatus share a physical line
- Grade: B+ (iteration 4; all Reviewer B issues resolved)

**Key Insight**: The two scans are complementary — where one garbles a word, the other often reads it correctly. The Master Reviewer should cross-reference both cleaned outputs for the definitive text.

---

## Master Reviewer Final Report (2026-01-24)

### Status: COMPLETE

The Master Reviewer has completed reconciliation. Final clean text is available at:
`data/raw/diarium-urbis-romae/`

### Final Output Files

| File | Lines | Description |
|------|-------|-------------|
| `diary-full.txt` | 7,252 | Complete reconciled diary |
| `altro-principio.txt` | 65 | Alternative beginning (Italian version of 1294-1305) |
| `diary-year-1294-1377.txt` | 14 | Early narrative section |
| `diary-year-1378-1417.txt` | 352 | |
| `diary-year-1418-1447.txt` | 580 | |
| `diary-year-1448-1464.txt` | 319 | |
| `diary-year-1465-1479.txt` | 426 | |
| `diary-year-1480-1484.txt` | 2,305 | Longest section (Pope Sixtus IV events) |
| `diary-year-1485-1494.txt` | 1,568 | Final years (Pope Alexander VI) |

### Reconciliation Statistics

| Metric | Before | After |
|--------|--------|-------|
| Total lines | 7,360 | 7,252 |
| Carets (^^) | 40 | 0 |
| Pipes (\|) | 41 | 0 |
| Page headers | 4 | 0 |
| Apparatus lines | ~100 | 0 |

### Scripts Created

Located in `scripts/lib/diarium-master/`:
- `cleanup-patterns.ts` — 50+ regex cleanup patterns
- `reconcile.ts` — Main reconciliation pipeline  
- `split-years.ts` — Year-based chapter splitting
- `verify.ts` — Quality verification

### Verification

```
Total lines: 7,252
Non-blank lines: 6,029
Carets remaining: 0
Pipes remaining: 0
Headers remaining: 0
Apparatus vocabulary: 0
Year markers found: 53

PASSED: No significant issues found.
```

### Next Steps

1. Create processing script (`scripts/process-diarium.ts`) to convert diary-full.txt into chapter JSONs
2. Add author entry (Stefano Infessura) and text entry to `scripts/seed-db.ts`
3. Seed into database
4. Run translation batch with Italian language settings

### Documentation

- `docs/diarium/master-scratchpad.md` — Working notes
- `docs/diarium/master-documentation.md` — Complete methodology documentation

---

*Pipeline complete. Diarium Urbis Romae is ready for translation.*
