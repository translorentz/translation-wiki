# Tamil Translation Orchestration

## Overview

A multi-agent quality pipeline for translating classical Tamil literature. The workflow produces a scholarly-grade translation through iterative review and correction, using Gemini 2.5 Flash as the translation engine with progressively refined prompts.

The pipeline uses **3 agents with staggered starts** — the Reviewer can begin work while the Translator is still translating, and the Master Retranslator starts after both are complete. A shared progress file coordinates handoffs between agents.

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ Timeline                                                            │
│                                                                     │
│ Agent 1 (Translator):  [=====translating poems 1-114==========]     │
│                              ↓ (20+ poems done)                     │
│ Agent 2 (Reviewer):         [====reviewing poems as available====]  │
│                                                    ↓ (all reviewed) │
│ Agent 3 (Master):                                  [==retranslate=] │
│                                                                     │
│ Shared progress file: updated by all 3 agents continuously          │
└─────────────────────────────────────────────────────────────────────┘
```

**Key constraint**: The Master Retranslator identifies *systemic* prompt improvements based on patterns across many poems. It MUST wait for the Reviewer's complete assessment before starting. Per-poem retranslation without seeing the full error pattern loses the benefit of prompt improvement.

## Shared Coordination File

Location: `docs/tamil-translation-notes/<text-slug>-pipeline-progress.md`

This file is read and written by all 3 agents. It tracks per-poem status and inter-agent communication.

### Format

```markdown
# <Text Name> — Pipeline Progress

## Status Summary
- Stage 1 (Translate): 85/114 complete
- Stage 2 (Review): 60/114 complete
- Stage 3 (Retranslate): NOT STARTED (waiting for Stage 2 to finish)

## Poem Status

| Poem | Stage 1 | Stage 2 | Stage 3 | Notes |
|------|---------|---------|---------|-------|
| 1    | DONE    | DONE    | -       |       |
| 2    | DONE    | DONE    | -       | vocab issue: X |
| 3    | DONE    | PENDING | -       |       |
| ...  |         |         |         |       |

## Agent Communication

### Translator → Reviewer
- Batch 1 (poems 1-30) complete. Notable issues: [...]
- Batch 2 (poems 31-60) complete.

### Reviewer → Master
- [Written after all reviews complete]
- Systemic issues found: [...]
- Priority retranslation targets: poems X, Y, Z
- Recommended prompt changes: [...]

