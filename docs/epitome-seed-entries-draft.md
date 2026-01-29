# Draft Seed Entries for Epitome of Histories

These entries should be added to `scripts/seed-db.ts` when ready to seed the text.

## Author Entry

Add to the `AUTHORS` array:

```typescript
{
  name: "John Zonaras",
  nameOriginalScript: "Ἰωάννης Ζωναρᾶς",
  slug: "john-zonaras",
  era: "Byzantine Empire (fl. c. 1100–1150)",
  description:
    "Byzantine chronicler and canonist who served as Megas Droungarios tes Viglas (Commander of the Watch) and Protoasecretis (Chief Secretary) under Emperor Alexios I Komnenos. After retiring to a monastery, he composed the Epitome Historiarum, a world chronicle from creation to 1118 CE.",
},
```

## Text Entry

Add to the `TEXTS` array:

```typescript
{
  title: "Epitome of Histories (Epitome Historiarum)",
  titleOriginalScript: "Ἐπιτομὴ ἱστοριῶν",
  slug: "epitome-historiarum",
  languageCode: "grc",
  authorSlug: "john-zonaras",
  description:
    "A Byzantine world chronicle covering biblical history, ancient history, and Roman/Byzantine imperial history from creation to the death of Emperor Alexios I Komnenos in 1118 CE. The work is particularly valuable for preserving passages from the lost portions of Cassius Dio's Roman History. This edition contains Books 1-6 only (Volume 1 of the Bonn CSHB edition), covering creation through early Roman history.",
  sourceUrl: "https://archive.org/details/bub_gb_OFpFAAAAYAAJ",
  textType: "prose" as const,
  processedDir: "epitome-of-histories",
},
```

## Notes

- **Language:** Greek (grc)
- **Genre:** Chronicle/History
- **Text Type:** Prose
- **Books in this file:** 1-6 (of 18 total)
- **Source:** CSHB Bonn edition (1841), Pinder editor, Hieronymus Wolf translator
- **Total chapters:** 6 (one per book)
- **Total paragraphs:** 2,030
- **Total characters:** ~754,000

## Caveats

1. **Incomplete text:** This is only Volume 1. Volumes 2 and 3 would need to be processed separately.
2. **OCR quality:** The source is an OCR scan with typical Greek diacritics issues.
3. **Mixed content:** Some critical apparatus may still be mixed into the Greek text.
4. **No section numbers:** The processing script treats each book as one chapter. The original has numbered sections within each book.

## Future Improvements

1. Process remaining volumes (Books 7-18)
2. Split books into individual sections/chapters
3. Improve critical apparatus filtering
4. Clean up OCR errors in Greek text
