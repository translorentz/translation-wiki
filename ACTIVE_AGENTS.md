# Active Agents & Background Workers

Track all running agents and background workers here. Update when launching or completing agents.

**Last updated:** 2026-01-29, Session 31

---

## Currently Running

| Agent ID | Task | Status | Notes |
|----------|------|--------|-------|
| — | Scapigliatura Translation Worker 1 | IN PROGRESS | Ch 0-8, log: `/tmp/scapigliatura-w1.log` |
| — | Scapigliatura Translation Worker 2 | IN PROGRESS | Ch 9-17, log: `/tmp/scapigliatura-w2.log` |
| — | Semeioseis Translation Worker 1 | COMPLETE | 19/19 chapters, 0 errors |
| — | Semeioseis Translation Worker 2 | COMPLETE | 19/19 chapters, 0 errors |

---

## Recently Completed (Session 31)

| Agent ID | Task | Completion | Notes |
|----------|------|------------|-------|
| a5742c8 | Semeioseis Trial Translations | COMPLETE | 5 samples translated, all passed |
| aa07bf7 | Semeioseis Paragraph Format Fix | COMPLETE | Converted 38 files to {index, text} format |
| — | Semeioseis DB Seeding | COMPLETE | 38 chapters seeded, Theodore Metochites added |

## Recently Completed (Session 30)

| Agent ID | Task | Completion | Notes |
|----------|------|------------|-------|
| a43ea83 | Semeioseis V4 Cleaning | COMPLETE | Surgical fixes, 0% apparatus contamination |
| a191d06 | Semeioseis V3 Evaluation | COMPLETE | Grade B (NOT SATISFIED) — 3 specific issues |
| a76cb9d | Semeioseis V3 Cleaning | COMPLETE | Fixed broken words, garbled sections |
| aec444b | Semeioseis V2 Evaluation | COMPLETE | Grade B- (NOT SATISFIED) |
| a92a1a4 | Semeioseis V2 Cleaning | COMPLETE | Fixed word breaks, apparatus markers |
| af4cdb3 | Semeioseis V1 Cleaning | COMPLETE | 38 chapters, C+ from evaluator |
| afd1f1a | Semeioseis V1 Evaluation | COMPLETE | Grade C+ — NOT SATISFIED |
| a8e3d45 | Suguna Sundari Translation | COMPLETE | 22/22 chapters |
| a39fd10 | Nancun Chuogeng Lu Translation | COMPLETE | 30/30 chapters |

---

## Semeioseis Gnomikai Pipeline — COMPLETE (translating)

**Cleaning iterations:** V1 (C+) → V2 (B-) → V3 (B) → V4 (B+ SATISFIED)
**Seeded:** 38 chapters (82-120, missing 118), chapter 110 = OCR placeholder
**Translation:** 2 workers running, `grc` prompt

---

## Scapigliatura Pipeline — IN PROGRESS

**Text:** La Scapigliatura e il 6 Febbraio, Cletto Arrighi (1862)
**Language:** Italian (19th-century literary prose)
**Source:** `data/difficult_extra_processing/scapigliatura/arrighiscapigliatura_djvu.txt`
**Stage:** Evaluation (assessing OCR quality)
**Translation prompt:** `it-literary-19c` (already exists)

---

## Critical Bugs / Warnings

### Yashodhara Kaviyam Commentary Contamination (CRITICAL)

**Problem:** Commentary contamination in chapters 3-5
The processing script strips commentary from file 1 but NOT file 2.
**Status:** Not yet fixed.

---

## Historical Agent IDs (Prior Sessions)

For reference, these agents completed in earlier sessions:

**Greek XML R2:** Parser + Reviewer: All 4 texts Grade A
**Eustathius Odyssey Pipeline:** Round 2 joint doc: `docs/eustathius-r2-collaboration.md`, Grade B+
**Carmina Graeca:** Processor + Critic: Grade A, 21 poems
**Diarium Urbis Romae:** 6-Agent Pipeline, 66 chapters
