# Pipeline Queue — Mass Text Pipelines

Queued language pipelines to execute after the Chinese Pipeline (Session 36) completes. Each pipeline follows the established workflow in `docs/mass-text-pipeline-workflow.md` and agent registry pattern in `docs/chinese-pipeline-agents.md`.

**Last updated:** 2026-01-29, Session 36

---

## Execution Order

Pipelines execute sequentially (one language at a time) to avoid overwhelming API rate limits and to allow monitoring. Within each pipeline, agents run in parallel where the workflow permits (e.g., 3 parallel processors, 7-10 parallel translators).

| Priority | Language | Wikisource | Works | Pre-1900 | Notes |
|----------|----------|------------|-------|----------|-------|
| 1 | **Chinese (zh)** | zh.wikisource.org | 44 | Yes | IN PROGRESS — Session 36 |
| 2 | **Polish (pl)** | pl.wikisource.org | 40 | Yes | Largest batch after Chinese |
| 3 | **Armenian (hy)** | hy.wikisource.org | 45 | Yes | MUST use DeepSeek (Gemini blocks Armenian) |
| 4 | **Italian (it)** | it.wikisource.org | 20 | Yes | Already have `it-literary-19c` prompt |
| 5 | **Latin (la)** | la.wikisource.org | 10 | Yes | Already have `la` prompt |
| 6 | **Czech (cs)** | cs.wikisource.org | 10 | Yes | New language — needs prompt |
| 7 | **Gujarati (gu)** | gu.wikisource.org | 10 | Yes | New language — needs prompt |
| 8 | **Telugu (te)** | te.wikisource.org | 10 | Yes | New language — needs prompt |
| 9 | **Turkish (tr)** | tr.wikisource.org | 5 | Yes | New language — needs prompt (Ottoman?) |

**Total:** 9 pipelines, ~145 target works (excluding Chinese already running). Targets are approximate — verification will filter down to confirmed texts, as in the Chinese pipeline (50 target → 44 confirmed).

**IMPORTANT — Translation Prompts:** Existing prompts are narrowly tailored to specific texts/periods. Even for languages already on Deltoi (Armenian, Italian, Latin), new prompts will likely be needed for different periods, genres, or registers. Always audit the existing prompt against the actual texts before translating. Create new prompts as needed — do not assume an existing language prompt is suitable.

---

## Pre-Pipeline Checklist (Per Language)

Before launching each pipeline, verify:

1. [ ] Previous pipeline fully complete (all translations done, gap-check passed)
2. [ ] `docs/text-inventory.md` updated with previous pipeline results
3. [ ] Commit + push previous pipeline's data
4. [ ] Check Wikisource content availability for target language (some Wikisources are sparse)
5. [ ] Check if translation prompt exists for this language in `src/server/translation/prompts.ts`
6. [ ] If new language: create translation prompt BEFORE Phase 7 (test with sample chapter)
7. [ ] Check `docs/mass-text-pipeline-workflow.md` for any updates from lessons learned
8. [ ] Check `docs/chinese-pipeline-agents.md` for agent pattern reference

---

## Language-Specific Notes

### 1. Chinese (zh) — IN PROGRESS
- **Status:** 10 translation workers running (W1-W10), 331/1,619 chapters done
- **Prompts:** `zh` (philosophy), `zh-literary` (literature/history), `zh-science` (science)
- **Post-translation:** Gap-check agent queued (detect missing + disproportionately short translations by word count)
- **Agent registry:** `docs/chinese-pipeline-agents.md`

### 2. Polish (pl) — QUEUED
- **Target:** 40 works, pre-1900, from pl.wikisource.org
- **Wikisource quality:** pl.wikisource.org is one of the larger Wikisources with substantial classical content
- **Prompt needed:** New `pl` prompt for 19th-century Polish literary prose + possibly `pl-romantic` for Romantic-era poetry
- **Considerations:**
  - Polish Romanticism (Mickiewicz, Slowacki, Krasinski) — verify no existing complete English translations
  - Positivist-era novels (Prus, Orzeszkowa, Sienkiewicz) — Sienkiewicz is extensively translated, likely excluded
  - Many Polish classics may already have English translations (active literary translation tradition)
  - Expect higher rejection rate in verification phase

