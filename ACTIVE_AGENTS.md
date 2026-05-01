# Active Agents & Background Workers

Track all running agents and background workers here. Update when launching or completing agents.

**Last updated:** 2026-04-20

## RUNNING — Ouyang Xiu Ji (Collected Works of Ouyang Xiu) Pipeline (2026-05-01)

End-to-end addition of the 153-juan Collected Works of Ouyang Xiu (Northern Song, 1007-1072) from zh.wikisource.org.

- Author: ouyang-xiu (id 592, reused from commit 060cb09)
- Text: ouyangxiu-ji (id 1219, 153 chapters)
- Genre: literature -> zh-literary specialist
- Targets: EN + ES (Chinese source -> skip ZH)

### Workers
- blknnntps - EN ch 1-3 - COMPLETE (3/3)
- bm6pbeorq - EN ch 4-30 - RUNNING
- b4aor8sv8 - EN ch 31-80 - RUNNING
- bepd33nl5 - EN ch 81-153 - RUNNING
- bngpspb1f - ES ch 1-30 - RUNNING
- bf0o1xc98 - ES ch 31-80 - RUNNING
- b1zzcjoa3 - ES ch 81-153 - RUNNING

Watchers:
- b1fsrgwip - waits until EN >= 50
- bs9r051wk - waits until EN >= 150 AND ES >= 150 (translation completion)

Structural commit pushed: cd6671c

### COMPLETE — 縱囚論 splice into ouyangxiu-ji ch17 (2026-05-01)

The standalone zongqiulun text (id 1218) had pre-translated EN (translation_versions.id 85120) and ES (id 85124) translations. Ouyang Xiu Ji ch17 (id 48249) bundles 縱囚論 with 6 other essays.

- Translated ch17 v1 fresh (EN tv 85497, ES tv 85499) via translate-batch.ts
- Built v2 via SQL CTE that overwrites only paragraph indices 2,3,4 with zongqiulun translations:
  - ch17.idx 2 ← zongqiulun[0] + " " + zongqiulun[1]
  - ch17.idx 3 ← zongqiulun[2] + " " + zongqiulun[3]
  - ch17.idx 4 ← zongqiulun[4] (verbatim)
- v2 inserted append-only with previous_version_id linkage; current_version_id updated
- EN v2: tv id 85502; ES v2: tv id 85503
- Audit: pnpm tsx scripts/_audit-spanish-pilot.ts ouyangxiu-ji 17 → passed
- Standalone zongqiulun text and translations preserved unchanged
- See docs/zongqiulun-slot-into-ouyangxiu-ji.md (gitignored, local only)



## SESSION END STATE (2026-04-20)

**Spanish Translation Rollout: 12,625 / 34,805 chapters (36.3%)**
**458 texts at 100%, 221 partial, 404 untouched**

Full state document: `docs/spanish-rollout-state-20260420-final.md`

### Processes potentially still running at session end (may die on session exit)
- `bow02ycis` — 6-worker Chinese floor (6 pinned keys)
- `b2srdysqa` — cronica-matteo-villani ch 951-1081
- `brm0btb1i` — storia-italia-balbo ch 121-178
- `bi6j4yn04` — pesme-ilic ch 41-80
- `bkgm2ksxc` — mingshi ch 201-220 (dedicated key)
- `bdewhkdan` — mingshi ch 221-240 (dedicated key)

### Key infrastructure commits (all on main, all deployed)
- `e099656` — Phase 0 foundation (schema, dictionary, prompts, UI, verification)
- `defc72a` — Phase 1 pilot + guardrails (normalizeQuotes, verse line rule)
- `7a003cc` — Spanish quote convention correction (raya + «» per RAE)
- `c1dfa00` — zh-leak guardrail
- `0bda2cd` — Multi-key pool (6 keys) + prompt caching
- `366028a` — In-chapter batch parallelism (N=3)
- `b7b9808` — --api-key-env dedicated key isolation
- `09f652f` — Round-robin random seed
- `edbdf6d` — Claude direct-translate verse rescue helper
- `f39e691` — Home page buttons + hero padding
- `d00fbb9` — Footer "Deltoi:" fix

---

## 24 Histories Dedicated-Key Drain (Mingshi + Songshi)

