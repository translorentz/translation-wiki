# Pipeline Queue — Mass Text Pipelines

Queued language pipelines to execute after the Chinese Pipeline (Session 36) completes. Each pipeline follows the established workflow in `docs/mass-text-pipeline-workflow.md` and agent registry pattern in `docs/chinese-pipeline-agents.md`.

**Last updated:** 2026-01-29, Session 36

---

## Execution Order

Pipelines execute sequentially (one language at a time) to avoid overwhelming API rate limits and to allow monitoring. Within each pipeline, agents run in parallel where the workflow permits (e.g., 3 parallel processors, 7-10 parallel translators).

| Priority | Language | Wikisource | Works | Pre-1900 | Notes |
|----------|----------|------------|-------|----------|-------|
| 1 | **Chinese (zh)** | zh.wikisource.org | 44 | Yes | IN PROGRESS — near complete |
| 2 | **Polish (pl)** | pl.wikisource.org | 12 | Yes | Capped from 40 |
| 3 | **Armenian (hy)** | hy.wikisource.org | 12 | Yes | MUST use DeepSeek (Gemini blocks Armenian). Capped from 45 |
| 4 | **Italian (it)** | it.wikisource.org | 12 | Yes | Already have `it-literary-19c` prompt. Capped from 20 |
| 5 | **Latin (la)** | la.wikisource.org | 10 | Yes | Already have `la` prompt |
| 6 | **Czech (cs)** | cs.wikisource.org | 1 | Yes | New language — needs prompt |
| 7 | **Gujarati (gu)** | gu.wikisource.org | 1 | Yes | New language — needs prompt |
| 8 | **Telugu (te)** | te.wikisource.org | 1 | Yes | New language — needs prompt |
| 9 | **Turkish (tr)** | tr.wikisource.org | 1 | Yes | New language — needs prompt (Ottoman?) |
| 10 | **Greek (grc)** | el.wikisource.org | 12 | Yes | Curated list available; already have `grc` prompt |

**Total:** 9 pipelines, ~50 target works (excluding Chinese already running). Targets are approximate — verification will filter down to confirmed texts. Reduced from original ~145 due to resource constraints (Session 38).

**IMPORTANT — Translation Prompts:** Existing prompts are narrowly tailored to specific texts/periods. Even for languages already on Deltoi (Armenian, Italian, Latin), new prompts will likely be needed for different periods, genres, or registers. Always audit the existing prompt against the actual texts before translating. Create new prompts as needed — do not assume an existing language prompt is suitable.

---

## Pre-Pipeline Checklist (Per Language)

Before launching each pipeline, verify:

1. [ ] Previous pipeline fully complete (all translations done, gap-check passed)
2. [ ] `docs/text-inventory.md` updated with previous pipeline results
3. [ ] Commit + push previous pipeline's data
4. [ ] **Check for User-curated text list** in `docs/<language>_text_suggestions.txt` — if it exists, use it directly (skip research phase). Currently available: `polish_text_suggestions.txt`, `armenian_text_suggestions.txt`, `latin_text_suggestions.txt`, `greek_text_suggestions.txt`
5. [ ] If no curated list: run research + verification agents to find texts on Wikisource
6. [ ] **Fallback rule:** If a scraper can't find a curated work on Wikisource, it may spin up the research agent workflow to find a substitute
7. [ ] Check if translation prompt exists for this language in `src/server/translation/prompts.ts`
8. [ ] If new language: create translation prompt BEFORE translation phase (test with sample chapter)
9. [ ] Check `docs/mass-text-pipeline-workflow.md` for any updates from lessons learned
10. [ ] Check `docs/chinese-pipeline-agents.md` for agent pattern reference

---

## Language-Specific Notes

### 1. Chinese (zh) — IN PROGRESS
- **Status:** 10 translation workers running (W1-W10), 331/1,619 chapters done
- **Prompts:** `zh` (philosophy), `zh-literary` (literature/history), `zh-science` (science)
- **Post-translation:** Gap-check agent queued (detect missing + disproportionately short translations by word count)
- **Agent registry:** `docs/chinese-pipeline-agents.md`

### 2. Polish (pl) — QUEUED
- **Target:** 12 works from User-curated list in `docs/polish_text_suggestions.txt`
- **Research phase: SKIP** — use the curated list directly instead of running a research agent
- **Fallback:** If a scraper can't find a specific work on Wikisource, it may spin up the research agent workflow to find a substitute
- **Prompt needed:** New `pl` prompt for 19th-century Polish literary prose + possibly `pl-romantic` for Romantic-era poetry
- **Considerations:**
  - Polish Romanticism (Mickiewicz, Slowacki, Krasinski) — verify no existing complete English translations
  - Positivist-era novels (Prus, Orzeszkowa, Sienkiewicz) — Sienkiewicz is extensively translated, likely excluded
  - Many Polish classics may already have English translations (active literary translation tradition)

