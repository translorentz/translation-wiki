# Active Agents & Background Workers

Track all running agents and background workers here. Update when launching or completing agents.

**Last updated:** 2026-04-11

---

## Spanish Translation Rollout (Phase 1 in progress)

**Plan:** /Users/bryancheong/.claude/plans/snappy-tumbling-shamir.md
**Pipeline doc:** docs/spanish-translation-pipeline.md
**Started:** 2026-04-11
**Status:** Phase 0 COMPLETE (deploy SHA e099656). Phase 1 Pilot launched.

| Agent ID | Phase | Scope | Status | Started | Completed |
|----------|-------|-------|--------|---------|-----------|
| a936d250befc313de | 0.1 | Schema addition (es columns) | COMPLETE | 2026-04-11 | 2026-04-11 |
| adda40f9c5d28a915 | 0.4 | Dictionary es.ts (288 keys, Neutro) | COMPLETE | 2026-04-11 | 2026-04-11 |
| a8350f5a9653bbf70 | 0.5+0.7 | Prompt scaffolding + translate-batch ES routing | COMPLETE | 2026-04-11 | 2026-04-11 |
| a07239c3bfbc56a5c | 0.6 | 15 specialist Spanish prompts | COMPLETE | 2026-04-11 | 2026-04-11 |
| aae47d3d9031a008c | 0.2+0.3 | UI infra + locale branches | COMPLETE | 2026-04-11 | 2026-04-11 |
| aaea427deabed5313 | 0.8 | Verification gates + batched push | COMPLETE | 2026-04-11 | 2026-04-11 |
| a2e8a2a367d5c7f05 | 1 | Pilot 22 representative texts (sequential) | COMPLETE | 2026-04-11 | 2026-04-11 |
| a2fee2cae20f1b50c | 2 | Survey + Wave 2D Romance (fr/it/pt/ro) | RUNNING | 2026-04-11 | - |
| a2fee2cae20f1b50c-W1 | 2D | Wave 2D worker W1 (30 texts, 2260 ch) | LAUNCHED | 2026-04-11 | - |
| a2fee2cae20f1b50c-W2 | 2D | Wave 2D worker W2 (32 texts, 1462 ch) | LAUNCHED | 2026-04-11 | - |
| a2fee2cae20f1b50c-W3 | 2D | Wave 2D worker W3 (33 texts, 480 ch) | LAUNCHED | 2026-04-11 | - |
| a2fee2cae20f1b50c-W4 | 2D | Wave 2D worker W4 (34 texts, 545 ch) | LAUNCHED | 2026-04-11 | - |
| a2fee2cae20f1b50c-W5 | 2D | Wave 2D worker W5 (33 texts, 650 ch) | LAUNCHED | 2026-04-11 | - |

### Wave 2D survey & launch (agent a2fee2cae20f1b50c) — 2026-04-11
- **Corpus survey:** 34,805 chapters across 1,077 texts need ES translation (see `docs/es-corpus-survey.md`).
- **Wave 2D scope:** 162 Romance texts, **5,397 chapters**, 115,575 paragraphs (~5× plan estimate).
- **Partition:** LPT-balanced across 5 workers at ~23,114 paragraphs each (`/tmp/es-wave-2d-partition.json`).
- **Expected cost:** ~$22 (5,397 × $0.004). Well under $300 budget.
- **Expected runtime:** ~8–11 hours per worker; workers run in parallel via run_in_background.

