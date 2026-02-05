# CLAUDE.md

Project guidance for Claude Code. For full historical context, see `ARCHIVED_CLAUDE.md`.

---

## ⚠️ CRITICAL SECURITY RULES ⚠️

**INCIDENT RECORD (2026-01-25):** A swap file `.env.local.swp` containing API keys was committed to the public repository. This is a SEVERE security breach. The Google/Gemini API key has been revoked as a result. Claude Code has apologized deeply and sincerely after this incident. Claude Code has remorsefully promised never to commit such a mistake ever again.

**MANDATORY:**
1. **NEVER stage/commit:** `.env*`, `*.swp`, `*.bak`, `*credentials*`, `*secret*`, `*token*`, `*apikey*`
2. **NEVER commit `*.txt` or `*.md` files** (except `README.md`, `CLAUDE.md`, `ARCHIVED_CLAUDE.md`, `ACTIVE_AGENTS.md`) — session notes, scratch files, and documentation drafts are gitignored and should stay local
3. **Before commits:** `git status` + `git diff --cached --name-only` — verify no sensitive files
4. **Use specific adds:** `git add <specific-files>` NOT `git add .` or `git add -A`
5. **Gemini RESTORED** (2026-01-30) Access to Gemini was revoked by the User after a security incident, but after painstaking work, Claude Code has restored trust with the User. Gemini API use as second opinion only when DeepSeek translations are poor
6. **Pre-commit hook:** `.gitleaks.toml` + `.git/hooks/pre-commit` — NEVER bypass with `--no-verify`
7. **NEVER use Haiku model for subagents** — Haiku agents have caused data corruption (duplicate fields, wrong recategorizations, unnecessary re-seeding). Always use `sonnet` or `opus` for subagents.
8. **NEVER hardcode credentials in scripts** — always use `process.env.DATABASE_URL` or equivalent. A subagent wrote a plain-text Neon password into `seed-kalahasti-chapter.mjs` (2026-01-31); gitleaks blocked the commit but the credential was on disk. All DB connections in scripts MUST read from environment variables.

---

## ⚠️ SUBAGENT GUARDRAILS ⚠️

**INCIDENT RECORD (2026-01-29):** A Haiku subagent tasked with recategorizing 2 texts added duplicate `textType`/`genre` fields to ~40 entries in seed-db.ts, wrongly recategorized 3 additional texts, added fields to an author entry, and ran a full re-seed unnecessarily. All damage had to be manually reverted.

**MANDATORY for all subagents that modify code or data:**
1. **NEVER use `model: "haiku"`** — always use `sonnet` (default) or `opus`
2. **Scope discipline:** Subagents must ONLY modify what they are explicitly asked to modify. If asked to change 2 entries, change exactly 2 entries — not 40.
3. **No re-seeding without authorization:** `pnpm tsx scripts/seed-db.ts` is insert-or-skip — it cannot update existing records. Never run it to "apply" a genre/field change. Use direct SQL for DB updates.
4. **Diff review:** After any subagent that edits files, always run `git diff` to verify the changes are scoped correctly before accepting them. Revert and redo manually if the agent overreached.
5. **Prefer direct edits for small changes:** For tasks involving ≤5 file edits, do them directly instead of spawning a subagent. Subagents are for large, well-defined tasks (scraping, translation, evaluation).

**MANDATORY for review/analysis subagents:**
6. **Use scripts, not context** — NEVER load entire books into context to analyze them. Use bash commands, regex, jq, wc, grep, etc. to check structure and content programmatically. Context is expensive; scripts are cheap.
7. **Check structure first** — Before checking text quality, verify fundamental structure (chapter counts, file organization, segmentation).
8. **Explicit checklist** — When given a review task, verify EVERY item on the checklist. If chapter segmentation is listed, actually check it with `ls *.json | wc -l`.
9. **Use DeepSeek-reasoner for independent reviews** — When launching a review agent that must be OBJECTIVE and independent (e.g., quality verification of cleaned data, second-opinion reviews), invoke DeepSeek-reasoner via the DeepSeek API (`DEEPSEEK_API_KEY` in `.env.local`, model `deepseek-reasoner`). This provides an external perspective free from Claude's potential biases or blind spots.

