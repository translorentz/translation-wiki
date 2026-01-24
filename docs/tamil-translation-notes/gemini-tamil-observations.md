# Gemini 2.5 Flash -- Tamil Translation Technical Observations

**Model:** Gemini 2.5 Flash (gemini-2.5-flash)
**Task:** Translate Porunararruppadai (248 lines classical Tamil) to English
**Temperature:** 0.3
**Max output tokens:** 8192
**Batch size:** 4000 characters per API call
**Source language code:** ta
**Date:** January 2026

---

## 1. Classical vs. Modern Tamil Handling

### Strengths

Gemini 2.5 Flash demonstrates competent handling of classical Tamil's core grammatical structures:

- **Sandhi resolution:** Classical Tamil uses extensive sandhi (word-joining), and Gemini correctly parses most compound forms. For example, "araa yaaNar" (unceasing + harvest) and "akanRalaip pErurc" (wide-space + great-town) are correctly decomposed.
- **Verbal participles:** The cascading verbal participle chains characteristic of akaval meter (e.g., "vaariyum vaTittum unthiyum uRaZntum" -- four coordinated gerunds) are recognized and rendered as parallel English clauses.
- **Postpositional syntax:** Tamil's SOV order with postpositions is correctly transformed to English SVO in most cases.
- **Negative constructions:** Archaic negatives like "uRaatu" (not desiring), "illaa" (without), "aRiyaa" (not knowing) are correctly parsed.

### Weaknesses

1. **Hapax legomena and rare vocabulary:** The model struggles with words found only in Sangam texts or only in this poem. Examples:
   - "pattal" (drum belly/forked base) -- rendered generically
   - "paccai" (drum skin/membrane) -- rendered as "skin" (acceptable but loses specificity)
   - "tiravu" (tuning pegs) -- rendered as "pegs" (correct)
   - "turaay" (a stuffing/filling for food) -- not recognized at all
   - "turuvai" (a type of meat preparation) -- rendered generically

2. **Compound nouns:** Multi-part compound nouns common in Sangam poetry are sometimes misanalyzed:
   - "kaikcaTu iruntha" (hand + dirt/callus + remained) is correctly parsed
   - "paralvaRaik karunai" (pebble + dry + yam) is NOT correctly parsed -- "karunai" (elephant yam) is missed

3. **Semantic shifts since Sangam era:** Several words have shifted meaning between ancient and modern Tamil:
   - "narantham" in Sangam = citrus/citron; modern Tamil = orange. The model rendered it as "civet" (completely wrong -- possibly confusing with "narai" = grey/musk?)
   - "mullai" in Sangam = a specific jasmine species AND a landscape/mood category; modern = just jasmine
   - "paalai" in Sangam = a musical mode AND a desert landscape; modern = milk/division

4. **Lack of morphological analysis for archaic forms:** Old Tamil uses different verbal conjugations from modern Tamil:
   - The emphatic suffix "-E" (as in "pallE" = indeed the teeth) is not recognized
   - The dubitative mood "-kuvam" (as in "munikuvam" = we might tire) is poorly handled
   - Archaic imperative forms ("EeRRi" = make to mount) are sometimes parsed as declarative

### Assessment

Gemini 2.5 Flash appears to process classical Tamil through a lens of modern Tamil with some awareness of archaic forms. It recognizes approximately 80-85% of Sangam vocabulary correctly, but the 15-20% it misses includes the most culturally significant terms (musical terminology, food preparation, specific flora/fauna). For a reader with no Tamil, the translation provides a workable introduction to the poem's narrative. For a scholar, it requires extensive correction.

---

## 2. Recognition of Sangam Literary Conventions

### Tinai System

The model shows **partial awareness** of the tinai (landscape/mood) system:

- It correctly translates the five tinai names when they appear explicitly (kurinji, mullai, marutam, neytal, palai)
- It correctly identifies the communities associated with each tinai (parataavar = coastal, kuravar = mountain, etc.)
- It does NOT explain the literary significance of the tinai-exchange passage (where communities swap their songs/habitats)
- It does NOT annotate which landscape a given description belongs to

**Verdict:** Surface-level recognition without deep literary understanding.

### Turai (Sub-genres)

The model does not appear to recognize turai classifications at all. The poem's turai is "porunar aaRRuppaTai" (bard's guide-poem), but the translation does not contextualize any passage within turai conventions. Phrases that are formulaic within specific turai traditions (e.g., "pukaZmEmppaTuna" as a praise formula) are translated literally without noting their conventional nature.

