# Active Agents & Background Workers

Track all running agents and background workers here. Update when launching or completing agents.

**Last updated:** 2026-02-09, Session 48

---

## ⚠️ DOCUMENTATION DISCIPLINE REMINDER ⚠️

**Lesson learned (2026-02-07):** Documentation was severely outdated, causing confusion about actual pipeline status.

**MANDATORY:** Update this file for EVERY agent state change:
- Agent LAUNCHED → Add entry with "🔄 Running"
- Agent COMPLETED → Update to "✅ DONE" with results
- Agent FAILED → Update to "❌ FAILED" with reason

---

## Currently Running Agents (2026-02-10, Session 48)

### Joseon Wangjo Sillok (朝鮮王朝實錄) — Korean Dynastic Annals

**Source:** Korean Wikisource (ko.wikisource.org)
**Language:** Classical Chinese (文言文) — extracted from bilingual pages
**Content:** Annals of the Joseon Dynasty (UNESCO Memory of the World)

**Acquisition Complete (3 volumes):**

| Volume | Agent ID | Chapters | Paragraphs | Grade | Status |
|--------|----------|----------|------------|-------|--------|
| Taejo (太祖, 1392-1398) | a1ba0c4 | 9 | 2,387 | A- | ✅ DONE |
| Jeongjong (定宗, 1398-1400) | ac2d9de | 4 | 626 | A | ✅ DONE |
| Taejong (太宗, 1400-1418) | a780293 | 20 | 10,341 | A | ✅ DONE |
| **TOTAL** | — | **33** | **13,354** | — | ✅ READY |

**Cross-Volume Review:**
| Agent ID | Task | Status |
|----------|------|--------|
| ac563f2 | Independent quality review | ✅ SATISFIED |

**Translation Phase (3 agents):**
| Agent ID | Volume | Chapters | Status |
|----------|--------|----------|--------|
| ab3ff16 | Taejo | 9 | 🔄 Running |
| a53f34a | Jeongjong | 4 | 🔄 Running |
| af456b7 | Taejong | 20 | 🔄 Running |

**Translation Prompt:** `zh-joseon-sillok` — includes Hangul glosses for Korean names

---

### Russian Orthodox Pipeline — Continuation Tasks

| Agent ID | Task | Status |
|----------|------|--------|
| afc9b2d | Complete Bolotov Vol 2 (seed + translate) | 🔄 Running |
| a2adc6f | Fix Russian Orthodox ch 8-9 truncation errors | 🔄 Running |
| a1f5add | Check Bolotov Vol 3 translation status | 🔄 Running |

**Background Translation Workers:**
| Task ID | Text | Status |
|---------|------|--------|
| bb029f0 | Okolo tserkovnykh sten (Near the Church Walls Vol 2) | 🔄 Running (ch 8,9 truncated) |

---

### Czech Novels Pipeline

| Agent ID | Task | Chapters | Status |
|----------|------|----------|--------|
| ae43736 | Process, seed, translate 4 novels | ~105 | 🔄 Running |

**Novels in pipeline:**
- pravy-vylet-pana-broucka (14 ch)
- bludne-duse (35 ch)
- svaty-xaverius (8 ch)
- rok-na-vsi (48 ch)

**Files Created:**
- `scripts/process-joseon-sillok-taejo.py`
- `scripts/process-joseon-sillok-jeongjong.py`
- `scripts/process-joseon-sillok-taejong.py`
- `data/processed/joseon-sillok-*/` (33 chapter JSON files)
- `docs/joseon-sillok-*-quality-review.md` (3 review documents)
- `docs/joseon-sillok-html-analysis.md`
- `docs/joseon-sillok-scraping-rules.md`

---

### Bolotov Lectures on Ancient Church History — Vol 3 Translation

**Text:** Лекции по истории древней церкви, Том 3
**Author:** V.V. Bolotov
**Source:** azbyka.ru
**Volumes:** 2, 3, 4 (Volume 1 already in DB)
**Vol 3:** 25 chapters, 814 paragraphs (seeded as text ID 298)

| Task ID | Volume | Chapters | Status |
|---------|--------|----------|--------|
| b75ca0b | Vol 3 | 1-25 | 🔄 Running (Phase 6 Translation) |
| a78d60d | Vol 2 | — | ❌ Failed (framework error) |
| addcb5a | Vol 4 | — | Pending (wait for Vol 3) |

---

### Literature Pipeline Agents — 3 Languages

**Task:** Research, verify, process, clean, review, translate novels

| Agent ID | Language | Novels | Status |
|----------|----------|--------|--------|
| abc926c | Italian | 6 | ✅ DONE (Phase 6: Translation started) |
| af95b6b | Czech | 5 | 🔄 Running (Phase 1: Research) |
| af21937 | Polish (Batch 2) | 6 | ✅ DONE (Phases 1-5 complete, Phase 6 running) |

---

### Polish Novels Batch 2 — Translation In Progress

**Completed Phases:**
1. ✅ Research & Verification — 6 novels selected (no existing English translations)
2. ✅ Processing — 94 chapters, 17,655 paragraphs extracted
3. ✅ Quality Review — All texts Grade A (see `docs/pl-novels-batch2-quality-review.md`)
4. ✅ Seeding — 3 authors, 6 texts, 94 chapters in database
5. ✅ Prompt Check — Using `pl` prompt

**Authors Added:**
- Jozef Weyssenhoff (1860-1932) — Novelist of Lithuanian gentry life
- Wladyslaw Orkan (1875-1930) — Goral highland naturalist
- Tadeusz Micinski (1873-1918) — Symbolist poet and novelist

**Translation Workers (Phase 6):**
| Worker | Task ID | Text | Chapters | Status |
|--------|---------|------|----------|--------|
| W1 | b8f0927 | prochno | 3 | 🔄 Running |
| W2 | b6f9a8c | sobol-i-panna | 15 | 🔄 Running |
| W3 | b8e57fb | komornicy | 13 | 🔄 Running |
| W4 | b785f03 | w-roztokach | 23 | 🔄 Running |
| W5 | b577f18 | xiadz-faust | 25 | 🔄 Running |
| W6 | b3223d4 | nietota | 15 | 🔄 Running |

**Texts:**
| Slug | Title | Author | Chapters | Paragraphs |
|------|-------|--------|----------|------------|
| prochno | Rotten Wood (Prochno) | Waclaw Berent | 3 | 2,816 |
| sobol-i-panna | The Sable and the Maiden (Sobol i panna) | Jozef Weyssenhoff | 15 | 2,417 |
| komornicy | The Tenant Farmers (Komornicy) | Wladyslaw Orkan | 13 | 1,792 |
| w-roztokach | In the Mountain Valleys (W roztokach) | Wladyslaw Orkan | 23 | 2,915 |
| xiadz-faust | Father Faust (Xiadz Faust) | Tadeusz Micinski | 25 | 3,215 |
| nietota | Nietota: The Secret Book of the Tatras | Tadeusz Micinski | 15 | 4,500 |

**Total: 6 texts, 94 chapters, 17,655 paragraphs**

---

### Italian Verismo Novels Pipeline — Translation In Progress

**Completed Phases:**
1. ✅ Research & Verification — 6 novels selected (no existing English translations)
2. ✅ Processing — 149 chapters, ~6,900 paragraphs extracted
3. ✅ Quality Review — All texts Grade A- to A
4. ✅ Seeding — 3 authors, 6 texts, 149 chapters in database
5. ✅ Prompt Check — Using `it-literary-19c` prompt

**Authors Added:**
- Giovanni Verga (1840–1922) — Master of Italian verismo
- Luigi Capuana (1839–1915) — Verismo theorist
- Federico De Roberto (1861–1927) — Psychological novelist

**Translation Workers (Phase 6):**
| Worker | Task ID | Text | Chapters | Status |
|--------|---------|------|----------|--------|
| W1 | b1a82bd | eva-verga | 1-2 | 🔄 Running |
| W2 | bfb0ac8 | tigre-reale | 1-16 | 🔄 Running |
| W3 | b22b80e | eros-verga | 1-25 | 🔄 Running |
| W4 | bb7bfcd | eros-verga | 26-50 | 🔄 Running |
| W5 | b2d86b8 | giacinta-capuana | 1-25 | 🔄 Running |
| W6 | b23bd46 | giacinta-capuana | 26-50 | 🔄 Running |
| W7 | b2e9741 | il-marito-di-elena | 1-16 | 🔄 Running |
| W8 | b406595 | ermanno-raeli | 1-15 | 🔄 Running |

**Texts:**
| Slug | Title | Author | Chapters | Paragraphs |
|------|-------|--------|----------|------------|
| eva-verga | Eva | Giovanni Verga | 2 | ~950 |
| tigre-reale | Royal Tigress (Tigre Reale) | Giovanni Verga | 16 | ~550 |
| eros-verga | Eros | Giovanni Verga | 50 | ~1,900 |
| giacinta-capuana | Giacinta | Luigi Capuana | 50 | ~2,500 |
| il-marito-di-elena | Elena's Husband (Il marito di Elena) | Giovanni Verga | 16 | ~810 |
| ermanno-raeli | Ermanno Raeli | Federico De Roberto | 15 | ~193 |

**Total: 6 texts, 149 chapters, ~6,900 paragraphs**

---

### Rozanov Volume 2 — Translation In Progress

**Text:** Около церковных стен. Том второй (Near the Church Walls, Vol. 2)
**Author:** Vasily Rozanov (ID 137)
**Text ID:** 297
**Chapters:** 54 chapters, 982 paragraphs
**Engine:** DeepSeek V3

| Task ID | Range | Progress | Status |
|---------|-------|----------|--------|
| b0065a6 | ch 3-54 | 5/54 | 🔄 Running |

**Note:** Chapters 1-2 translated during test phase (19 paragraphs).

---

### Session 48 Fixes Applied

1. **Chapter title English translations fixed:** 10 Rozanov chapters now have English in parentheses

---

## Recently Completed (2026-02-09/10)

### St. Nektarios Pipeline — ✅ COMPLETE

**All 8 texts processed and translated:**