**Started:** 2026-04-11
**Key:** `CHINESE_HISTORY_DEEPSEEK_API_KEY` (isolated single-key pool)
**Prompt:** `zh-shiji` 24H specialist (auto-fallback for slugs without per-slug ES specialist)
**Commit:** `b7b9808 feat(translation): --api-key-env flag for dedicated key isolation` — pushed to main
**Logs:** `data/24h-pipeline/dedicated-logs/`

| Worker | Text | Range | Status |
|--------|------|-------|--------|
| W1 | mingshi | 2-6 | RUNNING (smoke ch1 PASS: 96=96 paras, ratio 6.39, 0 failures) |
| W2 | songshi | 1-5 | RUNNING |

**Pre-flight smoke test:** Mingshi ch1 translated successfully via dedicated key + zh-shiji fallback. Audit: ratio=6.39, no zh-leak, alignment 96=96. The fallback path is verified working end-to-end.

**No overlap:** Other 24H workers are on bei-qi-shu, chenshu, jiu-wudaishi, liangshu, zhoushu — none on mingshi/songshi.

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
| a2fee2cae20f1b50c | 2 | Survey + Wave 2D Romance (fr/it/ro, 5,397 ch) launch | COMPLETE | 2026-04-11 | 2026-04-11 |
| a2fee2cae20f1b50c-W1 | 2D | Wave 2D worker W1 (30 texts, 2260 ch) | DIED EARLY (only ~16/5398 total ch done before all 5 workers exited) | 2026-04-11 | - |
| a2fee2cae20f1b50c-W2 | 2D | Wave 2D worker W2 (32 texts, 1462 ch) | DIED EARLY | 2026-04-11 | - |
| a2fee2cae20f1b50c-W3 | 2D | Wave 2D worker W3 (33 texts, 480 ch) | DIED EARLY | 2026-04-11 | - |
| a2fee2cae20f1b50c-W4 | 2D | Wave 2D worker W4 (34 texts, 545 ch) | DIED EARLY | 2026-04-11 | - |
| a2fee2cae20f1b50c-W5 | 2D | Wave 2D worker W5 (33 texts, 650 ch) | DIED EARLY | 2026-04-11 | - |
| a07d608f320018600-W1 | 2D-RECOVERY | Wave 2D recovery W1 (32 texts, 3341 ch, 23046 para, bash id b5kkdsp88) | RUNNING | 2026-04-11T13:30:08Z | - |
| a07d608f320018600-W2 | 2D-RECOVERY | Wave 2D recovery W2 (31 texts, 414 ch, 23046 para, bash id b0yn717sq) | RUNNING | 2026-04-11T13:30:14Z | - |
| a07d608f320018600-W3 | 2D-RECOVERY | Wave 2D recovery W3 (34 texts, 421 ch, 23049 para, bash id bm1j0vzl2) | RUNNING | 2026-04-11T13:30:18Z | - |
| a07d608f320018600-W4 | 2D-RECOVERY | Wave 2D recovery W4 (34 texts, 507 ch, 23049 para, bash id bb05pmbrq) | RUNNING | 2026-04-11T13:30:20Z | - |
| a07d608f320018600-W5 | 2D-RECOVERY | Wave 2D recovery W5 (31 texts, 699 ch, 23046 para, bash id bxze2rvo1) | RUNNING | 2026-04-11T13:30:23Z | - |
| ad2f6d2c3c3956622 | 2 | Wave 2E Latin/Greek (la/grc/el, 2,697 ch) coordinator | MONITORING | 2026-04-11 | - |
| a07d608f320018600 | 2 | Wave 2D recovery + relaunch (durable Bash workers) | RUNNING | 2026-04-11 | - |
| aa97ac37320a2c874 | 2 | Wave 2F Persian/Chagatai/Arabic (fa/chg/ar, 3,904 ch / 397,347 para / 72 texts) coordinator — slash guardrail critical | RUNNING | 2026-04-11 | - |
| aca128036bef3c9e1 | 2 | Wave 2E recovery + relaunch (durable Bash workers, ~2,697 ch) | RUNNING | 2026-04-11 | - |
| aa157e5ba5088bb39 | 2 | Wave 2C English (en, 4,361 ch / 265,341 para / 118 texts) coordinator | RUNNING | 2026-04-11 | - |
| ae795b2e1fa83ca4f | 2 | Wave health check + DB progress snapshot | RUNNING | 2026-04-11 | - |
| a2caae37a6be9e8a4 | 2 | Wave 2G Slavic+Indic+Other (197 texts / 5,098 ch / 274,330 para) coordinator | COMPLETE — workers expected to die after agent exit (background-worker death pattern); ~93 ch translated in 21min before exit, all early audits clean | 2026-04-11 | 2026-04-11 |
| a2caae37a6be9e8a4-W1 | 2G | Wave 2G worker W1 (39 chunks, 848 ch, 54874 para; nekuda-leskov→ru-literary lead; bash id b70tiw8a5; pid 78225) | RUNNING | 2026-04-11T13:50:07Z | - |
| a2caae37a6be9e8a4-W2 | 2G | Wave 2G worker W2 (40 chunks, 753 ch, 54862 para; salomeya→ru-literary lead; bash id b983fem8i; pid 78254) | RUNNING | 2026-04-11T13:50:11Z | - |
| a2caae37a6be9e8a4-W3 | 2G | Wave 2G worker W3 (39 chunks, 984 ch, 54873 para; lektsii-tom2→ru-literary lead; bash id btn7ob5x2; pid 78282) | RUNNING | 2026-04-11T13:50:13Z | - |
| a2caae37a6be9e8a4-W4 | 2G | Wave 2G worker W4 (40 chunks, 1408 ch, 54861 para; rok-na-vsi→cs lead; bash id bfc20n375; pid 78310) | RUNNING | 2026-04-11T13:50:16Z | - |
| a2caae37a6be9e8a4-W5 | 2G | Wave 2G worker W5 (39 chunks, 1105 ch, 54860 para; vasily-tyorkin→ru-literary lead; bash id bd2n9yeca; pid 78338) | RUNNING | 2026-04-11T13:50:18Z | - |
| afd07bfd7513edf1c | 2 | SYNCHRONOUS PATTERN TEST — Shahnameh ch 1-30 ES (foreground only) | RUNNING | 2026-04-11 | - |

