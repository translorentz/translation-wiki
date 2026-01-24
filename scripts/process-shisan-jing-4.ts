/**
 * Process the Three Spring and Autumn Commentaries (春秋三傳) from the
 * Thirteen Classics with Commentaries (十三經註疏):
 *
 * 1. 春秋左傳正義 (Zuozhuan Zhengyi) — Kong Yingda's sub-commentary on the Zuo Commentary
 * 2. 春秋公羊傳註疏 (Gongyang Zhushu) — He Xiu's commentary + Xu Yan's sub-commentary
 * 3. 春秋穀梁傳註疏 (Guliang Zhushu) — Fan Ning's commentary + Yang Shixun's sub-commentary
 *
 * Source: data/raw/Shisan_Jing_Zhushu/
 * Output: data/processed/{zuozhuan-zhengyi,gongyang-zhushu,guliang-zhushu}/chapter-NNN.json
 */

import fs from "fs";
import path from "path";

const BASE_DIR = path.resolve("data/raw/Shisan_Jing_Zhushu");
const OUTPUT_BASE = path.resolve("data/processed");

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

// ============================================================
// Utility functions
// ============================================================

/**
 * Strip copyright/public domain footer lines from file content
 */
function stripFooter(content: string): string {
  const lines = content.split("\n");
  const filtered: string[] = [];
  for (const line of lines) {
    // Stop at copyright/public domain notices
    if (
      line.includes("此作品在全世界都属于公有领域") ||
      line.includes("Public domain") ||
      line.includes("本作品原文沒有標點") ||
      line.includes("若由維基文庫用戶") ||
      line.includes("知识共享") ||
      line.includes("CC BY-SA") ||
      line.includes("GNU自由文档") ||
      line.includes("1999年7月12日") ||
      line.includes("中华人民共和国国家版权局") ||
      line.includes("关于古籍") ||
      line.includes("中華民國94年") ||
      line.includes("智慧財產局") ||
      line.includes("章忠信") ||
      line.includes("著作權筆記") ||
      line.includes("domainfalsefalse")
    ) {
      continue;
    }
    filtered.push(line);
  }
  // Remove trailing empty lines
  while (filtered.length > 0 && filtered[filtered.length - 1].trim() === "") {
    filtered.pop();
  }
  return filtered.join("\n");
}

/**
 * Strip header lines like "原文(無註)" if present
 */
function stripHeader(content: string): string {
  const lines = content.split("\n");
  // Check if first line is a header marker
  if (lines.length > 0 && lines[0].match(/^原文[（(]無註[)）]/)) {
    lines.shift();
  }
  return lines.join("\n");
}

/**
 * Split content into paragraphs based on:
 * 1. [疏] markers (sub-commentary sections)
 * 2. Double newlines
 * 3. Very long single lines get split at 【】 markers
 */
function splitIntoParagraphs(content: string): string[] {
  // First normalize: collapse multiple blank lines to double-newline
  let normalized = content.replace(/\n{3,}/g, "\n\n");

  // Split on double newlines first
  const rawBlocks = normalized.split(/\n\n+/);

  const paragraphs: string[] = [];

  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // For very long blocks, try to split at [疏] markers
    if (trimmed.length > 2000) {
      // Split on [疏] that starts a new sub-commentary section
      const subParts = trimmed.split(/(?=\[疏)/);
      for (const part of subParts) {
        const p = part.trim();
        if (p) {
          // Further split on 【】 scholar attribution markers for very long sections
          if (p.length > 3000) {
            const scholarParts = p.split(/(?=【[^】]+】)/);
            for (const sp of scholarParts) {
              const s = sp.trim();
              if (s) paragraphs.push(s);
            }
          } else {
            paragraphs.push(p);
          }
        }
      }
    } else {
      paragraphs.push(trimmed);
    }
  }

  return paragraphs;
}

/**
 * Merge tiny paragraphs (< 50 chars) with the next paragraph
 */
function mergeTinyParagraphs(paragraphs: string[]): string[] {
  if (paragraphs.length === 0) return [];

  const result: string[] = [];
  let pending = "";

  for (const p of paragraphs) {
    if (pending) {
      // Merge pending with current
      result.push(pending + "\n" + p);
      pending = "";
    } else if (p.length < 50 && result.length > 0) {
      // Too short — merge with previous
      result[result.length - 1] += "\n" + p;
    } else if (p.length < 50 && result.length === 0) {
      // First paragraph is tiny — hold it
      pending = p;
    } else {
      result.push(p);
    }
  }

  if (pending) {
    if (result.length > 0) {
      result[result.length - 1] += "\n" + pending;
    } else {
      result.push(pending);
    }
  }

  return result;
}