| ID | Slug | Chapters | Paragraphs | Status |
|----|------|----------|------------|--------|
| 287 | akolouthia-enatis-oras | 1 | 27 | ✅ DONE |
| 288 | megas-parakletikos | 1 | 118 | ✅ DONE |
| 289 | akolouthia-apodeipnou | 1 | 71 | ✅ DONE |
| 290 | nektarios-prayer-book | 8 | 1,001 | ✅ DONE |
| 291 | akolouthia-esperinou | 1 | 77 | ✅ DONE |
| 292 | katakrisis-katalalia | 1 | 14 | ✅ DONE |
| 293 | eikona-adikias | 1 | 5 | ✅ DONE |
| 294 | peri-phthonou | 2 | 19 | ✅ DONE |

**Total: 8 texts, 16 chapters, ~1,332 paragraphs translated**

**Infrastructure Created:**
- `data/grc-orthodox-pipeline/texts.json` — Pipeline configuration
- `scripts/seed-nektarios.ts` — Idempotent seeding script (updated to set totalChapters)
- `src/server/translation/prompts.ts` — Added `grc-orthodox-liturgical` prompt

**Fixes Applied:**
- Fixed `total_chapters` for all 8 texts (were null)
- Deleted duplicate translation record for akolouthia-apodeipnou

---

### Syair Sultan Lingga OCR V3 — ✅ COMPLETE

**42 pages OCR'd with Gemini Vision (right-to-left column reading)**

All 10 agents completed. Output in `data/raw/syair-sultan-lingga/ocr-output-v3/`

| Agent ID | Text | Slug | Status |
|----------|------|------|--------|
| a929de8 | Περί Φθόνου (On Envy) | peri-phthonou | 🔄 Running |
| a0de807 | Η εικόνα της αδικίας (Image of Injustice) | eikona-adikias | 🔄 Running |
| a680e65 | Κατάκριση... (Slander/Calumny) | katakrisis-katalalia | 🔄 Running |

---

## Completed Agents (2026-02-08, Session 47)

### Twenty-Four Histories Final Fixes — ✅ COMPLETE

**Completed:** 2026-02-08

**Issues Fixed:**
1. **Double-encoded JSONB:** 3,966 chapters had source_content stored as JSON string inside JSONB. Fixed with SQL: `UPDATE chapters SET source_content = trim(both '"' from source_content::text)::jsonb WHERE jsonb_typeof(source_content) = 'string'`
2. **Weishu chapter-35:** Translated via DeepSeek (35 paragraphs)
3. **Mingshi chapters 238-248, 324-332:** Translated via Gemini fallback (~1,100 paragraphs)

**Final Status:**
| Text | Total | Translated | Remaining | Notes |
|------|-------|------------|-----------|-------|
| Mingshi | 332 | 331 | 1 | ch 101 empty (scrape had only copyright notice) |
| Yuanshi | 210 | 209 | 1 | ch 111 empty (scrape had only copyright notice) |
| All other 22 texts | 2,738 | 2,738 | 0 | COMPLETE |

**Grand Total: 3,278/3,280 chapters translated (99.94%)**

The 2 empty chapters (mingshi ch 101, yuanshi ch 111) cannot be translated - source data was not available on Wikisource at scrape time.

---

### meenakshi-irattaimani-malai Retranslation — ✅ COMPLETE

**Issue:** Paragraph 21 had SEVERE cross-text contamination (~150 words from "Vaitheeswaran Temple" text instead of 7-word completion marker)

| Agent ID | Task | Status |
|----------|------|--------|
| aef3c55 | Tamil source vs translation comparison report | ✅ DONE (`docs/meenakshi-irattaimani-malai-comparison-report.md`) |
| a114446 | Retranslate meenakshi-irattaimani-malai | ✅ DONE (version 12878, 22 paragraphs clean) |

**Result:** Contamination removed. Live on deltoi.com.

---

### Tamil Round 8 Content Cleaning — ✅ ALL COMPLETE

**Completed:** 2026-02-08 ~11:45PM

**Content Cleaning (Publisher Contamination Removal):**

| Text | Fix Applied | Result |
|------|-------------|--------|
| mayuranatar-anthathi | Removed glossary from last paragraph | 112 → 111 ✅ |
| meenakshi-pillaitamil | Removed TOC from paragraph 0 | 102 → 101 ✅ |
| veeramaamunivar-kalambakam | Removed publisher content (paras 0-2), preserved Author's Note (என்னுரை) | 86 → 83 ✅ |
| Duplicate translation record | Deleted stale translation ID 12426 | Count mismatch fixed ✅ |
| Double-encoded JSONB | Fixed subagent encoding error | ch 16211 fixed ✅ |

**Remaining Audit Warnings (1311 total):** ALL FALSE POSITIVES
- BRACKET_PLACEHOLDER: 1292 (translator clarifications)
- OTHER_WORKS_LIST: 15 (temple names in poetry)
- TOC_STRUCTURE: 4 (section headers in content)

**Protected Texts (Never Touch):** singai-nagar-anthathi, chithira-kavigal

---

### Tamil Round 8 Translation Fixes (Earlier) — ✅ COMPLETE

**Completed:** 2026-02-08 ~11:30PM

**Incident (2026-02-08):** 8th round of failures. 11 subagents ALL FAILED with "classifyHandoffIfNeeded is not defined". Main agent took over directly.

**Root causes fixed:**
1. Source content stored as string instead of JSONB (4 texts)
2. Paragraph format wrong (strings instead of {text, index} objects)
3. Corrupt translation rows with empty paragraphs

| Text | Paragraphs | Engine | Status |
|------|------------|--------|--------|
| angayarkanni-malai | 101 | DeepSeek V3 | ✅ DONE |
| veeramaamunivar-kalambakam | 71 | DeepSeek V3 | ✅ DONE |
| tiruchendur-murugan-pillaitamil | 89 | DeepSeek V3 | ✅ DONE |
| thanigai-kalambakam | 95 | Gemini (fallback) | ✅ DONE |
| seyur-murugan-pillaitamil | 27 | DeepSeek V3 | ✅ DONE |
| mayuranatar-anthathi | 112 | DeepSeek V3 | ✅ DONE |
| perur-mummani-kovai | 30 | DeepSeek V3 | ✅ DONE |
| kurukuturai-kalambakam | 240 | DeepSeek V3 | ✅ DONE |

**Total:** 765 paragraphs translated across 8 texts

### 24 Histories Translation Workers — ✅ ALL COMPLETE

All 24 dynastic histories are now translated (except 2 empty chapters with no source data).

| Text | Chapters | Status |
|------|----------|--------|
| Shiji | 130/130 | ✅ DONE |
| Hanshu | 110/110 | ✅ DONE |
| Hou Hanshu | 130/130 | ✅ DONE |
| San Guo Zhi | 65/65 | ✅ DONE |
| Jinshu | 130/130 | ✅ DONE |
| Song Shu | 100/100 | ✅ DONE |
| Nan Qi Shu | 59/59 | ✅ DONE |
| Liangshu | 56/56 | ✅ DONE |
| Chenshu | 36/36 | ✅ DONE |
| Weishu | 124/124 | ✅ DONE |
| Bei Qi Shu | 50/50 | ✅ DONE |
| Zhoushu | 50/50 | ✅ DONE |
| Sui Shu | 85/85 | ✅ DONE |
| Nanshi | 80/80 | ✅ DONE |
| Beishi | 100/100 | ✅ DONE |
| Jiu Tangshu | 214/214 | ✅ DONE |
| Xin Tangshu | 248/248 | ✅ DONE |
| Jiu Wudaishi | 150/150 | ✅ DONE |
| Xin Wudaishi | 74/74 | ✅ DONE |
| Songshi | 496/496 | ✅ DONE |
| Liaoshi | 116/116 | ✅ DONE |
| Jinshi | 135/135 | ✅ DONE |
| Yuanshi | 209/210 | ✅ 99.5% (ch 111 empty) |
| Mingshi | 331/332 | ✅ 99.7% (ch 101 empty) |
| ac2cf20 | Xin Wudaishi (ch 1-74) | 74 | 🔄 Running |
| a8d76cc | Nan Qi Shu (ch 1-59) | 59 | 🔄 Running |
| ad1f016 | Mingshi (ch 1-332) | — | 🔄 Running |
| a1bf5e9 | Yuanshi (ch 1-210) | 210 | 🔄 Running |
| a26742d | Jiu Wudaishi (ch 1-150) | 150 | 🔄 Running |
| ac84757 | Jinshi (ch 1-135) | 135 | 🔄 Running |
| a149725 | Weishu (ch 1-124) | 124 | 🔄 Running |

### Pinhua Baojian — ✅ COMPLETE (61/61 chapters)

| Agent ID | Task | Status |
|----------|------|--------|
| a420178 | Pinhua W1 (ch 0-30) | ✅ DONE (27/31, 4 truncated) |
| a95c303 | Pinhua W2 (ch 31-60) | ✅ DONE (23/30, 7 truncated) |
| a5533a9 | Pinhua Gemini fix (ch 2, 7, 14, 17, 46, 54) | ✅ DONE |
| a5fbf1e | Pinhua Gemini fix (ch 31-34, 60) | ✅ DONE |
| abd6c19 | Pinhua ch 31 + 60 special fix | ✅ DONE |

### Tamil A/B Comparison — ✅ COMPLETE (DeepSeek V3 wins)

| Agent ID | Task | Status |
|----------|------|--------|
| af9b1b8 | DeepSeek translation + comparison | ✅ DONE |
| — | Result | **DeepSeek V3 outperforms Gemini** for Tamil poetry |

**Policy Update:** New Tamil texts should use `scripts/translate-batch.ts --text <slug>` with DeepSeek. See `docs/tamil-ab-comparison-report.md` for details.

### Recently Completed (This Session)

| Agent ID | Task | Result |
|----------|------|--------|
| aab9719 | Tamil OCR verification | ✅ DONE (interrupted, partial) |
| abbd938 | Tamil OCR replacement + translation | ✅ DONE (108+19 para, report written) |
| — | Version 0 history fix | ✅ COMMITTED (5d86813) |

### Completed Earlier Today

