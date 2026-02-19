# Active Agents & Background Workers

Track all running agents and background workers here. Update when launching or completing agents.

**Last updated:** 2026-02-18, Session 64

---

## CURRENTLY RUNNING

(No agents currently running)

---

## SESSION 64 COMPLETED

### ITALIAN BATCH A — ✅ ALL 3 TEXTS COMPLETE (74 chapters)

| Worker ID | Text | Author | Chapters | Status |
|-----------|------|--------|----------|--------|
| afd5449 | Abrakadabra | Antonio Ghislanzoni | 41/41 | ✅ COMPLETE (ch22 required paragraph splitting) |
| aa672d5 | Farewell (Addio) | Neera | 10/10 | ✅ COMPLETE |
| a6c81ee | A Solitary Soul (Anima sola) | Neera | 23/23 | ✅ COMPLETE |

### ABRAKADABRA CH22 FIX — ✅ COMPLETE
Paragraphs 51 and 53 truncated 3 times in a row (ratio ~0.12). Split both at sentence boundaries (124→126 paras). Retranslation succeeded immediately. Per User directive: splitting is now the FIRST step for all truncation retries.

### ANONYMOUS AUTHOR CONSOLIDATION — ✅ COMPLETE

Merged 5 separate Greek anonymous authors into 1 "Anonymous (Greek)" (id=62, 16 texts).
Created language-specific anonymous authors: Anonymous (Chinese) id=294, Anonymous (Latin) id=295, Anonymous (French) id=296.
Deleted empty "Anonymous (Daoist Canon)" duplicate (id=286).
Updated text-catalogue.ts to match DB.

### ROMAIKE HISTORIA — ✅ 37 BOOKS COMPLETE + ENKOMIA SEPARATED

37/37 books translated. Enkomia (Ἐγκώμια) separated into standalone text (id=542, slug enkomia-gregoras, 1 chapter, 28 paragraphs translated).

### COMPOSITION YEAR DISPLAY — ✅ COMPLETE

16 texts fixed (2 Greek, 12 Italian, 2 Wang Fuzhi). Documentation and scripts updated to make compositionYearDisplay mandatory.

---

## SESSION 62-63 COMPLETED

### ROMAIKE HISTORIA TRANSLATION — 37/38 COMPLETE

**Pre-translation fixes completed:**
- Cross-book boundary fix: 5 boundaries fixed, 5 already correct, 1 acceptable
- Source content reseed: 36/38 chapters updated from fixed JSON files
- 17 stale translations deleted, Elogia translation kept

| Worker ID | Books | Chapters | Status |
|-----------|-------|----------|--------|
| a7fb01a | Books 1-10 | 10 | ✅ COMPLETE — 10/10, 853 paragraphs, zero errors |
| a633ec5 | Books 11-19 | 9 | ✅ COMPLETE — 8/9 (book 12 truncated, fixed by retry agent) |
| a384db8 | Books 20-28 | 9 | ✅ COMPLETE — 8/9 (book 22 truncated, fixed by retry agent) |
| a88ff6b | Books 29-37 | 9 | ✅ COMPLETE — 8/9 (book 30 truncated, retry agent working on it) |

**Summary:** 37/38 books translated. Only book 30 remains (retry agent a1600cc working on it).

### ITALIAN PIPELINE BATCH 2 — 19/22 TEXTS COMPLETE

| Worker ID | Batch | Texts | Status |
|-----------|-------|-------|--------|
| a2b7398 | B | Arabella (35/35) + Demetrio Pianelli (28/28), Cuore infermo (29/29) + Dal vero (36/36) | ✅ COMPLETE — 128/128 |
| aa3ef98 | C | Arrigo il Savio (18/18), In risaia (32/32), Dal tuo al mio (4/4) | ✅ COMPLETE — 54/54 |
| abddd47 | D | Conchiglie (8/8) + Crevalcore (4/4) | ✅ COMPLETE — 12/12 |

**Batch B/C/D total: 194 chapters, 19 texts fully translated.**
**Batch A: 3 texts seeded, translation workers running (see above).**

**Full Italian literature status (22 texts):**

