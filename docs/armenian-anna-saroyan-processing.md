# Anna Saroyan Processing Documentation

## Title and Author Information

**Title**: Anna Saroyan (Աdelays Սdelays)
**Author**: Perch Proshyan (Պdelays Պdelays, 1837-1907)
**Language**: Armenian (hy) - 19th-century literary Armenian
**Genre**: Epistolary novel

Perch Proshyan was an Armenian novelist and educator known for his realistic depictions of Armenian village life. "Anna Saroyan" is his epistolary novel set in Tiflis (Tbilisi) during 1880-1881.

## Text Structure

The novel consists of **23 letters** written by the protagonist Anna Saroyan to her close friend Hripsime. The letters span from September 6, 1880 to October 31, 1881.

### Chapter/Letter Divisions

| Letter | Armenian Numeral | Date | Location |
|--------|-----------------|------|----------|
| 1 | Delays (1) | 6 September 1880 | Tiflis |
| 2 | Delays (2) | 20 September 1880 | Tiflis |
| 3 | Delays (3) | 4 October 1880 | Tiflis |
| 4 | Delays (4) | 11 October 1880 | Tiflis |
| 5 | Delays (5) | 11 October 1880 | Tiflis |
| 6 | Delays (6) | 20 November 1880 | Tiflis |
| 7 | Delays (7) | 7 December 1880 | Tiflis |
| 8 | Delays (8) | 14 December 1880 | Tiflis |
| 9 | Delays (9) | 21 December 1880 | Tiflis |
| 10 | Delays (10) | 2 January 1881 | Tiflis |
| 11 | Delays Delays (11) | 10 February 1881 | Tiflis |
| 12 | Delays Delays (12) | (Very short, no date) | - |
| 13 | Delays Delays (13) | 30 April 1881 | Tiflis |
| 14 | Delays Delays (14) | 25 June 1881 | Tiflis |
| 15 | Delays Delays (15) | 27 July 1881 | Tiflis |
| 16 | Delays Delays (16) | 16 August 1881 | Tiflis |
| 17 | Delays Delays (15)* | 24 August 1881 | Tiflis |
| 18 | Delays Delays (18) | 10 September 1881 | Tiflis |
| 19 | Delays Delays (19) | 15 September 1881 | Tiflis |
| 20 | Delays (20) | 19 September 1881 | Tiflis |
| 21 | Delays Delays (21) | 4 October 1881 | Tiflis |
| 22 | Delays Delays (22) | 18 October 1881 | Tiflis |
| 23 | Delays Delays (24)* | 31 October 1881 | Tiflis |

*Note: The original text has numbering irregularities:
- Letter 17 is marked "Delays Delays" (15) instead of "Delays Delays" (17) - likely a typo
- Letter 23 is marked "Delays Delays" (24) instead of "Delays Delays" (23) - possibly indicating a missing letter 23

## Plot Summary

Anna Saroyan chronicles the tragic decline of a young Armenian woman from Tiflis. The novel opens with Anna writing to her friend Hripsime about vague feelings of melancholy and inner turmoil despite outward prosperity. As the letters progress, the family's situation deteriorates:

1. **Early letters (1-5)**: Anna describes mood swings, ennui, and hints at her father's secretive distress
2. **Middle letters (6-10)**: The family's financial ruin is revealed - her father has accumulated massive gambling debts, suffers a stroke, and goes mad
3. **Brother's death (11-15)**: Her beloved brother Grigor, who was ill, dies. Anna discovers his diary which deeply affects her.
4. **Descent into poverty (16-19)**: The family loses their home, Anna's attempts at work (sewing) end in humiliation
5. **Final letters (20-23)**: Anna becomes increasingly bitter and hopeless, rejecting help from Hripsime
6. **Letter 24**: Anna's suicide note - she has taken poison

## Statistics

- **Letters/Chapters**: 23
- **Total paragraphs**: 317
- **Total characters**: 95,816
- **Average paragraphs per letter**: ~14
- **Longest letter**: Letter 13 (34 paragraphs, ~13,325 chars)
- **Shortest letter**: Letter 20 (3 paragraphs, 44 chars - just "Thank you")

## Processing Details