**Phase 1 (agent a2e8a2a367d5c7f05) COMPLETE** — 2026-04-11
- **Result:** 22/22 pilots passed after 2 prompt-edit self-recovery iterations.
- **Scope:** 22 chapters across 22 source-language prompt keys (fa, chg, zh-literary, zh-shiji, zh, grc, grc-philosophy, la, la-hymn, fr-literary, it-literary-19c, ru-literary, en-philosophy, en-philosophy-18c, en-victorian, ar, pl, sr, de, hu, ta, hy).
- **Iteration 1 (quote normalization):** Shahnameh ch389 straight quotes + slash rate failure; zhongshan-lang-zhuan ch1 straight quotes around weapon name. Fix: strengthened SPANISH_HEADER_MX/_NEUTRO quote rules, added deterministic `normalizeQuotes()` in translate-batch.ts Spanish branch, strengthened `SPANISH_TARGET_BY_SOURCE["fa"]` dialogue-in-couplet rule, refined audit slash rule to per-paragraph preservation.
- **Iteration 2 (verse line preservation in universal):** Hungarian uj-versek ch0 and Tamil porunararruppadai ch1 failed LINEBREAK (Tamil catastrophically: 15 lines → 1 line). Fix: added `PRESERVACIÓN DE LÍNEAS DE VERSO` block to SPANISH_TARGET_INSTRUCTIONS_MX and SPANISH_TARGET_INSTRUCTIONS_NEUTRO.
- **Scripts created:** `scripts/_pilot-select-es.ts`, `scripts/_audit-spanish-pilot.ts`, `scripts/_audit-all-es-pilots.ts`, `scripts/_run-es-pilot.sh`
- **Audit thresholds (all met for 22/22):** 0 em-dash dialogue, 0 guillemets, 0 Japanese brackets, 0 straight quotes (non-apostrophe), ≥95% hemistich slash preservation, exact poetry line count, exact paragraph count, length ratio within `MIN_LENGTH_RATIO_ES[sourceLanguage]` band.
- **Halt-to-User triggers fired:** 0
- **Cost:** ~$0.10 (well under $10 pilot budget)
- **Commit:** TBD (batched with iteration fixes)
- **Report:** docs/es-phase-1-report.md
- **Next:** Phase 2 wave-based mass translation

**Phase 0.5+0.7 (agent a8350f5a9653bbf70) COMPLETE** — 2026-04-11
- Commit 52ffa1c (local, unpushed — will batch with Phase 0.2 Locale union update)
- Files: src/server/translation/prompts.ts (+222/-14), scripts/translate-batch.ts (+127/-9), scripts/_test-es-dispatcher.ts (new, 188 lines)
- Dispatcher smoke test: 5/5 PASS (fa→es MX, en→es NEUTRO, zh→es NEUTRO, it→es MX, ES→ES throw)
- tsc --noEmit: exit 0; pnpm build: exit 0
- Report: docs/es-phase-0.5-0.7-report.md
- Next: Phase 0.6 (specialist prompts — separate agent) and Phase 0.2/0.3 (UI locale wiring)

**Phase 0.2+0.3 (agent aae47d3d9031a008c) COMPLETE** — 2026-04-11
- Commit fbdba92 (local, unpushed — will batch with Phase 0.5+0.7 + Phase 0.6 for Phase 0.8 verification push)
- Files edited: src/i18n/shared.ts, src/i18n/index.ts, src/i18n/server.ts, src/middleware.ts, src/app/layout.tsx, src/components/navigation/LanguageSwitcher.tsx, src/lib/utils.ts, src/app/page.tsx, src/app/(wiki)/texts/page.tsx, src/app/(wiki)/[lang]/[author]/[text]/page.tsx, src/components/home/FeaturedTexts.tsx, src/components/navigation/CategoryBrowser.tsx, src/components/discussion/ThreadView.tsx, src/components/discussion/ThreadList.tsx, src/components/history/HistoryViewer.tsx, src/components/home/HighlightCards.tsx, scripts/_smoke-test-es-ui.ts (new)
- hasEsTranslation wiring: no tRPC router changes required. The existing getTextIdsWithTranslation procedure takes targetLanguage as a free string; page.tsx + texts/page.tsx fetch "es" text IDs in parallel to "zh"/"hi". UI-layer flag, same pattern as hasZhTranslation.
- HIGHLIGHTS_ES: stubbed as `const HIGHLIGHTS_ES: Highlight[] = HIGHLIGHTS_EN` with comment noting Phase 5 will populate.
- tsc --noEmit: exit 0; pnpm build: exit 0
- Smoke test (scripts/_smoke-test-es-ui.ts): 4/4 PASS. /es → 200 + `<html lang="es"` + "Explorar" dictionary string + `hreflang="es"` alt link. /cn → 200 + lang=zh-Hans. / → 200 + lang=en. /hi → 307 redirect (Hindi delinked).
- Note: smoke test must run on port 3000 (Next 16 Turbopack middleware rewrite proxies through port 3000 regardless of dev port — not a correctness issue).
- Report: docs/es-phase-0.2-0.3-report.md
- Next: Phase 0.6 specialist prompts (agent a07239c3bfbc56a5c — COMPLETE), then Phase 0.8 verification + batched push.