### Architecture pivot 2026-04-11 ~14:00Z

ALL background-worker waves DIED. Health check (agent ae795b2e1fa83ca4f) at 13:47Z showed 0 alive translate-batch processes despite 6 wave coordinators having launched ~25-30 background workers (some via nohup, some via Bash run_in_background — both equally dead). Total ES translations in DB: 104/34,805 (0.30%).

**Root cause:** Background bash processes do NOT survive subagent termination in this environment. `nohup` does not detach. `run_in_background: true` is reaped on agent exit. The `wait` strategy worked for Whewell because the agent stayed in foreground until `wait` returned — none of the wave coordinators followed that pattern; they all backgrounded then slept then exited, killing the children.

**Pivot:** Switch to SYNCHRONOUS in-agent pattern. Each agent runs translate-batch.ts in the foreground (or backgrounded with `wait` in the SAME bash block) for a bounded chunk and exits cleanly when work is done. Agent lifetime = worker lifetime.

**Test agent afd07bfd7513edf1c**: Shahnameh ch 1-30 via pure synchronous translate-batch.ts. **VALIDATED** — 11 chapters in 8 minutes, 7/7 audits PASS, 0 errors. Pattern proven.

**Sync batch 1 launched (5 parallel agents, 2026-04-11 ~14:10Z, target ~1,570 chapters):**
- a9f411b3a6e66c18d — Sync 2F-1 Persian (Shahnameh 31-80, Bidel 1-50, Sanai 1-30, Hakim 1-30, Muizzi 1-30) ~190 ch
- acd161164539d4bd7 — Sync 2D-1 Romance (annali-italia 1-500 + small Italian) ~680 ch
- a116e89a8c100d654 — Sync 2E-1 Latin/Greek (smallest texts first) ~200 ch
- a550a4d5cc596f919 — Sync 2C-1 English (Bradley/Bosanquet/Hutcheson/Whewell) ~220 ch
- a4d422a2efd85e2da — Sync 2H + 2G smallest (sq + Slavic/Indic small texts) ~280 ch

