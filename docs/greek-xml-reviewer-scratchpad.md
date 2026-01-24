# Greek XML Reviewer -- Working Notes

## Session: 2026-01-24

### Initial Assessment

Reviewed all output produced by the Parser Agent (a95b70a). Three texts processed:

1. **Epistula ad Diognetum** (slug: `diognetum`): 12 chapters, 100 paragraphs, 16,823 chars
2. **Historia Nova** (slug: `historia-nova`): 287 chapters (6 books), 1,071 paragraphs, 416,216 chars
3. **In Soph. Elenchos Paraphrasis** (slug: `sophistici-elenchi-paraphrasis`): 35 chapters, 105 paragraphs, 173,137 chars

### Methodology

1. Read Parser's scratchpad and plan documentation for claimed decisions
2. Examined sample output files from beginning, middle, and end of each text
3. Cross-referenced output against source XML for accuracy
4. Searched for known artifact types: XML tags, pipe chars, footnote content, Latin text, Arabic numerals
5. Checked paragraph structure and sizing for translation suitability
6. Verified Unicode/polytonic diacritics preservation

### Text-by-Text Quality Log

#### Diognetum (Epistula ad Diognetum)

**Structure**: GOOD. 12 chapters matching 12 TEI chapters. Sections become paragraphs correctly.
**Greek quality**: GOOD. Polytonic diacritics preserved. Smooth coronis forms (̓) used.
**Notes stripped**: VERIFIED. Compared ch10 XML (has 4 `<bibl>` notes) against output -- all stripped cleanly.
**Page breaks**: VERIFIED. `<pb>` elements stripped, no residue.

**Issues found**:
- Ch10 section 5: Contains `??ʼ` sequences ("καταδυν̔??ʼ στεύειν", "βούλεσθ̔??ʼ", "βιάζεσθἁ??ʼ").
  - VERDICT: These are in the SOURCE XML (line 703-705). This is OCR damage in the digital edition itself.
  - The Parser correctly preserved what the XML contains. NOT a parser bug.
- Ch10 section 4: "μιμη τὴς" -- incorrect word break (should be "μιμητὴς").
  - VERDICT: Also in the source XML (line 697: "ἀγαπήσας δὲ μιμη<newline>τὴς ἔσῃ"). This is a legitimate OCR-to-XML artifact where a line break became a space.
  - NOT a parser bug but worth noting as a source-text limitation.
- Ch1: Only 1 paragraph (one long section). This is correct per the XML structure.

**Overall: GRADE A-** (Minor source-text issues pass through faithfully; no parser errors)

#### Historia Nova (Zosimus)

**Structure**: GOOD. 6 books, 287 total chapters. Book transitions verified:
  - Book 1: ch1-73 (73 chapters)
  - Book 2: ch74-128 (55 chapters)
  - Book 3: ch129-164 (36 chapters)
  - Book 4: ch165-223 (59 chapters)
  - Book 5: ch224-274 (51 chapters)
  - Book 6: ch275-287 (13 chapters)

**Greek quality**: EXCELLENT. Sampled ch1, ch50, ch150, ch287. All clean polytonic Greek.
**Notes stripped**: N/A (source XML has no notes -- Mendelssohn edition)
**Paragraph structure**: Good. Each section = 1 paragraph. Avg 389 chars, reasonable for translation.
**Titles**: Good. "Book N, Chapter M" format is clear and informative.

**Issues found**: NONE detected across all samples.

**Overall: GRADE A** (Clean, complete, well-structured, ready for translation)

#### Sophistici Elenchi Paraphrasis (Anonymous Commentary)

**Structure**: GOOD. 35 chapters (1 preface + 34 numbered). Preface correctly titled.
**Chapter numbering**: Intentional off-by-one: chapterNumber 1 = "Preface", chapterNumber 2 = "Chapter 1", etc.
  - This is correct behavior since the preface uses n="pr" in the XML.
  - The chapterNumber field is a sequential output counter, the title field reflects the source numbering.

**Greek quality**: MOSTLY GOOD but with significant OCR artifacts inherited from source.
**Notes stripped**: VERIFIED. Compared Preface XML (has extensive Latin apparatus footnote at line 133-141) against output. Note content completely removed.
**Pipe characters**: VERIFIED removed. 0 occurrences in output.
**Hyphen rejoining**: VERIFIED working. "περι- πιπτόντων" → "περιπιπτόντων" in output.

