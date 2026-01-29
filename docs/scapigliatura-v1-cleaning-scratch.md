# Scapigliatura OCR Cleaning v1 — Scratch Notes

**Date:** 2026-01-29
**Agent:** Cleaning Agent (v1)

---

## What was done

Built a Python cleaning pipeline at `scripts/lib/scapigliatura-cleaning-v1/` with three modules:

1. **patterns.py** — Regex patterns for page numbers, noise detection (line-level and paragraph-level), front matter, chapter headings, margin chars, soft hyphens, footnotes
2. **corrections.py** — Dictionary-based l/t corrections (50+ entries), standalone `clic` -> `che` fix, and pattern-based `-ala`/`-alo` -> `-ata`/`-ato` conversion with Italian word safelist
3. **cleaner.py** — Main pipeline: read raw -> strip front matter -> remove page numbers -> remove noise lines -> remove footnotes -> strip margin chars -> join soft hyphens -> split into chapters -> assemble paragraphs -> apply corrections -> filter noise paragraphs -> output JSON

### Key decisions
- **Duplicate CAPITOLO SEDICESIMO:** Two distinct sections with different subtitles ("Tre rimorsi" at line 12883, "Il sei febbrajo" at line 13248). Treated as chapters 16 and 17 respectively.
- **Noise paragraph detection:** Multi-layer heuristic: alpha ratio < 55%, then for short paragraphs (< 80 chars) check word plausibility using vowel presence, consecutive identical chars, mid-word case changes, and consecutive vowel runs.
- **Pattern-based l/t fix:** Rather than dictionary-only, added regex-based `-ala` -> `-ata` and `-alo` -> `-ato` conversion with a safelist of real Italian words ending in `-ala`/`-alo` (sala, scala, gala, etc.)

---

## Self-Grade: B

### Strengths
- All 18 chapters correctly identified and split (intro + 16 chapters + the second part of ch16)
- 2,039 paragraphs total, all starting with clean Italian text
- Zero remaining `clic`, `stala`, `lulli` instances
- Soft-hyphen joining works well (1,431 instances handled)
- Page numbers, noise lines, margin chars effectively removed
- Pattern-based l/t fix catches words not in the explicit dictionary

### Weaknesses / Known remaining issues
1. **Regular hyphens not joined:** Words split with `-` at line ends (e.g., `imbar-`) are not rejoined. Only `¬` soft hyphens handled.
2. **Some OCR artifacts in mid-paragraph:** Stray characters like `(li-`, `all -1`, `c.` survive within otherwise clean paragraphs
3. **Space-split proper names:** `Crisi ina` instead of `Cristina`, `Emani` instead of `Ernani` — OCR word-boundary errors not addressed
4. **Some l/t false negatives:** Words like `mollo` (should be `molto`) and `potenle` (should be `potente`) where `l` replaces `t` in non-participle positions — not yet handled
5. **Aggressive paragraph filtering:** The 0.8 ratio threshold for short paragraphs may have removed some legitimate short dialogue lines
6. **No Italian dictionary validation:** Corrections are pattern/safelist based, not validated against a real Italian word list

---

## Sample paragraphs (before/after)

### Sample 1: Ch0 para 0 (Introduction opening)
**Before:** `In tutte le grandi e ricche città del mondo incivilito esiste una certa quantità di individui di ambo i sessi, fra i venti e i trentacinque anni, non più; pieni d'in¬ gegno quasi sempre;`
**After:** `In tutte le grandi e ricche città del mondo incivilito esiste una certa quantità di individui di ambo i sessi, fra i venti e i trentacinque anni, non più; pieni d'ingegno quasi sempre;`
**Changes:** Soft-hyphen joined (`d'in¬\ngegno` -> `d'ingegno`)

### Sample 2: Ch0 para 2 (Introduction)
**Before:** `liti; — io l'ho chiamala appunto la Sca¬ pigliatura.`
**After:** `liti; — io l'ho chiamata appunto la Scapigliatura.`
**Changes:** `chiamala` -> `chiamata`, soft-hyphen joined

### Sample 3: Ch0 para 4 (with clic)
**Before:** `clic, come accade anche nei parlili poli¬ tici , clic gli estremi accolgono nel loro`
**After:** `che, come accade anche nei parlili politici , che gli estremi accolgono nel loro`
**Changes:** `clic` -> `che` (2x), soft-hyphen joined

### Sample 4: Ch1 para 7
**Before:** (multi-line with `¬` breaks throughout)
**After:** `ch'ei ne pensasse in cuor suo. Il tabaccaio, quantunque avesse ottenuta la dispensa dalla sovrana degnazione, rispose schietto alle prime due domande:`
**Changes:** Lines joined, clean flowing prose

### Sample 5: Ch5 para 0 (subtitle)
**Before:** `L'amore d' uno scapiglialo.`
**After:** `L'amore d' uno scapigliato.`
**Changes:** `scapiglialo` -> `scapigliato`

### Sample 6: Ch6 para 17
**Before:** `Assolutamente quella donna era stala creala da Dio per entusiasmare il pubblico dal palco scenico`
**After:** `Assolutamente quella donna era stata creata da Dio per entusiasmare il pubblico dal palco scenico`
**Changes:** `stala` -> `stata`, `creala` -> `creata`

### Sample 7: Ch3 para 35
**Before/After:** `il conte Lorenzo era uno di quegli uomini che si compiacciono di sconcertare qualunque testa che non sia della loro levatura.`
**Changes:** None needed — already clean

### Sample 8: Ch8 para 13
**Before/After:** `Belle entrambe, ma cosi diversamente, che chiunque fosse stato messo nell'impegno di Paride, ci avrebbe pensato sopra un bel pezzo.`
**Changes:** None needed — already clean

### Sample 9: Ch2 para 104
**Before/After:** `E dato di nuovo il chiavistello all'uscio, segui i due amici nel suo studio.`
**Changes:** None needed

### Sample 10: Ch13 para 0 (subtitle)
**Before/After:** `Fisonomia conosciuta.`
**Changes:** None needed

---

## Statistics
- **Input:** 14,135 lines
- **Output:** 18 chapters, 2,039 paragraphs
- **Soft hyphens joined:** ~1,431
- **Page numbers removed:** ~212 lines
- **Noise lines removed:** ~191 lines
- **Noise paragraphs filtered:** ~150+ short garbled paragraphs
- **l/t corrections applied:** 50+ dictionary entries + pattern-based `-ala`/`-alo` -> `-ata`/`-ato`
- **clic -> che:** All instances corrected
