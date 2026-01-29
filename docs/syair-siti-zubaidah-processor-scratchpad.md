# Syair Siti Zubaidah — Processor Scratchpad

**Agent**: Processor
**Started**: 2026-01-28

## Analysis Summary

### Text Structure
- Lines 1-246: Modern Indonesian intro + summary (STRIP)
- Lines 247-248: "TRANSLITERASI" / "SYAIR SITI ZUBAIDAH" header (STRIP)
- Lines 249-12443: Syair poetry (KEEP)
- Lines 12444-12454: Bibliography (STRIP)
- Lines 324-328: Library stamp OCR artifact (STRIP)

### Formatting Styles Observed
1. **Dense format** (e.g., lines 249-268, 320-346, 3000-3060): 4 consecutive lines per quatrain, separated by blank lines or page numbers
2. **Spaced format** (e.g., lines 272-318, 6000-6060): Each verse line followed by a blank line

### Page Numbers
- Standalone lines with just digits (e.g., `9`, `10`, `12`, `87`, `88`, `179`, `180`, `272`, `273`)
- Range: 9 to ~380
- Appear throughout the text on their own lines

### Inline Stanza Numbers
- Pattern: `NNN\t` at start of line (e.g., `111 \t`, `1241 \t`)
- Pattern: `/N/\t` markers
- Must be stripped, leaving the verse text

### OCR Errors Catalog
| Pattern | Fix | Example |
|---------|-----|---------|
| `!` in word context | `l` or `i` | `sambi!` → `sambil`, `dapa!` → `dapat` |
| `I` before lowercase | `l` | `Ialu` → `lalu`, `Iaki` → `laki` |
| `1a` at word start | `la` | numeral one for letter l |
| `9i` | `di` | digit 9 for letter d |
| `+` in word | `t` | `mu+stika` → `mustika` |
| Trailing noise | strip | `,-________ _ _ -,` at line end |
| Merged words | split where possible | `Rrunainyatidaklagiterperi` |

## Processing Progress
- [x] Script written (`scripts/process-syair-siti-zubaidah.py`)
- [x] Script executed (2,637 quatrains, 19 chapters)
- [x] Output validated (0 issues in automated check)
- [x] Self-check complete (all 2,637 quatrains have 4 lines, no leaked content)
- [x] Report written to collaboration doc

## Round 2 — 2026-01-28

### Fixes Applied
All 5 required + 2 nice-to-have from Reviewer report.

Key changes to `process-syair-siti-zubaidah.py`:
- `is_page_number()`: Roman numerals + OCR-garbled short lines with digits
- `strip_inline_stanza_number()`: `/N/` without tab, `!N!` markers, `II NNN` volume refs, `/NNN/` mid-line refs, tab->space
- `ocr_fix()`: `tidal<`->`tidak`, broader `!`->letter fixes, tab stripping

Results: 370 page nums removed (was 361), 10,539 content lines, 2,634 full quatrains + 1 trailing 3-line fragment. All automated checks pass: 0 tabs, 0 leaked page numbers, 0 markers, 0 volume refs, 0 tidal<, 0 bang artifacts.

## PROCESSOR STATUS: ROUND 2 COMPLETE — AWAITING REVIEWER