| Agent ID | Task | Result |
|----------|------|--------|
| a61f53a | Pinhua Baojian COMPLETE RESET | ✅ DONE (61ch, 2435 para) |
| ab2aa0b | San Guo Zhi ch 56 (Gemini fallback) | ✅ DONE (29 para) |
| a84a7f1 | Song Shi 211-214 fix | ✅ DONE (4/4 ch, 248 para) |
| bddc75c | Singai Nagar DeepSeek retranslation | ✅ DONE (104 para) |
| acc1608 | Gemini review: Chithira Kavigal | ✅ SATISFIED (Grade B+) |
| acaba95 | Gemini review: Singai Nagar | ✅ SATISFIED (Grade B+) |

---

## Verified Complete (2026-02-07 Database Check)

**16/24 Histories Complete:**
| Text | Chapters | Status |
|------|----------|--------|
| Shiji | 130/130 | ✅ DONE |
| Hanshu | 110/110 | ✅ DONE |
| Hou Hanshu | 130/130 | ✅ DONE |
| San Guo Zhi | 65/65 | ✅ DONE |
| Jin Shu | 130/130 | ✅ DONE |
| Song Shu | 100/100 | ✅ DONE |
| Liangshu | 56/56 | ✅ DONE |
| Chen Shu | 36/36 | ✅ DONE |
| Bei Qi Shu | 50/50 | ✅ DONE |
| Zhoushu | 50/50 | ✅ DONE |
| Sui Shu | 85/85 | ✅ DONE |
| Jiu Tang Shu | 214/214 | ✅ DONE |
| Xin Tangshu | 248/248 | ✅ DONE |
| Xin Wudaishi | 74/74 | ✅ DONE |
| Song Shi | 496/496 | ✅ DONE |
| Liao Shi | 116/116 | ✅ DONE |

## In Progress (24 Histories) — 8 Active Workers

| Text | Done/Total | Remaining | Status |
|------|------------|-----------|--------|
| Mingshi | 78/332 | 254 | 🔄 Running |
| Yuanshi | 67/210 | 143 | 🔄 Running |
| Beishi | 32/100 | 68 | 🔄 Running |
| Weishu | 44/124 | 80 | 🔄 Running |
| Jinshi | 71/135 | 64 | 🔄 Running |
| Nanshi | 80/80 | 0 | ✅ DONE |
| Nan Qi Shu | 59/59 | 0 | ✅ DONE |
| Jiu Wudaishi | 150/150 | 0 | ✅ DONE |

**Total Remaining:** 709 chapters across 8 texts

**Recently Completed (Session 46):**
- Liangshu: 56/56 ✅
- Bei Qi Shu: 50/50 ✅
- Zhoushu: 50/50 ✅
- Jinshu: 130/130 ✅
- Jiu Tangshu: 214/214 ✅
- Xin Wudaishi: 74/74 ✅
- Chen Shu: 36/36 ✅
- Liaoshi: 116/116 ✅

## ✅ COMPLETE — Liaoshi (遼史 / History of Liao)

| Worker | Agent ID | Range | Chapters | Status |
|--------|----------|-------|----------|--------|
| W1 | a443253 | 1-58 | 58 | ✅ DONE |
| W2 | a326cc3 | 59-116 | 58 | ✅ DONE |

**Total:** 116/116 chapters | **Completed:** 2026-02-07

## In Progress — Mingshi (明史 / History of Ming)

| Worker | Agent ID | Range | Chapters | Status |
|--------|----------|-------|----------|--------|
| W1 | a82a010 | 79-163 | 85 | ✅ DONE (76 trans, ch 84 needs Gemini) |
| W2 | a891bd9 | 164-248 | 85 | ✅ DONE (78 trans, ch 177,230 truncated, 242-248 not reached) |
| W3 | a0e7057 | 249-332 | 84 | 🔄 Running |
| W2-fix | a33d274 | 242-248 + retry 177,230 | 9 | 🔄 Running |

**Total:** 332 chapters | **Done:** ~154 | **Remaining:** ~178
**Note:** W2 timed out before completing; a33d274 launched to finish remaining 7 chapters + retry 2 failed

## In Progress — Yuanshi (元史 / History of Yuan)

| Worker | Agent ID | Range | Chapters | Status |
|--------|----------|-------|----------|--------|
| W1 | acda1e6 | 68-115 | 46/48 | ✅ DONE (2 skipped) |
| W2 | af79d2d | 116-163 | 46/48 | ✅ DONE (2 skipped) |
| W3 | a4e6dca | 164-210 | 47 | ✅ DONE |

**Total:** 210 chapters | **Done:** 67 | **Remaining:** 143
**Note:** Reallocated from single worker to 3 workers (2026-02-07)

## ✅ ALL 24 HISTORIES LAUNCHED — No texts remaining!

All 24 dynastic histories are now either complete or have active workers.

**Retry Queue:** ✅ ALL CLEARED
- jiu-tangshu ch 28, 47, 18903 → **Agent a6c5c61 COMPLETE** ✅ (26+29+72 paragraphs)

## Tamil Corpus Expansion (Autonomous) — ✅ COMPLETE

| Agent ID | Task | Status |
|----------|------|--------|
| af1118e | Find 20 Tamil texts (v1) | ❌ STOPPED (left artifacts) |
| a189e85 | Tamil Quality Agent (clean first) | ✅ COMPLETE |
| a9ecc05 | Seed + translate 19 texts | ✅ COMPLETE |

**Final Results:**
- **15 new authors** added to database
- **19 texts** seeded and translated via DeepSeek V3
- **~2,025 paragraphs** translated
- Fixed 2 corrupted mega-paragraphs, adjusted Tamil length ratio to 0.35

## Recently Completed (Session 46)

| Agent ID | Task | Result |
|----------|------|--------|
| ac2cf20 | Xin Wudaishi (ch 1-74) | ✅ DONE (74ch, 100%) |
| ace14ec | Jiu Tangshu W1 (ch 1-53) | ✅ DONE (51ch, ch 28,47 skipped) |
| aa456aa | Jiu Tangshu W4 (ch 160-200+splits) | ✅ DONE (54ch, ch 18903 skipped) |
| ad0f93b | Jiu Tangshu W2 (ch 54-106) | ✅ DONE (53ch, ~1,662 para) |
| aa64f79 | Jinshu W2 (ch 45-88) | ✅ DONE (44ch, ~2,212 para) |
| a5baeca | Jinshu W1 (ch 1-44) | ✅ DONE (44ch, 4,141 para) |
| a41697f | Jinshu W3 (ch 89-130) | ✅ DONE (42ch) |
| a949677 | Jiu Tangshu W3 (ch 107-159) | ✅ DONE (53ch) |
| a443253 | Liaoshi W1 (ch 1-58) | ✅ DONE (58ch) |
| a326cc3 | Liaoshi W2 (ch 59-116) | ✅ DONE (58ch) |
| aa65e37 | Chen Shu (ch 1-36) | ✅ DONE (36ch) |
| a5533a9 | Pinhua Gemini fix (ch 2, 7, 14, 17, 46, 54) | ✅ DONE |
| a5fbf1e | Pinhua Gemini fix (ch 31-34, 60) | ✅ DONE |
| abd6c19 | Pinhua ch 31 + 60 special fix | ✅ DONE |
| af9b1b8 | Tamil A/B Comparison | ✅ DONE (DeepSeek wins) |

## Tamil A/B Comparison Experiment (Task #14)

**Goal:** Compare Gemini vs DeepSeek translations for Tamil devotional poetry

**Workflow:**
1. **Phase 1 (ad97aed):** DeepSeek translation with specialist prompts
   - Output: `scratchpad/deepseek-singai-nagar.md`, `scratchpad/deepseek-chithira-kavigal.md`
2. **Phase 2:** Impartial Claude comparison
   - Compare paragraph-by-paragraph
   - Evaluate: accuracy, fluency, preservation of verse structure
3. **Phase 3:** Populate DB with winning translation

**Texts:**
- Singai Nagar Anthathi: 108 paragraphs (devotional chain-verse)
- Chithira Kavigal: 19 paragraphs (sophisticated verse forms)

**Current Status:** Phase 1 running (ad97aed)

---

## San Guo Zhi Chapter 56 Fix (Agent ab2aa0b)

Dedicated agent with Gemini fallback capability:
- Analyzes source paragraph structure
- Tries DeepSeek first with smaller batches
- Falls back to Gemini if DeepSeek fails
- Can split long paragraphs if needed

---

## Active — Twenty-Four Histories (二十四史) Pipeline

- **Source:** zh.wikisource.org
- **Scope:** 24 dynastic histories, ~3,213 chapters total
- **Author (for seeding):** "The Twenty-four Histories" (collective compilation)
- **Phase 0 (Reconnaissance):** ✅ COMPLETE
- **Phase 1 (Acquisition):** ✅ COMPLETE — 24/24 histories acquired (~3,213 chapters)
- **Phase 2 (Seeding):** ✅ COMPLETE — 3,279 chapters seeded
- **Phase 3 (Descriptions):** ✅ COMPLETE — Scholarly descriptions applied
- **Phase 4 (Sort Order):** ✅ LIVE — Canonical ordering (1-24) working on production
- **Phase 5 (Trial Translation):** ✅ APPROVED — hanshu ch 1-10 reviewed by DeepSeek-reasoner
- **Phase 6 (Mass Translation):** IN PROGRESS — 6 workers translating

**⚠️ TRANSLATION PAUSED — DATA QUALITY ISSUE ⚠️**

**Issue (2026-02-03):** Han Shu chapter 20 has 97% commentary content (師古曰, etc.) mixed as orphan paragraphs. Data is unusable for translation.

**Current Status:**
- Cleaning agent (ae2cec5) **STOPPED** - regex cleaning won't fix structural issues
- Han Shu workflow plan created: `docs/hanshu-workflow-plan.md`
- 5 independent DeepSeek reviewers assessing other 24 Histories texts

