/**
 * Process Baihu Tong (白虎通義) raw text files into structured JSON chapters.
 *
 * The Baihu Tong is organized into 10 juan (卷), each containing multiple topic
 * sections. We split by topic (not by juan) since topics are the logical unit of
 * the text. This yields 43 chapters total.
 *
 * Input: data/raw/baihu_tong/01_卷一.txt through 10_卷十.txt
 * Output: data/processed/baihu-tong/chapter-NNN.json
 *
 * Format of raw files:
 * - Blank line at start
 * - Sections delimited by ====================\nTitle\n====================
 * - Paragraphs within sections are separate lines (long, dense Classical Chinese)
 * - Trailing blank line between sections
 *
 * Each topic becomes one chapter. Within a topic, each non-empty line becomes
 * one paragraph. Lines are typically 100-500+ characters of dense Classical Chinese.
 */

import fs from "fs";
import path from "path";

interface Paragraph {
  index: number;
  text: string;
}

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: Paragraph[];
  };
}

const RAW_DIR = path.join(process.cwd(), "data/raw/baihu_tong");
const OUTPUT_DIR = path.join(process.cwd(), "data/processed/baihu-tong");

// Topic title to English translation mapping for chapter titles
const TOPIC_TRANSLATIONS: Record<string, string> = {
  "爵": "Ranks and Titles (Jue)",
  "號": "Designations and Appellations (Hao)",
  "謚": "Posthumous Names (Shi)",
  "五祀": "The Five Sacrifices (Wu Si)",
  "社稷": "Altars of Soil and Grain (She Ji)",
  "禮樂": "Ritual and Music (Li Yue)",
  "封公侯": "Enfeoffing Dukes and Marquises (Feng Gong Hou)",
  "京師": "The Capital (Jing Shi)",
  "五行": "The Five Phases (Wu Xing)",
  "三軍": "The Three Armies (San Jun)",
  "誅伐": "Punishment and Conquest (Zhu Fa)",
  "諫諍": "Remonstrance and Admonition (Jian Zheng)",
  "鄉射": "District Archery Ceremonies (Xiang She)",
  "致仕": "Retirement from Office (Zhi Shi)",
  "辟雍": "The Imperial Academy (Bi Yong)",
  "災變": "Disasters and Anomalies (Zai Bian)",
  "耕桑": "Agriculture and Sericulture (Geng Sang)",
  "封禪": "Feng and Shan Sacrifices (Feng Shan)",
  "巡狩": "Royal Tours of Inspection (Xun Shou)",
  "考黜": "Evaluation and Dismissal (Kao Chu)",
  "王者不臣": "Those Whom the King Does Not Treat as Subjects (Wang Zhe Bu Chen)",
  "蓍龜": "Milfoil and Tortoise Divination (Shi Gui)",
  "聖人": "The Sage (Sheng Ren)",
  "八風": "The Eight Winds (Ba Feng)",
  "商賈": "Merchants and Traders (Shang Gu)",
  "文質": "Refinement and Substance (Wen Zhi)",
  "三正": "The Three Corrections (San Zheng)",
  "三教": "The Three Teachings (San Jiao)",
  "三綱六紀": "Three Bonds and Six Relationships (San Gang Liu Ji)",
  "性情": "Nature and Emotions (Xing Qing)",
  "壽命": "Longevity and Destiny (Shou Ming)",
  "宗族": "Lineage and Clan (Zong Zu)",
  "姓名": "Surnames and Names (Xing Ming)",
  "天地": "Heaven and Earth (Tian Di)",
  "日月": "Sun and Moon (Ri Yue)",
  "四時": "The Four Seasons (Si Shi)",
  "衣裳": "Clothing and Garments (Yi Shang)",
  "五刑": "The Five Punishments (Wu Xing)",
  "五經": "The Five Classics (Wu Jing)",
  "嫁娶": "Marriage (Jia Qu)",
  "紼冕": "Sashes and Caps (Fu Mian)",
  "喪服": "Mourning Garments (Sang Fu)",
  "崩薨": "Death of Rulers (Beng Hong)",
};

function parseRawFile(filePath: string): { title: string; paragraphs: string[] }[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const sections: { title: string; paragraphs: string[] }[] = [];
  let currentTitle = "";
  let currentParagraphs: string[] = [];
  let inSection = false;
  let headerState: "none" | "top-sep" | "title" | "bottom-sep" = "none";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === "====================") {
      if (headerState === "none" || headerState === "bottom-sep") {
        // Starting a new header - save previous section if any
        if (inSection && currentTitle) {
          sections.push({
            title: currentTitle,
            paragraphs: currentParagraphs.filter((p) => p.length > 0),
          });
        }
        headerState = "top-sep";
        currentParagraphs = [];
      } else if (headerState === "title") {
        headerState = "bottom-sep";
        inSection = true;
      }
      continue;
    }

    if (headerState === "top-sep") {
      // This line is the title
      currentTitle = line;
      headerState = "title";
      continue;
    }

    if (inSection && line.length > 0) {
      currentParagraphs.push(line);
    }
  }

  // Save the last section
  if (inSection && currentTitle) {
    sections.push({
      title: currentTitle,
      paragraphs: currentParagraphs.filter((p) => p.length > 0),
    });
  }

  return sections;
}

function main() {
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Get all raw files sorted by number
  const rawFiles = fs
    .readdirSync(RAW_DIR)
    .filter((f) => f.endsWith(".txt"))
    .sort((a, b) => {
      const numA = parseInt(a.split("_")[0]);
      const numB = parseInt(b.split("_")[0]);
      return numA - numB;
    });

  console.log(`Found ${rawFiles.length} raw files in ${RAW_DIR}`);

  let chapterNumber = 0;
  const allChapters: ProcessedChapter[] = [];

  for (const file of rawFiles) {
    const filePath = path.join(RAW_DIR, file);
    const sections = parseRawFile(filePath);
    console.log(`  ${file}: ${sections.length} topics`);

    for (const section of sections) {
      chapterNumber++;
      const englishTitle = TOPIC_TRANSLATIONS[section.title] || section.title;
      const title = `${section.title} — ${englishTitle}`;

      const paragraphs: Paragraph[] = section.paragraphs.map((text, idx) => ({
        index: idx,
        text,
      }));

      const chapter: ProcessedChapter = {
        chapterNumber,
        title,
        sourceContent: { paragraphs },
      };

      allChapters.push(chapter);

      // Write chapter file
      const chapterFile = `chapter-${String(chapterNumber).padStart(3, "0")}.json`;
      const outputPath = path.join(OUTPUT_DIR, chapterFile);
      fs.writeFileSync(outputPath, JSON.stringify(chapter, null, 2), "utf-8");
    }
  }

  console.log(`\nProcessed ${chapterNumber} chapters total:`);
  for (const ch of allChapters) {
    console.log(
      `  Chapter ${String(ch.chapterNumber).padStart(2, " ")}: ${ch.title} (${ch.sourceContent.paragraphs.length} paragraphs, ${ch.sourceContent.paragraphs.reduce((sum, p) => sum + p.text.length, 0)} chars)`
    );
  }

  // Summary statistics
  const totalParagraphs = allChapters.reduce(
    (sum, ch) => sum + ch.sourceContent.paragraphs.length,
    0
  );
  const totalChars = allChapters.reduce(
    (sum, ch) =>
      sum +
      ch.sourceContent.paragraphs.reduce((s, p) => s + p.text.length, 0),
    0
  );
  console.log(`\nTotal: ${chapterNumber} chapters, ${totalParagraphs} paragraphs, ${totalChars} characters`);
}

main();
