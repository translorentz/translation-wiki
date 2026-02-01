# Active Agents & Background Workers

Track all running agents and background workers here. Update when launching or completing agents.

**Last updated:** 2026-01-31, Session 41 (final update)

---

## Currently Running — Italian Translation (Phase 6)

| Worker | Bash ID | Text(s) | Chapters | Status |
|--------|---------|---------|----------|--------|
| W1 | b9222db | confessioni-di-un-metafisico | 1-32 | **COMPLETE** ✓ (32/32) |
| W2 | b1b0a01 | confessioni-di-un-metafisico | 33-64 | FINISHING (61/64 done, ~3 remaining) |
| W3a | b6846c1 | del-rinnovamento-civile-d-italia | 1-27 | FINISHING (15/27 done, ~12 remaining) |
| W3b | bcbdba4 | dio-ne-scampi-dagli-orsenigo | 1-25 | **COMPLETE** ✓ |
| W4 | b7fb5c7 | la-filosofia (18/20) + la-psicologia (5) + psicologia-delle-menti (5) + saggio (1) | sequential | **COMPLETE** ✓ (29/31, 2 skipped no source) |

**Progress:** ~135/147 chapters translated (~92%). de-sorbetti ABANDONED.
**Prompts:** literature→it-literary-19c, philosophy/science/history→it-nonfiction-19c

---

## Completed This Session (41)

| Agent/Worker | Task | Notes |
|--------------|------|-------|
| ac4cb45 | Polish W7: bene-nati + general-barcz + cham | 20/20 translated |
| — | Polish pipeline gap-check | 231/231 COMPLETE ✓ |
| a7e95bf | Add "All Languages" browse option | COMPLETE |
| — | Homepage highlights section | Created, refined 3x, committed |
| aa1c840 | Italian Processor A (4 texts) | 51ch, 1871 para |
| ab3dad5 | Italian Processor B (4 texts) | 102ch, 4595 para |
| aeae5e6 | Italian Quality Review (8 texts) | 2 PASS, 5 fixable, 1 dead |
| aea616e | Italian cleanup (5 texts) | All cleaned to grade A |
| a695c8b | Italian re-review (5 texts) | All PASS grade A |
| a6512a1 | Italian seeding (7 texts) | 147ch seeded |
| a5e33d1 | Apply blurb updates to database | ~138 descriptions updated |
| a99a299 | Add English to chapter titles | ~2,087 titles updated |
| abb82f1 | Verify 15 Italian text candidates | 8/15 viable |
| a488bdb | Latin verification | 4/5 viable |
| a67a0b1 | Greek verification | 4/12 viable |
| ac176b2 | Czech verification | 1 viable |
| ab15421 | Gujarati verification | 1 viable |
| a1a766d | Telugu verification | 1 viable |
| a411be4 | Turkish verification | 1 viable |
| a3ed850 | Telugu processing | 116 verse files created ✓ |
| bcbdba4 | Italian W3b (dio-ne-scampi) | 25/25 translated ✓ |
| ac7dbc2 | Telugu merge + seed + translate | 116 verses merged → 1 chapter, translated ✓ |
| af1bad2 | Czech seeding + translation launch | 14ch seeded, translation complete ✓ |
| ab3a1a7 | Latin+Greek translation (4 texts) | 18ch, 145 para translated ✓ |
| be6daa5 | Czech translation | 14ch translated ✓ |
| b9222db | Italian W1 (confessioni 1-32) | 32/32 translated ✓ |
| b7fb5c7 | Italian W4 (la-filosofia + 3 texts) | 29/31 translated (2 empty) ✓ |

---

## Active Pipelines

### Polish Pipeline — COMPLETE ✓
- **11 texts, 231/231 chapters translated**

### Armenian Pipeline — COMPLETE ✓
- **1 text (Payqar), 18/18 chapters translated**

### Italian Pipeline — ~92% COMPLETE (Phase 6: Translation)
- **7 texts, 147 chapters total** (de-sorbetti abandoned)
- **Translation:** ~135/147 done. W2 and W3a finishing final chapters.
- confessioni: 61/64, del-rinnovamento: 15/27, dio-ne-scampi: 25/25, la-filosofia: 18/20 (2 empty), la-psicologia: 5/5, psicologia-delle-menti: 5/5, saggio: 1/1

### Latin Pipeline — COMPLETE ✓
- **2 clean texts translated:** Phosphori (1ch), De Quindecim (15ch)
- **2 OCR texts deferred:** Turris Babel (56ch), Mundus (198ch) — need cleaning pipeline

### Greek Pipeline — COMPLETE ✓
- **2 clean texts translated:** Gnosis (1ch), Eis tin tou biou anisotita (1ch)
- George of Pisidia texts inaccessible (PG 92 not digitized)

### Czech Pipeline — COMPLETE ✓
- **1 text** (Nový epochální výlet pana Broučka, 14ch) — translated

### Telugu Pipeline — COMPLETE ✓
- **1 text** (Sri Kalahasteeswara Satakam, 116 verses in 1 chapter) — translated

### Chinese Mass Pipeline — COMPLETE (99.94%)
- **Known gaps:** mengliang-lu ch 18, 20 (giant paragraphs, DeepSeek limitation)

### Gujarati Pipeline — BLOCKED (Phase 2)
- Source text behind login walls. Needs headless browser or manual download.

### Turkish Pipeline — BLOCKED (Phase 2)
- Source text in PDF only. Needs PDF extraction.

---

## Critical Bugs / Warnings

### Yashodhara Kaviyam Commentary Contamination (CRITICAL)
**Problem:** Commentary contamination in chapters 3-5
**Status:** Not yet fixed.
