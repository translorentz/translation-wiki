# Greek XML R2 Parser Scratchpad

## Session Start: 2026-01-24

### Task
Parse 4 new Greek XML files (2 texts, 4 works) from subdirectories of `data/greek_xml/`.

### Analysis of XML Structures

#### tlg3156.tlg001 — Exegesis in Hesiodi Theogoniam
- **Structure**: FLAT — `edition > section` (no books, no chapters)
- **Section numbering**: Non-sequential. Sections correspond to Hesiod line numbers:
  praef, 23, 24, 35, 36, 56, 94, 116, 126, 134, 138, 154, 155, 159, 171, 173, 174, 178, 181, 188, 190, 194, 200, 201, 203, 206, 211, 214, 215, 220, 233, 235, 237, 238, 239, 240, 265, 270, 277, 287, 293, 295a, 304a, 306a, 313, 319a, 295b, 304b, 306b, 319b, 326, 333, 337, 346, 349, 371, 375, 383, 404, 409, 453, 458, 459, 463, 467, 481, 484, 485, 492, 506, 509, 510, 513, 514, 517, 521, 522, 523, 535, 562, 570, 617, 621, 624, 629, 639, 657, 687, 727, 732, 739, 775, 780, 787, 803, 811, 820, 836, 853, 881, 886, 891, 894, 901, 912, 915, 918, 924, 921
- **Approximate section count**: ~103 sections
- **Content per section**: 1-2 `<p>` elements, Greek commentary text
- **Issues**:
  - Contains footnotes as `<note type="footnote">` (already stripped by parser)
  - Contains `<del>` elements (should be stripped — editorially deleted)
  - Contains `<pb>` page breaks
  - Some numbers/sigla embedded in text (e.g., "1)" "2)" etc.) — these are footnote references
- **Decision**: Each section = 1 chapter. Use section @n as chapter title suffix.
  Title format: "Section [n]" (e.g., "Section praef", "Section 23")

#### tlg4003.tlg001 — Periplus Maris Exteri (Marcianus)
- **Structure**: book > section > paragraph
- **Books**: 2 (Book 1: sections 1-16, Book 2: sections 1-15)
- **Paragraphs per section**: 2-10 paragraphs, numbered
- **Total paragraphs**: ~52 in Book 1, ~49+ in Book 2
- **Content**: Greek geographical text, distances in stadia
- **Issues**:
  - Contains `<supplied reason="omitted">` (parser keeps text, strips tags)
  - Contains `<lb>` line breaks (stripped)
  - Contains `<cit>` elements (should extract text inside)
  - Contains `<list type="index">` in the proem (should be handled)
- **Decision**: Use SECTION level as chapter. Each section = 1 chapter.
  With `includeParentInTitle: true` for book numbers.
  Title: "Book 1, Section 1", "Book 2, Section 5", etc.

#### tlg4003.tlg002 — Menippi Periplus (Marcianus)
- **Structure**: book > section > paragraph
- **Books**: 1 book visible, with 6+ sections
- **Sections contain numbered paragraphs**
- **Also has an "index" subtype**: `<div type="textpart" subtype="index">`
- **Decision**: Use SECTION level as chapter with book prefix.

#### tlg4003.tlg003 — Artemidori Geographia (Marcianus)
- **Structure**: section > book > paragraph (UNUSUAL nesting!)
- **Sections**: 3 sections
- **Books within sections**: 1, 2, 4, 5, 7, 9, 10, 11 (numbering is fragmentary)
- **Paragraphs within books**: numbered
- **This is a fragmentary text** — only excerpts survive
- **Decision**: This structure is problematic for the existing parser which expects
  book > chapter > section OR flat chapter/section.
  The nesting is section > book > paragraph.
  Best approach: Treat each "book" as a chapter, ignore the section layer.
  OR: Treat paragraphs as direct paragraphs within books, flatten the structure.

  Actually looking more carefully: The `section` divs here are major structural
  groupings (perhaps different source compilations), and the `book` divs are the
  actual Artemidorus book references. Since this is small (22 paragraphs total),
  I'll treat it as a single text where each section+book combination = chapter.

  REVISED: Use the book level as chapter. Title: "Book N" or "Section M, Book N".
  Since the books span sections, I'll need custom handling.

  SIMPLEST: Since there are only 22 paragraphs, treat the WHOLE TEXT as a small
  number of chapters based on sections (3 sections = 3 chapters), with all
  book>paragraphs flattened within each section.

