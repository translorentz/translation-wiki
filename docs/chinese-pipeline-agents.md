# Chinese Mass Pipeline — Agent Registry

Complete record of every agent launched during the Chinese mass text pipeline (Sessions 35-36). This documents the full chain from research through translation, including agent IDs, responsibilities, outputs, and outcomes.

---

## Pipeline Summary

- **Texts:** 44 classical Chinese texts, 1,619 chapters
- **Source:** zh.wikisource.org
- **Sessions:** 35 (scraping/processing), 36 (review/seed/translate)
- **Total agents:** 21 (research: 4, processing: 4, review: 3, translation: 10)

---

## Phase 1: Research

### Agent: Chinese Wikisource 50-Text Research

| Field | Value |
|-------|-------|
| **Agent ID** | a3d9ef8 |
| **Type** | `general-purpose` with web search |
| **Session** | 35 |
| **Task** | Find 50 untranslated Chinese texts on zh.wikisource.org |
| **Output** | `docs/chinese-wikisource-candidates.md` |
| **Result** | 50 candidate texts identified with titles, authors, genres, chapter counts, Wikisource URLs |

---

## Phase 2: Verification

### Agent: Verifier (v2)

| Field | Value |
|-------|-------|
| **Agent ID** | a5d6e8a |
| **Type** | `general-purpose` with web search |
| **Session** | 35 |
| **Task** | Confirm each of the 50 candidates has no freely available complete English translation |
| **Output** | `docs/chinese-wikisource-verified.md`, `data/chinese-pipeline/verified-texts.json` |
| **Result** | 19/50 confirmed untranslated, 31 rejected (have translations or are stubs) |
| **Methodology** | Searched en.wikisource, Project Gutenberg, Internet Archive, Google Scholar, academic catalogs |

### Agent: Gap-Filler Research

| Field | Value |
|-------|-------|
| **Agent ID** | a4eeec2 |
| **Type** | `general-purpose` with web search |
| **Session** | 35 |
| **Task** | Find 31 more untranslated texts to replace rejected candidates (need total of 50) |
| **Output** | Updated `data/chinese-pipeline/verified-texts.json` |
| **Result** | Found 31 additional texts, bringing total to 50 verified texts |

---

## Phase 3: Scraping + Processing

Three parallel processors, each handling ~17 texts. Each processor scraped from zh.wikisource.org (Python + BeautifulSoup), processed into chapter JSONs, and generated seed entries.

### Processor A (Texts 1-17)

| Field | Value |
|-------|-------|
| **Agent ID** | a6a8f46 |
| **Type** | `general-purpose` |
| **Session** | 35 |
| **Texts** | huayue-hen, sui-tang-yanyi, taoan-mengyi, xianqing-ouji, xiaolin-guangji, suiyuan-shihua, shipin, kunxue-jiwen, laoxuean-biji, dongjing-menghua-lu, chibei-outan, shuijing-zhu, fenshu, youyang-zazu + 3 PARTIAL |
| **Output** | `data/processed/<slug>/`, `data/chinese-pipeline/seed-entries-a.json` |
| **Result** | 423 chapters processed, 14 READY + 3 PARTIAL |
| **Scraper** | `scripts/chinese-pipeline/scraper-a.py` |
| **Processor** | `scripts/chinese-pipeline/process-batch-a.ts` |

### Processor B (Texts 18-34)

| Field | Value |
|-------|-------|
| **Agent ID** | a2cec8f |
| **Type** | `general-purpose` |
| **Session** | 35 |
| **Texts** | mingru-xuean, yuewei-caotang-biji, yesou-puyan, qilu-deng, sanxia-wuyi, niehai-hua, feilong-quanzhuan, nuxian-waishi, yuchu-xinzhi, hedian, mengliang-lu, wulin-jiushi, qidong-yeyu, helin-yulu + 2 PARTIAL + 1 FAILED |
| **Output** | `data/processed/<slug>/`, `data/chinese-pipeline/seed-entries-b.json` |
| **Result** | 837 chapters processed, 13 READY + 2 PARTIAL + 1 FAILED (xingshi-yan) |
| **Scraper** | `scripts/chinese-pipeline/scraper-b.py` |
| **Processor** | `scripts/chinese-pipeline/process-batch-b.ts` |

