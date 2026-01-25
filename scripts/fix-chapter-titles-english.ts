/**
 * Adds English translations to chapter titles that are missing them.
 *
 * This script:
 * 1. Reads the audit JSON to identify chapters with issues
 * 2. Uses AI translation to generate English titles for each
 * 3. Updates both processed JSON files AND the database
 *
 * Usage: pnpm tsx scripts/fix-chapter-titles-english.ts
 *
 * Note: This script requires DEEPSEEK_API_KEY for translation.
 */

import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
import OpenAI from "openai";
import * as schema from "../src/server/db/schema";

// Load .env.local manually
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^(DATABASE_URL|DEEPSEEK_API_KEY)=(.+)$/);
    if (match) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is required.");
  process.exit(1);
}

const deepseekKey = process.env.DEEPSEEK_API_KEY;
if (!deepseekKey) {
  console.error("DEEPSEEK_API_KEY environment variable is required.");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

const openai = new OpenAI({
  apiKey: deepseekKey,
  baseURL: "https://api.deepseek.com",
});

// ============================================================
// Known translations for common text types
// ============================================================

// Yi Zhou Shu chapter title translations
const YI_ZHOU_SHU_TITLES: Record<string, string> = {
  "度訓解第一": "度訓解第一 (Instructions on Standards, Chapter 1)",
  "命訓": "命訓 (Instructions on Destiny)",
  "常訓": "常訓 (Instructions on Constancy)",
  "文酌": "文酌 (On Literary Judgment)",
  "糴匡解第五": "糴匡解第五 (Instructions on Grain Trade, Chapter 5)",
  "武稱": "武稱 (The Title of Wu)",
  "允文": "允文 (Trustworthy Pattern)",
  "大武": "大武 (The Great Wu)",
  "大明武": "大明武 (The Great Illustrious Wu)",
  "小明武": "小明武 (The Lesser Illustrious Wu)",
  "大匡": "大匡 (The Great Rectification)",
  "程典": "程典 (Standards and Laws)",
  "程寤": "程寤 (The Awakening of Cheng)",
  "酆保": "酆保 (Protection of Feng)",
  "大開": "大開 (The Great Opening)",
  "小開": "小開 (The Lesser Opening)",
  "文儆": "文儆 (King Wen's Admonition)",
  "文傳": "文傳 (King Wen's Transmission)",
  "柔武": "柔武 (Gentle Warfare)",
  "大開武": "大開武 (The Great Opening of Warfare)",
  "小開武": "小開武 (The Lesser Opening of Warfare)",
  "寶典": "寶典 (Treasured Laws)",
  "酆謀": "酆謀 (Strategies of Feng)",
  "寤儆": "寤儆 (Awakening Admonition)",
  "武順": "武順 (The Compliance of Wu)",
  "武穆": "武穆 (The Solemnity of Wu)",
  "和寤": "和寤 (Harmonious Awakening)",
  "武寤": "武寤 (The Awakening of Wu)",
  "克殷": "克殷 (The Conquest of Yin)",
  "世俘": "世俘 (The World's Captives)",
  "文政": "文政 (The Government of Wen)",
  "大聚": "大聚 (The Great Gathering)",
  "商誓": "商誓 (Oath against Shang)",
  "度邑": "度邑 (Measuring the Capital)",
  "武儆": "武儆 (King Wu's Admonition)",
  "五權": "五權 (The Five Powers)",
  "成開": "成開 (The Opening of Cheng)",
  "作雒": "作雒 (Building Luo)",
  "皇門": "皇門 (The Imperial Gate)",
  "大戒": "大戒 (The Great Admonitions)",
  "周月": "周月 (The Zhou Calendar)",
  "時訓": "時訓 (Seasonal Instructions)",
  "月令": "月令 (Monthly Ordinances)",
  "諡法": "諡法 (Posthumous Name Regulations)",
  "明堂": "明堂 (The Bright Hall)",
  "嘗麥": "嘗麥 (Tasting the Wheat)",
  "本典": "本典 (Fundamental Laws)",
  "官人": "官人 (Evaluating Officials)",
  "王會": "王會 (The King's Audience)",
  "祭公": "祭公 (Duke of Ji)",
  "史記": "史記 (Historical Records)",
  "職方": "職方 (Offices and Regions)",
  "芮良夫": "芮良夫 (Rui Liangfu)",
  "大子晉": "大子晉 (Crown Prince Jin)",
  "王佩": "王佩 (The King's Jade Ornaments)",
  "殷祝": "殷祝 (Yin Invocations)",
  "周祝": "周祝 (Zhou Invocations)",
  "武紀": "武紀 (Records of Wu)",
  "銓法": "銓法 (Selection Regulations)",
  "器服": "器服 (Vessels and Garments)",
  "周書序": "周書序 (Preface to the Book of Zhou)",
};

// Zhuziyulei chapters 67-140 (continuing the existing pattern)
const ZHUZIYULEI_EXTRA_TITLES: Record<number, string> = {
  67: "綱領下 (Key Principles II)",
  68: "乾上 (Qian Hexagram I)",
  69: "乾下 (Qian Hexagram II)",
  70: "屯 (Zhun Hexagram)",
  71: "噬嗑 (Shi Ke Hexagram)",
  72: "咸 (Xian Hexagram)",
  73: "困 (Kun Hexagram)",
  74: "上繫上 (Great Commentary I, Part 1)",
  75: "上繫下 (Great Commentary I, Part 2)",
  76: "繫辭下 (Great Commentary II)",
  77: "周易十三 (Yijing XIII)",
  78: "綱領 (Key Principles)",
  79: "禹貢 (Tribute of Yu)",
  80: "綱領 (Key Principles)",
  81: "周南關雎〈兼論二南。〉 (Guan Ju of Zhou Nan)",
  82: "孝經 (Classic of Filial Piety)",
  83: "春秋 (Spring and Autumn Annals)",
  84: "論考禮綱領 (Key Principles of Examining Rites)",
  85: "儀禮 (Ceremonial Rites)",
  86: "周禮 (Rites of Zhou)",
  87: "小戴禮 (Book of Rites by Dai the Younger)",
  88: "大戴禮 (Book of Rites by Dai the Elder)",
  89: "冠昏喪 (Capping, Marriage, Mourning)",
  90: "祭 (Sacrifices)",
  91: "雜儀 (Miscellaneous Rites)",
  92: "問：「古尺何所考？」… (On Ancient Measurements)",
  93: "看聖賢代作… (On the Works of Sages)",
  94: "太極圖 (Diagram of the Supreme Ultimate)",
  95: "程子之書一 (Works of Master Cheng I)",
  96: "遺書云… (Commentary on Inherited Texts)",
  97: "程子之書三 (Works of Master Cheng III)",
  98: "張子之書一 (Works of Master Zhang I)",
  99: "張子之書二 (Works of Master Zhang II)",
  100: "康節學於李挺之… (On Shao Yong's Learning)",
  101: "總論 (General Discussion)",
  102: "羅氏門人 (Disciples of Luo)",
  103: "羅氏門人 (Disciples of Luo II)",
  104: "自論為學工夫 (On Self-Cultivation)",
  105: "論自注書 (On Self-Annotation)",
  106: "同安主簿 (Clerk of Tong'an)",
  107: "孝宗朝 (Reign of Xiaozong)",
  108: "論治道 (On Governance)",
  109: "論取士 (On Selecting Officials)",
  110: "論兵 (On Military Affairs)",
  111: "論民 (On the People)",
  112: "論官 (On Officials)",
  113: "訓門人一 (Teaching Disciples I)",
  114: "訓門人二 (Teaching Disciples II)",
  115: "訓門人三 (Teaching Disciples III)",
  116: "訓門人四 (Teaching Disciples IV)",
  117: "訓門人五 (Teaching Disciples V)",
  118: "訓門人六 (Teaching Disciples VI)",
  119: "訓門人七 (Teaching Disciples VII)",
  120: "訓門人八 (Teaching Disciples VIII)",
  121: "訓門人九 (Teaching Disciples IX)",
  122: "呂伯恭 (Lu Bogong)",
  123: "陳君舉〈陳同父葉正則附。〉 (Chen Junju)",
  124: "陸氏 (The Lu Family)",
  125: "老子 (Laozi)",
  126: "釋氏 (Buddhism)",
  127: "太祖朝 (Reign of Taizu)",
  128: "法制 (Legal System)",
  129: "自國初至熙寧人物 (Notable Figures from Dynasty Start to Xining)",
  130: "自熙寧至靖康用人 (Officials from Xining to Jingkang)",
  131: "中興至今日人物上 (Revival-Era Figures I)",
  132: "中興至今日人物下 (Revival-Era Figures II)",
  133: "盜賊 (Bandits and Rebels)",
  134: "司馬遷才高… (On Sima Qian)",
  135: "大亂之後易治… (Order after Chaos)",
  136: "因論三國形勢… (On the Three Kingdoms)",
  137: "家語雖記得不純… (On the Kongzi Jiayu)",
  138: "「禹入聖域而不優」… (On Yu Entering the Sage's Domain)",
  139: "有治世之文… (On Literature of Ordered Ages)",
  140: "論文下詩 (On Literature and Poetry)",
};

// Yashodhara Kaviyam chapter translations
const YASHODHARA_KAVIYAM_TITLES: Record<number, string> = {
  1: "முதலாவது சருக்கம் (First Carukkam: The King's Sin)",
  2: "இரண்டாவது சருக்கம் (Second Carukkam: The Peacock and the Dog)",
  3: "மூன்றாவது சருக்கம் (Third Carukkam: The Snake and the Boar)",
  4: "நான்காவது சருக்கம் (Fourth Carukkam: The Fish and the Goat)",
  5: "ஐந்தாவது சருக்கம் (Fifth Carukkam: Liberation)",
};

// Note: Armenian texts (Samvel, Kaitser) will use AI translation since there are too many chapters
// to manually translate. The translations will be generated on the fly.

interface ChapterTitleIssue {
  chapterNumber: number;
  title: string;
  issue: string;
}

interface TextAuditResult {
  textId: number;
  textSlug: string;
  textTitle: string;
  languageCode: string;
  totalChapters: number;
  chaptersWithIssues: ChapterTitleIssue[];
}

async function translateTitle(
  title: string,
  language: string,
  textSlug: string
): Promise<string> {
  const languageNames: Record<string, string> = {
    zh: "Classical Chinese",
    hy: "Armenian",
    ta: "Tamil",
    grc: "Greek",
    la: "Latin",
  };

  const langName = languageNames[language] || language;

  const prompt = `Translate this ${langName} chapter title into English. The title is from a historical/classical text. Provide ONLY the English translation, nothing else. Keep it concise (2-6 words typically).

Title: ${title}`;

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content?.trim() || "";
  } catch (error) {
    console.error(`  [err] Translation failed for "${title}":`, error);
    return "";
  }
}