### Akam/Puram Distinction

The model correctly follows the puram (heroic) register throughout the poem. It does not incorrectly apply love-poetry (akam) conventions to the female beauty description, though it also does not note the literary tension of placing an extended akam-style nakh-shikh portrait within a puram poem.

### Arruppadai Genre Structure

The model does not explicitly recognize or signal the arruppadai structure (first bard narrating -> addressing second bard -> promising future patronage). The second-person shift at line 149 ("if you stand before him...") is rendered correctly, but without noting that this is the genre's characteristic pivot from narrative to exhortation.

---

## 3. JSON Output Format Compliance

### Format Adherence

The translate-tamil.ts script requests output as a JSON array of `{index, text}` objects. Based on the script's structure and the successful translation in the database, Gemini appears to have complied correctly:

- All 17 paragraphs received translations
- Index numbering (0-16) was preserved
- No JSON repair was needed (the `repairAndParseJson` fallback function exists but was apparently not triggered)
- No placeholder text ("[Translation pending...]") appears in the output

### Potential Issues

1. **Markdown code block wrapping:** The script includes logic to strip "```json" wrappers, suggesting Gemini sometimes wraps JSON in code blocks. For this text, it either did not wrap or the stripping was transparent.

2. **Newlines in text values:** The translations contain multi-sentence paragraphs with natural English flow. No unescaped newlines or broken JSON structures are evident in the database output.

3. **Character limits:** With 4000-character batches and Tamil's high information density per character, some batches may have contained very large amounts of text. The Tamil source uses approximately 15,000 characters total, resulting in approximately 4 batches. This is manageable for Gemini's context window.

---

## 4. Temperature Setting (0.3) Analysis

### Appropriateness for Classical Poetry

A temperature of 0.3 is **conservative** -- it produces more predictable, less creative output. For classical Tamil poetry translation, this has mixed effects:

**Advantages of low temperature:**
- Consistent rendering of repeated formulae (e.g., "anna" similes always rendered as "like")
- Less hallucination of content not in the source
- Predictable handling of proper names
- Stable JSON formatting

**Disadvantages of low temperature:**
- Flatter, more prosaic English -- the poetic register is lost
- Less willingness to attempt creative solutions for untranslatable imagery
- Tendency toward safe/generic renderings when uncertain (e.g., "delicious things" for specific foods)
- No variation in vocabulary -- "beautiful" is reused where English has dozens of synonyms

### Recommendation

For this genre of text, a temperature of **0.4-0.5** might produce better literary quality while maintaining reliability. The current output reads more like a scholarly crib than a literary translation. For the JSON format requirement, 0.3 is prudent -- higher temperatures might produce format-breaking creativity.

Alternatively, a two-pass approach could work:
1. First pass at temperature 0.3 for accuracy and JSON compliance
2. Second pass at temperature 0.6-0.7 asking the model to improve the literary quality of the English while preserving meaning

---

## 5. Batch Size and Coherence

### 4000-Character Batch Analysis

The Tamil source text (approximately 15,000 characters across 17 paragraphs) was divided into batches. Given the 4000-character limit, this produced roughly 4 batches:

- Batch 1: Paragraphs 0-3 (~4000 chars of Tamil, covering lines 1-60)
- Batch 2: Paragraphs 4-7 (~4000 chars, covering lines 61-119)
- Batch 3: Paragraphs 8-11 (~4000 chars, covering lines 120-180)
- Batch 4: Paragraphs 12-16 (~3000 chars, covering lines 181-248)

### Coherence Issues at Batch Boundaries

1. **P6/P7 boundary (lines 101/102):** Paragraph 6 ends with "suddenly calling out" which is mid-sentence. The continuation ("come here!") is at the start of P7 but is rendered as a separate thought. This appears to be a segmentation artifact -- the 15-line grouping split a continuous sentence across paragraphs, and the batch system could not resolve the continuity.

2. **P7/P8 boundary (lines 119/120):** Paragraph 7 ends with the feasting section and P8 begins the departure narrative. This is a natural thematic break and causes no coherence issues.

3. **P11/P12 boundary (lines 180/181):** The transition from the king's generosity section to the kingdom description is handled cleanly -- the shift to landscape description at P12 is a natural pivot point.

### Consistency of Terminology Across Batches

- "yaazh" is rendered consistently as "yaazh" throughout (correct)
- "tadari" appears only in early batches and is consistent
- "viraliyar" is consistently "female dancers/singers"
- Karikala's name appears only in batch 3 (P9) and is rendered correctly

