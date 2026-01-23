/**
 * Fixes chapter titles in processed JSON files and updates the database.
 *
 * - Zhuziyulei: Uses known correct titles from ctext.org ToC
 * - Ceremonialis: Uses structured chapter/book titles
 * - Tongjian: Extracts 【topic】 bracketed event headings from content
 * - Chuanxilu: Adds content-based subtitles for generic volume titles
 *
 * Usage: pnpm tsx scripts/fix-chapter-titles.ts
 */

import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "../src/server/db/schema";

const connectionString = process.env.DATABASE_URL || "";
const client = postgres(connectionString);
const db = drizzle(client, { schema });

const PROCESSED_DIR = path.resolve("data/processed");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

// Known correct titles for Zhuziyulei chapters
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

// English translations for Tongjian volume topics
const TONGJIAN_TOPICS_EN: Record<number, string> = {
  3: "The Three Families Partition Jin",
  4: "Emperor Gao Destroys Chu",
  5: "Han Opens Relations with the Southwest Yi",
  6: "Huo Guang Deposes and Enthrones Emperors",
  7: "The Ding and Fu Clans Seize Power",
  8: "Guangwu Pacifies the Red Eyebrows",
  9: "The Two Xiongnu Submit and Rebel",
  10: "Eunuchs Destroy Han",
  11: "Cao Cao Usurps Han",
  12: "Wu and Shu Establish Relations",
  13: "Wei Destroys Shu",
  14: "The Disorders of Western Jin",
  15: "Liu Yuan Seizes Pingyang",
  16: "Zu Ti's Northern Expedition",
  17: "The Eastern Court's Strategies for the Central Plains",
  18: "Murong Rebels Against Qin and Restores Yan",
  19: "The Disorder of Pseudo-Chu",
  20: "Feng Ba Attacks Later Yan",
  21: "Liu Yu Usurps Jin",
  22: "The Disorder of the Deposed Emperors",
  23: "Northern Wei Attacks Qi",
  24: "Zhao Zhong Seizes Power",
  25: "Wei Splits into East and West",
  26: "The Chaos and Fall of Liang",
  27: "Zhou Destroys Qi",
  28: "The Turks Submit to Sui",
  29: "Tang Pacifies the Eastern Capital",
  30: "Taizong Quells Internal Troubles",
  31: "Zhenguan-era Discourse on Governance",
  32: "The Calamity of Empress Wu and Empress Wei",
  33: "Li Linfu's Autocracy",
  34: "Liu Zhan's Rebellion",
  35: "Military Governors War Among Themselves",
  36: "The Pi-Wen Affair",
  37: "Nanzhao Submits",
  38: "Pang Xun's Rebellion",
  39: "Huang Chao's Rebellion",
  40: "The Garrisons Attack Each Other",
  41: "The Qian Clan Holds Wuyue",
  42: "The Ma Clan Holds Hunan",
  43: "The Ye Capital Incident",
  44: "Khitan Destroys Jin",
};

// Chuanxilu volume descriptions
const CHUANXILU_TITLES: Record<number, string> = {
  1: "卷上：徐愛引言… (Volume 1: Dialogues of Xu Ai and Others)",
  2: "卷中：錢德洪序… (Volume 2: Letters and Writings)",
  3: "卷下：門人陳九川錄… (Volume 3: Dialogues of Chen Jiuchuan and Others)",
};

function fixKnownTitles(textDir: string, knownTitles: Record<number, string>): number {
  const files = fs
    .readdirSync(textDir)
    .filter((f) => f.startsWith("chapter-") && f.endsWith(".json") && !f.includes("-translation"))
    .sort();

  let fixedCount = 0;

  for (const file of files) {
    const filePath = path.join(textDir, file);
    const chapter: ProcessedChapter = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const num = chapter.chapterNumber;
    const oldTitle = chapter.title;

    if (knownTitles[num] && knownTitles[num] !== oldTitle) {
      chapter.title = knownTitles[num];
      fs.writeFileSync(filePath, JSON.stringify(chapter, null, 2) + "\n");
      fixedCount++;
      console.log(`  [fix] Ch ${num}: "${chapter.title}"`);
    }
  }

  return fixedCount;
}