See `docs/spanish-rollout-architecture-pivot.md` for full diagnosis.
| aa97ac37320a2c874-W1 | 2F | Wave 2F worker W1 (14 chunks, 1054 ch, 79443 para; shahnameh lead; bash id b9uos3f7h) | RUNNING | 2026-04-11T13:33:40Z | - |
| aa97ac37320a2c874-W2 | 2F | Wave 2F worker W2 (14 chunks, 620 ch, 79468 para; bidel-dehlavi lead; bash id bsaewtbj8) | RUNNING | 2026-04-11T13:33:47Z | - |
| aa97ac37320a2c874-W3 | 2F | Wave 2F worker W3 (14 chunks, 380 ch, 79514 para; sanai-divan lead; bash id bin290n3a) | RUNNING | 2026-04-11T13:33:54Z | - |
| aa97ac37320a2c874-W4 | 2F | Wave 2F worker W4 (15 chunks, 790 ch, 79454 para; hakim-qaani + masail-ibn-rushd; bash id b8ivv1lk8) | RUNNING | 2026-04-11T13:34:00Z | - |
| aa97ac37320a2c874-W5 | 2F | Wave 2F worker W5 (15 chunks, 1060 ch, 79468 para; amir-muizzi + khaqani-shirvani; bash id bo1bq82hh) | RUNNING | 2026-04-11T13:34:09Z | - |
| ad2f6d2c3c3956622-W1 | 2E | Wave 2E worker W1 (23 texts, 165 ch, 10,442 para) | RUNNING | 2026-04-11 | - |
| ad2f6d2c3c3956622-W2 | 2E | Wave 2E worker W2 (23 texts, 297 ch, 10,440 para) | RUNNING | 2026-04-11 | - |
| ad2f6d2c3c3956622-W3 | 2E | Wave 2E worker W3 (24 texts, 906 ch, 10,440 para) | RUNNING | 2026-04-11 | - |
| ad2f6d2c3c3956622-W4 | 2E | Wave 2E worker W4 (25 texts, 665 ch, 10,445 para) | RUNNING | 2026-04-11 | - |
| ad2f6d2c3c3956622-W5 | 2E | Wave 2E worker W5 (25 texts, 664 ch, 10,442 para) | RUNNING | 2026-04-11 | - |
| aa157e5ba5088bb39-W1 | 2C | Wave 2C worker W1 (23 units, 850 ch, 53,044 para; en→es; bash id bm0zzpgdm) | RUNNING | 2026-04-11 | - |
| aa157e5ba5088bb39-W2 | 2C | Wave 2C worker W2 (24 units, 944 ch, 53,069 para; en→es; bash id bzgzsn51i) | RUNNING | 2026-04-11 | - |
| aa157e5ba5088bb39-W3 | 2C | Wave 2C worker W3 (24 units, 737 ch, 53,162 para; en→es; bash id b0web2rcd) | RUNNING | 2026-04-11 | - |
| aa157e5ba5088bb39-W4 | 2C | Wave 2C worker W4 (23 units, 878 ch, 53,037 para; en→es; bash id bdhr50pme) | RUNNING | 2026-04-11 | - |
| aa157e5ba5088bb39-W5 | 2C | Wave 2C worker W5 (24 units, 952 ch, 53,029 para; en→es; bash id b6hgg73se) | RUNNING | 2026-04-11 | - |

### Wave 2F launch & early hemistich audit (agent aa97ac37320a2c874) — 2026-04-11