**Review Agent Results (COMPLETE):**
| Reviewer | Texts | Result |
|----------|-------|--------|
| 1 | shiji, hanshu, hou-hanshu, sanguozhi, jinshu | **shiji, hanshu, jinshu:** CLEAN. **hou-hanshu, sanguozhi:** MODERATE issues |
| 2 | songshu, nan-qi-shu, liangshu, chenshu, weishu | **nan-qi-shu, liangshu, chenshu, weishu:** CLEAN. **songshu:** MINOR issue |
| 3 | bei-qi-shu, zhoushu, suishu, nanshi, beishi | **bei-qi-shu, suishu, nanshi, beishi:** CLEAN. **zhoushu:** MINOR issue |
| 4 | jiu-tangshu, xin-tangshu, jiu-wudaishi, xin-wudaishi, songshi | **xin-tangshu, jiu-wudaishi, songshi:** CLEAN. **jiu-tangshu, xin-wudaishi:** MINOR |
| 5 | liaoshi, jinshi, yuanshi, mingshi | **liaoshi, mingshi:** CLEAN. **jinshi, yuanshi:** MINOR |

**Summary:** 16 texts clean, 6 with minor issues (editorial marks only), 2 with moderate issues (hou-hanshu, sanguozhi have embedded commentary).

**⚠️ IMPORTANT CLARIFICATION (User directive):**
- **Context-free commentary** (orphan paragraphs) = **PROBLEMATIC** — commentary separated from main text, appearing as meaningless standalone paragraphs with no indication of what they're commenting on
- **Embedded commentary** (in context) = **FINE** — commentary interwoven with the text it explains; readers can understand the relationship

The hou-hanshu and sanguozhi "moderate issues" are ACCEPTABLE because their commentary (Pei Songzhi notes, Li Xian annotations) is properly embedded in context. Han Shu table chapters (13-20) were problematic because Yan Shigu's commentary appeared as context-free orphan paragraphs.

**Han Shu Workflow Progress:**
| Phase | Task | Status |
|-------|------|--------|
| 1 | Wikisource HTML analysis | **COMPLETE** - see `docs/hanshu-html-analysis.md` |
| 2 | Scraping strategy decision | **COMPLETE** - Option A: Strip commentary |
| 3 | Scraper development | **COMPLETE** - `scripts/scrape-hanshu-v2.ts` tested |
| 4 | Quality gate | **COMPLETE** - 4 test chapters verified clean |
| 5 | Full acquisition | **COMPLETE** - 110 files, 7,021 paragraphs in `data/processed/hanshu-v2/` |
| 6 | Kimi K2 Master Review | **✅ APPROVED — conditions met** - see `docs/hanshu-kimi-k2-review.md` |
| 7 | Database update | **✅ COMPLETE** - 109 chapters updated, 37 old translations deleted |
| 8 | Translation | **IN PROGRESS** - 6 workers launched |

**Phase 7 Results (2026-02-04):**
- Updated source_content for 109/110 chapters with clean v2 data
- Deleted 37 contaminated translations
- Total paragraphs in DB: 7,021
- **1 chapter without clean data:** chapter-099b (卷099中) — v2 scraper missed this middle part
- Script: `scripts/update-hanshu-source.ts`

**Phase 8 Translation Workers (Han Shu):**
| Worker | Task ID | Chapters | Range | Progress | Status |
|--------|---------|----------|-------|----------|--------|
| W1 | b7b0989 | 1-20 | --start 1 --end 20 | **20/20 COMPLETE** ✓ | DONE |
| W2 | b32b36f | 21-40 | --start 21 --end 40 | **20/20 COMPLETE** ✓ | DONE |
| W3 | bfc79ff | 41-60 | --start 41 --end 60 | **19/20 COMPLETE** (ch 56 failed) | DONE |
| W4 | bebb250 | 61-80 | --start 61 --end 80 | **20/20 COMPLETE** ✓ | DONE |
| W5 | b91971a | 81-100 | --start 81 --end 100 | **20/20 COMPLETE** ✓ | DONE |
| W6 | b0d93ba | split parts (10ch) | --start 2403 | **10/10 COMPLETE** ✓ | DONE |

**Gap Fix Worker:**
| Worker | Task ID | Chapter | Status |
|--------|---------|---------|--------|
| Retry | ba3a8d1 | ch 56 | **COMPLETE** ✓ (34 paragraphs) |

**✅ HAN SHU TRANSLATION COMPLETE — 110/110 chapters, 7,021 paragraphs**

**Shiji Translation Workers:**
| Worker | Task ID | Chapters | Range | Progress | Status |
|--------|---------|----------|-------|----------|--------|
| S1 | b0b2908 | 1-65 | --start 1 --end 65 | **53 translated, 11 skipped** | **COMPLETE** ✓ |
| S2 | b24dc27 | 66-130 | --start 66 --end 130 | **43 translated, 22 skipped** | **COMPLETE** ✓ |

**Shiji Data Quality Fix Agents:**
| Agent ID | Task | Status |
|----------|------|--------|
| acb080c | Shiji audit (all 130 chapters) | **COMPLETE** ✓ Ch 2 fixed, audit report written |
| ac11939 | Shiji systematic fix (ch 22, 67, 4, 5, 6, 24, 87) | **COMPLETE** ✓ All issues resolved |

**Shiji Audit Findings (2026-02-04) — ALL RESOLVED:**
- **Ch 2:** Qingzhou (青州) paragraph was missing — FIXED ✓
- **Ch 22:** Missing entirely — FIXED ✓ (45 paragraphs, Han officials table)
- **Ch 67:** +59 paragraph difference — FIXED ✓ (added 42 disciples + commentary)
- **Ch 4, 5, 6, 24, 87:** Editorial variations — documented, no action needed
- **Ch 18, 19, 33, 44, 92:** False positives (Wikisource redirects) — confirmed correct
- **Ch 26:** False positive (calendar tables use different HTML) — confirmed correct

**✅ SHIJI DATA QUALITY VERIFIED — 130/130 chapters present and validated**

**Shiji DB Sync + Translation Agent:**
| Agent ID | Task | Status |
|----------|------|--------|
| ae4e085 | Sync fixes to DB + translate ch 2, 22, 67 | **COMPLETE** ✓ |

**✅ SHIJI FULLY COMPLETE — 130/130 chapters synced and translated**

**Xin Tangshu (New Book of Tang) Translation Workers:**

*Previous workers (stopped and reallocated):*
| Worker | Task ID | Progress | Status |
|--------|---------|----------|--------|
| X1 | b8139c4 | ch 1-19 done | STOPPED |
| X2 | b266c65 | ch 125-145 done | STOPPED |
| X3 | bd84736 | **23/23 split parts** | DONE ✓ |

*8-worker allocation (2026-02-04):*
| Worker | Task ID | Range | Chapters | Status |
|--------|---------|-------|----------|--------|
| W1 | b52d6ec | 20-40 | 21 | ✅ DONE |
| W2 | b44afab | 41-61 | 21 | ✅ DONE |
| W3 | b3a0ae6 | 62-82 | 21 | ✅ DONE |
| W4 | b6e3d61 | 83-103 | 21 | ✅ DONE |
| W5 | bb42cbf | 104-124 | 21 | ✅ DONE |
| W6 | b91d31e | 146-172 | 27 | ✅ DONE |
| W7 | bffc468 | 173-199 | 27 | ✅ DONE |
| W8 | b443a26 | 200-225 | 26 | ✅ DONE |

**✅ XIN TANGSHU TRANSLATION COMPLETE — 248/248 chapters**

---

### Four Histories Translation (2026-02-05)

**Scope:** San Guo Zhi, Sui Shu, Song Shi, Song Shu — 746 chapters total

**Review Agents:**
| Agent ID | Text | Chapters | Status |
|----------|------|----------|--------|
| a5af96d | San Guo Zhi (三國志) | 65 | ✅ PASS (Grade A) |
| a3f252d | Sui Shu (隋書) | 85 | ✅ PASS (Grade B+) |
| a5a7342 | Song Shi (宋史) | 496 | ✅ PASS (Grade B+, minor cleanup) |
| adf95e9 | Song Shu (宋書) | 100 | ✅ PASS (Grade A-) |

**Translation Agents:**
| Agent ID | Text | Chapters | Status |
|----------|------|----------|--------|
| a735031 | San Guo Zhi | 65 | ✅ DONE (64/65, ch 56 API issue) |
| aa88be1 | Sui Shu | 85 | ✅ DONE |
| a3e5312 | Song Shi | 1-35 | ✅ Done (35ch), STOPPED |
| a10e53d | Song Shi W1 | 36-127 | ✅ DONE (168ch) |
| a4a7b7d | Song Shi W2 | 128-219 | ✅ DONE (88ch, 4 empty) |
| a08b744 | Song Shi W3 | 220-311 | ✅ DONE (92ch) |
| abe6096 | Song Shi W4 | 312-403 | 🔄 Running |
| a81ec9c | Song Shi W5 | 404-496 | ✅ DONE (93ch) |
| a01a337 | Song Shu ch 64 fix | 1 | ✅ DONE |
| ae7834a | Song Shu | 100 | ✅ DONE (100/100) |

**Hou Hanshu (後漢書) Translation Workers:**

*Previous workers (killed - used old chapter numbers before renumbering):*
| Worker | Task ID | Range | Status |
|--------|---------|-------|--------|
| W1 | ae81bbb | 4-45 (old) | ❌ KILLED |
| W2 | a58711b | 46-90 (old) | ❌ KILLED |
| W3 | af3040c | 91-120 (old) | ❌ KILLED |

*New workers (correct chapter numbers after renumbering):*
| Worker | Task ID | Range | Pending | Status |
|--------|---------|-------|---------|--------|
| W1 | af5f6eb | 12-402 | 40 | ✅ DONE |
| W2 | aeb4343 | 410-802 | 40 | ✅ DONE |
| W3 | aa5efdc | 810-1200 | 39 | ✅ DONE |
| Retry | b1098a6 | 402, 580 | 2 | ✅ DONE (Gemini) |

**✅ HOU HANSHU COMPLETE — 192/192 chapters translated**

**Note:** Chapter renumbering scheme: base×10 for regular chapters (e.g., ch 2 → 20), base×10+1 for Part 1 (e.g., ch 1上 → 11), base×10+2 for Part 2 (e.g., ch 1下 → 12)

