# Epitome of Histories (Epitome Historiarum) - Language Analysis

## Text Identification

**Title:** Epitome Historiarum / Annales (Epitome of Histories / Annals)
**Author:** John Zonaras (Ioannes Zonaras)
**Date of Composition:** c. 1118-1143 CE (reign of John II Comnenus)
**Genre:** Byzantine world chronicle
**Original Language:** Medieval Greek (Byzantine)

## About the Author

John Zonaras was a 12th-century Byzantine chronicler and canonist. Before becoming a monk, he held important positions at the Byzantine court:
- **Megas Droungarios tes Viglas** (Commander of the Watch) - a high judicial and security position
- **Protoasecretis** (Chief of the Imperial Secretariat)

He served under Emperor Alexios I Komnenos and possibly John II Komnenos. Later in life, he retired to a monastery on an island (possibly Gyaros) where he composed his chronicle and commentary on the canons.

## About the Text

The *Epitome Historiarum* is a universal chronicle covering:
- **Part 1 (Books 1-9):** Biblical history and ancient history (creation to the Roman Republic)
- **Part 2 (Books 10-18):** Roman and Byzantine imperial history (from the Triumvirate to 1118 CE, death of Alexios I)

The complete work consists of **18 books**. The file `epitome.txt` contains **only Volume 1 (Tomus I)** with Books 1-6, covering:
- Book I: Creation and early Biblical history
- Book II: Hebrew kings and prophets
- Book III: Later Jewish history
- Book IV: Greek and early Roman history
- Book V: Roman history (Republic era)
- Book VI: Roman history (late Republic/early Empire)

### Sources
Zonaras drew from numerous earlier historians including:
- Josephus (for Jewish history)
- Cassius Dio (for Roman history - parts now lost are preserved only through Zonaras)
- Various Byzantine chronographers

## Edition Analysis

**Edition:** Corpus Scriptorum Historiae Byzantinae (CSHB), Bonn edition
**Editor:** Mauricius Pinderus (Maurice Pinder)
**Publisher:** Ed. Weber, Bonn
**Year:** 1841 (MDCCCXLI)

### File Contents

The file `epitome.txt` (2.37 MB, 34,466 lines) contains:

1. **Front Matter (Latin):**
   - Title pages
   - Pinderus's preface (PRAEFATIO MAURICII PINDERI)
   - Ducangius's (Du Cange) preface from the 1686 Paris edition
   - Hieronymus Wolf's preface to the 1557 Basel edition

2. **Main Text (Greek + Latin parallel):**
   - Original Greek text by Zonaras
   - Latin translation by Hieronymus Wolf (1557)
   - Critical apparatus (textual variants from manuscripts A, B, C, P, W)
   - Source citations (FONTES sections)

3. **End Matter:**
   - NOTAE (scholarly notes)
   - CORRIGENDA (corrections)

## Language Ratio Analysis

| Language | Characters | Percentage |
|----------|-----------|------------|
| Greek    | 631,387   | 49.7%      |
| Latin    | 638,977   | 50.3%      |
| **Total**| 1,270,364 | 100%       |

The nearly 50/50 split confirms this is a **true parallel bilingual edition**.

## Structure of Each Section

Each chapter/section follows this pattern:
1. **Greek original** (main text)
2. **Critical apparatus** (manuscript variants, e.g., "1 post Θεός PW add δ᾽, om ABG")
3. **FONTES** (source references)
4. **Latin translation** (Wolf's 16th-century version)

Example from Book I, Chapter 1:
```
[Greek]
1, Θεός ἐστι μὲν ἀνενδεὴς φύσις, αὐτὴ ἑαυτῇ αὐτάρχης...

[Critical apparatus]
1 post Θεός PW add δ᾽, om ABG...

[FONTES]
Cap. 1. losephi Antiquit. Iud. 1 1. Genesis 1...

[Latin translation]
1. Deus est natura nullius egens rei, seipsa contenta ad gloriam...
```

## The Latin Translation

The Latin translation was made by **Hieronymus Wolf (Hieronymus Wolfius)** in 1557, commissioned by the wealthy merchant and patron **Anton Fugger** (Antonius Fuggerus). Wolf was a prominent German humanist scholar who also translated other Byzantine historians (Nicephorus Gregoras, Nicetas Choniates).

The Latin is a **scholarly humanist translation**, not an ancient text. It represents 16th-century scholarly Latin and was created specifically to make the Greek Byzantine chronicle accessible to Western European readers who could read Latin but not Greek.

## Recommendation

### Primary Translation Target: **Greek Only**

**Rationale:**

1. **Original Language:** The Greek is Zonaras's original composition. Translating the Greek gives access to the authentic Byzantine text.

2. **Latin is Already a Translation:** Wolf's Latin is a 16th-century translation, not original content. Translating a translation adds a layer of interpretive distance.

3. **Modern Accessibility:** Our goal is to provide English access to pre-modern texts. The Greek original is more valuable for scholars and general readers than a Renaissance Latin rendering.

4. **Historical Value:** Zonaras preserves passages from lost ancient historians (especially Cassius Dio). The Greek text is the scholarly standard.

5. **Consistency:** Other Byzantine texts in the project (De Ceremoniis, Historia Nova, etc.) are translated from Greek.

### Alternative: Keep Both Languages

If we wanted to provide both:
- Create two separate texts: "Epitome of Histories (Greek)" and "Epitome of Histories (Latin)"
- This would allow comparison of Wolf's translation choices
- However, this doubles processing work for limited additional scholarly value

### NOT Recommended: Latin Only

Wolf's Latin translation, while scholarly, is:
- A secondary source (translation of translation)
- Written in 16th-century humanist Latin (not a historical artifact of antiquity)
- Less valuable for studying Byzantine historiography

## Processing Decision

**Extract only the Greek portions** for translation. The processing script should:

1. Remove the Latin prefaces and front matter
2. Extract Greek text from each chapter
3. Remove the critical apparatus (manuscript variants)
4. Remove FONTES (source citations)
5. Remove the Latin translation paragraphs
6. Preserve chapter/section structure

### Challenges

1. **OCR Quality:** The file is an Internet Archive OCR scan with typical errors (especially in Greek diacritics)
2. **Interleaved Structure:** Greek and Latin are interleaved, requiring careful parsing
3. **Critical Apparatus:** Lines like "1 post Θεός PW add δ᾽, om ABG" mix Greek and Latin
4. **Page Headers:** Lines like "ANNALIUM I 1. 19" appear throughout
5. **Volume Incomplete:** Only Books 1-6 of 18 are present

### Future Work

Volume 2 (Books 7-12) and Volume 3 (Books 13-18) would need to be acquired and processed separately to complete the full chronicle.

## Conclusion

The Epitome of Histories is a significant Byzantine chronicle that should be processed and translated from the **original Greek only**. The Latin translation by Hieronymus Wolf, while historically interesting, is a secondary scholarly artifact and should be excluded from the translation pipeline.

---

*Analysis prepared: 2026-01-28*
