# Eustathius Processor Agent -- Round 2 Scratchpad

## Session 2026-01-24: Fixing Round 1 Issues

### Issue Analysis

After reading the Reviewer's Grade C+ critique, identified 5 issues to fix:

1. **Arabic numerals** -- Three sub-types need different treatment
2. **Ch 1/2 boundary** -- Split word "katecho-menos" spans the boundary
3. **Ch 3 truncated** -- Actually a boundary error, not truncation
4. **Short noise paragraphs** -- Need improved filtering
5. **Verse refs** -- Strip entirely (not preserve as metadata)

### Key Discoveries

**Book 2/3 Boundary Discovery:**
- The header at line 6974 `ΡΑΨ.141].4 D 9. 2} --- 57. 111` has "D" which is NOT Greek Delta
- It's OCR for Γ (Gamma) -- confirmed by verse refs from line 6978: "(Vers. 22.)" = Od. 3.22
- The "D" shape is similar to the OCR renderer's Γ output
- This means Book 3 starts at line 6974, not 8120
- The header at 8120 ("ΡΑΨΩΙ ΔΙΑ I| Vs355a-534") is a continuation header WITHIN Book 3
- "I|" there is probably Γ too (garbled differently)
- This explains why Book 3 was "short" (781 lines) -- it was missing its first 1,146 lines!

**Book 1/2 Boundary:**
- Line 5024: ΡΑΨΩΔΙΑ B header
- Lines 5027-5029: continuation of Book 1's Kybebe/Rhea discussion
- Line 5030: "(Vers, 19.)" -- first actual Book 2 verse reference
- Fix: include lines 5027-5029 in Book 1, start Book 2 at 5030

**Verse Reference Patterns:**
The OCR produces incredibly varied garbles of "(Vers. N.)":
- Standard: (Vers. 15.) (Vers, 19.)
- Spaced V: (V ers. 1.)
- Wrong letters: (Vevs. 9.) (Wers. 45.) (Vera. 3.)
- Split: (Ver rs.)
- No number: (Vers.) or (Vers. followed by Greek
- Greek letters in number: (Vers. ν4.) (Vers. va.)
- Unclosed: (Vers. 1.  (no closing paren)
- Broken: (Ver  (just the start)

Needed 6+ regex patterns to catch most of them. ~7 uncatchable remnants across all 11 chapters.

### Regex Strategy

For verse refs, went from specific to broad:
1. VERS_PATTERN: exact structure with digit
2. VERS_PATTERN_ALT: allows broken closing
3. VERS_PATTERN_SPACED: "V ers" with internal space
4. VERS_PATTERN_BROAD: catches V+garble+paren
5. VERS_PATTERN_NUMBERLESS: just "(Vers.)"
6. Unclosed pattern: no closing paren
7. Numberless unclosed: "(Vers." before Greek letter

For apparatus garble, key insight: these always contain `ΡΨ` or `ΨΩ` sequences mixed with digits, which NEVER occur in real Greek commentary text.

### Performance Notes

- Pipeline runs in ~3 seconds (25,880 lines processed)
- No performance concerns with the additional regex patterns
- The broader patterns don't cause false positives because they're applied after other cleaning

### Remaining Work

- Volume 2 processing (deferred until Volume 1 reaches Grade A)
- The ~1,189 remaining digits are inherent OCR corruption, not fixable without better source material
- The 7 remaining verse refs are so garbled they can't be reliably distinguished from text

### Files Modified

- `scripts/lib/eustathius/book-splitter.ts`
- `scripts/lib/eustathius/content-classifier.ts`
- `scripts/lib/eustathius/commentary-extractor.ts`
- `scripts/lib/eustathius/quality-checker.ts`
- `scripts/lib/eustathius/types.ts`
- `scripts/process-eustathius.ts`