**Phase 0.6 (agent a07239c3bfbc56a5c) COMPLETE** — 2026-04-11
- 15 specialist Spanish prompts populated in `SPANISH_TARGET_BY_SOURCE`:
  - Mandatory (7): fa, chg, chg-babur, fa-prose, zh-literary, la, grc
  - Tier 1 (8): zh-shiji, fr-literary, it-literary-19c, ru-literary, en-philosophy, en-philosophy-18c, en-victorian, grc-philosophy
- Persian/Chagatai prompts (fa, chg, chg-babur) include explicit hemistich `/` rule with catastrophe-framing per the Persian Hemistich Catastrophe lesson (slash counts: 18, 16, 10 occurrences).
- Latin (la) includes verse line preservation rule (PRESERVACIÓN DE LÍNEAS DE VERSO).
- French/Italian/Russian literary prompts include explicit em-dash → curly conversion rules.
- Universal Dialogue Punctuation Rule restated in every prompt body.
- Files: src/server/translation/prompts.ts (+874 lines, specialists at lines 6996–7929), scripts/_test-es-specialists.ts (new, ~350 lines)
- Specialist test (`scripts/_test-es-specialists.ts`): **19/19 PASS** (15 specialist coverage + 3 hemistich deep checks + 1 Latin verse deep check)
- Dispatcher test (`scripts/_test-es-dispatcher.ts`): 5/5 PASS (regression check)
- tsc --noEmit: exit 0; pnpm build: exit 0
- Commit e099656 (local, unpushed — will batch with Phase 0.8 verification push)
- Report: docs/es-phase-0.6-report.md

### Phase 0.8 (agent aaea427deabed5313) COMPLETE — 2026-04-11
- All 5 verification gates GREEN:
  - Gate 1 `pnpm tsc --noEmit` → exit 0
  - Gate 2 `pnpm build` → exit 0 (Next.js 16.1.4, 14/14 static pages)
  - Gate 3 `_test-es-dispatcher.ts` → 5/5 PASS
  - Gate 4 `_test-es-specialists.ts` → 19/19 PASS
  - Gate 5 `_smoke-test-es-ui.ts` → 4/4 PASS (localhost)
- 3 commits pushed to origin/main (52ffa1c, fbdba92, e099656). 64a77b4 and b3d9f76 were already on origin before this session.
- Vercel deploy 4336937959 succeeded for SHA e099656 (2026-04-11T11:44:17Z).
- Production smoke test `_smoke-test-es-prod.ts`: 4/4 PASS against https://deltoi.com (/es 200 lang+spanish+hreflang, /cn 200 zh-Hans, / 200 en, /hi 307→/).
- Report: docs/es-phase-0.8-report.md
- Phase 0 summary: docs/es-phase-0-summary.md

### Unpushed commits
None. All Phase 0 commits pushed to origin/main.

---

## Active