### Processor C (Texts 35-50)

| Field | Value |
|-------|-------|
| **Agent ID** | a0c96be |
| **Type** | `general-purpose` |
| **Session** | 35 |
| **Texts** | sushui-jiwen, tang-zhiyan, beimeng-suoyan, xijing-zaji, yeyu-qiudeng-lu, wuzazu, shiyi-ji, xihu-mengxun, zhinang, qingshi, gaiyu-congkao, tang-caizi-zhuan, gujin-tangai, yehangchuan, qijian-shisan-xia, xiaoting-zalu |
| **Output** | `data/processed/<slug>/`, `data/chinese-pipeline/seed-entries-c.json` |
| **Result** | 459 chapters scraped, 16 texts processed |
| **Scraper** | `scripts/chinese-pipeline/scraper-c.py` |
| **Processor** | `scripts/chinese-pipeline/process-batch-c.ts` |

### Processor C Discrepancy Audit

| Field | Value |
|-------|-------|
| **Agent ID** | a20d6f9 |
| **Type** | `general-purpose` |
| **Session** | 35 |
| **Task** | Audit 5 texts where Processor C's scraped chapter count didn't match expected |
| **Result** | 4/5 genuine (Wikisource incomplete), 1 bug: xiaoting-zalu missing 續錄 (5 chapters) |

### Xiaoting-zalu Fix

| Field | Value |
|-------|-------|
| **Agent ID** | ad861ef |
| **Type** | `general-purpose` |
| **Session** | 36 |
| **Task** | Scrape missing 續錄 (5 chapters) for xiaoting-zalu |
| **Output** | `data/processed/xiaoting-zalu/chapter-011.json` through `chapter-015.json` |
| **Result** | 5 續錄 chapters scraped, total updated to 15 chapters |
| **Scraper** | `scripts/scrape-xiaoting-xulu.py` |

---

## Phase 4: Quality Review

### Agent: Quality Review

| Field | Value |
|-------|-------|
| **Agent ID** | a72ad61 |
| **Type** | `general-purpose` (independent — NOT a processor agent) |
| **Session** | 36 |
| **Task** | Validate all 44 READY texts' processed JSONs for correctness |
| **Output** | `/tmp/chinese-review-report.md` |
| **Result** | **44/44 PASS**. Two minor flags: gaiyu-congkao ch.22 has short section headings (legitimate), tang-caizi-zhuan ch.10 has short poet names (legitimate). Both confirmed as correct content, not bugs. |
| **Checks performed** | File counts, JSON structure, sequential paragraph indices, non-empty content, CJK presence, no HTML contamination, title fields, chapter continuity |

---

## Phase 5: Translation Verification

### Agent: Translation Check

| Field | Value |
|-------|-------|
| **Agent ID** | ad29ba7 |
| **Type** | `general-purpose` with web search |
| **Session** | 36 |
| **Task** | Second-pass verification that none of the 44 texts have freely available complete English translations |
| **Output** | `/tmp/chinese-translation-check.md` |
| **Result** | **0/44 disqualified** (under original criteria). 2 flagged for awareness: sui-tang-yanyi (Saric Kindle), sanxia-wuyi (abridged IA lending) |
| **Methodology** | Searched Google, en.wikisource, Project Gutenberg, Internet Archive, ctext.org for each text |

### Agent: Saric Translation Check (follow-up)