### 3. Armenian (hy) — QUEUED
- **Target:** ~45 works, pre-1900, from hy.wikisource.org (target is approximate — verification will filter)
- **CRITICAL:** Must use DeepSeek only. Gemini blocks Armenian historical content with `PROHIBITED_CONTENT` errors.
- **Prompt:** Existing `hy` prompt covers 19th-20th century Armenian literature — but new texts may span different periods/genres and will likely need new prompts (e.g., classical Armenian grabar, medieval chronicles, ecclesiastical texts)
- **Script:** Use `scripts/translate-armenian.ts` (not `translate-batch.ts`)
- **Considerations:**
  - hy.wikisource.org may be smaller — verify content availability first
  - Already have 6 Armenian texts on Deltoi (195 chapters) — exclude those
  - Classical Armenian (grabar) vs. modern Armenian — may need separate prompts
  - Historical content (genocide accounts, oppression narratives) — DeepSeek handles these; Gemini does not

### 4. Italian (it) — QUEUED
- **Target:** ~20 works, pre-1900, from it.wikisource.org (target is approximate)
- **Prompts:** Existing `it` (15th-century Romanesco) and `it-literary-19c` (19th-century literary prose) are narrowly tailored — new texts from different periods/genres will need new prompts
- **Considerations:**
  - it.wikisource.org is very large — many candidates available
  - Major Italian works (Dante, Boccaccio, Machiavelli) are extensively translated — expect high rejection rate
  - Focus on lesser-known: regional literature, minor novelists, historical chronicles
  - Already have Rovani (2 novels) + Diarium Urbis Romae on Deltoi — exclude those
  - May need additional prompts: `it-medieval` for Trecento prose, `it-renaissance` for Cinquecento

### 5. Latin (la) — QUEUED
- **Target:** ~10 works, pre-1900, from la.wikisource.org (target is approximate)
- **Prompt:** Existing `la` prompt covers chronicle/philosophy/poetry — but is tailored to specific existing texts. New texts from different periods (Classical, Medieval, Renaissance) or genres will likely need new prompts
- **Considerations:**
  - la.wikisource.org has extensive content
  - Many major Latin works are translated (Cicero, Virgil, Ovid, etc.) — high rejection rate expected
  - Focus on: medieval chronicles, lesser-known Renaissance texts, scientific works
  - Already have Lombards (82ch), Regno (56ch), Diarium (66ch) on Deltoi — exclude those
  - Classical vs. Medieval vs. Renaissance Latin — may need prompt variants

### 6. Czech (cs) — QUEUED
- **Target:** 10 works, pre-1900, from cs.wikisource.org
- **Prompt needed:** New `cs` prompt — 19th-century Czech literary prose (National Revival era)
- **Considerations:**
  - cs.wikisource.org is moderate-sized
  - Czech National Revival literature (Nemcova, Erben, Neruda, Havlicek) — some translated, many not
  - Older Czech (Old Czech chronicles, Hussite literature) — potentially very valuable if available
  - Script: Latin alphabet, no special processing needed

### 7. Gujarati (gu) — QUEUED
- **Target:** 10 works, pre-1900, from gu.wikisource.org
- **Prompt needed:** New `gu` prompt — classical/medieval Gujarati literature
- **Considerations:**
  - gu.wikisource.org may be small — verify content availability FIRST before committing to 10 works
  - If insufficient Wikisource content, supplement from other digital libraries
  - Gujarati script (ગુજરાતી) — ensure proper Unicode handling
  - Important pre-1900 works: Narmad, Dalpatram, Premanand Bhatt
  - May need to reduce target if Wikisource content is sparse

### 8. Telugu (te) — QUEUED
- **Target:** 10 works, pre-1900, from te.wikisource.org
- **Prompt needed:** New `te` prompt — classical Telugu literature (kavya tradition)
- **Considerations:**
  - te.wikisource.org exists but may be limited
  - Telugu script (తెలుగు) — ensure proper Unicode handling
  - Important: Pothana's Bhagavatam, Nannaya's Mahabharatam, Srinatha, Vemana
  - Some may be very large (epic-length kavya) — check chapter counts
  - May overlap with Sanskrit originals — ensure we're translating the Telugu version, not retranslating Sanskrit

