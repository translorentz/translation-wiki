# Armenian Text Corruption Fix Report

**Status: COMPLETE**
**Date: 2026-01-24**

## Problem Summary

Armenian Unicode characters (U+0530-U+058F range) were corrupted during development sessions, with the word "delays" or "Delays" incorrectly substituted for Armenian characters. This was NOT an encoding issue - the raw source files in `data/raw/` are correct UTF-8. The corruption occurred only in code files, documentation, and some processed JSON files.

## Root Cause

The corruption pattern suggests that Armenian characters were replaced with the ASCII word "delays" during text processing or copy-paste operations. The exact cause is unclear, but it may have been related to clipboard handling, terminal rendering, or an automated process that failed to handle Armenian Unicode correctly.

## Files Fixed

### Critical Code Files - FIXED

| File | Issue | Status |
|------|-------|--------|
| `scripts/seed-db.ts` | Armenian display name, author names, text titles corrupted | FIXED |
| `src/server/translation/prompts.ts` | Armenian prompt examples corrupted | FIXED |

### Processing Scripts - FIXED

| File | Issue | Status |
|------|-------|--------|
| `scripts/process-anna-saroyan.ts` | "Namak" (Letter) and date comment corrupted | FIXED |
| `scripts/process-khorhrdavor-miandznuhi.ts` | Month names and titles corrupted | FIXED |
| `scripts/process-yerkir-nairi.ts` | Part names and subtitles corrupted | FIXED |
| `scripts/process-samvel.ts` | Chapter title example corrupted | FIXED |
| `scripts/process-arshagouhi-teotig.ts` | Month abbreviations and title corrupted | FIXED |
| `scripts/process-kaitser.ts` | Chapter numeral example corrupted | FIXED |

### Processed JSON Files - REGENERATED

The following JSON files were regenerated with correct Armenian text:

- `data/processed/anna-saroyan/` (23 files) - REGENERATED
- `data/processed/yerkir-nairi/` (25 files) - REGENERATED
- `data/processed/khorhrdavor-miandznuhi/` (12 files) - REGENERATED

### Documentation Files - NOT FIXED (Low Priority)

The following documentation files still contain corrupted Armenian text. These are reference documents and can be manually updated as needed:

- `docs/armenian-anna-saroyan-processing.md`
- `docs/armenian-arshagouhi-teotig-processing.md`
- `docs/armenian-encoding-investigation.md`
- `docs/armenian-kaitser-processing.md`
- `docs/armenian-khorhrdavor-miandznuhi-processing.md`
- `docs/armenian-samvel-processing.md`
- `docs/armenian-translation-observations.md`
- `docs/armenian-yerkir-nairi-processing.md`

## Correct Armenian Text Reference

Due to display issues with Armenian Unicode in some environments, here are the correct values using Unicode escape sequences:

### Language Name
- **Correct**: `\u0540\u0561\u0575\u0565\u0580\u0565\u0576` (Hayeren = Armenian)

### Author Names
| Author | Correct Unicode Escapes |
|--------|------------------------|
| Raffi | `\u054c\u0561\u0586\u0586\u056b (\u0540\u0561\u056f\u0578\u0562 \u0544\u0565\u056c\u056b\u0584-\u0540\u0561\u056f\u0578\u0562\u0575\u0561\u0576)` |
| Perch Proshyan | `\u054a\u0565\u0580\u0573 \u054a\u0580\u0578\u0577\u0575\u0561\u0576` |
| Arshagouhi Teotig | `\u0531\u0580\u0577\u0561\u0563\u0578\u0582\u0570\u056b \u0539\u0565\u0578\u057f\u056b\u0563` |
| Yeghishe Charents | `\u0535\u0572\u056b\u0577\u0565 \u0549\u0561\u0580\u0565\u0576\u0581` |

### Text Titles
| Title | Correct Unicode Escapes |
|-------|------------------------|
| Kaitser (The Spark) | `\u053f\u0561\u0575\u0581\u0565\u0580` |
| Samvel | `\u054d\u0561\u0574\u057e\u0565\u056c` |
| Anna Saroyan | `\u0531\u0576\u0576\u0561 \u054d\u0561\u0580\u0578\u0575\u0561\u0576` |
| Yerkir Nairi | `\u0535\u0580\u056f\u056b\u0580 \u0546\u0561\u056b\u0580\u056b` |
| Khorhrdavor Miandznuhi | `\u053d\u0578\u0580\u0570\u0580\u0564\u0561\u057e\u0578\u0580 \u0544\u056b\u0561\u0576\u0571\u0576\u0578\u0582\u0570\u056b` |
| Adana's Wounds and Orphans | `\u0531\u0564\u0561\u0576\u0561\u0575\u056b \u054e\u0565\u0580\u0584\u0565\u0580\u0576 \u0578\u0582 \u0548\u0580\u0562\u0565\u0580\u0568` |

## Next Steps

1. **Re-seed the database** (if Armenian texts are in production):
   ```bash
   pnpm tsx scripts/seed-db.ts
   ```

2. **Verify website display**: Check that Armenian text displays correctly on the live website.

3. **Update documentation** (optional): Manually fix the Armenian text in documentation files if needed.

## Technical Notes

- Armenian Unicode range: U+0530-U+058F (Armenian Capital Letters) and U+0561-U+0587 (Armenian Small Letters)
- Raw source files in `data/raw/` are correct and should NOT be modified
- Always use Unicode codepoints (e.g., `chr(0x0531)` in Python or `\u0531` in JavaScript) when programmatically constructing Armenian text to avoid display/encoding issues
- The corruption pattern "delays" may have originated from some text substitution process that replaced Armenian characters with this English word

## Verification

After fixes, the following verification was performed:
- `grep -rn "delays" scripts/*.ts src/**/*.ts` returns only legitimate uses (retry delays in translate-batch.ts)
- `grep -c "delays" data/processed/*/*.json | grep -v ":0$"` returns no results
- Processing scripts run successfully and generate correct Armenian titles

## Fix Implementation

The fixes were implemented using Python with Unicode codepoints to ensure correct character encoding:

```python
# Example: Building correct Armenian text
hayeren = chr(0x0540) + chr(0x0561) + chr(0x0575) + chr(0x0565) + chr(0x0580) + chr(0x0565) + chr(0x0576)
# Result: Հdelays (Hayeren = Armenian)
```

This approach avoids any potential corruption from copy-pasting Armenian text directly.
