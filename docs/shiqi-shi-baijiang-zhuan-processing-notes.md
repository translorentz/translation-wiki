# Shiqi Shi Baijiang Zhuan Processing Notes

## Text Information

- **Title (English):** Biographies of One Hundred Generals (Shiqi Shi Baijiang Zhuan)
- **Title (Chinese):** 十七史百將傳
- **Author:** Zhang Yu (張預)
- **Era:** Northern Song Dynasty (c. 1072 CE, reign of Emperor Shenzong)
- **Genre:** History (military biographies)
- **Language:** Classical Chinese (文言文)

## Structure

- **Volumes:** 10
- **Chapters:** 100 (10 generals per volume)
- **Character count:** ~120,000 characters

Each chapter follows a consistent format:
1. **Title line:** Dynasty prefix + General's name (e.g., 周齊太公, 前漢張良, 唐·李靖)
2. **Biography:** Historical narrative drawn from the seventeen standard histories
3. **Commentary:** Citation from Sun Tzu's Art of War (孫子曰...) connecting the general's tactics to classical military theory

## Source Files

- **Raw directory:** `data/raw/shiqi_shi_baijiang_zhuan/`
- **Files:** `Volume_01.txt` through `Volume_10.txt`
- **Encoding:** UTF-8
- **Character variants:** Mixed traditional (volumes 1, 9) and simplified (volumes 2-8, 10)

## Processing Script

**Script:** `scripts/process-shiqi-shi-baijiang-zhuan.ts`

### Key Parsing Logic

The parser identifies general entries using two detection methods:

1. **Dynasty prefix detection:** Lines starting with known dynasty prefixes (周, 秦, 前漢, 後漢, 吳, 魏, 蜀, 晉, 隋, 唐, 宋, 陳, etc.)
2. **Length check:** Name lines are typically < 20 characters and don't contain biography-style markers like "者，"

Commentary sections are detected by lines starting with "孫子曰" or "孙子曰" (simplified variant).

### Dynasty Prefixes Recognized

```typescript
const DYNASTY_PREFIXES = [
  "周", "秦", "前漢", "前汉", "後漢", "后汉", "漢", "汉",
  "吳", "吴", "魏", "蜀", "趙", "赵", "燕", "齊", "齐",
  "晉", "晋", "前秦", "後秦", "前燕", "後燕", "北魏", "東魏", "西魏",
  "南朝宋", "南朝齊", "南朝梁", "南朝陳", "陳", "陈", "隋",
  "宋",  // Liu Song dynasty (420-479)
  "唐", "唐·", "後梁", "後唐", "後晉", "後漢", "後周",
  "五代", "梁", "越"
];
```

### Processing Issues Encountered

1. **Initial run found only 26 entries:** The regex was too simplistic for the varied entry header formats.

2. **Second run found 97 entries (missing 3):** Volume 7 uses "宋" (Liu Song dynasty) and "陳"/"陈" (Chen dynasty) prefixes that were missing from the initial prefix list.

3. **Final run found 100 entries:** After adding "宋" and "陈" to the dynasty prefix list.

## Output Format

**Output directory:** `data/processed/shiqi-shi-baijiang-zhuan/`
**Files:** `chapter-001.json` through `chapter-100.json`

Each JSON file contains:
```json
{
  "chapterNumber": 1,
  "title": "周齊太公",
  "sourceContent": {
    "paragraphs": [
      { "index": 0, "text": "周齊太公" },
      { "index": 1, "text": "太公望呂尚者，東海上人..." },
      { "index": 2, "text": "孫子曰：「明君賢將能以上智為間者...」" }
    ]
  }
}
```

## Translation Prompt

Using the existing `zh-literary` prompt from `src/server/translation/prompts.ts`, which is appropriate for historical narrative prose with military terminology.

Key guidance from the prompt:
- Preserve narrative momentum
- Military terms: 兵 troops, 車 chariots, 師 army
- Maintain classical register while ensuring readability

## Database Entries

### Author
- **Name:** Zhang Yu
- **Slug:** `zhang-yu`
- **Era:** Northern Song Dynasty (fl. c. 1072)

### Text
- **Slug:** `shiqi-shi-baijiang-zhuan`
- **Language:** zh
- **Composition Year:** 1072
- **Genre:** history

## Translation Status

Translation launched on 2026-01-28 using:
```bash
pnpm tsx scripts/translate-batch.ts --text shiqi-shi-baijiang-zhuan --delay 6000
```

## Historical Context

The Seventeen Histories (十七史) referenced in the title are the seventeen standard histories from the Book of Han (漢書) through the Old History of the Five Dynasties (舊五代史), covering Chinese history from the Qin through Five Dynasties periods. Zhang Yu compiled this anthology to demonstrate how the principles of Sun Tzu's Art of War were applied by the greatest generals throughout Chinese history.

The 100 generals span:
- **Zhou dynasty:** Jiang Ziya (太公)
- **Spring and Autumn / Warring States:** Sun Wu, Wu Qi, Bai Qi, Wang Jian
- **Qin-Han:** Zhang Liang, Han Xin, Wei Qing, Huo Qubing
- **Three Kingdoms:** Zhuge Liang, Guan Yu, Zhang Fei, Zhou Yu, Sima Yi
- **Jin dynasty:** Yang Hu, Du Yu
- **Northern and Southern Dynasties:** Tan Daoji, Wang Zhenxie, Wei Rui
- **Sui-Tang:** Yang Su, Li Jing, Li Shiji, Guo Ziyi
- **Five Dynasties:** Liu Xun, Liu Ci

Each biography is followed by Zhang Yu's commentary citing specific passages from Sun Tzu to explain how the general's tactics exemplified classical military wisdom.
