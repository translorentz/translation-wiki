# Mass Text Pipeline Workflow

Standard workflow for scraping, processing, and translating large batches of texts from online sources (e.g., Wikisource). Developed during the Chinese Pipeline (Sessions 35-36, 44 texts, 1,619 chapters). Designed to be repeatable for any language.

---

## Overview

```
[New Language Setup] ──if needed──→ seed-db.ts, texts/page.tsx, prompts.ts updated
        │
[Research Agent] ──finds candidates──→ candidates list
        │
[Verification Agent] ──confirms untranslated──→ verified-texts.json
        │
[Processor A/B/C] ──scrape + process──→ raw text + chapter JSONs + seed entries
        │
[Review Agent] ──validates quality──→ review report (GATE: must pass before proceeding)
[Verification Agent 2] ──re-checks translations──→ translation check report
        │
[Seed to DB] ──merge + run seed-db.ts──→ database populated
        │
[Translator W1..W7] ──DeepSeek API──→ translated chapters
```

**Key principle:** No phase proceeds until the previous gate passes. Review and verification are independent agents — never the same agent that did the processing.

---

## Phase 0: New Language Setup (if needed)

**Skip this phase** if the language already exists on Deltoi (check `scripts/seed-db.ts` LANGUAGES array).

**When adding a language not yet on Deltoi**, the following files must be updated before any texts can be seeded or translated:

### 0a. Database + Seeding

Add the language to the `LANGUAGES` array in `scripts/seed-db.ts`:
```typescript
{ code: "pl", name: "Polish", displayName: "Polski" },
```
- `code`: ISO 639 code (2 or 3 letters)
- `name`: English name
- `displayName`: Name in the language's own script (shown on the browse page)

### 0b. Browse Page Display

Add the language to `LANGUAGE_DISPLAY_NAMES` in `src/app/(wiki)/texts/page.tsx`:
```typescript
pl: "Polish",
```
This maps the language code to the English display name used in filter chips and headings.

### 0c. Translation Prompt

Create a translation prompt in `src/server/translation/prompts.ts` for the language. The prompt must be tailored to the specific period, genre, and register of the texts being translated. See existing prompts for examples.

**IMPORTANT:** Even for languages already on Deltoi, new prompts may be needed if the new texts differ in period/genre from existing texts. Existing prompts are narrowly tailored — always audit before assuming suitability.

### 0d. Script-Specific Styling (if needed)

If the language uses a script that needs special rendering (e.g., CJK ideographs, Indic scripts), check whether CSS adjustments are needed in:
- `src/components/interlinear/ParagraphPair.tsx` — font sizing for source text display
- `src/components/editor/TextEditor.tsx` — editor font sizing

Example (Chinese has special handling):
```typescript
sourceLanguage === "zh" && "font-serif text-lg leading-loose"
```

Add similar rules for scripts that need larger fonts or different line spacing (e.g., Gujarati, Telugu).

### 0e. Translation Script

Most languages use `scripts/translate-batch.ts` (DeepSeek). Exceptions:
- **Tamil:** Uses `scripts/translate-tamil.ts` (Gemini)
- **Armenian:** Uses `scripts/translate-armenian.ts` (DeepSeek, but separate script due to Gemini blocking)

If the new language needs a special translation script (different engine, special handling), create it before Phase 7.

### 0f. Verification

After setup, run `pnpm tsx scripts/seed-db.ts` to verify the language is inserted correctly. Check the browse page at `/texts?lang=<code>` to confirm the language appears in the filter.

---

## Phase 1: Research (Finding Candidates)

**Agent type:** `general-purpose` with web search

**Goal:** Find N texts in a target language that:
1. Exist in full on a public source (Wikisource is the sole source. Just search the Wikisource index.)
2. Are NOT already on Deltoi (check `docs/text-inventory.md` and `scripts/seed-db.ts` for existing slugs)
3. Have NO complete English translation from a reputable source (see Phase 2 criteria)
4. Are culturally/historically significant (see Quality Checks below)
5. Have manageable chapter counts (1-300 preferred)
6. Are not diagrammatically dependent, such as geometry texts with illustrations
7. Were published before 1912

