# Cent'anni Processing Notes

## Text Information

| Field | Value |
|-------|-------|
| **Title** | Cent'anni (A Hundred Years) |
| **Author** | Giuseppe Rovani (1818-1874) |
| **Language** | Italian |
| **Period** | Published 1857-1858 (serialized in La Gazzetta di Milano), revised edition 1868-1869 |
| **Setting** | Milan (primarily), Venice, Rome, Paris (1750-1850) |
| **Genre** | Historical novel |

## About the Text

"Cent'anni" is a sprawling historical novel spanning 100 years of Italian history, from 1750 to 1850. The narrative is centered on Milan and follows multiple generations of several families through the Enlightenment, the French Revolution, the Napoleonic era, and the early Risorgimento.

The novel is notable for its panoramic scope, rich depictions of 18th-century Milanese society (opera, fashion, the arts), and its structural innovation of using families rather than individuals as protagonists, allowing the narrative to span a century. The framing device involves a nonagenarian named Giocondo Bruni who witnessed events across the entire period.

The work is considered an important precursor to Italian verismo and influenced later Italian novelists. Rovani was part of the Scapigliatura movement in Milan.

## Raw File Information

| Field | Value |
|-------|-------|
| **Source** | Liber Liber / Project Manuzio e-book |
| **Original Edition** | Aldo Garzanti editore, 1975 (I grandi libri collection) |
| **File Location** | `data/raw/la_giovinezza/cento_anni/Cent'anni_djvu.txt` |
| **File Size** | 2.56 MB (2,559,807 characters) |
| **Lines** | 38,641 |

## State of Raw Files

**Quality: Good**

The raw file is a DjVu OCR text extraction, but the quality is quite good:

1. **Clean text**: The Italian text is well-preserved with proper accents and punctuation
2. **Minimal OCR errors**: Very few garbled characters or obvious OCR mistakes
3. **Consistent structure**: LIBRO markers and section divisions are clearly present

**Issues Found and Cleaned:**

1. **Front matter**: Liber Liber/Project Manuzio metadata at the beginning (URLs, contributor names, license info, reliability index) - removed
2. **Page numbers**: Standalone numbers (10, 11, 42, 577, 600, 601, etc.) scattered throughout - removed
3. **OCR artifacts**: Occasional "1" instead of "i" in Italian words (e.g., "1 fanciulli" instead of "i fanciulli") - kept as-is (minor, does not affect readability)
4. **Some Roman numerals**: Occasional OCR errors like "M" or "MI" for page numbers - filtered out

## Chapter/Section Structure

The text is organized as follows:

| Section | Description |
|---------|-------------|
| **Preludio** | Author's preface/introduction defending the novel as a literary form |
| **Libro Primo - Ventesimo** | 20 "Books" (chapters) covering different time periods and themes |

Each Libro contains:
1. **Summary header**: An italicized synopsis listing characters and events covered (preserved with `[Summary: ...]` prefix)
2. **Prose content**: The narrative, sometimes divided by Roman numeral section markers
3. **Roman numeral dividers**: Internal sections marked as II, III, IV, etc. (preserved as `[II]`, `[III]`, etc.)

## Processing Output

| Metric | Value |
|--------|-------|
| **Chapters** | 21 (Preludio + 20 Libros) |
| **Total Paragraphs** | 6,536 |
| **Total Characters** | 2,510,902 |
| **Output Directory** | `data/processed/cento-anni/` |

### Chapter Breakdown

| Chapter | Title | Paragraphs | Characters |
|---------|-------|------------|------------|
| 1 | Prelude (Preludio) | 8 | 12,084 |
| 2 | Book First (Libro Primo) | 361 | 161,659 |
| 3 | Book Second (Libro Secondo) | 375 | 168,912 |
| 4 | Book Third (Libro Terzo) | 249 | 99,774 |
| 5 | Book Fourth (Libro Quarto) | 458 | 165,267 |
| 6 | Book Fifth (Libro Quinto) | 411 | 144,257 |
| 7 | Book Sixth (Libro Sesto) | 87 | 64,147 |
| 8 | Book Seventh (Libro Settimo) | 340 | 123,851 |
| 9 | Book Eighth (Libro Ottavo) | 521 | 170,356 |
| 10 | Book Ninth (Libro Nono) | 301 | 143,742 |
| 11 | Book Tenth (Libro Decimo) | 136 | 69,160 |
| 12 | Book Eleventh (Libro Undecimo) | 522 | 217,709 |
| 13 | Book Twelfth (Libro Duodecimo) | 161 | 102,614 |
| 14 | Book Thirteenth (Libro Decimoterzo) | 382 | 120,229 |
| 15 | Book Fourteenth (Libro Decimoquarto) | 88 | 42,448 |
| 16 | Book Fifteenth (Libro Decimoquinto) | 216 | 87,128 |
| 17 | Book Sixteenth (Libro Decimosesto) | 619 | 146,717 |
| 18 | Book Seventeenth (Libro Decimosettimo) | 254 | 79,788 |
| 19 | Book Eighteenth (Libro Decimottavo) | 309 | 96,156 |
| 20 | Book Nineteenth (Libro Decimonono) | 426 | 195,366 |
| 21 | Book Twentieth (Libro Ventesimo) | 312 | 99,538 |

## Cleanup Decisions

1. **Page numbers removed**: All standalone numbers (1-3 digits) on their own lines were removed
2. **Front matter removed**: All Liber Liber/Project Manuzio metadata was stripped
3. **Section markers preserved**: Roman numeral section dividers (II, III, IV, etc.) within books were preserved as `[II]`, `[III]`, etc. to maintain internal structure
4. **Chapter summaries preserved**: The italic summary paragraphs at the start of each Libro were preserved with a `[Summary: ...]` prefix
5. **Minor OCR artifacts kept**: Small issues like "1" for "i" were not corrected to preserve authenticity of the source

## Title Convention

Following the project standard: **"English Name (Transliteration)"**

- Full title: "A Hundred Years (Cent'anni)"
- Chapter titles: "Book First (Libro Primo)", "Book Second (Libro Secondo)", etc.

## Readiness for Translation

**Status: READY FOR DATABASE SEEDING**

The processed JSON files are complete and properly formatted:
- All 21 chapters processed
- Paragraph indices are sequential and correct
- Text is clean and readable
- Structure preserves the original organization

**Next Steps:**
1. Add author entry for Giuseppe Rovani to `scripts/seed-db.ts`
2. Add text entry with `processedDir: "cento-anni"`
3. Run `pnpm db:seed` to seed the database
4. Run translation using DeepSeek (Italian -> English)

**Translation Notes:**
- Language: Italian (la)
- Estimated translation difficulty: Medium (19th-century literary Italian, some archaic forms)
- Total characters: ~2.5M (large text, will require batch processing)
- Special considerations: Period-appropriate vocabulary for 18th/19th century social customs, opera terms, fashion terminology