/**
 * Process a single file into paragraphs.
 * Strategy: Each non-empty line is treated as a paragraph.
 * Very long lines (> 3000 chars) are split at commentary markers.
 * Tiny paragraphs (< 50 chars) are merged with adjacent ones.
 */
function processFile(filePath: string): string[] {
  let content = fs.readFileSync(filePath, "utf-8");
  content = stripFooter(content);
  content = stripHeader(content);

  // Each line is a natural paragraph in these files
  const lines = content.split("\n").filter((l) => l.trim());

  const paragraphs: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.length > 3000) {
      // Split very long lines at commentary markers:
      // [疏], 疏 (at start or after period), 【...】
      const parts = trimmed.split(
        /(?=\[疏)|(?=(?:^|。)疏[「「正義])|(?=【[^】]{2,}】\[)/
      );
      for (const part of parts) {
        const p = part.trim();
        if (p) paragraphs.push(p);
      }
    } else {
      paragraphs.push(trimmed);
    }
  }

  return mergeTinyParagraphs(paragraphs);
}

/**
 * Write a processed chapter to JSON
 */
function writeChapter(
  outputDir: string,
  chapter: ProcessedChapter
): void {
  const fileName = `chapter-${String(chapter.chapterNumber).padStart(3, "0")}.json`;
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(chapter, null, 2), "utf-8");
}

// ============================================================
// Text-specific processing
// ============================================================

interface FileEntry {
  path: string;
  title: string;
}

function getZuozhuanFiles(): FileEntry[] {
  const zhengyi = path.join(BASE_DIR, "春秋左傳正義");
  const zhushu = path.join(BASE_DIR, "春秋左傳註疏");
  const files: FileEntry[] = [];

  // 1. 序 (Preface)
  files.push({
    path: path.join(zhengyi, "春秋左傳正義序.txt"),
    title: "春秋左傳正義序 (Preface to the Correct Meaning of the Zuo Commentary)",
  });

  // 2-36. 卷01-卷35 (volumes 01-35, skipping 23 which is missing from source)
  for (let i = 1; i <= 35; i++) {
    const volNum = String(i).padStart(2, "0");
    const filePath = path.join(zhengyi, `春秋左傳正義卷${volNum}.txt`);
    if (fs.existsSync(filePath)) {
      files.push({
        path: filePath,
        title: `春秋左傳正義卷${volNum} (Zuozhuan Zhengyi, Volume ${i})`,
      });
    }
  }

  // 37. 春秋經傳集解後序 (Afterword)
  files.push({
    path: path.join(zhengyi, "春秋左傳正義春秋經傳集解後序.txt"),
    title: "春秋經傳集解後序 (Afterword to the Collected Commentaries)",
  });

  // Additional unique files from 春秋左傳註疏/
  // These contain reign-period specific content not in the 正義 volumes

  // The 宣公/十二年 file is listed in the index between 卷22 and 卷24
  // It already exists in the 正義 folder too, but we use the 註疏 version
  // since it's listed as a unique supplement
  const uniqueFiles: { file: string; title: string }[] = [
    { file: "春秋左傳註疏隱公.txt", title: "春秋左傳 隱公 (Duke Yin)" },
    {
      file: "春秋左傳註疏隱公元年.txt",
      title: "春秋左傳 隱公元年 (Duke Yin, Year 1)",
    },
    {
      file: "春秋左傳註疏莊公廿八年.txt",
      title: "春秋左傳 莊公廿八年 (Duke Zhuang, Year 28)",
    },
    {
      file: "春秋左傳註疏宣公十二年.txt",
      title: "春秋左傳 宣公十二年 (Duke Xuan, Year 12)",
    },
    { file: "春秋左傳註疏襄公.txt", title: "春秋左傳 襄公 (Duke Xiang)" },
    {
      file: "春秋左傳註疏襄公廿五年.txt",
      title: "春秋左傳 襄公廿五年 (Duke Xiang, Year 25)",
    },
    {
      file: "春秋左傳註疏襄公廿六年.txt",
      title: "春秋左傳 襄公廿六年 (Duke Xiang, Year 26)",
    },
  ];

  for (const uf of uniqueFiles) {
    const filePath = path.join(zhushu, uf.file);
    if (fs.existsSync(filePath)) {
      files.push({ path: filePath, title: uf.title });
    }
  }

  return files;
}

