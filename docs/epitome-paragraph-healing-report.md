# Epitome of Histories -- Paragraph Healing Report

**Date:** 2026-01-28
**Text:** Epitome of Histories (Epitome Historiarum) by John Zonaras
**DB slug:** `epitome-historiarum`

## Problem

The source text was OCR'd from a printed edition, and paragraph boundaries were introduced at OCR page breaks rather than logical sentence boundaries. This caused many paragraphs to end mid-sentence, with the next paragraph continuing that sentence. The result was unnatural reading in the interlinear viewer.

## Solution

A Python script (`scripts/lib/epitome-consolidation/heal_paragraphs.py`) was created to detect and merge broken paragraph pairs based on:

1. **Previous paragraph ends without terminal punctuation** (`.`, `;`, `·` in Greek)
2. **Next paragraph starts with lowercase Greek** (including polytonic accented forms)
3. **Very short fragments** (<50 chars) that cannot stand alone
4. **Apparatus/critical notes** that were split across page boundaries
5. **Hyphenated breaks** where a word was split across pages

The script explicitly avoids merging across section boundaries (paragraphs starting with numbered sections like `5.` or `6.`).

## Results

| Chapter | Before | After | Merges |
|---------|--------|-------|--------|
| 1 | 135 | 91 | 44 |
| 2 | 132 | 94 | 38 |
| 3 | 203 | 134 | 69 |
| 4 | 120 | 74 | 46 |
| 5 | 124 | 89 | 35 |
| 6 | 276 | 185 | 91 |
| 7 | 88 | 81 | 7 |
| 8 | 112 | 105 | 7 |
| 9 | 124 | 116 | 8 |
| 10 | 150 | 138 | 12 |
| 11 | 112 | 108 | 4 |
| 12 | 138 | 128 | 10 |
| 13 | 90 | 83 | 7 |
| 14 | 94 | 82 | 12 |
| 15 | 98 | 87 | 11 |
| 16 | 108 | 97 | 11 |
| 17 | 97 | 88 | 9 |
| 18 | 84 | 68 | 16 |
| **TOTAL** | **2285** | **1848** | **437** |

**Overall reduction:** 19.1% fewer paragraphs (437 merges across 18 chapters).

Chapters 1-6 had the most merges (323 of 437, or 74%), suggesting the earlier books in the OCR scan had more aggressive page-break splitting. Chapters 7-18 had fewer breaks, averaging about 9 merges per chapter.

## Files

- **Healing script:** `scripts/lib/epitome-consolidation/heal_paragraphs.py`
- **DB update script:** `scripts/reseed-epitome-healed.ts`
- **Healed JSON files:** `data/processed/epitome-of-histories-final/chapter-*.json`
- **Pre-healing backup:** `data/processed/epitome-of-histories-final-backup/`

## Database

All 18 chapters were updated in the Neon database (project `bitter-tooth-04461121`) using the reseed script. The `sourceContent` JSON field was replaced with the healed paragraph arrays.
