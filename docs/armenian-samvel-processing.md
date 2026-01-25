# Raffi's Samvel - Processing Documentation

## Text Overview

- **Title**: Samvel
- **Original Title**: Սdelays
- **Author**: Raffi (Hakob Melik-Hakobian, 1835-1888)
- **Language**: Armenian (hy)
- **Published**: 1886
- **Genre**: Historical novel

## Historical Context

### 4th-Century Armenia

*Samvel* is set during one of the most turbulent periods in Armenian history — the 4th century CE, when Armenia was caught between the Roman/Byzantine Empire in the west and the Sasanian Persian Empire in the east.

Key historical elements depicted in the novel:

1. **Christianity vs. Zoroastrianism**: Armenia adopted Christianity as the state religion in 301 CE (traditionally attributed to Gregory the Illuminator). The Sasanian Persians, who followed Zoroastrianism, saw Armenian Christianity as a threat to their control and repeatedly attempted to force Zoroastrian conversion on the Armenian nobility.

2. **Nerses the Great (Catholicos 353-373)**: A central figure in the novel, Saint Nerses was the Catholicos (head of the Armenian Church) who presided over the Council of Ashtishat and is revered for his reforms. He was exiled multiple times due to conflicts with Armenian kings and Persian authorities.

3. **The Mamikonian Family**: One of the most powerful Armenian nakharar (noble) families, the Mamikonians were hereditary sparapets (commanders-in-chief) of the Armenian army. They played a central role in Armenian resistance to Persia.

4. **Shapuh II (309-379)**: The powerful Sasanian king who conducted multiple campaigns against Armenia and the Roman Empire. His long reign saw constant pressure on Armenia to abandon Christianity.

### Novel's Significance

Raffi wrote *Samvel* during the late 19th century when Armenia was divided between the Russian and Ottoman Empires. The novel served as an allegory for contemporary Armenian struggles:

- The conflict between Armenian national identity and foreign domination
- The tension between those who collaborated with foreign powers and those who resisted
- The role of the Armenian Church as a preserver of national identity
- The tragic consequences of internal division among Armenian nobles

The novel helped shape Armenian national consciousness during a period of nascent nationalism and remains a classic of Armenian literature alongside Raffi's other historical novels *Khent* (The Fool) and *Davit Bek*.

## Text Statistics

| Metric | Count |
|--------|-------|
| Total Chapters | 41 |
| Total Paragraphs | 4,138 |
| Total Characters | 946,703 |
| Average Paragraphs/Chapter | 101 |
| Average Characters/Chapter | 23,090 |

### By Book

| Book | Chapters | Paragraphs | Characters |
|------|----------|------------|------------|
| Book 1 | 21 (Ch 1-21) | 1,540 | 337,757 |
| Book 2 | 14 (Ch 22-35) | 1,702 | 387,424 |
| Book 3 | 6 (Ch 36-41) | 896 | 221,522 |

## File Structure

### Raw Files
- Location: `data/raw/samvel/`
- Format: `Book{1,2,3}_NNN_[Armenian numeral].txt`
- 41 chapter files total

### Processed Files
- Location: `data/processed/samvel/`
- Format: `chapter-NNN.json`
- 41 JSON files (chapter-1.json through chapter-41.json)

## Book Structure

### Book 1 (Chapters 1-21)
Introduces the main characters and setting:
- **Two Messengers (Ch 1)**: Opens with two riders crossing the Mush plain at night
- **Morning in Taron (Ch 2)**: Establishes the setting in the Taron region
- Develops the conflict between the Mamikonian family and Persian authorities
- Introduces Samvel, his mother Tachatuhi, and his stepmother Ormizduxt (sister of Shapuh)
- Depicts the monastery of Ashtishat and Catholicos Nerses the Great

### Book 2 (Chapters 22-35)
Escalation of conflict:
- **East and West (Ch 22)**: Parallel storylines showing Nerses on Patmos and events in Armenia
- The siege of Artagers fortress
- Political intrigues and shifting allegiances
- The figure of Mušegh "Khotornak" (the Crooked)

### Book 3 (Chapters 36-41)
Climax and resolution:
- **Morning on the Ararat Plain (Ch 36)**: The story reaches the heartland of Armenia
- Tragic confrontations and resolutions
- Samvel's ultimate choice between family loyalty and national duty