**Method:**
1. **Check what's already on Deltoi** — read `docs/text-inventory.md` for the full list of existing texts, and grep `scripts/seed-db.ts` for existing slugs in the target language. Any text already present must be excluded.
2. Search Wikisource category pages for the target language (e.g., `zh.wikisource.org`, `el.wikisource.org`)
3. For each candidate, **visit the actual Wikisource page** and estimate chapter count from the table of contents
4. Verify the text has substantial content (not a stub with only a few lines)
5. Classify by genre: `literature`, `history`, `philosophy`, `science`, `commentary`, `ritual`
6. Record: title (original script + English), author (original + English), era, genre, source URL, estimated chapter count
7. **Perform quality checks** (see below) for each candidate

### Quality Checks (MANDATORY for every candidate)

Each candidate text must pass three checks before inclusion:

**1. Significance check:** Is this text culturally, historically, or literarily important? Look for:
- Is the text referenced in scholarly literature, literary histories, or encyclopedias?
- Is the author a recognised figure in the literary/intellectual tradition?
- Does the text represent an important genre, movement, or period?
- Reject texts that are merely obscure with no scholarly interest — the goal is important untranslated works, not just any untranslated work.

**2. Source text quality check:** Sample 2-3 chapters from the Wikisource text and verify:
- The text is legible and complete (not garbled OCR, truncated, or missing sections)
- The text is in the expected language/script (not a modern summary or commentary instead of the original)
- Paragraph structure is clear enough to process programmatically
- If the source quality is poor (corrupt, heavily incomplete), reject or flag as PARTIAL

**3. Translation quality check:** Run a trial translation of 1-2 sample paragraphs through the translation engine (DeepSeek) with the intended prompt, and verify:
- The output is coherent, readable English
- The translation captures the meaning and register of the original
- Technical/domain vocabulary is handled appropriately
- If translation quality is poor, the prompt may need adjustment — flag for prompt review before committing to full translation

**Output:** `docs/<language>-wikisource-candidates.md` with full candidate list

**Common pitfalls:**
- Candidate already exists on Deltoi under a different English title or slug — always cross-check by original-script title too
- Some Wikisource pages exist but are stubs with only a preface or table of contents
- Multi-volume texts may have only some volumes uploaded
- Texts may be split across multiple pages with non-obvious URL schemes

---

## Phase 2: Verification (Confirming No Translations Exist)

**Agent type:** `general-purpose` with web search
**CRITICAL STEP** — must be thorough to avoid duplicating existing scholarly work

**For each candidate text, search:**
1. `"[English title] English translation"` on Google
2. `"[Original title] translation PDF"` on Google
3. en.wikisource.org for the text and its Wikipedia entry (check "Translations" section)
4. Project Gutenberg (`gutenberg.org`) for the text
5. Internet Archive (`archive.org`) — check if any result is:
   - Freely downloadable complete translation (disqualifies)
   - Controlled lending of a scholarly translation (disqualifies)
   - Abridged vs complete (abridged does not disqualify)
6. Academic library catalogs (WorldCat, university press catalogs)
7. Google Scholar for published academic translations

**Disqualification criteria:**
- FREELY AVAILABLE + COMPLETE (or near-complete) translation from a reputable source = DISQUALIFY
- Published academic/scholarly press complete translation (e.g., university press, Brill, Penguin Classics) = DISQUALIFY
- Internet Archive controlled lending of a complete scholarly English translation = DISQUALIFY
- Partial translations (anthology excerpts, selected chapters) = OK, keep
- Kindle-only self-published translations (e.g., Valentin Saric) = OK, keep (quality often poor)
- Blog posts, fan translations, informal web translations = OK, keep
- Machine/community translations of uncertain quality = OK, keep

**Also verify during this phase:**
- The text actually exists on Wikisource with substantial content (not just a stub)
- Estimate the true chapter count by inspecting the table of contents page
- Flag texts where Wikisource has only partial content (mark as PARTIAL)

