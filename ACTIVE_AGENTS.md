# Active Agents & Background Workers

Track all running agents and background workers here. Update when launching or completing agents.

**Last updated:** 2026-02-05, Session 44 (Gregory of Nazianzus 45 Orations IN PROGRESS)

---

## Active — Twenty-Four Histories (二十四史) Pipeline

- **Source:** zh.wikisource.org
- **Scope:** 24 dynastic histories, ~3,213 chapters total
- **Author (for seeding):** "The Twenty-four Histories" (collective compilation)
- **Phase 0 (Reconnaissance):** ✅ COMPLETE
- **Phase 1 (Acquisition):** ✅ COMPLETE — 24/24 histories acquired (~3,213 chapters)
- **Phase 2 (Seeding):** ✅ COMPLETE — 3,279 chapters seeded
- **Phase 3 (Descriptions):** ✅ COMPLETE — Scholarly descriptions applied
- **Phase 4 (Sort Order):** ✅ LIVE — Canonical ordering (1-24) working on production
- **Phase 5 (Trial Translation):** ✅ APPROVED — hanshu ch 1-10 reviewed by DeepSeek-reasoner
- **Phase 6 (Mass Translation):** IN PROGRESS — 6 workers translating

**⚠️ TRANSLATION PAUSED — DATA QUALITY ISSUE ⚠️**

**Issue (2026-02-03):** Han Shu chapter 20 has 97% commentary content (師古曰, etc.) mixed as orphan paragraphs. Data is unusable for translation.

**Current Status:**
- Cleaning agent (ae2cec5) **STOPPED** - regex cleaning won't fix structural issues
- Han Shu workflow plan created: `docs/hanshu-workflow-plan.md`
- 5 independent DeepSeek reviewers assessing other 24 Histories texts

**Review Agent Results (COMPLETE):**
| Reviewer | Texts | Result |
|----------|-------|--------|
| 1 | shiji, hanshu, hou-hanshu, sanguozhi, jinshu | **shiji, hanshu, jinshu:** CLEAN. **hou-hanshu, sanguozhi:** MODERATE issues |
| 2 | songshu, nan-qi-shu, liangshu, chenshu, weishu | **nan-qi-shu, liangshu, chenshu, weishu:** CLEAN. **songshu:** MINOR issue |
| 3 | bei-qi-shu, zhoushu, suishu, nanshi, beishi | **bei-qi-shu, suishu, nanshi, beishi:** CLEAN. **zhoushu:** MINOR issue |
| 4 | jiu-tangshu, xin-tangshu, jiu-wudaishi, xin-wudaishi, songshi | **xin-tangshu, jiu-wudaishi, songshi:** CLEAN. **jiu-tangshu, xin-wudaishi:** MINOR |
| 5 | liaoshi, jinshi, yuanshi, mingshi | **liaoshi, mingshi:** CLEAN. **jinshi, yuanshi:** MINOR |

**Summary:** 16 texts clean, 6 with minor issues (editorial marks only), 2 with moderate issues (hou-hanshu, sanguozhi have embedded commentary).

**⚠️ IMPORTANT CLARIFICATION (User directive):**
- **Context-free commentary** (orphan paragraphs) = **PROBLEMATIC** — commentary separated from main text, appearing as meaningless standalone paragraphs with no indication of what they're commenting on
- **Embedded commentary** (in context) = **FINE** — commentary interwoven with the text it explains; readers can understand the relationship

The hou-hanshu and sanguozhi "moderate issues" are ACCEPTABLE because their commentary (Pei Songzhi notes, Li Xian annotations) is properly embedded in context. Han Shu table chapters (13-20) were problematic because Yan Shigu's commentary appeared as context-free orphan paragraphs.

**Han Shu Workflow Progress:**
| Phase | Task | Status |
|-------|------|--------|
| 1 | Wikisource HTML analysis | **COMPLETE** - see `docs/hanshu-html-analysis.md` |
| 2 | Scraping strategy decision | **COMPLETE** - Option A: Strip commentary |
| 3 | Scraper development | **COMPLETE** - `scripts/scrape-hanshu-v2.ts` tested |
| 4 | Quality gate | **COMPLETE** - 4 test chapters verified clean |
| 5 | Full acquisition | **COMPLETE** - 110 files, 7,021 paragraphs in `data/processed/hanshu-v2/` |
| 6 | Kimi K2 Master Review | **✅ APPROVED — conditions met** - see `docs/hanshu-kimi-k2-review.md` |
| 7 | Database update | **✅ COMPLETE** - 109 chapters updated, 37 old translations deleted |
| 8 | Translation | **IN PROGRESS** - 6 workers launched |

**Phase 7 Results (2026-02-04):**
- Updated source_content for 109/110 chapters with clean v2 data
- Deleted 37 contaminated translations
- Total paragraphs in DB: 7,021
- **1 chapter without clean data:** chapter-099b (卷099中) — v2 scraper missed this middle part
- Script: `scripts/update-hanshu-source.ts`

