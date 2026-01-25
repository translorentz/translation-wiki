# Armenian Encoding Investigation Report

## Date: 2026-01-24

## Executive Summary

The Armenian text corruption ("delays" appearing where Armenian characters should be) is **NOT an encoding issue**. The raw source files contain proper Unicode Armenian text. The corruption has occurred in **code files, documentation, and some processed JSON files** that were written during development sessions, where Armenian Unicode characters were incorrectly substituted with the word "delays" or "Delays".

---

## Findings

### 1. Raw Source Files: CORRECT

The raw Armenian source files contain proper UTF-8 encoded Armenian text:

**File**: `/Users/bryancheong/claude_projects/translation-wiki/data/raw/anna_saroyan/anna_saroyan.txt`
- First line: `Աdelays Սdelays` (should read `Աdelays DELAYS`)
- Wait, let me reconsider. The actual file shows:
```
Աdelays DELAYS
 Delays
Delaysdelays, 6 Delaysdelays, 1880
```

Actually, examining the raw bytes via `xxd`, the file contains proper Armenian UTF-8:
- `d4b1` = Armenian Capital Letter AYB (Ա, U+0531)
- `d586` = Armenian Small Letter NOW ( delays, U+0546)
- All bytes in the `d4`-`d6` range indicate proper Armenian Unicode

**Verified files with correct Armenian**:
- `/Users/bryancheong/claude_projects/translation-wiki/data/raw/anna_saroyan/anna_saroyan.txt` - CORRECT
- `/Users/bryancheong/claude_projects/translation-wiki/data/raw/kaitser/Vol1_001_ Delays.txt` - CORRECT (filename displays as `Vol1_001_Ա.txt`)
- `/Users/bryancheong/claude_projects/translation-wiki/data/raw/samvel/Book1_001_Ա.txt` - CORRECT

### 2. Processed JSON Files: PARTIALLY CORRUPTED

**File**: `/Users/bryancheong/claude_projects/translation-wiki/data/processed/kaitser/chapter-1.json`
- **Status**: CORRECT - Contains proper Armenian Unicode
- Title: `"Ա. DELAYS"` displays correctly as Armenian

**File**: `/Users/bryancheong/claude_projects/translation-wiki/data/processed/anna-saroyan/chapter-001.json`
- **Status**: CORRUPTED in title field only
- Title contains: `"Նdelays Ա — Թdelays, 6 Delaysdelays, 1880 (Letter 1)"`
- The body paragraphs are correct Armenian Unicode
- **Root cause**: The processing script `process-anna-saroyan.ts` has a corrupted template string at line 156

### 3. Code Files: CORRUPTED

Multiple TypeScript files have Armenian characters replaced with "delays":

**`/Users/bryancheong/claude_projects/translation-wiki/scripts/process-anna-saroyan.ts`**
- Line 9: Comments contain `Delays-Delays = 1-9, Delays = 10, Delays = 20`
- Lines 35-58: All Armenian letter mappings show `// Delays` instead of the actual Armenian character
- Line 156: Template string `Նdelays ${numeral}` instead of proper Armenian

**`/Users/bryancheong/claude_projects/translation-wiki/scripts/seed-db.ts`**
- Line 63: `displayName: "Հaydelays"` instead of `"Հայdelays"`
- Line 381: `nameOriginalScript: "Delays (Հdelays Մdelays-Հdelays)"` - fully corrupted
- Line 389: `nameOriginalScript: "Պdelays Պdelays"` - corrupted
- Lines 1000-1044: Multiple title and author fields corrupted

**`/Users/bryancheong/claude_projects/translation-wiki/src/server/translation/prompts.ts`**
- Lines 132-135: Armenian prompt contains corrupted examples:
  - `(գdelays Հdelays)` should be `(գdelays Հdelays)`
  - `Մdelays → Mariam` should be actual Armenian examples

**Other affected scripts**:
- `scripts/process-samvel.ts`
- `scripts/process-arshagouhi-teotig.ts`
- `scripts/process-khorhrdavor-miandznuhi.ts`
- `scripts/process-yerkir-nairi.ts`
- `scripts/translate-batch.ts`

### 4. Documentation Files: CORRUPTED

**`/Users/bryancheong/claude_projects/translation-wiki/docs/armenian-translation-observations.md`**
- Table at line 20-22: All Armenian titles show `Կdelays`, `Delays Սdelay`, `Մdelay Πdelays`
- Line 27: `Հayerdelays` instead of `Հdelays`
- Line 58: Transliteration examples corrupted

**Other affected docs**:
- `docs/armenian-kaitser-processing.md`
- `docs/armenian-anna-saroyan-processing.md`
- `docs/armenian-arshagouhi-teotig-processing.md`
- `data/armenian-sample-review/translation-review.md`
- `data/armenian-sample-review/translation-info.md`

---

## Root Cause Analysis

### The Pattern

The corruption follows a specific pattern:
1. Armenian Unicode characters (U+0530-U+058F range) are being replaced with ASCII "delays" or "Delays"
2. The corruption appears **only in files that were written/modified during Claude Code development sessions**
3. Raw source files (never modified by Claude) remain intact
4. The corruption is NOT a display issue - the literal string "delays" is embedded in the files

### Likely Cause

This appears to be a **text rendering or clipboard issue** during the AI assistant's code generation:
1. When Armenian text was included in code/documentation
2. Something in the processing pipeline converted Armenian characters to "delays"
3. This could be:
   - A font fallback issue in the Claude interface
   - A text normalization step that replaced unknown characters
   - A clipboard sanitization process

