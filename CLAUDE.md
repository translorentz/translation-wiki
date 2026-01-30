# CLAUDE.md

Project guidance for Claude Code. For full historical context, see `ARCHIVED_CLAUDE.md`.

---

## ⚠️ CRITICAL SECURITY RULES ⚠️

**INCIDENT RECORD (2026-01-25):** A swap file `.env.local.swp` containing API keys was committed to the public repository. This is a SEVERE security breach. The Google/Gemini API key has been revoked as a result. Claude Code has apologized deeply and sincerely after this incident. Claude Code has remorsefully promised never to commit such a mistake ever again.

**MANDATORY:**
1. **NEVER stage/commit:** `.env*`, `*.swp`, `*.bak`, `*credentials*`, `*secret*`, `*token*`, `*apikey*`
2. **Before commits:** `git status` + `git diff --cached --name-only` — verify no sensitive files
3. **Use specific adds:** `git add <specific-files>` NOT `git add .` or `git add -A`
4. **Gemini FORBIDDEN** until User lifts prohibition — use DeepSeek only
5. **Pre-commit hook:** `.gitleaks.toml` + `.git/hooks/pre-commit` — NEVER bypass with `--no-verify`

---

## Session Files (READ AT START)

| File | Purpose |
|------|---------|
| `reference-guide.txt` | Current state, deployment, file locations, workflows |
| `scratch-notes.txt` | Session notes, decisions, progress |
| `ACTIVE_AGENTS.md` | **All running/completed agent IDs** — track workers here |
| `docs/text-inventory.md` | Full text list with slugs, chapters, types |

**Update continuously:** `scratch-notes.txt` as you work, `reference-guide.txt` when state changes, `CLAUDE.md` when agents launch/complete, `ACTIVE_AGENTS.md` when launching/completing agents.

**Permanent permissions:** Write to docs/logs/scratchpads, run monitoring commands, run quality-check scripts.

---

## Active Tasks (2026-01-29, Session 36)

### IN PROGRESS

| Task | Status | Notes |
|------|--------|-------|
| Chinese Mass Pipeline Translation | 8 workers | 44 texts, 1,619 chapters, see `ACTIVE_AGENTS.md` |

### SESSION 36 COMPLETED
- Chinese mass pipeline: 44 texts scraped, processed, reviewed, seeded (1,619 chapters) ✓
- Independent quality review: 44/44 texts PASS ✓
- Independent translation verification: 0 texts disqualified ✓
- Mass text pipeline workflow documented: `docs/mass-text-pipeline-workflow.md` ✓
- Text inventory updated: 100 texts total ✓

### EARLIER COMPLETED
- Epitome of Histories: consolidated + translated 18 chapters ✓
- Syair Siti Zubaidah: OCR cleaned, seeded, translated 19 chapters ✓
- Semeioseis Gnomikai: V4 cleaning B+ SATISFIED, 38/38 translated ✓
- La Scapigliatura: V2 cleaning B+ SATISFIED, 18/18 translated ✓
- Pinhua Baojian: 60/60 translated ✓
- Shiqi Shi Baijiang Zhuan: 100/100 translated ✓
- Chinese novels: Dongzhou (108), Sanbao (100), Xingshi (100) — 308 chapters ✓
- Italian novels: La Giovinezza (41), Cento Anni (21) — 62 chapters ✓
- Armenian texts: 6 texts, 195 chapters ✓
- Carmina Graeca: 21/21 translated ✓
- Catomyomachia: 6/6 translated ✓

---

## Project Overview

Public wiki for open-source translations of pre-contemporary classical texts. Side-by-side source/translation display. Users edit and endorse AI-generated translations.

**Live:** https://deltoi.com | **GitHub:** https://github.com/translorentz/translation-wiki.git

**Stack:** Next.js 16, TypeScript, tRPC, Drizzle ORM, NextAuth.js v5, Neon PostgreSQL, Vercel

**Auth:** Invite-only registration (max 100 users), credentials + Google OAuth, JWT sessions

---

## Key Commands