function buildNewTitle(
  originalTitle: string,
  englishTranslation: string,
  language: string
): string {
  // For some languages, we use em-dash format: "Original — English"
  // For others, we use parenthetical format: "Original (English)"

  if (!englishTranslation) return originalTitle;

  // If the title already has book/chapter prefix in English (e.g., "Book 1, Ա. ..."),
  // restructure it appropriately
  const bookPrefixMatch = originalTitle.match(/^(Book \d+, (?:Chapter \d+|[ԱԲԳ-Ֆ]\.?))\s*(.+)$/);
  if (bookPrefixMatch) {
    const [, prefix, rest] = bookPrefixMatch;
    return `${prefix} — ${englishTranslation}`;
  }

  // For Armenian with em-dash format already used elsewhere
  if (language === "hy") {
    return `${originalTitle} — ${englishTranslation}`;
  }

  // Default: parenthetical format
  return `${originalTitle} (${englishTranslation})`;
}

async function updateProcessedJson(
  textSlug: string,
  chapterNumber: number,
  newTitle: string
): Promise<boolean> {
  const processedDir = path.resolve("data/processed", textSlug);

  // Try different filename formats
  const possibleFiles = [
    `chapter-${chapterNumber}.json`,
    `chapter-${String(chapterNumber).padStart(3, "0")}.json`,
    `chapter-${String(chapterNumber).padStart(2, "0")}.json`,
  ];

  for (const filename of possibleFiles) {
    const filePath = path.join(processedDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        content.title = newTitle;
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + "\n");
        return true;
      } catch (error) {
        console.error(`  [err] Failed to update ${filePath}:`, error);
        return false;
      }
    }
  }

  console.warn(`  [warn] No JSON file found for ${textSlug} chapter ${chapterNumber}`);
  return false;
}

