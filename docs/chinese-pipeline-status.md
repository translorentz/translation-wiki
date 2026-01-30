# Chinese Pipeline Status

**Last updated:** 2026-01-29, Session 35

## Summary

- **50 texts** verified as genuinely untranslated into English
- **49 texts** scraped from zh.wikisource.org (1 not available)
- **1,719 chapters** processed into chapter JSONs
- **44 READY** for seeding + translation
- **5 PARTIAL** (Wikisource has incomplete text)
- **1 FAILED** (型世言 not on Wikisource)

## Known Issues

| Issue | Texts Affected | Fix |
|-------|---------------|-----|
| xiaoting-zalu missing 續錄 | 1 | Scrape 嘯亭續錄/卷一 through 卷五 (5 more chapters) |
| xingshi-yan not on Wikisource | 1 | Drop from pipeline |
| Partial texts on Wikisource | 5 | Translate what's available |

## Full Catalogue

### READY (44 texts, 1,614 chapters)

| # | Slug | Title | Chapters | Genre | Processor |
|---|------|-------|----------|-------|-----------|
| 1 | huayue-hen | Traces of Flowers and the Moon (Huayue Hen) | 52 | literature | A |
| 2 | sui-tang-yanyi | Romance of the Sui and Tang Dynasties (Sui Tang Yanyi) | 100 | literature | A |
| 3 | taoan-mengyi | Dream Memories of Tao'an (Taoan Mengyi) | 12 | literature | A |
| 4 | xianqing-ouji | Random Thoughts on Idle Pleasures (Xianqing Ouji) | 38 | criticism | A |
| 5 | xiaolin-guangji | Expanded Records of the Forest of Laughter (Xiaolin Guangji) | 12 | literature | A |
| 6 | suiyuan-shihua | Random Notes on Poetry from the Sui Garden (Suiyuan Shihua) | 16 | criticism | A |
| 7 | shipin | Grades of Poetry (Shipin) | 3 | criticism | A |
| 8 | kunxue-jiwen | Records of Learning Difficulties (Kunxue Jiwen) | 20 | philosophy | A |
| 9 | laoxuean-biji | Notes from the Old Scholar's Studio (Laoxuean Biji) | 10 | history | A |
| 10 | dongjing-menghua-lu | Dreams of Splendor of the Eastern Capital (Dongjing Menghua Lu) | 10 | history | A |
| 11 | chibei-outan | Random Talks North of the Pond (Chibei Outan) | 27 | history | A |
| 12 | shuijing-zhu | Commentary on the Waterways Classic (Shuijing Zhu) | 40 | geography | A |
| 13 | fenshu | A Book to Burn (Fenshu) | 7 | philosophy | A |
| 14 | youyang-zazu | Miscellaneous Morsels from Youyang (Youyang Zazu) | 31 | history | A |
| 15 | mingru-xuean | Records of Ming Scholars (Mingru Xuean) | 62 | philosophy | B |
| 16 | yuewei-caotang-biji | Random Jottings at the Cottage of Close Scrutiny (Yuewei Caotang Biji) | 24 | literature | B |
| 17 | yesou-puyan | An Old Rustic's Idle Talk (Yesou Puyan) | 154 | literature | B |
| 18 | qilu-deng | Lamp at the Crossroads (Qilu Deng) | 108 | literature | B |
| 19 | sanxia-wuyi | Three Heroes and Five Gallants (Sanxia Wuyi) | 120 | literature | B |
| 20 | niehai-hua | A Flower in a Sea of Sin (Niehai Hua) | 35 | literature | B |
| 21 | feilong-quanzhuan | Complete Tale of the Flying Dragon (Feilong Quanzhuan) | 60 | literature | B |
| 22 | nuxian-waishi | Unofficial History of the Female Immortals (Nuxian Waishi) | 99 | literature | B |
| 23 | yuchu-xinzhi | New Records of Yu Chu (Yuchu Xinzhi) | 20 | literature | B |
| 24 | hedian | What Canon? (Hedian) | 10 | literature | B |
| 25 | mengliang-lu | Record of the Millet Dream (Mengliang Lu) | 20 | history | B |
| 26 | wulin-jiushi | Past Events of Wulin (Wulin Jiushi) | 9 | history | B |
| 27 | qidong-yeyu | Rustic Words from East of Qi (Qidong Yeyu) | 20 | history | B |
| 28 | helin-yulu | Jade Dew from the Crane Forest (Helin Yulu) | 19 | history | B |
| 29 | sushui-jiwen | Records Heard by the Si River (Sushui Jiwen) | 16 | history | C |
| 30 | tang-zhiyan | Gathered Words of the Tang (Tang Zhiyan) | 15 | history | C |
| 31 | beimeng-suoyan | Trivial Tales from North of the Dreams (Beimeng Suoyan) | 25 | history | C |
| 32 | xijing-zaji | Miscellaneous Records of the Western Capital (Xijing Zaji) | 6 | history | C |
| 33 | yeyu-qiudeng-lu | Records by the Autumn Lamp on Rainy Nights (Yeyu Qiudeng Lu) | 12 | literature | C |
| 34 | wuzazu | Five Assorted Offerings (Wuzazu) | 16 | history | C |
| 35 | shiyi-ji | Records of Things Gleaned (Shiyi Ji) | 10 | literature | C |
| 36 | xihu-mengxun | Searching for West Lake in Dreams (Xihu Mengxun) | 7 | literature | C |
| 37 | zhinang | The Wisdom Sack (Zhinang) | 28 | philosophy | C |
| 38 | qingshi | History of Love (Qingshi) | 24 | literature | C |
| 39 | gaiyu-congkao | Studies at Leisure by the Staircase (Gaiyu Congkao) | 43 | history | C |
| 40 | tang-caizi-zhuan | Biographies of Talented Men of the Tang (Tang Caizi Zhuan) | 10 | criticism | C |
| 41 | gujin-tangai | Survey of Jokes Past and Present (Gujin Tangai) | 36 | literature | C |
| 42 | yehangchuan | The Night Ferry (Yehangchuan) | 20 | history | C |
| 43 | qijian-shisan-xia | Seven Swords and Thirteen Heroes (Qijian Shisan Xia) | 181 | literature | C |
| 44 | xiaoting-zalu | Random Records from the Whistling Pavilion (Xiaoting Zalu) | 10 | history | C |

