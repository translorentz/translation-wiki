# Greek XML Processing Pipeline

## Overview

A modular TypeScript pipeline for parsing TEI-XML (EpiDoc) Greek texts from the First1KGreek corpus (Perseus Digital Library) into structured chapter JSON files suitable for the translation wiki.

## Architecture

```
scripts/process-greek-xml.ts          -- Main entry point / CLI
scripts/lib/greek-xml/
  ├── index.ts                         -- Module exports
  ├── types.ts                         -- TypeScript interfaces + text configs
  ├── tei-parser.ts                    -- XML parsing (fast-xml-parser)
  ├── text-extractor.ts                -- Text cleaning / normalization
  ├── chapter-splitter.ts              -- Division hierarchy -> flat chapters
  └── validator.ts                     -- Quality checking
```

### Pipeline Flow

```
XML file
  → [tei-parser] Parse XML, extract metadata + division tree
  → [chapter-splitter] Flatten tree into chapter units
    → [text-extractor] Clean each paragraph (called by splitter)
  → [validator] Quality-check all chapters
  → Write output: data/raw/<slug>/ + data/processed/<slug>/
```

### Design Decisions

1. **fast-xml-parser**: Chosen for its speed, zero dependencies, and configurable parsing. It parses XML into a JavaScript object tree without requiring DOM APIs, which makes it easy to traverse and extract content.

2. **Configurable splitting**: Different texts have different structures (books > chapters > sections vs. flat chapters). The `ChapterConfig` type allows specifying which division level to split at, whether to include parent labels in titles, and whether sections become separate paragraphs.

3. **Aggressive note stripping**: All `<note>` elements (footnotes, marginal notes, biblical references, apparatus criticus) are completely removed. The output is meant to be the Greek text only, clean and ready for translation.

4. **Hyphenated word rejoining**: Print-edition line breaks that split Greek words (e.g., "συλλο- γισμὸς") are detected and joined back together using Unicode script detection.

5. **Sections-as-paragraphs**: For texts with sections (Diognetus, Zosimus), each section becomes a separate paragraph in the output. This provides good granularity for side-by-side translation display.

## How to Add New XML Files

### Step 1: Place the file

```
data/greek_xml/tlgNNNN.tlgNNN.1st1K-grc1.xml
```

### Step 2: Add configuration

In `scripts/lib/greek-xml/types.ts`, add an entry to `TEXT_CONFIGS`:

```typescript
'tlgNNNN.tlgNNN': {
  slug: 'my-text-slug',
  authorSlug: 'author-slug',
  authorName: 'Author Name',
  authorNameOriginal: 'Ὄνομα',
  title: 'English Title (Latin Title)',
  era: 'Nth century CE',
  compositionYear: 500,
  textType: 'prose',  // or 'poetry'
  chapterConfig: {
    chapterLevel: 'chapter',          // or 'book', 'section'
    includeParentInTitle: true,       // "Book N, Chapter M" vs "Chapter M"
    sectionsAsParagraphs: true,       // sections -> paragraphs?
  },
},
```

### Step 3: Examine the structure

Before running, check the XML's structure:
- Does it have books > chapters > sections? (like Zosimus)
- Or just chapters > sections? (like Diognetus)
- Or flat chapters with multiple `<p>` elements? (like Soph. Elenchi)

Set `chapterConfig` accordingly.

### Step 4: Run the pipeline

```bash
pnpm tsx scripts/process-greek-xml.ts tlgNNNN.tlgNNN.1st1K-grc1.xml
```

### Step 5: Review output

Check the validation report for WARNs/FAILs. Sample the output files to verify Greek text quality.

### Step 6: Seed into database

Add entries to `scripts/seed-db.ts`:

```typescript
// In AUTHOR array (if new author):
{ name: 'Author Name', nameOriginalScript: 'Ὄνομα', slug: 'author-slug', era: 'Nth century' }

// In TEXTS array:
{
  title: 'English Title',
  titleOriginal: 'Greek/Latin Title',
  slug: 'my-text-slug',
  authorSlug: 'author-slug',
  languageCode: 'grc',
  textType: 'prose',
  compositionYear: 500,
  compositionEra: 'Nth century CE',
  processedDir: 'data/processed/my-text-slug',
}
```

## TEI-XML Structure Reference

### EpiDoc Conventions (First1KGreek)