```bash
pnpm dev                    # Development server
pnpm build                  # Production build
pnpm db:push                # Push schema to DB
pnpm db:seed                # Seed texts
pnpm tsx scripts/translate-batch.ts --text <slug>  # Translate
```

---

## Adding New Texts

1. Raw files → `data/raw/<dirname>/`
2. Processing script → `scripts/process-<name>.ts` outputs `data/processed/<slug>/chapter-NNN.json`
3. Add author/text to `scripts/seed-db.ts`
   - **MANDATORY: Set `genre` field** — one of: `philosophy`, `commentary`, `literature`, `history`, `science`
   - Genre enables filtering on `/texts?genre=<name>` browse page
4. `pnpm tsx scripts/seed-db.ts`
5. **CHECK TRANSLATION PROMPT** (see below) — ensure `src/server/translation/prompts.ts` has a suitable prompt for this text's language, period, and genre
6. `pnpm tsx scripts/translate-batch.ts --text <slug>` (or Tamil workflow below)

**Title convention:** "English Name (Transliteration)" — e.g., "Classified Conversations of Master Zhu (Zhu Zi Yu Lei)"

---

## Translation Pipeline

- **Engine:** DeepSeek V3 (`deepseek-chat`)
- **Script:** `scripts/translate-batch.ts --text <slug> [--start N] [--end N]`
- **Batching:** zh=1500 chars, grc/la/hy=6000 chars per API call
- **Parallelization:** Split ranges across background workers
- **Skip logic:** Already-translated chapters skipped automatically

### CRITICAL: Check Translation Prompt Before Translating

**BEFORE launching any translation**, verify that `src/server/translation/prompts.ts` has a suitable prompt for the text's language, period, and genre:

| Language Code | Suitable For |
|---------------|--------------|
| `zh` | Neo-Confucian philosophical texts (Zhu Xi, Wang Yangming) |
| `zh-literary` | Chinese literary prose, novels, historical fiction |
| `grc` | Medieval/Byzantine Greek |
| `la` | Latin (chronicle, philosophy, poetry) |
| `ta` | Classical Tamil (Sangam + Medieval) |
| `it` | 15th-century Romanesco/Latin (Diarium Urbis Romae only) |
| `it-literary-19c` | 19th-century Italian literary prose (Rovani, etc.) |
| `hy` | 19th-20th century Armenian literature |

**If no suitable prompt exists:** Create one before translating. The prompt should specify the text's period, genre, terminology, and stylistic conventions. See existing prompts for examples.

**Auto-selection:** `translate-batch.ts` auto-selects `zh-literary` for Chinese literature/history and `it-literary-19c` for Italian literature based on the `genre` field.

### Armenian Translation (Special Case)

**CRITICAL:** Armenian texts MUST use DeepSeek, NOT Gemini. Gemini blocks Armenian historical content with `PROHIBITED_CONTENT` errors due to 19th-century themes (violence, oppression, genocide accounts).

- **Script:** `scripts/translate-armenian.ts --text <slug> [--start N] [--end N]`
- **Engine:** DeepSeek V3 only
- **Prompt:** `src/server/translation/prompts.ts` → `hy:` entry

---

## Tamil Workflow (3-Agent Pipeline)

**CRITICAL:** Tamil uses `@google/genai` SDK (Gemini), NOT DeepSeek.

**Agent 1 (Translator):**
1. Process raw text → JSON, seed into DB
2. Create progress file: `docs/tamil-translation-notes/<slug>-pipeline-progress.md`
3. Run `scripts/translate-tamil.ts --text <slug> --delay 5000`
4. Update progress file every ~20-30 poems
5. Mark "STAGE 1 COMPLETE" when done

**Agent 2 (Reviewer):** Launch when ≥20 poems translated
1. Review poems in batches of 15-20
2. Write `<slug>-reviewer-notes.md` and `<slug>-retranslation-requests.md`
3. Mark "STAGE 2 COMPLETE" in progress file

