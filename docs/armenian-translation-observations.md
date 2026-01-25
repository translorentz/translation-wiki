# Armenian Translation Observations

## Date: 2026-01-24
## Session: 19

---

## Overview

This document details the workflow and observations for adding Armenian language support to the translation wiki, including sample translation testing and API comparison.

---

## Source Texts Identified

Three Armenian texts were provided in `data/raw/`:

| Folder | Title | Author | Type | Files | Est. Size |
|--------|-------|--------|------|-------|-----------|
| `kaitser` | Կdelays (The Sparks) | Raffi (Hakob Melik-Hakobian) | Autobiographical novel | 76 vol files | ~1.5 MB |
| `anna_saroyan` | Delays Սdelay | Perch Proshyan | Epistolary novel | 1 file | ~175 KB |
| `arshagouhi_teotig` | Մdelay Պdelay | Arshagouhi Teotig | Travel memoir | 1 file | ~393 KB |

### Text Characteristics
- **Period**: 19th and early 20th century Armenian literature
- **Script**: Armenian alphabet (Հայերdelays)
- **Language register**: Literary Armenian (գdelays)
- **Themes**: National identity, family, social critique, historical events (massacres, displacement)

---

## Infrastructure Setup

### 1. Language Added to Database
```sql
INSERT INTO languages (code, name, display_name)
VALUES ('hy', 'Armenian', 'Հделay');
```
- Language ID: 7
- Project: bitter-tooth-04461121 (Neon PostgreSQL)

### 2. Translation Script Created
- **File**: `scripts/translate-armenian.ts`
- **Based on**: `scripts/translate-tamil.ts` (Gemini pattern)
- **Model**: gemini-2.5-flash
- **Temperature**: 0.3
- **Batch size**: 4000 characters

### 3. Translation Prompt Added
Location: `src/server/translation/prompts.ts`

```typescript
hy: `You are translating 19th and early 20th century Armenian literature to English.
Guidelines:
- This is classical/literary Armenian from the Armenian literary renaissance period
- Preserve the emotional depth and literary style characteristic of this era
- Armenian literature of this period often deals with national identity, social critique, and the Armenian experience
- Proper names should be transliterated (e.g., Մdelays → Mariam, Հayastan)
- Armenian uses unique punctuation: «» for quotes, ։ for period
- Maintain the narrative voice - whether first-person memoir, epistolary, or third-person
- Some texts may reference historical events (massacres, displacement) - translate with appropriate gravity
- Preserve metaphors and imagery that are central to Armenian literary tradition`,
```

### 4. Website Integration
- Font mapping added to `ParagraphPair.tsx`: `hy: "font-serif"`
- Language will appear in sidebar when texts are seeded
- Search filters will include Armenian when texts exist

---

## Sample Translation Test

### Test Parameters
- **Source**: `data/raw/kaitser/Vol1_001_Ա.txt`
- **Chapter**: 1 ( Delays - "Family")
- **Original size**: 25,966 bytes (14,286 characters)
- **Content**: Autobiographical memoir of childhood, family, and hardship under Persian rule

### Translation Results

| Metric | Value |
|--------|-------|
| Translation size | 15,495 bytes |
| Word count | 2,811 words |
| Lines | 73 |
| Model used | DeepSeek V3 |
| Temperature | 0.3 |

### Output Files
- `data/armenian-sample-review/kaitser-ch1-original.txt`
- `data/armenian-sample-review/kaitser-ch1-translation.txt`
- `data/armenian-sample-review/translation-info.md`

---

## Critical Finding: API Content Filtering

### Gemini 2.5 Flash - BLOCKED

The Gemini API rejected the kaitser chapter with error:
```
PROHIBITED_CONTENT
```

**Reason**: The text contains sensitive historical content:
- Descriptions of tax collectors (ֆdelays) torturing peasants
- Physical abuse and beating scenes
- Threats of selling children to harems
- Extreme poverty and suffering
- Historical oppression themes

This is authentic 19th-century Armenian literature depicting the harsh realities of life under Persian rule. The content is historically significant, not gratuitously violent.

### DeepSeek V3 - SUCCESS

DeepSeek translated the full chapter without content filtering issues:
- All sensitive historical content preserved
- Proper names correctly transliterated
- Narrative voice and tone maintained
- Literary quality acceptable

---

## Recommendation: Translation API Choice

