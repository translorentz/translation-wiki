/**
 * Fixes chapter titles in processed JSON files.
 * - Truncates titles that are too long (likely paragraphs mistakenly used as titles)
 * - Replaces with first few meaningful words + ellipsis
 */

import fs from "fs";
import path from "path";

const PROCESSED_DIR = path.resolve("data/processed");

// Known correct titles for Zhuziyulei chapters (from ctext.org table of contents)
const ZHUZIYULEI_TITLES: Record<number, string> = {
  1: "太極天地上 (The Supreme Ultimate, Heaven & Earth I)",
  2: "太極天地下 (The Supreme Ultimate, Heaven & Earth II)",
  3: "鬼神 (Ghosts and Spirits)",
  4: "人物之性氣質之性 (The Nature of Humans and Things)",
  5: "性情心意等名義 (Terms: Nature, Feelings, Mind, Intention)",
  6: "仁義禮智等名義 (Terms: Benevolence, Righteousness, Ritual, Wisdom)",
  7: "小學 (Elementary Learning)",
  8: "總論為學之方 (General Discussion on Methods of Learning)",
  9: "論知行 (On Knowledge and Action)",
  10: "讀書法上 (Methods of Reading I)",
  11: "讀書法下 (Methods of Reading II)",
  12: "持守 (Maintaining and Preserving)",
  13: "力行 (Vigorous Practice)",
  14: "朋友 (Friends)",
  15: "大學一 (The Great Learning I)",
  16: "大學二 (The Great Learning II)",
  17: "大學三 (The Great Learning III)",
  18: "大學四 (The Great Learning IV)",
  19: "論語一 (Analects I)",
  20: "論語二 (Analects II)",
  21: "論語三 (Analects III)",
  22: "論語四 (Analects IV)",
  23: "論語五 (Analects V)",
  24: "論語六 (Analects VI)",
  25: "論語七 (Analects VII)",
  26: "論語八 (Analects VIII)",
  27: "論語九 (Analects IX)",
  28: "論語十 (Analects X)",
  29: "論語十一 (Analects XI)",
  30: "論語十二 (Analects XII)",
  31: "論語十三 (Analects XIII)",
  32: "論語十四 (Analects XIV)",
  33: "論語十五 (Analects XV)",
  34: "論語十六 (Analects XVI)",
  35: "孟子一 (Mencius I)",
  36: "孟子二 (Mencius II)",
  37: "孟子三 (Mencius III)",
  38: "孟子四 (Mencius IV)",
  39: "孟子五 (Mencius V)",
  40: "孟子六 (Mencius VI)",
  41: "孟子七 (Mencius VII)",
  42: "中庸一 (Doctrine of the Mean I)",
  43: "中庸二 (Doctrine of the Mean II)",
  44: "中庸三 (Doctrine of the Mean III)",
  45: "論語孟子綱領 (Key Principles of the Analects and Mencius)",
  46: "論語孟子餘 (Further on the Analects and Mencius)",
  47: "易綱領 (Key Principles of the Yijing)",
  48: "易一 (Yijing I)",
  49: "易二 (Yijing II)",
  50: "易三 (Yijing III)",
  51: "易四 (Yijing IV)",
  52: "易五 (Yijing V)",
  53: "書一 (Book of Documents I)",
  54: "書二 (Book of Documents II)",
  55: "詩一 (Book of Odes I)",
  56: "詩二 (Book of Odes II)",
  57: "禮一 (Rites I)",
  58: "禮二 (Rites II)",
  59: "禮三 (Rites III)",
  60: "禮四 (Rites IV)",
  61: "禮五 (Rites V)",
  62: "中庸衍義 (Extended Meaning of the Doctrine of the Mean)",
  63: "春秋 (Spring and Autumn Annals)",
  64: "春秋綱領 (Key Principles of the Spring and Autumn)",
  65: "孝經 (Classic of Filial Piety)",
  66: "四書總論 (General Discussion of the Four Books)",
};

// Known correct titles for Ceremonialis chapters
const CEREMONIALIS_TITLES: Record<number, string> = {
  1: "Προοίμιον (Prooemium — Preface)",
  2: "Βιβλίον Αʹ, Κεφ. 1–37 (Book I, Ch. 1–37)",
  3: "Βιβλίον Αʹ, Κεφ. 38–54 (Book I, Ch. 38–54)",
  4: "Βιβλίον Αʹ, Κεφ. 55–72 (Book I, Ch. 55–72)",
  5: "Βιβλίον Αʹ, Κεφ. 73–97 (Book I, Ch. 73–97)",
  6: "Βιβλίον Βʹ, Κεφ. 1–30 (Book II, Ch. 1–30)",
  7: "Βιβλίον Βʹ, Κεφ. 31–55 (Book II, Ch. 31–55)",
};

function truncateTitle(title: string, maxLen: number = 50): string {
  if (title.length <= maxLen) return title;
  // Find a good break point
  const truncated = title.substring(0, maxLen);
  const lastSpace = truncated.lastIndexOf("，") !== -1
    ? truncated.lastIndexOf("，")
    : truncated.lastIndexOf("。") !== -1
      ? truncated.lastIndexOf("。")
      : maxLen;
  return title.substring(0, lastSpace > 20 ? lastSpace : maxLen) + "…";
}

function getFirstWords(text: string, wordCount: number = 5): string {
  // For Chinese: just take first N characters
  const cleaned = text.replace(/\n/g, " ").trim();
  if (cleaned.length <= wordCount * 3) return cleaned;
  return cleaned.substring(0, wordCount * 3) + "…";
}

function fixTextTitles(textDir: string, knownTitles: Record<number, string>) {
  const files = fs
    .readdirSync(textDir)
    .filter((f) => f.startsWith("chapter-") && f.endsWith(".json") && !f.includes("-translation"))
    .sort();

  let fixedCount = 0;

  for (const file of files) {
    const filePath = path.join(textDir, file);
    const chapter = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const num = chapter.chapterNumber;
    const oldTitle = chapter.title;

    if (knownTitles[num]) {
      chapter.title = knownTitles[num];
    } else if (oldTitle && oldTitle.length > 50) {
      // Title is too long — likely a paragraph used as title
      // Use first few meaningful characters
      chapter.title = getFirstWords(oldTitle, 5);
    }

    if (chapter.title !== oldTitle) {
      fs.writeFileSync(filePath, JSON.stringify(chapter, null, 2), "utf-8");
      fixedCount++;
      console.log(`  [fix] Ch ${num}: "${oldTitle?.substring(0, 30)}..." → "${chapter.title}"`);
    }
  }

  return fixedCount;
}

function main() {
  console.log("Fixing Zhuziyulei chapter titles...");
  const zhuziyuleiDir = path.join(PROCESSED_DIR, "zhuziyulei");
  if (fs.existsSync(zhuziyuleiDir)) {
    const fixed = fixTextTitles(zhuziyuleiDir, ZHUZIYULEI_TITLES);
    console.log(`  Fixed ${fixed} titles\n`);
  }

  console.log("Fixing Ceremonialis chapter titles...");
  const ceremonialisDir = path.join(PROCESSED_DIR, "ceremonialis");
  if (fs.existsSync(ceremonialisDir)) {
    const fixed = fixTextTitles(ceremonialisDir, CEREMONIALIS_TITLES);
    console.log(`  Fixed ${fixed} titles\n`);
  }

  console.log("Done.");
}

main();