**Output:** `data/<language>-pipeline/verified-texts.json` — machine-readable list with:
```json
[{
  "title_zh": "...", "title_en": "...", "slug": "...",
  "wikisource_url": "...", "chapters": N, "genre": "...",
  "author_en": "...", "author_zh": "...", "era": "...",
  "description": "...", "text_type": "prose|poetry",
  "composition_year": N
}]
```

---

## Phase 3: Scraping + Processing (Parallel Processors)

**Agent type:** 3 `general-purpose` agents running in parallel
**Split:** Divide texts into 3 roughly equal groups by total chapter count (not text count)

### Per-text workflow:

#### 3a. Inspect the source HTML FIRST

**CRITICAL:** Before writing any scraper, the processor MUST fetch and inspect the actual HTML structure of:
1. The text's **index/table of contents page** — to understand how chapters are linked
2. At least **one chapter page** — to understand how content is structured

This is non-negotiable because:
- Wikisource URL patterns vary wildly between texts, even within the same language
- Some texts use `第N回`, others use `卷N`, others use named sections, others use subpages
- Content markup differs: some use `<p>` tags, others use `<dl>/<dd>`, others use plain `<div>` text nodes
- Navigation elements, editorial notes, and metadata are placed differently per text

**Inspection method:**
```python
# Fetch and print the raw HTML to understand structure
import requests
from bs4 import BeautifulSoup

resp = requests.get(url, headers={"User-Agent": "TranslationWikiBot/1.0 (educational project)"})
soup = BeautifulSoup(resp.content, "html.parser")
content = soup.find("div", id="mw-content-text")

# Print all links to find chapter URL patterns
for a in content.find_all("a", href=True):
    print(a["href"], "→", a.get_text(strip=True))

# Print tag structure of first chapter to understand content layout
for child in content.children:
    if hasattr(child, 'name'):
        print(f"<{child.name}> class={child.get('class')} id={child.get('id')}")
```

Only after understanding the actual structure should you write the scraper.

#### 3b. Scrape from source

**Scraping pattern (Python + BeautifulSoup):**
```python
import requests, time, json, os
from bs4 import BeautifulSoup

session = requests.Session()
session.headers.update({
    "User-Agent": "TranslationWikiBot/1.0 (educational project)"
})

# Fetch index page, find chapter links
index = session.get(index_url)
soup = BeautifulSoup(index.content, "html.parser")

# Extract links — patterns vary per text, determined by HTML inspection:
# - 第N回 (chapter-based novels)
# - 卷N (volume-based histories/encyclopedias)
# - Named sections (essays, criticism)
# - Direct /wiki/Title/Section URLs
# - Nested subpage structures

# For each chapter page:
content_div = soup.find("div", id="mw-content-text")

# Remove noise elements BEFORE extracting text:
for unwanted in content_div.find_all(["table", "sup", "small"]):
    unwanted.decompose()
for unwanted in content_div.find_all(class_=["navbox", "mw-editsection", "noprint", "toc", "references"]):
    unwanted.decompose()

# Extract text from remaining content tags
text_parts = []
for tag in content_div.find_all(["h2", "h3", "p", "dl", "dt", "dd"]):
    text = tag.get_text(strip=True)
    if text:
        text_parts.append(text)

time.sleep(2.1)  # Rate limit — MINIMUM 2.1 seconds between requests!
```

**Save raw text:** `data/raw/<slug>/NNN_title.txt`

**Rate limiting is critical:** Wikisource will throttle or block scrapers that make rapid requests. 2.1-second delay is the minimum. If you get HTTP 429 or connection errors, increase the delay.

#### 3c. Check for completeness

After scraping, verify:
- The number of raw files matches the expected chapter count from Phase 2
- Each file has substantial content (not empty or just a title)
- Multi-part texts (e.g., 正錄 + 續錄, or multiple 集/卷) have ALL parts scraped

If Wikisource is missing content, mark the text as PARTIAL with a note about what's missing.

#### 3d. Process into chapter JSONs