**PERMISSIONS for all subagents:**
10. **Autonomous bash execution** — All subagents are pre-authorized to run bash commands for programs (translation scripts, seeding scripts, processing scripts, quality checks, database queries) without prompting the User for confirmation. This enables efficient parallel processing of large translation pipelines.

**AUTONOMY requirements (User directive 2026-02-03):**
11. **Self-reporting completion** — Subagents must report their completion status autonomously without requiring manual checking or User intervention. The User should not have to ask "is this done?" — subagents should proactively report their progress and completion.

---

## ⚠️ USER STIPULATIONS (MANDATORY) ⚠️

**Document ALL User orders with correct deference, understanding and diligence.**

### Text Descriptions (General)
All text descriptions should be **thoughtful** — not generic or boilerplate.

### Twenty-Four Histories Descriptions (Specific)
**Stipulation (2026-02-03):** Descriptions for the 24 Histories must include:
1. **Time period** — describe what era/period the text covers
2. **Principal characters/incidents** — name a few notable figures or events found within
3. **Importance** — explain why the text matters historically or culturally
4. **Specific context** — what unique perspective or information the text provides
5. **Existing scholarly translations** — if an authoritative scholarly translation exists (complete or incomplete), note it and advise scholars to prefer that version for covered chapters

**Example (Shiji):** Notes that William H. Nienhauser, Jr., ed., "The Grand Scribe's Records" (Indiana University Press, 1994–) is an incomplete but authoritative translation that scholars should consult.

**Example:** A history covering 206 BCE–23 CE should mention specific emperors, generals, or scholars; explain what distinguishes it from other sources; and note its historiographical significance.

**Applies to:** The 24 Histories texts in `data/24h-pipeline/text-descriptions.json` and their database records.

---

## ⚠️ DEPLOYMENT & SCHEMA LESSONS ⚠️

**INCIDENT RECORD (2026-02-03):** Adding `sortOrder` column to schema failed to deploy due to unrelated TypeScript error in `scripts/` directory.

### Key Findings

1. **Schema changes require successful deployment to take effect**
   - Adding a column to `src/server/db/schema.ts` only works when Vercel successfully builds and deploys
   - Drizzle ORM infers types from the schema at build time — if build fails, old schema is served
   - Always verify deployment status after pushing schema changes: `gh api repos/<owner>/<repo>/deployments --jq '.[0]'`

2. **The `scripts/` directory should be excluded from TypeScript build**
   - Standalone scripts (processing, cleaning, seeding) run via `tsx` and don't need to pass `pnpm build`
   - `tsconfig.json` now includes `"scripts"` in the `exclude` array (commit 27e3b17)
   - This prevents unrelated script errors from blocking Next.js deployments

3. **Deployment failure diagnosis workflow**
   ```bash
   # Check recent deployments
   gh api repos/translorentz/translation-wiki/deployments --jq '.[0:3] | .[] | "\(.environment) - \(.sha[0:7]) - \(.created_at)"'

   # Check deployment status
   gh api repos/translorentz/translation-wiki/deployments/<id>/statuses --jq '.[0].state'

   # If failed, reproduce locally
   pnpm build
   ```

4. **Database vs Schema distinction**
   - Database can have columns that the ORM doesn't know about (added via raw SQL)
   - ORM only returns columns defined in the schema
   - Both must be in sync: database column EXISTS + schema column DEFINED + deployment SUCCEEDED

### sortOrder Column Usage

The `sortOrder` column enables canonical ordering within author collections:
- **Purpose:** Display texts in meaningful order (e.g., chronological) rather than alphabetical
- **Scope:** Applies within an author group on the browse page
- **Values:** Integer (1, 2, 3...) — lower numbers appear first
- **Example:** Twenty-Four Histories use sortOrder 1-24 for chronological display

---

## Kimi K2 for Difficult Tasks

**Available:** The `KIMI_SUBAGENT_KEY` in `.env.local` provides access to Moonshot AI's Kimi K2 model.

**When to use:** For especially difficult tasks that require:
- Deep multi-step reasoning
- Complex planning and analysis
- Extended thinking chains (200-300+ sequential steps)
- Cross-checking Claude's analysis on hard problems

**Script:** `scripts/kimi-k2-helper.ts`