**Phase 8 Translation Workers (Han Shu):**
| Worker | Task ID | Chapters | Range | Progress | Status |
|--------|---------|----------|-------|----------|--------|
| W1 | b7b0989 | 1-20 | --start 1 --end 20 | **20/20 COMPLETE** ✓ | DONE |
| W2 | b32b36f | 21-40 | --start 21 --end 40 | **20/20 COMPLETE** ✓ | DONE |
| W3 | bfc79ff | 41-60 | --start 41 --end 60 | **19/20 COMPLETE** (ch 56 failed) | DONE |
| W4 | bebb250 | 61-80 | --start 61 --end 80 | **20/20 COMPLETE** ✓ | DONE |
| W5 | b91971a | 81-100 | --start 81 --end 100 | **20/20 COMPLETE** ✓ | DONE |
| W6 | b0d93ba | split parts (10ch) | --start 2403 | **10/10 COMPLETE** ✓ | DONE |

**Gap Fix Worker:**
| Worker | Task ID | Chapter | Status |
|--------|---------|---------|--------|
| Retry | ba3a8d1 | ch 56 | **COMPLETE** ✓ (34 paragraphs) |

**✅ HAN SHU TRANSLATION COMPLETE — 110/110 chapters, 7,021 paragraphs**

**Shiji Translation Workers:**
| Worker | Task ID | Chapters | Range | Progress | Status |
|--------|---------|----------|-------|----------|--------|
| S1 | b0b2908 | 1-65 | --start 1 --end 65 | **53 translated, 11 skipped** | **COMPLETE** ✓ |
| S2 | b24dc27 | 66-130 | --start 66 --end 130 | **43 translated, 22 skipped** | **COMPLETE** ✓ |

**Shiji Data Quality Fix Agents:**
| Agent ID | Task | Status |
|----------|------|--------|
| acb080c | Shiji audit (all 130 chapters) | **COMPLETE** ✓ Ch 2 fixed, audit report written |
| ac11939 | Shiji systematic fix (ch 22, 67, 4, 5, 6, 24, 87) | **COMPLETE** ✓ All issues resolved |

**Shiji Audit Findings (2026-02-04) — ALL RESOLVED:**
- **Ch 2:** Qingzhou (青州) paragraph was missing — FIXED ✓
- **Ch 22:** Missing entirely — FIXED ✓ (45 paragraphs, Han officials table)
- **Ch 67:** +59 paragraph difference — FIXED ✓ (added 42 disciples + commentary)
- **Ch 4, 5, 6, 24, 87:** Editorial variations — documented, no action needed
- **Ch 18, 19, 33, 44, 92:** False positives (Wikisource redirects) — confirmed correct
- **Ch 26:** False positive (calendar tables use different HTML) — confirmed correct

**✅ SHIJI DATA QUALITY VERIFIED — 130/130 chapters present and validated**

**Shiji DB Sync + Translation Agent:**
| Agent ID | Task | Status |
|----------|------|--------|
| ae4e085 | Sync fixes to DB + translate ch 2, 22, 67 | **COMPLETE** ✓ |

**✅ SHIJI FULLY COMPLETE — 130/130 chapters synced and translated**

**Xin Tangshu (New Book of Tang) Translation Workers:**

*Previous workers (stopped and reallocated):*
| Worker | Task ID | Progress | Status |
|--------|---------|----------|--------|
| X1 | b8139c4 | ch 1-19 done | STOPPED |
| X2 | b266c65 | ch 125-145 done | STOPPED |
| X3 | bd84736 | **23/23 split parts** | DONE ✓ |

*8-worker allocation (2026-02-04):*
| Worker | Task ID | Range | Chapters | Status |
|--------|---------|-------|----------|--------|
| W1 | b52d6ec | 20-40 | 21 | ✅ DONE |
| W2 | b44afab | 41-61 | 21 | ✅ DONE |
| W3 | b3a0ae6 | 62-82 | 21 | ✅ DONE |
| W4 | b6e3d61 | 83-103 | 21 | ✅ DONE |
| W5 | bb42cbf | 104-124 | 21 | ✅ DONE |
| W6 | b91d31e | 146-172 | 27 | ✅ DONE |
| W7 | bffc468 | 173-199 | 27 | ✅ DONE |
| W8 | b443a26 | 200-225 | 26 | ✅ DONE |

**✅ XIN TANGSHU TRANSLATION COMPLETE — 248/248 chapters**

**Prompt:** `zh-xin-tangshu` — Custom prompt for New Book of Tang (Ouyang Xiu/Song Qi, 1060 CE)
**Text:** 248 chapters total (225 regular + 23 split parts)
**Note:** Split chapters use encoded numbers (e.g., ch 23下 = 2303, ch 70下 = 7003, ch 215下 = 21503)

**Phase 5 Results (2026-02-03):**
- **Files:** 110 chapter files (91 single + 9 split chapters x 2 parts)
- **Paragraphs:** 7,023 total
- **Commentary removed:** ~3,400+ small tags stripped
- **Split chapters:** 24, 25, 57, 64, 94, 96, 97, 99, 100 (have 上/下 parts on Wikisource)
- **Validation:** PASSED — only 1 minor issue (ch 87 structural note, not orphan commentary)
- **Output directory:** `data/processed/hanshu-v2/`