**Cleanup Applied (2026-02-05):**
- Song Shi: Removed `{{YL|...` templates (ch 121, 125, 151) + navigation artifacts (ch 216-241)
- Sui Shu: Removed `{{*|...}}` template (ch 31)

---

## Session 45 Completed (2026-02-06)

| Agent ID | Task | Status |
|----------|------|--------|
| a9dd2f8 | Search optimization (trigram indexes + remove count query) | ✅ Commit 16b640a |
| a01a337 | Song Shu chapter 64 fix | ✅ 46 paragraphs translated |
| a735031 | San Guo Zhi translation (65ch) | ✅ 64/65 (ch 56 API issue) |
| a0b6668 | Qingshi retranslation (24ch) | ⚠️ 9/24 (API timeout issues) |
| — | Qingshi data fix (re-scrape from /wiki/情史/N) | ✅ 24 chapters, ~5,000 paragraphs |
| — | Search pagination (offset-based) | ✅ Commit a241b79 |
| af5f6eb | Hou Hanshu W1 (12-402) | ✅ DONE |
| aeb4343 | Hou Hanshu W2 (410-802) | ✅ DONE |
| aa5efdc | Hou Hanshu W3 (810-1200) | ✅ DONE |
| b1098a6 | Hou Hanshu Gemini retry (ch 402, 580) | ✅ DONE (2/2) |
| a224be3 | Pan Walery (Polish) full pipeline | ✅ DONE (24ch, 573 para) |
| — | Hou Hanshu slug fix | ✅ Fixed (slug = 'chapter-' || chapter_number) |
| — | Hou Hanshu ordering fix | ✅ Fixed (sequential by chapterNumber) |

**Search Performance Optimization:**
- Added `pg_trgm` extension
- Created `chapters_source_trgm_idx` GIN index
- Created `translation_versions_content_trgm_idx` GIN index
- Removed count query (now uses limit+1 strategy for hasMore)
- Query time reduced from ~500ms-2s to ~7-16ms

**Pending:**
- Qingshi ch 10-24 retranslation (DeepSeek API issues)
- San Guo Zhi ch 56 (paragraph mismatch - needs Gemini fallback)
- Song Shi W4 (abe6096) — ~21 chapters remaining

---

## ✅ COMPLETE — Three Histories Translation (2026-02-07)

**Verified via database query 2026-02-07:**

**Liangshu (梁書 / Book of Liang) — 56/56 ✅ DONE**
| Worker | Agent ID | Range | Status |
|--------|----------|-------|--------|
| W1 | a06488c | 1-28 | ✅ DONE (26 translated, 2 skipped) |
| W2 | abb3350 | 29-56 | ✅ DONE |

**Zhoushu (周書 / Book of Zhou) — 50/50 ✅ DONE**
| Worker | Agent ID | Range | Status |
|--------|----------|-------|--------|
| W1 | a4c3b74 | 1-25 | ✅ DONE |
| W2 | a08dd70 | 26-50 | ✅ DONE |

**Bei Qi Shu (北齊書 / Book of Northern Qi) — 50/50 ✅ DONE**
| Worker | Agent ID | Range | Status |
|--------|----------|-------|--------|
| W1 | a29256a | 1-25 | ✅ DONE |
| W2 | a8a4424 | 26-50 | ✅ DONE |

**Total: 156/156 chapters COMPLETE**

---

## Pinhua Baojian COMPLETE RESET (2026-02-07)

**User Directive:** Due to repeated quality issues (duplicates → ruinous fix → paragraph misalignment), the User has ordered a complete reset with rigorous independent review.

**7-Phase Pipeline:**
| Phase | Task | Agent | Status |
|-------|------|-------|--------|
| 1 | Clear ALL existing data (translations + chapters) | a61f53a | 🔄 Running |
| 2 | Study Wikisource structure (index + chapter HTML) | a61f53a | 🔄 Running |
| 3 | Create clean processing script | a61f53a | 🔄 Running |
| 4 | Execute scraping | a61f53a | 🔄 Running |
| 5 | Write completion report | a61f53a | 🔄 Running |
| 6a | **Independent Review #1** (DeepSeek-reasoner) | PENDING | — |
| 6b | **Independent Review #2** (Standard Claude) | PENDING | — |
| 7 | Seed chapters to database | PENDING | — |
| 8 | Translation (zh-literary prompt, 1500 char batches) | PENDING | — |
| 9 | **Post-Translation Review** (DeepSeek-reasoner alignment check) | PENDING | — |

**Previous Issues (for the record):**
- Initial scrape had duplicate paragraphs
- Fix agent (a949a0d) removed duplicates from source_content but NOT translations → complete misalignment
- Chapters 52, 53 showed missing paragraphs and content shift
- Chapters 8, 50 were aligned but overall data quality suspect

**Quality Gates:**
- Phase 6 requires B+ from BOTH reviewers
- Phase 9 requires paragraph-to-paragraph alignment verification

---

## Pinhua Baojian Alignment Incident (2026-02-07)

**Status:** ✅ Ch 1 Fixed (Agent a186edb), 🔄 Ch 52-53 Fix In Progress (Agent a9b9bf8)

**Incident Summary:**
A subagent (a949a0d) attempted to fix duplicate paragraphs by removing them from `source_content` and renumbering indices. However, `translation_versions` was NOT updated, causing complete content misalignment — source paragraph N no longer matched translation paragraph N.

**Resolution Steps:**
1. ✅ JSON files restored via `git checkout 5e4d69a -- data/processed/pinhua-baojian/`
2. ✅ Database restored via `scripts/restore-pinhua-source.ts` — 60/60 chapters updated
3. ❌ Agent a9557db failed (framework error) before completing analysis
4. 🔄 Agent a186edb launched (2026-02-07) to properly fix duplicates

**Fix Agents:**
| Agent ID | Task | Status |
|----------|------|--------|
| a9557db | Analyze duplicate pattern | ❌ FAILED (framework error) |
| a186edb | Fix duplicates safely with documentation | 🔄 Running |

**Lesson:** NEVER modify source_content indices without updating translation_versions. Paragraph alignment is sacred.

---

## Active — Chinese Literature Pipeline (2026-02-07)

**Total:** 8 texts, 628 chapters

**Phases Complete:**
- Phase 1 (Verification): ✅ 8 viable texts, 11 rejected
- Phase 2 (Processing): ✅ 490+ chapters, 15,684+ paragraphs
- Phase 3 (Quality Review): ✅ Wikisource templates removed
- Phase 4 (Seeding): ✅ 7 new authors, 8 texts seeded
- Phase 5 (Prompt Check): ✅ Using `zh-literary` prompt
- Phase 6 (Translation): 🔄 Workers running

**Current Status (verified via DB 2026-02-07 15:23 UTC):**
| Text | Total | Done | Remaining |
|------|-------|------|-----------|
| yesou-puyan | 154 | 154 | 0 ✅ |
| nu-xian-waishi | 100 | 67 | 33 |
| lin-lan-xiang | 64 | 61 | 3 |
| lu-mudan | 64 | 64 | 0 ✅ |
| hou-xiyouji | 40 | 31 | 9 |
| ernu-yingxiong-zhuan | 40 | 20 | 20 |
| pingshan-lengyan | 20 | 15 | 5 |
| ba-dongtian | 8 | 7 | 1 |

**Total remaining: ~71 chapters across 6 texts**

**Translation Workers (Wave 3 — no overlap):**
| Worker | Task ID | Text | Chapters | Status |
|--------|---------|------|----------|--------|
| W1 | bf457cb | nu-xian-waishi | 7-35 | 🔄 Running |
| W2 | b67be24 | nu-xian-waishi | 36-65 | 🔄 Running |
| W3 | b58c61b | nu-xian-waishi | 66-100 | 🔄 Running |
| W4 | bdeadde | lin-lan-xiang | 14-40 | 🔄 Running |
| W5 | b5b4d35 | lin-lan-xiang | 41-64 | 🔄 Running |
| W6 | bddf02f | lu-mudan | 11-38 | 🔄 Running |
| W7 | — | lu-mudan | 39-64 | ✅ SKIPPED (already done) |
| W8 | b237043 | hou-xiyouji | 6-23 | 🔄 Running |
| W9 | b6c18ef | hou-xiyouji | 24-40 | 🔄 Running |
| W10 | b1cb5d7 | ernu-yingxiong-zhuan | 5-22 | 🔄 Running |
| W11 | b20ddc3 | ernu-yingxiong-zhuan | 23-40 | 🔄 Running |
| W12 | b8ab31d | pingshan-lengyan | 3-20 | 🔄 Running |
| W13 | b977504 | ba-dongtian | 2-8 | 🔄 Running |

**Texts:**
| Slug | Title | Chapters | Author |
|------|-------|----------|--------|
| hou-xiyouji | Later Journey to the West | 40 | Anonymous |
| ernu-yingxiong-zhuan | A Tale of Heroic Lovers | 40 | Wen Kang |
| pingshan-lengyan | Flat Mountain and Cold Swallow | 20 | Tianhuazang Zhuren |
| lin-lan-xiang | Forest Orchid Fragrance | 64 | Qianyisheng |
| lu-mudan | The Green Peony | 64 | Wu Bing |
| ba-dongtian | Eight Paradises | 8 | Wuseshi Zhuren |
| nu-xian-waishi | Unofficial History of Female Immortals | 100 | Lu Xiong |
| yesou-puyan | Humble Words of a Rustic Elder | 154 | Xia Jingqu |

---

## Active — Russian Orthodox Texts Pipeline

**Date:** 2026-02-05
**Categories:** Hagiography, Patristics, Theology, Liturgy, Spiritual Literature, Church History

**Phase 1 (Verification): ✅ COMPLETE**
| Agent ID | Task | Status |
|----------|------|--------|
| a6b0202 | Find and verify Russian Orthodox texts | ✅ Complete |

**Key Finding:** Most Orthodox classics already have English translations. 17/21 texts not viable.

**Viable Texts (3-4):**
1. **Zosima Verkhovskiy's Works** (~25-35 ch) — Hesychast tradition, Jesus Prayer, no English translation
2. **Philaret of Moscow Sermons** (curate 20-30) — "Moscow Chrysostom", no English translation
3. **Elias Miniatis Sermons** (50+ ch) — needs investigation