```bash
# Basic query
pnpm tsx scripts/kimi-k2-helper.ts --prompt "Your question here"

# From file with output
pnpm tsx scripts/kimi-k2-helper.ts --file prompt.txt --output response.md

# Options
--model thinking   # kimi-k2-thinking-turbo (default, best for reasoning)
--model turbo      # kimi-k2-turbo-preview
--model preview    # kimi-k2-0905-preview
--temperature 0.6  # default
--max-tokens 4096  # default
```

**API Details:**
- Base URL: `https://api.moonshot.ai/v1`
- Context window: 256K tokens
- OpenAI-compatible API format

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

## Active Tasks (2026-02-04, Session 44)

### IN PROGRESS — Twenty-Four Histories (二十四史) Pipeline
- **Phase 6 (Translation):** Xin Tangshu workers W1-W8 running
- **Status:** Shiji (130/130) ✓, Hanshu (110/110) ✓, Xin Tangshu in progress
- See `ACTIVE_AGENTS.md` for full agent tracking

### SESSION 44 COMPLETED
- Latin Batch 3: 9 texts, 25 chapters translated ✓
- Analecta Laertiana reprocessed: 1ch → 5ch (proper section boundaries) ✓
- Latin B3 description review: 7 descriptions improved ✓
- De vita et moribus: DEFERRED (tri-lingual OCR issue in 1886 edition)
- Tamil Batch: 6 texts, 21/21 chapters translated via Gemini ✓
  - Nalavenba (4ch), Moovarul (3ch), Takka Yaaga Parani (9ch), Nanneri (1ch), Dandi Alankaram (3ch), Bharata Senapathiyam (1ch)

### SESSION 43 COMPLETED
- Kimi K2 helper script created (`scripts/kimi-k2-helper.ts`) ✓
- Documentation added for Kimi K2 API usage ✓

### SESSION 42 COMPLETED
- Latin Batch 2: 14 texts, 102 chapters translated ✓
- Russian: 8 texts, 235/235 chapters translated ✓
- Modern Greek: 3 texts (15ch) translated ✓
- Byzantine Greek: 4 texts (5ch) translated ✓
- De' sorbetti: 1 text translated ✓

### SESSION 41 COMPLETED
- Latin: 2 texts (16ch) translated ✓
- Greek: 2 texts (2ch) translated ✓
- Czech: 1 text (14ch) seeded + translated ✓
- Telugu: 116 verses merged → 1 chapter, translated ✓
- Italian W1 (32ch), W3b (25ch), W4 (29ch) complete ✓
- De Sorbetti: ABANDONED
- Polish: 231/231 COMPLETE ✓
- Homepage highlights section ✓

### SESSION 40 COMPLETED
- Polish W3-W7: all 11 texts, 231/231 translated ✓
- Italian verification: 8/15 viable ✓
- Italian Processor A+B: 8 texts, 153 chapters, 6,466 paragraphs ✓
- Italian Quality Review + Cleanup: all 7 viable texts grade A ✓
- Documented Standard Multi-Language Pipeline workflow in CLAUDE.md ✓

### SESSION 39 COMPLETED
- Polish pipeline Phases 0-6: language setup, verification, processing, review, seeding ✓
- Polish W1+W2: dzieje-grzechu 65/65 chapters translated ✓
- Armenian pipeline: verified 18 candidates, processed + translated Payqar (18ch) ✓
- Blurb agent: ~138 descriptions rewritten ✓
- Title agent: ~2,087 chapter titles updated ✓
- Greek added to pipeline queue (priority 10, 12 works from curated list) ✓