**Agent 3 (Retranslator):** Launch ONLY after BOTH Stage 1 AND Stage 2 COMPLETE
1. Read all reviewer notes — identify systemic prompt improvements
2. Update Tamil prompt in `prompts.ts` if needed
3. Run `scripts/translate-tamil.ts --text <slug> --retranslate --delay 5000`
4. **Editorial clarification pass (MANDATORY):** Translate Tamil terms to English with [transliteration] on first use only (e.g., "war-bard [porunar]"). After first use, English only.
5. Write `<slug>-retranslation-report.md`

**Key constraint:** Agent 3 waits for Agent 2's FULL assessment because prompt improvements are *systemic*.

**Coordination:** All agents read/write the shared progress file. Full docs: `docs/tamil-translation-orchestration.md`

---

## Dual-Agent Quality Pipeline

For texts requiring verification:
1. **Parser Agent:** Process source, write to scratchpad + collaboration doc
2. **Reviewer Agent:** Review output, grade (A-F), state SATISFIED/NOT SATISFIED
3. Iterate until Reviewer SATISFIED (B+ minimum)
4. Seed to DB, launch translation workers

Joint doc: `docs/<pipeline>-collaboration.md`

---

## Iterative Cleaning Pipeline (for complex OCR texts)

**Use case:** Bilingual parallel editions, heavy apparatus contamination, multiple volumes

**Architecture:** Parallel Cleaner-Evaluator agent pairs per volume

| Role | Responsibility | Writes To |
|------|---------------|-----------|
| **Cleaning Agent** | Creates cleaning modules, filters contamination, iterates | `docs/<text>-vN-cleaning-scratch.md` |
| **Evaluation Agent** | Samples output, grades quality, provides feedback | `docs/<text>-vN-evaluation-scratch.md` |

**Workflow:**
1. Create workspace: `scripts/lib/<text>-cleaning-vN/` with modules:
   - `patterns.ts` — Regex for apparatus, Latin, citations
   - `filters.ts` — Detection functions
   - `validators.ts` — Quality verification
   - `cleaner.ts` — Main pipeline
2. Cleaning Agent processes, writes to clean output directory
3. Evaluation Agent samples ≥50 paragraphs, calculates contamination rate
4. Evaluator grades (A-F) and writes specific feedback
5. Cleaner reads feedback, fixes issues, reprocesses
6. **Iterate until BOTH agents agree on B+ grade** (< 5% contamination)

**Grading criteria for B+:**
- Less than 5% apparatus contamination
- Less than 2% Latin/foreign text leakage
- No FONTES/citation blocks
- Clean paragraph boundaries (no fragments)
- Coherent text flow

**Evaluator powers:**
- Can use DeepSeek trial translations to test readability
- Can reject claimed grades with evidence
- Must provide specific examples of problems

**Example (Epitome of Histories):**
- Vol 1: D → B+ in 3 iterations ✅
- Vol 2: D → C+ (needs iteration)
- Vol 3: D → D+ (cleaning not applying)

---

## Workflow Index

| Workflow | When | Key Script / Doc |
|----------|------|-----------------|
| Standard Text | Clean source | `scripts/process-<name>.ts` |
| OCR Processing | Noisy scans | `scripts/lib/<name>/` multi-module |
| TEI-XML | Greek XML | `scripts/lib/greek-xml/` |
| Mass Text Pipeline | Batch scrape+translate 10-50+ texts | `docs/mass-text-pipeline-workflow.md` |
| Tamil Pipeline | All Tamil (Gemini) | `scripts/translate-tamil.ts` |
| Armenian Translation | All Armenian (DeepSeek) | `scripts/translate-armenian.ts` |
| Batch Translation | zh/grc/la/it | `scripts/translate-batch.ts` |

---

## Schema Notes

- `texts.textType`: "prose" | "poetry" (poetry shows line numbers)
- `texts.compositionYear`: integer (negative for BCE)
- Versioning: append-only `translation_versions`
- Paragraph alignment: source + translation share matching indices

---

## Technical Conventions

- **Paragraph alignment is fundamental** — source and translation must maintain matching indices
- **Versioning is append-only** — never mutate/delete a TranslationVersion; edits create new versions
- **Endorsements are version-specific** — point to TranslationVersion ID, not Translation head
- **Unicode correctness is critical** — CJK, polytonic Greek (ά, ὁ, ῆ), Latin all need proper UTF-8
- **Source texts are immutable** — `Chapter.sourceContent` set during seeding, never modified
- **URLs are human-readable** — slugified paths like `/grc/eustathius/eustathius-odyssey/chapter-1`