| Criterion | Gemini 2.5 Flash | DeepSeek V3 |
|-----------|------------------|-------------|
| Content filtering | Aggressive (blocks historical violence) | Permissive |
| Armenian quality | Unknown (blocked) | Good |
| Cost | Lower | Higher |
| Speed | Faster | Moderate |

**Recommendation**: Use **DeepSeek V3** for Armenian texts.

The Armenian literary corpus contains significant historical content about massacres (1909 Adana, 1915 Genocide), persecution, and social suffering. Gemini's content filters make it unsuitable for this genre.

### Alternative Workflow

If Gemini is preferred for cost/speed:
1. Try Gemini first
2. If blocked, fall back to DeepSeek
3. Log which chapters required fallback

---

## Proposed Workflow for Armenian Texts

### Phase 1: Processing
1. Create processing scripts for each text:
   - `scripts/process-kaitser.ts` (76 volumes → chapters)
   - `scripts/process-anna-saroyan.ts` (letters → chapters)
   - `scripts/process-arshagouhi-teotig.ts` (sections → chapters)

2. Output to `data/processed/<slug>/chapter-NNN.json`

### Phase 2: Seeding
1. Add author entries to `scripts/seed-db.ts`:
   - Raffi (Hakob Melik-Hakobian)
   - Perch Proshyan
   - Arshagouhi Teotig

2. Add text entries with:
   - Language: `hy`
   - Text type: `prose`
   - Appropriate descriptions

3. Run `pnpm tsx scripts/seed-db.ts`

### Phase 3: Translation
1. Modify `scripts/translate-armenian.ts` to use DeepSeek instead of Gemini
   OR create `scripts/translate-armenian-deepseek.ts`
2. Run translation workers in parallel
3. Monitor for any additional content filtering issues

### Phase 4: Quality Review
1. Sample review after first 10 chapters
2. Adjust prompt if needed
3. Full translation run

---

## Open Questions

1. **Should we create a DeepSeek-based Armenian translator?**
   - The Gemini-based script exists but may be unusable due to content filtering
   - DeepSeek already works for other languages

2. **Chapter structure for kaitser?**
   - 76 volume files organized by Armenian letters
   - Each file is ~15-35 KB
   - Need to decide: one chapter per file, or split further?

3. **Priority order?**
   - Suggested: kaitser first (largest, most significant)
   - Then anna_saroyan (epistolary format is interesting)
   - Finally arshagouhi_teotig (historical memoir of 1909 massacre)

---

## Files Created This Session

| File | Purpose |
|------|---------|
| `scripts/translate-armenian.ts` | **DeepSeek-based** Armenian translator (updated Session 20 — Gemini blocked content) |
| `src/server/translation/prompts.ts` (modified) | Added Armenian prompt |
| `scripts/seed-db.ts` (modified) | Added Armenian language |
| `src/components/interlinear/ParagraphPair.tsx` (modified) | Added Armenian font |
| `data/armenian-sample-review/` | Sample translation output + quality review |
| `docs/armenian-translation-observations.md` | This document |

---

## Next Steps

1. ~~Review agent evaluates sample translation quality~~ DONE (Grade A-, DeepSeek approved)
2. ~~Decide on API~~ DONE → DeepSeek V3 (Gemini blocked due to historical content)
3. ~~Create processing scripts for all three texts~~ IN PROGRESS — 4 agents launched
4. ~~Full translation pipeline~~ IN PROGRESS

## Active Translation Agents (Session 20)

| Agent | Text | Author | Chapters | Status |
|-------|------|--------|----------|--------|
| a9cd5db | Kaitser | Raffi | 1-38 | Processing + translating |
| a0a5d32 | Kaitser | Raffi | 39-76 | Processing + translating |
| a85a667 | Anna Saroyan | Perch Proshyan | All | Processing + translating |
| a1babe9 | Arshagouhi Teotig memoir | Arshagouhi Teotig | All | Processing + translating |

**Workflow per agent:**
1. Examine raw text files for structure and encoding
2. Create processing script (`scripts/process-<name>.ts`)
3. Add author and text entries to `seed-db.ts`
4. Process chapters → seed to database → translate with `translate-armenian.ts`
5. Document in `docs/armenian-<name>-processing.md`

**Documentation produced by agents:**
- `docs/armenian-kaitser-processing.md`
- `docs/armenian-anna-saroyan-processing.md`
- `docs/armenian-arshagouhi-teotig-processing.md`

---

*Last updated: 2026-01-25, Session 20*