### EARLIER COMPLETED
- Chinese mass pipeline: ~3,356/3,358 chapters (99.94%) ✓
- All previous texts (see text-inventory.md for full list) ✓

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
pnpm tsx scripts/seed-chapters-only.ts --text <slug>  # Fast: seed chapters for specific texts only
pnpm tsx scripts/translate-batch.ts --text <slug>  # Translate
```

**⚠️ NEVER use `seed-db.ts`** — The full seeder iterates ~4,300+ chapters and is too slow for this project. Instead, write a targeted script (e.g., `scripts/seed-latin-batch2.ts`) that inserts only the new authors/texts, then use `seed-chapters-only.ts` for chapters.

---

## Adding New Texts

1. Raw files → `data/raw/<dirname>/`
2. Processing script → `scripts/process-<name>.ts` outputs `data/processed/<slug>/chapter-NNN.json`
3. Add author/text to `scripts/seed-db.ts`
   - **MANDATORY: Set `genre` field** — one of: `philosophy`, `commentary`, `literature`, `history`, `science`, `ritual`
   - Genre enables filtering on `/texts?genre=<name>` browse page
4. **Seeding (two-step):**
   - `pnpm tsx scripts/seed-db.ts` — Run ONCE to insert the new language/author/text rows. This iterates the full catalogue (~4,300+ chapters) doing insert-or-skip, so it is slow (~minutes). Only needed when adding new author or text metadata.
   - `pnpm tsx scripts/seed-chapters-only.ts --text <slug>` — Run this to insert chapters for specific texts. Fast (~seconds). Safe to re-run (idempotent). **This is the preferred method for incremental seeding.**
   - **NEVER run seed-db.ts from a subagent** — it wastes tokens and time. Use seed-chapters-only.ts instead.
5. **CHECK TRANSLATION PROMPT** (see below) — ensure `src/server/translation/prompts.ts` has a suitable prompt for this text's language, period, and genre
6. `pnpm tsx scripts/translate-batch.ts --text <slug>` (or Tamil workflow below)

**Title convention:** "English Name (Transliteration)" — e.g., "Classified Conversations of Master Zhu (Zhu Zi Yu Lei)"

---

## Translation Pipeline

- **Engine:** DeepSeek V3 (`deepseek-chat`)
- **Script:** `scripts/translate-batch.ts --text <slug> [--start N] [--end N]`
- **Batching:** zh=1500 chars, grc/la=2500 chars per API call (reduced 2026-02-05 to prevent truncation)
- **Solo paragraphs:** Paragraphs >1500 chars get their own batch to prevent re-segmentation
- **Parallelization:** Split ranges across background workers
- **Skip logic:** Already-translated chapters skipped automatically (but does NOT prevent concurrent duplicate work — see rule below)

### CRITICAL: Efficiency is the First Priority

**INCIDENT RECORD (2026-02-03):** Multiple workers were launched on overlapping chapter ranges, racing to translate the same content. This is a scandalous waste of resources. The User explicitly stated that efficiency is the first priority when translating an enormous work like the Twenty-Four Histories (~3,279 chapters).

**MANDATORY:** Never allow duplicate or competing workers. "First to translate wins" is NEVER acceptable — it wastes API calls, time, and money.

### CRITICAL: Verify Data Quality BEFORE Translation

**INCIDENT RECORD (2026-02-03):** The Twenty-Four Histories scraping process was shockingly wasteful:
1. **First scrape:** Acquired ~3,279 chapters
2. **Footnote marker removal:** Removed markers but LEFT footnote content as orphan paragraphs
3. **Translation started:** ~50 chapters translated with contaminated data (commentary mixed into main text)
4. **Discovery:** Hanshu chapter 20 contained contextless commentary paragraphs from footnotes
5. **Result:** All translations invalid, potential full re-scrape required

**MANDATORY for any text acquisition:**
1. **Examine Wikisource raw HTML** before processing — understand the structure (main text vs notes vs commentary)
2. **Test processing on sample chapters** — verify output contains ONLY main text
3. **Independent review** of processed output before seeding
4. **Never rush to translation** — data quality verification is not optional

**The cost of re-scraping is far less than the cost of translating garbage data.**

### Independent Review Agents

**MANDATORY:** When deploying independent review agents to assess data quality, code quality, or translation quality:
1. **Respect their judgement** — their independent assessment takes precedence over assumptions
2. **Be deferential** — do not override or dismiss their findings without explicit User approval
3. **Comprehensive sampling** — review agents must sample broadly, not just spot-check
4. **Document findings** — all review agent conclusions must be documented for the record
5. **Use multiple models for objectivity** — intermix DeepSeek-reasoner and Kimi K2 review agents for diverse perspectives

**Available review models:**
- **DeepSeek-reasoner** — via `DEEPSEEK_API_KEY`, model `deepseek-reasoner`
- **Kimi K2** — via `KIMI_SUBAGENT_KEY`, use `scripts/kimi-k2-helper.ts` (see Kimi K2 section below)

### CRITICAL: Worker Assignment Discipline

**Each worker MUST have exclusive, non-overlapping chapter assignments.** The skip logic only checks the DB before starting a chapter. If two workers reach the same untranslated chapter simultaneously, both will translate it — wasting API time and blocking the pipeline. This wastes not just money but TIME, which is the more valuable resource.

**Rules (MANDATORY — think carefully before every worker launch):**
1. **Query first:** Before launching ANY workers, run a DB query to get the exact list of remaining untranslated chapters
2. **Partition strictly:** Divide remaining chapters into exclusive, non-overlapping ranges — every chapter assigned to exactly one worker
3. **Use --start and --end flags:** Always specify `--text X --start N --end M` — never launch a worker on a whole text if other workers might touch it
4. **Size workers appropriately for the phase:** During bulk translation, larger ranges (10-20 chapters) per worker are fine. During the final push (few workers left, <50 chapters remaining), size workers at ~3 chapters each for fast turnaround
5. **Never add workers to "help" existing workers on the same text** without first killing the existing worker and repartitioning
6. **Document the assignment table** before launching — write out which worker gets which chapters, verify no overlap, then launch

**Self-direction:** When workers complete, immediately progress to the next workflow phase without waiting for the user to prompt. Check `docs/pipeline-queue.md` and `docs/mass-text-pipeline-workflow.md` for what comes next.

**Anti-patterns (NEVER do these):**
- Launching multiple workers on the same text without chapter ranges
- "Throwing more workers at it" without checking what's already running
- Assigning 7–10 chapters per worker when you could use 3
- Adding late-stage workers without querying remaining chapters and repartitioning from scratch

### CRITICAL: Paragraph Alignment Verification

**INCIDENT RECORD (2026-02-05):** Gregory of Nazianzus translations had paragraph content SHIFTED even though paragraph COUNTS matched. The LLM re-segmented based on internal section markers (5.1, Αʹ, etc.), putting content from source paragraph 4 into translation paragraph 5. This caused cascading misalignment throughout chapters.

**Root Cause:** Source paragraphs can contain multiple numbered sections (e.g., sections 4.3, 4.4, 4.5, 5.1, 5.2 all merged in one paragraph). The LLM interpreted these as paragraph boundaries and split them.

**Fixes Applied (2026-02-05):**
1. Reduced Greek/Latin batch size from 6000 → 2500 chars
2. Long paragraphs (>1500 chars) now processed solo to prevent re-segmentation
3. Removed `realignParagraphs` fallback — mismatches now throw errors
4. Added explicit prompt instructions: "Section numbers are NOT paragraph boundaries"
5. Added length ratio validation to detect truncation

**MANDATORY for translation verification:**
1. **Test translation** on a representative chapter before bulk translation
2. **Verify CONTENT alignment** — check that specific text appears in correct paragraph, not just that counts match
3. **Check long paragraphs** — paragraphs with multiple internal sections are prone to re-segmentation
4. **If misalignment found:** Stop all workers, delete translations, fix code, restart

**The paragraph count matching (29=29) is INSUFFICIENT validation.** Content can still be in wrong paragraphs.

### CRITICAL: Check Translation Prompt Before Translating

**BEFORE launching any translation**, verify that `src/server/translation/prompts.ts` targets translation into British English and has a suitable prompt for the text's language, period, and genre:

| Language Code | Suitable For |
|---------------|--------------|
| `zh` | Neo-Confucian philosophical texts (Zhu Xi, Wang Yangming) |
| `zh-literary` | Chinese literary prose, novels, historical fiction |
| `grc` | Medieval/Byzantine Greek |
| `la` | Latin (chronicle, philosophy, poetry) |
| `ta` | Classical Tamil (Sangam + Medieval) |
| `it` | 15th-century Romanesco/Latin (Diarium Urbis Romae only) |
| `it-literary-19c` | 19th-century Italian literary prose (Rovani, Imbriani, etc.) |
| `it-nonfiction-19c` | 18th-19th century Italian non-fiction (philosophy, science, history) |
| `hy` | 19th-20th century Armenian literature |

**If no suitable prompt exists:** Create one before translating. The prompt should specify the text's period, genre, terminology, and stylistic conventions. See existing prompts for examples.

**Auto-selection:** `translate-batch.ts` auto-selects prompts based on text slug and genre:
- **Twenty-Four Histories** → `zh-{slug}` (e.g., `zh-shiji`, `zh-hanshu`, `zh-hou-hanshu`) — 24 text-specific prompts
- Chinese literature/history (other) → `zh-literary`
- Italian literature → `it-literary-19c`

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

## Standard Multi-Language Pipeline (for new languages/batches)

**Use case:** Adding a new language or batch of texts from Wikisource, Gutenberg, or Archive.org. This is the standard 6-phase workflow used for Polish, Armenian, Italian, and future language batches.

### Phase 1 — Verification
- **Input:** A suggestions file (e.g., `docs/italian_text_suggestions.txt`) with author-title pairs
- **Agent:** Verification agent checks each text for:
  - Source availability (Wikisource transcribed text, Gutenberg HTML, Archive.org OCR)
  - Chapter count and structure
  - Existing English translations (reject if already translated)
  - Text size feasibility
  - Source quality (proofread %, OCR vs transcribed, archaic typography)
- **Output:** `data/<lang>-pipeline/verified-texts.json` with viable/not-viable verdicts
- **Pass criterion:** Text must have clean, accessible source text. DjVu-only or <25% Wikisource completion = not viable without OCR pipeline.

### Phase 2 — Processing
- **Agents:** 2 processor agents split the viable texts
- **Task:** Scrape source text, structure into `data/processed/<slug>/chapter-NNN.json`
- **JSON format:** `{ "title": "Italian Title (English Title)", "paragraphs": ["para1", "para2", ...] }`
- **Title convention:** Include English translation for non-Latin-script titles; Italian/Latin/etc. titles include English in parentheses
- **Clean:** Remove HTML artifacts, footnote markers, page numbers, Wikisource navigation
- **Output:** Chapter JSON files in `data/processed/<slug>/`

### Phase 3 — Quality Review (MANDATORY GATE)

**⚠️ INCIDENT #1 (2026-02-03):** Latin Batch 2 was seeded and translation started without quality review. The texts had severe OCR artifacts (�� characters), apparatus contamination (critical notes, variant readings), page headers mixed in, and line numbers as separate paragraphs. Translation had to be stopped and restarted. **This phase is NOT optional.**

**⚠️ INCIDENT #2 (2026-02-03):** Despite a re-review being requested with chapter segmentation explicitly flagged, the review agent checked only text quality but missed that **all 14 texts were dumped into single chapters** — including chronicles spanning 40+ years that should have been segmented by year/decade. The agent loaded entire books into context instead of using scripts to check structure.

**MANDATORY for review agents:**
1. **Use scripts, not context** — Do NOT load entire books into context. Use bash/regex to check:
   - `ls data/processed/<slug>/*.json | wc -l` — count chapter files
   - `jq '.paragraphs | length' chapter-001.json` — count paragraphs
   - `grep -E 'Anno|Era|Year|\[1[0-9]{3}\]' chapter-001.json` — detect year markers
2. **Verify chapter segmentation FIRST** — Before checking text quality, verify the text was properly split
3. **Chronicles spanning multiple years MUST be segmented** — by year, decade, or era

- **Agent:** Independent review agent samples chapters from ALL processed texts
- **MUST check for:**
  1. **Chapter segmentation** — FIRST CHECK. Count files per text. Chronicles spanning years must be segmented.
  2. **OCR artifacts** — garbage characters (��, □), garbled text
  3. **Apparatus contamination** — critical notes (cfr., Sil. Ital.), variant readings, manuscript sigla
  4. **Page headers/footers** — titles and page numbers mixed into text
  5. **Line numbers** — numbers (5, 10, 15, 20...) appearing as separate paragraphs
  6. **Footnotes** — scholarly notes embedded in main text
  7. **Paragraph structure** — proper delineation, not fragmented
- **Sampling:** Use bash to check structure first. Then read first 50 lines + middle section of EACH text. Do not trust processing agent output blindly.
- **Grading:** A-F scale. **Must reach B+ before proceeding to Phase 4.**
- **If issues found:** Reprocess with cleaning scripts. Do NOT proceed to seeding.
- **Output:** `docs/<pipeline>-quality-review.md` with per-text grades and specific issues

### Phase 4 — Seeding
- **⚠️ PREREQUISITE:** Phase 3 quality review MUST be complete with all texts at B+ grade. Do not seed unreviewed texts.
- **⚠️ NEVER use `seed-db.ts`** — too slow (~4,300+ chapters). Write a targeted script instead.
- **Create a batch-specific script** (e.g., `scripts/seed-latin-batch2.ts`) that:
  1. Defines only the new authors and texts
  2. Inserts them with insert-or-skip logic
  3. Then call `seed-chapters-only.ts` for the chapters
- **Still add entries to `seed-db.ts`** for reference (the canonical list of all texts), but don't run it.
- **MANDATORY:** Set `genre` field (philosophy, commentary, literature, history, science, ritual)
- **Chapter seeding:** `pnpm tsx scripts/seed-chapters-only.ts --text <slug1> --text <slug2> ...` — FAST (~seconds)
- **Verify:** Check DB for correct chapter counts

### Phase 5 — Translation Prompt Check
- **Check `src/server/translation/prompts.ts`** for a suitable prompt matching the text's language, period, and genre
- **Auto-selection rules:** `translate-batch.ts` auto-selects variant prompts based on text slug and genre:
  - Twenty-Four Histories → `zh-{slug}` (text-specific prompts)
  - Chinese literature/history (other) → `zh-literary`
  - Italian literature → `it-literary-19c`
- **If no suitable prompt:** Create one before translating. Include period, genre, terminology conventions, stylistic guidance.
- **Language-specific scripts:** Armenian uses `translate-armenian.ts`, Tamil uses `translate-tamil.ts`, all others use `translate-batch.ts`

### Phase 6 — Translation
- **Split** texts across multiple background workers by chapter range
- **Script:** `pnpm tsx scripts/translate-batch.ts --text <slug> [--start N] [--end N]`
- **Monitor:** Track workers in ACTIVE_AGENTS.md with agent IDs, chapter ranges, status
- **Skip logic:** Already-translated chapters are automatically skipped
- **Gap check:** After all workers complete, verify no chapters were missed

### Pipeline Data Files
| File | Purpose |
|------|---------|
| `docs/<lang>_text_suggestions.txt` | User-provided text suggestions |
| `data/<lang>-pipeline/verified-texts.json` | Verification results |
| `data/processed/<slug>/chapter-NNN.json` | Processed chapter files |

### Completed Pipelines
| Language | Texts | Chapters | Status |
|----------|-------|----------|--------|
| Chinese (zh) | ~50 | ~3,358 | COMPLETE (99.94%) |
| Greek (grc) | ~14 | ~500+ | COMPLETE (clean texts; Pisidia inaccessible) |
| Latin (la) | ~30 | ~385+ | COMPLETE (Batch 1 + 2 + 3; 3 OCR texts deferred) |
| Tamil (ta) | ~11 | ~520+ | COMPLETE (5 original + 6 new batch) |
| Armenian (hy) | 7 | ~213 | COMPLETE |
| Italian (it) | 9 | ~147 | ~92% (W2+W3a finishing) |
| Polish (pl) | 11 | 231 | COMPLETE |
| Malay (ms) | 1 | 19 | COMPLETE |
| Czech (cs) | 1 | 14 | COMPLETE |
| Telugu (te) | 1 | 1 (116 verses) | COMPLETE |
| Russian (ru) | 8 | 235 | COMPLETE |

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

## Chapter Title Convention

**Every chapter title MUST include an English translation** displayed in grey on the chapter index page. The `parseChapterTitle()` utility in `src/lib/utils.ts` extracts the English portion.

**Supported formats:**
- `"原文標題 (English Title)"` — parenthetical (preferred for CJK, Greek, etc.)
- `"Հայeren — English Title"` — em-dash (used for Armenian)

**Examples:**
- `"爵 (Ranks and Titles)"` → shows "爵" with grey "(Ranks and Titles)"
- `"Գლուխ 1 — Chapter 1"` → shows "Գլុხ 1" with grey "Chapter 1"
- `"Tom pierwszy, I (Volume One, Chapter I)"` → shows original with grey English

**Rules:**
- If the title is already in English/Latin script only (e.g. Italian, Latin, Polish), no translation needed
- For CJK, Greek, Armenian, Tamil, Malay: always include English in parentheses or em-dash
- For numbered-only titles like "第一卷" or "Κεφάλαιο Α", translate: "第一卷 (Volume 1)"
- Titles are stored in `chapters.title` DB column (varchar 500) and in `data/processed/<slug>/chapter-NNN.json`

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

**Target Language:** The target language is English (UK) with British spelling and conventions.

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
