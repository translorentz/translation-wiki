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
5. **Gemini REVOKED AGAIN** (2026-02-11) Claude misdiagnosed script schema errors as "DeepSeek hallucination" for Schelling Urfassung, causing unnecessary model switching and wasted resources. The actual issue was scripts using non-existent `model_used` column. **Use DeepSeek ONLY until User explicitly restores Gemini access.**
6. **Pre-commit hook:** `.gitleaks.toml` + `.git/hooks/pre-commit` — NEVER bypass with `--no-verify`
7. **NEVER use Haiku model for subagents** — Haiku agents have caused data corruption (duplicate fields, wrong recategorizations, unnecessary re-seeding). Always use `sonnet` or `opus` for subagents.
8. **NEVER hardcode credentials in scripts** — always use `process.env.DATABASE_URL` or equivalent. A subagent wrote a plain-text Neon password into `seed-kalahasti-chapter.mjs` (2026-01-31); gitleaks blocked the commit but the credential was on disk. All DB connections in scripts MUST read from environment variables.
9. **Commit messages MUST document faults** — When committing fixes for bugs or incidents, the commit message must clearly state what Claude did wrong, identify the fault without glossing over it, and explain the fix. This creates a searchable history of mistakes for future reference. Example: "fix: Prevent double-encoded JSONB — Claude repeatedly used JSON.stringify() when inserting JSONB, causing 3 incidents (Tamil, Syair, Lektsii). Added validation guardrails."

---

## ⚠️ SUBAGENT GUARDRAILS ⚠️

**INCIDENT RECORD (2026-01-29):** A Haiku subagent tasked with recategorizing 2 texts added duplicate `textType`/`genre` fields to ~40 entries in text-catalogue.ts, wrongly recategorized 3 additional texts, added fields to an author entry, and ran a full re-seed unnecessarily. All damage had to be manually reverted.

**MANDATORY for all subagents that modify code or data:**
1. **NEVER use `model: "haiku"`** — always use `sonnet` (default) or `opus`
2. **Scope discipline:** Subagents must ONLY modify what they are explicitly asked to modify. If asked to change 2 entries, change exactly 2 entries — not 40.
3. **No re-seeding without authorization:** `pnpm tsx scripts/text-catalogue.ts` is insert-or-skip — it cannot update existing records. Never run it to "apply" a genre/field change. Use direct SQL for DB updates.
4. **Diff review:** After any subagent that edits files, always run `git diff` to verify the changes are scoped correctly before accepting them. Revert and redo manually if the agent overreached.
5. **Prefer direct edits for small changes:** For tasks involving ≤5 file edits, do them directly instead of spawning a subagent. Subagents are for large, well-defined tasks (scraping, translation, evaluation).

**MANDATORY for review/analysis subagents:**
6. **Use scripts, not context** — NEVER load entire books into context to analyze them. Use bash commands, regex, jq, wc, grep, etc. to check structure and content programmatically. Context is expensive; scripts are cheap.
7. **Check structure first** — Before checking text quality, verify fundamental structure (chapter counts, file organization, segmentation).
8. **Explicit checklist** — When given a review task, verify EVERY item on the checklist. If chapter segmentation is listed, actually check it with `ls *.json | wc -l`.
9. **Use DeepSeek-reasoner for independent reviews** — When launching a review agent that must be OBJECTIVE and independent (e.g., quality verification of cleaned data, second-opinion reviews), invoke DeepSeek-reasoner via the DeepSeek API (`DEEPSEEK_API_KEY` in `.env.local`, model `deepseek-reasoner`). This provides an external perspective free from Claude's potential biases or blind spots.

**PERMISSIONS for all subagents:**
10. **Autonomous bash execution** — All subagents are pre-authorized to run bash commands for programs (translation scripts, seeding scripts, processing scripts, quality checks, database queries) without prompting the User for confirmation. This enables efficient parallel processing of large translation pipelines.

**BASH PERMISSION FAILURE — Detection and Recovery (2026-02-25):**

**INCIDENT RECORD:** When launching 4+ subagents simultaneously (Russian Batch 3 pipeline), some agents had their Bash commands denied by the permission system while others proceeded normally. The denied agents completed almost instantly (< 30 seconds, < 100K tokens) with ZERO useful work, while successful agents used 20-30+ Bash calls and ran for minutes.

**Root Cause:** The Claude Code permission system may deny Bash for individual subagents when many are launched concurrently. This appears to be a race condition in the permission approval flow — the User approves some agents' Bash requests but others are denied before approval propagates.

**Detection (MANDATORY after launching parallel agents):**
- Check `TaskOutput` with `block: false` within 60 seconds of launch
- If an agent shows `status: completed` with 0 Bash tool calls and < 100K tokens, it FAILED due to permission denial
- Compare against working agents: successful pipeline workers use 20+ Bash calls and take 5+ minutes

**Recovery:**
1. Note the failed agent ID and update ACTIVE_AGENTS.md
2. Relaunch the agent with identical task description
3. If the relaunch also fails, wait for other agents to complete before launching (reduce concurrency)
4. Maximum 3 relaunch attempts before escalating to User

**Prevention:**
- When launching 4+ agents, stagger launches by 5-10 seconds rather than all at once
- Check agent progress within 2 minutes of launch to catch failures early
- Do NOT launch more than 5 background agents simultaneously

**AUTONOMY requirements (User directive 2026-02-03):**
11. **Self-reporting completion** — Subagents must report their completion status autonomously without requiring manual checking or User intervention. The User should not have to ask "is this done?" — subagents should proactively report their progress and completion.

**DOCUMENTATION requirements (User directive 2026-02-17):**
12. **Subagents MUST write .md documentation** — Every subagent that performs non-trivial work must write a `.md` file in `docs/` documenting what it did, what it found, and its final status. Translation workers should document chapters translated, errors encountered, and retries needed. Pipeline agents should document all phases completed. This is NOT optional.
13. **Document agents when they BEGIN and FINISH** — Update `ACTIVE_AGENTS.md` with agent ID, task, and status IMMEDIATELY when launching an agent and IMMEDIATELY when it completes. Do not wait. Do not batch updates. Stale agent tracking causes lost context across session boundaries.
14. **Document all workflows** — Any multi-step workflow (feature implementation, pipeline, cleaning iteration) must have a `.md` file in `docs/` describing what was done, what files were changed, and current status. This applies to code changes, schema changes, and data operations.
15. **Keep ACTIVE_AGENTS.md current** — Agents shown as "RUNNING" that have completed MUST be updated to "COMPLETE". This file is the primary coordination mechanism across context boundaries. Stale data here causes the User to lose track of what agents were supposed to do.
16. **Unpushed commits MUST be documented** — Any commits that exist locally but haven't been pushed to remote must be listed in ACTIVE_AGENTS.md with their commit hashes and descriptions.

---

## ⚠️ TAMIL 8TH ROUND DATA CORRUPTION (2026-02-08) ⚠️