**Key Finding:** Commentary stripping works. Chapter 20 went from 97% commentary to 0% commentary.

---

### ✅ Kimi K2 Master Review (2026-02-04)

**Verdict:** APPROVE (with conditions)
**Reviewer:** Kimi K2 (kimi-k2-thinking-turbo)
**Full Report:** `docs/hanshu-kimi-k2-review.md`

**Key Findings:**
1. **Chapter 20 Transformation:** EXCEPTIONAL SUCCESS — went from 98.9% contaminated to 100% clean
2. **Chapter 87 Issues:** Two artifacts must be removed:
   - Structural note: `師古曰：「自《長楊賦》以後分爲下卷。」` (REMOVE)
   - Footer template: `{{footer|...` (BUG - MUST REMOVE)
3. **Hou-hanshu & Sanguozhi:** CONFIRMED ACCEPTABLE — embedded commentary is fine per user directive
4. **Data Quality:** Overall excellent, 0.9% failure rate (1/110 files with issues)

**Conditions (ALL COMPLETE ✅):**
- [x] Remove structural note from chapter 87 (first paragraph) — DONE
- [x] Remove footer template from chapter 87 (last paragraph) — DONE
- [x] Run global artifact scan — PASSED (no `{{` templates found)
- [x] Run orphan commentary scan — PASSED (no orphan `師古曰` found)
- [x] Update total paragraph count — 7,021 paragraphs (was 7,023, removed 2 from ch 87)

**Translation Phase Recommendations (from Kimi K2):**
1. Add prompt header: "Source: Han Shu (Book of Han) by Ban Gu. Commentary-stripped edition."
2. Prioritize spot-checks on chapters 19-21 (tables)
3. Process split chapters sequentially (24, 25, 57, 64, 94, 96, 97, 99, 100)

**✅ ALL CONDITIONS MET — Ready for Phase 7 (Database Update)**

**Completed Agents:**
| Agent ID | Task | Status |
|----------|------|--------|
| a0e2d32 | Trial translation hanshu ch 1-10 | ✓ COMPLETE |
| afa9ea1 | Fix Vercel deployment failure | ✓ COMPLETE |
| a080d03 | Create 24 translation prompts | ✓ COMPLETE |
| a4235ac | Write text descriptions | ✓ COMPLETE |
| a0a576f | Clean all footnote markers | ✓ COMPLETE |
| a8a33eb | Review cleaned texts | ✓ COMPLETE |

**Cleaning Results:**
- 8,367 footnote markers removed
- 0 footnote markers remaining
- 0 Wikisource templates remaining
- 0 research URLs remaining
- 6 empty chapters identified (acquisition failures - raw data only had copyright notices)

**Empty chapters (need re-acquisition):**
- mingshi/chapter-101
- songshi/chapter-211, 212, 213, 214
- yuanshi/chapter-111

**Completed Histories (24/24):**
| History | Files | Expected | Status |
|---------|-------|----------|--------|
| shiji | 130 | 130 | ✓ |
| hanshu | 111 | 100 | ✓ |
| hou-hanshu | 131 | 120 | ✓ |
| sanguozhi | 65 | 65 | ✓ |
| jinshu | 130 | 130 | ✓ |
| songshu | 100 | 100 | ✓ |
| nan-qi-shu | 60 | 59 | ✓ |
| liangshu | 56 | 56 | ✓ |
| chenshu | 37 | 36 | ✓ |
| weishu | 125 | 130 | ✓ |
| bei-qi-shu | 51 | 50 | ✓ |
| zhoushu | 50 | 50 | ✓ |
| suishu | 85 | 85 | ✓ |
| nanshi | 80 | 80 | ✓ |
| beishi | 100 | 100 | ✓ |
| xin-tangshu | 249 | 225 | ✓ |
| jiu-tangshu | 215 | 214 | ✓ |
| jiu-wudaishi | 151 | 150 | ✓ |
| xin-wudaishi | 74 | 74 | ✓ |
| yuanshi | 210 | 210 | ✓ |
| liaoshi | 117 | 116 | ✓ |
| songshi | 497 | 496 | ✓ |
| jinshi | 136 | 135 | ✓ |

**Phase 1 (Acquisition) COMPLETE:**
All 24 histories have been successfully acquired from zh.wikisource.org.

| mingshi | 332 | 332 | ✓ |

**Completed Previous Agents:**
| Agent ID | Task | Result |
|----------|------|--------|
| a29f340 | mingshi gap-fill (ch 102, 107, 110, 112) | **COMPLETE** ✓ 332/332 |
| a862f7c | liaoshi re-acquisition | **COMPLETE** ✓ 117/116 |
| ad0030d | mingshi acquisition | **COMPLETE** ✓ 329/332 (needs gap-fill) |
| ac23856 | jinshi gap-fill (ch 61-62) | **COMPLETE** ✓ table chapters extracted |
| a4151b4 | songshi gap-fill (24 ch) | **COMPLETE** ✓ 497/496 |
| a4d5bd4 | yuanshi acquisition | **COMPLETE** ✓ 210/210 |
| a419e37 | jiu-tangshu re-acquisition | **COMPLETE** ✓ 215/214 |
| ae0a0ee | hanshu, hou-hanshu re-acquisition | **COMPLETE** ✓ |
| ad15818 | xin-tangshu re-acquisition | **COMPLETE** ✓ |
| ac86da1 | shiji gap check | **COMPLETE** ✓ |
| ab5f8ae | weishu etc re-acquisition | **COMPLETE** ✓ |

