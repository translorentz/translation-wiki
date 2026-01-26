# Active Agents & Background Workers

Track all running agents and background workers here. Update when launching or completing agents.

**Last updated:** 2026-01-25, Session 22

---

## Currently Running

| Agent ID | Task | Status | Log/Output | Notes |
|----------|------|--------|------------|-------|
| a9fb74b | Armenian "Delays" fix | IN PROGRESS | `docs/armenian-delays-fix-report.md` | Finding/fixing "Delays" substitution |
| aa88334 | Nandikkalambakam Stage 3 | IN PROGRESS | `docs/tamil-translation-notes/` | Retranslating 114 poems |
| a1cae1c | Yashodhara Kaviyam Stage 1 | IN PROGRESS | `docs/tamil-translation-notes/` | Processing + translating 330 verses |
| ae734cc | Udayanakumara Stage 2 Review | IN PROGRESS | `docs/tamil-translation-notes/` | Still reviewing |
| ab5dae1 | Eustathius Odyssey ch 1-8 | TRANSLATING | — | DeepSeek grc, 6000 chars/batch |
| a4043fb | Eustathius Odyssey ch 9-16 | TRANSLATING | — | DeepSeek grc, 6000 chars/batch |
| afff370 | Eustathius Odyssey ch 19-24 | TRANSLATING | — | DeepSeek grc, 6000 chars/batch |

### Dongzhou Lieguo Zhi Translation Workers (6)
| Worker | Chapters | Log File | Status |
|--------|----------|----------|--------|
| Worker 1 | 1-18 | `/tmp/dongzhou-worker1.log` | TRANSLATING |
| Worker 2 | 19-36 | `/tmp/dongzhou-worker2.log` | TRANSLATING |
| Worker 3 | 37-54 | `/tmp/dongzhou-worker3.log` | TRANSLATING |
| Worker 4 | 55-72 | `/tmp/dongzhou-worker4.log` | TRANSLATING |
| Worker 5 | 73-90 | `/tmp/dongzhou-worker5.log` | TRANSLATING |
| Worker 6 | 91-108 | `/tmp/dongzhou-worker6.log` | TRANSLATING |

### Rizhilu Translation Workers (4)
| Worker | Chapters | Log File |
|--------|----------|----------|
| Worker 1 | 1-8 | `/tmp/rizhilu-worker1.log` |
| Worker 2 | 9-16 | `/tmp/rizhilu-worker2.log` |
| Worker 3 | 17-24 | `/tmp/rizhilu-worker3.log` |
| Worker 4 | 25-32 | `/tmp/rizhilu-worker4.log` |

### Shisan Jing Zhushu Workers (~20 active)

**Original Orchestration Agents (completed — launched workers):**
| Agent ID | Texts | Chapters | Workers Launched |
|----------|-------|----------|------------------|
| a9f1c24 | 論語/孟子/孝經/爾雅 | 57 | — |
| ace30af | 周易正義/尚書正義 | 126 | babf3aa, b6a0f7d, ba80c30 |
| a86e80d | 周禮/儀禮/禮記 | 178 | bfc83a7, b4c8f59, b332ac1, b0508ee |
| ace6429 | 春秋三傳 | 94 | bc593fa, bc3b540, b9c848d, bce1f8a, b624f79, bdcaaab |

**Reinforcement Agents:**
| Agent ID | Texts |
|----------|-------|
| a7e1ecc | yili-zhushu (2 workers) + erya-zhushu |
| aca4e1f | zhouli-zhushu (2 workers) + xiaojing-zhushu |
| a3bb94a | liji-zhengyi (2 workers) + liji-zhushu |
| a541e9f | lunyu-zhushu + mengzi-zhushu + shangshu-zhengyi |

---

## Recently Completed (Session 22)

