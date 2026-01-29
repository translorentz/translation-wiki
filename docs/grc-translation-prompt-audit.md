# Byzantine Greek (grc) Translation Prompt Audit

**Date:** 2026-01-28
**Auditor:** Claude Code (Opus 4.5)
**Scope:** `src/server/translation/prompts.ts` — `grc` prompt, with focus on Epitome of Histories (Zonaras) and other Byzantine Greek historical texts.

## 1. Original Prompt (Before This Audit)

```
You are translating Medieval/Byzantine Greek to English.
Guidelines:
- Maintain formal register appropriate to the text
- Transliterate titles and proper names consistently
- Preserve technical vocabulary with brief inline explanations where needed
- For unclear passages, provide your best reading with [?] notation
```

**Assessment:** This prompt is far too sparse (4 bullet points). It provides no guidance on:
- Sentence structure and fluency
- How to handle long Greek periodic sentences
- Proper noun conventions (English vs. transliterated forms)
- Genre-specific considerations
- Byzantine court/institutional terminology
- The fundamental requirement for natural English prose

## 2. Sample Translation Quality Assessment

### Historia Nova (Zosimus) — 332 chapters translated

Sampled paragraphs from chapters 1-5. Quality is **adequate but stiff**:
- Long run-on sentences faithfully mirror Greek periodic structure (e.g., a 130-word single sentence in ch.1 p.1)
- Some translationese: "Fortune made the remaining parts of Europe subject to the Romans"
- Passive constructions where active would be more natural
- Generally accurate meaning, but reads like academic translation rather than fluent prose

### Epitome Historiarum (Zonaras) — 3 chapters translated

Sampled chapters 1, 7, 13. Quality is **functional but awkward in places**:
- Very long sentences preserved from the Greek (ch.7 p.3 is a single ~400-word paragraph-sentence covering Romulus and Remus)
- Stilted constructions: "not as needing them, but so that it might not be idle in its own contemplation alone"
- Occasional sentence fragments due to paragraph boundaries splitting mid-sentence
- Some good passages, but inconsistent fluency

### Eustathius Odyssey Commentary — 43 chapters translated

Commentary/scholarly register, different from history. Sampled chapters 0-1:
- Appropriately technical for commentary genre
- Some awkward literal renderings of grammatical terminology
- Not a history text, so the generic `grc` prompt is acceptable for this

## 3. Changes Made

### A. New `grc-history` genre-specific prompt

Created a detailed prompt for Byzantine Greek historical/chronicle texts. Key features:
- **Fluency as primary goal**: Explicitly instructs to produce "polished narrative prose -- the kind you would find in a Penguin Classics translation"
- **Sentence restructuring**: Instructs to break long Greek periods into multiple natural English sentences
- **Narrative style**: Consistent past tense, narrative momentum, natural transitions
- **Proper noun conventions**: Use conventional English forms (Constantine, not Konstantinos), established English title patterns
- **Byzantine terminology**: Guidance on translating court titles, institutional terms, geographic names
- **Anti-translationese directives**: Active voice preference, natural word order, no mirroring Greek syntax

### B. Improved base `grc` prompt

The generic `grc` prompt (used for commentary, philosophy, science, literature genres) was also significantly expanded from 4 lines to a full prompt covering:
- Fluency and readability as core principles
- Sentence structure guidance (break up periods)
- Proper noun conventions
- Active voice preference

### C. Genre selection in translate-batch.ts

Added selection logic so texts with `language.code === "grc"` and `genre === "history"` automatically use the `grc-history` prompt. This follows the same pattern as `zh-literary` and `it-literary-19c`.

**Affected texts:**
- `historia-nova` (Zosimus) — 332 chapters, already translated (would need `--retranslate` to benefit)
- `epitome-historiarum` (Zonaras) — 3 chapters translated, remaining chapters will use new prompt

## 4. Files Modified

| File | Change |
|------|--------|
| `src/server/translation/prompts.ts` | Expanded `grc` prompt; added new `grc-history` prompt |
| `scripts/translate-batch.ts` | Added genre selection for `grc` + `history` -> `grc-history` |

## 5. Recommendation

The Epitome of Histories translation should proceed with the new `grc-history` prompt. The 3 already-translated chapters may be retranslated later if quality comparison warrants it, but priority should be completing the remaining untranslated chapters first.

No retranslation of Historia Nova (332 chapters) is recommended at this time -- the existing translations are adequate, and the cost of retranslating 332 chapters is high. If individual chapters are found to be particularly poor, they can be retranslated selectively.