- **Scope:** 72 texts, 3,904 chapters, 397,347 paragraphs (fa 38 / chg 2 / ar 32). Persian poetry dominates (360k of 397k paragraphs).
- **Launch time:** 2026-04-11T13:33:40Z–13:34:09Z (5 workers staggered 6–9s each via Bash `run_in_background`)
- **Bash IDs:** W1=b9uos3f7h, W2=bsaewtbj8, W3=bin290n3a, W4=b8ivv1lk8, W5=bo1bq82hh
- **Partition:** `/tmp/es-wave-2f-partition.json` (LPT-balanced ~79,460 paragraphs per worker)
- **Scope doc:** `docs/es-wave-2f-scope.md`
- **Handoff:** `docs/es-wave-2f-handoff.md` + `/tmp/es-wave-2f-handoff.json`
- **Prompt dispatch verified:** fa → `SPANISH_TARGET_BY_SOURCE["fa"]` (hemistich `/` rule at prompts.ts lines 7029–7037, marked "VIOLACIÓN CATASTRÓFICA"); chg → `chg`; babur-divan → `chg-babur`; fa-prose → `fa-prose` (Neutro); ar → universal Neutro fallback. Confirmed in worker logs: `model: deepseek-chat` for Shahnameh (REASONER_SLUGS bypassed for Spanish target).
- **Early hemistich audit (T+5min, 15 poetry chapters sampled):**
  - shahnameh ch 1–13: 13/13 PASS (slash rate 100%, ratios 1.14–1.59)
  - bidel-dehlavi-divan ch 1–2: 2/2 PASS (slash rate 100%, ratios 1.73–1.78)
  - Side-by-side eyeball check (scripts/_sample-es-wave-2f-translation.ts) on shahnameh ch5 p0 and bidel ch1 p0: slash preserved, Mexican Spanish literary register correct, no em-dash, no guillemets, no straight quotes.
  - **0 slash failures, 0 total failures across 15 chapters → VERDICT: CONTINUE**
  - No `[SLASH ERROR]` or `[slash warn]` logs from any of 5 workers. Persian Hemistich Catastrophe pattern NOT reproducing.
- **Worker progress at T+5min:**
  - W1: 13 shahnameh chapters completed (~2.6 ch/min)
  - W2: 2 bidel-dehlavi chapters completed (100 paras each)
  - W3/W4/W5: 0 chapters completed — stuck on huge first chapters (Sanai Divan ch1 = 21 batches; Hakim Qaani ch1 = 13 batches; Amir Muizzi ch1 = 92 batches). First `[done]` marks expected 15–60 min after launch.
- **Halt triggers fired:** 0
- **Revised completion window:** 2026-04-11T22:00Z – 2026-04-12T04:00Z (longer than initial estimate due to 500+ paragraph first-chapters in several Persian divans)
- **Audit artifact:** `/tmp/es-wave-2f-early-audit.json`
- **New scripts:** `scripts/_partition-es-wave-2f.ts`, `scripts/_run-es-wave-2f-worker.sh`, `scripts/_audit-es-wave-2f-early.ts`, `scripts/_sample-es-wave-2f-translation.ts`
- **Next session:** resume via `docs/es-wave-2f-handoff.md`. Follow-up audit pass (including Arabic prose samples) once W3/W4/W5 drain their first texts.

### Wave 2E launch & early audit (agent ad2f6d2c3c3956622) — 2026-04-11

- **Scope:** 120 texts, 2,697 chapters, 52,209 paragraphs (la 44 / grc 56 / el 20)
- **Launch time:** 2026-04-11T13:18:22Z–13:18:35Z
- **Worker PIDs (runner):** W1=75607, W2=75636, W3=75663, W4=75690, W5=75719
- **Partition:** `/tmp/es-wave-2e-partition.json` (LPT-balanced, ~10,440 paragraphs each)
- **Handoff:** `docs/es-wave-2e-handoff.md` + `/tmp/es-wave-2e-handoff.json`
- **Early audit (T+8min, 8 chapters sampled):**
  - la-hymn/hymni-ecclesiae ch 1/3/5/10/15: PASS (verse lines 4=4 preserved, ratios 1.17–1.39)
  - el/poiimata-kai-peza ch 1: PASS (29/29, ratio 0.98)
  - grc/eikona-adikias ch 1: PASS (5/5, ratio 0.98)
  - grc/gnosis-patriarchon-thronon ch 1: PASS (5/5, ratio 1.04)
  - **Zero violations across la-hymn (verse fallback), el (generic fallback), grc (specialist) paths.**
  - Universal verse directive from Phase 1 self-recovery is correctly activating for la-hymn.
- **Progress at T+8min:** 20/2701 chapters (0.74%)
- **Throughput:** ~2.8 chapters/min across 5 workers → ~16 hours wall clock (better than plan's 26h estimate)
- **Prompt edits during early audit:** none (all samples pass)
- **Expected completion:** ~2026-04-12T05:00Z
- **Next session:** resume via `docs/es-wave-2e-handoff.md`

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