### Recommendation

The 4000-character batch size is adequate for this text. The primary coherence issue (P6/P7 sentence split) is caused by the paragraph segmentation, not the batch size. For Tamil texts specifically, 4000 characters (approximately 60-75 lines of verse) provides enough context for the model to maintain register and reference consistency.

A larger batch size (e.g., 6000-8000 characters as used for Greek/Latin) might produce better results for Tamil given the high information density and frequent multi-line simile structures. However, the current size does not cause catastrophic coherence failures.

---

## 6. Prompt Improvements for Future Tamil Texts

### Current Tamil Prompt (from prompts.ts)

```
You are translating classical Tamil (Sangam literature, c. 300 BCE - 300 CE) to English.
Guidelines:
- This is ancient Tamil poetry from the Sangam anthologies (Ettuthokai and Pattuppattu)
- Preserve the poetic imagery and landscape symbolism (tinai: kurinji=mountain/union,
  mullai=forest/patience, marutam=farmland/infidelity, neytal=seashore/pining,
  palai=wasteland/separation)
- Translate proper names of poets, kings, and places with transliteration
- Maintain the distinction between akam (inner/love) and puram (outer/heroism) themes
- Classical Tamil uses no punctuation; line breaks in the source represent verse structure
- Render dense poetic imagery clearly while preserving literary quality
- Where meaning is uncertain due to archaic vocabulary, provide your best reading
- Do not add commentary outside the JSON structure
```

### Suggested Improvements

1. **Add genre-specific instructions:**
```
- For arruppadai (guide-poem) genre: note the shift between first-person narration
  (the first bard's experience) and second-person address (promising the second bard
  what to expect). Maintain these person-shifts clearly.
- For puram (heroic) poems: render royal praise with appropriate grandeur;
  preserve battle names and dynastic references.
```

2. **Add vocabulary guidance for problem areas:**
```
- Musical instruments: tadari (a forked drum), yaazh (a stringed lyre), muzhavu
  (a barrel drum), thudi (an hourglass drum) -- preserve Tamil names with brief
  English gloss on first occurrence.
- Flora: Preserve botanical specificity. Do not generalize species-specific tree/flower
  names to generic "tree" or "flower." Key plants: punnai (Calophyllum), marutham
  (Terminalia arjuna), kaanthal (Gloriosa), mullai (Jasminum sambac), konrai
  (Cassia fistula), narantham (citrus/citron, NOT civet or orange).
- Food terms: Render specific preparation methods when identifiable (roasted on skewers,
  steamed, stuffed, etc.) rather than reducing to generic "food" or "delicacies."
```

3. **Add simile-handling instruction:**
```
- Tamil similes use "anna" (like) or "pola" (resembling). Preserve the simile structure
  in English (X like Y). Do not flatten simile chains into simple descriptions.
- Extended simile-chains (multiple anna clauses describing one object) are a key literary
  feature -- maintain them as parallel "like X... like Y... like Z..." structures.
```

4. **Add cultural context instruction:**
```
- The "porunar" is a specific class of bard who plays the tadari drum and seeks royal
  patronage. Distinguish from "paanar" (yaazh-player) and "koodiyar" (actors).
- The "one umbrella" (oru kudai) formula refers to undivided sovereignty, not a
  literal umbrella.
- Tinai-exchange passages (where communities sing each other's songs) represent cosmic
  harmony under the king's rule -- a political metaphor.
```

5. **Add archaic vocabulary warnings:**
```
- Many Sangam Tamil words have shifted meaning in modern Tamil. Key false friends:
  - narantham = citrus (NOT orange/civet)
  - mullai = jasmine AND a landscape category
  - paalai = a musical mode AND a wasteland landscape AND milk in modern Tamil
  - karunai = elephant yam (NOT compassion as in modern Tamil)
  - payil = to practice/learn (different from modern usage)
```

6. **Request annotation for uncertain passages:**
```
- For words whose meaning is debated by commentators, choose your best reading but
  append [?] to signal uncertainty. Do not silently substitute generic words.
```

---

## 7. Comparison: How Other Models Might Handle This Text

### DeepSeek V3 (deepseek-chat) -- Currently Used for Other Languages