---

## Active — Gregory of Nazianzus Complete Works Pipeline

**Date:** 2026-02-05
**Status:** PHASE 1 (ORATIONS) **TRANSLATION COMPLETE** — Review pending

### Source Discovery

After extensive investigation, found clean text PDFs from University of the Aegean Digital Patrology:
- **URL:** https://greekdownloads.wordpress.com/2014/08/31/άγιος-γρηγόριος-ο-ναζιανζηνός-gregory-of-nazianzus-pg-35/
- **Downloaded:** 63 PDFs (14MB) to `data/raw/gregory-greekdownloads/`
- **Quality:** Grade A — Clean Unicode Greek text (NOT image scans)
- **Coverage:** ALL 45 orations + letters + poetry + drama

### Phase 1: Orations (45 chapters) — IN PROGRESS

**Processing & Verification:**
| Agent ID | Task | Status |
|----------|------|--------|
| ae4088c | Fix paragraph splitting (U+0374 vs U+02B9) | ✅ COMPLETE |
| ae4a460 | Verify paragraph segmentation (1,011 paras) | ✅ COMPLETE |
| acea321 | Fix embedded section markers (130 found) | ✅ COMPLETE |
| ae431bc | Verify paragraph splitting fix | ✅ COMPLETE |
| af714c5 | DeepSeek-reasoner independent review | ✅ COMPLETE (wrote report) |
| a7b6a64 | Fix stigma spacing (Ch 2, 4) | ✅ COMPLETE (15 fixes) |
| aacc5ce | Fix structural issues + DB update | ✅ COMPLETE (45 chapters updated) |

**✅ FINAL VERIFICATION PASSED — APPROVED FOR TRANSLATION**

**Current Paragraph Counts:** 1,166 total (all 45 orations verified)

**All Issues Fixed:**
- ✓ Stigma spacing: `X ςʹ.` → `Xςʹ.` (15 fixes in Ch 2, 4)
- ✓ Orphaned markers: Removed from Ch 3, 4
- ✓ Malformed markers: Fixed `Α.` → `Αʹ.` in Ch 35
- ✓ Database updated with all fixes

**⚠️ PARAGRAPH FIX v5 (2026-02-05):**
- Agent acea321 found **130 embedded section markers** across 38 orations
- Root causes: Delta variant (U+2206 ∆), spaced lowercase sigma (ς ʹ.)
- Created `process-orations-v5.py` with comprehensive marker detection
- **Paragraph count:** 1,012 → 1,106 (+94 properly split paragraphs)
- Updated source_content for all 45 chapters in database
- Deleted 38 misaligned translations (35 changed chapters)
- **9 chapters preserved** (unchanged): 7, 11, 17, 27-31, 39

**⚠️ PARAGRAPH ALIGNMENT INCIDENT (2026-02-05):**
- Wave 3 workers STOPPED due to paragraph misalignment bug
- Issue: LLM re-segmented based on section markers, shifting content to wrong paragraphs
- All translations DELETED from database
- Code FIXED: batch size reduced, solo paragraphs, explicit prompt instructions
- See CLAUDE.md "CRITICAL: Paragraph Alignment Verification" for full details

**Translation Workers (Wave 4 - COMPLETE):**

| Worker | Bash ID | Orations | Status |
|--------|---------|----------|--------|
| W1 | b80a693 | 1-6 | ✅ DONE (Ch 4 retry: b19adb0) |
| W2 | b775099 | 8-12 | ✅ DONE |
| W3 | bb8c92e | 13-18 | ✅ DONE |
| W4 | be9784b | 19-24 | ✅ DONE |
| W5 | b91ae01 | 25-30 | ✅ DONE |
| W6 | b52f118 | 31-36 | ✅ DONE |
| W7 | b4511c1 | 37-42 | ✅ DONE |
| W8 | b11e421 | 43-45 | ✅ DONE |

**✅ TRANSLATION COMPLETE:** 45/45 orations translated (1,166 paragraphs)

**Post-Translation:**
- ✅ Review agent (a87af3b) PASSED: see `docs/gregory-orations-quality-review-v3.md`
- 1,166 paragraphs with perfect alignment, theological terms correct, no truncation
- **Phase 1 COMPLETE**

**Phase 2 Processing (Additional Works):**
| Agent ID | Task | Status |
|----------|------|--------|
| a9ecfe8 | Process PDFs: Miscellanea → Dramatic → Carmina → Epistulae | ✅ COMPLETE |