| Text | Author | Chapters | Translated | Status |
|------|--------|----------|------------|--------|
| arrigo-il-savio | Barrili | 18 | 18 | ✅ |
| abrakadabra | Ghislanzoni | 41 | 2 | 🔄 |
| scapigliatura-e-il-6-febbraio | Arrighi | 18 | 18 | ✅ |
| arabella | De Marchi | 35 | 35 | ✅ |
| demetrio-pianelli | De Marchi | 28 | 28 | ✅ |
| ermanno-raeli | De Roberto | 15 | 15 | ✅ |
| dal-tuo-al-mio | Verga | 4 | 4 | ✅ |
| eros-verga | Verga | 50 | 50 | ✅ |
| eva-verga | Verga | 2 | 2 | ✅ |
| il-marito-di-elena | Verga | 16 | 16 | ✅ |
| tigre-reale | Verga | 16 | 16 | ✅ |
| cento-anni | Rovani | 21 | 21 | ✅ |
| la-giovinezza-di-giulio-cesare | Rovani | 41 | 41 | ✅ |
| giacinta-capuana | Capuana | 50 | 50 | ✅ |
| in-risaia | Colombi | 32 | 32 | ✅ |
| cuore-infermo | Serao | 29 | 29 | ✅ |
| dal-vero | Serao | 36 | 36 | ✅ |
| addio-neera | Neera | 10 | 2 | 🔄 |
| anima-sola | Neera | 23 | 1 | 🔄 |
| conchiglie | Neera | 8 | 8 | ✅ |
| crevalcore | Neera | 4 | 4 | ✅ |
| dio-ne-scampi-dagli-orsenigo | Imbriani | 25 | 25 | ✅ |

### CATALOGUE UPDATES — ✅ COMPLETE

Added to `scripts/text-catalogue.ts` (context continuation #12):
- 6 authors: Ghislanzoni, Barrili, Colombi, Verga, Capuana, De Roberto
- 16 texts: 3 new (abrakadabra, addio-neera, anima-sola) + 13 existing DB entries

### LIJI ZHENGYI CH48 — ✅ COMPLETE

60/60 paragraphs translated and aligned. Required 3 paragraph splits and 4 retries.

### ZHOUYI DAXIANG JIE — ✅ COMPLETE

65/65 chapters translated (deepseek-reasoner, zh-zhouyi-daxiang-jie prompt).

### ZHOUYI NEICHUAN FALI — ✅ COMPLETE

25/25 chapters translated with deepseek-reasoner.

### ROMAIKE HISTORIA CLEANING — ✅ COMPLETE

37 books, 3,606 paragraphs across 3 volumes. Dual-agent iterative cleaning pipeline.

### PUBLICATION YEAR DISPLAY — ✅ COMPLETE

### CHINESE DYNASTY DATES — ✅ COMPLETE (a4b40e7)

### CHINESE LANGUAGE SWITCHER — ✅ COMPLETE (NOT PUSHED)

3 commits unpushed: 8f96378, c98d85b, f96b34a

### DESCRIPTION UPDATES — ✅ COMPLETE

### EMPEROR PERSONAL NAME AUDIT — ✅ COMPLETE

---

## SESSION 60 COMPLETED

### CHINESE BATCH 5 — ✅ COMPLETE (~21 texts, ~600+ chapters)
### FRENCH + SERBIAN — ✅ COMPLETE (10 French texts + 1 Serbian)
### CHINESE BATCH 3 — ✅ COMPLETE (6 texts)
### CHINESE BATCH 4 (Emperor Huizong) — ✅ COMPLETE (7 texts)
### TALES GOSH PIPELINE — ✅ COMPLETE (117/117)
### JAPANESE TEXTS — ✅ COMPLETE (3 texts: Awadaguchi 45ch, Shiobara 19ch, Katakiuchi 63ch)
### GAP-FILL AND RETRY AGENTS — ✅ COMPLETE

---

## NOTES
1. Er Jia Gong Ci MUST use deepseek-reasoner (poetry) — User directive
2. Chinese language switcher: 3 commits unpushed to remote
3. Tales Gosh: 117/117 translated, chapter numbers reflect actual fable numbers
4. Romaike Historia: Only book 30 remains. If truncation persists, split paragraph 73 per User directive.
5. Italian batch A: 74 chapters total (41+10+23), 3 workers running.
