# Carmina Graeca -- Quality Critiques

This file contains the Critic Agent's formal evaluation of each chapter's output quality.

## Evaluation Criteria

1. **Coherence**: Does the Greek read as coherent medieval verse?
2. **Completeness**: Are there missing or truncated lines?
3. **Contamination**: Any apparatus, noise, or non-verse content?
4. **OCR Quality**: Garbled characters, impossible letter combinations?
5. **Structure**: Consistent line lengths? Proper verse form?
6. **Boundaries**: Correct start/end? No bleeding from adjacent texts?

## Rating Scale

- **A**: Clean, publishable Greek text
- **B**: Minor issues (1-3 OCR artifacts, cosmetic problems)
- **C**: Noticeable issues (garbled passages, some contamination)
- **D**: Significant problems (many broken lines, wrong text mixed in)
- **F**: Unusable (mostly garbage)

---

## Cross-Cutting Issues (Affect Multiple Chapters)

Before individual evaluations, these systemic issues apply across the corpus:

### Issue 1: Editorial Introduction Leaking into Verse (CRITICAL - Chapter 1)

The editorial scholarly introduction (Wagner's German/Greek prose, NOT verse) was incorrectly classified as verse in Chapter 1, paragraphs 2-4. This is OCR'd scholarly commentary (e.g., "ποιητὴς εἶναι Αλέξιος ὁ Κομνηνός, οὐχὶ ὁ αὐτοκράτωρ, ἀλλ υἱὸς τοῦ αὐτοκράτορος Ἰωάννου τοῦ Κομνηνοῦ") and Latin-in-Greek-script garble. The classifier failed to reject these because they have >79% Greek characters and no isolated sigla.

### Issue 2: Very Short Single-Line Paragraphs

Many chapters have paragraphs containing just ONE line (sometimes as short as 4-7 characters). These are likely:
- (a) Lines that survived classification but are isolated from their surrounding verse block, OR
- (b) Fragment verse lines that got separated from their paragraph context

Examples: Ch9 paragraph 3 ("ἀδύνεψεν ὃ γάδαρος καὶ πλέα δὲν ἠμπόρει,"), Ch10 paragraph 8 (single line), Ch11 paragraph 8 ("δυσάκην"), Ch7 paragraphs 11-13 (single lines each).

The "δυσάκην" case (Ch11, par. 8) is clearly a garbled OCR fragment, NOT real verse.

### Issue 3: Merged Verse Lines (Paragraphs with Run-Together Text)

Chapter 1, paragraph 7: "ἐξέφνης ἀνελπίστος. καὶ τάφον ὥριξε βαθὴν ὁ χωρισμός σου τούτος καὶ ἰδοὺ κείτομαι εἰς γὴν ὡς ἄψυχος παιδί μου..."

This appears to be multiple verse lines that lost their line breaks in the source OCR. The result is a paragraph of prose-like continuous text rather than separated verse lines.

### Issue 4: Truncated Lines with OCR Damage

Several chapters contain lines that are clearly truncated mid-word, suggesting the OCR lost the end of the line:
- Ch9 par. 4: "ὀϑδὲ γιὰ ξύλα νὰ τὰ οὐδὲ νερὸ νὰ ἀνε" (truncated)
- Ch2 par. 8: "ὙΧΎΣΥΟΣΣ ἀρτ τω αν Ἂ" (complete garble at end)

### Issue 5: Belisarius Poems (19, 20, 21) - Distinctness Verified

Chapters 19, 20, and 21 all treat the Belisarius legend but ARE distinct poems as verified:
- Ch19 opens: "Ω θαυμαστὸν παράδοξον, ὦ συμφορά μεγάλη / καὶ λύπη ἀπαράλλακτος..."
- Ch21 opens: "θαυμαστὸν παράδοξον, ὦ συμφορά μεγάλη / καὶ ὀδυρμοὶ καὶ στεναγμοί..."

The openings are similar but diverge immediately. Ch21 has rhyming couplets (μεγάλη/μεγάλη, πικρία/εὐημερίᾳ), Ch19 does not. They are clearly separate poems in different verse styles.

---

## Chapter Evaluations

### Chapter 1: Alexios Komnenos' Admonitory Poem

**Grade: C**

| Metric | Value |
|--------|-------|
| Verse lines | 679 |
| Paragraphs | 83 |
| Avg line length | 46.4 chars |
| Min/Max line length | 22 / 72 chars |

**Issues Found:**

1. **CRITICAL: Editorial introduction included as verse (paragraphs 2-4)**
   - Paragraph 2: "ΙΕ αἰῶνος, ὑπὸ ἀμαθοῦς καὶ ἀπειροκάλου ἀντιγραφέως γραφθείς." -- This is Wagner's scholarly note about the manuscript, NOT verse.
   - Paragraph 3: Multi-line editorial commentary about Alexios Komnenos' identity ("κατ ἐμὲ, ποιητὴς εἶναι Αλέξιος ὁ Κομνηνός..."). This is prose from the editor's introduction.
   - Paragraph 4: "ργοΐοοίοβ. απὸ γμεξοῦ" -- Pure OCR garble (likely Latin-in-Greek-script).
   - **These paragraphs must be removed entirely.**

2. **Merged verse lines (paragraph 7)**: "ἐξέφνης ἀνελπίστος. καὶ τάφον ὥριξε βαθὴν..." -- multiple verse lines run together without line breaks.

3. **Garbled paragraph 31**: "ὙΘΙΒΌΠΙ ΒῈ θυ. τὸν ἕνα: γὰρ καὶ τὸν αὐτὸν οἱ Σ τινὰς πὸλλ" -- This is either apparatus or severely garbled OCR. Not real verse.

4. **Sigla contamination**: 1 line flagged ("οὐδὲν οἴῃ Β ἐποίησες ΑΒ Ὄ...")

5. **OCR garble within verse**: Paragraph 9: "ΕΚοχχΕι δὲ τοὺς λογισμοὺς" -- impossible letter combination at start.

**Good Lines (representative verse):**
- "Τέκνον μου ποθεινότατον, παιδίν μου ἠγαπημένον," (correct 15-syllable political verse)
- "ὀστοῦν ἐκ τῶν ὀστέων μου καὶ σὰρξ ἐκ τῆς σαρκός μου," (clean)
- "τὸν βασιλέα, ὦ υἱὲ, τίμα τον καὶ φοβοῦ τον" (clean)

**Recommendation**: Remove paragraphs 2, 3, 4, 31. Fix merged lines in paragraph 7. Flag paragraph 9 line 11 for garble.

---

### Chapter 2: Lament about Tamerlane

**Grade: B-**

| Metric | Value |
|--------|-------|
| Verse lines | 92 |
| Paragraphs | 8 |
| Avg line length | 44.4 chars |
| Min/Max line length | 20 / 54 chars |

**Issues Found:**

1. **Missing verse line**: Source line 2676 ("τοῦ Μανοὴλ κρατήσαντος κυροῦ Ἰ]αλαιολόγου") appears to have been dropped from the output (it has a bracket, which triggered the apparatus filter).

2. **Terminal garble (paragraph 8, last line)**: "ὙΧΎΣΥΟΣΣ ἀρτ τω αν Ἂ" -- This is complete garbage. It should be removed.

3. **OCR damage throughout**: Many lines show OCR artifacts (random periods, misplaced breathings) but remain readable. Examples:
   - "ἹΤῶς νὰ εἰπῶ" (initial H with breathing is slightly garbled)
   - "αὐτίκα ἡρπάξεν αὐτὸν ὃ ἢρως ὐιρεἰημρλλοοιο" (last word is garbled)

**Good Lines:**
- "τὴν συμφορὰν τὴν ὄδικον ἐκείνην τῆς Ἕῴας" (clean verse)
- "ἀπορεῖ γάρ μου ὃ λόὀγισμὸς, συγχέεται κ ὃ νοῦς μου," (clean)

**Recommendation**: Remove the terminal garble line. Consider relaxing the bracket filter to recover line 2676 (which is real verse with an editorial insertion mark, not apparatus).

---

### Chapter 3: Georgillas' Plague of Rhodes

**Grade: A-**

| Metric | Value |
|--------|-------|
| Verse lines | 613 |
| Paragraphs | 73 |
| Avg line length | 46.8 chars |
| Min/Max line length | 35 / 70 chars |

**Issues Found:**

1. None significant. Clean extraction with good line lengths.
2. Line lengths are very consistent (35-70 chars), indicating good verse extraction.
3. No sigla contamination, no garble.
4. Greek reads as coherent 15-syllable vernacular verse throughout.

**Good Lines:**
- Consistent verse quality throughout. This is one of the best-extracted chapters.

**Recommendation**: No action needed. Publish as-is.

---

### Chapter 4: Sklabos' Misfortune of Crete

**Grade: A-**

| Metric | Value |
|--------|-------|
| Verse lines | 281 |
| Paragraphs | 32 |
| Avg line length | 46.3 chars |
| Min/Max line length | 35 / 57 chars |

**Issues Found:**

1. None significant. Tight line length range (35-57) is excellent.
2. No contamination of any kind.

**Recommendation**: No action needed.

---

### Chapter 5: Writings of Sachlikis (I)

**Grade: C+**

| Metric | Value |
|--------|-------|
| Verse lines | 388 |
| Paragraphs | 43 |
| Avg line length | 48.4 chars |
| Min/Max line length | 36 / 75 chars |

**Issues Found:**

1. **Garbled paragraph 5**: "ἰνφέρνον Ρ, οἵη Τιϑστδηᾶ. ῬγῸ Ποο γϑυβα. καὶ κάμνης τὰ τὰ νέω σου τρι-" -- This is apparatus/garble that leaked through. Contains Latin-in-Greek-script and is clearly not verse.

2. **Paragraph 10**: "(αν α χὰ, ἃ. γάσος, εὐὐν ΔΆ ΡΏΟΥ, ω" -- Complete garble. Not verse.

3. **Two sigla-contaminated lines** (flagged in quality report):
   - "μὲ λόγια καὶ μεκομπόματα καὶ νατὸν κανακίζει Μ ρΡοβῦ πὸ νθύβιμη ΠΟΝ"
   - "ἄποβ θαι Μ καὶ ἀνυμπωρησυν ζοὐντανὸν εἰς τὴν τριγίαν τὸν. πνύγη,"
   Both of these are verse lines with apparatus text appended (the real verse ends partway through).

4. Otherwise, the Sachlikis verse is clean and reads well as Cretan dialectal Greek.

**Good Lines:**
- "Πολλὰ ἐκόπιασ εὔκαιρα πολλαῖς φοραῖς δι ἐσέναν" (clean opening)
- "γνώριζ, υἱέ μου Φρατζησκὴ, ἂν θέλῃς νὰ προκόψῃς," (clean verse)

**Recommendation**: Remove paragraphs 5 and 10 entirely. Truncate the two contaminated lines at the point where apparatus begins.

---

### Chapter 6: More Writings of Sachlikis (II)

**Grade: B**

| Metric | Value |
|--------|-------|
| Verse lines | 739 |
| Paragraphs | 97 |
| Avg line length | 48.3 chars |
| Min/Max line length | 10 / 74 chars |

**Issues Found:**

1. **Min line length of 10** suggests at least one very short fragment survived.
2. **1 sigla contamination line**: "καὶ. ανθέλει ἀς τὴν χαρίσει Μο οδἴοχαπι πο ρομτῦ Μ αὔδ βθοιηΐιν διατί" -- verse line with apparatus appended.
3. The bulk of the text reads well as Cretan verse.

**Good Lines:**
- Sachlikis' moral advice verse reads coherently throughout most of the text.

**Recommendation**: Remove the contaminated line's apparatus tail. Check for the short (10-char) line and remove if garble.

---

### Chapter 7: About an Old Man Not Marrying a Girl

**Grade: B+**

| Metric | Value |
|--------|-------|
| Verse lines | 195 |
| Paragraphs | 27 |
| Avg line length | 46.8 chars |
| Min/Max line length | 37 / 63 chars |

**Issues Found:**

1. **Single-line paragraphs (11, 12, 13)**: These are real verse lines but got split into individual paragraphs due to classification gaps. Lines like "ποῦ .νὰ τὰ φᾶν τὰ κρειάτα του. ἀρκοῦδες καὶ θηρία." and "καὶ τίς τὸν ἐπροξένησε ποῦ νᾷχε φᾶ φαρμάκι," are legitimate verse that should be merged with surrounding paragraphs.

2. **Minor OCR issues** throughout (stray periods, breathing marks) but all readable.

3. The verse content is lively and coherent -- this is a humorous poem that reads well.

**Good Lines:**
- "Ἄρχοντες πλούσιοι καὶ πτωχοὶ. πατέρες καὶ μητέρες," (good opening)
- "φιλεῖ, τζιμπᾷ, μαλάσσει την, καὶ κάμνει μελανάδες." (vivid description)

**Recommendation**: Merge single-line paragraphs 11-13 into paragraph 10 or 14. Minor issue only.

---

### Chapter 8: Synaxarion of the Honored Donkey

**Grade: B+**

| Metric | Value |
|--------|-------|
| Verse lines | 387 |
| Paragraphs | 44 |
| Avg line length | 44.1 chars |
| Min/Max line length | 20 / 55 chars |

**Issues Found:**

1. Min line length of 20 chars -- some shorter lines but within acceptable range.
2. No contamination. Clean verse throughout.
3. Minor OCR artifacts (typical of the corpus) but all readable.

**Recommendation**: No action needed.

---

### Chapter 9: Tale of Donkey, Wolf, and Fox

**Grade: B**

| Metric | Value |
|--------|-------|
| Verse lines | 528 |
| Paragraphs | 64 |
| Avg line length | 45.2 chars |
| Min/Max line length | 4 / 59 chars |

**Issues Found:**

1. **Min line length of 4 chars**: There is at least one extremely short fragment that is not real verse.

2. **Single-line paragraph 3**: "ἀδύνεψεν ὃ γάδαρος καὶ πλέα δὲν ἠμπόρει," -- This IS real verse but got isolated into its own paragraph.

3. **Truncated line in paragraph 4**: "ὀϑδὲ γιὰ ξύλα νὰ τὰ οὐδὲ νερὸ νὰ ἀνε" -- clearly truncated mid-word (OCR lost end of line).

4. Otherwise, the beast-fable verse reads coherently and enjoyably.

**Good Lines:**
- "ὁ λύκος μὲ τὴν ἀλουποῦ πῶς ἔπιαν τὸ φαρμάκι," (good rhyming couplet)
- "κὺρ γάδαρέ μας, γειά σου, / ἔλα νὰ πᾶμε εἰς τὸ σκιός" (natural speech)

**Recommendation**: Find and remove the 4-char fragment. Merge paragraph 3 with neighbors. Flag the truncated line.

---

### Chapter 10: Childish Tale of Four-legged Animals

**Grade: B+**

| Metric | Value |
|--------|-------|
| Verse lines | 1036 |
| Paragraphs | 94 |
| Avg line length | 44.0 chars |
| Min/Max line length | 7 / 63 chars |

**Issues Found:**

1. **High verse count (1036)** -- This is genuinely the longest poem in the collection. NOT an error.
2. **Min line length 7 chars** -- at least one very short fragment exists.
3. **Single-line paragraphs (2, 5, 8, etc.)**: Several paragraphs contain just 1-2 lines, suggesting fragmentation in the extraction.
4. The verse is well-extracted overall. The animal tale reads coherently.

**Good Lines:**
- "Διήγησις παιδιόφραστος περὶ τῶν τετραπόδων," (clear opening)
- "ὁ πάντα τρώγων βρώματα καὶ πάντα κατεσθίων," (clean verse)

**Recommendation**: Find and remove the 7-char fragment. Merge short paragraphs where appropriate. The high line count is correct and not a problem.

---

### Chapter 11: Poulologos (Tale of the Birds)

**Grade: B**

| Metric | Value |
|--------|-------|
| Verse lines | 627 |
| Paragraphs | 62 |
| Avg line length | 46.1 chars |
| Min/Max line length | 7 / 60 chars |

**Issues Found:**

1. **Paragraph 8**: Contains ONLY "δυσάκην" (7 chars) -- This is clearly an OCR fragment or a garbled word, NOT a verse line. Must be removed.

2. **Min line length 7 chars**: Confirmed as the "δυσάκην" case above.

3. The Poulologos is one of the most entertaining poems in the collection. The bird insults ("τζαφαροσκέλη πελαργὲ, καμηλοπερπατάρη") are vivid and the verse reads well.

**Good Lines:**
- "Αετὸς ὃ μέγας βασιλεὺς ἁπάντων τῶν ὀρνέων" (clear opening)
- "εἰπέ με, κύκνε ἀσούσουμε καὶ μακροσφονδυλάτε," (colorful insult)

**Recommendation**: Remove paragraph 8 ("δυσάκην"). Otherwise good quality.

---

### Chapter 12: Tale of the Tricologos

**Grade: A-**

| Metric | Value |
|--------|-------|
| Verse lines | 94 |
| Paragraphs | 17 |
| Avg line length | 53.0 chars |
| Min/Max line length | 18 / 70 chars |

**Issues Found:**

1. Slightly higher average line length (53 chars) than other chapters, but within range for this particular text.
2. No contamination. Clean verse.

**Recommendation**: No action needed.

---

### Chapter 13: On Living Abroad

**Grade: B+**

| Metric | Value |
|--------|-------|
| Verse lines | 513 |
| Paragraphs | 51 |
| Avg line length | 46.1 chars |
| Min/Max line length | 9 / 59 chars |

**Issues Found:**

1. **Min line length 9 chars**: At least one very short fragment exists.
2. Otherwise clean extraction.

**Recommendation**: Find and remove the 9-char fragment.

---

### Chapter 14: To Venice

**Grade: A**

| Metric | Value |
|--------|-------|
| Verse lines | 87 |
| Paragraphs | 10 |
| Avg line length | 46.9 chars |
| Min/Max line length | 21 / 62 chars |

**Issues Found:**

1. None significant. Clean, well-extracted poem.
2. The shortest poem in the collection (after accounting for Ch21's actual length).

**Good Lines:**
- All lines read as clean medieval Greek verse.

**Recommendation**: No action needed. This is a model extraction.

---

### Chapter 15: Pikatorios' Lament on Hades

**Grade: B+**

| Metric | Value |
|--------|-------|
| Verse lines | 543 |
| Paragraphs | 60 |
| Avg line length | 48.2 chars |
| Min/Max line length | 17 / 70 chars |

**Issues Found:**

1. **Min line length 17 chars**: Possibly a short fragment or legitimate short verse.
2. No contamination. Good quality overall.

**Recommendation**: Check the 17-char line. If garble, remove. If real verse, keep.

---

### Chapter 16: Penitential Alphabet

**Grade: A**

| Metric | Value |
|--------|-------|
| Verse lines | 117 |
| Paragraphs | 12 |
| Avg line length | 47.3 chars |
| Min/Max line length | 38 / 72 chars |

**Issues Found:**

1. None. Tight line length range (38-72) indicates clean extraction.
2. As an alphabetical acrostic, each line should begin with successive letters of the Greek alphabet -- this structural feature provides additional validation.

**Recommendation**: No action needed.

---

### Chapter 17: Tale of Apollonius of Tyre

**Grade: B+**

| Metric | Value |
|--------|-------|
| Verse lines | 812 |
| Paragraphs | 77 |
| Avg line length | 45.8 chars |
| Min/Max line length | 18 / 76 chars |

**Issues Found:**

1. **High verse count (812)** -- legitimate for this long romance.
2. **Min line length 18**: Possibly a fragment, worth checking.
3. No contamination flagged.

**Good Lines:**
- Well-extracted romance verse. Reads coherently as narrative.

**Recommendation**: Check the 18-char line. Otherwise no action needed.

---

### Chapter 18: Life of a Wise Elder

**Grade: B**

| Metric | Value |
|--------|-------|
| Verse lines | 906 |
| Paragraphs | 131 |
| Avg line length | 23.9 chars |
| Min/Max line length | 2 / 37 chars |

**Issues Found:**

1. **Short lines are GENUINE**: This text uses a different meter (likely 8-syllable verse or prose-verse hybrid). The 24-char average is correct for this text type.

2. **Min line length of 2 chars**: At least one extremely short fragment exists (likely garble).

3. **Very high paragraph count (131)**: With 906 lines in 131 paragraphs, the average is ~7 lines per paragraph (smaller than the 15-line target). This is because the shorter lines create more paragraph breaks.

4. **Paragraph 19**: "(νῦν) τὴῤεθος" -- This is clearly garbled/truncated. Not real verse.

5. **1 sigla contamination**: "Ρ ἀλλὰ καὶ τὴν πόλιν ταύτην," -- isolated Ρ at line start is OCR noise, not a real sigla.

6. **Repeated text pattern**: "νὰ ἦμ εἰς βασιλεῶς παλάτιν" appears in both paragraph 9 AND paragraph 13. This could be a refrain or a duplication error.

**Good Lines:**
- "Ἔλεγον οὐμὴ νὰ γράψω / οὐδὲ χεῖρα νὰ κινήσω" (clear opening in shorter meter)
- "ἮΤτον ἄνθρωπος ἐν τόπῳ / φρόνιμος πολλὰ καὶ μέγας," (good short verse)

**Recommendation**: Remove the 2-char fragment and paragraph 19 garble. The short line lengths are correct for this text. Verify the repeated phrase is intentional (refrain).

---

### Chapter 19: Tale of Belisarius (I)

**Grade: A-**

| Metric | Value |
|--------|-------|
| Verse lines | 529 |
| Paragraphs | 70 |
| Avg line length | 45.2 chars |
| Min/Max line length | 11 / 61 chars |

**Issues Found:**

1. **Min line length 11 chars**: One short fragment exists.
2. **Single-line paragraphs (2, 7)**: These contain legitimate verse lines that got isolated.
3. No contamination. Clean extraction of the Belisarius romance.
4. Distinct from Chapters 20 and 21 -- confirmed as independent poem.

**Good Lines:**
- "Ω θαυμαστὸν παράδοξον, ὦ συμφορά μεγάλη" (strong opening)
- "Βελισάριος ὀνόματι, ἡ δόξα τῶν Ῥωμαίων." (clear)

**Recommendation**: Check the 11-char fragment. Merge single-line paragraphs with neighbors.

---

### Chapter 20: Georgillas' History of Belisarius

**Grade: A-**

| Metric | Value |
|--------|-------|
| Verse lines | 809 |
| Paragraphs | 96 |
| Avg line length | 44.7 chars |
| Min/Max line length | 34 / 71 chars |

**Issues Found:**

1. **High verse count (809)** -- legitimate long poem.
2. No contamination. Tight line length range.
3. Distinct from Ch19 and Ch21.

**Recommendation**: No action needed. Good quality.

---

### Chapter 21: Rhyme on Belisarius

**Grade: B+**

| Metric | Value |
|--------|-------|
| Verse lines | 977 |
| Paragraphs | 119 |
| Avg line length | 44.3 chars |
| Min/Max line length | 21 / 61 chars |

**Issues Found:**

1. **Very high verse count (977)**: This is unexpectedly long. The plan expected Ch21 to be the SHORTEST text ("20-60 verse lines"), but the pipeline produced 977 lines. This needs investigation.

2. **CRITICAL**: According to the Ground Truth table, Ch21 starts at line 21073 and should end around line 21100 (just ~30 lines of text before back matter begins at line 21100). But the pipeline assigned 1813 raw lines to this chapter (including 977 verse lines). This strongly suggests the back matter boundary (21100) was not enforced, and the chapter absorbed garbage from lines 21100-22885.

3. Despite this concern, the verse that IS present reads as legitimate Belisarius narrative in rhyming couplets.

4. Uses rhyming couplets throughout (μεγάλη/μεγάλη, πικρία/εὐημερίᾳ, Ῥωμαίους/Ἰουδαίους), distinguishing it from the non-rhyming Ch19.

**Good Lines:**
- "θαυμαστὸν παράδοξον, ὦ συμφορὰ μεγάλη" (opening)
- "κ εἰς θρόνον ἐπηρμένον τε νὰ ἧσαι παλατίου," (clean verse)

**Recommendation**: RESOLVED -- The poem IS genuinely long. Verified in the source OCR: line 21500 has "προστάττει Βελισάριος" (clear narrative), line 22000 has the emperor's monologue about Belisarius, and the poem extends to approximately line 22878. The plan's estimate of "20-60 verse lines" was incorrect; the plan's risk section (item 6) correctly noted the poem extends to line 22882. The 977 verse lines are legitimate. No fix needed.

---

## Summary Statistics

| Grade | Count | Chapters |
|-------|-------|----------|
| A | 3 | 14, 16, (3 borderline) |
| A- | 4 | 3, 4, 12, 20 |
| B+ | 6 | 7, 8, 10, 13, 15, 17 |
| B | 4 | 6, 9, 11, 18 |
| B- | 1 | 2 |
| C+ | 1 | 5 |
| C | 1 | 1 |
| D | 0 | |
| F | 0 | |

**Overall Assessment**: 19 of 21 chapters are grade B or better. The main problem chapters are:
- **Chapter 1** (Grade C): Editorial introduction contamination -- must be fixed
- **Chapter 5** (Grade C+): Two garbled paragraphs that are clearly not verse
- **Chapter 21** (Grade B+): Initially flagged as unexpectedly long, but VERIFIED as correct -- the poem genuinely extends ~1800 lines in the source

**Priority Fixes for Processor Agent:**
1. Chapter 1: Remove paragraphs 2, 3, 4, 31 (editorial prose / garble)
2. Chapter 5: Remove paragraphs 5 and 10 (garble)
3. Chapter 11: Remove paragraph 8 ("δυσάκην")
4. Chapter 2: Remove terminal garble line ("ὙΧΎΣΥΟΣΣ ἀρτ τω αν Ἂ")
5. Chapter 21: Investigate the unexpectedly high line count
6. All chapters: Find and remove fragments under 10 chars in length (min lengths of 2, 4, 7 chars are always garble)

---

## Iteration 2: Re-Evaluation of .txt Files (2026-01-23)

The Processor Agent has generated .txt files in `data/raw/carmina-graeca/`. This section evaluates the final .txt output.

### Improvements Confirmed

The following issues from Iteration 1 have been successfully fixed:

1. **Ch1 editorial introduction**: REMOVED. File now starts with verse directly.
2. **Ch2 terminal garble ("ὙΧΎΣΥΟΣΣ")**: REMOVED. Not present in .txt file.
3. **Ch5 garbled paragraphs**: REMOVED. No short fragments remain.
4. **Duplicate files**: CLEANED UP. Directory now contains exactly 21 files with correct naming.
5. **File naming**: All files follow `chapter-NN-title-slug.txt` convention correctly.
6. **File format**: Title on line 1, author on line 2 (where applicable), blank line, then verse. Consistent across all chapters.

### Revised Grades for .txt Output

| Chapter | Iteration 1 Grade | Iteration 2 Grade | Change |
|---------|-------|-------|--------|
| 1 | C | A- | Fixed (intro removed, 1 garble line remains) |
| 2 | B- | A | Fixed (terminal garble removed) |
| 3 | A- | A- | No change needed |
| 4 | A- | A- | No change needed |
| 5 | C+ | A | Fixed (garbled paragraphs removed) |
| 6 | B | A- | Clean |
| 7 | B+ | A- | Clean |
| 8 | B+ | A | Clean |
| 9 | B | A- | Clean |
| 10 | B+ | A- | 1 fragment remains (line 988) |
| 11 | B | B+ | 2 issues remain (lines 85-86) |
| 12 | A- | A | Clean |
| 13 | B+ | A- | 1 cosmetic issue (quote wrapping, legitimate) |
| 14 | A | A | Clean |
| 15 | B+ | A- | Clean |
| 16 | A | A | Clean |
| 17 | B+ | A- | Clean |
| 18 | B | B | 4 garble/fragment lines remain |
| 19 | B+ | A- | Clean |
| 20 | A- | A | Clean |
| 21 | B+ | A- | Clean |

### Remaining Issues (8 lines total across 4 chapters)

These lines are clearly NOT verse and should be removed:

| # | File | Line | Content | Diagnosis |
|---|------|------|---------|-----------|
| 1 | chapter-01 | 217 | `ὙΘΙΒΌΠΙ ΒῈ θυ. τὸν ἕνα: γὰρ καὶ τὸν αὐτὸν οἱ Σ᾽ τινὰς πὸλλ` | Garbled apparatus/editorial matter |
| 2 | chapter-10 | 988 | `ἰδεῖν Ῥ` | Fragment + trailing siglum |
| 3 | chapter-11 | 85 | `δυσάκην ΄` | Fragment with trailing mark |
| 4 | chapter-11 | 86 | `δδ κι ἀπ᾿ τὴν πικριὰν...` | Line with garble prefix "δδ " |
| 5 | chapter-18 | 679 | `ποίησον` | 7-char fragment (too short for any verse meter) |
| 6 | chapter-18 | 751 | `τοῦ, οῃὰ βαῦμδβ` | Pure garble (nonsense chars) |
| 7 | chapter-18 | 752 | `εἶδα` | 4-char fragment |
| 8 | chapter-18 | 753 | `εἶπα` | 4-char fragment |

### Cosmetic Issue (DO NOT REMOVE)

**Ch13, lines 438-440**: A prose biblical quotation (Matthew 25:34) split across 3 lines, ending with `κόσμου. "` on its own. This is a LEGITIMATE scriptural quotation embedded in the verse poem. The poet quotes Scripture as part of an eschatological passage. The awkward line wrapping is cosmetic and does not affect content quality.

### Overall Verdict

**Current quality: A- (excellent)**. The corpus is 99.93% clean (8 bad lines out of ~10,900 verse lines). After removing the 8 remaining garble lines, the corpus will be at full publication quality (grade A).

The Processor Agent should remove the 8 lines listed above. No other changes are needed. The corpus is otherwise ready for use.