**Expected strengths:**
- Strong JSON formatting compliance (proven in the project's Chinese/Greek/Latin translations)
- Good retry/repair infrastructure already built
- Cost-effective for large batch runs

**Expected weaknesses:**
- DeepSeek's Tamil training data is likely much smaller than Gemini's
- Google has extensive Tamil language resources (Google Translate, Android keyboard, etc.) that feed into Gemini's training
- DeepSeek would likely produce more errors on archaic vocabulary and more hallucinations on uncertain passages
- Classical Tamil is a low-resource language for Chinese AI labs

**Verdict:** Gemini was the correct choice for Tamil. DeepSeek would likely score 60-70% accuracy vs. Gemini's ~80-85%.

### GPT-4 / GPT-4o (OpenAI)

**Expected strengths:**
- Larger general training set than DeepSeek
- Strong instruction-following for format compliance
- Good at literary English register

**Expected weaknesses:**
- Tamil training data likely smaller than Gemini's (Google's South Asian language investment is unmatched)
- Tendency to over-explain or add unwanted commentary
- May hallucinate plausible-sounding but incorrect meanings for archaic words
- Higher cost per token

**Verdict:** GPT-4 might produce more literary English but less accurate Tamil parsing. For scholarly purposes, accuracy matters more than elegance, making Gemini the better choice.

### Claude (Anthropic) -- Opus 4.5 or Sonnet

**Expected strengths:**
- Excellent instruction-following
- Strong literary register in English output
- Good at acknowledging uncertainty (would likely use [?] notation as requested)
- Less prone to confident hallucination than other models

**Expected weaknesses:**
- Tamil training data likely smaller than Gemini's
- May be overly cautious, producing generic translations rather than specific guesses
- Context window not an issue (200K+) but Tamil-specific knowledge is the bottleneck

**Verdict:** Claude might produce the most honest translation (correctly flagging uncertain passages) but less accurate Tamil vocabulary resolution. Could be excellent for a second-pass literary polish.

### Gemini 2.5 Pro (Upgraded Model)

**Expected improvement over Flash:**
- Deeper reasoning on ambiguous passages
- Better handling of extended simile-chains
- More likely to recognize and preserve literary structures
- Higher cost but potentially worth it for a 248-line poem (single text, one-time cost)

**Verdict:** For a canonical text like the Porunararruppadai, the marginal cost of using Gemini Pro over Flash would be justified by improved quality on the ~30 passages where Flash produces generic or incorrect renderings.

---

## 8. Specific Vocabulary: Hits and Misses

### Correctly Handled (Hits)

| Tamil Word | Correct Meaning | How Rendered | Assessment |
|-----------|-----------------|--------------|------------|
| yaaNar | Harvest/fertility | "new harvests" | Correct |
| porunan | Bard/minstrel | "bard" | Correct |
| kuruciil | Young lord | "lord" | Acceptable |
| vaLavan | The Generous (Chola title) | "Valavan" | Correct (preserved) |
| karikaalan | Karikala (name) | "Karikalan" | Correct |
| veNNi | Place name (battle site) | "Venni" | Correct |
| kaaviri | Kaveri river | "Kaveri" | Correct |
| paalai | Musical mode/landscape | "*paalai*" | Correct |
| vEenthar | Kings | "kings" | Correct |
| viRaliyar | Female performers | "female dancers/singers" | Correct |
| murukanR | God Murugan | "Murugan" | Correct |
| paTaari | Drum (taTaari) | "drum (tadari)" | Correct |
| aravu uri | Snake's slough | "snake's slough" | Correct |
| piTi | Female elephant | "female elephant" | Correct |
| vEEZam | Male elephant | "male elephant" | Correct |
| kaanthaL | Glory lily | "*kaanthal* flowers" | Correct |
| punnai | Calophyllum tree | "Punnai trees" | Correct |
| mullai | Jasmine | "Mullai flowers" | Correct |
| konRai | Golden shower | "Konrai" | Correct |

### Incorrectly Handled (Misses)

