/**
 * Processing script for the Three Rites (三禮) from the Thirteen Classics with Commentaries
 *
 * Texts processed:
 * 1. 周禮註疏 (Zhouli Zhushu) - Rites of Zhou with Commentary - 42 volumes
 * 2. 儀禮註疏 (Yili Zhushu) - Ceremonial Rites with Commentary - 51 volumes (incl. 卷二十六下)
 * 3. 禮記正義 (Liji Zhengyi) - Book of Rites with Commentary (numbered) - 56 files
 * 4. 禮記註疏 (Liji Zhushu) - Book of Rites Selected Chapters - 29 named sections
 */

import * as fs from "fs";
import * as path from "path";

const BASE_DIR = path.join(
  __dirname,
  "../data/raw/Shisan_Jing_Zhushu"
);
const OUTPUT_BASE = path.join(__dirname, "../data/processed");

interface Paragraph {
  index: number;
  text: string;
}

interface ChapterData {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: Paragraph[];
  };
}

// Chinese numeral to number mapping
const CHINESE_NUMS: Record<string, number> = {
  "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
  "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
  "十一": 11, "十二": 12, "十三": 13, "十四": 14, "十五": 15,
  "十六": 16, "十七": 17, "十八": 18, "十九": 19, "二十": 20,
  "二十一": 21, "二十二": 22, "二十三": 23, "二十四": 24, "二十五": 25,
  "二十六": 26, "二十七": 27, "二十八": 28, "二十九": 29, "三十": 30,
  "三十一": 31, "三十二": 32, "三十三": 33, "三十四": 34, "三十五": 35,
  "三十六": 36, "三十七": 37, "三十八": 38, "三十九": 39, "四十": 40,
  "四十一": 41, "四十二": 42, "四十三": 43, "四十四": 44, "四十五": 45,
  "四十六": 46, "四十七": 47, "四十八": 48, "四十九": 49, "五十": 50,
};

function parseChineseNumeral(s: string): number {
  if (CHINESE_NUMS[s] !== undefined) return CHINESE_NUMS[s];
  // Handle edge cases
  throw new Error(`Unknown Chinese numeral: ${s}`);
}

/**
 * Split text content into paragraphs.
 *
 * These texts have varying structures:
 * - 周禮註疏 & 禮記註疏: one paragraph per line (100-150 lines per file)
 * - 儀禮註疏: uses [疏] markers on own lines + newlines between sections
 * - 禮記正義: very long lines (few per file), need splitting on markers
 *
 * Strategy: split on newlines first. For any resulting paragraph > 2000 chars,
 * split further on [疏]/【疏】/疏「 markers. Then merge tiny paragraphs.
 */