**Phase 2 Processing Results:**
| Book | Collection | Chapters | Paragraphs |
|------|------------|----------|------------|
| 1 | Epistulae (Letters) | 244 | ~2,000+ |
| 2 | Carmina (Poetry) | 53 | ~500+ |
| 3 | Dramatic/Liturgical | 2 | 198 |
| 4 | Miscellanea | 3 | 12 |
| **Total** | | **302** | |

**Phase 2 Translation Workers (DeepSeek, grc-gregory prompt):**
| Worker | ID | Text | Chapters | Status |
|--------|-----|------|----------|--------|
| Misc | b20aa8d | gregory-miscellanea | 1-3 | ✅ DONE (3/3) |
| Drama | b429109 | gregory-dramatic | 1-2 | ✅ DONE (2/2, 198 para) |
| CarmW1 | b293133 | gregory-carmina | 1-27 | 🔄 RUNNING (ch 14, 23 skipped) |
| CarmW2 | b714ee4 | gregory-carmina | 28-53 | 🔄 RUNNING (ch 30, 38 skipped) |
| EpW1 | bac3978 | gregory-epistulae | 1-60 | ✅ DONE (60/60) |
| EpW2 | b211da6 | gregory-epistulae | 61-120 | ✅ DONE (60/60) |
| EpW3 | b589934 | gregory-epistulae | 121-180 | ✅ DONE (60/60) |
| EpW4 | bfe7795 | gregory-epistulae | 181-244 | ✅ DONE (64/64) |

**Completed:** 6/8 workers, 249/302 chapters translated

### ✅ CARMINA REPROCESSING COMPLETE

**Problem (resolved):** All 53 Carmina chapters were stored as SINGLE PARAGRAPHS (no line breaks).

**Resolution (2026-02-05):**
1. All Carmina data DELETED from database (translations + chapters)
2. JSON files removed from `data/processed/gregory-carmina/`
3. New processor created: `scripts/process-carmina-de-se-ipso.py`
4. Autonomous subagent reprocessed, reviewed, seeded, and translated

**Final Results:**
- **77 chapters** (properly segmented from Greek numeral markers)
- **219 paragraphs** (1-31 per chapter, appropriate for poetry)
- **Quality Grade:** B+ (clean polytonic Greek, Migne column numbers as reference)
- **Translation:** 77/77 complete (0 errors)

**Carmina Reprocessing Agent:**
| Agent ID | Task | Status |
|----------|------|--------|
| ac39396 | Full Carmina pipeline (process → review → seed → translate) | ✅ COMPLETE (77ch, 219 para, B+) |

**Browse Page Fix:**
| Agent ID | Task | Status |
|----------|------|--------|
| a58afc3 | Fix Gregory total_chapters in texts table | ✅ COMPLETE (3 texts fixed) |

### Phase 2: Additional Works (PENDING — after orations complete)

| Book | Slug | Contents | Chapters |
|------|------|----------|----------|
| 1 | `gregory-epistulae` | 244+ Letters | 1 per letter |
| 2 | `gregory-carmina` | Poetry collections | 1 per poem |
| 3 | `gregory-dramatic` | Christus Patiens + Liturgica | By section |
| 4 | `gregory-miscellanea` | Testamentum + misc | By work |

### Translation Prompt: `grc-gregory`

Specialized prompt for Gregory's rhetorical style, preserving:
- Complex periodic sentences and antithesis
- Technical theological vocabulary (οὐσία, ὑπόστασις, ὁμοούσιος)
- Biblical quotations and allusions
- Paradox and apophatic language
- Invective rhetorical force

### Documentation

- `docs/gregory-nazianzus-workflow.md` — Full workflow plan
- `docs/gregory-greekdownloads-inventory.md` — PDF inventory
- `docs/gregory-multi-source-plan.md` — Source investigation report

### Progress Checklist

**Phase 1 (Orations):**
- [x] Source PDFs downloaded (63 files)
- [x] PDF extraction complete
- [x] Quality review passed (B+)
- [x] Seeding complete (45 chapters)
- [x] Translation complete (45/45)

**Phase 2 (Additional Works):**
- [ ] Epistulae processed
- [ ] Carmina processed
- [ ] Dramatic/Liturgical processed
- [ ] Miscellanea processed

---

## Active — Ruyi Jun Zhuan (如意君傳) Pipeline

| Agent ID | Task | Status |
|----------|------|--------|
| a60ba00 | Ruyi Jun Zhuan full pipeline (process + seed + translate) | **STALLED** (post-verification) |

**Text:** 如意君傳 (Ruyi Jun Zhuan / The Lord of Perfect Satisfaction)
**Author:** Possibly 徐昌齡 (Xu Changling) or Huang Xun (黃訓); Ming dynasty, c. 1524-1529
**Source:** zh.wikisource.org/zh-hant/如意君傳
**Genre:** literature (erotic novella)
**Content:** ~45 pages, Classical Chinese with some vernacular dialogue
**Historical Note:** Considered the first Chinese pornographic novel; influenced erotic fiction for 100+ years

**⚠️ CONTENT WARNING REQUIRED:**
When seeding is complete, the text description MUST include:
> **Content Note:** This text contains explicit sexual content. It is included for its historical and literary significance as a representative work of Ming dynasty erotic fiction.