**Output:** `data/ru-orthodox-pipeline/verified-texts.json`

**Phase 2-3 (Processing & Review): ✅ COMPLETE**
| Agent ID | Task | Status |
|----------|------|--------|
| a145d98 | Scrape, process, clean, review Zosima Verkhovskiy | ✅ Grade A, PASS |

**Processing Results:**
- 4 works, 14 chapters, 386 paragraphs, 396K chars
- Output: `data/processed/zosima-verkhovskiy/`
- Script: `scripts/process-zosima-verkhovskiy.py`

**Phase 4 (Seeding): ✅ COMPLETE** — 14 chapters seeded

**Phase 6 (Translation): ✅ COMPLETE**
| Agent ID | Chapters | Status |
|----------|----------|--------|
| a7844eb | 1-4 | ✅ Done (119 para) |
| a7ae2c5 | 5-7 | ✅ Done (74 para) |
| a95fbeb | 8-11 | ✅ Done (120 para) |
| af7891e | 12-14 | ✅ Done (73 para) |

**✅ ZOSIMA VERKHOVSKIY COMPLETE — 14 chapters, 386 paragraphs**

**Theophan the Recluse Pipeline:**
| Agent ID | Task | Status |
|----------|------|--------|
| a1c3257 | Руководство к духовной жизни | ❌ STOPPED (already translated) |

**Maksimov - Нечистая, неведомая и крестная сила:**

**⚠️ CORRECTION:** The text has **68 chapters** (not 32). Previous agent only scraped 32 of 68 chapters.

| Agent ID | Task | Status |
|----------|------|--------|
| a1283b5 | Verification | ⚠️ INCORRECT (said 32ch, actually 68ch) |
| a768140 | Seed + translate (32ch) | ❌ STOPPED (incomplete data) |
| a95e9a7 | Complete pipeline (68ch) | 🔄 Running |

**Structure (68 chapters total):**
- От издателя (1 ch)
- Нечистая сила (18 ch) — demons, spirits, witches
- Неведомая сила (4 ch) — elemental forces
- Крестная сила (~45 ch) — Christian calendar customs


---

**Prompt:** `zh-xin-tangshu` — Custom prompt for New Book of Tang (Ouyang Xiu/Song Qi, 1060 CE)
**Text:** 248 chapters total (225 regular + 23 split parts)
**Note:** Split chapters use encoded numbers (e.g., ch 23下 = 2303, ch 70下 = 7003, ch 215下 = 21503)

**Phase 5 Results (2026-02-03):**
- **Files:** 110 chapter files (91 single + 9 split chapters x 2 parts)
- **Paragraphs:** 7,023 total
- **Commentary removed:** ~3,400+ small tags stripped
- **Split chapters:** 24, 25, 57, 64, 94, 96, 97, 99, 100 (have 上/下 parts on Wikisource)
- **Validation:** PASSED — only 1 minor issue (ch 87 structural note, not orphan commentary)
- **Output directory:** `data/processed/hanshu-v2/`

**Key Finding:** Commentary stripping works. Chapter 20 went from 97% commentary to 0% commentary.

---

### ✅ Kimi K2 Master Review (2026-02-04)

**Verdict:** APPROVE (with conditions)
**Reviewer:** Kimi K2 (kimi-k2-thinking-turbo)
**Full Report:** `docs/hanshu-kimi-k2-review.md`

**Key Findings:**
1. **Chapter 20 Transformation:** EXCEPTIONAL SUCCESS — went from 98.9% contaminated to 100% clean
2. **Chapter 87 Issues:** Two artifacts must be removed:
   - Structural note: `師古曰：「自《長楊賦》以後分爲下卷。」` (REMOVE)
   - Footer template: `{{footer|...` (BUG - MUST REMOVE)
3. **Hou-hanshu & Sanguozhi:** CONFIRMED ACCEPTABLE — embedded commentary is fine per user directive
4. **Data Quality:** Overall excellent, 0.9% failure rate (1/110 files with issues)

**Conditions (ALL COMPLETE ✅):**
- [x] Remove structural note from chapter 87 (first paragraph) — DONE
- [x] Remove footer template from chapter 87 (last paragraph) — DONE
- [x] Run global artifact scan — PASSED (no `{{` templates found)
- [x] Run orphan commentary scan — PASSED (no orphan `師古曰` found)
- [x] Update total paragraph count — 7,021 paragraphs (was 7,023, removed 2 from ch 87)

**Translation Phase Recommendations (from Kimi K2):**
1. Add prompt header: "Source: Han Shu (Book of Han) by Ban Gu. Commentary-stripped edition."
2. Prioritize spot-checks on chapters 19-21 (tables)
3. Process split chapters sequentially (24, 25, 57, 64, 94, 96, 97, 99, 100)

**✅ ALL CONDITIONS MET — Ready for Phase 7 (Database Update)**

**Completed Agents:**
| Agent ID | Task | Status |
|----------|------|--------|
| a0e2d32 | Trial translation hanshu ch 1-10 | ✓ COMPLETE |
| afa9ea1 | Fix Vercel deployment failure | ✓ COMPLETE |
| a080d03 | Create 24 translation prompts | ✓ COMPLETE |
| a4235ac | Write text descriptions | ✓ COMPLETE |
| a0a576f | Clean all footnote markers | ✓ COMPLETE |
| a8a33eb | Review cleaned texts | ✓ COMPLETE |

**Cleaning Results:**
- 8,367 footnote markers removed
- 0 footnote markers remaining
- 0 Wikisource templates remaining
- 0 research URLs remaining
- 6 empty chapters identified (acquisition failures - raw data only had copyright notices)

**Empty chapters (need re-acquisition):**
- mingshi/chapter-101
- songshi/chapter-211, 212, 213, 214
- yuanshi/chapter-111

**Completed Histories (24/24):**
| History | Files | Expected | Status |
|---------|-------|----------|--------|
| shiji | 130 | 130 | ✓ |
| hanshu | 111 | 100 | ✓ |
| hou-hanshu | 131 | 120 | ✓ |
| sanguozhi | 65 | 65 | ✓ |
| jinshu | 130 | 130 | ✓ |
| songshu | 100 | 100 | ✓ |
| nan-qi-shu | 60 | 59 | ✓ |
| liangshu | 56 | 56 | ✓ |
| chenshu | 37 | 36 | ✓ |
| weishu | 125 | 130 | ✓ |
| bei-qi-shu | 51 | 50 | ✓ |
| zhoushu | 50 | 50 | ✓ |
| suishu | 85 | 85 | ✓ |
| nanshi | 80 | 80 | ✓ |
| beishi | 100 | 100 | ✓ |
| xin-tangshu | 249 | 225 | ✓ |
| jiu-tangshu | 215 | 214 | ✓ |
| jiu-wudaishi | 151 | 150 | ✓ |
| xin-wudaishi | 74 | 74 | ✓ |
| yuanshi | 210 | 210 | ✓ |
| liaoshi | 117 | 116 | ✓ |
| songshi | 497 | 496 | ✓ |
| jinshi | 136 | 135 | ✓ |

**Phase 1 (Acquisition) COMPLETE:**
All 24 histories have been successfully acquired from zh.wikisource.org.

| mingshi | 332 | 332 | ✓ |

**Completed Previous Agents:**
| Agent ID | Task | Result |
|----------|------|--------|
| a29f340 | mingshi gap-fill (ch 102, 107, 110, 112) | **COMPLETE** ✓ 332/332 |
| a862f7c | liaoshi re-acquisition | **COMPLETE** ✓ 117/116 |
| ad0030d | mingshi acquisition | **COMPLETE** ✓ 329/332 (needs gap-fill) |
| ac23856 | jinshi gap-fill (ch 61-62) | **COMPLETE** ✓ table chapters extracted |
| a4151b4 | songshi gap-fill (24 ch) | **COMPLETE** ✓ 497/496 |
| a4d5bd4 | yuanshi acquisition | **COMPLETE** ✓ 210/210 |
| a419e37 | jiu-tangshu re-acquisition | **COMPLETE** ✓ 215/214 |
| ae0a0ee | hanshu, hou-hanshu re-acquisition | **COMPLETE** ✓ |
| ad15818 | xin-tangshu re-acquisition | **COMPLETE** ✓ |
| ac86da1 | shiji gap check | **COMPLETE** ✓ |
| ab5f8ae | weishu etc re-acquisition | **COMPLETE** ✓ |

---

## Active — Gregory of Nazianzus Complete Works Pipeline

**Date:** 2026-02-05
**Status:** PHASE 1 (ORATIONS) **TRANSLATION COMPLETE** — Review pending

### Source Discovery

After extensive investigation, found clean text PDFs from University of the Aegean Digital Patrology:
- **URL:** https://greekdownloads.wordpress.com/2014/08/31/άγιος-γρηγόριος-ο-ναζιανζηνός-gregory-of-nazianzus-pg-35/
- **Downloaded:** 63 PDFs (14MB) to `data/raw/gregory-greekdownloads/`
- **Quality:** Grade A — Clean Unicode Greek text (NOT image scans)
- **Coverage:** ALL 45 orations + letters + poetry + drama

### Phase 1: Orations (45 chapters) — IN PROGRESS

**Processing & Verification:**
| Agent ID | Task | Status |
|----------|------|--------|
| ae4088c | Fix paragraph splitting (U+0374 vs U+02B9) | ✅ COMPLETE |
| ae4a460 | Verify paragraph segmentation (1,011 paras) | ✅ COMPLETE |
| acea321 | Fix embedded section markers (130 found) | ✅ COMPLETE |
| ae431bc | Verify paragraph splitting fix | ✅ COMPLETE |
| af714c5 | DeepSeek-reasoner independent review | ✅ COMPLETE (wrote report) |
| a7b6a64 | Fix stigma spacing (Ch 2, 4) | ✅ COMPLETE (15 fixes) |
| aacc5ce | Fix structural issues + DB update | ✅ COMPLETE (45 chapters updated) |

**✅ FINAL VERIFICATION PASSED — APPROVED FOR TRANSLATION**

**Current Paragraph Counts:** 1,166 total (all 45 orations verified)