### Input
- **Raw file**: `data/raw/anna_saroyan/anna_saroyan.txt`
- **File size**: ~175 KB
- **Total lines**: 680

### Output
- **Directory**: `data/processed/anna-saroyan/`
- **Files**: 23 JSON files (`chapter-001.json` through `chapter-023.json`)

### Processing Script
- **Script**: `scripts/process-anna-saroyan.ts`
- **Method**:
  1. Parse Armenian numerals as chapter markers (1-2 uppercase Armenian letters on their own line)
  2. Extract date line following the numeral
  3. Split content by blank lines into paragraphs
  4. Normalize whitespace within paragraphs
  5. Output structured JSON

### Chapter Marker Detection
Armenian numerals use uppercase letters with specific numeric values:
- Delays-Delays (U+0531 to U+0539) = 1-9
- Delays (U+053A) = 10
- Delays (U+053B) = 20
- Compound: Delays Delays = 11 (10+1), Delays Delays = 24 (20+4)

## Translation Status

- **Translation engine**: DeepSeek V3 (deepseek-chat)
- **Script**: `scripts/translate-batch.ts --text anna-saroyan`
- **Status**: IN PROGRESS (started 2026-01-24)
- **Notes**: Initial attempt with `translate-armenian.ts` encountered max_tokens errors; switched to `translate-batch.ts` which works correctly

## Known Issues and Resolutions

1. **Numbering irregularities**: The original text has two letters marked as "15" (Delays Delays) and skips from 22 to 24. These are preserved as-is since they may reflect the original publication.

2. **Zero-width characters**: The raw text contains some Unicode zero-width spaces (U+200B) which are stripped during processing.

3. **Short letters**: Letter 12 and Letter 20 are extremely brief (1-3 paragraphs) reflecting the epistolary style where some letters are mere acknowledgments.

4. **max_tokens error**: The `translate-armenian.ts` script encountered API errors. Used `translate-batch.ts` instead which correctly handles Armenian text via the standard translation pathway.

## Database Entry

Added to `scripts/seed-db.ts`:

```typescript
// Author
{
  name: "Perch Proshyan",
  nameOriginalScript: "Պdelays Պdelays",
  slug: "perch-proshyan",
  era: "1837-1907",
  description: "Armenian novelist and educator known for his realistic depictions of Armenian village life. His epistolary novel Anna Saroyan explores themes of social change, family misfortune, and women's inner lives in 19th-century Tiflis (Tbilisi).",
}

// Text
{
  title: "Anna Saroyan (Աdelays Սdelays)",
  titleOriginalScript: "Delays Delays",
  slug: "anna-saroyan",
  languageCode: "hy",
  authorSlug: "perch-proshyan",
  description: "An epistolary novel in 23 letters written from Tiflis (Tbilisi) between September 1880 and October 1881. Anna Saroyan chronicles a young Armenian woman's descent from comfortable bourgeois life into poverty following her father's gambling debts, paralysis, and madness. The letters reveal her psychological transformation, the death of her beloved brother, and her growing despair culminating in suicide.",
  sourceUrl: "",
  processedDir: "data/processed/anna-saroyan",
  compositionYear: 1881,
  compositionEra: "Late 19th century, Tiflis (Tbilisi)",
}
```

## Character Names

- **Anna Saroyan** (Delays Delays) - The protagonist, letter writer
- **Hripsime** (Delays) - Anna's close friend, letter recipient
- **Gevorg** (Delays) - Anna's father, gambling addict who goes mad
- **Grigor** (Delays) - Anna's favorite brother, romantically inclined, dies of illness
- **Arshak** (Delays) - Anna's eldest brother, works in an office
- **Garegin** (Delays) - Anna's youngest brother, still a student
- **Anna's mother** - Nameless in the letters

## Themes

1. **Social decline**: The fall from bourgeois comfort to poverty
2. **Gambling addiction**: Father's ruin through gambling
3. **Women's education**: Anna's lack of practical skills (can't even sew)
4. **Melancholia/Depression**: Anna's psychological deterioration
5. **Pride and shame**: Anna's refusal to accept help
6. **Death and mortality**: Brother's death, father's madness, Anna's suicide
7. **Friendship**: The deep bond between Anna and Hripsime
8. **19th-century Armenian society**: Life in Tiflis under Russian rule