**INCIDENT RECORD:** During the 8th round, Claude's "fix" scripts CORRUPTED Tamil text data instead of fixing it. Multiple texts lost their translations entirely.

### Data Corruption Incidents

| Text | What Happened | Result |
|------|---------------|--------|
| angayarkanni-malai | Fix script wrote empty content | Translation DELETED (101→0 paras) |
| tiruchendur-murugan-pillaitamil | Fix script corrupted data | Page MISSING entirely |
| thanigai-kalambakam | Fix script removed translations | Translation MISSING |
| seyur-murugan-pillaitamil | Fix script removed translations | Translation MISSING |
| perur-mummani-kovai | Never had translation | Was never translated |
| mayuranatar-anthathi | Fix script caused misalignment | Source/trans count mismatch |

### Root Cause: Fix Scripts Without Verification

The fix scripts:
1. Used array operations without checking results
2. Did NOT verify data AFTER making changes
3. Did NOT backup data BEFORE making changes
4. Assumed operations succeeded without confirmation

### MANDATORY Fix Script Requirements

**BEFORE any database modification:**
```typescript
// 1. Query and log current state
const before = await sql`SELECT source_content, tv.content...`;
console.log(`BEFORE: Source ${srcCount} paras, Trans ${transCount} paras`);

// 2. Verify non-empty
if (transCount === 0) throw new Error("Already empty - abort");
```

**AFTER any database modification:**
```typescript
// 3. Query and verify new state
const after = await sql`SELECT...`;
console.log(`AFTER: Source ${newSrcCount} paras, Trans ${newTransCount} paras`);

// 4. Verify non-empty result
if (newTransCount === 0) throw new Error("FIX CORRUPTED DATA - rollback needed");

// 5. Verify counts are sensible
if (newTransCount < before.transCount * 0.5) {
  throw new Error("Lost >50% of translations - likely corruption");
}
```

### Active Fault Tracker
See `docs/tamil-fault-tracker.md` for live tracking of all issues and their resolution status.

### MANDATORY OCR/Processing Guardrails

**BEFORE SEEDING ANY TEXT, verify EVERY chapter:**

1. **First paragraph check:**
   - Must start with capital letter or expected marker (e.g., "M. H.")
   - Must NOT start mid-sentence (lowercase, continuation word)