**Prepared Description for seed-db.ts:**
```
A Ming dynasty erotic novella set in the Tang dynasty, chronicling Empress Wu Zetian's
rise to power alongside her romantic liaisons, particularly with the fictional Xue Aocao,
who receives the title 'Lord of Perfect Satisfaction' (如意君). Written predominantly in
Classical Chinese with vernacular dialogue, the text extensively quotes from historical
and philosophical works including the Records of the Grand Historian, the Mencius, and the
Classic of Poetry. Considered by some scholars as the first Chinese pornographic novel,
it profoundly influenced subsequent erotic fiction for over a century. **Content Note:**
This text contains explicit sexual content. It is included for its historical and literary
significance as a representative work of Ming dynasty erotic fiction.
```

**Pipeline Status:**
- Phase 1 (Verification): ✅ COMPLETE — agent found text on Wikisource; English translation exists (Charles Stone, 1995)
- Phase 2 (Processing): PENDING — agent stalled at 2026-02-05T01:23:28Z after WebSearch
- Phase 3 (Quality Review): PENDING
- Phase 4 (Seeding): PENDING — will need content warning in description
- Phase 5 (Translation): PENDING — use `zh-literary` prompt

**Agent Recovery:** If agent remains stalled, manually complete processing:
1. Use HTML at `/tmp/ruyi-raw.html` (already downloaded)
2. Create processing script to extract paragraphs
3. Seed with content warning description above

---

## Completed — Tamil Batch Pipeline (All Phases) ✓

| Agent ID | Task | Status |
|----------|------|--------|
| aeba3f7 | Tamil text verification (20 candidates) | **COMPLETE** ✓ 6 viable |
| a65c93f | Tamil text processing (6 texts) | **COMPLETE** ✓ 21 chapters |
| a410c9f | Tamil quality review | **COMPLETE** ✓ All Grade A (1 fix applied) |
| — | Tamil seeding (5 authors, 6 texts) | **COMPLETE** ✓ 21 chapters |
| a9f3425 | Tamil translation (Gemini) | **COMPLETE** ✓ 21/21 chapters |

**Texts:**
| Text | Chapters | Verses | Status |
|------|----------|--------|--------|
| nalavenba | 4 | 399 | ✓ |
| moovarul | 3 | 1,119 | ✓ |
| takka-yaaga-parani | 9 | 867 | ✓ |
| nanneri | 1 | 41 | ✓ |
| dandi-alankaram | 3 | 126 | ✓ |
| bharata-senapathiyam | 1 | 66 | ✓ |

**Total: 6 texts, 21 chapters, ~2,618 verses — ALL TRANSLATED**

**Notes:**
- Used Gemini 2.5 Flash (per user directive: Tamil uses Gemini)
- Texts are medieval/classical Tamil poetry (10th-18th century CE)
- Two works by Ottakoothar (12th century Chola court poet)
- 13 chapters newly translated, 8 chapters already done from prior session

---

## Completed — Latin Pipeline Batch 3 (All Phases) ✓

| Agent ID | Task | Status |
|----------|------|--------|
| a4aeda2 | Latin B3 verification (16 candidates) | **COMPLETE** ✓ 10 viable, 6 not viable |
| ab53cac | Latin B3 processing (9 small texts) | **COMPLETE** ✓ 25ch, 496 para |
| ae7e32e | Latin B3 processing (De vita 132ch) | **DEFERRED** — tri-lingual interleaving in 1886 edition |
| aeb8c84 | Latin B3 quality review | **COMPLETE** ✓ 8 Grade A, 1 Grade C (cleanup done) |
| — | Latin B3 seeding (7 authors, 9 texts) | **COMPLETE** ✓ 25 chapters |
| a08f383 | Latin B3 translation (9 texts) | **COMPLETE** ✓ 9ch newly translated, 16 already done |
| a5ce9c7 | Latin B3 description review | **COMPLETE** ✓ 7 descriptions improved |
| a27f16c | Analecta Laertiana reprocessing | **COMPLETE** ✓ 1ch → 5ch, retranslated |

**Texts in Latin Batch 3:**
| Text | Author | Chapters | Status |
|------|--------|----------|--------|
| de-generatione-stellarum | Grosseteste | 1 | ✓ |
| de-lunarium-montium | Borelli | 1 | ✓ |
| dianoia-astronomica | Sizzi | 1 | ✓ |
| de-quindecim-problematibus | Albertus Magnus | 15 | ✓ (already done B1) |
| de-quinque-essentiis | Al-Kindi | 1 | ✓ |
| expositiones-theologicae | Abelard | 3 | ✓ |
| epistola-apologetica | Roffeni | 1 | ✓ |
| de-motu-corporali-et-luce | Grosseteste | 1 | ✓ |
| de-phoenomenis-lunae | Lagalla | 2 | ✓ |
| analecta-laertiana | Nietzsche | 5 | ✓ (reprocessed from 1ch) |

**Deferred:** De vita et moribus philosophorum (pseudo-Burley) — 132 biographies in Knust 1886 edition interleave Latin/Spanish/German on every page, making OCR unusable. User will find cleaner source.