| Field | Value |
|-------|-------|
| **Agent ID** | ad90bcb |
| **Type** | `general-purpose` with web search (haiku model) |
| **Session** | 36 |
| **Task** | Check whether Valentin Saric's Kindle translations are complete editions |
| **Output** | `/tmp/saric-check.md` |
| **Result** | Found 3 complete Saric translations: sui-tang-yanyi, xijing-zaji, dongjing-menghua-lu. Initially flagged for disqualification, but user reviewed Saric quality and determined all 3 should remain (Kindle self-published translations do not disqualify). |
| **Policy outcome** | Disqualification criteria revised: self-published Kindle translations (poor quality) do NOT disqualify a text. Only scholarly/academic press translations disqualify. |

---

## Phase 6: Seeding

No dedicated agent — performed by the main session orchestrator.

| Step | Details |
|------|---------|
| **Merge script** | `scripts/merge-chinese-seeds.ts` — combines seed-entries-{a,b,c}.json |
| **Deduplication** | feng-menglong (already in DB), zhang-dai (in both A and C) |
| **Exclusions** | 5 PARTIAL texts (qianfu-lun, qimin-yaoshu, rongzhai-suibi, dangkou-zhi, luye-xianzong), 1 FAILED (xingshi-yan) |
| **Insertion** | 43 new authors + 44 new texts added to `scripts/seed-db.ts` |
| **Seeding** | `pnpm tsx scripts/seed-db.ts` — 44 texts, 1,619 chapters inserted |
| **Verification** | Type-check passed, seeding output confirmed correct counts |

---

## Phase 7: Translation

Ten parallel workers translating via DeepSeek V3 (`deepseek-chat`). Workers use `translate-batch.ts` which auto-selects prompts based on genre: `zh-literary` for literature/history, `zh` for philosophy/criticism, `zh-science` for science.

### Worker 1

| Field | Value |
|-------|-------|
| **Agent ID** | aac39b1 |
| **Session** | 36 |
| **Texts** | qijian-shisan-xia (181), shipin (3), fenshu (7), xihu-mengxun (7), hedian (10), shiyi-ji (10) |
| **Total chapters** | 218 |
| **Status** | RUNNING |

### Worker 2

| Field | Value |
|-------|-------|
| **Agent ID** | a3d120e |
| **Session** | 36 |
| **Texts** | yesou-puyan (154), niehai-hua (35), tang-caizi-zhuan (10), wulin-jiushi (9) |
| **Total chapters** | 208 |
| **Status** | RUNNING |

### Worker 3

| Field | Value |
|-------|-------|
| **Agent ID** | a044f62 |
| **Session** | 36 |
| **Texts** | sanxia-wuyi (120), shuijing-zhu (40), xianqing-ouji (38), xiaolin-guangji (12) |
| **Total chapters** | 210 |
| **Status** | RUNNING |

### Worker 4

| Field | Value |
|-------|-------|
| **Agent ID** | a5baf62 |
| **Session** | 36 |
| **Texts** | qilu-deng (108), huayue-hen (52), gaiyu-congkao (43), laoxuean-biji (10) |
| **Total chapters** | 213 |
| **Status** | RUNNING |

### Worker 5

| Field | Value |
|-------|-------|
| **Agent ID** | a5c6cce |
| **Session** | 36 |
| **Texts** | nuxian-waishi (99), mingru-xuean (62), chibei-outan (27), taoan-mengyi (12), suiyuan-shihua (16) |
| **Total chapters** | 216 |
| **Status** | RUNNING |

### Worker 6

| Field | Value |
|-------|-------|
| **Agent ID** | a4acb39 |
| **Session** | 36 |
| **Texts** | feilong-quanzhuan (60), gujin-tangai (36), youyang-zazu (31), zhinang (28), beimeng-suoyan (25), qingshi (24), yeyu-qiudeng-lu (12) |
| **Total chapters** | 216 |
| **Status** | Agent COMPLETE (background bash process still running). At 26/60 feilong-quanzhuan when agent timed out. W9 launched to cover tail texts. |

### Worker 7