function getGongyangFiles(): FileEntry[] {
  const dir = path.join(BASE_DIR, "春秋公羊傳註疏");
  const files: FileEntry[] = [];

  // 1. 序 (Preface)
  files.push({
    path: path.join(dir, "春秋公羊傳註疏序.txt"),
    title: "春秋公羊傳註疏序 (Preface to the Gongyang Commentary)",
  });

  // 2. 昭公/十年 (Duke Zhao, Year 10) — special section
  files.push({
    path: path.join(dir, "春秋公羊傳註疏昭公十年.txt"),
    title: "春秋公羊傳 昭公十年 (Duke Zhao, Year 10)",
  });

  // 3-30. 卷01-卷28 (volumes 01-28)
  for (let i = 1; i <= 28; i++) {
    const volNum = String(i).padStart(2, "0");
    const filePath = path.join(dir, `春秋公羊傳註疏卷${volNum}.txt`);
    if (fs.existsSync(filePath)) {
      files.push({
        path: filePath,
        title: `春秋公羊傳註疏卷${volNum} (Gongyang Zhushu, Volume ${i})`,
      });
    }
  }

  return files;
}

function getGuliangFiles(): FileEntry[] {
  const dir = path.join(BASE_DIR, "春秋穀梁傳註疏");
  const files: FileEntry[] = [];

  // 1. 序 (Preface)
  files.push({
    path: path.join(dir, "春秋穀梁傳註疏序.txt"),
    title: "春秋穀梁傳註疏序 (Preface to the Guliang Commentary)",
  });

  // 2-21. 卷01-卷20 (volumes 01-20)
  for (let i = 1; i <= 20; i++) {
    const volNum = String(i).padStart(2, "0");
    const filePath = path.join(dir, `春秋穀梁傳註疏卷${volNum}.txt`);
    if (fs.existsSync(filePath)) {
      files.push({
        path: filePath,
        title: `春秋穀梁傳註疏卷${volNum} (Guliang Zhushu, Volume ${i})`,
      });
    }
  }

  return files;
}

function processText(
  slug: string,
  files: FileEntry[]
): void {
  const outputDir = path.join(OUTPUT_BASE, slug);
  fs.mkdirSync(outputDir, { recursive: true });

  let totalParagraphs = 0;
  let totalChars = 0;

  for (let i = 0; i < files.length; i++) {
    const entry = files[i];
    const chapterNumber = i + 1;

    if (!fs.existsSync(entry.path)) {
      console.error(`  [MISSING] ${entry.path}`);
      continue;
    }

    const paragraphs = processFile(entry.path);
    const indexed: Paragraph[] = paragraphs.map((text, idx) => ({
      index: idx,
      text,
    }));

    const chapter: ProcessedChapter = {
      chapterNumber,
      title: entry.title,
      sourceContent: { paragraphs: indexed },
    };

    writeChapter(outputDir, chapter);

    const charCount = paragraphs.reduce((sum, p) => sum + p.length, 0);
    totalParagraphs += paragraphs.length;
    totalChars += charCount;

    console.log(
      `  [${String(chapterNumber).padStart(3, " ")}] ${entry.title} — ${paragraphs.length} paragraphs, ${charCount.toLocaleString()} chars`
    );
  }

  console.log(
    `\n  Total: ${files.length} chapters, ${totalParagraphs.toLocaleString()} paragraphs, ${totalChars.toLocaleString()} chars\n`
  );
}

// ============================================================
// Main
// ============================================================

function main(): void {
  console.log("Processing Spring and Autumn Commentaries (春秋三傳)\n");
  console.log("=".repeat(70));

  // 1. Zuozhuan Zhengyi
  console.log("\n1. 春秋左傳正義 (Zuozhuan Zhengyi)");
  console.log("-".repeat(50));
  const zuozhuanFiles = getZuozhuanFiles();
  console.log(`  Found ${zuozhuanFiles.length} files to process\n`);
  processText("zuozhuan-zhengyi", zuozhuanFiles);

  // 2. Gongyang Zhushu
  console.log("=".repeat(70));
  console.log("\n2. 春秋公羊傳註疏 (Gongyang Zhushu)");
  console.log("-".repeat(50));
  const gongyangFiles = getGongyangFiles();
  console.log(`  Found ${gongyangFiles.length} files to process\n`);
  processText("gongyang-zhushu", gongyangFiles);

  // 3. Guliang Zhushu
  console.log("=".repeat(70));
  console.log("\n3. 春秋穀梁傳註疏 (Guliang Zhushu)");
  console.log("-".repeat(50));
  const guliangFiles = getGuliangFiles();
  console.log(`  Found ${guliangFiles.length} files to process\n`);
  processText("guliang-zhushu", guliangFiles);

  console.log("=".repeat(70));
  console.log("\nDone! All three texts processed.");
}

main();
