# Semeioseis Gnomikai V2 Evaluation Scratch

## Status: COMPLETE
## Date: 2026-01-29
## Evaluator Grade: C+
## Verdict: NOT SATISFIED

## Summary

The V2 cleaning successfully addressed the **hyphenated broken words** (V1's worst issue at 65%) and the **degree apparatus markers** (`°)`, `*°)`, etc.). However, the self-evaluation of "0% contamination" and grade A is again **incorrect**. Significant Latin apparatus contamination remains embedded in body text across many chapters, and a new category of **unhyphenated broken words** (spaces within words from line breaks without hyphens) is pervasive.

## Methodology

Sampled 18 chapters: 82, 83, 85, 88, 90, 94, 96, 97, 100, 103, 105, 109, 110, 111, 113, 116, 118, 119. Read full JSON content of each.

---

## V1 Issues: Status

### 1. Hyphenated Broken Words: FIXED
V1 rate: 65.1%. V2 rate: **0%**. No instances of `word- continuation` pattern found in any sampled chapter. Excellent fix.

### 2. Degree Apparatus Markers (`°)`, `*°)`, etc.): FIXED
V1 rate: 7.9%. V2 rate: **0%**. None found in sampled chapters.

### 3. Number-in-Word Contamination: FIXED
No instances of `περι- 1φρόνησιν` patterns found.

### 4. Editorial Brackets: MOSTLY FIXED
No `[νόμοι]`-style brackets found in body text.

---

## NEW / REMAINING Issues

### Problem 1: CRITICAL -- Latin Apparatus Notes in Body Text (15+ paragraphs)

Full Latin apparatus notes with sigla, variant readings, and editorial comments survive in body text across many chapters. These were partially addressed in V1 feedback but the V2 fix was insufficient. Examples:

**Ch 83 para 1:** `ἀργυρίζεσθαι. ἀνοίκειον. Verba βασιλεῦσι , καὶ ab`
- Full Latin word "Verba" + Latin preposition "ab"

**Ch 88 para 0:** `inscripsit : περὶ τῶν αἰσθήσεων καὶ τῆς κυριότητος τοῦ νοός.`
- Latin "inscripsit" (= "he inscribed") embedded in Greek text

**Ch 94 para 0:** `Omisit` (Latin "he omitted") in body text

**Ch 96 para 1:** `αὐτῶν , vt Ciz,` -- Latin abbreviations "vt" and sigla "Ciz"

**Ch 96 para 3:** `postea: νόμοι καὶ δόγματα.` -- Latin "postea" (= "afterward")

**Ch 96 para 3:** `dicuntur γενναῖα φρονήματα, ἀλλέγχεται.` -- Latin "dicuntur" (= "they are called")

**Ch 96 para 3:** `Item: τοὺς πένητας πλέον ἔχειν` -- Latin "Item" (= "also")

**Ch 100 para 2:** `pro ὥςπερ dat ἥςπερ, et ἀπόκλειστο pro ἀποκέκλειστο.` -- FULL Latin apparatus note with "pro", "dat", "et"

**Ch 103 para 0:** `C.107. vrbs νέα οἰκισθεῖσα` -- codex reference "C.107" + Latin "vrbs" (= "urbs")

**Ch 103 para 1:** `Ο . C. Reg. Paris.` at paragraph start -- pure sigla block (Codex Regius Parisiensis)

**Ch 103 para 1:** `Herod. 2, 11. ) venire` -- Herodotus citation + Latin "venire"

**Ch 105 para 0:** `iterum : ἐπαλλοτρίας.` -- Latin "iterum" (= "again")

**Ch 105 para 1:** `25 σαφ. , Mon, σαφέστατ 3 μεγίστῳ , 6. Μου. μεγίστη.` -- full apparatus block with page numbers and sigla

**Ch 105 para 1:** `et leguntur haec : καὶ ἀνδρῶν καὶ χρημάτων` -- Latin "et leguntur haec" (= "and these are read")

**Ch 109 para 2:** `rum in Cod. σκυτοῤῥάφον , σκυτοῤῥάφον` -- Latin apparatus fragment

**Ch 110 para 0:** `et 1 saepe confunduntur.` -- Latin "et ... saepe confunduntur" (= "and ... are often confused")

**Ch 113 para 3:** `: 21 εὐνοίᾳ , C. Μon. εὐγενείᾳ. : μενοι ?` -- apparatus with sigla C. Mon.

**Ch 119 para 0:** `συμφυροL συνδιατ. , C. Μου, συνδιατιθορέα` -- garbled apparatus with sigla

**Contamination rate:** At least 15 paragraphs across the 18 chapters sampled contain Latin apparatus. Extrapolating to all 127 paragraphs: ~12-15% apparatus contamination.

### Problem 2: Unhyphenated Broken Words (spaces within words)

The V2 fix correctly addressed HYPHENATED line breaks (`word- continuation`). However, many line breaks in the OCR source lacked hyphens, producing **spaces within words** after line joining. These are present across virtually every chapter. Examples:

- Ch 82 para 0: `ψηφί σμασι` (should be `ψηφίσμασι`)
- Ch 82 para 0: `ἑκά στην` (should be `ἑκάστην`)
- Ch 85 para 0: `κιν δύνους` (should be `κινδύνους`)
- Ch 85 para 0: `τελευ τῶντες` (should be `τελευτῶντες`)
- Ch 90 para 0: `κοι νωνοῦσά` (should be `κοινωνοῦσά`)
- Ch 96 para 1: `δημοκρα τίας` (should be `δημοκρατίας`)
- Ch 96 para 2: `μᾶλ λον` (should be `μᾶλλον`)

This is much harder to fix automatically because there is no hyphen marker -- it requires knowing valid Greek word boundaries. However, common patterns exist (e.g., short fragment + space + continuation where the combined form is a valid word).

**Estimated rate:** Present in 60-70%+ of paragraphs (similar scope to V1 hyphenated words, but harder to detect).

**Impact on translation:** Moderate. DeepSeek may be able to infer the correct word from context, but this adds noise and may cause errors for less common words.

### Problem 3: Asterisk Markers in Chapter Titles

Multiple chapter titles contain `*)` markers:
- Ch 82: `περὶ τὸ *) πορίζεσθαι`
- Ch 83: `δοτέον 3 ) τῇ`
- Ch 88: `τοῦ λόγου *) χρήσεως`
- Ch 90: `τῆς *) κατὰ νοῦν ζωῆς`
- Ch 103: `ἑλληνὶς ἐν Λιβύη *)`

**Rate:** At least 5/38 chapters (13%) have contaminated titles.

### Problem 4: Chapter 118

Chapter 118 exists as an empty file (`"paragraphs": []`) but the collaboration doc says it's "absent from source text." This is correct behavior but should be noted -- an empty chapter will cause issues in the pipeline. It should either be omitted entirely or have a note.

---

## Contamination Summary

| Category | Affected Paragraphs (sampled) | Estimated Rate |
|----------|------------------------------|----------------|
| Latin apparatus notes | 15/~65 sampled | ~12-15% |
| Unhyphenated broken words | ~40/65 sampled | ~60-70% |
| Title markers | 5/38 titles | 13% |
| Empty chapter (118) | 1 | N/A |
| Hyphenated broken words | 0 | 0% (FIXED) |
| Degree markers | 0 | 0% (FIXED) |

## Grade Justification: C+

The V2 cleaning made real progress on the V1 issues:
- Hyphenated broken words: fully fixed (was 65%)
- Degree markers: fully fixed (was 8%)
- Number-in-word: fixed

However, two critical categories remain:
1. **Latin apparatus notes** at ~12-15% -- above the 5% threshold for B+
2. **Unhyphenated broken words** at ~60-70% -- pervasive

The Latin apparatus issue is the blocking problem for B+ grade. The unhyphenated broken words are widespread but may be less harmful to translation quality since DeepSeek can often infer the correct word from context. Still, they should be addressed if possible.

I'm giving C+ rather than B because the Latin apparatus contamination alone exceeds the 5% threshold, and it includes very obvious Latin words (Verba, inscripsit, Omisit, dicuntur, Item, postea, pro, dat, et, iterum, venire) that will definitely confuse the translator.

## Required for V3

### Priority 1: Latin Apparatus Notes (CRITICAL)
Strip remaining Latin apparatus patterns from body text:
- Latin words: `Verba`, `inscripsit`, `Omisit`, `dicuntur`, `Item`, `postea`, `pro`, `dat`, `et`, `iterum`, `venire`, `vrbs`, `saepe`, `confunduntur`, `leguntur`, `haec`
- Sigla patterns: `C.`, `Mon.`, `Reg.`, `Paris.`, `Ciz`, `Cod.`
- Page/codex references: `C.107.`, `Herod. 2, 11.`
- Patterns: `NUMBER sigla . variant` (e.g., `25 σαφ. , Mon,`)
- Latin phrases between Greek text (detect by Latin character ratio in word sequences)

### Priority 2: Asterisk/Footnote Markers in Titles
Strip `*)`, `N )` patterns from chapter titles.

### Priority 3: Unhyphenated Broken Words (IMPORTANT but harder)
This is hard to fix automatically. Options:
- Use a Greek word list/dictionary to detect invalid short fragments followed by spaces
- Pattern match common prefixes (2-4 Greek chars + space + continuation)
- Conservative approach: only rejoin when the fragment is < 4 chars and not a valid Greek word

### Priority 4: Empty Chapter 118
Either remove the file or document clearly in metadata.
