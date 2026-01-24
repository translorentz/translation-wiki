# Greek XML Parsing Notes

## TEI-XML Structure Analysis

### File 1: Epistula ad Diognetum (tlg0646.tlg004)

**Structure:** Simple two-level hierarchy: chapters > sections

```
TEI > text > body > div[type="edition"]
  └── div[type="textpart" subtype="chapter" n="1..12"]
       └── div[type="textpart" subtype="section" n="1..N"]
            └── p (Greek text content)
```

**Key observations:**
- 12 chapters, each containing numbered sections
- Chapter 1 has only 1 section; Chapter 5 has 17 sections
- `<head>` element at top: `ΕΠΙΣΤΟΛΗ ΠΡΟΣ ΔΙΟΓΝΗΤΟΝ`
- `<pb xml:id="p.350"/>` milestone page breaks (Loeb edition page numbers)
- `<note>` elements contain biblical cross-references (`<bibl>` within)
- Some editorial marks: ellipsis `...` (lacunae in ch.7.6, ch.10.1)
- No `<lb>` line break milestones
- Unicode text uses proper polytonic Greek with combining diacritics
- Page break IDs use `p.` prefix format (Loeb pages 350-378)

**Notes on content:**
- The text uses the coronis/apostrophe character ̓ (U+0313 combining comma above) and ̔ (U+0314) for breathings
- Some OCR artifacts visible: `??ʼ` sequences in ch.10.5 (manuscript damage reflection)
- Text ends at ch.12.9 with "ἀμήν" (complete text preserved)

---

### File 2: Historia Nova by Zosimus (tlg4084.tlg001)

**Structure:** Three-level hierarchy: books > chapters > sections

```
TEI > text > body > div[type="edition"]
  └── div[type="textpart" subtype="book" n="1..6"]
       └── div[type="textpart" subtype="chapter" n="1..N"]
            └── div[type="textpart" subtype="section" n="1..N"]
                 └── p (Greek text content)
```

**Key observations:**
- 6 books with 73, 55, 36, 59, 51, and 13 chapters respectively (287 total)
- Each section contains exactly 1 `<p>` element
- `<pb n="123"/>` page breaks (Teubner edition page numbers, numeric)
- No `<note>` elements — this is a critical edition without apparatus inline
- No `<lb>` line break milestones
- Text is continuous narrative prose (history of the Roman Empire's decline)
- Book 6 is incomplete (ends abruptly at ch.13 — the work was never finished)
- Largest chapter: Book 5, Chapter 41 (6 sections)
- Smallest chapters: some have only 1-2 sections

**Notes on content:**
- Heavy use of proper nouns (Roman emperors, place names, ethnic groups)
- Some passages contain Latin transliterations of Roman names
- The text preserves medieval Greek orthography (e.g., ̓Αλλάριχος for Alaric)
- Page numbers range from 1-294 across the 6 books
- A unique passage in 6.11.2 contains Latin in Greek letters (pricing decree)

---

### File 3: In Sophisticos Elenchos Paraphrasis (tlg4193.tlg012)

**Structure:** Flat single-level: chapters only (no sub-sections in structure)

```
TEI > text > body > div[type="edition"]
  └── div[n="pr|1..34" subtype="chapter" type="textpart"]
       └── p (one or more paragraph elements)
```

**Key observations:**
- 35 chapters: 1 preface ("pr") + chapters 1-34
- NO section-level divs — content is directly in `<p>` elements within chapters
- Multiple `<p>` elements per chapter (variable: 1 to 10+)
- Chapter numbers start with section numbers in text: "1. Περὶ μέντοι..."
- Heavy use of `<lb n="N"/>` line break milestones (original edition line numbers)
- `<pb n="N"/>` page breaks (Hayduck edition, pages 1-68)
- `<note type="footnote">` elements contain apparatus criticus in LATIN
  - These are substantial: manuscript variants (L, M, N, P sigla), emendations, cross-references
- `<note type="marginal">` elements contain marginal numbers (Bekker line references)
- The `<head>` elements appear at two levels: Latin title and Greek subtitle
- Text contains `|` characters (column/page breaks in original)

**Notes on content:**
- This is a commentary/paraphrase, not an original text
- The Greek contains embedded references to Aristotle's works
- Apparatus footnotes are substantial (average ~5 lines each)
- Some line break artifacts: words split across lines with hyphens
- The marginal notes contain Bekker numbers (standard Aristotle reference system)
- The preface chapter uses "pr" as its @n value (handled as "Preface" in output)

---

## TEI Elements Encountered

| Element | Semantics | Handling |
|---------|-----------|----------|
| `<div type="edition">` | Root content container | Entry point for parsing |
| `<div type="textpart" subtype="book\|chapter\|section">` | Structural divisions | Mapped to TextDivision hierarchy |
| `<p>` | Paragraph text content | Extracted as paragraph units |
| `<pb n="N"/>` | Page break milestone | Stripped (editorial, not content) |
| `<lb n="N"/>` | Line break milestone | Stripped (editorial, not content) |
| `<head>` | Section/title headings | Stripped from body content |
| `<note type="footnote">` | Apparatus criticus | Stripped entirely |
| `<note type="marginal">` | Marginal references | Stripped entirely |
| `<note>` (generic) | Cross-references, bibl | Stripped entirely |
| `<bibl>` | Bibliographic reference | Stripped (inside notes) |

---

## Challenges and Edge Cases

1. **Hyphenated word breaks** (Sophistici Elenchi): Words split across lines in the original print edition appear as "περι- πιπτόντων". Fixed with regex: join Greek chars separated by hyphen+whitespace.

2. **Pipe characters** (Sophistici Elenchi): `|` marks column/page transitions in the Hayduck edition. Replaced with spaces.

3. **Multiple `<p>` elements per chapter** (Sophistici Elenchi): Unlike the other two texts where each section has exactly one `<p>`, this text has multiple paragraphs directly in each chapter div.

4. **Preface handling**: The Sophistici Elenchi has a chapter with `n="pr"` (praefatio). Mapped to "Preface" in the title.

5. **Nested notes**: Some `<note>` elements contain `<bibl>` children. The entire note subtree is stripped.

6. **OCR artifacts** (Diognetus ch.10.5): Characters like `??ʼ` appear — these reflect actual manuscript damage and are preserved as-is.

7. **Mixed-language content** (Zosimus 6.11.2): A passage contains Latin transliterated into Greek characters. Preserved as-is (it's part of the source text).

8. **Namespace handling**: All three files use the TEI namespace (`http://www.tei-c.org/ns/1.0`). The parser strips namespace prefixes for easier traversal.

---

## Structural Differences Summary

| Feature | Diognetus | Zosimus | Sophistici Elenchi |
|---------|-----------|---------|-------------------|
| Top divisions | chapters | books | chapters |
| Sub-divisions | sections | chapters > sections | none (flat) |
| Paragraphs per section | 1 | 1 | multiple per chapter |
| Page breaks | `xml:id="p.N"` | `n="N"` | `n="N"` |
| Line breaks | none | none | `n="N"` (frequent) |
| Notes | biblical refs | none | apparatus + marginal |
| Note language | Greek/Latin | n/a | Latin |
| Total chapters | 12 | 287 | 35 |
| Word breaks | none | none | hyphenated |