**Output format** (`data/processed/<slug>/chapter-NNN.json`):
```json
{
  "chapterNumber": N,
  "title": "第N回 Title / 卷N",
  "sourceContent": {
    "paragraphs": [
      { "index": 1, "text": "..." },
      { "index": 2, "text": "..." }
    ]
  }
}
```

**Rules:**
- Paragraph indices must be sequential starting at 1
- Split on blank lines (double newlines) for prose texts
- For biji/notebook texts with many short entries per chapter, each entry should be its own paragraph
- No HTML tags in text — plain Unicode only
- No empty paragraphs (filter them out)
- Preserve original script characters faithfully (CJK, polytonic Greek, etc.)

**Chapter numbering for multi-part texts:** When a text has multiple sections (e.g., 正錄 and 續錄, or multiple 集/卷 groupings), use continuous chapter numbering. For example: chapters 1-10 for 正錄, chapters 11-15 for 續錄. Do not restart numbering.

#### 3e. Generate seed entries

Each processor writes its entries to a **separate** JSON file to avoid edit conflicts between parallel agents:
`data/<language>-pipeline/seed-entries-{a,b,c}.json`

```json
{
  "authors": [
    { "name": "Author Name (Transliteration)", "nameOriginalScript": "原名",
      "slug": "author-slug", "era": "Dynasty (dates)", "description": "..." }
  ],
  "texts": [
    { "title": "English Title (Transliteration)", "titleOriginalScript": "原題",
      "slug": "text-slug", "languageCode": "zh", "authorSlug": "author-slug",
      "description": "...", "sourceUrl": "https://zh.wikisource.org/wiki/...",
      "processedDir": "data/processed/<slug>",
      "compositionYear": N, "compositionEra": "Dynasty (dates)",
      "genre": "literature|history|philosophy|science|commentary",
      "textType": "prose" }
  ]
}
```

**Title convention:** "English Name (Transliteration)" — e.g., "Classified Conversations of Master Zhu (Zhu Zi Yu Lei)"

---

## Phase 4: Quality Review (Independent Agent)

**Agent type:** `general-purpose` — **must NOT be the same agent that did processing**
**GATE:** Translation cannot proceed until this review passes.

This is an independent review of the processed chapter JSONs. The reviewer has no knowledge of the scraping process and checks the output purely on its own merits.

**Checks per text (sample 2-3 chapters each, plus first and last chapter):**
1. **File count** matches expected chapter count from verified-texts.json
2. **Valid JSON** with correct structure (`chapterNumber`, `title`, `sourceContent.paragraphs`)
3. **Sequential paragraph indices** starting at 1 with no gaps
4. **Non-empty text fields** with actual content (not placeholders or metadata)
5. **Source language content present** — verify the text contains characters from the expected script (CJK for Chinese, Greek for grc, etc.), not just ASCII
6. **No HTML tag contamination** — search for `<`, `>`, `&amp;`, `&lt;` etc.
7. **No Wikisource navigation/metadata contamination** — search for "编辑", "編輯", "[edit]", "维基", "Wikisource", category names
8. **Reasonable paragraph lengths** — flag very short paragraphs (< 10 characters) but don't auto-fail them; some are legitimate (section headings, entry titles in encyclopedic texts, poet names in biographical collections)
9. **Title field present** and contains source-language text
10. **No missing chapters** — check that chapter numbers are continuous with no gaps
11. **Spot-check content** — read a few paragraphs to verify they look like actual literary/historical text, not scraping artifacts

**Output:** `/tmp/<language>-review-report.md`

**What to do with failures:**
- Minor issues (a few HTML tags, some empty paragraphs): processor fixes and reviewer re-checks
- Major issues (wrong content, missing chapters, systematic contamination): re-scrape the text
- PARTIAL texts (Wikisource incomplete): document what's missing, translate what's available

---

## Phase 5: Translation Verification (Independent Agent)

**Agent type:** `general-purpose` with web search
**Purpose:** Second-pass verification that no complete scholarly translations have appeared since Phase 2. This is a safety net — Phase 2 may have missed something, or a new translation may have been published between research and translation.