| Field | Value |
|-------|-------|
| **Agent ID** | a2ff6bf |
| **Session** | 36 |
| **Texts** | yuewei-caotang-biji (24), yuchu-xinzhi (20), kunxue-jiwen (20), mengliang-lu (20), qidong-yeyu (20), yehangchuan (20), helin-yulu (19), sushui-jiwen (16), wuzazu (16), tang-zhiyan (15), xiaoting-zalu (15) |
| **Total chapters** | 205 |
| **Status** | RUNNING. W10 launched to cover tail texts. |

### Worker 8 (Saric texts)

| Field | Value |
|-------|-------|
| **Agent ID** | a249ccd |
| **Session** | 36 |
| **Texts** | sui-tang-yanyi (100), dongjing-menghua-lu (10), xijing-zaji (6) |
| **Total chapters** | 116 |
| **Status** | RUNNING |
| **Note** | These 3 texts were initially excluded (Saric Kindle translations found), then re-included after user reviewed Saric quality and revised disqualification policy. |

### Worker 9 (reinforcement for W6)

| Field | Value |
|-------|-------|
| **Agent ID** | a6571a7 |
| **Session** | 36 |
| **Texts** | gujin-tangai (36), youyang-zazu (31), zhinang (28), beimeng-suoyan (25), qingshi (24), yeyu-qiudeng-lu (12) |
| **Total chapters** | 156 |
| **Status** | RUNNING |
| **Note** | Picks up W6's later texts. Skip logic handles overlap if W6's background process reaches them first. |

### Worker 10 (reinforcement for W7)

| Field | Value |
|-------|-------|
| **Agent ID** | ad60212 |
| **Session** | 36 |
| **Texts** | yehangchuan (20), helin-yulu (19), sushui-jiwen (16), wuzazu (16), tang-zhiyan (15), xiaoting-zalu (15) |
| **Total chapters** | 101 |
| **Status** | RUNNING |
| **Note** | Picks up W7's later texts. Skip logic handles overlap. |

---

## Agent Dependency Chain

```
Phase 1: a3d9ef8 (Research)
    │
Phase 2: a5d6e8a (Verifier) ──→ a4eeec2 (Gap-Filler)
    │
Phase 3: a6a8f46 (Proc A) ┐
          a2cec8f (Proc B) ├──→ a20d6f9 (Audit) ──→ ad861ef (Fix)
          a0c96be (Proc C) ┘
    │
Phase 4: a72ad61 (Quality Review) ─────────┐
Phase 5: ad29ba7 (Translation Check) ──→ ad90bcb (Saric Check) ──┤
    │                                                              │
Phase 6: [Main session — merge + seed]  ◄──────────────────────────┘
    │
Phase 7: aac39b1 (W1)  ┐
         a3d120e (W2)   │
         a044f62 (W3)   │
         a5baf62 (W4)   │
         a5c6cce (W5)   ├── 10 parallel translation workers
         a4acb39 (W6)   │
         a2ff6bf (W7)   │
         a249ccd (W8)   │
         a6571a7 (W9)   │
         ad60212 (W10)  ┘
```

---

## Key Decisions Made During Pipeline

1. **Texts 1-50 → 44 READY:** 5 texts had incomplete Wikisource content (PARTIAL), 1 text not on Wikisource (FAILED). These were excluded from seeding.

2. **Xiaoting-zalu fix:** Processor C missed the 續錄 (supplementary records) section. A dedicated fix agent scraped the 5 missing chapters.

3. **Saric disqualification reversal:** Initially 3 texts were flagged for disqualification (Valentin Saric's Kindle translations). User reviewed Saric quality, found it poor, and revised policy: self-published Kindle translations do not disqualify. All 3 texts re-included.

4. **W9/W10 reinforcement:** W6's agent timed out while its background bash process continued. W9 and W10 launched to cover tail texts from W6 and W7 queues, with skip logic preventing duplicate work.

5. **Genre → prompt mapping:** Literature/history texts use `zh-literary`, philosophy/criticism use `zh`, science uses `zh-science`. Geography (shuijing-zhu) falls through to `zh` which is acceptable.