---

## External Resources

| Resource | URL |
|----------|-----|
| ctext.org API | https://ctext.org/tools/api |
| De Ceremoniis scan | https://archive.org/details/bub_gb_OFpFAAAAYAAJ |
| Princeton Byzantine | https://byzantine.lib.princeton.edu/byzantine/translation/16010 |
| Digital Dante (layout ref) | https://digitaldante.columbia.edu/ |
| Drizzle ORM docs | https://orm.drizzle.team/ |
| NextAuth.js docs | https://next-auth.js.org/ |
| tRPC docs | https://trpc.io/ |

---

## Current Texts Summary

**Languages:** zh (Chinese), grc (Greek), la (Latin), ta (Tamil), hy (Armenian), it (Italian), ms (Malay)

**~100 texts, ~4,300+ chapters** — See `docs/text-inventory.md` for complete list with slugs, chapter counts, and types.

Key collections:
- **Chinese:** 44 new texts from mass pipeline (1,619ch), Shisan Jing Zhushu (455 across 13 texts), Zhu Zi Yu Lei (140), plus 10 other texts
- **Greek:** Historia Nova (287), Eustathius Odyssey (27), Carmina Graeca (21), Epitome (18)
- **Latin:** Lombards (82), Regno (56), Diarium (66)
- **Armenian:** 6 texts (195 total)
- **Tamil:** Nandikkalambakam (114), Yashodhara (330 verses), Udayanakumara (366 verses)
- **Italian:** 4 texts (146 total)
- **Malay:** Syair Siti Zubaidah (19)

---

## Key Directories

```
src/
├── app/                    # Next.js pages
├── components/interlinear/ # InterlinearViewer, ParagraphPair
├── server/db/              # Drizzle schema
├── server/translation/     # prompts.ts
scripts/
├── seed-db.ts              # Seeding
├── translate-batch.ts      # DeepSeek translation (zh/grc/la)
├── translate-armenian.ts   # DeepSeek Armenian translation
├── translate-tamil.ts      # Gemini Tamil translation
├── process-*.ts            # Text processing scripts
data/
├── raw/                    # Source files (gitignored)
├── processed/              # Structured JSON (committed)
docs/
├── tamil-translation-notes/
├── *-collaboration.md      # Dual-agent docs
├── *-scratchpad.md         # Agent working notes
```

---

## Reminders

1. **Read** `reference-guide.txt`, `scratch-notes.txt`, and `ACTIVE_AGENTS.md` at session start
2. **Write** to `scratch-notes.txt` continuously as you work
3. **Update** `ACTIVE_AGENTS.md` when launching/completing agents (include agent IDs!)
4. **Update** this file when major state changes
5. **Never leave stale info** — mark COMPLETE everywhere when done
6. **Security:** verify every commit with `git status` + `git diff --cached`

---

## Critical Bugs to Watch

### Armenian "Delays" Unicode Corruption (FIXED but watch for recurrence)

Armenian Unicode characters (U+0530-U+058F) were corrupted during development, with the word "delays" incorrectly substituted in code files, docs, and processed JSON. **Raw source files in `data/raw/` are correct UTF-8.**

**Symptoms:** Armenian text displays as "delays" instead of Հայdelays (Armenian script)

**Prevention:**
- Use Unicode escape sequences when adding Armenian programmatically (e.g., `\u0540` for Հ)
- Never copy-paste Armenian from potentially corrupted sources
- If "delays" appears in Armenian context, check processing scripts

**Fix report:** `docs/armenian-delays-fix-report.md`

### Yashodhara Commentary Contamination

`process-yashodhara-kaviyam.ts` strips commentary from file 1 but NOT file 2. Chapters 3-5 are contaminated. **Stage 3 must fix script and re-seed BEFORE retranslating.** See `ACTIVE_AGENTS.md` for details.