**CRITICAL ISSUES found**:

1. **OCR garble from source** (inherited, not parser bugs):
   - ch6: "ttt;" and "tttj" and "TTT" -- garbage tokens from OCR of the printed edition
   - ch6: "rOμηρος" -- failed OCR of "Ὅμηρος"
   - ch6: "ὃrιuι ιουρἴ̀ικω1" and "izr^" -- complete garble
   - ch6: "ἀνεπίσκετͅον" -- combining iota subscript (U+0345) used incorrectly as a combining mark
   - ch11, ch12, ch13, ch23: additional scattered OCR artifacts (7 total hits for ttt/TTT patterns)
   - VERDICT: All verified as present in source XML. The parser passes them through faithfully.

2. **Midpoint (·) characters** -- 95 occurrences across all 35 chapters:
   - Most are legitimate Greek middle dot punctuation (ano teleia, used as semicolon/colon in Greek)
   - However, some appear to be artifacts: "ἀμφ·ίβολον" (ch20) -- midpoint embedded inside a word
   - "ἐρωτ·α" (ch35) -- midpoint inside a word
   - "π·ερὶ" (ch35) -- midpoint inside a word
   - VERDICT: These are source XML artifacts. The parser correctly preserved them. NOT parser bugs.
   - RECOMMENDATION: Could be cleaned post-hoc, but risky to apply blindly since most midpoints are legitimate.

3. **Very long single-paragraph chapters**:
   - ch1: 1 paragraph, 1,756 chars
   - ch3: 1 paragraph, 3,184 chars
   - ch8: 1 paragraph, 4,247 chars
   - ch10: 1 paragraph, 4,963 chars
   - ch20: 1 paragraph, 3,236 chars
   - ch32: 1 paragraph, 2,322 chars
   - VERDICT: This is because the XML has no internal `<p>` subdivisions in these chapters -- just one `<p>` element.
   - IMPACT: Translation quality may suffer for very long paragraphs (4,900+ chars is near the API batch limit).
   - RECOMMENDATION: Consider sub-splitting paragraphs > 3000 chars at sentence boundaries.

4. **Chapter 20 has "ἐπίστατα,ι" and "ἀμφ·ίβολον"**:
   - These are comma-inside-word and midpoint-inside-word artifacts from the source edition.
   - NOT parser bugs.

5. **Chapter 35 (last chapter) has "παραλελειυͅμένοις"**:
   - U+0345 COMBINING GREEK YPOGEGRAMMENI used incorrectly (combining character where a precomposed form should be used).
   - Also "ῥητορικοὐς" -- wrong breathing on the upsilon (should be unaccented).
   - Both are source XML issues.

6. **Chapter 35 has "συναύ ξειν"**:
   - Space inside a word, likely from the source edition's line breaking.
   - The hyphen-rejoining logic catches "foo- bar" patterns but NOT "foo bar" patterns where the hyphen was never present.
   - RECOMMENDATION: Could be addressed with a secondary pass but risky (could break legitimate text).

**Overall: GRADE B+** (Parser execution is flawless; inherited OCR issues from the source XML are the only problems. These are NOT parser bugs but limit the output quality.)

### Cross-Cutting Assessment

**Parser correctness**: EXCELLENT (A). No parser-introduced errors detected across any text. All artifacts found are verifiably present in the source XML.

**Output format**: CORRECT. All JSON files match the expected schema:
```json
{ "chapterNumber": N, "title": "...", "sourceContent": { "paragraphs": [{ "index": N, "text": "..." }] } }
```
Note: paragraph indices start at 1 (not 0). This is consistent across all three texts.

**Decisions I agree with**:
- Sections as paragraphs for Diognetum and Zosimus
- Multiple `<p>` elements as paragraphs for Soph. Elenchi
- Preface handled as chapter 1 with title "Preface"
- Book+Chapter title format for multi-book Zosimus
- Aggressive note stripping (all `<note>`, `<bibl>` content removed)
- `<pb>` and `<lb>` milestone elements stripped
- Hyphenated word rejoining

**One concern**:
- The Sophistici Elenchi has many chapters with only 1 paragraph containing 3,000-5,000 characters. This is suboptimal for the translation pipeline which works best with paragraphs of 500-2000 characters. However, this accurately reflects the source XML structure, so the parser is correct -- this is a "post-processing enhancement" request, not a bug.