Same search methodology as Phase 2, but can be done in batches (search multiple texts per query).

**Apply the same disqualification criteria as Phase 2.**

**Output:** `/tmp/<language>-translation-check.md`

---

## Phase 6: Seeding

**Steps:**
1. **Pre-seeding duplicate check:** Grep `scripts/seed-db.ts` for every slug you're about to add. If a slug already exists, skip it — do not create duplicates. Also check author slugs for deduplication.
2. Write a merge script (`scripts/merge-<language>-seeds.ts`) to combine seed-entries-{a,b,c}.json:
   - Deduplicate authors (check existing slugs in `scripts/seed-db.ts` — some authors may already be in the DB from prior pipelines)
   - Deduplicate across processor files (the same author may appear in both A and C if they wrote texts in both batches)
   - Exclude texts marked PARTIAL or FAILED
   - Normalize fields (ensure `sourceUrl`, `processedDir`, `compositionYear` present)
   - Output TypeScript code to append to the AUTHORS and TEXTS arrays in seed-db.ts
3. Insert the generated entries into `scripts/seed-db.ts`
   - Authors go in the `AUTHORS` array
   - Texts go in the `TEXTS` array
   - Use clear comment markers: `// <Language> Pipeline Authors (N new)` and `// <Language> Pipeline Texts (N new)`
4. **Type-check before seeding:** Run `pnpm tsc --noEmit` or equivalent to verify no TypeScript errors were introduced by the insertion.
5. Run `pnpm tsx scripts/seed-db.ts`
6. **Post-seeding verification:** Query the DB (or check script output) to confirm:
   - Correct number of texts were inserted
   - Each text has the expected chapter count
   - Genre and language code are correct for each text
   - No duplicate texts were created

**Genre → prompt mapping (Chinese):**
- `genre: "literature"` or `"history"` → `zh-literary` prompt (auto-selected by translate-batch.ts)
- `genre: "philosophy"` or `"commentary"` or `"criticism"` → `zh` prompt
- `genre: "science"` → `zh-science` prompt

**For other languages, check `src/server/translation/prompts.ts`** — if no suitable prompt exists for the text's language/period/genre, create one before translating.

**Avoiding edit conflicts during merge:**
- Each processor writes to its own seed-entries JSON file (a, b, c)
- The merge happens AFTER all processors complete
- Only one agent edits seed-db.ts at a time

---

## Phase 7: Translation (Parallel Workers)

**Agent type:** 7+ `general-purpose` agents running in parallel (background)
**Split:** Divide texts into groups balanced by chapter count (~200-230 chapters each)

**Balancing strategy:** Place the largest texts (100+ chapters) each in their own worker, then distribute remaining smaller texts across workers to equalize total chapter counts.

**Per worker:**
```bash
pnpm tsx scripts/translate-batch.ts --text <slug>
```

**Chaining:** Each worker translates its texts sequentially:
```bash
pnpm tsx scripts/translate-batch.ts --text slug-1 && \
pnpm tsx scripts/translate-batch.ts --text slug-2 && \
# ... etc
```

**Translation engine:** DeepSeek V3 (`deepseek-chat`) via `scripts/translate-batch.ts`

**Skip logic:** Already-translated chapters are automatically skipped, so workers are idempotent. If a worker fails partway, it can be restarted and will resume from where it left off.

**Monitoring:** Check agent output files for errors. Common issues:
- DeepSeek API rate limiting (usually self-resolving with the built-in delay)
- Paragraph count mismatch (translation has different paragraph count than source — the script will retry)
- Network timeouts (script retries automatically)

**Post-translation verification:**
- Check each worker's final output for error counts
- Spot-check 2-3 translated chapters on deltoi.com — verify they render correctly with side-by-side source/translation
- Verify paragraph alignment (source and translation paragraph counts match)
- Check that no chapters were silently skipped (compare translated chapter count against expected)
- Update `docs/<language>-pipeline-status.md` and `docs/text-inventory.md` with final counts

---

## Phase 8: Gap-Check and Gap-Fill (GATE — must pass before pipeline is declared complete)

