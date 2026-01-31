# Active Agents & Background Workers

Track all running agents and background workers here. Update when launching or completing agents.

**Last updated:** 2026-01-30, Session 39

---

## Currently Running

| Agent ID | Task | Status | Notes |
|----------|------|--------|-------|
| — | Polish Pipeline: Verification + Processing | LAUNCHING | 12 texts from curated list |

---

## Recently Completed (Session 38)

| Agent ID | Task | Completion | Notes |
|----------|------|------------|-------|
| F1-F13 | Chinese Translation Final Push | COMPLETE | All remaining chapters translated |
| a1c7a7e | Gap-fill mengliang-lu ch 12 | COMPLETE | Retranslated successfully |
| a4695da | Gap-fill mengliang-lu ch 18 | COMPLETE | Still truncated (DeepSeek fails on giant paragraphs) |
| a097b81 | Gap-fill mengliang-lu ch 20 | COMPLETE | Still truncated |
| af9456f | Retry mengliang-lu ch 18+20 | COMPLETE | Still failing — known gap |

## Recently Completed (Session 36)

| Agent ID | Task | Completion | Notes |
|----------|------|------------|-------|
| a72ad61 | Chinese Pipeline: Quality Review (44 texts) | COMPLETE | 44/44 PASS |
| ad29ba7 | Chinese Pipeline: Translation Check (44 texts) | COMPLETE | 0/44 disqualified (old criteria) |
| ad90bcb | Saric Translation Check (revised criteria) | COMPLETE | 3 texts disqualified: sui-tang-yanyi, xijing-zaji, dongjing-menghua-lu |

---

## Active Pipelines

### Chinese Mass Pipeline — COMPLETE (99.94%)
- **Progress:** ~3,356/3,358 chapters translated
- **Known gaps:** mengliang-lu ch 18, 20 (giant paragraphs, DeepSeek limitation)
- **Status:** COMPLETE — moving to Polish pipeline

### Polish Pipeline — IN PROGRESS
- **Phase 0:** Language setup COMPLETE (seed-db.ts, texts/page.tsx, prompts.ts)
- **Phase 2+3:** Verification + Processing LAUNCHING
- **Texts:** 12 from curated list (`docs/polish_text_suggestions.txt`)
- **Prompt:** `pl` (19th/early 20th century Polish literary prose)

---

## Queued Pipelines (After Polish)

See `docs/pipeline-queue.md` for full details.

| Priority | Language | Works | Status |
|----------|----------|-------|--------|
| 3 | Armenian (hy) | 12 | QUEUED — DeepSeek only |
| 4 | Italian (it) | 12 | QUEUED |
| 5 | Latin (la) | 10 | QUEUED |
| 6 | Czech (cs) | 1 | QUEUED — new language |
| 7 | Gujarati (gu) | 1 | QUEUED — new language |
| 8 | Telugu (te) | 1 | QUEUED — new language |
| 9 | Turkish (tr) | 1 | QUEUED — new language |

---

## Critical Bugs / Warnings

### Yashodhara Kaviyam Commentary Contamination (CRITICAL)
**Problem:** Commentary contamination in chapters 3-5
**Status:** Not yet fixed.
