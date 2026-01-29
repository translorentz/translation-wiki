# Active Agents & Background Workers

Track all running agents and background workers here. Update when launching or completing agents.

**Last updated:** 2026-01-29, Session 30

---

## Currently Running

| Agent ID | Task | Status | Notes |
|----------|------|--------|-------|
| a92a1a4 | Semeioseis Gnomikai V2 Cleaning (Agent A) | IN PROGRESS | Fixing word breaks, apparatus markers |
| aec444b | Semeioseis Gnomikai V2 Evaluation (Agent B) | POLLING | Waiting for V2 cleaner to finish |

### Previously Running (from earlier sessions — status unknown, likely completed or killed)

| Agent ID | Task | Notes |
|----------|------|-------|
| aa88334 | Nandikkalambakam Stage 3 | Was retranslating 114 poems |
| a1cae1c | Yashodhara Kaviyam Stage 1 | Was processing + translating |
| ab5dae1 | Eustathius Odyssey ch 1-8 | DeepSeek grc |
| a4043fb | Eustathius Odyssey ch 9-16 | DeepSeek grc |
| afff370 | Eustathius Odyssey ch 19-24 | DeepSeek grc |

---

## Recently Completed (Session 30)

| Agent ID | Task | Completion | Notes |
|----------|------|------------|-------|
| af4cdb3 | Semeioseis Gnomikai V1 Cleaning (Agent A) | COMPLETE | 38 chapters, self-grade A-, but evaluator gave C+ |
| afd1f1a | Semeioseis Gnomikai V1 Evaluation (Agent B) | COMPLETE | Grade C+ — NOT SATISFIED. Broken words 65%, apparatus 8% |
| a8e3d45 | Suguna Sundari Translation | COMPLETE | 22/22 chapters, ta-prose prompt created |
| a39fd10 | Nancun Chuogeng Lu Translation | COMPLETE | 30/30 chapters, 0 errors |
| — | Footer text update | COMPLETE | "Trial project by Bryan Cheong." |
| — | User cap increase to 100 | COMPLETE | 3 files updated |
| — | Security hardening | COMPLETE | 16 findings fixed (4H/7M/5L) |

## Recently Completed (Session 29)

| Agent ID | Task | Completion | Notes |
|----------|------|------------|-------|
| a9cfa3d | Suguna Sundari search (round 1) | COMPLETE | Text not found in raw data |
| — | Auth system implementation | COMPLETE | Invite-only + Google OAuth + profile + deletion |
| — | Nancun Chuogeng Lu processing | COMPLETE | 30 volumes → 30 chapters seeded |

## Recently Completed (Session 22)

| Agent ID | Task | Completion | Notes |
|----------|------|------------|-------|
| a7e95bf | "All Languages" browse | COMPLETE | Genre filter shows all languages |
| a854600 | Genre schema + migration | COMPLETE | Added genre column, categorized 51 texts |

---

## Semeioseis Gnomikai Cleaning Pipeline

**Text:** Semeioseis Gnomikai (Theodorus Metochites), Byzantine Greek OCR
**Chapters:** 82-120 (38 chapters, missing 118)
**Source:** `data/raw/semeioseis_gnomikai/`
**Output:** `data/processed/semeioseis-gnomikai/`
**Cleaning scripts:** `scripts/lib/semeioseis-cleaning-v1/`, `scripts/lib/semeioseis-cleaning-v2/`

### Iteration History

| Version | Cleaner Grade | Evaluator Grade | Status |
|---------|---------------|-----------------|--------|
| V1 | A- | C+ (NOT SATISFIED) | Broken words 65%, apparatus 8% |
| V2 | TBD | TBD | IN PROGRESS — fixing word breaks + markers |

### Key Documents
- `docs/semeioseis-cleaning-collaboration.md` — Joint collaboration doc
- `docs/semeioseis-v1-cleaning-scratch.md` — V1 cleaner notes
- `docs/semeioseis-v1-evaluation-scratch.md` — V1 evaluator notes

---

## Critical Bugs / Warnings

### Yashodhara Kaviyam Commentary Contamination (CRITICAL)

**Agent:** afa7e45 (Yashodhara Stage 2 Reviewer)
**Grade:** C+
**Problem:** Commentary contamination in chapters 3-5

The processing script `process-yashodhara-kaviyam.ts` strips commentary from file 1 but NOT file 2. This causes:
- 59% of verses (194/330) need retranslation
- Stage 3 MUST FIRST fix the processing script, re-seed chapters 3-5, THEN retranslate

**Status:** Not yet fixed.

---

## Historical Agent IDs (Prior Sessions)

For reference, these agents completed in earlier sessions:

**Greek XML R2:** Parser + Reviewer: All 4 texts Grade A
**Eustathius Odyssey Pipeline:** Round 2 joint doc: `docs/eustathius-r2-collaboration.md`, Grade B+
**Carmina Graeca:** Processor + Critic: Grade A, 21 poems
**Diarium Urbis Romae:** 6-Agent Pipeline, 66 chapters