**All Issues Fixed:**
- ✓ Stigma spacing: `X ςʹ.` → `Xςʹ.` (15 fixes in Ch 2, 4)
- ✓ Orphaned markers: Removed from Ch 3, 4
- ✓ Malformed markers: Fixed `Α.` → `Αʹ.` in Ch 35
- ✓ Database updated with all fixes

**⚠️ PARAGRAPH FIX v5 (2026-02-05):**
- Agent acea321 found **130 embedded section markers** across 38 orations
- Root causes: Delta variant (U+2206 ∆), spaced lowercase sigma (ς ʹ.)
- Created `process-orations-v5.py` with comprehensive marker detection
- **Paragraph count:** 1,012 → 1,106 (+94 properly split paragraphs)
- Updated source_content for all 45 chapters in database
- Deleted 38 misaligned translations (35 changed chapters)
- **9 chapters preserved** (unchanged): 7, 11, 17, 27-31, 39

**⚠️ PARAGRAPH ALIGNMENT INCIDENT (2026-02-05):**
- Wave 3 workers STOPPED due to paragraph misalignment bug
- Issue: LLM re-segmented based on section markers, shifting content to wrong paragraphs
- All translations DELETED from database
- Code FIXED: batch size reduced, solo paragraphs, explicit prompt instructions
- See CLAUDE.md "CRITICAL: Paragraph Alignment Verification" for full details

**Translation Workers (Wave 4 - COMPLETE):**

| Worker | Bash ID | Orations | Status |
|--------|---------|----------|--------|
| W1 | b80a693 | 1-6 | ✅ DONE (Ch 4 retry: b19adb0) |
| W2 | b775099 | 8-12 | ✅ DONE |
| W3 | bb8c92e | 13-18 | ✅ DONE |
| W4 | be9784b | 19-24 | ✅ DONE |
| W5 | b91ae01 | 25-30 | ✅ DONE |
| W6 | b52f118 | 31-36 | ✅ DONE |
| W7 | b4511c1 | 37-42 | ✅ DONE |
| W8 | b11e421 | 43-45 | ✅ DONE |

**✅ TRANSLATION COMPLETE:** 45/45 orations translated (1,166 paragraphs)

**Post-Translation:**
- ✅ Review agent (a87af3b) PASSED: see `docs/gregory-orations-quality-review-v3.md`
- 1,166 paragraphs with perfect alignment, theological terms correct, no truncation
- **Phase 1 COMPLETE**

**Phase 2 Processing (Additional Works):**
| Agent ID | Task | Status |
|----------|------|--------|
| a9ecfe8 | Process PDFs: Miscellanea → Dramatic → Carmina → Epistulae | ✅ COMPLETE |

**Phase 2 Processing Results:**
| Book | Collection | Chapters | Paragraphs |
|------|------------|----------|------------|
| 1 | Epistulae (Letters) | 244 | ~2,000+ |
| 2 | Carmina (Poetry) | 53 | ~500+ |
| 3 | Dramatic/Liturgical | 2 | 198 |
| 4 | Miscellanea | 3 | 12 |
| **Total** | | **302** | |

**Phase 2 Translation Workers (DeepSeek, grc-gregory prompt):**
| Worker | ID | Text | Chapters | Status |
|--------|-----|------|----------|--------|
| Misc | b20aa8d | gregory-miscellanea | 1-3 | ✅ DONE (3/3) |
| Drama | b429109 | gregory-dramatic | 1-2 | ✅ DONE (2/2, 198 para) |
| CarmW1 | b293133 | gregory-carmina | 1-27 | 🔄 RUNNING (ch 14, 23 skipped) |
| CarmW2 | b714ee4 | gregory-carmina | 28-53 | 🔄 RUNNING (ch 30, 38 skipped) |
| EpW1 | bac3978 | gregory-epistulae | 1-60 | ✅ DONE (60/60) |
| EpW2 | b211da6 | gregory-epistulae | 61-120 | ✅ DONE (60/60) |
| EpW3 | b589934 | gregory-epistulae | 121-180 | ✅ DONE (60/60) |
| EpW4 | bfe7795 | gregory-epistulae | 181-244 | ✅ DONE (64/64) |

**Completed:** 6/8 workers, 249/302 chapters translated

### ✅ CARMINA REPROCESSING COMPLETE

**Problem (resolved):** All 53 Carmina chapters were stored as SINGLE PARAGRAPHS (no line breaks).

**Resolution (2026-02-05):**
1. All Carmina data DELETED from database (translations + chapters)
2. JSON files removed from `data/processed/gregory-carmina/`
3. New processor created: `scripts/process-carmina-de-se-ipso.py`
4. Autonomous subagent reprocessed, reviewed, seeded, and translated

**Final Results:**
- **77 chapters** (properly segmented from Greek numeral markers)
- **219 paragraphs** (1-31 per chapter, appropriate for poetry)
- **Quality Grade:** B+ (clean polytonic Greek, Migne column numbers as reference)
- **Translation:** 77/77 complete (0 errors)

**Carmina Reprocessing Agent:**
| Agent ID | Task | Status |
|----------|------|--------|
| ac39396 | Full Carmina pipeline (process → review → seed → translate) | ✅ COMPLETE (77ch, 219 para, B+) |

**Browse Page Fix:**
| Agent ID | Task | Status |
|----------|------|--------|
| a58afc3 | Fix Gregory total_chapters in texts table | ✅ COMPLETE (3 texts fixed) |

### Phase 2: Additional Works (PENDING — after orations complete)

| Book | Slug | Contents | Chapters |
|------|------|----------|----------|
| 1 | `gregory-epistulae` | 244+ Letters | 1 per letter |
| 2 | `gregory-carmina` | Poetry collections | 1 per poem |
| 3 | `gregory-dramatic` | Christus Patiens + Liturgica | By section |
| 4 | `gregory-miscellanea` | Testamentum + misc | By work |

### Translation Prompt: `grc-gregory`

Specialized prompt for Gregory's rhetorical style, preserving:
- Complex periodic sentences and antithesis
- Technical theological vocabulary (οὐσία, ὑπόστασις, ὁμοούσιος)
- Biblical quotations and allusions
- Paradox and apophatic language
- Invective rhetorical force

### Documentation

- `docs/gregory-nazianzus-workflow.md` — Full workflow plan
- `docs/gregory-greekdownloads-inventory.md` — PDF inventory
- `docs/gregory-multi-source-plan.md` — Source investigation report

### Progress Checklist

**Phase 1 (Orations):**
- [x] Source PDFs downloaded (63 files)
- [x] PDF extraction complete
- [x] Quality review passed (B+)
- [x] Seeding complete (45 chapters)
- [x] Translation complete (45/45)

**Phase 2 (Additional Works):**
- [ ] Epistulae processed
- [ ] Carmina processed
- [ ] Dramatic/Liturgical processed
- [ ] Miscellanea processed

---

## Active — Ruyi Jun Zhuan (如意君傳) Pipeline

| Agent ID | Task | Status |
|----------|------|--------|
| a60ba00 | Ruyi Jun Zhuan full pipeline (process + seed + translate) | **STALLED** (post-verification) |

**Text:** 如意君傳 (Ruyi Jun Zhuan / The Lord of Perfect Satisfaction)
**Author:** Possibly 徐昌齡 (Xu Changling) or Huang Xun (黃訓); Ming dynasty, c. 1524-1529
**Source:** zh.wikisource.org/zh-hant/如意君傳
**Genre:** literature (erotic novella)
**Content:** ~45 pages, Classical Chinese with some vernacular dialogue
**Historical Note:** Considered the first Chinese pornographic novel; influenced erotic fiction for 100+ years

**⚠️ CONTENT WARNING REQUIRED:**
When seeding is complete, the text description MUST include:
> **Content Note:** This text contains explicit sexual content. It is included for its historical and literary significance as a representative work of Ming dynasty erotic fiction.

**Prepared Description for seed-db.ts:**
```
A Ming dynasty erotic novella set in the Tang dynasty, chronicling Empress Wu Zetian's
rise to power alongside her romantic liaisons, particularly with the fictional Xue Aocao,
who receives the title 'Lord of Perfect Satisfaction' (如意君). Written predominantly in
Classical Chinese with vernacular dialogue, the text extensively quotes from historical
and philosophical works including the Records of the Grand Historian, the Mencius, and the
Classic of Poetry. Considered by some scholars as the first Chinese pornographic novel,
it profoundly influenced subsequent erotic fiction for over a century. **Content Note:**
This text contains explicit sexual content. It is included for its historical and literary
significance as a representative work of Ming dynasty erotic fiction.
```

**Pipeline Status:**
- Phase 1 (Verification): ✅ COMPLETE — agent found text on Wikisource; English translation exists (Charles Stone, 1995)
- Phase 2 (Processing): PENDING — agent stalled at 2026-02-05T01:23:28Z after WebSearch
- Phase 3 (Quality Review): PENDING
- Phase 4 (Seeding): PENDING — will need content warning in description
- Phase 5 (Translation): PENDING — use `zh-literary` prompt

**Agent Recovery:** If agent remains stalled, manually complete processing:
1. Use HTML at `/tmp/ruyi-raw.html` (already downloaded)
2. Create processing script to extract paragraphs
3. Seed with content warning description above

---

## Completed — Tamil Batch Pipeline (All Phases) ✓

| Agent ID | Task | Status |
|----------|------|--------|
| aeba3f7 | Tamil text verification (20 candidates) | **COMPLETE** ✓ 6 viable |
| a65c93f | Tamil text processing (6 texts) | **COMPLETE** ✓ 21 chapters |
| a410c9f | Tamil quality review | **COMPLETE** ✓ All Grade A (1 fix applied) |
| — | Tamil seeding (5 authors, 6 texts) | **COMPLETE** ✓ 21 chapters |
| a9f3425 | Tamil translation (Gemini) | **COMPLETE** ✓ 21/21 chapters |

**Texts:**
| Text | Chapters | Verses | Status |
|------|----------|--------|--------|
| nalavenba | 4 | 399 | ✓ |
| moovarul | 3 | 1,119 | ✓ |
| takka-yaaga-parani | 9 | 867 | ✓ |
| nanneri | 1 | 41 | ✓ |
| dandi-alankaram | 3 | 126 | ✓ |
| bharata-senapathiyam | 1 | 66 | ✓ |