### PARTIAL (5 texts, 105 chapters — Wikisource incomplete)

| Slug | Title | Actual | Expected | Notes |
|------|-------|--------|----------|-------|
| qianfu-lun | Comments of a Recluse | 14 | 36 | Wikisource has only 14 volumes |
| qimin-yaoshu | Essential Techniques for the Common People | 14 | 92 | Wikisource has only basic structure |
| rongzhai-suibi | Random Notes from the Rongzhai Studio | 17 | 74 | Only first collection (隨筆) on Wikisource |
| dangkou-zhi | Pacifying the Bandits | 34 | 70 | Only sequel portion (ch 71-135) available |
| luye-xianzong | Legendary Tale of the Green Wilds | 43 | 100 | Wikisource only has first 43 chapters |

### FAILED (1 text)

| Slug | Title | Reason |
|------|-------|--------|
| xingshi-yan | Model Words to Shape the World | Text does not exist on zh.wikisource.org |

## Pipeline Files

| File | Purpose |
|------|---------|
| `data/chinese-pipeline/verified-texts.json` | Master list of 50 verified texts |
| `data/chinese-pipeline/seed-entries-a.json` | Seed entries for Processor A texts (17 authors, 17 texts) |
| `data/chinese-pipeline/seed-entries-b.json` | Seed entries for Processor B texts (15 authors, 16 texts) |
| `data/chinese-pipeline/seed-entries-c.json` | Seed entries for Processor C texts (13 authors, 16 texts) |
| `scripts/chinese-pipeline/scraper-{a,b,c}.py` | Python scrapers |
| `scripts/chinese-pipeline/process-batch-{a,b,c}.ts` | TypeScript processors |

## Next Steps

1. Fix xiaoting-zalu (scrape missing 續錄 5 chapters)
2. Merge all seed entries into `scripts/seed-db.ts`
3. Run `pnpm tsx scripts/seed-db.ts` to seed all texts
4. Launch 3 translation workers