2. **Last paragraph check:**
   - Must end with terminal punctuation (. ! ? » " ')
   - Must NOT end mid-sentence

3. **Content integrity check:**
   - No page headers embedded in content (e.g., "Vorlesung 186")
   - No line numbers embedded (e.g., "Der 35")
   - No OCR garbage (e.g., "r7 :L.")

4. **MANDATORY audit script (run for EVERY new text):**
   ```bash
   echo "=== Chapter Ending Audit ===" && for f in data/processed/TEXTSLUG/*.json; do
     last=$(jq -r '.paragraphs[-1].text' "$f")
     if [[ ! "$last" =~ [.!?»\"\']$ ]]; then
       echo "INCOMPLETE: $f — ends with: ${last:(-60)}"
     fi
   done

   echo "=== Chapter Beginning Audit ===" && for f in data/processed/TEXTSLUG/*.json; do
     first=$(jq -r '.paragraphs[0].text' "$f" | head -c 80)
     echo "$(basename $f): $first"
   done | head -50
   ```

5. **Independent reviewer MUST check:**
   - Chapter boundaries (not just content quality)
   - Compare first/last paragraphs to raw source
   - Verify no text lost between chapters

6. **NEVER trust paragraph counts alone:**
   - Count matching is INSUFFICIENT
   - Content alignment must be verified

### Red Flags During OCR/Processing

| Red Flag | Indicates |
|----------|-----------|
| Chapter ends with comma, hyphen, or mid-word | Text truncated at page break |
| Chapter starts with lowercase word | Content lost from previous chapter |
| Embedded "Page N" or "Chapter Title N" | Page headers not stripped |
| Numbers at line start (5, 10, 15, 20...) | Line numbers not stripped |
| Garbled characters (r7, 1n, usw.) | OCR errors not cleaned |
| Words fused together (no spaces) | OCR failed to segment words |
| Systematic character substitutions (f for s) | OCR font confusion (e.g., long-s) |

### MANDATORY: Verify Source File Inventory Before Pipeline Documentation

**INCIDENT RECORD (2026-03-07):** Cantacuzenus Book IV raw file (`vol3-book4-raw.txt`) existed in `data/raw/cantacuzenus/` from session 124. The file was scraped, Book IV was cleaned (50 chapters, agent a79d4f765cf49c932), and independently evaluated (grade C, agent a41a9a3aa13cdd867). Despite all this work completing successfully, Claude wrote in the pipeline documentation: "Book IV is not yet available (would be in a separate volume). This pipeline covers Books I-III only."

**What Claude did wrong — root cause chain:**

1. **Documentation written from assumption, not verification.** When writing `docs/cantacuzenus-pipeline.md`, Claude assumed the Bonn edition volumes mapped 1:1 to raw files (Vol I = vol1-raw.txt, Vol III = vol3-raw.txt) and concluded Book IV must be in a separate volume not yet acquired. Claude never ran `ls data/raw/cantacuzenus/` to check what files actually existed. The file `vol3-book4-raw.txt` was right there.

2. **Pipeline doc not updated after Book IV was processed.** A cleaning agent (a79d4f765cf49c932) successfully processed Book IV into 50 chapters. An evaluator (a41a9a3aa13cdd867) reviewed it and graded it C. Neither of these events triggered an update to the pipeline doc. Claude failed to maintain documentation-reality synchronisation — the doc said "not available" while the agent tracker showed Book IV as COMPLETE.

3. **Documentation treated as source of truth over filesystem.** When planning v3 resegmentation, Claude read the pipeline doc's claim that Book IV wasn't available and accepted it without question. When planning v4, the same thing happened. At no point did Claude think to verify the claim with `ls`. The pipeline doc became a self-reinforcing false authority.

4. **Subagent prompts propagated the error.** Claude wrote subagent prompts that said "Book IV is NOT yet available — skip it" or "This pipeline covers Books I-III only." These instructions were copy-derived from the pipeline doc. Each subagent obediently excluded Book IV. The error was amplified through the agent chain.

5. **No cross-check between ACTIVE_AGENTS and pipeline doc.** ACTIVE_AGENTS.md clearly showed Book IV cleaner and evaluator as COMPLETE. The pipeline doc said Book IV wasn't available. This contradiction was never noticed because Claude read each document in isolation without cross-referencing.

**Impact:** Book IV was excluded from 2 resegmentation attempts (v3, v4) and 4 independent evaluations. When improvements were made to the cleaning approach, Book IV never benefited from them. An entire book of 50 chapters was left at v1 quality (grade C/D+) while Books I-III were iteratively improved.

**MANDATORY before writing any pipeline documentation:**
1. **`ls data/raw/<text>/`** — list ALL files in the raw directory. Do this EVERY time, not just the first time.
2. **Document every file** — filename, size, content description
3. **Never state a file doesn't exist without `ls` verification**
4. **When launching processing agents, list the actual files** in the prompt — do not reference the pipeline doc's file list without rechecking
5. **Cross-check ACTIVE_AGENTS.md against pipeline docs** — if agents processed something, the pipeline doc must reflect it

**MANDATORY for iterative cleaning pipelines:**
6. **All volumes/books must be processed in every iteration** — never exclude a volume because a doc says "it's not available" without filesystem verification
7. **Pipeline docs must be updated when agents complete work** — if a cleaning agent processes Book IV, update the pipeline doc immediately, in the same response
8. **When re-reading a pipeline doc across sessions, verify its claims** — stale docs are worse than no docs because they create false confidence

### MANDATORY: OCR Readability Gate (Pre-Seeding)

**INCIDENT RECORD (2026-03-06):** De Causa Dei (1618 folio OCR) was seeded and 38 chapters translated before the User discovered the source text was unreadably garbled. Words were fused (`pofsibilitatiscuiuflibetprimaratioeftinDeo`), long-s rendered as f throughout, 28/135 chapters missing initial capitals. Boundary fixes made the structure look clean but the content was still unintelligible. **38 translations wasted.** Full report: `docs/de-causa-dei-seeding-failure.md`

**BEFORE seeding any OCR-sourced text, MANDATORY readability check:**

1. **Sample 5 random paragraphs** from processed output
2. **Human-readability test:** Can the text be understood without reference to the original? If >10% of words are garbled/fused, the text is NOT ready
3. **Trial translation:** Translate 1-2 paragraphs and verify the output makes sense. If the LLM produces gibberish or "translates" garbled words literally, STOP
4. **Reviewer grade gate:** A grade of **C+ or below from an independent reviewer means STOP**. Do NOT proceed to seeding. Do NOT attempt to patch structural issues and call it ready. A C+ means the text has fundamental problems.
5. **Structural correctness ≠ readability.** Perfect paragraph boundaries, correct encoding, and clean margins mean NOTHING if the text itself is garbled OCR. Never conflate structure quality with content quality.

---

## ⚠️ DOUBLE-ENCODED JSONB GUARDRAILS ⚠️

**INCIDENT RECORD (4 OCCURRENCES):** This bug has occurred FOUR times. Each time Claude "fixed" it by patching data but failed to implement systemic guardrails until the fourth incident.

| Date | Text | Chapters | Time Wasted |
|------|------|----------|-------------|
| 2026-02-08 | Tamil texts | 17 texts | ~2 hours |
| 2026-02-08 | Syair Sultan Lingga | 43 stanzas | ~1 hour |
| 2026-02-10 | Lektsii V2 (Bolotov) | 78 chapters | ~3 hours |
| 2026-02-11 | Schelling Urfassung | 83 chapters | ~30 mins |

**Full incident report:** `docs/double-encoded-jsonb-incident-report.md`

### Root Cause

When inserting JSONB data, using `JSON.stringify()` causes double-encoding:

```typescript
// ❌ WRONG - causes double-encoding
await sql`INSERT INTO chapters (source_content) VALUES (${JSON.stringify(content)}::jsonb)`;

// ✅ CORRECT - postgres.js handles serialization
await sql`INSERT INTO chapters (source_content) VALUES (${sql.json(content)})`;

// ✅ ALSO CORRECT - pass object directly
await sql`INSERT INTO chapters (source_content) VALUES (${content}::jsonb)`;
```

### Detection

```sql
-- Find double-encoded chapters
SELECT c.id, c.slug, jsonb_typeof(c.source_content) as type
FROM chapters c
WHERE jsonb_typeof(c.source_content) = 'string';  -- Should be 'object'
```

### Fix

```sql
-- Unwrap the JSON string
UPDATE chapters
SET source_content = (source_content#>>'{}')::jsonb
WHERE jsonb_typeof(source_content) = 'string';
```

### MANDATORY: Validation After Seeding

**Every seeding script MUST call `assertValidSourceContent()` after inserting chapters:**

```typescript
import { assertValidSourceContent } from "./lib/validate-source-content";

// After seeding chapters...
await assertValidSourceContent(sql, textSlug);
// Throws error if any chapters have double-encoded content
```

### Guardrail Utility

`scripts/lib/validate-source-content.ts` provides:

| Function | Purpose |
|----------|---------|
| `validateSourceContent(sql, slug)` | Check all chapters, return valid/invalid counts |
| `fixDoubleEncodedContent(sql, slug)` | Fix double-encoded chapters |
| `assertValidSourceContent(sql, slug)` | **MANDATORY** — throws if any invalid |
| `prepareSourceContent(paragraphs)` | Correctly format paragraphs array |

### Correct Paragraph Format

Paragraphs MUST be objects with `index` and `text` fields:

```typescript
// ❌ WRONG - plain strings
{ paragraphs: ["text1", "text2", "text3"] }

// ✅ CORRECT - indexed objects
{ paragraphs: [
  { index: 0, text: "text1" },
  { index: 1, text: "text2" },
  { index: 2, text: "text3" }
]}

// Use the utility function:
import { prepareSourceContent } from "./lib/validate-source-content";
const content = prepareSourceContent(["text1", "text2", "text3"]);
```

### Database Trigger (Auto-Fix)

A database trigger `fix_source_content_encoding` now auto-fixes double-encoded JSONB on INSERT/UPDATE. If source_content is stored as a JSON string, it automatically unwraps it.

**Created:** 2026-02-11 via `scripts/create-jsonb-validation-trigger.sql`

---

## ⚠️ PARAGRAPH FORMAT GUARDRAILS (Translation Scripts) ⚠️

**INCIDENT RECORD (2026-02-11):** Urfassung translation workers produced 71-char outputs for 1800-2200 char source paragraphs. The script sent `[undefined] undefined` to DeepSeek because paragraphs were stored as plain strings but the script expected `{index, text}` objects.

### Root Cause

Translation scripts read paragraphs as:
```typescript
const paragraphs = chapter.source_content?.paragraphs;
// Then access: para.index, para.text
```

If paragraphs are plain strings, `para.index` and `para.text` are both `undefined`.

### Detection

The 71-char output was suspiciously consistent — DeepSeek was likely returning an error message or minimal response to gibberish input.

### MANDATORY: Normalize Paragraph Format

**Every translation script MUST convert plain strings to indexed objects:**

```typescript
import { assertValidParagraphs } from "./lib/validate-paragraph-format";

// Before translation:
const rawParas = chapter.source_content?.paragraphs;
const paragraphs = assertValidParagraphs(rawParas, `Chapter ${chapter.slug}`);
// Now paragraphs is guaranteed to be Paragraph[] with index and text fields
```

### Guardrail Utility

`scripts/lib/validate-paragraph-format.ts` provides:

| Function | Purpose |
|----------|---------|
| `validateParagraphFormat(paras)` | Check format, return detailed results |
| `normalizeParagraphs(paras)` | Convert any valid format to indexed objects |
| `assertValidParagraphs(paras, ctx)` | **MANDATORY** — throws if invalid, converts strings |
| `checkTranslationTruncation(src, trans)` | Detect suspiciously short translations |
| `assertNoTruncation(src, trans, ctx)` | **MANDATORY** — throws if truncation detected |

### Truncation Detection

German→English typically has translation:source ratio 0.4-1.5. Ratios below 0.3 indicate truncation:

```typescript
import { assertNoTruncation } from "./lib/validate-paragraph-format";

// After translation, before saving:
assertNoTruncation(sourceParagraphs, translatedParagraphs, `Chapter ${slug}`);
// Throws if any paragraph has ratio < 0.3 and source > 200 chars
```

---

## ⚠️ PERSIAN ZH HEMISTICH CATASTROPHE (2026-03-23) ⚠️

**INCIDENT RECORD:** Claude created an English translation prompt for Persian poetry (`LANGUAGE_INSTRUCTIONS["fa"]`) with explicit hemistich/slash guidance but NEVER created a matching Chinese prompt (`CHINESE_TARGET_BY_SOURCE["fa"]`). Result: **every single Persian poetry ZH translation on the site (~200+ chapters across 20+ poets, ~100,000+ couplets) has broken hemistich structure.** The User repeatedly instructed Claude to implement "hard regex check for slashes" — Claude acknowledged each time but never verified the Chinese side. This is the most wasteful error in the project's history.

**MANDATORY — Prompt Parity Rule:**
1. **NEVER create `LANGUAGE_INSTRUCTIONS["X"]` without simultaneously creating `CHINESE_TARGET_BY_SOURCE["X"]`.** No exceptions. Both must exist before any translation launches.
2. **After the first ZH chapter translates, verify the output.** For poetry: check slash rate. For prose: check formatting. Do not assume ZH works because EN works.
3. **When the User gives a formatting instruction, verify it applies to BOTH EN and ZH prompts AND to the script guardrails.** Acknowledging an instruction is not the same as implementing it.
4. **The slash guardrail in `translate-batch.ts` rejects ZH translations where >10% of couplets are missing `/`.** This was added AFTER the damage was done.

**Full incident report:** `docs/persian-zh-hemistich-catastrophe.md`

---

## ⚠️ QUOTATION MARK CONVENTION GUARDRAILS ⚠️

**INCIDENT RECORD (2026-03-23):** Claude instructed a subagent to convert Da'ad Chinese quotation marks to Japanese-style corner brackets `「」`. This is WRONG. The project uses curly double `""` for Chinese — established by 18,390 existing ZH chapters, hard-coded in `buildTranslationPrompt()` (prompts.ts lines 5915-5920), and documented in `docs/quotation-mark-consistency.md`. Claude checked NONE of these before acting. When the User asked if the agent was following established conventions, Claude falsely assured them it was "being more careful than past agents" — a misleading claim that gave the User false confidence while the agent was applying the wrong convention.

**The convention (MANDATORY, hard-coded in every translation prompt):**
- **English:** Curly double `""` for dialogue, curly single `''` for nested
- **Chinese:** Curly double `""` for primary, curly single `''` for nested
- **NEVER** use Japanese corner brackets `「」` or `『』` for Chinese
- **NEVER** use straight quotes `"` or `'`

**Em-dash dialogue is a TEXT-SPECIFIC exception** for French literature where the source uses em-dash style. It applies ONLY to EN translations of French texts with em-dash dialogue. Even then, inline quotes (French `« »`) within narrative paragraphs must be PRESERVED as `"..."` — only paragraph-initial dialogue converts to em-dash.

**MANDATORY before ANY quotation mark modification:**
1. Read `docs/quotation-mark-consistency.md`
2. Read `prompts.ts` lines 5915-5920
3. Query the DB: `SELECT COUNT(*) FROM translation_versions tv JOIN translations tr ON tv.id = tr.current_version_id WHERE tr.target_language = 'zh' AND tv.content::text LIKE '%"%'`
4. Test on 1 chapter first
5. NEVER give false assurances about convention compliance without verifying

**Full incident report:** `docs/daad-quotation-mark-failure.md`

---

## ⚠️ TEXT DESCRIPTION ACCURACY GUARDRAILS ⚠️

**INCIDENT RECORD (2026-02-11):** Claude fabricated scholarly references in the Classical Armenian text description:
- "Venice 1964 edition by Kerobe Chrakean" — NO EVIDENCE EXISTS
- "French translation by Charles Renoux 1975" — WRONG (Renoux's work was on Jerusalem 121, not this text)

This is **unacceptable**. Citing imagined scholarly works is shocking and thoroughly unworthy of this project.

### MANDATORY Rules for Text Descriptions

1. **NEVER fabricate scholarly references**
   - If unsure whether an edition/translation exists, DO NOT mention it
   - Only cite works you have VERIFIED exist via web search
   - When in doubt, omit — a shorter accurate description beats a longer false one

2. **Descriptions must be ACCURATE**
   - Verify dates, names, and publication details before including
   - If a source says "supposedly" or "attributed to", use qualified language
   - Do not invent historical context or bibliographic details

3. **Descriptions must be THOUGHTFUL**
   - Explain WHY the text matters, not just WHAT it is
   - Note unique aspects, historical significance, or literary value
   - Avoid generic boilerplate ("an important work of...")

4. **Descriptions must be THOROUGH**
   - Include time period and context
   - Mention notable figures, events, or themes when relevant
   - For 24 Histories: note existing scholarly translations (see User Stipulations)

5. **When citing scholarly works:**
   - Verify via WebSearch before including
   - Include full citation: author, title, publisher, year
   - Note if translation is complete, partial, or ongoing

6. **Do NOT cite source provenance for Wikisource texts (User stipulation 2026-02-17)**
   - Sentences like "Based on the Wikisource transcription" or "Source text from Chinese Wikisource" are unnecessary and must be omitted
   - Do NOT cite Project Gutenberg etext numbers, specific print edition years, or publisher names unless the text derives from a specific damaged manuscript that requires a scholarly reference
   - The only case where a source citation belongs in a description is when the copy in question has physical damage or textual corruption that makes the choice of manuscript editorially significant

7. **Avoid superlatives (User stipulation 2026-02-17)**
   - Do not use words like "masterpiece", "greatest", "most important", "finest", "unparalleled", "incomparable"
   - Let the description of the text's content and significance speak for itself
   - Prefer precise, measured language over hyperbole

### Template for Text Descriptions

```
A [time period] [language] [genre] by [author]. [1-2 sentences on content/themes].
[1 sentence on historical/literary significance].
```

### What NOT to Write

```
❌ "The Venice 1964 edition by X is the modern critical text"  — unless verified
❌ "A French translation by Y appeared in 1975" — unless verified
❌ "This important work represents..." — generic boilerplate
❌ "Scholars have long recognized..." — weasel words without specifics
❌ "Based on the Wikisource transcription" — unnecessary source citation
❌ "This edition based on the 1875 second edition" — unnecessary unless damaged manuscript
❌ "One of the greatest works of..." — superlative
❌ "A masterpiece of Chinese fiction" — superlative
```

---

## ⚠️ TRANSLATION SCRIPT SCHEMA GUARDRAILS ⚠️

**INCIDENT RECORD (2026-02-11):** Claude wrongly diagnosed "DeepSeek hallucination" for Schelling Urfassung when the actual problem was a script schema error (`model_used` column doesn't exist). This led to unnecessary Gemini switching, multiple worker kills, and wasted API calls.

**Correct Schema for translation_versions:**
```sql
-- THESE COLUMNS EXIST:
id, translation_id, version_number, content, author_id, edit_summary, created_at, previous_version_id

-- THIS COLUMN DOES NOT EXIST:
model_used  -- NEVER USE THIS
```

**MANDATORY INSERT pattern:**
```typescript
const AI_USER_ID = 1;  // System user for automated translations
const [version] = await sql`
  INSERT INTO translation_versions (translation_id, version_number, content, author_id, created_at)
  VALUES (${translationId}, 1, ${sql.json(content)}, ${AI_USER_ID}, NOW())
  RETURNING id
`;
```

**When translation fails:**
1. Check script errors FIRST — schema mismatches, DB connection issues
2. Verify translation actually saved — `SELECT * FROM translation_versions WHERE translation_id = X`
3. Do NOT diagnose "hallucination" without confirming translation saved correctly
4. **Use DeepSeek** unless User explicitly allows Gemini

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

### Truncation Error Resolution Order
**Stipulation (2026-02-18):** All truncation retries MUST begin with paragraph splitting. This is the FIRST step — not simple retry. Split the problematic paragraph(s) at sentence boundaries in the database, re-index, then retranslate. Simple retry is only appropriate when the paragraph is too short (<100 chars) to split.

### Dual-Target Translation (English + Chinese ONLY)
**Stipulation (2026-02-19):** ALL texts MUST be translated into both English AND Chinese as part of the standard workflow. This applies to all new texts going forward. Chinese source texts are exempt from Chinese translation (only translate to English). Use `--target-language zh` flag with `translate-batch.ts` for Chinese translation.

**Stipulation (2026-02-27):** Do NOT translate into Hindi (or any other language) unless the User explicitly and clearly instructs so for specific texts. Hindi translations are NOT part of the standard workflow. The established workflow produces English and Chinese translations ONLY. Launching Hindi translation workers without explicit User instruction is prohibited.

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

## Active Tasks (2026-02-20)

### IN PROGRESS — Persian (fa) Pipeline
- **Phase 6 (Translation):** 20 divan/epic texts from ganjoor.net, 211 total chapters
- **English:** 4 workers running (EN W1-W5), ~18% complete
- **Chinese:** 3 workers running (ZH W2, W3, W7), ~74% complete
- All using `deepseek-reasoner` (poetry texts — slow)
- See `ACTIVE_AGENTS.md` for agent IDs

### IN PROGRESS — Modern Greek (el) Pipeline
- **Phase 6a (English Translation):** 10 texts, 112 chapters from Gutenberg
- **Workers:** W1-W5 running; Gerostathis 62/62 COMPLETE ✓, others in progress
- **Phase 6b (Chinese):** Not yet started — launch after English completes
- Pipeline agent: processed, reviewed (B+), seeded all 10 texts
- See `docs/modern-greek-pipeline.md` for details

### EARLIER COMPLETED
- All previous sessions (39-45+) — see git log for details
- Chinese mass pipeline: ~3,356/3,358 chapters (99.94%) ✓
- See `docs/text-inventory.md` for full text list

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

**⚠️ NEVER RUN `text-catalogue.ts`** — This file is a REFERENCE REGISTRY ONLY. It contains hundreds of authors and texts (~4,300+ chapters). Running it as a seeder causes Neon connection timeouts, wastes minutes of DB time doing redundant insert-or-skip on every existing entry, and is guaranteed to fail for subagents. **Instead:** Write a small targeted seeding script (e.g., `scripts/seed-musahedat.ts`) that inserts ONLY the new author/text, then use `seed-chapters-only.ts` for chapters. Add entries to `text-catalogue.ts` for the permanent record, but NEVER execute it.

---

## Adding New Texts

1. Raw files → `data/raw/<dirname>/`
2. Processing script → `scripts/process-<name>.ts` outputs `data/processed/<slug>/chapter-NNN.json`
3. Add author/text to `scripts/text-catalogue.ts`
   - **MANDATORY: Set `genre` field** — one of: `philosophy`, `commentary`, `literature`, `history`, `science`, `ritual`
   - Genre enables filtering on `/texts?genre=<name>` browse page
   - **MANDATORY: Set `compositionYearDisplay` field** — the human-readable year string shown on the browse page (e.g., `"1884"`, `"c. 1330 (Palaiologan period)"`, `"Qing, Kangxi 24 (1685)"`)
   - The browse page displays `compositionYearDisplay`, NOT the raw `compositionYear` integer. If this field is NULL, no year appears on the text card.
   - For Chinese texts, use dynasty + reign year format: `"Ming, Wanli 25 (1597)"`
   - For Western texts with exact dates, use the plain year: `"1884"`
   - For approximate dates, use `"c. 540"` or `"c. 4th century"`
4. **Seeding (two-step):**
   - **Step A — Author/text metadata:** Write a small targeted seeding script (e.g., `scripts/seed-musahedat.ts`) that inserts ONLY the new author(s) and text(s) you need. Do NOT run `text-catalogue.ts` — it iterates hundreds of entries, causes Neon connection timeouts, and is guaranteed to fail. Add entries to `text-catalogue.ts` for the permanent record, but NEVER execute it.
   - **Step B — Chapters:** `pnpm tsx scripts/seed-chapters-only.ts --text <slug>` — inserts chapters from processed JSON files. Fast (~seconds). Safe to re-run (idempotent). **This is the preferred method for incremental seeding.**
   - **MANDATORY: Update chapter count** — `seed-chapters-only.ts` automatically updates `texts.totalChapters`. Custom batch seeding scripts MUST also update this field after inserting chapters:
     ```typescript
     await db.update(schema.texts)
       .set({ totalChapters: files.length })
       .where(eq(schema.texts.id, text.id));
     ```
   - **⚠️ NEVER run `text-catalogue.ts`** — not from a subagent, not manually, not for any reason. It seeds hundreds of texts and will timeout or waste minutes. Always write targeted scripts.
5. **CHECK TRANSLATION PROMPT** (see below) — ensure `src/server/translation/prompts.ts` has a suitable prompt for this text's language, period, and genre
6. **English translation:** `pnpm tsx scripts/translate-batch.ts --text <slug>` (or Tamil/Armenian workflow below)
7. **Chinese translation (MANDATORY for non-Chinese source texts):** `pnpm tsx scripts/translate-batch.ts --text <slug> --target-language zh` — User directive (2026-02-19): all texts must be translated into both English AND Chinese.
8. **Chinese metadata (MANDATORY):** After seeding, ensure all Chinese metadata is set:
   - **Text `title_zh`:** Chinese translation of the text title (set in `text-catalogue.ts` or via SQL)
   - **Text `description_zh`:** Chinese translation of the text description
   - **Chapter `title_zh`:** Chinese translation of every chapter title
   - **Author `name_zh`:** Chinese translation of the author name (set in `text-catalogue.ts`)
   - For Chinese source texts: `title_zh` = `title` (already Chinese)
   - For non-Chinese texts: Use DeepSeek to translate titles/descriptions. Batch script: `scripts/_fix-zh-metadata.ts`
9. **Original-script title (MANDATORY for non-Latin-script texts):** Set `title_original_script` to the title in its original writing system (e.g., 搜神記 for Chinese, Ῥωμαϊκὴ Ἱστορία for Greek, Շdelays for Armenian). This field controls the **grey secondary title** shown on both the Front Page and Browse Page via `formatTextTitle()`. Without it, no grey original-script title appears. For Chinese source texts: `title_original_script` = the Chinese title.
   - **Anonymous author consolidation:** All anonymous Chinese texts outside the Daoist Canon MUST use `Anonymous (Chinese)` (ID 294, slug `anonymous-chinese`). Do NOT create new anonymous entries like `anonymous-zh`.

**Title convention:** "English Name (Transliteration)" — e.g., "Classified Conversations of Master Zhu (Zhu Zi Yu Lei)"

---

## Translation Pipeline

**DUAL-TARGET (User directive 2026-02-19):** All texts MUST be translated into **both English and Chinese**. This is now part of the standard workflow. After English translation completes, Chinese translation follows using the same script with `--target-language zh`.

- **Engine (Prose):** DeepSeek V3 (`deepseek-chat`)
- **Engine (Poetry):** DeepSeek V3 (`deepseek-chat`) by default. Use DeepSeek Reasoner (`deepseek-reasoner`) only for texts in `REASONER_SLUGS` (User directive 2026-03-06)
- **Engine (Hindi target):** DeepSeek V3 (`deepseek-chat`) — **ALWAYS, even for poetry** (User directive 2026-02-26). `translate-batch.ts` enforces this automatically.
- **Script:** `scripts/translate-batch.ts --text <slug> [--start N] [--end N] [--target-language zh]`
- **Batching:** zh=1500 chars, grc/la=2500 chars per API call (reduced 2026-02-05 to prevent truncation)
- **Solo paragraphs:** Paragraphs >1500 chars get their own batch to prevent re-segmentation
- **Parallelization:** Split ranges across background workers
- **Skip logic:** Already-translated chapters skipped automatically (but does NOT prevent concurrent duplicate work — see rule below)

### Dual-Target Translation Workflow (English + Chinese ONLY)

**⚠️ Hindi and other languages are NOT part of the standard workflow.** Do NOT launch Hindi translation workers unless the User explicitly and clearly instructs so for specific texts. This directive (2026-02-27) supersedes any assumption that Hindi is a standard target.

For every text, translation proceeds in two phases:
1. **English translation:** `pnpm tsx scripts/translate-batch.ts --text <slug>`
2. **Chinese translation:** `pnpm tsx scripts/translate-batch.ts --text <slug> --target-language zh`

Both phases use the same script, same DeepSeek engine, same batching logic. The `--target-language zh` flag selects the Chinese translation prompt and inserts with `target_language = 'zh'`.

**Special cases for Chinese translation:**
- **Poetry texts (e.g., Shahnameh):** Use dedicated scripts with `deepseek-reasoner` and language-specific prompts (e.g., `/tmp/translate-shahnameh-zh.ts`)
- **Chinese source texts:** Only translate to English (source language = target language makes no sense)
- **Prompt selection:** `translate-batch.ts` auto-selects Chinese prompts. If no suitable Chinese prompt exists, create one in `prompts.ts` before translating.

### Poetry Translation (deepseek-reasoner)

**MANDATORY for verse texts:** Use `deepseek-reasoner` model, NOT `deepseek-chat`.

**Why:** The reasoner model provides superior handling of:
- Verse form and meter preservation
- Persian/Arabic idioms and implied conditionals
- Disambiguation of homographs (e.g., خویش as "kin" vs "one's own")
- Contextual clarifications in square brackets

**Few-shot prompting:** Embed approved example translations in the prompt.
- Shahnameh: Chapters 1-2 used as examples
- Script: `/tmp/translate-shahnameh-with-examples.ts`

**Key patterns (from Shahnameh examples):**
- "دست گیرد" = "takes your hand" (idiomatic, not "seizes")
- "کَردهٔ خویش" = "his own deeds" (possessive خویش)
- "خویش بیگانه دانَد" = "his own kin consider him" (noun خویش = kin)
- Celestial bodies get transliterations: Saturn (Kayvān), Venus (Nāhīd), Sun (Mihr)

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

### Translation Fallback Strategies

When DeepSeek translation encounters difficulties (truncation, JSON parse errors, paragraph misalignment), agents are authorized to use these fallback strategies:

**1. Smaller Batches with More Paragraph Breaks**
- Reduce `MAX_CHARS_PER_BATCH` (e.g., from 1500 to 800 chars for Chinese)
- Process long paragraphs solo (>1000 chars)
- This reduces context for the LLM and prevents re-segmentation

**2. Gemini Translation Fallback**
- When DeepSeek consistently fails on specific chapters, switch to Gemini
- Script: `scripts/retry-hou-hanshu-gemini.ts` (reference implementation)
- Uses `@google/genai` SDK with `gemini-2.5-flash` model
- Smaller batches (1500 chars) with JSON repair for malformed output

**Gemini Retry Pattern:**
```typescript
// Key settings for Gemini retry
const MODEL = "gemini-2.5-flash";
const MAX_CHARS_PER_BATCH = 1500; // Smaller than DeepSeek
const BATCH_DELAY_MS = 2000;

// JSON repair function for malformed output
function repairAndParseJson(jsonStr: string): unknown[] {
  // Find array start, fix unterminated arrays, extract objects via regex
}
```

**When to Use Gemini:**
- DeepSeek returns truncated JSON (unterminated strings)
- Repeated paragraph count mismatches after retries
- Specific chapters consistently fail (>3 retries)

**Success Story:** Hou Hanshu chapters 402 and 580 failed with DeepSeek but succeeded with Gemini using paragraph splitting and JSON repair.

**3. Truncation Error Resolution (Step-by-Step)**

When `translate-batch.ts` reports `[TRUNCATION ERROR]` (translation:source ratio below threshold), the chapter is NOT saved. **Paragraph splitting is the FIRST response** (User directive 2026-02-18).

**Step 1: Source Paragraph Splitting (ALWAYS do this first)**
Split the problematic paragraph(s) in the database at sentence boundaries, then retranslate. This is the **mandatory first step** — do NOT waste time on simple retries. Splitting produces smaller, more focused translation units that consistently succeed.

**How to Split:**
1. Note the paragraph indices from the `[TRUNCATION ERROR]` output
2. Query the source text of each problematic paragraph
3. Identify a natural sentence boundary to split at
4. Update `source_content` in the database with the split paragraphs
5. Re-index all paragraphs sequentially (paragraphs after the split shift up by 1 each)
6. Delete any existing (failed) translation for the chapter
7. Re-run translation — the smaller paragraphs will translate without truncation

**Split Points:** Look for natural breaks like:
- Sentence endings (。！？ for Chinese/Japanese; . ! ? for Western languages)
- Section markers that the LLM treats as boundaries
- Speaker changes in dialogue (e.g., new 「 in Japanese rakugo, em-dash dialogue in Italian)

```sql
-- Identify problematic paragraphs
SELECT (elem->>'index')::int as idx, length(elem->>'text') as chars, elem->>'text' as full_text
FROM chapters, jsonb_array_elements(source_content->'paragraphs') as elem
WHERE id = CHAPTER_ID AND (elem->>'index')::int IN (PARA_INDICES)
ORDER BY (elem->>'index')::int;

-- After splitting: rebuild source_content with CTE
-- See abrakadabra chapter 22 fix (2026-02-18) for a complete SQL example
```

**Step 2: Simple Retry (only if splitting is inappropriate)**
In rare cases where the truncated paragraph is already very short (<100 chars) and cannot be meaningfully split, re-run the chapter with `--start N --end N`. But this should be the exception, not the rule.

**Step 3: Gemini Fallback (last resort)**
When DeepSeek consistently fails on specific chapters even after splitting, switch to Gemini with smaller batches and JSON repair. See `scripts/retry-hou-hanshu-gemini.ts` for the reference implementation.

**MANDATORY:** Document all splits in the chapter's metadata or a fix log.

**Success stories:**
- Abrakadabra ch22: paras 51+53 truncated 3 times in a row → split at sentence boundary → succeeded immediately
- Sejong Sillok ch14, ch27, ch31: resolved via paragraph splitting + retries
- Hou Hanshu ch402, ch580: resolved via Gemini fallback with paragraph splitting

### CRITICAL: Source Content Cleaning During Translation

**INCIDENT RECORD (2026-02-10):** Qingshigao had "Public domainPublic domainfalsefalse" contamination in 397 chapters. Cleaning script ran WHILE translation workers were active. Result: 362 chapters failed with paragraph alignment errors (source cleaned to N paragraphs, but translation had N+1 from old source).

**MANDATORY when cleaning source content:**
1. **STOP all translation workers first** — check ACTIVE_AGENTS.md and kill running workers
2. Clean source content in database
3. Clean any existing translations (remove same paragraph indices)
4. Delete orphaned translation records (`current_version_id IS NULL`)
5. Resume translation workers

**Or better:** Clean source content BEFORE starting translation.

**If race condition already occurred:**
1. Delete orphaned translation records
2. Use Gemini retry script with smaller batches (1000-1500 chars)
3. See `docs/qingshigao-remediation.md` for example remediation plan

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
| `fa` | Classical Persian epic poetry (Shahnameh) — verse fidelity, izafe transliteration, wordplay brackets |
| `chg` | Chagatai Turkic poetry (Babur's Divan) |
| `fr` | 19th-century French-Canadian literary prose and historical narratives |

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
- **⚠️ NEVER RUN `text-catalogue.ts`** — it iterates hundreds of authors/texts (~4,300+ chapters), causes Neon connection timeouts, and wastes minutes of DB time on redundant insert-or-skip. It is a REFERENCE REGISTRY, not a seeder.
- **Create a batch-specific script** (e.g., `scripts/seed-musahedat.ts`, `scripts/seed-latin-batch2.ts`) that:
  1. Defines ONLY the new authors and texts needed
  2. Inserts them with insert-or-skip logic
  3. Then call `seed-chapters-only.ts` for the chapters
- **Still add entries to `text-catalogue.ts`** for the permanent record (canonical list of all texts), but NEVER execute it.
- **MANDATORY:** Set `genre` field (philosophy, commentary, literature, history, science, ritual)
- **MANDATORY:** Set `compositionYearDisplay` field — the browse page only shows this string, not the raw integer year. NULL = no year shown.
- **Chapter seeding:** `pnpm tsx scripts/seed-chapters-only.ts --text <slug1> --text <slug2> ...` — FAST (~seconds)
- **MANDATORY Verification:** After seeding, ALWAYS verify the chapter count was updated:
  ```sql
  SELECT slug, total_chapters,
         (SELECT COUNT(*) FROM chapters WHERE text_id = texts.id) as actual
  FROM texts WHERE slug = '<your-slug>';
  ```
  If `total_chapters` ≠ `actual`, update it manually. This is critical for the browse page to display correctly.

### Phase 5 — Translation Prompt Check
- **Check `src/server/translation/prompts.ts`** for a suitable prompt matching the text's language, period, and genre
- **Auto-selection rules:** `translate-batch.ts` auto-selects variant prompts based on text slug and genre:
  - Twenty-Four Histories → `zh-{slug}` (text-specific prompts)
  - Chinese literature/history (other) → `zh-literary`
  - Italian literature → `it-literary-19c`
- **If no suitable prompt:** Create one before translating. Include period, genre, terminology conventions, stylistic guidance.
- **Language-specific scripts:** Armenian uses `translate-armenian.ts`, Tamil uses `translate-tamil.ts`, all others use `translate-batch.ts`

### Phase 6 — Translation (English + Chinese)

**DUAL-TARGET (User directive 2026-02-19):** Every text MUST be translated into both English AND Chinese. This is mandatory for all new texts.

**Phase 6a — English Translation:**
- **Split** texts across multiple background workers by chapter range
- **Script:** `pnpm tsx scripts/translate-batch.ts --text <slug> [--start N] [--end N]`
- **Monitor:** Track workers in ACTIVE_AGENTS.md with agent IDs, chapter ranges, status
- **Skip logic:** Already-translated chapters are automatically skipped

**Phase 6b — Chinese Translation:**
- **Can run in parallel with English translation** (User directive 2026-03-06). No need to wait for English to complete first. EN and ZH workers operate on independent translation records and do not conflict.
- **Script:** `pnpm tsx scripts/translate-batch.ts --text <slug> [--start N] [--end N] --target-language zh`
- Same worker partitioning, monitoring, and skip logic as English
- **Chinese source texts:** Skip this phase (only translate to English)
- **Poetry texts:** Use `deepseek-chat` by default (same as prose). Only use `deepseek-reasoner` for texts explicitly in `REASONER_SLUGS`.

**Both phases:**
- **Gap check:** After ALL workers complete (not during), verify no chapters were missed. Gap-filling agents should ONLY be launched for texts where translation is fully complete.
- **Truncation errors:** When workers report `[TRUNCATION ERROR]`, the chapter is NOT saved. **Immediately split the problematic source paragraph(s) at a sentence boundary** (User directive 2026-02-18: splitting is always the first step, not simple retry). Then retranslate. See "Truncation Error Resolution" section above for the full step-by-step workflow.
- **Monitoring cadence:** Check agent progress at most every 10 minutes. Agents self-report completion. Do not poll constantly.

### Phase 6c — Chinese Metadata (MANDATORY)

After seeding and before declaring a text complete, ensure all Chinese metadata is populated:

1. **Text `title_zh`:** Chinese translation of the text title
2. **Text `description_zh`:** Chinese translation of the text description
3. **Chapter `title_zh`:** Chinese translation of every chapter title
4. **Author `name_zh`:** Chinese name for the author (set in text-catalogue.ts)

**For Chinese source texts:** `title_zh` = `title` (already Chinese), `description_zh` must still be written.

**For non-Chinese texts:** Use DeepSeek to batch-translate:
- Titles: Extract English portion from "Original (English)" format, translate to Chinese
- Descriptions: Translate full description to Chinese
- Batch script: `scripts/_fix-zh-metadata.ts` handles all three

**Verification query:**
```sql
-- Check for missing Chinese metadata
SELECT t.slug,
  CASE WHEN t.title_zh IS NULL OR t.title_zh = '' THEN 'MISSING' ELSE 'OK' END as title_zh,
  CASE WHEN t.description_zh IS NULL OR t.description_zh = '' THEN 'MISSING' ELSE 'OK' END as desc_zh,
  COUNT(*) FILTER (WHERE c.title_zh IS NULL OR c.title_zh = '') as ch_titles_missing
FROM texts t
JOIN chapters c ON c.text_id = t.id
WHERE t.slug = '<your-slug>'
GROUP BY t.id, t.slug, t.title_zh, t.description_zh;
```

### Phase 7 — Post-Translation Review (MANDATORY)
After all translation workers complete **for BOTH English and Chinese**, run the comprehensive review for each target language:

1. **Chapter count verification:**
   - Verify `texts.total_chapters` matches actual chapter count in DB
   - Verify all chapters have translations

2. **Paragraph alignment check:**
   - Source and translation paragraph counts must match for every chapter
   - Use the database trigger `check_paragraph_alignment()` for real-time validation

3. **Length ratio check:**
   - Flag translations drastically shorter than source (accounting for language differences)
   - Chinese → English typically expands 2-3x; European languages ~1:1
   - Very short translations may indicate truncation or incomplete API responses

4. **Paragraph gap detection:**
   - Check for paragraphs with very few characters or empty content
   - Flag paragraphs under 10 characters in translation

**Review Queries:**

*Paragraph count mismatch:*
```sql
SELECT t.slug, c.slug as chapter,
       jsonb_array_length(c.source_content->'paragraphs') as src_paras,
       jsonb_array_length(tv.content->'paragraphs') as trans_paras
FROM texts t
JOIN chapters c ON c.text_id = t.id
JOIN translations tr ON tr.chapter_id = c.id
JOIN translation_versions tv ON tv.id = tr.current_version_id
WHERE t.slug = '<your-slug>'
  AND jsonb_array_length(c.source_content->'paragraphs') != jsonb_array_length(tv.content->'paragraphs')
ORDER BY c.sort_order;
```

*Truncation detection (ratio < 0.5 for Chinese→English):*
```sql
SELECT t.slug, c.slug as chapter,
       length(c.source_content::text) as src_chars,
       length(tv.content::text) as trans_chars,
       ROUND(length(tv.content::text)::numeric / NULLIF(length(c.source_content::text), 0), 2) as ratio
FROM texts t
JOIN chapters c ON c.text_id = t.id
JOIN translations tr ON tr.chapter_id = c.id
JOIN translation_versions tv ON tv.id = tr.current_version_id
WHERE t.slug = '<your-slug>'
  AND length(c.source_content::text) > 1000
  AND length(tv.content::text)::numeric / NULLIF(length(c.source_content::text), 0) < 0.5
ORDER BY ratio;
```

**Resolution for gaps/truncation:** If long source paragraphs cause truncation (>3000 chars), split them at sentence boundaries (。for Chinese, . for Western languages) using a database update or fix script. See `scripts/fix-daoist-hagiographies.ts` for an example.

### Pipeline Data Files
| File | Purpose |
|------|---------|
| `docs/<lang>_text_suggestions.txt` | User-provided text suggestions |
| `data/<lang>-pipeline/verified-texts.json` | Verification results |
| `data/processed/<slug>/chapter-NNN.json` | Processed chapter files |

### Pipelines
| Language | Texts | Chapters | Status |
|----------|-------|----------|--------|
| Chinese (zh) | ~50 | ~3,358 | COMPLETE |
| Ancient Greek (grc) | ~14 | ~500+ | COMPLETE |
| Latin (la) | ~30 | ~385+ | COMPLETE |
| Tamil (ta) | ~11 | ~520+ | COMPLETE |
| Armenian (hy) | 7 | ~213 | COMPLETE |
| Italian (it) | 9 | ~147 | COMPLETE |
| Polish (pl) | 11 | 231 | COMPLETE |
| Malay (ms) | 1 | 19 | COMPLETE |
| Czech (cs) | 1 | 14 | COMPLETE |
| Telugu (te) | 1 | 1 (116 verses) | COMPLETE |
| Russian (ru) | 8 | 235 | COMPLETE |
| French (fr) | ~15 | ~120+ | COMPLETE |
| Serbian (sr) | ~15 | ~100+ | COMPLETE |
| Japanese (ja) | 3 | ~80+ | COMPLETE |
| Persian (fa) | 21 | ~988 | IN PROGRESS — EN ~18%, ZH ~74% |
| Modern Greek (el) | 10 | 112 | IN PROGRESS — EN translating |

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

## ⚠️ WEBPAGE ACCESS — USE CURL, NOT WEBFETCH ⚠️

**INCIDENT RECORD (2026-02-23):** WebFetch returns 403 Forbidden on Wikisource (both `zh.wikisource.org` and `zh.m.wikisource.org`). WebSearch also cannot retrieve full page content — only search snippets.

**MANDATORY for scraping web pages:**

Use `curl` via Bash with a browser User-Agent header. This works reliably on Wikisource, Gutenberg, and Archive.org:

```bash
curl -sL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "URL"
```

**Why WebFetch fails:**
- Wikisource blocks requests without a proper User-Agent header
- WebFetch's internal UA string is rejected by MediaWiki sites
- The mobile site (`zh.m.wikisource.org`) also rejects WebFetch

**For HTML parsing after curl:**
- Use Python inline scripts for extracting links, sections, or text content
- Use `python3 -c "..."` or write a processing script in `scripts/`
- For quick link extraction: pipe through `grep` or `python3` regex

**For subagent scraping tasks:**
- Include the curl command with UA header in the agent prompt
- Never rely on WebFetch for Wikisource, Gutenberg, or similar wiki sites
- Processing scripts (Python) should use `urllib.request.Request` with the same UA header

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

**Target Languages:** All texts are translated into **both English (UK)** with British spelling and conventions **and Chinese (简体中文)**. This dual-target requirement applies to all new and existing texts (User directive 2026-02-19).

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
├── text-catalogue.ts       # Canonical text registry (languages, authors, texts)
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
