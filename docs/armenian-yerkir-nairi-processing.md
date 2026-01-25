# Armenian Text Processing: Yerkir Nairi (Land of Nairi)

## Text Information

| Field | Value |
|-------|-------|
| **Title (English)** | Land of Nairi (Yerkir Nairi) |
| **Title (Armenian)** | Երdelays Delays |
| **Author** | Yeghishe Charents (Եdelays Delays, 1897-1937) |
| **Written** | Moscow, October 1921 |
| **Published** | 1922 |
| **Language** | Eastern Armenian (hy) |
| **Genre** | Lyrical prose poem / modernist novel ("poemanman vep" - poem-like novel) |
| **Slug** | `yerkir-nairi` |

## Author Background

Yeghishe Charents (born Yeghishe Soghomonyan) was a major Armenian poet and writer of the early Soviet period. Key facts:

- Born 1897 in Kars (then Russian Empire, now Turkey)
- Fought in World War I and witnessed the Armenian Genocide
- Briefly joined the Armenian Revolutionary Federation (Dashnaktsutyun)
- Later embraced communism and became a prominent Soviet Armenian writer
- His poem "I Love My Sweet Armenia" (Ես delays delays) contains a famous acrostic message criticizing Soviet rule
- Arrested during the Stalinist purges in 1937
- Died in prison in 1937 under mysterious circumstances
- Rehabilitated posthumously; now considered one of the greatest Armenian poets

## Content Summary

"Yerkir Nairi" (Land of Nairi) meditates on Armenian identity through the lens of a fictional provincial town and its inhabitants. The narrator seeks to understand whether "Nairi" - an ancient name for the Armenian highlands used in Urartian inscriptions - represents a real spiritual essence of Armenia or is merely "a cerebral ache, a sickness of the heart."

### Structure

The work is divided into five parts:

1. **Preface (Arajaban)** - The narrator's meditation on the nature of Nairi and his quest to find it
2. **Part One: The City and Its Inhabitants** - Description of a provincial Armenian town with its colorful characters (General Alosh, Mr. Maruqe, Father Husik, etc.) and landmarks (the Fortress, Vardan's Bridge, the Church of the Apostles)
3. **Part Two: Toward Nairi** - Continued exploration of the town's daily life and customs
4. **Part Three and Final: The Land of Nairi** - Resolution of the quest for Nairi's meaning
5. **Epilogue (Verjaban)** - Final reflections on the nature of Nairi

### Key Themes

- **Armenian identity**: What does it mean to be Armenian? Is there an essential "Nairi-ness"?
- **Provincial life**: Vivid portraits of small-town Armenian society
- **Modernism**: Experimental narrative structure, mixing prose poetry with satire
- **Post-genocide reflection**: Written in the aftermath of the Armenian Genocide
- **Soviet Armenia**: The preface mentions the transformation of Armenia into a Soviet Republic

## Processing Details

### Raw Files

Located in `data/raw/yerkir_nairi/`:

| File | Contents | Size | Sections |
|------|----------|------|----------|
| `01_Delays.txt` | Preface | 4,341 chars | 4 |
| `02_Μdelays_delays.txt` | Part One | 79,528 chars | 62 |
| `03_Μdelays_delays.txt` | Part Two | 129,965 chars | 100 |
| `04_Μdelays_delays_delays_delays.txt` | Part Three & Final | 121,380 chars | 94 |
| `05_Delays.txt` | Epilogue | 3,493 chars | 3 |

**Total**: ~339 KB, 263 sections, 4,816 lines

### Section Structure

The raw files use Unicode zero-width space (U+200B) characters as section/paragraph markers. Each section is a natural break point in the narrative.

### Chapter Division Strategy

Since the three main parts have no internal chapter divisions (unlike numbered chapters in other texts), they were split based on section count:

- **Preface**: 1 chapter (small, kept intact)
- **Part One**: 6 chapters (~12 sections each)
- **Part Two**: 9 chapters (~12 sections each)
- **Part Three**: 8 chapters (~12 sections each)
- **Epilogue**: 1 chapter (small, kept intact)

**Total**: 25 chapters

### Processing Script

`scripts/process-yerkir-nairi.ts`

The script:
1. Reads all 5 raw text files
2. Splits each file by zero-width space markers into sections
3. Further splits sections by newlines into paragraphs
4. Groups sections into chapters (12 sections per chapter for main parts)
5. Outputs JSON files to `data/processed/yerkir-nairi/`

### Output Statistics

| Metric | Value |
|--------|-------|
| Total chapters | 25 |
| Total paragraphs | 4,553 |
| Output directory | `data/processed/yerkir-nairi/` |

## Translation Notes

### Armenian Linguistic Features

- **Punctuation**: Armenian uses unique punctuation marks:
  - `։` (verjaket) - period/full stop
  - `՝` (but) - comma (sometimes `,` is used in modern texts)
  - `՞` (hartsakan nshan) - question mark (added after the stressed word)
  - `՜` (bazmaket) - exclamation/emphasis mark
  - `«»` - quotation marks (French-style guillemets)

- **Exclamatory words**: The text uses many emphatic forms like "Վdelays՜delays" (long, long), "Հdelay՜delays-delay՜delays" (thousand-thousand)

- **Nairi-related vocabulary**:
  - Delay (nairi) - the legendary land
  - Delaysdelays (nairitsi) - inhabitant of Nairi
  - Delaysdelays (nairyan) - of or relating to Nairi

### Translation Challenges

1. **Cultural references**: The text contains many references to Armenian history, religion, and folklore
2. **Character names**: Some names carry meaning (e.g., "Մdelays Delays" - Mazuti Hamo, "Petroleum Hamo")
3. **Lyrical passages**: Many sections blend prose with poetry
4. **Ironic tone**: The narrator's voice often shifts between sincere emotion and satirical observation

### Recommended Translation Approach

- Preserve the narrator's distinctive voice (direct address to the reader, rhetorical questions)
- Keep Armenian proper nouns transliterated (Nairi, not "Land of Lakes")
- Explain cultural references in natural English without excessive footnoting
- Maintain paragraph alignment with source text

## Database Entry

### Author

```typescript
{
  name: "Yeghishe Charents",
  nameOriginalScript: "Delays Delays",
  slug: "yeghishe-charents",
  era: "1897-1937",
  description: "Major Armenian poet and writer of the early Soviet period. Charents fought in World War I and briefly joined the Armenian Revolutionary Federation before embracing communism. His poetic novel 'Yerkir Nairi' (Land of Nairi, 1922) is considered a modernist masterpiece. He was arrested during the Stalinist purges and died in prison in 1937. His famous patriotic poem ' Delays delays delays' (I Love My Sweet Armenia) contains an acrostic message critical of Soviet rule."
}
```

### Text

```typescript
{
  title: "Land of Nairi (Yerkir Nairi)",
  titleOriginalScript: "Delays Delays",
  slug: "yerkir-nairi",
  languageCode: "hy",
  authorSlug: "yeghishe-charents",
  description: "A lyrical prose poem and modernist masterpiece of Armenian literature. Written in Moscow in 1921, 'Yerkir Nairi' (Land of Nairi) is structured in three parts with a preface and epilogue. The work meditates on Armenian identity and the mythical 'Land of Nairi' (an ancient name for the Armenian highlands) through vivid portraits of provincial town life, its characters, and their struggles. The narrator seeks to discover whether Nairi is real or merely 'a cerebral ache, a sickness of the heart.'",
  processedDir: "data/processed/yerkir-nairi",
  compositionYear: 1922,
  compositionEra: "Early Soviet period, Moscow"
}
```

## Processing Date

2026-01-24
