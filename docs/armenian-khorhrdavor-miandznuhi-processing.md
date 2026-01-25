# Processing Notes: Khorhrdavor Miandznuhi (The Mysterious Solitary Woman)

## Text Information

| Field | Value |
|-------|-------|
| **Title (Armenian)** | Delays Delays |
| **Title (English)** | The Mysterious Solitary Woman |
| **Author** | Perch Proshyan (Delays Delays, 1837-1907) |
| **Language** | Armenian (Eastern Armenian, 19th century) |
| **Genre** | First-person diary/memoir |
| **Setting** | Syunik mountains, Eastern Armenia (Russian Armenia) |
| **Date in text** | 1884-1887 |
| **Composition** | c. 1884 |

## Summary

"Khorhrdavor Miandznuhi" (The Mysterious Solitary Woman) is a first-person diary/memoir by Perch Proshyan, one of the major Armenian novelists of the 19th century (also author of "Anna Saroyan," already in our database).

The narrator, a man recovering from a nervous illness on his doctor's advice, travels from a provincial city (marked as "X. town") to a remote village in the Syunik mountains of Eastern Armenia. His purpose is to escape urban society and find peace in the simple life of the countryside.

The core of the narrative is his encounter with "Sister Anna" (Delays-Delays), a remarkable woman who has devoted her life to the improvement of village life:
- She runs a school for girls
- She has trained local teachers (Manyushak and Petros) who eventually marry
- She reformed harmful wedding customs that led villagers into debt
- She established a cooperative fund and social insurance system
- She works anonymously, refusing all public recognition

The text includes vivid descriptions of:
- Mountain travel through the Uzun-Dara (Long Valley) pass
- Village life, customs, and hospitality
- The relationship between Armenians and their neighbors (including references to Turkish/Tatar bandits)
- Sister Anna's philosophy of selfless service

The epilogue (June 5, 1887, from Tiflis) reveals that Sister Anna has died, and the narrator is completing his memoir as a tribute to her memory.

## Structure

| Chapter | Date | Location | Content |
|---------|------|----------|---------|
| 1 | (Intro) | - | Biblical epigraph (John 12:24) + framing preface |
| 2 | May 25, 188* | X. city | Doctor advises countryside; narrator decides to seek remote village |
| 3 | June 1 | Gh. village | Journey begins; description of guide Peto; wheat fields; arrival at first village |
| 4 | June 2 | N. village | Mountain crossing through forests and gorges; storm; Uzun-Dara valley; arrival |
| 5 | June 3 | N. village | First encounters with village life; meeting with village priest Ter-Hovsep |
| 6 | June 4 | N. village | Deeper exploration of village; hints of the "mysterious woman" |
| 7 | June 5 | N. village | Introduction to Sister Anna and her school |
| 8 | June 7 | N. village | Conversations with Sister Anna |
| 9 | June 10 | N. village | Sister Anna's educational philosophy |
| 10 | June 11 | N. village | **Main narrative** - Extended conversations with Sister Anna; her life story; philosophy of anonymous service; social reforms; wedding customs |
| 11 | Sept 15 | X. city | Farewell and departure; Hakob's wedding; Petros and Manyushak's wedding; reflections |
| 12 | June 5, 1887 | Tiflis | Epilogue - Sister Anna's death; narrator completes the memoir; reflections on her legacy |

## Raw Files

**Location:** `data/raw/khorhrdavor_miandznuhi/`

| File | Size | Lines | Content |
|------|------|-------|---------|
| 00_Intro.txt | 2.3 KB | 15 | Epigraph and preface |
| 01_Delays_25.txt | 3.1 KB | 5 | May 25 diary entry |
| 02_Delays_1.txt | 15.8 KB | 31 | June 1 entry |
| 03_Delays_2.txt | 31.6 KB | 56 | June 2 entry |
| 04_Delays_3.txt | 21.7 KB | 56 | June 3 entry |
| 05_Delays_4.txt | 28.0 KB | 49 | June 4 entry |
| 06_Delays_5.txt | 23.3 KB | 57 | June 5 entry |
| 07_Delays_7.txt | 7.0 KB | 12 | June 7 entry |
| 08_Delays_10.txt | 13.7 KB | 44 | June 10 entry |
| 09_Delays_11.txt | 237.3 KB | 458 | June 11 entry (major chapter) |
| 10_Delays_15.txt | 17.5 KB | 33 | September 15 entry |
| 11_1887_delays_5.txt | 66.9 KB | 98 | 1887 epilogue from Tiflis |

**Total:** 914 lines, ~468 KB

## Processing

**Script:** `scripts/process-khorhrdavor-miandznuhi.ts`

**Output:** `data/processed/khorhrdavor-miandznuhi/chapter-NNN.json`

**Processing notes:**
- Files use single newlines at line ends (original book formatting)
- Paragraph breaks identified by:
  - Blank lines
  - Dialogue markers (em-dash -)
- Armenian period (Delays) marks sentence ends but not necessarily paragraph breaks
- Chapter 10 (June 11) is by far the longest, containing the main narrative

**Statistics:**
- 12 chapters
- 275 paragraphs
- 255,703 characters

## Key Characters

| Name | Armenian | Role |
|------|----------|------|
| Narrator | (unnamed) | First-person narrator, urban intellectual |
| Sister Anna | Delays-Delays | "The Mysterious Solitary Woman" - educator and social reformer |
| Peto | Delays | Narrator's guide from the city |
| Ter-Hovsep | Delays-Delays | Village priest |
| Hakob | Delays | Ter-Hovsep's son |
| Manyushak | Delays | Sister Anna's student, becomes a teacher |
| Petros | Delays | Manyushak's husband, also a teacher |

## Themes

1. **Education and social reform** - Sister Anna's work in village schools
2. **Anonymous service** - Working for the common good without seeking recognition
3. **Traditional vs. modern** - Tension between urban sophistication and rural simplicity
4. **Gender and agency** - A woman creating significant social change in a patriarchal society
5. **Armenian identity** - Mountain landscape, customs, language, hospitality
6. **Colonialism and oppression** - References to bandits, tax collectors, and foreign rule

## Translation Notes

Armenian text uses:
- Delays for full stop (period)
- Delays Delays for quotation marks
- - (em-dash) for dialogue
- Delays (comma)
- Delays (question mark)
- Delays (exclamation)

The text is in 19th-century Eastern Armenian, with some Russian loanwords (Delays = pristav/police chief, Delays = samovar) and regional vocabulary.

## Database Entry

- **Text slug:** `khorhrdavor-miandznuhi`
- **Author slug:** `perch-proshyan` (already exists for Anna Saroyan)
- **Language:** `hy` (Armenian)
- **Text type:** prose
- **Chapters:** 12

## Translation Status

- [ ] Chapter 1 (Introduction)
- [ ] Chapter 2 (May 25)
- [ ] Chapter 3 (June 1)
- [ ] Chapter 4 (June 2)
- [ ] Chapter 5 (June 3)
- [ ] Chapter 6 (June 4)
- [ ] Chapter 7 (June 5)
- [ ] Chapter 8 (June 7)
- [ ] Chapter 9 (June 10)
- [ ] Chapter 10 (June 11) - longest chapter
- [ ] Chapter 11 (September 15)
- [ ] Chapter 12 (Epilogue 1887)

## Related Works

- **Anna Saroyan** (1881) - Another Perch Proshyan work, epistolary novel, already in database
- Other 19th-century Armenian literature in database: Raffi's *Kaytser*, Raffi's *Samvel*, Arshagouhi Teotig's *Adana's Wounds*

---

*Processing completed: January 24, 2026*