**Agent type:** `general-purpose` (orchestrator), empowered to launch up to 8 subagents

**Trigger:** ALL translation workers have completed (no active background processes remaining).

**Goal:** Find and fix two classes of translation gaps:

### Gap Type 1: Missing Translations
Paragraphs that have no translation entry at all. These can occur when:
- A worker crashed mid-chapter and the skip logic moved past it
- A paragraph mismatch caused the script to skip a chapter after retries
- A worker's background process was killed before finishing

**Detection:** Query the database for every chapter in the pipeline. For each chapter, compare the number of source paragraphs against the number of translated paragraphs. Any chapter where `translated_paragraphs < source_paragraphs` has gaps.

### Gap Type 2: Disproportionately Short Translations
Paragraphs where the English translation exists but is suspiciously short relative to the source text. This indicates the translation engine may have truncated or summarized instead of translating fully.

**Detection method — CRITICAL:** Use **word count**, NOT character count, because Chinese characters map to roughly 1.5-2.5 English words each. A Chinese paragraph of 100 characters should produce approximately 150-250 English words. The ratio to use:

```
expected_english_words = chinese_character_count * 1.5  (conservative lower bound)
```

Flag any paragraph where:
```
actual_english_word_count < expected_english_words * 0.4
```

This catches translations that are less than 40% of the expected minimum word count — i.e., egregiously short. Do NOT flag paragraphs where the source itself is very short (< 20 characters), as those naturally produce short translations.

### Execution

1. **Gap-check agent** queries the database for all texts in the pipeline
2. For each text, checks every chapter for both gap types
3. Generates a gap report: `docs/<language>-pipeline-gaps.md` listing every gap with text slug, chapter number, paragraph index, gap type, and severity
4. If gaps are found, the agent **spins up to 8 subagents** to retranslate:
   - Each subagent receives a list of (text-slug, chapter-number) pairs to retranslate
   - Subagents use `translate-batch.ts --text <slug> --start <N> --end <N>` to retranslate specific chapter ranges
   - For Gap Type 2 (short translations), the chapter must be retranslated entirely (the existing short translation will be replaced)
5. After all subagents complete, run the gap-check again to verify all gaps are filled
6. Update the gap report with final status

### Output
- `docs/<language>-pipeline-gaps.md` — gap report with before/after status
- Updated translations in the database

### Success criteria
- **Zero Gap Type 1** (no missing translations)
- **Zero Gap Type 2** (no egregiously short translations)
- Pipeline is declared COMPLETE only after the gap-check passes with zero gaps

---

## Lessons Learned

### Scraping

1. **Always inspect HTML before scraping** — Wikisource URL patterns vary wildly per text. One scraper that guesses patterns will fail on half the texts. Fetch the index page, print all links, and understand the URL scheme before writing a single line of scraper code.

2. **Wikisource content may be incomplete** — Some texts exist on Wikisource but are missing volumes or chapters. Always compare scraped chapter count against the expected count. Track PARTIAL texts separately and document what's missing.

3. **Rate limiting is critical** — 2.1 second delay between requests minimum. Wikisource will throttle or block aggressive scrapers. If scraping 1,000+ pages, consider even longer delays.

4. **Decompose noise elements before extracting text** — Remove tables, navboxes, edit sections, references, and other Wikisource chrome BEFORE calling `get_text()`. Otherwise metadata and navigation text will contaminate the output.

5. **Multi-part texts need continuous numbering** — When a text has both 正錄 and 續錄 (or multiple 集/卷 groupings), use continuous chapter numbering (e.g., chapters 1-10 for part 1, 11-15 for part 2). Do not restart numbering per section.

### Processing

6. **Parallel processors + separate seed files** — Avoid edit conflicts by having each processor write to its own JSON file, then merge at the end. Never have multiple agents editing the same file simultaneously.

7. **Independent review is essential** — The review agent catches issues the processor missed. In the Chinese pipeline, the reviewer correctly identified that short paragraphs in encyclopedic texts (section headings like "詩筆", poet names like "王煥") are legitimate content, not data quality bugs.