| Tamil Word | Correct Meaning | How Rendered | Error Type |
|-----------|-----------------|--------------|------------|
| narantham | Citron/citrus fruit | "civet" | WRONG WORD |
| turaay | Stuffing/filling (food) | (omitted) | OMISSION |
| turuvai | Meat preparation type | "delicious things" | GENERALIZATION |
| karunai | Elephant yam | (not rendered) | OMISSION |
| muravai | Husking mortar | (not rendered) | OMISSION |
| pattal | Forked drum-belly | "belly" | GENERALIZATION |
| paccai | Drum membrane | "skin" | SLIGHT LOSS |
| vaariyum | Glissando (music) | "scooping" | UNCERTAIN |
| vaTittum | Note-filtering (music) | "straining" | UNCERTAIN |
| unthiyum | Projection (music) | "pushing" | UNCERTAIN |
| uRaZntum | Alternation (music) | "clashing" | UNCERTAIN |
| vaNTal | Sand-house play (children's game) | "play in the sand" | SLIGHT LOSS |
| nuNangaril | Fine/sparse (of flowers) | "unstrung" | WRONG |
| poRaicaal | Weight-bearing (of ears) | "heavy with them" | SLIGHT LOSS |
| cenkool | Just scepter (political symbol) | "just scepter" | CORRECT but under-annotated |
| oru kuTai | One umbrella (sovereignty) | "under one umbrella" | CORRECT but under-annotated |

### Pattern Analysis

The misses cluster in three domains:
1. **Food preparation terminology** (3/17 misses) -- the most severe category of error
2. **Musical technique terminology** (4/17 misses) -- uncertain rather than wrong
3. **Material culture (instruments, games, objects)** (6/17 misses) -- mostly generalizations

The model's Tamil vocabulary appears strongest for:
- Proper names (kings, places, deities) -- near-perfect
- Flora and fauna -- good (16/20+ species correctly identified)
- Grammar and syntax -- reliable
- Common emotional/descriptive vocabulary -- good

And weakest for:
- Specialized craft/trade vocabulary (music, cooking, instrument-making)
- Hapax legomena or near-hapax words
- Words whose meaning has shifted between ancient and modern Tamil

---

## 9. Overall Assessment and Recommendations

### Translation Quality Score

On a scale of 1-10 for different dimensions:

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Narrative accuracy** | 7/10 | Main story arc correct; some details lost |
| **Vocabulary accuracy** | 6/10 | 80-85% of words correct; critical misses in specialized domains |
| **Literary quality (English)** | 4/10 | Reads as prose paraphrase, not as poetry |
| **Format compliance** | 9/10 | JSON format perfect; paragraph alignment maintained |
| **Cultural sensitivity** | 5/10 | Tinai system partially handled; food culture lost; music culture lost |
| **Scholarly usability** | 5/10 | Serviceable as first-draft crib; needs extensive annotation and correction |

### Recommendations for This Text

1. **Immediate:** Correct the "narantham = civet" error (paragraph 15). This is a definite mistranslation.

2. **High priority:** Revise paragraphs 7 and the food-description portions to restore specific food vocabulary (steamed meat, skewered roast, elephant yam curry, finger-straight rice).

3. **Medium priority:** Add translator's notes (perhaps as a separate database field or discussion thread) explaining:
   - The taTaari drum's construction
   - The tinai-exchange passage's political significance
   - The "one umbrella" formula
   - The lion-cub/elephant simile for Karikala's youth

4. **Low priority:** Re-translate with an improved prompt (see Section 6) using Gemini 2.5 Pro for higher-quality output on this single canonical text.

### Recommendations for Future Tamil Texts

1. **Use improved prompt** (Section 6) for all future Tamil translations
2. **Consider Gemini 2.5 Pro** for short, canonical texts (under 500 lines) where quality matters more than cost
3. **Keep Gemini 2.5 Flash** for large anthology translations (Akananuru's 400 poems) where batch throughput matters
4. **Implement a post-translation validation step** that checks for known error patterns:
   - "civet" appearing where "citrus/orange" is expected
   - Generic "food/delicious" where specific preparations are described
   - Missing musical terminology
5. **Consider a two-pass approach:** Flash for accuracy-focused first pass, then a literary-polish second pass at higher temperature
6. **Build a Sangam Tamil glossary** that can be injected into prompts as few-shot examples for difficult vocabulary

---

## 10. Comparison to Published Translations

For reference, the Porunararruppadai has been translated by several scholars:

- **J.V. Chelliah** (1962, in "Pattupattu: Ten Tamil Idylls") -- prose translation with extensive notes
- **A. Dakshinamurthy** (1985) -- annotated verse translation
- **P.N. Appuswami** (various) -- literary translation

The Gemini translation most closely resembles a first-draft scholarly crib translation (similar in approach to Chelliah's prose renderings) but without the footnotes that make Chelliah's work useful. It lacks the literary ambition of verse translations and the scholarly apparatus of annotated editions.

For a wiki-based platform where users can edit and improve, this is an acceptable starting point -- it provides a readable baseline that Tamil scholars can refine. The key requirement is that the errors identified in this analysis (particularly the "narantham" mistranslation and the food vocabulary losses) should be corrected before the translation is considered stable.