| Agent ID | Task | Completion | Notes |
|----------|------|------------|-------|
| a7e95bf | "All Languages" browse | COMPLETE | Genre filter shows all languages |
| a854600 | Genre schema + migration | COMPLETE | Added genre column, categorized 51 texts |
| ad63b5a | Browse by Category sidebar | COMPLETE | Added to main page sidebar |
| ad79244 | CLAUDE.md change report | COMPLETE | Critical review at `docs/claude_md_change_report.md` |

## Recently Completed (Session 21)

| Agent ID | Task | Completion | Notes |
|----------|------|------------|-------|
| a400ec2 | Rizhilu processing + seeding | COMPLETE | 32 chapters seeded |
| a4fc5f0 | Site terminology update | COMPLETE | "pre-1900" → "pre-contemporary" |
| acf75d6 | Armenian encoding investigation | COMPLETE | Report: `docs/armenian-encoding-investigation.md` |
| ab470fa | Featured texts reorganization | COMPLETE | Accordion groups, language sorting |
| a517451 | Mobile source toggle | COMPLETE | FAB component implemented |
| bceafc8 | Diarium ch 1-22 | COMPLETE | 0 errors |
| ba0b219 | Diarium ch 23-44 | COMPLETE | 0 errors |
| b699139 | Diarium ch 45-66 | COMPLETE | 0 errors |
| ac8f701 | Diarium paragraph fix v2 | COMPLETE | Headers stripped, apparatus removed |
| a687c60 | Search fix | COMPLETE | Deployed to deltoi.com |
| a9ce61b | Udayanakumara Stage 1 | COMPLETE | 366 verses processed + translated |
| a95b70a | Greek XML Parser | COMPLETE | 334 chapters, Grade A |
| a329f69 | Greek XML Reviewer | COMPLETE | Grade A |
| afa7e45 | Yashodhara Stage 2 Reviewer | COMPLETE | Grade C+ — see CRITICAL BUG below |

---

## Killed/Replaced Workers

| Agent ID | Reason | Replaced By |
|----------|--------|-------------|
| a58c5f4 | Wrong Eustathius slug | ab5dae1 |
| aa2274c | Wrong Eustathius slug | a4043fb |
| a05fbf7 | Wrong Eustathius slug | afff370 |

---

## Critical Bugs / Warnings

### Yashodhara Kaviyam Commentary Contamination (CRITICAL)

**Agent:** afa7e45 (Yashodhara Stage 2 Reviewer)
**Grade:** C+
**Problem:** Commentary contamination in chapters 3-5

The processing script `process-yashodhara-kaviyam.ts` strips commentary from file 1 but NOT file 2. This causes:
- 59% of verses (194/330) need retranslation
- Stage 3 MUST FIRST fix the processing script, re-seed chapters 3-5, THEN retranslate

**Status:** Not yet fixed. Stage 3 agent must address this before retranslation.

**Documentation:**
- `docs/tamil-translation-notes/yashodhara-kaviyam-reviewer-notes.md`
- `docs/tamil-translation-notes/yashodhara-kaviyam-retranslation-requests.md`

---

## Historical Agent IDs (Prior Sessions)

For reference, these agents completed in earlier sessions:

**Greek XML R2:**
- Parser + Reviewer: All 4 texts Grade A
- Texts: hesiod-theogony-exegesis (13), periplus-maris-exteri (31), periplus-maris-interni (6), artemidori-geographia (3)

**Eustathius Odyssey Pipeline:**
- Round 2 joint doc: `docs/eustathius-r2-collaboration.md`
- Final grade: B+ (both volumes)

**Carmina Graeca:**
- Processor + Critic: Grade A, 21 poems
- Scratchpad: `docs/carmina-graeca-scratchpad.md`

**Diarium Urbis Romae 6-Agent Pipeline:**
- Primary Agents A + B → Reviewers A + B → Bridge → Master
- Documentation: `docs/diarium/orchestration.md`
- Output: `data/difficult_extra_processing/diarium_urbis_romae/clean_copy_{a,b}/`