### Translation Verification

8. **Be precise about disqualification criteria** — Self-published Kindle translations (e.g., Valentin Saric's "Ming-Qing Masterworks Series") are often poor quality and do not disqualify a text. Only scholarly/academic press translations and free complete translations from reputable sources disqualify. Blog posts, fan translations, and informal web translations also do not disqualify.

9. **Run verification independently of processing** — The verification agent should be a separate agent from the processors, running at the same time. This parallelizes the work and ensures independent judgment.

### General

10. **Track everything in status docs** — Maintain `docs/<language>-pipeline-status.md` with the full catalogue: every text, its status (READY/PARTIAL/FAILED), chapter count, processor assignment, and any issues. Update this continuously.

11. **Agent tracking is essential** — Record all agent IDs in `ACTIVE_AGENTS.md` immediately upon launch. Include text assignments and chapter counts per worker. This is critical for monitoring and recovery.

---

## Applying to Other Languages

This workflow works for any language on Wikisource. Key adaptations:

| Aspect | Chinese | Greek | Latin | Other |
|--------|---------|-------|-------|-------|
| Source | zh.wikisource.org | el.wikisource.org | la.wikisource.org | <lang>.wikisource.org |
| Script check | CJK characters (U+4E00-U+9FFF) | Greek (U+0370-U+03FF, U+1F00-U+1FFF) | Latin extended | Per-language Unicode ranges |
| Chapter patterns | 第N回, 卷N | Κεφάλαιον, Βιβλίον | Liber, Caput | Varies |
| Paragraph splitting | Blank lines | Blank lines | Blank lines | May need custom logic for poetry |
| Translation engine | DeepSeek | DeepSeek | DeepSeek | DeepSeek (Tamil uses Gemini) |
| Prompt | zh-literary / zh / zh-science | grc / grc-history | la | Check prompts.ts or create new |

**Before starting a new language pipeline:**
1. Check what prompts exist in `src/server/translation/prompts.ts`
2. If no suitable prompt exists, create one with period/genre-specific instructions
3. Test-translate 2-3 sample chapters before launching the full pipeline
4. Adapt the scraper to the target Wikisource's HTML structure (it WILL be different)

---

## File Structure

```
data/
├── <language>-pipeline/
│   ├── verified-texts.json          # Machine-readable verified list
│   ├── seed-entries-a.json          # Processor A seed entries
│   ├── seed-entries-b.json          # Processor B seed entries
│   └── seed-entries-c.json          # Processor C seed entries
├── raw/<slug>/                       # Raw scraped text files (NNN_title.txt)
└── processed/<slug>/chapter-NNN.json # Processed chapter JSONs

scripts/
├── <language>-pipeline/
│   ├── scraper-{a,b,c}.py           # Python scrapers (per processor)
│   └── process-batch-{a,b,c}.ts     # TypeScript processors
├── merge-<language>-seeds.ts         # Seed merge script
└── seed-db.ts                        # Main seeding script (shared)

docs/
├── <language>-pipeline-status.md     # Full catalogue with per-text status
├── <language>-wikisource-candidates.md # Initial research candidates
└── mass-text-pipeline-workflow.md    # This document

/tmp/
├── <language>-review-report.md       # Quality review results
└── <language>-translation-check.md   # Translation verification results
```

---

## Quick Reference: Launch Sequence

```
1. Launch Research Agent                    → candidates list
2. Launch Verification Agent               → verified-texts.json
3. Launch Processors A, B, C (parallel)    → raw/ + processed/ + seed-entries
4. Launch Review Agent (independent)     ─┐
   Launch Verification Agent 2 (parallel) ─┤→ Both must pass before proceeding
5. Merge seed entries → seed-db.ts         │
6. Run pnpm tsx scripts/seed-db.ts         │
7. Launch Translation Workers (parallel)   → translated chapters in DB
```

**Gates:**
- Phase 4 (Review) must PASS before Phase 6 (Seeding)
- Phase 5 (Translation Verification) must PASS before Phase 7 (Translation)
- Phases 4 and 5 run in parallel with each other