The First1KGreek corpus uses EpiDoc TEI, a subset of TEI specialized for ancient/classical texts. Key conventions:

1. **Namespace**: `http://www.tei-c.org/ns/1.0` (all elements)

2. **CTS URNs**: Each text has a Canonical Text Services URN in the format:
   `urn:cts:greekLit:tlg{author}.tlg{work}.{edition}`

3. **Reference declarations** (in `<encodingDesc>`): Define XPath patterns for citing the text. These tell you the structural hierarchy:
   ```xml
   <cRefPattern matchPattern="(.+).(.+).(.+)" n="section" .../>
   <cRefPattern matchPattern="(.+).(.+)" n="chapter" .../>
   <cRefPattern matchPattern="(.+)" n="book" .../>
   ```

4. **Edition div**: The main text content is always inside:
   ```xml
   <div type="edition" n="urn:cts:..." xml:lang="grc">
   ```

5. **Structural divisions**: Always use `<div type="textpart">` with a `subtype` attribute:
   - `subtype="book"` — top-level divisions (for multi-book works)
   - `subtype="chapter"` — main chapter divisions
   - `subtype="section"` — sub-chapter sections

6. **Milestones**: Self-closing elements marking positions:
   - `<pb n="123"/>` — page break (edition page number)
   - `<lb n="5"/>` — line break (edition line number)
   - These do NOT contain content; they mark positions in the text flow

7. **Notes**: Can be `type="footnote"`, `type="marginal"`, or untyped. Always contain editorial/scholarly content, not primary text.

### Known Quirks of First1KGreek Files

- **Inconsistent whitespace**: Some files have generous indentation; others are compact
- **Preface chapters**: Some texts use `n="pr"` or `n="praef"` for introductory sections
- **Mixed content in `<p>`**: Paragraphs can contain inline elements (`<note>`, `<pb>`, etc.) mixed with text nodes
- **Chapter numbering in text**: Some paraphrases/commentaries embed "1. " at the start of paragraphs
- **Manuscript damage markers**: Some texts preserve editorial symbols for lacunae (`...`, `[...]`, etc.)
- **Multiple `<head>` elements**: Some files have heads at both the edition level and within sections

## Processing Results

### Text 1: Epistula ad Diognetum

| Metric | Value |
|--------|-------|
| Chapters | 12 |
| Paragraphs | 100 |
| Characters | 16,823 |
| Avg paragraph length | 168 chars |
| Quality | 12 PASS, 0 WARN, 0 FAIL |
| Output slug | `diognetum` |

### Text 2: Historia Nova (Zosimus)

| Metric | Value |
|--------|-------|
| Books | 6 |
| Chapters | 287 |
| Paragraphs | 1,071 |
| Characters | 416,216 |
| Avg paragraph length | 389 chars |
| Quality | 287 PASS, 0 WARN, 0 FAIL |
| Output slug | `historia-nova` |

### Text 3: In Sophisticos Elenchos Paraphrasis

| Metric | Value |
|--------|-------|
| Chapters | 35 (1 preface + 34 numbered) |
| Paragraphs | 105 |
| Characters | 173,137 |
| Avg paragraph length | 1,649 chars |
| Quality | 35 PASS, 0 WARN, 0 FAIL |
| Output slug | `sophistici-elenchi-paraphrasis` |

### Grand Total

- **334 chapters** extracted
- **1,276 paragraphs** of clean Greek text
- **606,176 characters** of content
- **0 failures**, 0 warnings across all validation checks

## Mapping: TLG Identifiers to Text Metadata

| TLG ID | Title | Author | Century | Slug |
|--------|-------|--------|---------|------|
| tlg0646.tlg004 | Epistula ad Diognetum | Pseudo-Justinus Martyr | 2nd CE | diognetum |
| tlg4084.tlg001 | Historia Nova | Zosimus | 5th-6th CE | historia-nova |
| tlg4193.tlg012 | In Soph. Elenchos Paraphrasis | Anonymous | Late Antiquity | sophistici-elenchi-paraphrasis |

## Dependencies

- **fast-xml-parser** (v5.3.x): Zero-dependency XML parser for Node.js
  - Chosen over xml2js (heavier, callback-based) and DOMParser (not available in Node without jsdom)
  - Configured to strip namespaces, preserve text nodes, and handle arrays consistently