**Gap Check: 25/25 chapters translated (100%) — LATIN BATCH 3 COMPLETE**

---

## Completed — Latin Pipeline Batch 2 (All Phases) ✓

| Agent ID | Task | Status |
|----------|------|--------|
| a7d765b | Latin text verification (20 candidates) | **COMPLETE** ✓ 14 viable, 6 not viable |
| a8ae340 | Latin text processing (14 texts) | **COMPLETE** ✓ 1,013 para |
| — | Latin seeding (14 texts, 14 chapters) | **COMPLETE** ✓ |
| a0dc22e | Latin Batch 2 translation (14 texts) | **STOPPED** — quality issues found |
| a1fad77 | Latin Batch 2 quality review | **COMPLETE** ✓ 11 PASS, 2 cleanup, 1 defer |
| af5e0ae | Latin Batch 2 segmentation review | **COMPLETE** ✓ 5 must split, 3 optional |
| — | Latin cleanup (2 texts) + resegmentation (5 chronicles) | **COMPLETE** ✓ |
| — | Latin re-seeding (102 chapters across 14 texts) | **COMPLETE** ✓ |

**Translation Workers (Phase 7) — ALL COMPLETE:**
| Worker | Agent ID | Texts | Chapters | Status |
|--------|----------|-------|----------|--------|
| W1 | ab4aca6 | 8 single-ch texts | 8 | **COMPLETE** ✓ |
| W2 | a1f7cf7 | brevis-historia-regum-dacie | 21 | **COMPLETE** ✓ |
| W3 | a1684c1 | chronicon-neapolitanum + chronicon-beneventanum | 18 | **COMPLETE** ✓ |
| W4 | acd14c3 | chronicon-lusitanum + breve-chronicon-northmannicum | 11 | **COMPLETE** ✓ |

**Gap Check: 102/102 chapters translated (100%) — LATIN BATCH 2 COMPLETE**

## Completed — De' sorbetti Translation

| Agent ID | Task | Status |
|----------|------|--------|
| a33924a | De' sorbetti translation | **COMPLETE** ✓ |

---

## Completed — Russian Pipeline (All Phases) ✓

| Worker | Agent ID | Text | Chapters | Status |
|--------|----------|------|----------|--------|
| — | — | vizantizm-i-slavyanstvo | 12 | **COMPLETE** ✓ |
| W1 | a5fcfe0 | melochi-arkhiyereyskoy-zhizni | 17 | **COMPLETE** ✓ |
| W2 | a95e467 | okolo-tserkovnykh-sten | 50 | **COMPLETE** ✓ |
| W3 | ad8ddf4 | nauka-o-cheloveke | 15 | **COMPLETE** ✓ |
| W4 | a2d654e | puteshestviye-ko-svyatym-mestam | 69 | **COMPLETE** ✓ |
| W5 | a771736 | bogomater | 25 | **COMPLETE** ✓ |
| W6 | a2016dd | posledniye-dni-zemnoy-zhizni | 29 | **COMPLETE** ✓ |
| W7 | ac6804b | lektsii-po-istorii-drevney-tserkvi | 18 | **COMPLETE** ✓ |

**Gap Check: 235/235 chapters translated (100%) — RUSSIAN PIPELINE COMPLETE**
**Prompt:** `ru` (19th-century Russian prose)

---

## Completed This Session (42)

| Agent/Worker | Task | Notes |
|--------------|------|-------|
| ad5cd3c | Modern Greek translation (3 texts) | 15ch, ~1,147 para, 0 errors ✓ |
| a7c5d41 | Byzantine Greek translation (4 texts) | 5ch, ~1,270 para, 0 errors ✓ |
| ad078e5 | Russian verification (25 texts) | 9 viable, 16 not viable ✓ |
| a8db89b | Russian Processor A (Wikisource, 4 texts) | 148ch, 3,817 para ✓ |
| a3531a2 | Russian Processor B (azbyka.ru, 4 texts) | 87ch, 7,085 para ✓ |
| a68f64c | Russian quality review (8 texts) | 5 pass, 3 need fixes ✓ |
| a989eaa | Russian quality fixes (3 texts) | All fixed ✓ |
| — | Russian seeding (8 texts) | 235ch seeded, IDs 167-174 ✓ |
| — | Russian translation prompt (`ru`) | Added to prompts.ts ✓ |
| W1-W7 | Russian translation (7 workers) | 235/235 chapters, 0 errors ✓ |
| W1-W4 | Latin Batch 2 translation (4 workers) | 102/102 chapters, 0 errors ✓ |
| a33924a | De' sorbetti translation | 1 text complete ✓ |

---

## Completed Previous Session (41)

