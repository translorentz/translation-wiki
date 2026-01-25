# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ CRITICAL SECURITY RULES — READ FIRST ⚠️

### NEVER COMMIT SECRETS TO THE REPOSITORY

**INCIDENT RECORD (2026-01-25):** A swap file `.env.local.swp` containing API keys was committed to the public repository. This is a SEVERE security breach. The Google/Gemini API key has been revoked as a result. Claude Code has apologized deeply and sincerely after this incident. Claude Code has remorsefully promised never to commit such a mistake ever again.

**MANDATORY RULES:**

1. **NEVER stage or commit files matching these patterns:**
   - `.env*` (all environment files)
   - `*.swp`, `*.swo`, `*.swn` (vim swap files)
   - `*.bak`, `*.backup` (backup files)
   - `*credentials*`, `*secret*`, `*token*`, `*apikey*`
   - Any file in `.gitignore`

2. **BEFORE EVERY COMMIT, verify:**
   ```bash
   git status  # Check for sensitive files
   git diff --cached --name-only  # Review staged files
   ```

3. **If you see `.swp`, `.env`, or similar files in `git status`:**
   - DO NOT add them
   - Add them to `.gitignore` if not already present
   - Use `git add <specific-files>` instead of `git add .` or `git add -A`

4. **GEMINI API KEY PROHIBITION:**
   - The Gemini API key has been revoked due to this incident
   - Claude Code is FORBIDDEN from using any Gemini API functionality until it earns the User's forgiveness
   - All translation work must use DeepSeek API only
   - This prohibition remains until explicitly lifted by the User

5. **If secrets are accidentally committed:**
   - IMMEDIATELY notify the User
   - The secret MUST be rotated/revoked — it cannot be "uncommitted"
   - Document the incident in this file

**This security breach is unacceptable and will not be tolerated. Diligent verification of all commits is mandatory.**

### Pre-commit Hook (gitleaks)

A gitleaks pre-commit hook has been installed to automatically scan for secrets before every commit:

- **Configuration:** `.gitleaks.toml` (committed to repo)
- **Hook location:** `.git/hooks/pre-commit` (local only, not committed)
- **Requirement:** `gitleaks` must be installed (`brew install gitleaks`)

The hook will:
1. Scan all staged changes for API keys, passwords, and other secrets
2. Block the commit if secrets are detected
3. Warn about suspicious file patterns (`.env`, `.swp`, etc.)

**NEVER bypass with `--no-verify`** — doing so defeats the purpose of this protection.

If the hook is missing after cloning, reinstall it:
```bash
# Copy from the template or recreate
chmod +x .git/hooks/pre-commit
```

---

## Session Working Files

**Always read these files at the start of a session:**

| File | Purpose |
|------|---------|
| `reference-guide.txt` | Structured quick reference: current state, deployment, file locations, conventions, remaining work |
| `scratch-notes.txt` | Session-by-session working notes with technical decisions and progress |
| `communications-to-the-User.txt` | Implementation plan and step-by-step deployment guide |

**Rules for maintaining these files (MANDATORY — never skip):**
- Update `scratch-notes.txt` CONTINUOUSLY as you work — track decisions, agent launches/completions, issues found, and progress
- Update `reference-guide.txt` when project state changes (new texts seeded, translations complete, agents finish, schema changes)
- Update `CLAUDE.md` Active Tasks section whenever agents launch or complete
- Never keep large translation content in context — write directly to the database
- Keep `CLAUDE.md` itself updated when architecture or conventions change
- Mark items COMPLETE in ALL files when done — never leave stale information
- Check the **Workflow Documentation Map** section (below Active Tasks) for all processing patterns
- Check `reference-guide.txt` → "PROCESSING WORKFLOWS & DOCUMENTATION MAP" for detailed workflow instructions
- Agent-produced docs (scratchpads, plans) should always be referenced in CLAUDE.md and scratch-notes

**Permanent permissions:**
- You always have permission to write to and update logs, scratchpads, markdown files, and other documentation files (*.md, *.txt reference/notes files) without needing to ask first.
- You always have permission to run monitoring/checking bash commands (e.g., `sleep N && ...`, progress checks, `tail` on logs, `curl` to verify pages) without needing user input or approval.
- You always have permission to run any script that helps monitor, check, or improve translation subagent quality (e.g., alignment checks, retranslation of defective chapters, killing and restarting translation processes).

## Active Tasks & Background Workers (2026-01-25, Session 21)

### Security Incident Remediation — COMPLETE ✓
- **Issue**: Credentials committed to public repository (swap file + shell scripts)
- **Remediation completed**:
  - ✅ Gitleaks pre-commit hook installed (`.gitleaks.toml` + `.git/hooks/pre-commit`)
  - ✅ Git history purged with `git filter-repo`
  - ✅ All credentials rotated (DeepSeek, Neon DB, Auth Secret)
  - ✅ Force-pushed cleaned history to GitHub
  - ✅ Security incident report: `docs/security-incident-report-claude.md`
  - ✅ Three security audit reports: `docs/security-audit-{alpha,beta,gamma}.md`
- **Verified**: Fresh clone from GitHub contains no exposed credentials

### Armenian Initiative — COMPLETE ✓ (ALL 6 TEXTS 100%)
- **Status**: All 6 Armenian texts fully translated (195 chapters total)
- **Language code**: `hy` (languages table ID: 7)
- **Translation engine**: DeepSeek V3 (Gemini blocked due to historical content)