### Pipeline Modifications Needed

1. **Subdirectory handling**: The existing `process-greek-xml.ts` only reads top-level
   files. Need to either:
   - (a) Copy files to root level, OR
   - (b) Modify script to accept absolute paths from command line (ALREADY SUPPORTED!)

   Looking at the script: it already handles absolute paths via `args.map(arg => ...)`.
   So I can just pass the full path. Perfect.

2. **TEXT_CONFIGS additions**: Need 4 new entries.

3. **Parser handling for unusual structures**:
   - tlg3156: sections directly under edition — current parser handles this via the
     "flat structure" branch in chapter-splitter.ts
   - tlg4003.tlg001/002: book > section > paragraph — PROBLEM: existing parser
     expects book > chapter > section, not book > section > paragraph.
     The parser's `hasBookLevel` check will find books, then look for `chapter`
     level children, but these have `section` children with `paragraph` children.
   - tlg4003.tlg003: section > book > paragraph — non-standard nesting.

4. **Key issue**: The chapter-splitter currently only handles:
   - Books containing chapters (hasBookLevel branch)
   - Flat chapters/sections (else branch)

   But tlg4003 texts have: book > section > paragraph.
   The splitter iterates `book.children` looking for `chapter.level !== 'chapter'`,
   but these have level='section'. Need to also accept 'section' in the book branch.

### Solution for Book > Section > Paragraph

The chapter-splitter's book branch filters `chapter.level !== 'chapter'`.
I need to make it also accept 'section' as a valid chapter-like level within books.

For the `chapterConfig`, I can set `chapterLevel: 'section'` and modify the
book branch to use `config.chapterLevel` instead of hardcoded 'chapter'.

Wait — looking at the code again:
```typescript
for (const chapter of book.children) {
  if (chapter.level !== 'chapter') continue;
```

This is hardcoded to 'chapter'. I need to change this to:
```typescript
for (const chapter of book.children) {
  if (chapter.level !== config.chapterLevel) continue;
```

This would make the splitter respect the configured chapter level within books.

### Footnote Reference Numbers in tlg3156

The text contains inline footnote reference numbers like "1)", "2)", "3)" etc.
These are NOT actual Greek content. The existing `cleanGreekText` function
strips standalone numbers at start/end but not mid-text ones.

I should add handling for these: remove digit+parenthesis patterns like "1)" "2)" etc.
Actually looking at the content, these appear as just numbers in the running text
after the XML is flattened. The `<note type="footnote">` elements contain the actual
footnotes and are already stripped. But the reference numbers "1)" in the text body
remain.

Pattern to strip: `\d+\)` or `\d+\.\s` when appearing after non-Greek text.

Actually, looking more carefully at the source:
```
Μουσάων Ἑλικωνιάδων.1) Μούσας τὰς λογικὰς τέχνας φησί.
```
The "1)" is a footnote reference number embedded in the text. After the footnote
content is stripped (because it's in a <note> element), only the "1)" reference remains.

Solution: Add to `cleanGreekText`: strip patterns like `\d+\)` that appear after
punctuation or within Greek text.

### Also need to handle `<del>` elements

The tlg3156 text has `<del>` elements:
```xml
<del>καὶ</del> ὕδατος <del>καὶ</del> θέμιδός
```
These represent editorially deleted text. The parser's `extractDeepText` function
currently processes all non-skipped child elements. `<del>` is not in the skip list,
so its content WILL be included.

For editorial purposes, we should INCLUDE del'd text (it's part of the transmitted text),
so this is actually correct behavior.