### Master → All
- Prompt updated: [description of changes]
- Retranslation batch 1 complete: poems [...]
```

## Agent Details

### Agent 1: Translator

**Trigger**: Launched first. Runs `translate-tamil.ts`.

**Actions**:
1. Run `pnpm tsx scripts/translate-tamil.ts --text <slug> --delay 5000`
2. After every ~20-30 poems translated, update the progress file with completion status
3. Note any translation errors or unusual outputs in the "Agent Communication" section
4. When complete, write "STAGE 1 COMPLETE" in the progress file

**Output files**:
- TranslationVersion v1 in database (per poem)
- Updates to `<text-slug>-pipeline-progress.md`

**Start condition**: Immediately (no dependencies)

### Agent 2: Reviewer

**Trigger**: Launched when Translator has completed ≥ 20 poems (check progress file or DB).

**Actions**:
1. Read completed translations from the DB (query by text slug + chapter numbers)
2. Read the Tamil source text from the processed JSON files
3. Review poems in batches of 15-20, writing scholarly notes:
   - Per-poem quality ratings (GOOD / ADEQUATE / PROBLEMATIC)
   - Vocabulary errors (Tamil term → wrong English, correct English)
   - Literary/cultural context missed
   - Genre-specific issues
4. Update progress file after each batch
5. After reviewing ALL poems, write:
   - `docs/tamil-translation-notes/<text-slug>-reviewer-notes.md` (comprehensive assessment)
   - `docs/tamil-translation-notes/<text-slug>-retranslation-requests.md` (prioritized fixes)
   - Summary in the "Reviewer → Master" section of the progress file
6. Mark "STAGE 2 COMPLETE" in the progress file

**Output files**:
- `<text-slug>-reviewer-notes.md` — per-poem analysis, vocabulary tables, quality grades
- `<text-slug>-retranslation-requests.md` — specific fixes with priorities (HIGH/MEDIUM/LOW)
- Updates to `<text-slug>-pipeline-progress.md`

**Start condition**: Progress file shows ≥ 20 poems at Stage 1 DONE
**Important**: The Reviewer must wait for ALL poems to be Stage 1 DONE before writing the final comprehensive assessment. It can review poems as they come in, but the final report requires the complete picture.

### Agent 3: Master Retranslator

**Trigger**: Launched after BOTH "STAGE 1 COMPLETE" and "STAGE 2 COMPLETE" appear in the progress file.

**Actions**:
1. Read all reviewer notes and retranslation requests
2. Identify systemic issues (vocabulary patterns, genre misunderstandings, prompt gaps)
3. Update Tamil prompt in `src/server/translation/prompts.ts` if systemic improvements identified
4. Optionally adjust translate-tamil.ts config (batch size, temperature)
5. Run `pnpm tsx scripts/translate-tamil.ts --text <slug> --retranslate --delay 5000`
6. Verify HIGH-priority fixes by querying the DB
7. **Editorial clarification pass** (MANDATORY): After retranslation, read the new translations from the DB and perform an editorial pass to ensure accessibility:
   - Translate all Tamil terms into English with transliteration in [brackets] on FIRST occurrence only
   - Examples: "porunar" → "war-bard [porunar]"; "yaazh" → "lyre [yaazh]"; "tadari" → "forked drum [tadari]"
   - After first use, use only the English term (no brackets)
   - Translate structural/genre markers if left in Tamil (e.g., taravu, taazhisai → include English gloss)
   - Ensure the text is comprehensible to an English reader with no Tamil knowledge
   - Political/cultural formulas should be explicit (e.g., "one umbrella" → "under one parasol — a single sovereign rule")
   - Be sparing with brackets — only for culturally important terms, not every word
   - Create the clarified version as a new TranslationVersion (v3) with editSummary noting the editorial clarification
8. Write final report: `docs/tamil-translation-notes/<text-slug>-retranslation-report.md`
9. Update progress file with Stage 3 completion status

**Output files**:
- Updated `prompts.ts` (if prompt changes needed)
- TranslationVersion v2 (retranslation) + v3 (editorial clarification) in database
- `<text-slug>-retranslation-report.md` — before/after comparison, prompt changes, fix verification, clarification changes
- Final updates to `<text-slug>-pipeline-progress.md`

**Start condition**: Progress file shows BOTH Stage 1 and Stage 2 COMPLETE

## File Structure (per text)

```
docs/tamil-translation-notes/
├── <text-slug>-pipeline-progress.md     (shared coordination — all 3 agents)
├── <text-slug>-reviewer-notes.md        (Agent 2 output)
├── <text-slug>-retranslation-requests.md (Agent 2 output)
└── <text-slug>-retranslation-report.md  (Agent 3 output)
```

## Launching the Pipeline

When the user says "translate this Tamil text through the full workflow":

### Step 1: Launch Agent 1 (Translator)
```
- Process raw text → JSON (if not already done)
- Seed into DB (if not already done)
- Create the progress file with empty poem status table
- Run translate-tamil.ts
- Update progress file as poems complete
```

### Step 2: Launch Agent 2 (Reviewer) — staggered start
```
- Start condition: ≥ 20 poems show Stage 1 DONE in progress file
- If Translator agent is still running, that's fine — Reviewer works on what's available
- Reviewer polls progress file or DB to find newly-available poems
- Reviews in batches, writes notes incrementally
- Waits for Stage 1 COMPLETE before writing final assessment
```

### Step 3: Launch Agent 3 (Master Retranslator)
```
- Start condition: BOTH Stage 1 COMPLETE and Stage 2 COMPLETE in progress file
- Reads all notes, makes systemic prompt improvements
- Retranslates all poems with improved prompt
- Writes final report
```

## Spawn Commands (for orchestrating agent)

The orchestrating agent (or user) should:

1. **Spawn Agent 1** immediately
2. **Poll the progress file** (or check DB) every few minutes
3. **Spawn Agent 2** once ≥ 20 poems are translated
4. **Wait for both agents to report COMPLETE**
5. **Spawn Agent 3** after both are done

If running in a single session with background agents:
- Launch Agent 1 in background
- Check progress periodically
- Launch Agent 2 in background when ready
- Wait for both to complete
- Launch Agent 3 in background

## Key Design Decisions

1. **Staggered parallelism**: The Reviewer doesn't idle while the Translator works. For a 114-poem text, this can overlap ~60% of the review time with translation time.

2. **Systemic over per-poem**: The Master Retranslator waits for the FULL review because prompt improvements are systemic (affect all poems), not per-poem fixes. A premature retranslation with an incomplete prompt wastes API calls.

3. **Shared progress file**: All agents can see each other's status without needing direct communication. The file serves as both coordination mechanism and audit trail.

4. **Batch processing for Reviewer**: Reviewing in batches of 15-20 poems allows the Reviewer to spot patterns early, while still producing a coherent final assessment.

5. **Append-only versioning**: Each retranslation creates TranslationVersion v2 (or v3, v4...). Old versions preserved for comparison.

6. **Prompt evolution across texts**: The prompt improvements made for one text benefit the NEXT text's Stage 1 translation. Over time, the Tamil prompt becomes increasingly comprehensive.

## Lessons Learned

### Porunararruppadai (first text through pipeline)
- Gemini 2.5 Flash handles ~80-85% of archaic Tamil vocabulary correctly
- Systematic failures cluster in: food terms, musical technique terms, material culture
- The "narantham = civet" error type (wrong word entirely) is rare but critical
- 2500-char batch size works best for poetry with the expanded prompt (4000 caused truncation)
- Temperature 0.3 is reliable; 0.4-0.5 more literary but less consistent
- The arruppadai genre's person-shifts (1st→2nd) need explicit prompt guidance
- Grade improvement after full pipeline: B- → B/B+

### Batch Size Guidance
- Tamil poetry: MAX_CHARS_PER_BATCH = 2500 (dense imagery + expanded prompt = more output per char)
- Tamil prose: MAX_CHARS_PER_BATCH = 4000 (moderate density)
- maxOutputTokens: 16384 (increased from 8192 after truncation issues)

## For Large Anthology Works (400+ poems)

For very large texts like Akananuru (400 poems):
1. Run Stage 1 only for all poems
2. Spot-check quality on a sample of 20-30 poems across the collection
3. If quality is adequate (B or above): done
4. If systematic issues found: run Stages 2-3 on a representative sample, then retranslate all
5. Do NOT run full per-poem review on 400+ poems — diminishing returns