## Key Characters

1. **Samvel Mamikonian**: The protagonist, a young Armenian prince caught between his father's collaboration with Persia and his own patriotic convictions

2. **Vahan Mamikonian**: Samvel's father, who has allied with the Persian king Shapuh II

3. **Tachatuhi (Tadjadukht)**: Samvel's mother, of the Artsruni noble family

4. **Ormizduxt**: Samvel's stepmother, sister of the Persian king Shapuh II

5. **Nerses the Great (Nerses Metz)**: Catholicos of Armenia, depicted both in exile on Patmos and in Armenia

6. **Sahak Parthev**: Son of Nerses the Great, important figure in the Armenian Church

7. **Meruzan Artsruni**: Samvel's maternal uncle, another collaborator with Persia

8. **Shapuh II (Shapur)**: The Sasanian Persian king (historical figure)

## Processing Script

`scripts/process-samvel.ts`

Key processing steps:
1. Read all `Book{1,2,3}_NNN_*.txt` files from raw directory
2. Extract global chapter number from filename (001-041)
3. Extract book number for title formatting
4. Skip empty lines and separators
5. Extract Armenian numeral and title from first two content lines
6. Treat each subsequent line as a separate paragraph
7. Output structured JSON with `chapterNumber`, `title`, and `sourceContent.paragraphs[]`

Chapter title format: `Book N, [Armenian numeral]. [Armenian title]`

Example: `Book 1, ԺԱ. Խdelays DELAYS` (Book 1, Ch 11. The Stepmother)

## Database Entries

### Author Entry
Raffi was already in the database from the Kaitser processing.

### Text Entry
```typescript
{
  title: "Samvel",
  titleOriginalScript: "Սdelays",
  slug: "samvel",
  languageCode: "hy",
  authorSlug: "raffi",
  description: "A historical novel set in 4th-century Armenia during the struggle against Persian domination...",
  compositionYear: 1886,
  compositionEra: "Late 19th century, Russian Armenia"
}
```

## Translation

Translation is performed using DeepSeek V3 (`deepseek-chat`) via the `translate-armenian.ts` script.

### Why DeepSeek?
Gemini 2.5 Flash blocks 19th-century Armenian literature due to content warnings (PROHIBITED_CONTENT) triggered by historical violence themes. DeepSeek handles this content appropriately.

### Translation Commands
```bash
# Translate all 41 chapters
pnpm tsx scripts/translate-armenian.ts --text samvel --delay 5000

# Or split across multiple workers:
# Worker 1: Chapters 1-14 (Book 1 first part)
pnpm tsx scripts/translate-armenian.ts --text samvel --start 1 --end 14 --delay 5000

# Worker 2: Chapters 15-28 (Book 1 end + Book 2 start)
pnpm tsx scripts/translate-armenian.ts --text samvel --start 15 --end 28 --delay 5000

# Worker 3: Chapters 29-41 (Book 2 end + Book 3)
pnpm tsx scripts/translate-armenian.ts --text samvel --start 29 --end 41 --delay 5000
```

## Notes on Translation Challenges

1. **Religious terminology**: The text contains extensive references to Armenian Christian practices, Church hierarchy, and religious concepts that should be preserved accurately.

2. **Historical titles**: Armenian noble titles (sparapet, nakharar, azat, etc.) should be transliterated with explanatory glosses on first use.

3. **Persian terms**: The novel includes Persian titles and terms from the Sasanian court (zik, karen, marzpan).

4. **Archaic Armenian**: Raffi wrote in 19th-century literary Armenian (Classical Armenian influenced by modern Eastern Armenian), which may include vocabulary and grammatical forms less familiar to modern readers.

5. **Proper names**: Many characters have names in both Armenian and Persian forms; consistency is important.

## Related Texts

- **Kaitser (The Spark)** by Raffi — autobiographical novel, also in the database
- **Khent (The Fool)** by Raffi — another major historical novel (not yet in database)
- **Davit Bek** by Raffi — historical novel about 18th-century Armenian resistance (not yet in database)

## Processing Date
January 24, 2026

## Agent
Processed by Claude Code agent for the Deltoi translation wiki project.