function fixTongjianTitles(): number {
  const textDir = path.join(PROCESSED_DIR, "tongjian");
  if (!fs.existsSync(textDir)) return 0;

  const files = fs
    .readdirSync(textDir)
    .filter((f) => f.startsWith("chapter-") && f.endsWith(".json") && !f.includes("-translation"))
    .sort();

  let fixedCount = 0;

  for (const file of files) {
    const filePath = path.join(textDir, file);
    const chapter: ProcessedChapter = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Only fix volume chapters (3+)
    if (chapter.chapterNumber < 3) continue;

    const firstPara = chapter.sourceContent.paragraphs[0]?.text || "";
    // Extract 【topic】 headings
    const topics = firstPara.match(/【([^】]+)】/g)?.map((t) => t.slice(1, -1)) || [];

    if (topics.length === 0) continue;

    // Build the new title
    const volumeMatch = chapter.title.match(/第(.+)卷/);
    const volumeNum = volumeMatch ? volumeMatch[1] : String(chapter.chapterNumber - 2);

    // Chinese title: include up to 2 topics
    const chineseTopics = topics.length <= 2
      ? topics.join("　")
      : topics.slice(0, 2).join("　") + "…";

    const englishTopic = TONGJIAN_TOPICS_EN[chapter.chapterNumber] || `Volume ${volumeNum}`;
    const newTitle = `第${volumeNum}卷：${chineseTopics} (${englishTopic})`;

    if (newTitle !== chapter.title) {
      chapter.title = newTitle;
      fs.writeFileSync(filePath, JSON.stringify(chapter, null, 2) + "\n");
      fixedCount++;
      console.log(`  [fix] Ch ${chapter.chapterNumber}: "${newTitle}"`);
    }
  }

  return fixedCount;
}

async function updateDatabaseTitles(): Promise<void> {
  console.log("\nUpdating database chapter titles...");

  const textsToUpdate = ["zhuziyulei", "ceremonialis", "tongjian", "chuanxilu"];

  for (const textSlug of textsToUpdate) {
    const processedDir = path.join(PROCESSED_DIR, textSlug);
    if (!fs.existsSync(processedDir)) continue;

    // Find the text record
    const textRecord = await db.query.texts.findFirst({
      where: eq(schema.texts.slug, textSlug),
    });
    if (!textRecord) {
      console.log(`  [skip] Text '${textSlug}' not found in database`);
      continue;
    }

    const files = fs
      .readdirSync(processedDir)
      .filter((f) => f.startsWith("chapter-") && f.endsWith(".json") && !f.includes("-translation"))
      .sort();

    let dbUpdated = 0;
    for (const file of files) {
      const chapter: ProcessedChapter = JSON.parse(
        fs.readFileSync(path.join(processedDir, file), "utf-8")
      );

      const result = await db
        .update(schema.chapters)
        .set({ title: chapter.title })
        .where(
          and(
            eq(schema.chapters.textId, textRecord.id),
            eq(schema.chapters.chapterNumber, chapter.chapterNumber)
          )
        )
        .returning({ id: schema.chapters.id });

      if (result.length > 0) dbUpdated++;
    }

    console.log(`  ${textSlug}: updated ${dbUpdated} chapter titles in DB`);
  }
}

async function main() {
  console.log("=== Fixing Chapter Titles ===\n");

  console.log("Zhuziyulei...");
  const zhuziyuleiDir = path.join(PROCESSED_DIR, "zhuziyulei");
  if (fs.existsSync(zhuziyuleiDir)) {
    const fixed = fixKnownTitles(zhuziyuleiDir, ZHUZIYULEI_TITLES);
    console.log(`  Fixed ${fixed} titles\n`);
  }

  console.log("Ceremonialis...");
  const ceremonialisDir = path.join(PROCESSED_DIR, "ceremonialis");
  if (fs.existsSync(ceremonialisDir)) {
    const fixed = fixKnownTitles(ceremonialisDir, CEREMONIALIS_TITLES);
    console.log(`  Fixed ${fixed} titles\n`);
  }

  console.log("Tongjian...");
  const tongjianFixed = fixTongjianTitles();
  console.log(`  Fixed ${tongjianFixed} titles\n`);

  console.log("Chuanxilu...");
  const chuanxiluDir = path.join(PROCESSED_DIR, "chuanxilu");
  if (fs.existsSync(chuanxiluDir)) {
    const fixed = fixKnownTitles(chuanxiluDir, CHUANXILU_TITLES);
    console.log(`  Fixed ${fixed} titles\n`);
  }

  await updateDatabaseTitles();

  console.log("\n=== Done ===");
  await client.end();
}

main().catch((err) => {
  console.error("Error:", err);
  client.end().then(() => process.exit(1));
});