### 9. Turkish (tr) — QUEUED
- **Target:** ~5 works, pre-1900, from tr.wikisource.org (target is approximate)
- **Prompt needed:** New `tr` prompt — Ottoman Turkish literary prose
- **Considerations:**
  - Pre-1900 Turkish is Ottoman Turkish (Arabic script, heavy Persian/Arabic vocabulary)
  - **PRIORITY: Latinised alphabet texts** — strongly prefer texts available in modern Latin-script transcription for encoding convenience. Avoid original Ottoman Arabic-script texts where possible.
  - tr.wikisource.org may have texts in modern Latin-script transcription OR original Ottoman script — filter for Latin-script during research phase
  - If only Ottoman script available for an important text, it may still be included but note the encoding challenge
  - Important: Evliya Celebi, Katip Celebi, Naima — verify translation status
  - Smallest batch (~5 works) — manageable even with script challenges

---

## Post-Pipeline Steps (After Each Language)

After each pipeline's translation workers complete:

1. **Gap-check agent** — detect untranslated paragraphs + disproportionately short translations (word-count ratio, adjusted for source language character density)
2. **Gap-fill subagents** — up to 8 parallel workers to retranslate gaps
3. **Update documentation:**
   - `docs/text-inventory.md` — add all new texts
   - `ACTIVE_AGENTS.md` — mark pipeline complete
   - `docs/<language>-pipeline-agents.md` — full agent registry
   - `CLAUDE.md` — update text counts
4. **Commit + push** all processed data and translations
5. **Verify on deltoi.com** — spot-check 3-5 texts render correctly

---

## New Prompts Needed

| Language | Code | Prompt Name | Period/Genre | Priority |
|----------|------|-------------|--------------|----------|
| Polish | `pl` | Polish literary prose | 19th-century Romantic/Positivist | P2 |
| Czech | `cs` | Czech literary prose | 19th-century National Revival | P6 |
| Gujarati | `gu` | Gujarati classical | Medieval/pre-modern | P7 |
| Telugu | `te` | Telugu kavya | Classical Telugu poetry/prose | P8 |
| Turkish | `tr` | Ottoman Turkish | Ottoman literary prose | P9 |

Existing prompts that WILL likely need new variants (prompts are narrowly tailored):
- `hy` — current prompt covers 19th-20th century literature only. Will need prompts for grabar (classical Armenian), medieval chronicles, ecclesiastical texts
- `la` — current prompt tailored to specific chronicle texts. Will need variants for Classical Latin, Medieval Latin, Renaissance Latin, scientific Latin
- `it` — current `it` is for 15th-century Romanesco diary only; `it-literary-19c` is for Rovani-era prose. Will need prompts for Trecento, Quattrocento, Baroque, etc.

**Rule:** Always test-translate 1-2 sample chapters with the candidate prompt before committing to a full translation run. If the output is stilted, inaccurate, or misses period-specific conventions, create a new prompt.

---

## Capacity Planning

| Pipeline | Est. Works | Est. Chapters | Est. Workers | Est. API Calls |
|----------|-----------|---------------|-------------|---------------|
| Polish | 40 | ~1,200 | 7-10 | ~1,200 |
| Armenian | 45 | ~900 | 7-10 | ~900 |
| Italian | 20 | ~500 | 5-7 | ~500 |
| Latin | 10 | ~300 | 3-5 | ~300 |
| Czech | 10 | ~250 | 3-5 | ~250 |
| Gujarati | 10 | ~200 | 3-5 | ~200 |
| Telugu | 10 | ~200 | 3-5 | ~200 |
| Turkish | 5 | ~100 | 2-3 | ~100 |
| **Total** | **~150** | **~3,650** | — | **~3,650** |

Combined with Chinese (44 texts, 1,619 chapters), the full queue represents ~194 texts and ~5,269 chapters.

---

## Workflow Reference

- **Full workflow:** `docs/mass-text-pipeline-workflow.md`
- **Agent registry template:** `docs/chinese-pipeline-agents.md`
- **Pipeline status template:** `docs/chinese-pipeline-status.md`