### Also handle `<cit>` elements

In tlg4003.tlg001, paragraph 47 has a `<cit>` element. The parser should extract
text from within `<cit>` elements. Looking at the current extractDeepText, it
recursively processes all child elements except note/pb/lb/head/bibl. Since `<cit>`
is not in the skip list, it will be processed recursively — GOOD.

### `<list>` and `<item>` elements

In tlg4003.tlg001, there's a `<list type="index">` within the book head. These
are NOT in `<p>` elements, so the `extractParagraphsFromDiv` function (which only
looks at `<p>` elements) will ignore them. This is fine — the index/TOC should not
be part of the chapter text.

But wait — looking at the parser's extractParagraphsFromDiv, it only extracts `<p>` elements.
The `<list>` content is at the same level but won't be captured. This is CORRECT behavior
for our use case — we want the paragraph text, not the table of contents.

### Also handle `<gap>` elements

tlg4003.tlg001 has `<gap reason="lost"/>` — milestone elements indicating lacunae.
These should be rendered as "..." or simply ignored. The current parser doesn't
explicitly skip them, but since they're empty elements, they'll produce no text.

### Plan

1. Add 4 TEXT_CONFIGS entries
2. Modify chapter-splitter to use `config.chapterLevel` in the book branch
3. Add footnote reference stripping to cleanGreekText
4. Handle `subtype="index"` divs (skip them in the parser)
5. Handle the section>book>paragraph nesting in tlg4003.tlg003
6. Run the parser and check results

### Decisions on Slugs and Titles

1. **tlg3156.tlg001**:
   - slug: `hesiod-theogony-exegesis`
   - title: "Exegesis on Hesiod's Theogony (Exegesis in Hesiodi Theogoniam)"
   - author: "Anonymous Commentary Writer"
   - authorSlug: "anonymous-hesiod"

2. **tlg4003.tlg001**:
   - slug: `periplus-maris-exteri`
   - title: "Circumnavigation of the Outer Sea (Periplus Maris Exteri)"
   - author: "Marcianus of Heraclea"
   - authorSlug: "marcianus"

3. **tlg4003.tlg002**:
   - slug: `periplus-maris-interni`
   - title: "Menippus' Circumnavigation of the Inner Sea (Periplus Maris Interni)"
   - author: "Marcianus of Heraclea" (same author)
   - authorSlug: "marcianus"

4. **tlg4003.tlg003**:
   - slug: `artemidori-geographia`
   - title: "Artemidorus' Geography (Artemidori Geographia)"
   - author: "Marcianus of Heraclea" (same author — these are his epitomes)
   - authorSlug: "marcianus"

### Reviewer Issues Fixed (2026-01-24)

**Issue 1 (Orphaned `)`):**
- Root cause: `\d+\s*\)` regex stripped digits but left some `)` chars orphaned when the pattern didn't fully match
- Fix: Added `removeUnmatchedClosingParens()` function that uses a depth counter to only emit `)` when there's a matching `(`
- Location: `scripts/lib/greek-xml/text-extractor.ts` (new function at end of file, called from `cleanGreekText`)
- Verification: 0 files now contain orphaned `)`, legitimate parentheticals preserved

**Issue 2 (`<del>` content appended at end):**
- Root cause: `preserveOrder=false` in fast-xml-parser means `<del>` element text gets concatenated at end of paragraph, same as `<supplied>` issue
- Fix: Added `if (key === 'del') continue;` to the skip list in `extractDeepText()`
- Location: `scripts/lib/greek-xml/tei-parser.ts` line ~270
- Rationale: `<del>` marks editorially deleted text that should NOT appear in reading text. Skipping is the correct scholarly decision.
- Verification: chapter-001.json paragraph 2 no longer ends with `καὶκαὶ`

**Reprocessing**: All 4 texts reprocessed. 149 chapters, 0 WARN, 0 FAIL.
**Regression**: Zosimus (287 chapters) still produces identical output.

### Status: COMPLETE — awaiting Reviewer sign-off
