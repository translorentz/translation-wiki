# CLAUDE.md

Project guidance for Claude Code. For full historical context, see `ARCHIVED_CLAUDE.md`.

---

## ⚠️ CRITICAL SECURITY RULES ⚠️

**INCIDENT RECORD (2026-01-25):** Swap file containing API keys was committed. Gemini key revoked. Gitleaks hook now installed.

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

## Active Tasks (2026-01-25)

### IN PROGRESS

| Task | Status | Notes |
|------|--------|-------|
| Rizhilu translation | 4 workers | 32 chapters, logs at `/tmp/rizhilu-worker{1-4}.log` |
| Translation Gap Fixer | Running | `scripts/fill-translation-gaps.ts` — 21 chapters with gaps across 7 texts |
| Armenian "Delays" Fix | Agent a9fb74b | Finding/fixing "Delays" substitution for Armenian chars |
| Nandikkalambakam Stage 3 | Agent aa88334 | Retranslating 114 poems, editorial pass |
| Yashodhara Kaviyam Stage 1 | Agent a1cae1c | Processing + translating 330 verses |
| Eustathius Odyssey | 3 workers | 10/27 chapters done (ab5dae1, a4043fb, afff370) |
| Shisan Jing Zhushu | ~20 workers | 13 texts, 455 chapters total |
| Tamil Stage 2 Reviews | Agents reviewing | Udayanakumara (ae734cc) still reviewing |

### RECENTLY COMPLETED
- Armenian Initiative: 6 texts, 195 chapters ✓
- Security remediation: gitleaks, history purge, creds rotated ✓
- Diarium Urbis Romae: 66/66 chapters ✓
- Greek XML R2: 53/53 chapters ✓
- Kongzi Jiayu: 80/80 chapters ✓

---

## Project Overview

Public wiki for open-source translations of pre-contemporary classical texts. Side-by-side source/translation display. Users edit and endorse AI-generated translations.

**Live:** https://deltoi.com | **GitHub:** https://github.com/translorentz/translation-wiki.git

**Stack:** Next.js 15, TypeScript, tRPC, Drizzle ORM, NextAuth.js, Neon PostgreSQL, Vercel

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
4. `pnpm tsx scripts/seed-db.ts`
5. `pnpm tsx scripts/translate-batch.ts --text <slug>` (or Tamil workflow below)

**Title convention:** "English Name (Transliteration)" — e.g., "Classified Conversations of Master Zhu (Zhu Zi Yu Lei)"

---

## Translation Pipeline

- **Engine:** DeepSeek V3 (`deepseek-chat`)
- **Script:** `scripts/translate-batch.ts --text <slug> [--start N] [--end N]`
- **Batching:** zh=1500 chars, grc/la=6000 chars per API call
- **Parallelization:** Split ranges across background workers
- **Skip logic:** Already-translated chapters skipped automatically

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

## Workflow Index

| Workflow | When | Key Script |
|----------|------|------------|
| Standard Text | Clean source | `scripts/process-<name>.ts` |
| OCR Processing | Noisy scans | `scripts/lib/<name>/` multi-module |
| TEI-XML | Greek XML | `scripts/lib/greek-xml/` |
| Tamil Pipeline | All Tamil | `scripts/translate-tamil.ts` |
| Batch Translation | Large zh/grc/la | `scripts/translate-batch.ts` |

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

**Languages:** zh (Chinese), grc (Greek), la (Latin), ta (Tamil), hy (Armenian), it (Italian)

**~45 texts, ~2,500+ chapters** — See `docs/text-inventory.md` for complete list with slugs, chapter counts, and types.

Key collections:
- **Chinese:** Zhu Zi Yu Lei (140), Shisan Jing Zhushu (455 across 13 texts), Kongzi Jiayu (80), Rizhilu (32)
- **Greek:** Historia Nova (287), Eustathius Odyssey (27), Carmina Graeca (21)
- **Latin:** Lombards (82), Regno (56), Diarium (66)
- **Armenian:** 6 texts (195 total)
- **Tamil:** Nandikkalambakam (114), Yashodhara (330 verses), Udayanakumara (366 verses)

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
├── translate-batch.ts      # DeepSeek translation
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

### Yashodhara Commentary Contamination
`process-yashodhara-kaviyam.ts` strips commentary from file 1 but NOT file 2. Chapters 3-5 are contaminated. **Stage 3 must fix script and re-seed BEFORE retranslating.** See `ACTIVE_AGENTS.md` for details.