async function updateDatabase(
  textId: number,
  chapterNumber: number,
  newTitle: string
): Promise<boolean> {
  try {
    const result = await db
      .update(schema.chapters)
      .set({ title: newTitle })
      .where(
        and(
          eq(schema.chapters.textId, textId),
          eq(schema.chapters.chapterNumber, chapterNumber)
        )
      )
      .returning({ id: schema.chapters.id });

    return result.length > 0;
  } catch (error) {
    console.error(`  [err] Failed to update DB for chapter ${chapterNumber}:`, error);
    return false;
  }
}

async function fixText(result: TextAuditResult): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Fixing: ${result.textTitle} (${result.textSlug})`);
  console.log(`Language: ${result.languageCode}`);
  console.log(`Chapters with issues: ${result.chaptersWithIssues.length}`);
  console.log("=".repeat(60));

  let fixedCount = 0;
  let errorCount = 0;

  for (const issue of result.chaptersWithIssues) {
    const chNum = issue.chapterNumber;
    let newTitle: string;

    // Check if we have a predefined translation
    if (result.textSlug === "yi-zhou-shu" && YI_ZHOU_SHU_TITLES[issue.title]) {
      newTitle = YI_ZHOU_SHU_TITLES[issue.title];
    } else if (result.textSlug === "zhuziyulei" && ZHUZIYULEI_EXTRA_TITLES[chNum]) {
      newTitle = ZHUZIYULEI_EXTRA_TITLES[chNum];
    } else if (result.textSlug === "yashodhara-kaviyam" && YASHODHARA_KAVIYAM_TITLES[chNum]) {
      newTitle = YASHODHARA_KAVIYAM_TITLES[chNum];
    } else {
      // Use AI translation
      console.log(`  Ch ${chNum}: Translating "${truncate(issue.title, 40)}"...`);
      const english = await translateTitle(issue.title, result.languageCode, result.textSlug);

      if (!english) {
        console.log(`    [skip] No translation obtained`);
        errorCount++;
        continue;
      }

      newTitle = buildNewTitle(issue.title, english, result.languageCode);

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Update processed JSON
    const jsonUpdated = await updateProcessedJson(result.textSlug, chNum, newTitle);

    // Update database
    const dbUpdated = await updateDatabase(result.textId, chNum, newTitle);

    if (jsonUpdated || dbUpdated) {
      console.log(`  Ch ${chNum}: "${truncate(newTitle, 50)}" [JSON:${jsonUpdated ? "OK" : "skip"}, DB:${dbUpdated ? "OK" : "skip"}]`);
      fixedCount++;
    } else {
      errorCount++;
    }
  }

  console.log(`\nCompleted ${result.textSlug}: ${fixedCount} fixed, ${errorCount} errors`);
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

async function main() {
  console.log("=== Fixing Chapter Titles with English Translations ===\n");

  // Read audit results
  const auditPath = path.resolve(__dirname, "../data/chapter-title-audit.json");
  if (!fs.existsSync(auditPath)) {
    console.error("Audit file not found. Run audit-chapter-titles.ts first.");
    process.exit(1);
  }

  const auditResults: TextAuditResult[] = JSON.parse(
    fs.readFileSync(auditPath, "utf-8")
  );

  console.log(`Found ${auditResults.length} texts with issues:`);
  for (const result of auditResults) {
    console.log(`  - ${result.textSlug}: ${result.chaptersWithIssues.length} chapters`);
  }

  // Process each text
  for (const result of auditResults) {
    await fixText(result);
  }

  console.log("\n=== Done ===");
  await client.end();
}

main().catch((err) => {
  console.error("Error:", err);
  client.end().then(() => process.exit(1));
});
