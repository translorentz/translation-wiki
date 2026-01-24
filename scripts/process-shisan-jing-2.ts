/**
 * Processes two texts from the Thirteen Classics with Commentaries (十三經註疏):
 * 1. 周易正義 (Zhouyi Zhengyi) — Book of Changes with Commentary
 * 2. 尚書正義 (Shangshu Zhengyi) — Book of Documents with Commentary
 *
 * Source: data/raw/Shisan_Jing_Zhushu/周易正義/ and 尚書正義/
 *
 * For 周易正義:
 * - 6 foundation texts as chapters 1-6 (may be empty stubs or real content)
 * - 64 hexagrams as chapters 7-70 (in juan order per index)
 * - Appendix sections (07.xx, 08.x, 09.xx, 10, 11) as chapters 71+
 *
 * For 尚書正義:
 * - 2 prefaces as chapters 1-2
 * - 卷一 through 卷二十 as chapters 3-22
 *
 * Usage: pnpm tsx scripts/process-shisan-jing-2.ts
 */

import fs from "fs";
import path from "path";

const BASE_DIR = path.resolve("data/raw/Shisan_Jing_Zhushu");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

/**
 * Split text content into paragraphs based on [疏] boundaries and newlines.
 * These classical commentary texts often have extremely long lines with multiple
 * [疏] sections embedded within a single line.
 *
 * Strategy:
 * 1. Join all content into one string
 * 2. Split on [疏] boundaries (each [疏] starts a new paragraph)
 * 3. Within non-[疏] blocks, split on newlines (each line = a paragraph)
 * 4. Merge tiny paragraphs (< 50 chars) with neighbors
 * 5. Preserves all commentary layers ([疏], 【】, （）)
 * 6. Strips copyright/public domain notices at the end.
 */
function splitIntoParagraphs(content: string): { index: number; text: string }[] {
  // Strip trailing copyright notices
  const copyrightPatterns = [
    /此作品在全世界都属于公有领域[^]*$/,
    /此唐朝作品在全世界都属于公有领域[^]*$/,
    /Public domain[^]*$/,
  ];
  let cleaned = content;
  for (const pat of copyrightPatterns) {
    cleaned = cleaned.replace(pat, "");
  }
  cleaned = cleaned.trim();

  if (!cleaned) return [];

  // Split using [疏] as a paragraph boundary marker.
  // The [疏] token appears both at line starts and embedded within long lines.
  // We split on [疏] and then re-attach it as the start of the next segment.
  const segments = cleaned.split(/(?=\[疏\])/);

  const rawParagraphs: string[] = [];

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("[疏]")) {
      // This is a 疏 (sub-commentary) paragraph — keep it whole
      rawParagraphs.push(trimmed);
    } else {
      // Non-疏 segment: split on newlines (each line is a base text + commentary unit)
      const lines = trimmed.split("\n");
      for (const line of lines) {
        const lt = line.trim();
        if (lt) {
          rawParagraphs.push(lt);
        }
      }
    }
  }

  // Merge tiny paragraphs (< 50 chars) with neighbors
  const merged: string[] = [];
  for (let i = 0; i < rawParagraphs.length; i++) {
    const para = rawParagraphs[i];
    if (para.length < 50 && merged.length > 0) {
      // Merge with the previous paragraph
      merged[merged.length - 1] += para;
    } else if (para.length < 50 && i + 1 < rawParagraphs.length) {
      // Merge with the next paragraph
      rawParagraphs[i + 1] = para + rawParagraphs[i + 1];
    } else {
      merged.push(para);
    }
  }

  // Filter out empty paragraphs and create indexed entries
  return merged
    .filter((p) => p.trim().length > 0)
    .map((text, idx) => ({ index: idx + 1, text }));
}

/**
 * Read a file and return its content, or empty string if file doesn't exist or is empty.
 */
function readFileContent(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, "utf-8").trim();
    return content;
  } catch {
    return "";
  }
}

// ============================================================
// 周易正義 Processing
// ============================================================