### Whewell — History of the Inductive Sciences (1837/1857) — Full Pipeline (COMPLETE)
- **Text:** whewell-inductive-sciences (William Whewell, "History of the Inductive Sciences, from the Earliest to the Present Time", 1837, 3rd ed. 1857)
- **Source:** English (Project Gutenberg #68693, NY: Appleton 1875 reprint of London 3rd ed.)
- **Target:** zh ONLY (English source — never translated EN→EN)
- **Author:** william-whewell (id 591, name_zh 威廉·休厄尔, 1794–1866) — NEW author
- **Text id:** 1217
- **Chapters:** 156 (18 books across Vol I body + Vol I additions + Vol II body + Vol II additions), 2,888 paragraphs, ~2.55 MB English source
- **Prompt:** en-science (NEW — added for 19c history of science / Whewell, with full Greek/Latin/scientist name table and Whewellian terminology)
- **Model:** deepseek-chat
- **Workers (all completed):** test bv89lv82s + W1 bvmuxt2v3 + W2 b4a9o670e + W3 b3f9s3rkm + W4 blu0w4p2p + W5 be8dcb6vk + W6 bj6tm6ccd
- **ZH metadata:** title_zh 归纳科学史, description_zh set, all 156 chapter title_zh set
- **Quote audit:** clean (0 Japanese brackets, 0 guillemets, 140/156 chapters use curly "" — em-dashes only used as parenthetical insertions, never as dialogue markers, per the en-science prompt)
- **Paragraph alignment:** 0 mismatches across all 156 chapters
- **Pipeline doc:** docs/whewell-inductive-sciences-pipeline.md
- **Status:** COMPLETE

### Bradley — Appearance and Reality (1893) — ZH Translation (RUNNING)
- **Text:** appearance-and-reality (F.H. Bradley, "Appearance and Reality: A Metaphysical Essay", 1893)
- **Source:** English Wikisource, 35 subpages (Preface, Pref 2nd, Intro, Ch I–XXVII, Appendix Intro/Note A/B/C/Explanatory)
- **Target:** zh ONLY (English source — no EN translation)
- **Background ID:** byls62yvn
- **Author:** fh-bradley (id 590, name_zh 布拉德利)
- **Text id:** 1216
- **Chapters:** 35, 999 paragraphs
- **Prompt:** en-philosophy (British Idealist)
- **Model:** deepseek-chat
- **Log:** /tmp/bradley-logs/zh-full.log
- **Status:** RUNNING

### Bosanquet — Philosophical Theory of the State (1899) — Full Pipeline (COMPLETE)
- **Text:** philosophical-theory-of-state (Bernard Bosanquet, "The Philosophical Theory of the State", 1899)
- **Source:** English (Project Gutenberg #63249), genre philosophy
- **Target:** zh ONLY (English source — no EN translation)
- **Author:** bernard-bosanquet (id 589, name_zh 伯纳德·鲍桑葵, era 1848-1923) — NEW author
- **Text id:** 1215
- **Chapters:** 12 (Preface + 11), 529 paragraphs — ALL TRANSLATED, paragraph counts perfectly aligned
- **Prompt:** en-philosophy (NEW specialist prompt added to prompts.ts for British Idealist political philosophy)
- **Model:** deepseek-chat
- **Workers:** bbjbwmzuu (main 0-11), b2y0zdk2f (parallel 7-9), bup1z9cf3 (parallel 10-11)
- **ZH metadata:** title_zh 关于国家的哲学理论, description_zh set, all 12 chapter title_zh set
- **Quote audit:** clean (0 issues — no Japanese brackets, no guillemets, no em-dash dialogue)
- **Pipeline doc:** docs/philosophical-theory-of-state-pipeline.md
- **Status:** COMPLETE

### Hutcheson Inquiry — Full Pipeline (COMPLETE)
- **Text:** hutcheson-inquiry (Francis Hutcheson, "An Inquiry into the Original of Our Ideas of Beauty and Virtue", 1725)
- **Author:** francis-hutcheson (id 588, name_zh 弗朗西斯·哈奇森)
- **Text id:** 1214
- **Source:** gutenberg.ca HTML, English
- **Target:** zh ONLY (English source — no EN translation)
- **Chapters:** 17 (Preface + Treatise I §I–VIII + Treatise II Intro + §I–VII)
- **Prompt:** en-philosophy-18c (newly added — Hutcheson terminology, "" dialogue rule)
- **Model:** deepseek-chat
- **Status:** COMPLETE — all 17 chapters seeded + ZH translated, all chapter title_zh set, title_zh + description_zh set, quote audit clean (0 issues), paragraph alignment verified for every chapter
- **Doc:** docs/hutcheson-inquiry-pipeline.md
- **Background ID (closed):** bt2p0o2hc

---

## No Active Workers — All Complete

### Session 164 Summary

**12 Persian poets** scraped from Ganjoor, processed, seeded, translated EN+ZH (~1,150 chapters, ~102K couplets)
**2 Elias commentaries** from First1KGreek XML, processed, seeded, translated EN+ZH (53 chapters)
**Gevorg Marzpetuni** Armenian novel, 30 chapters EN+ZH
**Masalek al-Mohsenin** Persian reform prose, 6 chapters EN+ZH
**Misli** Serbian aphorisms, 10 chapters EN+ZH
**Prinzipien** German philosophy, 7 chapters EN+ZH
**Variétés canadiennes** French collection, 33 chapters EN+ZH

Plus: Chagatai source fix (v4), quote fixes (Hungarian, Turkish, Persian rhyming), metadata fixes (1,173 title_zh, 137 English titles, author eras), Elias OCR fixes, embedded newline healing.

### Deferred
- Babur retranslation with specialist prompt
- 6 Chagatai chapters that failed v4 guardrails
- Delete Gemini API key from .env.local
- Gevorg Marzpetuni ZH metadata

---

## Previous: 4 Persian Divans — Seeding + Translation

### Seeded (ALL COMPLETE)
- **Asjadi Marvazi** — asjadi-divan (1 ch, 300 couplets)
- **Khwaju Kirmani** — khwaju-kirmani-divan (148 ch)
- **Vahshi Bafqi** — vahshi-bafqi-divan (48 ch)
- **Bidel Dehlavi** — bidel-dehlavi-divan (324 ch)
- Seed script: scripts/seed-4-persian-divans.ts

### Translation Workers (ALL RUNNING — deepseek-chat)

**Asjadi (1 ch):**
- EN: PID 33349 (ch 1), log: /tmp/asjadi-en.log
- ZH: PID 33359 (ch 1), log: /tmp/asjadi-zh.log

**Vahshi Bafqi (48 ch):**
- EN: PID 33370 (ch 1-48), log: /tmp/vahshi-en.log
- ZH: PID 33380 (ch 1-48), log: /tmp/vahshi-zh.log

**Khwaju Kirmani (148 ch):**
- EN-W1: PID 33391 (ch 1-50), log: /tmp/khwaju-en-w1.log
- EN-W2: PID 33404 (ch 51-100), log: /tmp/khwaju-en-w2.log
- EN-W3: PID 33413 (ch 101-148), log: /tmp/khwaju-en-w3.log
- ZH-W1: PID 33422 (ch 1-50), log: /tmp/khwaju-zh-w1.log
- ZH-W2: PID 33431 (ch 51-100), log: /tmp/khwaju-zh-w2.log
- ZH-W3: PID 33441 (ch 101-148), log: /tmp/khwaju-zh-w3.log

**Bidel Dehlavi (324 ch):**
- EN-W1: PID 33451 (ch 1-80), log: /tmp/bidel-en-w1.log
- EN-W2: PID 33461 (ch 81-160), log: /tmp/bidel-en-w2.log
- EN-W3: PID 33470 (ch 161-240), log: /tmp/bidel-en-w3.log
- EN-W4: PID 33479 (ch 241-324), log: /tmp/bidel-en-w4.log
- ZH-W1: PID 33491 (ch 1-80), log: /tmp/bidel-zh-w1.log
- ZH-W2: PID 33501 (ch 81-160), log: /tmp/bidel-zh-w2.log
- ZH-W3: PID 33510 (ch 161-240), log: /tmp/bidel-zh-w3.log
- ZH-W4: PID 33519 (ch 241-324), log: /tmp/bidel-zh-w4.log

---

## Session 164 — Awhadi Maraghai Divan Pipeline

### Awhadi Divan: EN+ZH TRANSLATION RUNNING
- Task: Scrape, process, verify, seed, translate Awhadi Maraghai's Divan from Ganjoor
- Scrape/Process/Seed: COMPLETE (320 chapters, 14,645 couplets, 100% slash rate, grade A-)
- Author: awhadi-maraghai (ID 582), Text: awhadi-divan (ID 1208)
- Sections: Jam-e Jam (ch 1-131), Divan/Ghazals (ch 132-340 → renumbered 132-243), Manteq al-Oshagh (ch 244-320)
- **EN Workers:**
  - EN-W1: PID 31334 (ch 1-80)
  - EN-W2: PID 31345 (ch 81-160)
  - EN-W3: PID 31356 (ch 161-240)
  - EN-W4: PID 31367 (ch 241-320)
- **ZH Workers:**
  - ZH-W1: PID 31378 (ch 1-80)
  - ZH-W2: PID 31390 (ch 81-160)
  - ZH-W3: PID 31400 (ch 161-240)
  - ZH-W4: PID 31413 (ch 241-320)
- Model: deepseek-chat
- Docs: docs/awhadi-divan-pipeline.md

---

## Session 166 — Shah Nematollah Vali Divan Pipeline

### Shah Nematollah Divan: EN+ZH TRANSLATION RUNNING
- Task: Scrape, process, verify, seed, translate Shah Nematollah Vali's Divan from Ganjoor
- Scrape/Process/Seed: COMPLETE (40 chapters, 14,924 couplets, 100% slash rate, grade A)
- Author: shah-nematollah-vali (ID 581), Text: shah-nematollah-divan (ID 1207)
- **EN Workers:**
  - EN-W1: b3da1qa9e (ch 1-20)
  - EN-W2: bq4gfn1uy (ch 21-40)
- **ZH Workers:**
  - ZH-W1: bdp4zjvm6 (ch 1-20)
  - ZH-W2: buns0i55y (ch 21-40)
- Model: deepseek-chat
- Docs: docs/shah-nematollah-divan-pipeline.md

---

## Session 165 — Salman Saveji Divan Pipeline

### Salman Saveji Divan: EN+ZH TRANSLATION RUNNING
- Task: Scrape, process, verify, seed, translate Salman Saveji's Divan from Ganjoor
- Scrape/Process/Seed: COMPLETE (21 chapters, 771 poems, 8988 couplets, 100% slash rate, grade A-)
- Author: salman-saveji, Text: salman-saveji-divan (ID 1205)
- **EN Workers:**
  - EN-W1: bif0v11wn (ch 1-11)
  - EN-W2: bkb7kvve0 (ch 12-21)
- **ZH Workers:**
  - ZH-W1: b72sdcqtx (ch 1-11)
  - ZH-W2: burh2bww5 (ch 12-21)
- Model: deepseek-chat
- Docs: docs/salman-saveji-divan-pipeline.md

---

## Session 164 — Baba Taher Divan Pipeline

### Baba Taher Divan: COMPLETE
- Task: Scrape, process, verify, seed, translate Baba Taher's Divan (do-beytis)
- Scrape/Process/Seed: COMPLETE (19 chapters, 732 couplets, 100% slash rate, grade A)
- Author: baba-taher (ID 579), Text: babataher-divan (ID 1204)
- EN: 19/19 COMPLETE (100% slash rate)
- ZH: 19/19 COMPLETE (99.6% slash rate)
- Docs: docs/babataher-divan-pipeline.md

---

## Session 164 — Obayd Zakani Divan Pipeline

### Obayd Zakani Divan: COMPLETE
- Task: Scrape, process, verify, seed, translate Obayd Zakani's Divan from Ganjoor
- Scrape/Process/Seed: COMPLETE (18 chapters, 2073 couplets, 100% slash rate, grade A)
- Author: obayd-zakani (ID 578), Text: obayd-zakani-divan (ID 1203)
- EN: 18/18 COMPLETE (100% slash rate)
- ZH: 18/18 COMPLETE (100% slash rate)
- Paragraph alignment: 0 mismatches
- Model: deepseek-chat
- Docs: docs/obayd-zakani-divan-pipeline.md

---

## Session 164 — Jami Haft Awrang Pipeline

### Jami Yusuf va Zulaikha + Layli va Majnun: EN+ZH TRANSLATION RUNNING
- Task: Scrape, process, verify, seed, translate two masnavis from Jami's Haft Awrang
- Scrape/Process/Seed: COMPLETE
  - Author: jami (ID 577)
  - yusuf-va-zulaikha (ID 1201, 75 chapters, 4032 couplets)
  - layli-va-majnun-jami (ID 1202, 58 chapters, 3860 couplets)
- **EN Workers:**
  - EN-YZ-W1: b26l5su2n (ch 1-25)
  - EN-YZ-W2: bi62inxr3 (ch 26-50)
  - EN-YZ-W3: bkgdl14v8 (ch 51-75)
  - EN-LM-W1: bjxgxb13o (ch 1-29)
  - EN-LM-W2: bi4v4tpi6 (ch 30-58)
- **ZH Workers:**
  - ZH-YZ-W1: bhpejojqj (ch 1-25)
  - ZH-YZ-W2: bi89eeuwy (ch 26-50)
  - ZH-YZ-W3: by3ninbdt (ch 51-75)
  - ZH-LM-W1: bn53io07b (ch 1-29)
  - ZH-LM-W2: b7xnlbzby (ch 30-58)
- Model: deepseek-chat
- Docs: docs/jami-haft-awrang-pipeline.md

---

## Session 164 — Baba Taher Divan Pipeline

### Baba Taher Divan: EN+ZH TRANSLATION RUNNING
- Task: Scrape, process, verify, seed, translate Baba Taher's Divan (do-beytis)
- Scrape/Process/Seed: COMPLETE (19 chapters, 732 couplets, 100% slash rate, grade A)
- Author: baba-taher (ID 579), Text: babataher-divan (ID 1204)
- EN worker: b2r7ubyd9 (translate-batch.ts --text babataher-divan)
- ZH worker: bxw2a2us5 (translate-batch.ts --text babataher-divan --target-language zh)
- Model: deepseek-chat
- Docs: docs/babataher-divan-pipeline.md

---

## Session 164 — Awhadi Maraghai + Kisai Marvazi Pipelines

### Awhadi Divan Pipeline Agent: RUNNING
- Task: Scrape Ganjoor, process, verify, seed, translate Awhadi Maraghai's Divan (Jam-e Jam + Ghazals)
- Launched: 2026-04-05
- Agent ID: TBD (subagent)

### Kisai Divan Pipeline: EN+ZH TRANSLATION RUNNING
- Task: Scrape, process, verify, seed, translate Kisai Marvazi's Divan
- Scrape/Process/Seed: COMPLETE (55 chapters, 227 couplets, 100% slash rate, grade A-)
- Author: kisai-marvazi (ID 576), Text: kisai-divan (ID 1199)
- EN worker: b3dzjt5q3 (translate-batch.ts --text kisai-divan)
- ZH worker: bspmix8do (translate-batch.ts --text kisai-divan --target-language zh)
- Model: deepseek-chat
- Docs: docs/kisai-divan-pipeline.md

---

## Session 163 — No Active Workers

### Gevorg Marzpetuni: COMPLETE
- 30/30 EN + 30/30 ZH translated
- Phase 8 quote fix applied (49/60 chapters fixed)
- Pending: ZH metadata (title_zh, description_zh, chapter title_zh)

### Hungarian Quote Fix: COMPLETE
- 15 texts, 451/658 chapters fixed, 13,764 paragraphs corrected

### Chagatai Source Fix: COMPLETE
- babur-divan: 106/113 corrected (v4 guardrails), 2 human-skipped, 5 failed (kept original)
- risale-validiyye: 2/5 corrected, 2 failed (kept original)
- ch107 retranslated via Gemini (faithful, unrhymed)

### Deferred
- Babur retranslation with specialist chg-babur prompt
- 6 Chagatai chapters that failed v4 guardrails
- Delete Gemini API key from .env.local
- Gevorg Marzpetuni ZH metadata

---

## Session 162 — Varietes canadiennes Pipeline

### CANCELLED: Old Translation Workers (corrupted source, pre-fix)

Previous workers on 32-chapter corrupted source have been superseded.

| Worker | Task | Status |
|--------|------|--------|
| EN W1 (b249yq9hv) | EN ch 1-16 (old) | CANCELLED — source was C+ quality |
| EN W2 (bnhk079mk) | EN ch 17-32 (old) | CANCELLED — source was C+ quality |
| ZH W1 (beoed3o0r) | ZH ch 1-16 (old) | CANCELLED — source was C+ quality |
| ZH W2 (bj2w0nuzx) | ZH ch 17-32 (old) | CANCELLED — source was C+ quality |

### RUNNING: Varietes canadiennes Translation Workers (reseeded, 33 chapters)

| Worker | Task | Chapters | Status |
|--------|------|----------|--------|
| EN W1 (b1t7qfuty) | EN translation ch 1-17 | 1-17 | RUNNING |
| EN W2 (bzhp2d0pd) | EN translation ch 18-33 | 18-33 | RUNNING |
| ZH W1 (btbbsocrm) | ZH translation ch 1-17 | 1-17 | RUNNING |
| ZH W2 (bgd9luegb) | ZH translation ch 18-33 | 18-33 | RUNNING |

**Text:** varietes-canadiennes (id=1190), 33 chapters (reseeded after C+ fix), fr-literary prompt
**Fix applied:** Missing ch IX extracted from ch VIII, 3 spillovers fixed, 5 OCR artifacts removed, 4 broken splits merged.
**entre-deux-quadrilles:** Separate work by same author — NOT in this book. Remains as standalone text.

---

## Session 161 — Summary

### All Texts COMPLETE

| Text | Chapters | EN | ZH | Notes |
|------|----------|----|----|-------|
| Kitab al-Mawaqif | 320 | COMPLETE | COMPLETE | Quote fix (412 ch) |
| Masail Ibn Rushd | 342 | COMPLETE | COMPLETE | Spillover fix + quote fix + renumber |
| Natural Theology (Paley) | 27 | source | COMPLETE | English source |
| Analogy of Religion (Butler) | 21 | source | COMPLETE | English source |
| Emotions and the Will (Bain) | 29 | source | COMPLETE | English source, cleaned B+→A- |
| Claude Paysan (Choquette) | 55 | COMPLETE | COMPLETE | |
| Charles Guérin (Chauveau) | 35 | COMPLETE | COMPLETE | OCR cleaned B+→A- |
| Exoristos 1831 (Soutsos) | 12 | COMPLETE | COMPLETE | Modern Greek novel |
| 肘後備急方 (Ge Hong) | 9 | COMPLETE | — | Chinese source |
| 四聖心源 (Huang Yuanyu) | 11 | COMPLETE | — | Chinese source |
| Andreas Erets (Muratsan) | 22 | COMPLETE | COMPLETE | Armenian novel |
| Misli (Knežević) | 10 | COMPLETE | COMPLETE | Serbian aphorisms, OCR'd |
| Prinzipien (Petronijević) | 7 | COMPLETE | COMPLETE | German philosophy, OCR |
| Risale Validiyye | 5 | COMPLETE | COMPLETE | Chagatai |
| 抱朴子 Baopuzi (Ge Hong) | 73 | COMPLETE | — | Chinese source |
| 神仙傳 Shenxian Zhuan (Ge Hong) | 10 | COMPLETE | — | Chinese source |
| Variétés canadiennes (Larose) | 33 | COMPLETE | COMPLETE | Fixed C+→A- |
| 39 Tome I Quebec Contes | ~57 | COMPLETE | COMPLETE | 27 authors |
| 20 Tome II Quebec Stories | ~29 | COMPLETE | COMPLETE | 13 authors |
| 2 Tome III Quebec Stories | 5 | COMPLETE | COMPLETE | de Montreuil + de Haerne only |

**Total new: ~160+ texts, ~1,600+ chapters this session**

### Major Fixes Applied
- Em-dash dialogue → quotation marks: 666 chapters (French + Greek)
- Quotation mark audit: 571 chapters (Japanese brackets, straight quotes, single-as-primary)
- Arabic quote marks: 412 chapters (Kitab + Ibn Rushd)
- Ibn Rushd spillover: 126 chapters realigned
- French title format: 42 texts corrected
- Chinese titles: 64 texts + 54 authors

### No Active Workers — Session Closing

### Chagatai Source Fix (v4 guardrails)
- babur-divan: 106/113 corrected, 2 human-skipped (ch12,15), 5 failed guardrails (ch32,110,111,113 + crash at ch90 resumed)
- risale-validiyye: 2/5 corrected, 2 failed guardrails (ch3,ch4), 1 unchanged
- Incident: v1-v3 scripts corrupted ch14 (asterisks) and ch25 (truncation). ALL restored from originals.
- Report: docs/chagatai-gemini-corruption-incident.md

### Deferred
- Babur retranslation with specialist chg-babur prompt (existing translations serviceable)
- 6 chapters that failed v4 guardrails need manual or smaller-batch approach
- Delete Gemini API key from .env.local
- entre-deux-quadrilles confirmed as separate standalone text, NOT in Variétés canadiennes

---

## Unpushed Commits
- 4e30345: feat: Add Vercel Analytics and Speed Insights (PUSHED)
- All other changes are DB-only (translations, metadata, fixes) — no code commits pending

---

## Audits Completed (Not Processed)
- Contes-Quebec-2.pdf: 18 stories, 13 authors, Grade A- (docs/contes-quebec-2-audit.md)
- Contes-Quebec-3.pdf: 34 stories, only de Montreuil + de Haerne valid (docs/contes-quebec-3-audit.md)
- Khavarannama (ganjoor): NOT VIABLE — 79/22,500 couplets (docs/khavarannama-audit.md)
- Exoristos PDF: Image-only, B+ scan — digital text found and used (docs/exoristos-1831-audit.md)