function splitIntoParagraphs(content: string): string[] {
  // Strip any header like "原文(無註)"
  content = content.replace(/^原文\(無註\)\s*/m, "");

  // Normalize line endings
  content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Split on newlines first
  const lines = content.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  // For very long lines (> 2000 chars), try to split on commentary markers
  const parts: string[] = [];
  for (const line of lines) {
    if (line.length <= 2000) {
      parts.push(line);
    } else {
      // Split on [疏] or 【疏】 or [【疏】 patterns at the start of sub-sections
      // These markers indicate the start of a new commentary section
      const subParts = line.split(/(?=\[疏\]|\[疏[「]|【疏】|\[【疏】)/);
      for (const sp of subParts) {
        const trimmed = sp.trim();
        if (trimmed.length > 0) {
          parts.push(trimmed);
        }
      }
    }
  }

  // Merge tiny paragraphs (< 50 chars) with the next one
  const merged: string[] = [];
  let buffer = "";

  for (let i = 0; i < parts.length; i++) {
    if (buffer) {
      buffer += "\n" + parts[i];
      if (buffer.length >= 50 || i === parts.length - 1) {
        merged.push(buffer);
        buffer = "";
      }
    } else if (parts[i].length < 50 && i < parts.length - 1) {
      buffer = parts[i];
    } else {
      merged.push(parts[i]);
    }
  }
  if (buffer) {
    merged.push(buffer);
  }

  return merged;
}

function writeChapter(outputDir: string, data: ChapterData): void {
  const filename = `chapter-${String(data.chapterNumber).padStart(3, "0")}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function stripCopyrightNotice(content: string): string {
  // Strip common copyright/public domain notices at end
  return content.replace(
    /此作品在全世界都属于公有领域[\s\S]*$/m,
    ""
  ).replace(
    /Public domain[\s\S]*$/m,
    ""
  ).trim();
}

// ============================================================
// 1. 周禮註疏 (Zhouli Zhushu)
// ============================================================
function processZhouliZhushu(): void {
  const srcDir = path.join(BASE_DIR, "周禮註疏");
  const outputDir = path.join(OUTPUT_BASE, "zhouli-zhushu");
  ensureDir(outputDir);

  // From the index: 周禮 → ch1, 周禮正義 → ch2, 卷一-卷四十二 → ch3-44
  // But: 周禮.txt is just a table of contents (6 lines), 周禮正義.txt is empty (0 bytes)
  // So we only process 卷一 through 卷四十二, as chapters 1-42

  const volumes: { file: string; num: number }[] = [];

  for (let i = 1; i <= 42; i++) {
    const numStr = Object.entries(CHINESE_NUMS).find(([, v]) => v === i)?.[0];
    if (!numStr) continue;
    const filename = `周禮註疏卷${numStr}.txt`;
    const filepath = path.join(srcDir, filename);
    if (fs.existsSync(filepath)) {
      volumes.push({ file: filepath, num: i });
    } else {
      console.warn(`  WARNING: Missing file ${filename}`);
    }
  }

  console.log(`\n[周禮註疏] Processing ${volumes.length} volumes...`);

  // Also include 周禮.txt as chapter 1 if it has real content
  const zhouliBase = path.join(srcDir, "周禮.txt");
  const zhouliContent = fs.readFileSync(zhouliBase, "utf-8").trim();
  const strippedBase = stripCopyrightNotice(zhouliContent);

  let chapterNum = 1;

  if (strippedBase.length > 100) {
    // Has real content, include as chapter 1
    const paragraphs = splitIntoParagraphs(strippedBase);
    writeChapter(outputDir, {
      chapterNumber: chapterNum,
      title: "周禮 (Base Text)",
      sourceContent: {
        paragraphs: paragraphs.map((text, index) => ({ index, text })),
      },
    });
    chapterNum++;
  }

  // Process the volumes
  for (const vol of volumes) {
    const content = fs.readFileSync(vol.file, "utf-8");
    const cleaned = stripCopyrightNotice(content).trim();
    if (cleaned.length === 0) {
      console.warn(`  WARNING: Empty file for volume ${vol.num}`);
      continue;
    }
    const paragraphs = splitIntoParagraphs(cleaned);
    const numStr = Object.entries(CHINESE_NUMS).find(([, v]) => v === vol.num)?.[0] || String(vol.num);
    writeChapter(outputDir, {
      chapterNumber: chapterNum,
      title: `卷${numStr}`,
      sourceContent: {
        paragraphs: paragraphs.map((text, index) => ({ index, text })),
      },
    });
    chapterNum++;
  }

  console.log(`  Written ${chapterNum - 1} chapters to ${outputDir}`);
}

// ============================================================
// 2. 儀禮註疏 (Yili Zhushu)
// ============================================================
function processYiliZhushu(): void {
  const srcDir = path.join(BASE_DIR, "儀禮註疏");
  const outputDir = path.join(OUTPUT_BASE, "yili-zhushu");
  ensureDir(outputDir);

  // From index: 卷一 through 卷五十, including 卷二十六下
  // Order: 卷一...卷二十六, 卷二十六下, 卷二十七...卷五十 = 51 files

  const volumes: { file: string; title: string; sortKey: number }[] = [];

  for (let i = 1; i <= 50; i++) {
    const numStr = Object.entries(CHINESE_NUMS).find(([, v]) => v === i)?.[0];
    if (!numStr) continue;
    const filename = `儀禮註疏卷${numStr}.txt`;
    const filepath = path.join(srcDir, filename);
    if (fs.existsSync(filepath)) {
      volumes.push({ file: filepath, title: `卷${numStr}`, sortKey: i * 10 });
    } else {
      console.warn(`  WARNING: Missing file ${filename}`);
    }

    // Check for 卷二十六下
    if (i === 26) {
      const subFilename = `儀禮註疏卷二十六下.txt`;
      const subFilepath = path.join(srcDir, subFilename);
      if (fs.existsSync(subFilepath)) {
        volumes.push({ file: subFilepath, title: "卷二十六下", sortKey: i * 10 + 5 });
      }
    }
  }

  // Sort by sortKey
  volumes.sort((a, b) => a.sortKey - b.sortKey);

  console.log(`\n[儀禮註疏] Processing ${volumes.length} volumes...`);

  for (let i = 0; i < volumes.length; i++) {
    const vol = volumes[i];
    const content = fs.readFileSync(vol.file, "utf-8");
    const cleaned = stripCopyrightNotice(content).trim();
    if (cleaned.length === 0) {
      console.warn(`  WARNING: Empty file for ${vol.title}`);
      continue;
    }
    const paragraphs = splitIntoParagraphs(cleaned);
    writeChapter(outputDir, {
      chapterNumber: i + 1,
      title: vol.title,
      sourceContent: {
        paragraphs: paragraphs.map((text, index) => ({ index, text })),
      },
    });
  }

  console.log(`  Written ${volumes.length} chapters to ${outputDir}`);
}

// ============================================================
// 3. 禮記正義 (Liji Zhengyi) - numbered files
// ============================================================
function processLijiZhengyi(): void {
  const srcDir = path.join(BASE_DIR, "禮記正義");
  const outputDir = path.join(OUTPUT_BASE, "liji-zhengyi");
  ensureDir(outputDir);

  // From index: 00-60 with gaps at 50, 51, 56, 57, 59
  // Actual files found: 00-49, 52-55, 58, 60
  const allNums: number[] = [];
  for (let i = 0; i <= 60; i++) {
    const numStr = String(i).padStart(2, "0");
    const filename = `禮記正義${numStr}.txt`;
    const filepath = path.join(srcDir, filename);
    if (fs.existsSync(filepath)) {
      allNums.push(i);
    }
  }

  console.log(`\n[禮記正義] Processing ${allNums.length} files...`);

  for (let i = 0; i < allNums.length; i++) {
    const num = allNums[i];
    const numStr = String(num).padStart(2, "0");
    const filename = `禮記正義${numStr}.txt`;
    const filepath = path.join(srcDir, filename);
    const content = fs.readFileSync(filepath, "utf-8");
    const cleaned = stripCopyrightNotice(content).trim();
    if (cleaned.length === 0) {
      console.warn(`  WARNING: Empty file ${filename}`);
      continue;
    }
    const paragraphs = splitIntoParagraphs(cleaned);

    // Title: use the number, with 00 being "序" (preface)
    const title = num === 0 ? "序 (Preface)" : `卷${numStr}`;

    writeChapter(outputDir, {
      chapterNumber: i + 1,
      title,
      sourceContent: {
        paragraphs: paragraphs.map((text, index) => ({ index, text })),
      },
    });
  }

  console.log(`  Written ${allNums.length} chapters to ${outputDir}`);
}

// ============================================================
// 4. 禮記註疏 (Liji Zhushu) - named sections
// ============================================================
function processLijiZhushu(): void {
  const srcDir = path.join(BASE_DIR, "禮記註疏");
  const outputDir = path.join(OUTPUT_BASE, "liji-zhushu");
  ensureDir(outputDir);

  // From the index file, the named sections in order are:
  const sections = [
    "曲禮上", "曲禮下", "檀弓上", "檀弓下", "王制",
    "經解", "哀公問", "仲尼燕居", "孔子閒居", "坊記",
    "中庸", "表記", "緇衣", "奔喪", "問喪",
    "服問", "間傳", "三年問", "深衣", "投壺",
    "儒行", "大學", "冠義", "昏義", "鄉飲酒義",
    "射義", "燕義", "聘義", "喪服四制",
  ];

  console.log(`\n[禮記註疏] Processing ${sections.length} sections...`);

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const filename = `禮記註疏${section}.txt`;
    const filepath = path.join(srcDir, filename);
    if (!fs.existsSync(filepath)) {
      console.warn(`  WARNING: Missing file ${filename}`);
      continue;
    }
    const content = fs.readFileSync(filepath, "utf-8");
    const cleaned = stripCopyrightNotice(content).trim();
    if (cleaned.length === 0) {
      console.warn(`  WARNING: Empty file ${filename}`);
      continue;
    }
    const paragraphs = splitIntoParagraphs(cleaned);
    writeChapter(outputDir, {
      chapterNumber: i + 1,
      title: section,
      sourceContent: {
        paragraphs: paragraphs.map((text, index) => ({ index, text })),
      },
    });
  }

  console.log(`  Written ${sections.length} chapters to ${outputDir}`);
}

// ============================================================
// Main
// ============================================================
function main(): void {
  console.log("=== Processing Three Rites (三禮) from Shisan Jing Zhushu ===");
  console.log(`Source: ${BASE_DIR}`);
  console.log(`Output: ${OUTPUT_BASE}`);

  processZhouliZhushu();
  processYiliZhushu();
  processLijiZhengyi();
  processLijiZhushu();

  console.log("\n=== Done ===");
}

main();