function processZhouyiZhengyi() {
  const rawDir = path.join(BASE_DIR, "周易正義");
  const outputDir = path.resolve("data/processed/zhouyi-zhengyi");
  fs.mkdirSync(outputDir, { recursive: true });

  console.log("=== Processing 周易正義 (Zhouyi Zhengyi) ===\n");

  let chapterNumber = 0;
  const chapters: ProcessedChapter[] = [];

  // --- Part 1: Foundation texts (chapters 1-6) ---
  const foundationTexts = [
    { file: "周易.txt", title: "周易 (Zhou Yi Base Text)" },
    { file: "周易集解.txt", title: "周易集解 (Collected Explanations)" },
    { file: "周易鄭康成註.txt", title: "周易鄭康成註 (Zheng Kangcheng's Commentary)" },
    { file: "東坡易傳.txt", title: "東坡易傳 (Su Dongpo's Commentary)" },
    { file: "子夏易傳.txt", title: "子夏易傳 (Zixia's Commentary)" },
    { file: "周易闡真.txt", title: "周易闡真 (Elucidating the Truth of the Changes)" },
  ];

  for (const ft of foundationTexts) {
    chapterNumber++;
    const content = readFileContent(path.join(rawDir, ft.file));

    let paragraphs: { index: number; text: string }[] = [];
    if (content && content.length > 10) {
      paragraphs = splitIntoParagraphs(content);
    }

    chapters.push({ chapterNumber, title: ft.title, sourceContent: { paragraphs } });
    console.log(`  Ch ${chapterNumber}: "${ft.title}" — ${paragraphs.length} paragraphs`);
  }

  // --- Part 2: 64 Hexagrams (chapters 7-70) ---
  // Ordered by juan (卷01-06) then by index appearance
  const hexagramOrder = [
    // 卷01 (4 hexagrams)
    { juan: "01", name: "乾" },
    { juan: "01", name: "坤" },
    { juan: "01", name: "屯" },
    { juan: "01", name: "蒙" },
    // 卷02 (12 hexagrams)
    { juan: "02", name: "需" },
    { juan: "02", name: "訟" },
    { juan: "02", name: "師" },
    { juan: "02", name: "比" },
    { juan: "02", name: "小畜" },
    { juan: "02", name: "履" },
    { juan: "02", name: "泰" },
    { juan: "02", name: "否" },
    { juan: "02", name: "同人" },
    { juan: "02", name: "大有" },
    { juan: "02", name: "謙" },
    { juan: "02", name: "豫" },
    // 卷03 (14 hexagrams)
    { juan: "03", name: "隨" },
    { juan: "03", name: "蠱" },
    { juan: "03", name: "臨" },
    { juan: "03", name: "觀" },
    { juan: "03", name: "噬嗑" },
    { juan: "03", name: "賁" },
    { juan: "03", name: "剝" },
    { juan: "03", name: "復" },
    { juan: "03", name: "無妄" },
    { juan: "03", name: "大畜" },
    { juan: "03", name: "頤" },
    { juan: "03", name: "大過" },
    { juan: "03", name: "坎" },
    { juan: "03", name: "離" },
    // 卷04 (12 hexagrams)
    { juan: "04", name: "咸" },
    { juan: "04", name: "恒" },
    { juan: "04", name: "遯" },
    { juan: "04", name: "大壯" },
    { juan: "04", name: "晉" },
    { juan: "04", name: "明夷" },
    { juan: "04", name: "家人" },
    { juan: "04", name: "睽" },
    { juan: "04", name: "蹇" },
    { juan: "04", name: "解" },
    { juan: "04", name: "損" },
    { juan: "04", name: "益" },
    // 卷05 (12 hexagrams)
    { juan: "05", name: "夬" },
    { juan: "05", name: "姤" },
    { juan: "05", name: "萃" },
    { juan: "05", name: "升" },
    { juan: "05", name: "困" },
    { juan: "05", name: "井" },
    { juan: "05", name: "革" },
    { juan: "05", name: "鼎" },
    { juan: "05", name: "震" },
    { juan: "05", name: "艮" },
    { juan: "05", name: "漸" },
    { juan: "05", name: "歸妹" },
    // 卷06 (10 hexagrams)
    { juan: "06", name: "豐" },
    { juan: "06", name: "旅" },
    { juan: "06", name: "巽" },
    { juan: "06", name: "兌" },
    { juan: "06", name: "渙" },
    { juan: "06", name: "節" },
    { juan: "06", name: "中孚" },
    { juan: "06", name: "小過" },
    { juan: "06", name: "既濟" },
    { juan: "06", name: "未濟" },
  ];

  for (const hex of hexagramOrder) {
    chapterNumber++;
    const fileName = `周易正義${hex.juan}${hex.name}.txt`;
    const filePath = path.join(rawDir, fileName);
    const content = readFileContent(filePath);

    let paragraphs: { index: number; text: string }[] = [];
    if (content) {
      paragraphs = splitIntoParagraphs(content);
    } else {
      console.warn(`  WARNING: File not found: ${fileName}`);
    }

    const title = `${hex.name} (Hexagram, Juan ${hex.juan})`;
    chapters.push({ chapterNumber, title, sourceContent: { paragraphs } });
    console.log(`  Ch ${chapterNumber}: "${title}" — ${paragraphs.length} paragraphs`);
  }

  // --- Part 3: Appendix sections (Ten Wings, chapters 71+) ---
  const appendixSections = [
    // 卷07: 繫辭上 (12 sections)
    { file: "周易正義07.01.txt", title: "繫辭上 第一章 (Xi Ci Shang Ch.1)" },
    { file: "周易正義07.02.txt", title: "繫辭上 第二章 (Xi Ci Shang Ch.2)" },
    { file: "周易正義07.03.txt", title: "繫辭上 第三章 (Xi Ci Shang Ch.3)" },
    { file: "周易正義07.04.txt", title: "繫辭上 第四章 (Xi Ci Shang Ch.4)" },
    { file: "周易正義07.05.txt", title: "繫辭上 第五章 (Xi Ci Shang Ch.5)" },
    { file: "周易正義07.06.txt", title: "繫辭上 第六章 (Xi Ci Shang Ch.6)" },
    { file: "周易正義07.07.txt", title: "繫辭上 第七章 (Xi Ci Shang Ch.7)" },
    { file: "周易正義07.08.txt", title: "繫辭上 第八章 (Xi Ci Shang Ch.8)" },
    { file: "周易正義07.09.txt", title: "繫辭上 第九章 (Xi Ci Shang Ch.9)" },
    { file: "周易正義07.10.txt", title: "繫辭上 第十章 (Xi Ci Shang Ch.10)" },
    { file: "周易正義07.11.txt", title: "繫辭上 第十一章 (Xi Ci Shang Ch.11)" },
    { file: "周易正義07.12.txt", title: "繫辭上 第十二章 (Xi Ci Shang Ch.12)" },
    // 卷08: 繫辭下 (9 sections)
    { file: "周易正義08.1.txt", title: "繫辭下 第一章 (Xi Ci Xia Ch.1)" },
    { file: "周易正義08.2.txt", title: "繫辭下 第二章 (Xi Ci Xia Ch.2)" },
    { file: "周易正義08.3.txt", title: "繫辭下 第三章 (Xi Ci Xia Ch.3)" },
    { file: "周易正義08.4.txt", title: "繫辭下 第四章 (Xi Ci Xia Ch.4)" },
    { file: "周易正義08.5.txt", title: "繫辭下 第五章 (Xi Ci Xia Ch.5)" },
    { file: "周易正義08.6.txt", title: "繫辭下 第六章 (Xi Ci Xia Ch.6)" },
    { file: "周易正義08.7.txt", title: "繫辭下 第七章 (Xi Ci Xia Ch.7)" },
    { file: "周易正義08.8.txt", title: "繫辭下 第八章 (Xi Ci Xia Ch.8)" },
    { file: "周易正義08.9.txt", title: "繫辭下 第九章 (Xi Ci Xia Ch.9)" },
    // 卷09: 說卦 (11 sections)
    { file: "周易正義09.01.txt", title: "說卦 第一章 (Shuo Gua Ch.1)" },
    { file: "周易正義09.02.txt", title: "說卦 第二章 (Shuo Gua Ch.2)" },
    { file: "周易正義09.03.txt", title: "說卦 第三章 (Shuo Gua Ch.3)" },
    { file: "周易正義09.04.txt", title: "說卦 第四章 (Shuo Gua Ch.4)" },
    { file: "周易正義09.05.txt", title: "說卦 第五章 (Shuo Gua Ch.5)" },
    { file: "周易正義09.06.txt", title: "說卦 第六章 (Shuo Gua Ch.6)" },
    { file: "周易正義09.07.txt", title: "說卦 第七章 (Shuo Gua Ch.7)" },
    { file: "周易正義09.08.txt", title: "說卦 第八章 (Shuo Gua Ch.8)" },
    { file: "周易正義09.09.txt", title: "說卦 第九章 (Shuo Gua Ch.9)" },
    { file: "周易正義09.10.txt", title: "說卦 第十章 (Shuo Gua Ch.10)" },
    { file: "周易正義09.11.txt", title: "說卦 第十一章 (Shuo Gua Ch.11)" },
    // 卷10: 序卦
    { file: "周易正義10.txt", title: "序卦 (Xu Gua — Sequence of Hexagrams)" },
    // 卷11: 雜卦
    { file: "周易正義11.txt", title: "雜卦 (Za Gua — Miscellaneous Hexagrams)" },
  ];

  for (const app of appendixSections) {
    chapterNumber++;
    const filePath = path.join(rawDir, app.file);
    const content = readFileContent(filePath);

    let paragraphs: { index: number; text: string }[] = [];
    if (content) {
      paragraphs = splitIntoParagraphs(content);
    } else {
      console.warn(`  WARNING: File not found: ${app.file}`);
    }

    chapters.push({ chapterNumber, title: app.title, sourceContent: { paragraphs } });
    console.log(`  Ch ${chapterNumber}: "${app.title}" — ${paragraphs.length} paragraphs`);
  }

  // Write all chapters
  for (const ch of chapters) {
    const fileName = `chapter-${String(ch.chapterNumber).padStart(3, "0")}.json`;
    fs.writeFileSync(
      path.join(outputDir, fileName),
      JSON.stringify(ch, null, 2) + "\n"
    );
  }

  console.log(`\n  Total: ${chapterNumber} chapters → ${outputDir}\n`);
  return chapterNumber;
}

