# Arshagouhi Teotig Processing Documentation

## Text Overview

**Title:** Adana's Wounds and Orphans (Ադdelays delays delays delays)
**Author:** Arshagouhi Teotig (Արdelays Թdelays)
**Language:** Western Armenian
**Date:** 1909-1910 (published 1910)
**Chapters:** 35
**Genre:** Eyewitness memoir / Historical chronicle

## Historical Context

The **1909 Adana massacre** (also known as the Cilicia massacres) occurred in April 1909 in the Adana Vilayet of the Ottoman Empire. Over 20,000 Armenians were killed in a wave of anti-Armenian violence that spread from Adana to surrounding towns including Tarsus, Mersin, and other settlements in Cilicia.

Arshagouhi Teotig, a writer and feminist from Constantinople, traveled to Cilicia in October-November 1909 as part of relief efforts organized by Armenian community organizations. Her memoir documents:

- The devastating aftermath of the massacres
- Encounters with survivors, widows, and orphans
- The state of refugee camps and orphanages
- Relief efforts and their challenges
- Personal observations and emotional responses

## Author Biography

**Arshagouhi Teotig** (1875-1960s) was an Armenian writer, feminist, and social activist. She was the wife of the prominent writer and editor Teotig (Teotoros Lapjinjian, 1873-1928), who compiled the famous "Amenun Taretsuytsy" (Everyone's Almanac).

Arshagouhi was active in Armenian women's organizations in Constantinople and was a member of the Azganuer Hayuhyats Enkerut'yun (Patriotic Armenian Women's Society). Her work documenting the Adana massacres represents one of the few female-authored primary sources for these events.

## Journey Itinerary

The memoir follows a chronological journey from October 14, 1909 to January 5, 1910:

| Location | Dates | Notes |
|----------|-------|-------|
| Constantinople | Oct 14 | Departure by steamship |
| Mersin | Oct 15-17 | Port city, first orphanage visit |
| Adana | Oct 18 - Nov | Main city, extensive documentation |
| Misis | Nov | Ancient city, refugee conditions |
| Hamidie | Nov | Village visit |
| Erzin | Nov | Prisoners and conditions |
| Dortyol | Nov | "Homeland of the Brave" |
| Tarsus | Dec | St. Paul's birthplace |
| Return | Jan 1910 | New Year epilogue |

## File Structure

### Raw Text
- **Location:** `data/raw/arshagouhi_teotig/ArshagouhiTeotig.txt`
- **Size:** 393 KB, 807 lines
- **Encoding:** UTF-8 (Armenian Unicode)

### Processed Output
- **Location:** `data/processed/arshagouhi-teotig/`
- **Files:** 35 chapter JSON files (`chapter-001.json` through `chapter-035.json`)
- **Format:** Standard chapter format with `chapterNumber`, `title`, and `sourceContent.paragraphs`

## Chapter List

| Ch | English Title | Armenian Date | Paragraphs |
|----|---------------|---------------|------------|
| 1 | The Moment of Departure | 14 Hokt. 1909 | 6 |
| 2 | Prayer | - | 4 |
| 3 | The Chained Couple | - | 3 |
| 4 | With the Travelers | - | 4 |
| 5 | Mersin | 16 Hokt. | 11 |
| 6 | Views and Memories | 17 Hokt. | 7 |
| 7 | Adana | 18 Hokt. | 9 |
| 8 | Days of Crying and Hunger | 19 Hokt. | 14 |
| 9 | Saturday Evening | 19 Hokt. | 14 |
| 10 | Widows and Orphans | 22 Hokt. | 41 |
| 11 | Comforting Appearance | 23 Hokt. | 9 |
| 12 | Towards the Government Office | 25 Hokt. | 8 |
| 13 | Among the Sick | 27 Hokt. | 8 |
| 14 | The Saving Refuge | 28 Hokt. | 6 |
| 15 | A Sad Visit | 30 Hokt. | 14 |
| 16 | The Disaster Area in Waters | 2 Noy. | 14 |
| 17 | Opening of the School | 3 Noy. | 8 |
| 18 | Memories | 5 Noy. | 13 |
| 19 | From Present and Past | 7 Noy. | 14 |
| 20 | Wedding Days | 9 Noy. | 11 |
| 21 | Foreign Institutions | 12 Noy. | 10 |
| 22 | In the Photography Studio | 14 Noy. | 28 |
| 23 | Seeing the Picture | 17 Noy. | 15 |
| 24 | Mother's Love | 20 Noy. | 26 |
| 25 | The Sad Editor-in-Chief | 22 Noy. | 10 |
| 26 | The Child of Keavur Koy | 25 Noy. | 41 |
| 27 | A Call | 27 Noy. | 10 |
| 28 | The Holy Father of Hadjin | 30 Noy. | 28 |
| 29 | From Hamukie to Misis | - | 41 |
| 30 | A Night in Hamidie | - | 51 |
| 31 | The Prisoners of Erzin | - | 72 |
| 32 | Towards Dortyol | - | 26 |
| 33 | The Homeland of the Brave | - | 80 |
| 34 | The Apostle's Birthplace (Tarsus) | - | 50 |
| 35 | Epilogue: On the Threshold of the New Year | 5 Hounv. 1910 | 26 |

**Total paragraphs:** 743

## Processing Script

**Script:** `scripts/process-arshagouhi-teotig.ts`

### Text Structure

The raw text has a distinctive structure:
1. Chapter headers in ALL CAPS Armenian (e.g., `DELAYS DELAYS DELAYS`)
2. Optional date line immediately following (e.g., `22 Hokt.`)
3. Content paragraphs - each line is a separate paragraph
4. Section breaks marked by standalone `*` asterisks

### Key Processing Logic

```typescript
// Each non-empty line is a separate paragraph (no blank line separators)
for (let j = contentStartIndex; j < chapterLines.length; j++) {
  const trimmed = chapterLines[j].trim();

  // Skip blank lines, asterisks (section breaks), and footnote markers
  if (trimmed === "" || trimmed === "*" || /^\[\d+\]$/.test(trimmed)) {
    continue;
  }

  paragraphs.push({ index: paragraphIndex, text: trimmed });
  paragraphIndex++;
}
```

### Title Format

Chapter titles combine:
1. Original Armenian title
2. Date (if present)
3. English translation

Example: `DELAYS DELAYS DELAYS (22 Hokt.) — Widows and Orphans`

## Translation

**Translator:** DeepSeek V3 (`deepseek-chat`)
**Script:** `scripts/translate-armenian.ts`

### Language Notes

The text is written in **Western Armenian** (the dialect of Constantinople and the diaspora), not Eastern Armenian (the standard in the Republic of Armenia). Key characteristics:

- Classical orthography (pre-Soviet reform)
- Ottoman-era loanwords and place names
- Early 20th-century literary style
- Emotional, evocative prose typical of Armenian literature

### Translation Challenges

1. **Historical place names:** Ottoman-era names like "Mersin" (now Mersin, Turkey), "Tarsus" (Tarsus), "Adana" (Adana)
2. **Armenian idioms:** Emotional expressions and literary flourishes
3. **Historical context:** References to the massacres, relief organizations, and political situation
4. **Sensitive content:** Descriptions of violence, death, and suffering (note: Gemini blocks this content; DeepSeek handles it appropriately)

## Database Records

**Author:** `arshagouhi-teotig`
**Text slug:** `arshagouhi-teotig`
**Language:** `hy` (Armenian)

## Seeding Commands

```bash
# Process raw text to JSON
pnpm tsx scripts/process-arshagouhi-teotig.ts

# Seed to database
pnpm tsx scripts/seed-db.ts

# Translate
pnpm tsx scripts/translate-armenian.ts --text arshagouhi-teotig --delay 5000
```

## Related Resources

### Primary Sources
- Original Armenian text from digitized archives
- Contemporary newspaper accounts

### Secondary Literature
- Kevorkian, Raymond. *The Armenian Genocide: A Complete History*. I.B. Tauris, 2011.
- Suny, Ronald Grigor. *They Can Live in the Desert but Nowhere Else: A History of the Armenian Genocide*. Princeton University Press, 2015.
- Kaiser, Hilmar. *The Extermination of Armenians in the Diarbekir Region*. Institut fur Diaspora- und Genozidforschung, 2014.

### Digital Resources
- [Armenian Genocide Museum-Institute](https://www.genocide-museum.am/)
- [USC Shoah Foundation Armenian Genocide Collection](https://sfi.usc.edu/)

## Notes

This is one of the few female-authored primary sources for the 1909 Adana massacres. Arshagouhi's perspective as a relief worker provides unique insights into:

- Women's and children's experiences
- Orphanage conditions
- Community solidarity and relief efforts
- The psychological impact of witnessing the aftermath

The text deserves scholarly attention as both a historical document and a work of Armenian literature.