| Agent/Worker | Task | Notes |
|--------------|------|-------|
| ac4cb45 | Polish W7: bene-nati + general-barcz + cham | 20/20 translated |
| — | Polish pipeline gap-check | 231/231 COMPLETE ✓ |
| a7e95bf | Add "All Languages" browse option | COMPLETE |
| — | Homepage highlights section | Created, refined 3x, committed |
| aa1c840 | Italian Processor A (4 texts) | 51ch, 1871 para |
| ab3dad5 | Italian Processor B (4 texts) | 102ch, 4595 para |
| aeae5e6 | Italian Quality Review (8 texts) | 2 PASS, 5 fixable, 1 dead |
| aea616e | Italian cleanup (5 texts) | All cleaned to grade A |
| a695c8b | Italian re-review (5 texts) | All PASS grade A |
| a6512a1 | Italian seeding (7 texts) | 147ch seeded |
| a5e33d1 | Apply blurb updates to database | ~138 descriptions updated |
| a99a299 | Add English to chapter titles | ~2,087 titles updated |
| abb82f1 | Verify 15 Italian text candidates | 8/15 viable |
| a488bdb | Latin verification | 4/5 viable |
| a67a0b1 | Greek verification | 4/12 viable |
| ac176b2 | Czech verification | 1 viable |
| ab15421 | Gujarati verification | 1 viable |
| a1a766d | Telugu verification | 1 viable |
| a411be4 | Turkish verification | 1 viable |
| a3ed850 | Telugu processing | 116 verse files created ✓ |
| bcbdba4 | Italian W3b (dio-ne-scampi) | 25/25 translated ✓ |
| ac7dbc2 | Telugu merge + seed + translate | 116 verses merged → 1 chapter, translated ✓ |
| af1bad2 | Czech seeding + translation launch | 14ch seeded, translation complete ✓ |
| ab3a1a7 | Latin+Greek translation (4 texts) | 18ch, 145 para translated ✓ |
| be6daa5 | Czech translation | 14ch translated ✓ |
| b9222db | Italian W1 (confessioni 1-32) | 32/32 translated ✓ |
| b7fb5c7 | Italian W4 (la-filosofia + 3 texts) | 29/31 translated (2 empty) ✓ |

---

## Active Pipelines

### Polish Pipeline — COMPLETE ✓
- **11 texts, 231/231 chapters translated**

### Armenian Pipeline — COMPLETE ✓
- **1 text (Payqar), 18/18 chapters translated**

### Italian Pipeline — ~92% COMPLETE (Phase 6: Translation)
- **7 texts, 147 chapters total** (de-sorbetti abandoned)
- **Translation:** ~135/147 done. W2 and W3a finishing final chapters.
- confessioni: 61/64, del-rinnovamento: 15/27, dio-ne-scampi: 25/25, la-filosofia: 18/20 (2 empty), la-psicologia: 5/5, psicologia-delle-menti: 5/5, saggio: 1/1

### Latin Pipeline (Batch 1) — COMPLETE ✓
- **2 clean texts translated:** Phosphori (1ch), De Quindecim (15ch)
- **2 OCR texts deferred:** Turris Babel (56ch), Mundus (198ch) — need cleaning pipeline

### Latin Pipeline (Batch 2) — COMPLETE ✓
- **14 texts, 102/102 chapters translated**
- **1 deferred:** brevis-historia-regum-dacie (severe contamination)

### Latin Pipeline (Batch 3) — COMPLETE ✓
- **9 texts, 25/25 chapters translated**
- **1 deferred:** De vita et moribus philosophorum (tri-lingual OCR issue)
- **Texts:** Grosseteste (2), Borelli, Sizzi, Al-Kindi, Abelard (3ch), Roffeni, Lagalla (2ch), Nietzsche (5ch)
- **Analecta Laertiana reprocessed:** 1 chapter → 5 chapters (proper Nietzsche section boundaries)

### Russian Pipeline — COMPLETE ✓
- **8 texts, 235/235 chapters translated**

### Greek Pipeline — COMPLETE ✓
- **10 texts translated:** 7 Byzantine + 3 modern Greek
- George of Pisidia texts inaccessible (PG 92 not digitized)

### Czech Pipeline — COMPLETE ✓
- **1 text** (Nový epochální výlet pana Broučka, 14ch) — translated

### Telugu Pipeline — COMPLETE ✓
- **1 text** (Sri Kalahasteeswara Satakam, 116 verses in 1 chapter) — translated

### Tamil Pipeline (New Batch) — COMPLETE ✓
- **6 texts, 21/21 chapters translated** via Gemini 2.5 Flash
- Nalavenba (4ch), Moovarul (3ch), Takka Yaaga Parani (9ch), Nanneri (1ch), Dandi Alankaram (3ch), Bharata Senapathiyam (1ch)
- Previous 5 Tamil texts already complete (Porunararruppadai, Nandikkalambakam, etc.)

### Chinese Mass Pipeline — COMPLETE (99.94%)
- **Known gaps:** mengliang-lu ch 18, 20 (giant paragraphs, DeepSeek limitation)

### Gujarati Pipeline — BLOCKED (Phase 2)
- Source text behind login walls. Needs headless browser or manual download.

### Turkish Pipeline — BLOCKED (Phase 2)
- Source text in PDF only. Needs PDF extraction.

---

## Critical Bugs / Warnings

### Yashodhara Kaviyam Commentary Contamination (CRITICAL)
**Problem:** Commentary contamination in chapters 3-5
**Status:** Not yet fixed.