// ============================================================
// 尚書正義 Processing
// ============================================================

function processShangShuZhengyi() {
  const rawDir = path.join(BASE_DIR, "尚書正義");
  const outputDir = path.resolve("data/processed/shangshu-zhengyi");
  fs.mkdirSync(outputDir, { recursive: true });

  console.log("=== Processing 尚書正義 (Shangshu Zhengyi) ===\n");

  let chapterNumber = 0;
  const chapters: ProcessedChapter[] = [];

  // --- Part 1: Prefaces (chapters 1-2) ---
  const prefaces = [
    { file: "尚書正義序.txt", title: "尚書正義序 (Shangshu Zhengyi Preface)" },
    { file: "尚書正義尚書注疏校勘記序.txt", title: "尚書注疏校勘記序 (Collation Preface)" },
  ];

  for (const pf of prefaces) {
    chapterNumber++;
    const filePath = path.join(rawDir, pf.file);
    const content = readFileContent(filePath);

    let paragraphs: { index: number; text: string }[] = [];
    if (content) {
      paragraphs = splitIntoParagraphs(content);
    }

    chapters.push({ chapterNumber, title: pf.title, sourceContent: { paragraphs } });
    console.log(`  Ch ${chapterNumber}: "${pf.title}" — ${paragraphs.length} paragraphs`);
  }

  // --- Part 2: 卷一 through 卷二十 (chapters 3-22) ---
  const volumeNames = [
    "卷一", "卷二", "卷三", "卷四", "卷五",
    "卷六", "卷七", "卷八", "卷九", "卷十",
    "卷十一", "卷十二", "卷十三", "卷十四", "卷十五",
    "卷十六", "卷十七", "卷十八", "卷十九", "卷二十",
  ];

  for (const vol of volumeNames) {
    chapterNumber++;
    const fileName = `尚書正義${vol}.txt`;
    const filePath = path.join(rawDir, fileName);
    const content = readFileContent(filePath);

    let paragraphs: { index: number; text: string }[] = [];
    if (content) {
      paragraphs = splitIntoParagraphs(content);
    } else {
      console.warn(`  WARNING: File not found: ${fileName}`);
    }

    const title = `${vol} (Volume ${volumeNames.indexOf(vol) + 1})`;
    chapters.push({ chapterNumber, title, sourceContent: { paragraphs } });
    console.log(`  Ch ${chapterNumber}: "${title}" — ${paragraphs.length} paragraphs`);
  }

  // Write all chapters
  for (const ch of chapters) {
    const fileName = `chapter-${String(ch.chapterNumber).padStart(3, "0")}.json`;
    fs.writeFileSync(
      path.join(outputDir, fileName),
      JSON.stringify(ch, null, 2) + "\n"
    );
  }

  console.log(`\n  Total: ${chapterNumber} chapters → ${outputDir}\n`);
  return chapterNumber;
}

// ============================================================
// Main
// ============================================================

function main() {
  console.log("Processing Shisan Jing Zhushu texts (Batch 2)\n");
  console.log(`Source directory: ${BASE_DIR}\n`);

  const zhouyiCount = processZhouyiZhengyi();
  const shangshuCount = processShangShuZhengyi();

  console.log("=== Summary ===");
  console.log(`  周易正義: ${zhouyiCount} chapters`);
  console.log(`  尚書正義: ${shangshuCount} chapters`);
  console.log("\nDone.");
}

main();