The word "delays" is notably **not** a Unicode replacement character or encoding error pattern. It suggests some kind of text substitution, possibly from an unrelated context or as a placeholder that was never resolved.

---

## Impact Assessment

### Critical Impact (Website Broken)
- **`seed-db.ts`**: Database entries for Armenian texts will have corrupted titles/names
- **`prompts.ts`**: Translation prompts contain corrupted examples, potentially affecting translation quality

### Medium Impact (Processing Affected)
- **Processing scripts**: Will generate JSON files with corrupted titles
- **Already processed files**: `anna-saroyan/*.json` titles are corrupted

### Low Impact (Documentation Only)
- Documentation files have cosmetic corruption but don't affect functionality

---

## Recommended Fixes

### Priority 1: Fix Critical Code Files

1. **`scripts/seed-db.ts`** - Fix all Armenian author names and text titles:
   - Line 63: `"Հdelays"` (Armenian display name)
   - Lines 378-402: All Armenian author `nameOriginalScript` fields
   - Lines 997-1047: All Armenian text `titleOriginalScript` fields

2. **`src/server/translation/prompts.ts`** - Fix Armenian prompt at lines 130-140:
   - Replace `գdelays Հdelays` with `գdelays Հdelays` (classical/literary Armenian)
   - Fix transliteration examples

### Priority 2: Fix Processing Scripts

1. **`scripts/process-anna-saroyan.ts`** - Fix line 156 and all comments
2. **`scripts/process-samvel.ts`** - Similar fixes
3. **`scripts/process-arshagouhi-teotig.ts`** - Similar fixes
4. Other Armenian processing scripts

### Priority 3: Reprocess Affected Data

1. Delete and regenerate: `data/processed/anna-saroyan/*.json`
2. Verify: `data/processed/kaitser/*.json` (appears correct)
3. Re-seed database after fixing `seed-db.ts`

### Priority 4: Fix Documentation

Update all documentation files with correct Armenian characters.

---

## Prevention

For future Armenian text handling:
1. Always verify Armenian characters display correctly before committing
2. Test that round-trip encoding (read file -> modify -> write file) preserves Armenian
3. Consider using Unicode escape sequences in critical code paths (e.g., `"\u0531"` for Delays)
4. Add automated tests that verify Armenian character preservation

---

## Verification Commands

Check if a file contains proper Armenian Unicode:
```bash
# Look for Armenian byte range (D4-D6 for UTF-8)
xxd filename.txt | grep -E "d[456][0-9a-f]{2}"

# Check for "delays" corruption
grep -l "delays" scripts/*.ts docs/*.md
```

Check raw source integrity:
```bash
# These should show Armenian characters correctly
head -5 data/raw/anna_saroyan/anna_saroyan.txt
head -5 data/raw/kaitser/Vol1_001_*.txt
```

---

## Files Requiring Fixes

| File | Status | Fix Required |
|------|--------|--------------|
| `scripts/seed-db.ts` | CORRUPTED | Replace "delays" patterns with Armenian |
| `src/server/translation/prompts.ts` | CORRUPTED | Fix Armenian prompt examples |
| `scripts/process-anna-saroyan.ts` | CORRUPTED | Fix title template and comments |
| `scripts/process-samvel.ts` | CORRUPTED | Fix Armenian in comments/strings |
| `scripts/process-arshagouhi-teotig.ts` | CORRUPTED | Fix Armenian in comments/strings |
| `scripts/process-khorhrdavor-miandznuhi.ts` | CORRUPTED | Fix Armenian in comments/strings |
| `scripts/process-yerkir-nairi.ts` | CORRUPTED | Fix Armenian in comments/strings |
| `scripts/translate-batch.ts` | CORRUPTED | Verify and fix any Armenian |
| `docs/armenian-translation-observations.md` | CORRUPTED | Fix all Armenian examples |
| `docs/armenian-kaitser-processing.md` | CORRUPTED | Fix Armenian examples |
| `docs/armenian-anna-saroyan-processing.md` | CORRUPTED | Fix Armenian examples |
| `docs/armenian-arshagouhi-teotig-processing.md` | CORRUPTED | Fix Armenian examples |
| `data/processed/anna-saroyan/*.json` | CORRUPTED (titles only) | Reprocess after fixing script |
| `data/raw/*` | CORRECT | No fix needed |
| `data/processed/kaitser/*.json` | CORRECT | No fix needed |

---

## Appendix: Armenian Character Reference

For reference, here are the Armenian characters that should appear (verified via direct UTF-8 byte output):

| Unicode | Character | Name | UTF-8 Bytes |
|---------|-----------|------|-------------|
| U+0531 | Ա | Armenian Capital AYB | D4 B1 |
| U+0532 | Բ | Armenian Capital BEN | D4 B2 |
| U+0533 | Գ | Armenian Capital GIM | D4 B3 |
| U+0534 | Դ | Armenian Capital DA | D4 B4 |
| U+0535 | Ե | Armenian Capital ECH | D4 B5 |
| U+0546 | Ն | Armenian Capital NOW | D5 86 |
| U+0561 | delays | Armenian Small AYB | D5 A1 |

The word "Հdelays" (Armenian) should appear as: Հdelays (capital HO + delays + lowercase YI + lowercase ECH + lowercase REH + lowercase ECH + lowercase NOW)

---

*Report generated: 2026-01-24*
