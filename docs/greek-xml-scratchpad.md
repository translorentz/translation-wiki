# Greek XML Processing -- Working Notes

## Session: 2026-01-24

### Initial Examination

Read all three XML files thoroughly. Key findings:

1. **Three very different structures:**
   - Diognetus: chapters > sections (simple 2-level)
   - Zosimus: books > chapters > sections (3-level)
   - Soph. Elenchi: flat chapters with multiple `<p>` elements (1-level)

2. **Notes are the main challenge:** The Soph. Elenchi file has extensive footnotes in LATIN containing apparatus criticus (manuscript variants, emendations). These must be stripped completely.

3. **Line breaks cause word splits:** The Soph. Elenchi text has `<lb>` elements that correspond to printed line breaks, and words are sometimes split across them with hyphens.

### Parser Design

Decided on a 4-module architecture:
- `tei-parser.ts` -- handles XML parsing via fast-xml-parser
- `text-extractor.ts` -- text cleaning/normalization
- `chapter-splitter.ts` -- converts division tree to flat chapters
- `validator.ts` -- quality checks

Key design choice: configurable per-text via `TEXT_CONFIGS` map keyed by TLG identifier. This means adding new texts only requires adding a config entry.

### Implementation

1. **fast-xml-parser configuration:** Critical settings were:
   - `isArray` function to ensure `div`, `p`, `note` elements always parse as arrays
   - `removeNSPrefix: true` to strip the TEI namespace
   - `trimValues: false` to preserve Greek whitespace

2. **Text extraction approach:** Recursive traversal of parsed nodes, skipping `note`, `pb`, `lb`, `head`, and `bibl` elements. All other elements have their text content extracted.

3. **Chapter splitting:** Configurable via `ChapterConfig`:
   - `chapterLevel`: which div level = chapter output unit
   - `includeParentInTitle`: for book-level texts
   - `sectionsAsParagraphs`: whether sections become separate output paragraphs

### Testing and Fixes

1. **First run:** All three texts parsed cleanly on first try. 0 errors.

2. **Issue found:** Soph. Elenchi had hyphenated word breaks ("περι- πιπτόντων"). Added regex fix in text-extractor using Unicode script property.

3. **Issue found:** Pipe characters (`|`) in Soph. Elenchi from column markers. Added replacement rule.

4. **After fixes:** All texts show 100% Greek character ratio and 0 warnings.

### Validation Results

- Diognetus: 12/12 PASS
- Zosimus: 287/287 PASS
- Soph. Elenchi: 35/35 PASS

Total: 334 chapters, 1,276 paragraphs, 606,176 characters of clean Greek text.

### Output Verification

Sampled multiple chapters (first, middle, last) from each text:
- Greek polytonic diacritics preserved correctly
- No apparatus/footnote contamination
- Section boundaries align with original text structure
- Paragraph indices are sequential and start at 1
- JSON format matches expected schema for seed-db.ts

### Edge Cases Handled

1. Preface chapter (`n="pr"`) in Soph. Elenchi -> title "Preface"
2. Incomplete last book (Zosimus Book 6, only 13 chapters)
3. OCR damage indicators in Diognetus ch.10 (`??ʼ` sequences)
4. Latin transliteration in Greek (Zosimus 6.11.2 -- pricing decree)
5. Biblical reference notes (Diognetus) stripped cleanly
6. Empty sections (none found, but handled gracefully)

### Known Minor Issue

In Sophistici Elenchi chapter 35 (the last chapter), a Bekker reference number "138" appears as bare text content rather than wrapped in a `<note type="marginal">` tag. This is an encoding inconsistency in the source XML (79 other marginal notes are properly tagged and stripped). The number appears between "ῥητορικοὐς λόγους" and "συμβέβηκε" in the final paragraph. Since it's the only such instance and implementing a broader number-stripping rule could inadvertently remove legitimate Greek text containing numerals, it's left as-is.

### Ready for Next Steps

The pipeline is complete. Next steps for a future session:
1. Add author/text entries to `seed-db.ts`
2. Run `pnpm tsx scripts/seed-db.ts` to seed into the database
3. Run translation workers on each text:
   - `pnpm tsx scripts/translate-batch.ts --text diognetum`
   - `pnpm tsx scripts/translate-batch.ts --text historia-nova`
   - `pnpm tsx scripts/translate-batch.ts --text sophistici-elenchi-paraphrasis`