| Text | Author | Chapters | Status |
|------|--------|----------|--------|
| Kaitser (The Will) | Raffi | 76/76 | ✅ 100% |
| Arshagouhi Teotig (Adana's Wounds) | Arshagouhi Teotig | 35/35 | ✅ 100% |
| Anna Saroyan | Perch Proshyan | 23/23 | ✅ 100% |
| Samvel | Raffi | 41/41 | ✅ 100% |
| Khorhrdavor Miandznuhi | TBD | 12/12 | ✅ 100% |
| Yerkir Nairi (Land of Nairi) | Yeghishe Charents | 8/8 | ✅ 100% |

**Files:**
- `scripts/translate-armenian.ts` — DeepSeek-based Armenian translator
- `scripts/check-armenian-status.ts` — Status checker utility
- `docs/armenian-translation-observations.md` — workflow documentation

### Rizhilu (日知錄) — Translation IN PROGRESS
- **Agent** (a400ec2): COMPLETE — processing + seeding
- **Author**: Gu Yanwu (顧炎武, 1613-1682)
- **Chapters**: 32 (one per volume, 498,926 characters)
- **Translation**: 4 workers running (logs at /tmp/rizhilu-worker{1,2,3,4}.log)
- **Files**: `scripts/process-rizhilu.ts`, `data/processed/rizhilu/`, `docs/rizhilu-processing.md`

### Translation Gap Fixer — IN PROGRESS
- **Script**: `scripts/fill-translation-gaps.ts`
- **Task**: Find and retranslate placeholder paragraphs across all texts
- **Remaining gaps** (as of last check):
  - liji-zhengyi: 11 chapters
  - liji-zhushu: 4 chapters
  - shangshu-zhengyi: 2 chapters
  - zuozhuan-zhengyi: 1 chapter
  - rizhilu: 1 chapter
  - mengzi-zhushu: 1 chapter
  - zhuziyulei: 1 chapter

### Site Terminology Update — COMPLETE ✓
- **Agent**: a4fc5f0
- **Change**: "pre-1900" → "pre-contemporary" (to include 1909-1910 Armenian texts)
- **Files updated**: `src/app/page.tsx`, `src/app/layout.tsx`, `CLAUDE.md`

### Armenian Encoding Investigation — COMPLETE ✓
- **Agent**: acf75d6
- **Finding**: Word "delays" substituted for Armenian Unicode chars in code/docs
- **Root cause**: Text rendering issue during development (NOT Unicode encoding error)
- **Report**: `docs/armenian-encoding-investigation.md`

### Armenian "Delays" Bug Fix — IN PROGRESS
- **Agent**: a9fb74b
- **Task**: Find and fix ALL instances of "Delays" substitution in codebase
- **Targets**: seed-db.ts, prompts.ts, processing scripts, processed JSON files
- **Output**: `docs/armenian-delays-fix-report.md`

### Featured Texts Reorganization — COMPLETE ✓
- **Agent**: ab470fa
- **Changes implemented**:
  - Featured Texts: Collapsible accordion groups by language, sorted by count descending
  - Sidebar: Languages sorted by work count with "(N)" suffix
  - Browse: Language tabs with counts, mobile horizontal scroll
- **Files modified**: FeaturedTexts.tsx, CategoryBrowser.tsx, page.tsx, texts/page.tsx
- **New component**: accordion.tsx (Shadcn UI)

### Diarium Urbis Romae — TRANSLATION COMPLETE ✓
- **Translation**: 66/66 chapters, 0 errors (Session 19)
- **Workers**: bceafc8 (ch1-22), ba0b219 (ch23-44), b699139 (ch45-66) — all completed
- **Paragraph fix v2**: Section headers stripped, apparatus removed (agent ac8f701)
- **Documentation**: `docs/diarium/paragraph-fix-v2.md`

### Mobile Source Toggle — COMPLETE ✓
- **Agent** (a517451): Implemented mobile-only FAB to hide original text
- **Files created**: `src/hooks/useIsMobile.ts`, `src/hooks/useLocalStorage.ts`, `src/components/interlinear/MobileSourceToggle.tsx`
- **Files modified**: `InterlinearViewer.tsx`, `ParagraphPair.tsx`
- **Design**: Fixed bottom-right, Eye/EyeOff icons, localStorage persistence, 768px breakpoint

### Nandikkalambakam Tamil Pipeline — Stage 3 IN PROGRESS
- **Stage 1** (agent a472c67): COMPLETE — 114/114 poems translated
- **Stage 2** (agent a28b7f4): COMPLETE — reviewed 64 poems, B- grade
  - Reviewer notes: `docs/tamil-translation-notes/nandikkalambakam-reviewer-notes.md`
  - Retranslation requests: `docs/tamil-translation-notes/nandikkalambakam-retranslation-requests.md`
- **Stage 3** (agent aa88334): IN PROGRESS — improving prompt for medieval Tamil, retranslating all 114 poems, then editorial clarification pass
- **Pipeline docs**: `docs/tamil-translation-orchestration.md`

### Yashodhara Kaviyam Tamil Pipeline — Stage 1 IN PROGRESS
- **Stage 1** (agent a1cae1c): Processing raw text, seeding DB, translating with Gemini
- Raw files: `data/raw/yashodhara-kaviyam/` (5 carukkams, 330 verses)
- Stage 2 + Stage 3: will be launched when Stage 1 progresses

### Translation Workers (Background) — Session 18 Status
- **Eustathius Odyssey**: 31/37 — 16 workers (84%)
- **Shisan Jing Zhushu**: ~200/455 — 128 workers across 13 texts
- All other texts: COMPLETE (see Texts in the System table below)

### Diarium Urbis Romae — 6-Agent Quality Pipeline (Session 18)
- **Source**: Two OCR scans of Stefano Infessura's Diary of the City of Rome (1890 Tommasini ed.)
- **Language**: Italian (15th-century Romanesco) + Latin passages
- **Pipeline**: Primary Agent A + B (parallel) → Reviewer A + B → Bridge Reviewer → Master Reviewer
- **Documentation**: `docs/diarium/orchestration.md` (master tracking)
- **Scratchpads**: `docs/diarium/agent-{a,b}-scratchpad.md`, `reviewer-{a,b}-scratchpad.md`, `bridge-*.md`, `master-*.md`
- **Output**: `data/difficult_extra_processing/diarium_urbis_romae/clean_copy_{a,b}/` → `data/raw/diarium-urbis-romae/`
- **Phase 1**: LAUNCHED (Primary Text Agents A and B processing scans independently)

### Search Fix — COMPLETE (agent a687c60, deployed)
- **Problem**: Search only queried chapters.title + chapters.sourceContent, never texts.title or authors.name
- **Fix**: Added text-level ILIKE substring search on texts.title + authors.name
- **UI**: Now shows "Texts" section (matched texts) + "Chapters" section (content matches)
- **Commit pushed**: Auto-deployed to deltoi.com

### Udayanakumara Kaviyam Tamil Pipeline — Stage 1 COMPLETE
- **Stage 1** (agent a9ce61b): COMPLETE — 6 chapters, 366 verses processed + translated
- Raw files: `data/raw/udayanakumara-kaviyam/` (6 kandams)
- Processing script: `scripts/process-udayanakumara-kaviyam.ts`
- Pipeline progress: `docs/tamil-translation-notes/udayanakumara-kaviyam-pipeline-progress.md`
- Stage 2 + Stage 3: will be launched after Yashodhara also completes

### Odyssey Commentary Dual-Agent Pipeline — TRANSLATING (10/27)
- **Final grade**: B+ (both volumes), Reviewer SATISFIED and signed off
- **Volumes processed**: 2 volumes → 27 chapters total
- **Combined stats**: 6,146 paragraphs, 3.3M characters, 94.7-97.5% Greek
- **DB seeded**: 27 chapters (author: Eustathius of Thessalonica, slug: eustathius-odyssey)
- **Translation progress**: 10/27 chapters translated
- **Active workers** (corrected slug, DeepSeek grc, 6000 chars/batch):
  - Worker ab5dae1: chapters 1-8
  - Worker a4043fb: chapters 9-16
  - Worker afff370: chapters 19-24
- **NOTE**: Previous workers (a58c5f4, aa2274c, a05fbf7) used wrong slug — killed and replaced
- **Round 2 joint doc**: `docs/eustathius-r2-collaboration.md`
- **Architecture**: `scripts/lib/eustathius/` (6 modules)
- **Output**: `data/raw/eustathius-odyssey/` + `data/processed/eustathius-odyssey/chapter-NNN.json`

### Greek XML TEI Pipeline — COMPLETE (Seeded + Translating)
- **Parser Agent** (a95b70a): COMPLETE — 334 chapters, ALL PASS
- **Reviewer Agent** (a329f69): COMPLETE — Grade A (zero parser bugs)
- **DB Seeded**: 3 texts inserted (12 + 287 + 35 = 334 chapters)
- **Translation**: 3 workers running (affd974, a21b76e, af2cefd) — see Translation Workers above
- **Collaboration doc**: `docs/greek-xml-collaboration.md`
- **Architecture**: `scripts/lib/greek-xml/` + `scripts/process-greek-xml.ts`

### Tamil Stage 2 Reviewers
- **Yashodhara Kaviyam** (agent afa7e45): COMPLETE — Grade C+
  - CRITICAL: Commentary contamination in chapters 3-5 (processing script bug)
  - `process-yashodhara-kaviyam.ts` strips commentary from file 1 but NOT file 2
  - 59% of verses (194/330) need retranslation
  - Stage 3 must FIRST fix processing script, re-seed chapters 3-5, then retranslate
  - Reviewer notes: `docs/tamil-translation-notes/yashodhara-kaviyam-reviewer-notes.md`
  - Retranslation requests: `docs/tamil-translation-notes/yashodhara-kaviyam-retranslation-requests.md`
- **Udayanakumara Kaviyam** (agent ae734cc): IN PROGRESS — still reviewing
- Stage 3 retranslators launch after Udayanakumara review also completes

### Greek XML TEI Pipeline Round 2 — COMPLETE
- **Status**: Parser A, Reviewer SATISFIED — all 4 texts Grade A
- **Texts produced**: hesiod-theogony-exegesis (13 ch, regrouped from 109), periplus-maris-exteri (31), periplus-maris-interni (6), artemidori-geographia (3)
- **Translation**: ALL COMPLETE (13+31+6+3 = 53 chapters, 0 gaps, paragraph-verified)
- **Joint doc**: `docs/greek-xml-r2-collaboration.md`

### Shisan Jing Zhushu (十三經註疏) — TRANSLATING (4 Original + 4 Reinforcement Agents)
- **Corpus**: The Thirteen Classics with Commentaries — 13 texts, 455 chapters total
- **Source**: `data/raw/Shisan_Jing_Zhushu/` (762 files, 15 directories)
- **Index**: `data/raw/Shisan_Jing_Zhushu/13_books_index.txt` (chapter ordering)
- **All 13 texts processed and seeded to DB** — ~20 parallel translation workers active
- **Chapter ordering verified**: All 13 texts confirmed correct (verification agent a430c04)
- **Original orchestration agents** (DONE — launched background workers):
  - Agent 1 (a9f1c24): 論語/孟子/孝經/爾雅 — 57 ch
  - Agent 2 (ace30af): 周易正義/尚書正義 — 126 ch (3 workers: babf3aa, b6a0f7d, ba80c30)
  - Agent 3 (a86e80d): 周禮/儀禮/禮記 — 178 ch (4 workers: bfc83a7, b4c8f59, b332ac1, b0508ee)
  - Agent 4 (ace6429): 春秋三傳 — 94 ch (6 workers: bc593fa, bc3b540, b9c848d, bce1f8a, b624f79, bdcaaab)
- **Reinforcement translation agents** (additional coverage):
  - Agent A (a7e1ecc): yili-zhushu (2 workers) + erya-zhushu
  - Agent B (aca4e1f): zhouli-zhushu (2 workers) + xiaojing-zhushu
  - Agent C (a3bb94a): liji-zhengyi (2 workers) + liji-zhushu
  - Agent D (a541e9f): lunyu-zhushu + mengzi-zhushu + shangshu-zhengyi
- **Processing scripts**: `scripts/process-shisan-jing-{1,2,3,4}.ts`
- **Text format**: Multi-layered: base text + （glosses） + [疏] sub-commentary + 【scholar】
- **Key rule**: ALL commentary layers preserved in source text (they ARE the 註疏 edition)
- **Skip logic**: translate-batch.ts skips already-translated chapters, so parallel workers are safe

### Kongzi Jiayu — COMPLETE
- **Status**: 80/80 chapters processed and translated
- **Text**: 孔子家語 (School Sayings of Confucius), Classical Chinese
- **Source**: `data/raw/kongzi_jiayu/`, processed dir: `data/processed/kongzi-jiayu/`

### Remaining Work
1. ~~Search fix~~ DONE
2. ~~Eustathius pipeline~~ DONE → SEEDED → 3 translation workers running (correct slug: eustathius-odyssey)
3. ~~Greek XML R2~~ DONE (53/53 chapters translated, 0 gaps)
4. ~~Historia Nova~~ DONE (287/287)
5. ~~Sophistici Elenchi~~ DONE (35/35)
6. Wait for Eustathius translation workers to finish (17 of 27 chapters remaining)
7. ~~Tongjian~~ DONE (45/45)
8. Wait for Nandikkalambakam Stage 3 to complete
9. Wait for Tamil Stage 2 reviewers → launch Stage 3 retranslators
10. Wait for Shisan Jing Zhushu translation (13 texts, 455 ch — 32/455 done, ~20 workers active)
11. ~~Kongzi Jiayu~~ DONE (80/80)
12. Wait for Rizhilu translation workers to finish (4 workers, 32 chapters)
13. ~~Armenian texts~~ IN PROGRESS — 4 agents processing + translating (kaitser×2, anna_saroyan, arshagouhi_teotig)
14. Commit and push all new processed data + seed-db.ts updates
15. Update AUTH_URL on Vercel to https://deltoi.com

### Title Naming Convention (MANDATORY)
All text titles must follow: **"English Descriptive Name (Transliteration)"**
- e.g., "Classified Conversations of Master Zhu (Zhu Zi Yu Lei)"
- e.g., "The War-Bard's Guide (Porunararruppadai)"
- Texts with English-native original titles keep them as-is: "On the Soul"
- This applies to ALL new texts added in future sessions

### Workflow Documentation Map (READ `reference-guide.txt` for full details)

All processing workflows are documented in detail in `reference-guide.txt` under "PROCESSING WORKFLOWS & DOCUMENTATION MAP". Here is the quick index:

| Workflow | When to Use | Key Files | Docs Written By Agents |
|----------|-------------|-----------|------------------------|
| **A: Standard Text** | Clean source text, simple structure | `scripts/process-<name>.ts` | — |
| **B: OCR Processing** | Noisy Internet Archive djvu/OCR scans | `scripts/lib/<name>/` (multi-module) | `docs/plan-<name>-processing.md`, `docs/<name>-scratchpad.md` |
| **C: TEI-XML** | First1KGreek/Perseus structured XML | `scripts/lib/greek-xml/` (reusable parser) | `docs/plan-greek-xml-processing.md`, `docs/greek-xml-scratchpad.md` |
| **D: Tamil Pipeline** | All Tamil texts (3-stage quality) | `scripts/translate-tamil.ts` | `docs/tamil-translation-notes/<slug>-*` |
| **E: Documentation** | EVERY session (mandatory) | `scratch-notes.txt`, `reference-guide.txt`, `CLAUDE.md` | — |
| **F: Batch Translation** | Large zh/grc/la texts via DeepSeek | `scripts/translate-batch.ts` | — |
| **G: Dual-Agent Quality Pipeline** | Any text requiring quality verification | Parser + Reviewer agents | `docs/<pipeline>-collaboration.md`, `docs/<pipeline>-*-scratchpad.md` |

### Dual-Agent Quality Pipeline (Workflow G) — FORMALIZED

This is the standard workflow for processing texts where quality verification is important. Two agents work in collaboration:

| Role | Responsibility | Writes To |
|------|---------------|-----------|
| **Parser Agent** | Analyzes source, extends configs, runs parser, performs self-checks | Own scratchpad + joint collaboration doc |
| **Reviewer Agent** | Reviews output independently, grades quality, requests fixes | Own scratchpad + joint collaboration doc |

**Lifecycle:**
1. Create joint collaboration doc (`docs/<pipeline>-collaboration.md`) with text list, rules, status
2. Create individual scratchpads (`docs/<pipeline>-parser-scratchpad.md`, `docs/<pipeline>-reviewer-scratchpad.md`)
3. Launch Parser Agent — it processes texts, writes report to collaboration doc
4. Launch Reviewer Agent — it waits for Parser output, reviews, writes grade
5. If Reviewer is NOT SATISFIED → Parser fixes issues → Reviewer re-reviews (iterate)
6. When Reviewer is SATISFIED → texts are ready for seeding + translation
7. After sign-off: add to `seed-db.ts`, run `pnpm db:seed`, launch translation workers

**Sign-off rules:**
- Both agents sign entries with `[PARSER]` or `[REVIEWER]`
- Reviewer gives letter grade (A through F) for each criterion
- Overall grade B+ or higher = suitable for translation
- Reviewer must explicitly state `SATISFIED` or `NOT SATISFIED`

**Prior uses:**
- Carmina Graeca: Processor + Critic (Grade A, 21 poems) → `docs/carmina-graeca-scratchpad.md`
- Eustathius Odyssey: 2 rounds (C+ → B+ for both volumes) → `docs/eustathius-r2-collaboration.md`
- Greek XML R1: Parser + Reviewer (Grade A, 334 chapters) → `docs/greek-xml-collaboration.md`
- Greek XML R2: Parser + Reviewer (IN PROGRESS) → `docs/greek-xml-r2-collaboration.md`

**CRITICAL REMINDERS FOR ALL SESSIONS:**
1. **Read** `reference-guide.txt`, `scratch-notes.txt`, and `CLAUDE.md` at session start
2. **Write** to `scratch-notes.txt` continuously as you work (decisions, progress, issues)
3. **Update** `reference-guide.txt` when project state changes (new texts, agents complete, coverage updates)
4. **Update** `CLAUDE.md` Active Tasks when agents launch or complete
5. **Agents write their own docs** — always note the doc paths in CLAUDE.md and scratch-notes
6. **Never leave stale info** — if something is COMPLETE, mark it COMPLETE everywhere
7. **Title convention** — "English Name (Transliteration)" for ALL languages, ALWAYS

## Project Overview

A public wiki hosting open-source translations of classical and historical texts. Users register accounts to edit or endorse AI-generated translations. All edits are publicly tracked with full history. Translations are displayed in a side-by-side columnar format inspired by the [Columbia Digital Dante](https://digitaldante.columbia.edu/) project: original source text on the left, translation on the right, aligned paragraph-by-paragraph or section-by-section.

**Initial languages:** Koine Greek, Latin, Classical Chinese
**Initial texts:**
- **Zhu Zi Yu Lei** (朱子語類) — 140 chapters of recorded conversations between neo-Confucian philosopher Zhu Xi and his disciples, compiled by Li Jingde (c. 1270). Source: [ctext.org/zhuzi-yulei](https://ctext.org/zhuzi-yulei)
- **De Ceremoniis** (De cerimoniis aulae Byzantinae) — Byzantine court protocol written/commissioned by Emperor Constantine VII Porphyrogennetos (c. 956–959). Source: [Internet Archive](https://archive.org/details/bub_gb_OFpFAAAAYAAJ) (Reiske/Leich edition)
- **Chuanxi Lu** (傳習錄) — Record of transmitted instructions by Wang Yangming (王陽明), neo-Confucian philosopher (1472–1529). 3 chapters processed, not yet seeded to database.

**Content organisation:**
- Each chapter of a longer text is its own page with two columns (source + translation)
- Multi-chapter texts have an index/table of contents page
- Texts are browsable by: language → alphabetical list of authors → alphabetical list of titles
- Translations can cover books, plays, essays, and other genres

---

## Existing Open-Source Wiki Platforms Evaluated

No existing wiki platform provides the full combination of interlinear parallel text display, wiki-style versioned editing, and endorsement voting. A custom build is necessary, but several platforms offer useful features or starting points.

### Wiki Platforms

| Platform | Stack | Versioning | Parallel Text | Endorsements | Verdict |
|----------|-------|------------|---------------|--------------|---------|
| **MediaWiki** | PHP, MySQL | Full history | Via templates (table hacks) | No | Too heavy, wrong language |
| **Wiki.js** | Node.js, PostgreSQL | Full history | No | No | v3 stalled since 2021 |
| **NextWiki** | Next.js, tRPC, Drizzle | Full history | No | No | Best starting point |
| **BookStack** | PHP, Laravel | Page revisions | No | No | Good hierarchy model |
| **DokuWiki** | PHP, flat-file | Full history | No | Publish plugin (approval) | Too limited |

### MediaWiki + Wikisource Approach

Wikisource hosts parallel translations using [`{{Translation table}}`](https://en.wikisource.org/wiki/Template:Translation_table/3) templates that place source and translated text in adjacent HTML table cells. The [Translate extension](https://www.mediawiki.org/wiki/Extension:Translate) provides a side-by-side editor view for translators. The [`{{Bilingual}}`](https://en.wikisource.org/wiki/Wikisource:Multilingual_texts) template handles facing-page style parallel texts. These work but are primitive — wikitext table macros rather than a proper aligned component. MediaWiki is PHP-based and heavily opinionated; fighting its architecture for custom rendering is not recommended.

### NextWiki (Recommended Fork Candidate)

[NextWiki](https://github.com/barisgit/nextwiki) is an open-source wiki built on the exact T3 stack recommended for this project: Next.js 15, TypeScript, tRPC, Drizzle ORM, NextAuth.js, React 19, Tailwind CSS, Shadcn UI. It uses a monorepo structure (`apps/` + `packages/`).

**Already provides:** page versioning with diff comparison, markdown editing with syntax highlighting, full-text search (PostgreSQL tsvector/tsquery with fuzzy matching), auth (credentials + OAuth), image upload, page/folder hierarchy, highlighted search results.

**Would need to be added:** interlinear two-column viewer, Text/Chapter/Translation data model (replacing flat pages), endorsement system, category browser (language → author → title), structured paragraph-aligned content storage.

Forking NextWiki saves significant scaffolding work on auth, versioning, search, and the general wiki editing experience.

### Open-Source Parallel Text Display Projects

These are not wikis but provide reference implementations for the interlinear display:

**[TextBrowser](https://github.com/bahaidev/textbrowser)** — client-side JavaScript multilinear text browser. Supports parallel columns and interlinear stacking modes. Uses JSON data format with configurable columns, column reordering, and per-column styling. Fully offline-capable via IndexedDB/service workers. Read-only (no editing), vanilla JS (not React), early-stage (6 stars, 1 fork). The display logic and JSON data format are the most relevant reference for building the InterlinearViewer component.

**[Aglona Reader](https://sites.google.com/site/aglonareader/home/lang-en)** — desktop parallel text reader using a "ParallelBook" XML format (PBO extension). Content is structured as "fragment pairs" of source + target text. This fragment-pair data model maps directly to the paragraph-aligned content storage needed for this project.

**Wikisource `{{Translation table/N}}`** — the simplest reference: each table row = one paragraph pair (source cell + translation cell). The concept is sound even though the wikitext template implementation isn't reusable in React.

### GitHub Topics for Further Reference

- [github.com/topics/interlinear](https://github.com/topics/interlinear) — repositories tagged "interlinear" (includes biblical Greek/Hebrew readers, linguistic annotators)
- [github.com/topics/interlinear-text](https://github.com/topics/interlinear-text) — additional interlinear text tools

---

## Architecture Decision

### Recommended Approach: Fork NextWiki or Custom T3 Build

Both paths use the same stack. Forking NextWiki gives you auth, versioning, search, and markdown editing out of the box. Building from scratch gives you a cleaner data model without legacy page-based assumptions.

**Stack (same for both paths):**
- **Framework:** Next.js 15+ (App Router) with TypeScript
- **UI:** React 19, Tailwind CSS, Shadcn UI components
- **Database:** PostgreSQL (via Neon or Supabase for managed hosting)
- **ORM:** Drizzle ORM (lightweight, type-safe, good migration support)
- **API layer:** tRPC (end-to-end type safety between client and server)
- **Auth:** NextAuth.js v5 (supports OAuth providers + email/password credentials)
- **Search:** PostgreSQL full-text search (tsvector/tsquery) — sufficient for initial scale
- **Deployment:** Vercel (frontend + serverless functions) or self-hosted with Docker

**The unique components that must be built custom regardless of starting point:**
1. InterlinearViewer — paragraph-aligned two-column display (reference: TextBrowser's column logic)
2. Text/Chapter/TranslationVersion data model — structured hierarchy replacing flat wiki pages
3. Endorsement system — version-specific user endorsements with counts
4. Category browser — language → author → title hierarchy with alphabetical ordering
5. Paragraph-aligned editor — editing interface that preserves paragraph structure alignment with source text

---

## Data Model

### Core Entities

```
User
├── id, email, username, passwordHash, role (reader|editor|admin)
├── createdAt, lastLoginAt
└── has many: Edits, Endorsements

Language
├── id, code (grc|la|zh), name, displayName
└── has many: Texts

Author
├── id, name, nameOriginalScript, era, description
└── has many: Texts

Text
├── id, title, titleOriginalScript, languageId, authorId
├── description, sourceUrl, totalChapters
└── has many: Chapters

Chapter
├── id, textId, chapterNumber, title
├── sourceContent (original text, stored as structured paragraphs/lines)
├── ordering
└── has many: Translations

Translation
├── id, chapterId, currentVersionId
├── createdAt, lastEditedAt
└── has many: TranslationVersions, Endorsements

TranslationVersion
├── id, translationId, versionNumber
├── content (translated text, paragraph-aligned with source)
├── authorId (user who made this edit), editSummary
├── createdAt
├── previousVersionId (for diff chain)
└── has many: Endorsements

Endorsement
├── id, userId, translationVersionId
├── createdAt
└── (unique constraint: one endorsement per user per version)
```

### Key Relationships
- A Text belongs to one Language and one Author
- A Chapter belongs to one Text and contains the immutable source content
- A Translation belongs to one Chapter; there is typically one Translation per Chapter but the schema allows multiple (e.g., competing translations)
- TranslationVersions form an append-only chain; edits create new versions, never modify old ones
- Endorsements point to a specific TranslationVersion, not to the Translation head

### Content Storage Format

Source content and translation content should be stored as JSON arrays of paragraphs/lines to enable paragraph-level alignment in the interlinear viewer:

```json
{
  "paragraphs": [
    { "index": 0, "text": "子曰：「學而時習之，不亦說乎？」" },
    { "index": 1, "text": "有朋自遠方來，不亦樂乎？" }
  ]
}
```

The translation mirrors this structure with matching indices so the UI can render them side-by-side.

---

## Interlinear Display Format

The core UI feature is a two-column, paragraph-aligned viewer. Each row contains one paragraph/section from the source (left) and the corresponding translation (right). The columns scroll together. For Classical Chinese, where text is dense, the source column may be narrower. For Greek/Latin verse, line-by-line alignment may be preferred over paragraph-by-paragraph.

```
┌─────────────────────────────────┬─────────────────────────────────┐
│ Source Text (Original)          │ Translation (English)           │
├─────────────────────────────────┼─────────────────────────────────┤
│ 子曰：「學而時習之，不亦說乎？」│ The Master said: "To learn and  │
│                                 │ then practice it regularly, is  │
│                                 │ that not a pleasure?"           │
├─────────────────────────────────┼─────────────────────────────────┤
│ 有朋自遠方來，不亦樂乎？        │ "To have friends come from afar,│
│                                 │ is that not a delight?"         │
└─────────────────────────────────┴─────────────────────────────────┘
```

On mobile, the columns should stack vertically (source above, translation below) for each paragraph unit.

---

## Source Text Acquisition

### Chinese Classics via ctext.org API

**API documentation:** https://ctext.org/tools/api

**Key endpoints:**
- `gettext` — retrieves text content given a CTP URN
- `readlink` — converts a ctext.org URL to a CTP URN
- `getstatus` — checks authentication status
- `getlink` — converts URN to URL

**URN for Zhu Zi Yu Lei:** `ctp:zhuzi-yulei`
**Chapter URNs:** `ctp:zhuzi-yulei/1` through `ctp:zhuzi-yulei/140`

**Authentication tiers:**
- Unauthenticated: limited data access
- Logged-in CTP account: larger data quotas
- Institutional subscriber: full access via IP registration

**Important:** The `subsections` element (needed to enumerate chapters) requires authentication. The `fulltext` element (chapter content) is available for individual chapter URNs. Rate limits apply — cache all responses locally.

**Error codes:** `ERR_REQUIRES_AUTHENTICATION`, `ERR_REQUEST_LIMIT`

**Python library:** `pip install ctext` — provides a wrapper around the JSON API.

**Acquisition script strategy:**
1. Authenticate with a CTP account
2. Iterate over chapters 1–140 of `ctp:zhuzi-yulei`
3. Call `gettext` for each chapter URN
4. Parse the `fulltext` response (ordered paragraph list)
5. Store raw JSON in `data/raw/zhuzi-yulei/` (gitignored)
6. Process into the structured paragraph format for database seeding

### Greek/Latin via Internet Archive

**De Ceremoniis source:** https://archive.org/details/bub_gb_OFpFAAAAYAAJ

This is a scan of the Reiske/Leich Greek-Latin edition (1751/1829). The text is available as OCR output but will require significant cleanup:

**Acquisition strategy:**
1. Download the OCR text or use Internet Archive's API (`/download/` endpoint for full text, or page-by-page via the IA Read API)
2. The Reiske edition already contains a Latin translation alongside the Greek — both can be extracted
3. Clean up OCR artifacts (common issues: polytonic Greek diacritics misread, ligatures, page headers mixed into text)
4. Segment into chapters/sections following the book's own divisions (Book I and Book II, with numbered chapters within each)
5. Store cleaned text in structured paragraph format

**Alternative source:** The [Princeton Byzantine Translations](https://byzantine.lib.princeton.edu/byzantine/translation/16010) project may have cleaner digital text of portions of De Ceremoniis.

**Note:** The modern English translation by Moffatt and Tall (2012, Byzantina Australiensia 18) is under copyright and cannot be used. AI-generated translations from the Greek are the intended approach.

---

## Hosting & Cost Estimates

### Vercel + Neon (Recommended for MVP)

| Component | Plan | Cost |
|-----------|------|------|
| Vercel (frontend + API) | Hobby (free) or Pro ($20/mo) | $0–$20/mo |
| Neon PostgreSQL | Free tier (0.5 GB storage, 190 compute hours) | $0/mo |
| Domain name | .org or .com | ~$10–15/year |
| **Total (MVP)** | | **$0–$22/mo** |

The free tier is sufficient for initial development and low traffic. The Pro plan ($20/mo) adds team collaboration, more bandwidth (1 TB included), and higher serverless function limits. Additional bandwidth on Pro costs $0.15/GB.

### Self-Hosted Alternative (Higher Traffic)

For more control or higher traffic, deploy with Docker on a VPS:

| Component | Provider | Cost |
|-----------|----------|------|
| VPS (2 GB RAM) | DigitalOcean, Hetzner, or Linode | $5–12/mo |
| Managed PostgreSQL | Supabase free tier, or self-hosted on same VPS | $0–15/mo |
| Domain + SSL | Let's Encrypt (free SSL) | ~$10–15/year |
| **Total** | | **$5–27/mo** |

---

## Current Deployment

- **Live site:** https://deltoi.com
- **Hosting:** Vercel (auto-deploys from `main` branch on push)
- **Database:** Neon PostgreSQL (free tier, schema synced via `pnpm db:push`)
- **GitHub:** https://github.com/translorentz/translation-wiki.git
- **Translation API:** DeepSeek V3.2 (deepseek-chat, OpenAI-compatible SDK)

---

## Build & Development Commands

### Initial project setup (run once):

```bash
pnpm create next-app@latest translation-wiki --typescript --tailwind --eslint --app --src-dir
cd translation-wiki

# Core dependencies
pnpm add @trpc/server @trpc/client @trpc/tanstack-react-query @tanstack/react-query \
  zod superjson drizzle-orm postgres next-auth@beta bcryptjs slugify openai diff

# Dev dependencies
pnpm add -D drizzle-kit @types/node @types/bcryptjs @types/diff \
  vitest @vitejs/plugin-react jsdom @testing-library/react \
  @testing-library/dom @testing-library/jest-dom vite-tsconfig-paths \
  prettier prettier-plugin-tailwindcss tsx

# Shadcn UI
npx shadcn@latest init
npx shadcn@latest add button card input label textarea table tabs \
  dialog dropdown-menu avatar badge separator scroll-area tooltip

# Start local PostgreSQL
docker compose up -d
```

### Daily development:

```bash
# Start development server (Turbopack)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint and format
pnpm lint
pnpm format

# Run all tests (watch mode)
pnpm test

# Run a single test file
pnpm test -- path/to/test.spec.ts

# Run tests once (CI mode)
pnpm test:run

# Type checking
pnpm typecheck

# Database operations (Drizzle)
pnpm db:generate    # Generate migrations from schema changes
pnpm db:migrate     # Apply pending migrations
pnpm db:push        # Push schema directly (dev only)
pnpm db:studio      # Open Drizzle Studio (database GUI at localhost:4983)
pnpm db:seed        # Seed database with source texts

# Source text acquisition scripts
pnpm acquire:ctext         # Fetch Zhu Zi Yu Lei from ctext.org
pnpm acquire:archive       # Fetch De Ceremoniis from Internet Archive
pnpm process:texts         # Clean and structure raw text files

# AI translation
pnpm translate:batch       # Generate AI translations for untranslated chapters
```

### package.json scripts to define:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx scripts/seed-db.ts",
    "acquire:ctext": "tsx scripts/acquire-ctext.ts",
    "acquire:archive": "tsx scripts/acquire-archive.ts",
    "process:texts": "tsx scripts/process-texts.ts",
    "translate:batch": "tsx scripts/translate-batch.ts"
  }
}
```

---

## Repository Structure

```
translation-wiki/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth pages (login, register)
│   │   ├── (wiki)/             # Main wiki pages
│   │   │   ├── texts/          # Text listing and category browser
│   │   │   ├── [lang]/[author]/[text]/          # Text index page
│   │   │   └── [lang]/[author]/[text]/[chapter] # Chapter view (interlinear)
│   │   ├── api/                # API route handlers (or tRPC router)
│   │   └── layout.tsx          # Root layout
│   ├── components/
│   │   ├── interlinear/        # InterlinearViewer, ParagraphPair, ColumnLayout
│   │   ├── editor/             # TextEditor, DiffViewer, EditHistory
│   │   ├── navigation/         # TableOfContents, CategoryBrowser, Breadcrumbs
│   │   ├── auth/               # LoginForm, RegisterForm, UserMenu
│   │   └── ui/                 # Shadcn UI primitives
│   ├── server/
│   │   ├── db/                 # Drizzle schema, connection, queries
│   │   ├── trpc/               # tRPC routers and procedures
│   │   └── auth/               # NextAuth config, providers
│   ├── lib/                    # Shared utilities, constants, types
│   └── styles/                 # Global CSS, Tailwind config
├── scripts/
│   ├── acquire-ctext.ts        # Fetch from ctext.org API
│   ├── acquire-archive.ts      # Fetch from Internet Archive
│   ├── process-texts.ts        # Clean and structure raw texts
│   └── seed-db.ts              # Load processed texts into database
├── data/
│   ├── raw/                    # Downloaded raw files (gitignored)
│   └── processed/              # Cleaned, structured text files (committed)
├── drizzle/
│   ├── schema.ts               # Database schema definition
│   └── migrations/             # Generated migration files
├── tests/
│   ├── unit/                   # Unit tests
│   ├── integration/            # API/database integration tests
│   └── e2e/                    # End-to-end browser tests
├── public/                     # Static assets
├── docker-compose.yml          # Local PostgreSQL for development
├── .env.example                # Environment variable template
├── drizzle.config.ts           # Drizzle ORM configuration
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── package.json
├── CLAUDE.md
└── initial-seed-request.txt    # Original project requirements
```

---

## Implementation Phases

### Phase 1: Project Scaffolding & Database

1. Initialise Next.js 15 project with TypeScript, Tailwind, ESLint
2. Set up Drizzle ORM with PostgreSQL schema (all entities above)
3. Configure NextAuth.js with email/password credentials
4. Create `docker-compose.yml` for local PostgreSQL
5. Write and run initial migrations
6. Verify auth flow (register, login, session)

### Phase 2: Source Text Acquisition

1. Write `scripts/acquire-ctext.ts` — authenticate and fetch all 140 chapters of Zhu Zi Yu Lei
2. Write `scripts/acquire-archive.ts` — download De Ceremoniis text from Internet Archive
3. Write `scripts/process-texts.ts` — clean OCR artifacts, segment into paragraphs, output structured JSON
4. Write `scripts/seed-db.ts` — load processed texts into Chapter records
5. Test that all chapters load correctly

### Phase 3: Core Reading Experience

1. Build the InterlinearViewer component (two-column, paragraph-aligned, responsive)
2. Build the TableOfContents component for multi-chapter navigation
3. Build the CategoryBrowser (language → author → title hierarchy)
4. Create the chapter view page `[lang]/[author]/[text]/[chapter]`
5. Create the text index page with chapter listing
6. Create the main browse page with language/author/title filters

### Phase 4: Editing & Versioning

1. Build the TextEditor component (markdown or plain text, with paragraph structure preserved)
2. Implement the TranslationVersion creation flow (edit → save → new version)
3. Build the EditHistory component (list of versions with timestamps and authors)
4. Build the DiffViewer component (side-by-side or inline diff between versions)
5. Add edit permissions (only logged-in users can edit)

### Phase 5: Endorsement System

1. Implement endorsement API (add/remove endorsement for a specific version)
2. Display endorsement count on each translation version
3. Show which version has the most endorsements (highlight as "community preferred")
4. User profile page showing their endorsement history

### Phase 6: AI Translation Generation

1. Integrate DeepSeek V3.2 API (OpenAI-compatible) to generate initial translations
2. Feed source text in language-aware batches (zh=1500 chars, grc/la=6000 chars per batch)
3. Store AI-generated translations as the initial TranslationVersion (author = system/AI)
4. Mark AI translations distinctly in the UI so users know they can be improved

### Phase 7: Search & Polish

1. Implement full-text search across titles, authors, and translation content
2. Add responsive design polish for mobile
3. Add loading states, error boundaries, and edge case handling
4. SEO: meta tags, Open Graph, structured data for scholarly content

### Phase 8: Deployment

1. Configure Vercel project (or Docker deployment)
2. Set up production PostgreSQL (Neon, Supabase, or self-hosted)
3. Configure environment variables for production
4. Set up domain and SSL
5. Deploy and verify

---

## Subagent Coordination Strategy

For parallel development with multiple Claude Code instances:

| Agent | Responsibility | Key Files |
|-------|---------------|-----------|
| **Infrastructure** | DB schema, migrations, auth, Docker, deployment | `drizzle/`, `src/server/`, `docker-compose.yml` |
| **Frontend** | Interlinear viewer, editor, navigation, responsive layout | `src/components/`, `src/app/(wiki)/` |
| **Backend** | tRPC routers, versioning logic, endorsement API, search | `src/server/trpc/`, `src/app/api/` |
| **Text Acquisition** | ctext.org fetcher, IA fetcher, text processing, seeding | `scripts/`, `data/` |
| **AI Translation** | DeepSeek API integration, batch translation, quality checks | `src/server/translation/`, `scripts/translate-batch.ts` |

**Coordination rules:**
- Each agent works on a feature branch and submits PRs
- The Infrastructure agent establishes the schema first; other agents depend on it
- Frontend and Backend agents coordinate on tRPC router interfaces (define types first)
- Text Acquisition runs independently once the schema is ready
- AI Translation depends on both the schema and acquired source texts

---

## Technical Conventions

- **Paragraph alignment is the fundamental unit** — source and translation content must maintain matching paragraph indices. The interlinear viewer renders by iterating over paragraph pairs.
- **Versioning is append-only** — never mutate or delete a TranslationVersion. Edits always create new versions.
- **Endorsements are version-specific** — they point to a TranslationVersion ID, not to the Translation head. If a new version is created, previous endorsements remain on the old version.
- **Unicode correctness is critical** — Classical Chinese (CJK Unified Ideographs), Koine Greek (polytonic with diacritics: ά, ὁ, ῆ, etc.), and Latin all require proper UTF-8 handling. Database collation, search indexing, and font rendering must all account for this.
- **Source texts are immutable after import** — the Chapter.sourceContent field is set during seeding and never modified by users. Only translations are editable.
- **URLs are human-readable** — use slugified paths like `/grc/constantine-vii/de-ceremoniis/chapter-1` rather than numeric IDs in URLs.

---

## External Resources

- **ctext.org API:** https://ctext.org/tools/api — JSON API for Chinese classical texts
- **ctext.org Python library:** `pip install ctext` (PyPI wrapper for the API)
- **Zhu Zi Yu Lei on ctext.org:** https://ctext.org/zhuzi-yulei (URN: `ctp:zhuzi-yulei`, 140 chapters)
- **De Ceremoniis on Internet Archive:** https://archive.org/details/bub_gb_OFpFAAAAYAAJ (Reiske edition, Greek + Latin)
- **Princeton Byzantine Translations:** https://byzantine.lib.princeton.edu/byzantine/translation/16010 (partial De Ceremoniis)
- **Digital Dante (layout reference):** https://digitaldante.columbia.edu/ — side-by-side Italian/English display
- **NextWiki (potential base):** https://github.com/barisgit/nextwiki — T3 stack wiki with versioning
- **Wiki.js:** https://js.wiki/ — established Node.js wiki (reference for features, not recommended as base)
- **Drizzle ORM docs:** https://orm.drizzle.team/
- **NextAuth.js docs:** https://next-auth.js.org/
- **tRPC docs:** https://trpc.io/

---

## Current Implementation Status

### Completed Features (as of January 2026)

- **Phases 1-6 fully implemented**: scaffolding, text acquisition, reading experience, editing, endorsements, AI translation
- **Discussion system**: Wikipedia-style "Discussion" tab on every chapter (threaded, with resolve/pin)
- **Poetry display mode**: `textType` field ("prose" | "poetry") — poetry shows line numbers every 5th line in left gutter
- **Search page**: full-text search across titles and content
- **Auth**: register, login, role-based access (reader/editor/admin)
- **Admin panel**: user role management at `/admin/users`
- **SEO**: generateMetadata on all pages, Open Graph tags

### Texts in the System

| Text | Language | Author Slug | Text Slug | Chapters | Type |
|------|----------|-------------|-----------|----------|------|
| Classified Conversations of Master Zhu (Zhu Zi Yu Lei) | zh | zhu-xi | zhuziyulei | 140 | prose |
| On the Ceremonies of the Byzantine Court | grc | constantine-vii | ceremonialis | 7 | prose |
| Instructions for Practical Living (Chuan Xi Lu) | zh | wang-yangming | chuanxilu | 3 | prose |
| On the Soul | la | cassiodorus | deanima | 18 | prose |
| Elegy on Misfortune | la | henry-of-settimello | elegia | 4 | poetry |
| History of the Lombards of Benevento | la | erchempert | lombards | 82 | prose |
| The Book of the Kingdom of Sicily | la | hugo-falcandus | regno | 56 | prose |
| Narratives from the Comprehensive Mirror (Tongjian Jishi Benmo) | zh | yuan-shu | tongjian | 45 | prose |
| Poems of Poor Prodromos (Ptochoprodromika) | grc | theodore-prodromos | ptochoprodromos | 2 | poetry |
| The Yellow Emperor's Classic of Medicine (Huang Di Nei Jing) | zh | huangdi | huangdineijing | 55 (Su Wen only) | prose |
| Medieval Greek Poems (Carmina Graeca Medii Aevi) | grc | wagner | carmina-graeca | 21 | poetry |
| Commentary of Guliang (Guliang Zhuan) | zh | guliang-chi | guliang-zhuan | 12 | prose |
| The War-Bard's Guide (Porunararruppadai) | ta | mudathirumaran | porunararruppadai | 1 | poetry |
| Comprehensive Discussions in the White Tiger Hall (Baihu Tong) | zh | ban-gu | baihu-tong | 43 | prose |
| Biographies of Lofty Scholars (Gaoshi Zhuan) | zh | huangfu-mi | gaoshizhuan | 4 | prose |
| Ceremonies and Rites (Yi Li) | zh | zheng-xuan | yi-li | 17 | prose |
| Lost Book of Zhou (Yi Zhou Shu) | zh | zhou-scribes | yi-zhou-shu | 62 | prose |
| Comprehensive Meaning of Customs (Fengsu Tongyi) | zh | ying-shao | fengsutongyi | 11 | prose |
| The Anthology of Nandi (Nandikkalambakam) | ta | nandikkalambakam-poets | nandikkalambakam | 114 | poetry |
| Epistle to Diognetus | grc | diognetus-author | diognetum | 12 | prose |
| New History (Historia Nova) | grc | zosimus | historia-nova | 287 | prose |
| Paraphrase on Sophistical Refutations | grc | soph-elenchi-paraphrast | sophistici-elenchi-paraphrasis | 35 | prose |
| Commentary on the Odyssey | grc | eustathius | eustathius-odyssey | 27 | prose |
| The School Sayings of Confucius (Kongzi Jiayu) | zh | confucius | kongzi-jiayu | 80 | prose |
| Analects with Commentary (Lunyu Zhushu) | zh | he-yan | lunyu-zhushu | 21 | prose |
| Mencius with Commentary (Mengzi Zhushu) | zh | zhao-qi | mengzi-zhushu | 15 | prose |
| Classic of Filial Piety with Commentary (Xiaojing Zhushu) | zh | xing-bing | xiaojing-zhushu | 10 | prose |
| Erya Dictionary with Commentary (Erya Zhushu) | zh | guo-pu | erya-zhushu | 11 | prose |
| Book of Changes with Commentary (Zhouyi Zhengyi) | zh | kong-yingda | zhouyi-zhengyi | 104 | prose |
| Book of Documents with Commentary (Shangshu Zhengyi) | zh | kong-yingda | shangshu-zhengyi | 22 | prose |
| Rites of Zhou with Commentary (Zhouli Zhushu) | zh | jia-gongyan | zhouli-zhushu | 42 | prose |
| Ceremonial Rites with Commentary (Yili Zhushu) | zh | jia-gongyan | yili-zhushu | 51 | prose |
| Book of Rites with Commentary (Liji Zhengyi) | zh | kong-yingda | liji-zhengyi | 56 | prose |
| Book of Rites — Selected Chapters (Liji Zhushu) | zh | zheng-xuan-liji | liji-zhushu | 29 | prose |
| Zuo Commentary on Spring and Autumn (Zuozhuan Zhengyi) | zh | kong-yingda | zuozhuan-zhengyi | 43 | prose |
| Gongyang Commentary on Spring and Autumn (Gongyang Zhushu) | zh | he-xiu | gongyang-zhushu | 30 | prose |
| Guliang Commentary on Spring and Autumn (Guliang Zhushu) | zh | fan-ning | guliang-zhushu | 21 | prose |

### Translation Pipeline

- **Engine**: DeepSeek V3 (`deepseek-chat`) via OpenAI-compatible API
- **Env var**: `DEEPSEEK_API_KEY`
- **Script**: `scripts/translate-batch.ts`
- **Usage**: `pnpm tsx scripts/translate-batch.ts --text <slug> [--start N] [--end N] [--delay MS]`
- **Parallelization**: Split chapter ranges across multiple background processes (e.g., 4 workers for ZZYL ch 58-78, 79-99, 100-120, 121-140)
- **Batching**: Paragraphs chunked by character limit (zh=1500, grc/la=6000 chars per API call)
- **Skip logic**: Already-translated chapters are skipped automatically
- **JSON repair**: Handles malformed LLM output (truncated arrays, unescaped quotes, missing brackets)

### Tamil Translation Workflow (MANDATORY — 3-Agent Staggered Pipeline)

**When the user says "translate this Tamil text", you MUST follow this 3-agent staggered pipeline:**

**Agent 1 (Translator)** — Launch immediately:
1. Process raw text → JSON + seed into DB (if not already done)
2. Create shared progress file: `docs/tamil-translation-notes/<text-slug>-pipeline-progress.md`
3. Run `scripts/translate-tamil.ts --text <slug> --delay 5000`
4. Update progress file after every ~20-30 poems with completion status
5. Mark "STAGE 1 COMPLETE" when done

**Agent 2 (Reviewer)** — Launch when ≥ 20 poems are translated (staggered start):
1. Read completed translations from DB + Tamil source from processed JSONs
2. Review poems in batches of 15-20 (scholarly notes, quality ratings, vocabulary errors)
3. Update progress file after each batch
4. After ALL poems reviewed: write `<text-slug>-reviewer-notes.md` and `<text-slug>-retranslation-requests.md`
5. Mark "STAGE 2 COMPLETE" in progress file

**Agent 3 (Master Retranslator)** — Launch after BOTH Stage 1 and Stage 2 COMPLETE:
1. Read all reviewer notes and retranslation requests
2. Identify systemic prompt improvements (patterns across many poems)
3. Update Tamil prompt in `prompts.ts` if needed
4. Run `scripts/translate-tamil.ts --text <slug> --retranslate --delay 5000`
5. Verify HIGH-priority fixes
6. **Editorial clarification pass (MANDATORY)**: Translate all Tamil terms into English with [transliteration] on first use only (e.g., "war-bard [porunar]", "lyre [yaazh]"). After first use, English only. Make text fully accessible to non-Tamil readers. Create as new TranslationVersion (v3).
7. Write `<text-slug>-retranslation-report.md`

**Key constraint:** Agent 3 waits for Agent 2's FULL assessment because prompt improvements are *systemic* (affect all poems). Per-poem retranslation without the full error pattern wastes API calls.

**Coordination:** All 3 agents read/write the shared progress file (`<text-slug>-pipeline-progress.md`). This tracks per-poem status and inter-agent communication. See `docs/tamil-translation-orchestration.md` for the full format and design rationale.

**Technical details:**
- Pipeline documented in: `docs/tamil-translation-orchestration.md`
- Notes directory: `docs/tamil-translation-notes/`
- Script: `scripts/translate-tamil.ts` (uses `@google/genai` SDK, NOT DeepSeek)
- Prompt: `src/server/translation/prompts.ts` → `ta:` entry (45 lines of Tamil-specific guidance)
- The `--retranslate` flag creates a new version instead of skipping already-translated chapters
- For large anthology works (400+ poems): run Agent 1 only, spot-check quality on a sample of 20-30

**Available complete Tamil raw texts (non-Sangam, ready for processing):**

| Text | Location | Size |
|------|----------|------|
| Nandikkalambakam | `data/raw/nandikkalambakam/nandikkalambakam-clean.txt` | 114 poems, 641 verse lines |
| Yashodhara Kaviyam | `data/raw/yashodhara-kaviyam/` | 5 carukkams, 330 verses |
| Udayanakumara Kaviyam | `data/raw/udayanakumara-kaviyam/` | 6 kandams, 367 verses |

### Adding New Texts

1. Place raw text files in `data/raw/<dirname>/`
2. Write a processing script: `scripts/process-<name>.ts`
   - Output: `data/processed/<slug>/chapter-NNN.json`
   - Format: `{ chapterNumber, title, sourceContent: { paragraphs: [{ index, text }] } }`
3. Add author entry to `scripts/seed-db.ts` AUTHOR array (if new author)
4. Add text entry to `scripts/seed-db.ts` TEXTS array with `processedDir` path
5. Run `pnpm tsx scripts/seed-db.ts` to seed into database
6. For non-Tamil texts: run `pnpm tsx scripts/translate-batch.ts --text <slug>`
7. For Tamil texts: follow the 3-agent staggered Tamil Translation Workflow above

### Processing Scripts

| Script | Text | Notes |
|--------|------|-------|
| `process-ptochoprodromos.ts` | Ptochoprodromika | Strips every-5th-line numbers, splits on 2+ blank lines |
| `process-huangdi.ts` | Huang Di Nei Jing | Strips `===` separators and section headers, extracts content paragraphs |
| `process-chuanxilu.ts` | Chuan Xi Lu | Handles dialogue format |
| `process-lombards.ts` | Historia Langobardorum | Latin chronicle, paragraph splitting |
| `process-carmina-graeca.ts` | Carmina Graeca Medii Aevi | **IMPLEMENTED** — 6-module pipeline in `scripts/lib/carmina/`, source at `data/difficult_extra_processing/carmina_graeca_medii_aevi_multiple_titles.txt`, 21 poems extracted (see docs/) |

### Plans & Design Documents

| Document | Purpose |
|----------|---------|
| `docs/plan-carmina-graeca-processing.md` | Processing plan + implementation results for the Carmina Graeca pipeline (21 poems, 10,952 verse lines) |
| `docs/plan-carmina-graeca-agents.md` | Dual-agent quality pipeline: Processor + Critic agents working together to produce clean .txt files |
| `docs/carmina-graeca-scratchpad.md` | Shared working notes between Processor and Critic agents (read this for latest status) |
| `docs/carmina-graeca-critiques.md` | Critic agent's formal per-chapter quality evaluations |
| `docs/tamil-translation-orchestration.md` | Multi-agent Tamil translation quality pipeline: 4 stages (translate → notes → review → retranslate) |
| `docs/tamil-translation-notes/` | Directory of Tamil pipeline outputs: translator notes, Gemini observations, reviewer assessment, retranslation requests, master report |

### Key Schema Notes

- `texts.textType`: "prose" (default) or "poetry" — controls InterlinearViewer display mode
- `texts.compositionYear`: integer, can be negative for BCE dates (e.g., -200 for 200 BCE)
- `texts.compositionEra`: human-readable era string
- `discussion_threads` / `discussion_posts`: threaded per-chapter discussions
- All translations go through `translations` → `translation_versions` (append-only version chain)

### Translation Prompts

Located in `src/server/translation/prompts.ts`. Language-specific:
- **zh**: Neo-Confucian terminology guidance (理=principle, 氣=vital force, etc.)
- **grc**: Medieval/Byzantine Greek register
- **la**: Latin with genre-appropriate register

Note: The Chinese prompt is tuned for Neo-Confucian texts. Medical texts (Huang Di Nei Jing) and other genres work adequately but could benefit from text-specific prompts in the future.

### GitHub Repository

`https://github.com/translorentz/translation-wiki.git` — deployed to Vercel