**Total: 6 texts, 21 chapters, ~2,618 verses — ALL TRANSLATED**

**Notes:**
- Used Gemini 2.5 Flash (per user directive: Tamil uses Gemini)
- Texts are medieval/classical Tamil poetry (10th-18th century CE)
- Two works by Ottakoothar (12th century Chola court poet)
- 13 chapters newly translated, 8 chapters already done from prior session

---

## Completed — Latin Pipeline Batch 3 (All Phases) ✓

| Agent ID | Task | Status |
|----------|------|--------|
| a4aeda2 | Latin B3 verification (16 candidates) | **COMPLETE** ✓ 10 viable, 6 not viable |
| ab53cac | Latin B3 processing (9 small texts) | **COMPLETE** ✓ 25ch, 496 para |
| ae7e32e | Latin B3 processing (De vita 132ch) | **DEFERRED** — tri-lingual interleaving in 1886 edition |
| aeb8c84 | Latin B3 quality review | **COMPLETE** ✓ 8 Grade A, 1 Grade C (cleanup done) |
| — | Latin B3 seeding (7 authors, 9 texts) | **COMPLETE** ✓ 25 chapters |
| a08f383 | Latin B3 translation (9 texts) | **COMPLETE** ✓ 9ch newly translated, 16 already done |
| a5ce9c7 | Latin B3 description review | **COMPLETE** ✓ 7 descriptions improved |
| a27f16c | Analecta Laertiana reprocessing | **COMPLETE** ✓ 1ch → 5ch, retranslated |

**Texts in Latin Batch 3:**
| Text | Author | Chapters | Status |
|------|--------|----------|--------|
| de-generatione-stellarum | Grosseteste | 1 | ✓ |
| de-lunarium-montium | Borelli | 1 | ✓ |
| dianoia-astronomica | Sizzi | 1 | ✓ |
| de-quindecim-problematibus | Albertus Magnus | 15 | ✓ (already done B1) |
| de-quinque-essentiis | Al-Kindi | 1 | ✓ |
| expositiones-theologicae | Abelard | 3 | ✓ |
| epistola-apologetica | Roffeni | 1 | ✓ |
| de-motu-corporali-et-luce | Grosseteste | 1 | ✓ |
| de-phoenomenis-lunae | Lagalla | 2 | ✓ |
| analecta-laertiana | Nietzsche | 5 | ✓ (reprocessed from 1ch) |

**Deferred:** De vita et moribus philosophorum (pseudo-Burley) — 132 biographies in Knust 1886 edition interleave Latin/Spanish/German on every page, making OCR unusable. User will find cleaner source.

**Gap Check: 25/25 chapters translated (100%) — LATIN BATCH 3 COMPLETE**

---

## Completed — Latin Pipeline Batch 2 (All Phases) ✓

| Agent ID | Task | Status |
|----------|------|--------|
| a7d765b | Latin text verification (20 candidates) | **COMPLETE** ✓ 14 viable, 6 not viable |
| a8ae340 | Latin text processing (14 texts) | **COMPLETE** ✓ 1,013 para |
| — | Latin seeding (14 texts, 14 chapters) | **COMPLETE** ✓ |
| a0dc22e | Latin Batch 2 translation (14 texts) | **STOPPED** — quality issues found |
| a1fad77 | Latin Batch 2 quality review | **COMPLETE** ✓ 11 PASS, 2 cleanup, 1 defer |
| af5e0ae | Latin Batch 2 segmentation review | **COMPLETE** ✓ 5 must split, 3 optional |
| — | Latin cleanup (2 texts) + resegmentation (5 chronicles) | **COMPLETE** ✓ |
| — | Latin re-seeding (102 chapters across 14 texts) | **COMPLETE** ✓ |

**Translation Workers (Phase 7) — ALL COMPLETE:**
| Worker | Agent ID | Texts | Chapters | Status |
|--------|----------|-------|----------|--------|
| W1 | ab4aca6 | 8 single-ch texts | 8 | **COMPLETE** ✓ |
| W2 | a1f7cf7 | brevis-historia-regum-dacie | 21 | **COMPLETE** ✓ |
| W3 | a1684c1 | chronicon-neapolitanum + chronicon-beneventanum | 18 | **COMPLETE** ✓ |
| W4 | acd14c3 | chronicon-lusitanum + breve-chronicon-northmannicum | 11 | **COMPLETE** ✓ |

**Gap Check: 102/102 chapters translated (100%) — LATIN BATCH 2 COMPLETE**

## Completed — De' sorbetti Translation

| Agent ID | Task | Status |
|----------|------|--------|
| a33924a | De' sorbetti translation | **COMPLETE** ✓ |

---

## Completed — Russian Pipeline (All Phases) ✓

| Worker | Agent ID | Text | Chapters | Status |
|--------|----------|------|----------|--------|
| — | — | vizantizm-i-slavyanstvo | 12 | **COMPLETE** ✓ |
| W1 | a5fcfe0 | melochi-arkhiyereyskoy-zhizni | 17 | **COMPLETE** ✓ |
| W2 | a95e467 | okolo-tserkovnykh-sten | 50 | **COMPLETE** ✓ |
| W3 | ad8ddf4 | nauka-o-cheloveke | 15 | **COMPLETE** ✓ |
| W4 | a2d654e | puteshestviye-ko-svyatym-mestam | 69 | **COMPLETE** ✓ |
| W5 | a771736 | bogomater | 25 | **COMPLETE** ✓ |
| W6 | a2016dd | posledniye-dni-zemnoy-zhizni | 29 | **COMPLETE** ✓ |
| W7 | ac6804b | lektsii-po-istorii-drevney-tserkvi | 18 | **COMPLETE** ✓ |

**Gap Check: 235/235 chapters translated (100%) — RUSSIAN PIPELINE COMPLETE**
**Prompt:** `ru` (19th-century Russian prose)

---

## Completed This Session (42)

| Agent/Worker | Task | Notes |
|--------------|------|-------|
| ad5cd3c | Modern Greek translation (3 texts) | 15ch, ~1,147 para, 0 errors ✓ |
| a7c5d41 | Byzantine Greek translation (4 texts) | 5ch, ~1,270 para, 0 errors ✓ |
| ad078e5 | Russian verification (25 texts) | 9 viable, 16 not viable ✓ |
| a8db89b | Russian Processor A (Wikisource, 4 texts) | 148ch, 3,817 para ✓ |
| a3531a2 | Russian Processor B (azbyka.ru, 4 texts) | 87ch, 7,085 para ✓ |
| a68f64c | Russian quality review (8 texts) | 5 pass, 3 need fixes ✓ |
| a989eaa | Russian quality fixes (3 texts) | All fixed ✓ |
| — | Russian seeding (8 texts) | 235ch seeded, IDs 167-174 ✓ |
| — | Russian translation prompt (`ru`) | Added to prompts.ts ✓ |
| W1-W7 | Russian translation (7 workers) | 235/235 chapters, 0 errors ✓ |
| W1-W4 | Latin Batch 2 translation (4 workers) | 102/102 chapters, 0 errors ✓ |
| a33924a | De' sorbetti translation | 1 text complete ✓ |

---

## Completed Previous Session (41)

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
- **12 texts, 255/255 chapters translated**
- ~~Mikołaja Doświadczyńskiego przypadki~~ — STOPPED (English translation already exists)
- **Pan Walery** — ✅ COMPLETE (24ch, 573 para, Grade A) — scrape, process, review, translate
- **Session 45 Addition:** Full pipeline agent (a224be3) completed successfully

### Armenian Pipeline — COMPLETE ✓
- **1 text (Payqar), 18/18 chapters translated**

### Italian Pipeline — ~92% COMPLETE (Phase 6: Translation)
- **7 texts, 147 chapters total** (de-sorbetti abandoned)
- **Translation:** ~135/147 done. W2 and W3a finishing final chapters.
- confessioni: 61/64, del-rinnovamento: 15/27, dio-ne-scampi: 25/25, la-filosofia: 18/20 (2 empty), la-psicologia: 5/5, psicologia-delle-menti: 5/5, saggio: 1/1

### Latin Pipeline (Batch 1) — COMPLETE ✓
- **2 clean texts translated:** Phosphori (1ch), De Quindecim (15ch)
- **2 OCR texts deferred:** Turris Babel (56ch), Mundus (198ch) — need cleaning pipeline

### Latin Pipeline (Batch 2) — COMPLETE ✓
- **14 texts, 102/102 chapters translated**
- **1 deferred:** brevis-historia-regum-dacie (severe contamination)

### Latin Pipeline (Batch 3) — COMPLETE ✓
- **9 texts, 25/25 chapters translated**
- **1 deferred:** De vita et moribus philosophorum (tri-lingual OCR issue)
- **Texts:** Grosseteste (2), Borelli, Sizzi, Al-Kindi, Abelard (3ch), Roffeni, Lagalla (2ch), Nietzsche (5ch)
- **Analecta Laertiana reprocessed:** 1 chapter → 5 chapters (proper Nietzsche section boundaries)

### Russian Pipeline — COMPLETE ✓
- **8 texts, 235/235 chapters translated**

### Greek Pipeline — COMPLETE ✓
- **10 texts translated:** 7 Byzantine + 3 modern Greek
- George of Pisidia texts inaccessible (PG 92 not digitized)

### Czech Pipeline — COMPLETE ✓
- **1 text** (Nový epochální výlet pana Broučka, 14ch) — translated

### Telugu Pipeline — COMPLETE ✓
- **1 text** (Sri Kalahasteeswara Satakam, 116 verses in 1 chapter) — translated

### Tamil Pipeline (New Batch) — COMPLETE ✓
- **6 texts, 21/21 chapters translated** via Gemini 2.5 Flash
- Nalavenba (4ch), Moovarul (3ch), Takka Yaaga Parani (9ch), Nanneri (1ch), Dandi Alankaram (3ch), Bharata Senapathiyam (1ch)
- Previous 5 Tamil texts already complete (Porunararruppadai, Nandikkalambakam, etc.)

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