### 3. Armenian (hy) — QUEUED
- **Target:** 12 works from User-curated list in `docs/armenian_text_suggestions.txt`
- **Research phase: SKIP** — use the curated list directly instead of running a research agent
- **Fallback:** If a scraper can't find a specific work on Wikisource, it may spin up the research agent workflow to find a substitute
- **CRITICAL:** Must use DeepSeek only. Gemini blocks Armenian historical content with `PROHIBITED_CONTENT` errors.
- **Prompt:** Existing `hy` prompt covers 19th-20th century Armenian literature — but new texts may span different periods/genres and will likely need new prompts (e.g., classical Armenian grabar, medieval chronicles, ecclesiastical texts)
- **Script:** Use `scripts/translate-armenian.ts` (not `translate-batch.ts`)
- **Considerations:**
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
- **Target:** 10 works from User-curated list in `docs/latin_text_suggestions.txt`
- **Research phase: SKIP** — use the curated list directly instead of running a research agent
- **Fallback:** If a scraper can't find a specific work, it may spin up the research agent workflow to find a substitute
- **Prompt:** Existing `la` prompt covers chronicle/philosophy/poetry — but is tailored to specific existing texts. New texts from different periods (Classical, Medieval, Renaissance) or genres will likely need new prompts
- **Considerations:**
  - la.wikisource.org has extensive content
  - Many major Latin works are translated (Cicero, Virgil, Ovid, etc.) — high rejection rate expected
  - Focus on: medieval chronicles, lesser-known Renaissance texts, scientific works
  - Already have Lombards (82ch), Regno (56ch), Diarium (66ch) on Deltoi — exclude those
  - Classical vs. Medieval vs. Renaissance Latin — may need prompt variants
  - **User suggestions** (see `docs/latin_text_suggestions.txt`): Kircher (Turris Babel, Oedipus Aegyptiacus, Mundus Subterraneus), Leibniz (Historia Inventionis Phosphori), Albertus Magnus (De quindecim problematibus) — research agents should check availability and translation status alongside Wikisource candidates

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
- **Target:** ~1 work, pre-1900, from tr.wikisource.org
- **Prompt needed:** New `tr` prompt — Ottoman Turkish literary prose
- **Considerations:**
  - Pre-1900 Turkish is Ottoman Turkish (Arabic script, heavy Persian/Arabic vocabulary)
  - **PRIORITY: Latinised alphabet texts** — strongly prefer texts available in modern Latin-script transcription for encoding convenience. Avoid original Ottoman Arabic-script texts where possible.
  - tr.wikisource.org may have texts in modern Latin-script transcription OR original Ottoman script — filter for Latin-script during research phase
  - If only Ottoman script available for an important text, it may still be included but note the encoding challenge
  - Important: Evliya Celebi, Katip Celebi, Naima — verify translation status
  - Smallest batch (~5 works) — manageable even with script challenges

### 10. Greek (grc) — QUEUED
- **Target:** 12 works from User-curated list in `docs/greek_text_suggestions.txt`
- **Research phase: SKIP** — use the curated list directly instead of running a research agent
- **Fallback:** If a scraper can't find a specific work on Wikisource, it may spin up the research agent workflow to find a substitute
- **Prompt:** Existing `grc` prompt covers Medieval/Byzantine Greek — but new texts span different genres (theological polemic, hagiography, panegyric poetry, epigrams, patristic) and may need prompt variants
- **Considerations:**
  - Already have Historia Nova (287ch), Eustathius Odyssey (27ch), Carmina Graeca (21 works), Epitome of Histories (18ch), Semeioseis Gnomikai, Catomyomachia on Deltoi — exclude those
  - Curated list includes: Theodore Mouzalon (anti-Bekkos polemic, hagiography), Eusebius (patristic), Evagrius Ponticus (monastic), George of Pisidia (panegyric verse), Kassia (poetry/epigrams), Christopher of Mytilene (epigrams), anonymous inscriptional epigrams
  - Many are short works — chapter counts will be small (possibly 1-5 chapters each)
  - Source availability: el.wikisource.org, possibly other digital Greek text repositories (TLG, Perseus, Bibliotheca Augustana)
  - George of Pisidia and Kassia are verse — may need `textType: "poetry"` and poetry-specific prompt variant
  - Theological/polemical texts (Mouzalon, Eusebius) need careful terminology handling

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
| Polish | 12 | ~360 | 5-7 | ~360 |
| Armenian | 12 | ~240 | 5-7 | ~240 |
| Italian | 12 | ~300 | 5-7 | ~300 |
| Latin | 10 | ~300 | 3-5 | ~300 |
| Czech | 1 | ~25 | 1 | ~25 |
| Gujarati | 1 | ~20 | 1 | ~20 |
| Telugu | 1 | ~20 | 1 | ~20 |
| Turkish | 1 | ~20 | 1 | ~20 |
| Greek | 12 | ~60 | 2-3 | ~60 |
| **Total** | **~62** | **~1,345** | — | **~1,345** |

Combined with Chinese (~47 texts, ~3,358 chapters), the full queue represents ~97 texts and ~4,643 chapters.

**Translation worker policy:**
- **Size workers appropriately for the phase:** bulk translation uses 10-20 chapters per worker; final push (<50 chapters remaining) uses ~3 chapters per worker
- Scale worker COUNT proportionally: large pipelines (30+ texts) may need 30+ workers, medium (10-20) need 10-15, small (< 10) need 5-10
- **Every worker MUST have exclusive, non-overlapping chapter assignments** using `--start N --end M` flags
- **NEVER launch overlapping workers.** The skip logic does NOT prevent concurrent duplicate work — two workers hitting the same chapter simultaneously will both translate it, wasting time and API calls
- Before launching workers: query DB for remaining chapters → partition into exclusive ranges → document assignment table → then launch
- When adding workers mid-pipeline: kill existing workers on affected texts, query remaining, repartition from scratch

---

## Workflow Reference

- **Full workflow:** `docs/mass-text-pipeline-workflow.md`
- **Agent registry template:** `docs/chinese-pipeline-agents.md`
- **Pipeline status template:** `docs/chinese-pipeline-status.md`
