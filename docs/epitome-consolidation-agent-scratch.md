# Epitome Consolidation Agent — Scratchpad

## Session 1 (2026-01-28)

### Phase 1: Books 7-18 Comparison
- Compared `epitome-of-histories-clean` vs `epitome-of-histories-clean-v2` (books 7-12): **IDENTICAL** (0 diffs across all 6 books)
- Compared `epitome-of-histories-clean` vs `epitome-of-histories-clean-v3` (books 13-18): **IDENTICAL** (0 diffs across all 6 books)
- Conclusion: The "clean" directory already contains the consolidated best version for books 7-18. Copied directly to final output.

### Phase 2: Books 1-6 Cleaning
Created Python script: `scripts/lib/epitome-consolidation/clean_books_1_6.py`

Approach:
1. **Remove pure apparatus paragraphs** — identified by Greek ratio < 0.3, FONTES headers, Latin scholarly markers (codex, Wolfii, Iosephus, etc.), short+low-Greek paragraphs, `]` variant notation
2. **Clean inline contamination** — wp sigla, page markers (P1263, W HI), Latin terms, bracketed apparatus
3. **Join fragments** — paragraphs starting with lowercase Greek merged with previous
4. **Final filter** — remove any remaining paragraph with Greek ratio < 0.6 or length <= 15

Results:

| Book | Original | Final | Reduction |
|------|----------|-------|-----------|
| 1 | 279 | 135 | 52% |
| 2 | 236 | 132 | 44% |
| 3 | 400 | 203 | 49% |
| 4 | 247 | 120 | 51% |
| 5 | 237 | 124 | 48% |
| 6 | 631 | 276 | 56% |

### Quality Notes
- Books 1-6: All paragraphs have Greek ratio >= 0.60
- Books 7-18: Copied from existing approved clean versions (B+ / A grade)
- Book 11 has 2 paragraphs with ratio < 0.7 (existing contamination from approved version)
- Book 6 has the most paragraphs (276) — it covers a lot of ground (Herod to destruction of Jerusalem)
- Book 3 also larger (203) — covers extensive Biblical/ancient history

### Output
All 18 chapters written to `data/processed/epitome-of-histories-final/chapter-001.json` through `chapter-018.json`.

### Awaiting Review
Submitted for Review Agent assessment.
