/**
 * Processes 4 texts from the Thirteen Classics with Commentaries (十三經註疏):
 * 1. 論語註疏 (Lunyu Zhushu) - Analects with Commentary
 * 2. 孟子註疏 (Mengzi Zhushu) - Mencius with Commentary
 * 3. 孝經註疏 (Xiaojing Zhushu) - Classic of Filial Piety with Commentary
 * 4. 爾雅註疏 (Erya Zhushu) - Erya Dictionary with Commentary
 *
 * These are multi-layered commentary texts with:
 * - Base text (original classic)
 * - Commentary in （parentheses）
 * - Sub-commentary marked with [疏] or 疏
 * - Scholar attributions in 【brackets】
 * - ○ markers as section separators
 *
 * ALL commentary layers are preserved as source text.
 *
 * Usage: pnpm tsx scripts/process-shisan-jing-1.ts
 */

import fs from "fs";
import path from "path";

const BASE_RAW_DIR = path.resolve("data/raw/Shisan_Jing_Zhushu");
const BASE_OUTPUT_DIR = path.resolve("data/processed");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

// Title mappings for each text
const LUNYU_TITLES: Record<string, string> = {
  "序": "序",
  "卷01": "卷一·學而第一",
  "卷02": "卷二·為政第二",
  "卷03": "卷三·八佾第三",
  "卷04": "卷四·里仁第四",
  "卷05": "卷五·公冶長第五",
  "卷06": "卷六·雍也第六",
  "卷07": "卷七·述而第七",
  "卷08": "卷八·泰伯第八",
  "卷09": "卷九·子罕第九",
  "卷10": "卷十·鄉黨第十",
  "卷11": "卷十一·先進第十一",
  "卷12": "卷十二·顏淵第十二",
  "卷13": "卷十三·子路第十三",
  "卷14": "卷十四·憲問第十四",
  "卷15": "卷十五·衛靈公第十五",
  "卷16": "卷十六·季氏第十六",
  "卷17": "卷十七·陽貨第十七",
  "卷18": "卷十八·微子第十八",
  "卷19": "卷十九·子張第十九",
  "卷20": "卷二十·堯曰第二十",
};

const MENGZI_TITLES: Record<string, string> = {
  "題辭解": "孟子注疏題辭解",
  "卷01": "卷一上·梁惠王上",
  "卷02": "卷一下·梁惠王下",
  "卷03": "卷二上·公孫丑上",
  "卷04": "卷二下·公孫丑下",
  "卷05": "卷三上·滕文公上",
  "卷06": "卷三下·滕文公下",
  "卷07": "卷四上·離婁上",
  "卷08": "卷四下·離婁下",
  "卷09": "卷五上·萬章上",
  "卷10": "卷五下·萬章下",
  "卷11": "卷六上·告子上",
  "卷12": "卷六下·告子下",
  "卷13": "卷七上·盡心上",
  "卷14": "卷七下·盡心下",
};

const XIAOJING_TITLES: Record<string, string> = {
  "序": "序",
  "卷1": "卷一·開宗明義章第一至卿大夫章第四",
  "卷2": "卷二·士章第五至庶人章第六",
  "卷3": "卷三·三才章第七至孝治章第八",
  "卷4": "卷四·聖治章第九至紀孝行章第十",
  "卷5": "卷五·五刑章第十一至廣要道章第十二",
  "卷6": "卷六·廣至德章第十三至廣揚名章第十四",
  "卷7": "卷七·諫諍章第十五至感應章第十六",
  "卷8": "卷八·事君章第十七",
  "卷9": "卷九·喪親章第十八",
};

const ERYA_TITLES: Record<string, string> = {
  "總敘": "爾雅注疏序(四庫全書本)",
  "卷01": "卷一·釋詁",
  "卷02": "卷二·釋言",
  "卷03": "卷三·釋訓、釋親",
  "卷04": "卷四·釋宮、釋器",
  "卷05": "卷五·釋樂、釋天",
  "卷06": "卷六·釋地、釋丘",
  "卷07": "卷七·釋山、釋水",
  "卷08": "卷八·釋草",
  "卷09": "卷九·釋木、釋蟲",
  "卷10": "卷十·釋魚、釋鳥、釋獸、釋畜",
};

interface TextConfig {
  rawDir: string;
  outputSlug: string;
  files: { filename: string; titleKey: string }[];
  titles: Record<string, string>;
}

function getTextConfigs(): TextConfig[] {
  return [
    {
      rawDir: "論語註疏",
      outputSlug: "lunyu-zhushu",
      files: [
        { filename: "論語註疏序.txt", titleKey: "序" },
        ...Array.from({ length: 20 }, (_, i) => ({
          filename: `論語註疏卷${String(i + 1).padStart(2, "0")}.txt`,
          titleKey: `卷${String(i + 1).padStart(2, "0")}`,
        })),
      ],
      titles: LUNYU_TITLES,
    },
    {
      rawDir: "孟子註疏",
      outputSlug: "mengzi-zhushu",
      files: [
        { filename: "孟子註疏孟子注疏題辭解.txt", titleKey: "題辭解" },
        ...Array.from({ length: 14 }, (_, i) => ({
          filename: `孟子註疏卷${String(i + 1).padStart(2, "0")}.txt`,
          titleKey: `卷${String(i + 1).padStart(2, "0")}`,
        })),
      ],
      titles: MENGZI_TITLES,
    },
    {
      rawDir: "孝經註疏",
      outputSlug: "xiaojing-zhushu",
      files: [
        { filename: "孝經註疏序.txt", titleKey: "序" },
        ...Array.from({ length: 9 }, (_, i) => ({
          filename: `孝經註疏卷${i + 1}.txt`,
          titleKey: `卷${i + 1}`,
        })),
      ],
      titles: XIAOJING_TITLES,
    },
    {
      rawDir: "爾雅註疏",
      outputSlug: "erya-zhushu",
      files: [
        { filename: "爾雅注疏 (四庫全書本).txt", titleKey: "總敘" },
        ...Array.from({ length: 10 }, (_, i) => ({
          filename: `爾雅註疏卷${String(i + 1).padStart(2, "0")}.txt`,
          titleKey: `卷${String(i + 1).padStart(2, "0")}`,
        })),
      ],
      titles: ERYA_TITLES,
    },
  ];
}

/**
 * Split text into paragraphs for commentary texts.
 *
 * The raw files have each logical unit (base text + commentary, or 疏 block)
 * on its own line. We treat each non-empty line as a paragraph.
 *
 * For files where content uses blank-line separation (like some 序 files),
 * blank lines act as separators between paragraphs that may span multiple lines.
 *
 * Finally, merge fragments shorter than 50 chars into adjacent paragraphs.
 */
function splitIntoParagraphs(content: string): string[] {
  // Normalize line endings and remove BOM
  content = content.replace(/\ufeff/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const lines = content.split("\n");

  // Determine the splitting strategy based on the file structure:
  // If most lines are very long (>200 chars), treat each line as a paragraph.
  // If lines are shorter and there are blank lines, use blank-line-separated blocks.
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
  const avgLineLen = nonEmptyLines.reduce((sum, l) => sum + l.length, 0) / (nonEmptyLines.length || 1);
  const hasBlankLines = lines.some((l) => l.trim() === "");
  const longLineCount = nonEmptyLines.filter((l) => l.length > 200).length;

  // Strategy: if many lines are long (each is a self-contained paragraph),
  // OR if there are no blank lines at all, treat each non-empty line as its own paragraph
  const blankLineCount = lines.length - nonEmptyLines.length;
  const useLinePerParagraph = longLineCount > nonEmptyLines.length * 0.3 ||
                              avgLineLen > 150 ||
                              blankLineCount < 3;

  let rawParagraphs: string[];

  if (useLinePerParagraph) {
    // Each non-empty line is its own paragraph
    rawParagraphs = nonEmptyLines.map((l) => l.trim());
  } else {
    // Group by blank-line separation, and also split on 疏 markers
    rawParagraphs = [];
    let currentBlock: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        if (currentBlock.length > 0) {
          rawParagraphs.push(currentBlock.join(""));
          currentBlock = [];
        }
        continue;
      }

      // Check if this line starts a new 疏 block
      const isShuStart = /^\[疏/.test(trimmed) ||
                         /^疏[「「]/.test(trimmed) ||
                         /^【疏】/.test(trimmed) ||
                         /^疏正義曰/.test(trimmed) ||
                         /^\[疏正義曰/.test(trimmed);

      if (isShuStart && currentBlock.length > 0) {
        rawParagraphs.push(currentBlock.join(""));
        currentBlock = [trimmed];
      } else {
        currentBlock.push(trimmed);
      }
    }

    if (currentBlock.length > 0) {
      rawParagraphs.push(currentBlock.join(""));
    }
  }

  // Merge short paragraphs (< 50 chars) into the preceding paragraph
  const merged: string[] = [];
  for (const para of rawParagraphs) {
    if (para.length < 50 && merged.length > 0) {
      merged[merged.length - 1] += "\n" + para;
    } else {
      merged.push(para);
    }
  }

  return merged.filter((p) => p.trim().length > 0);
}

function processText(config: TextConfig) {
  const rawDir = path.join(BASE_RAW_DIR, config.rawDir);
  const outputDir = path.join(BASE_OUTPUT_DIR, config.outputSlug);

  if (!fs.existsSync(rawDir)) {
    console.error(`  [err] Raw directory not found: ${rawDir}`);
    return;
  }

  fs.mkdirSync(outputDir, { recursive: true });

  let totalParagraphs = 0;
  let processedCount = 0;

  for (let i = 0; i < config.files.length; i++) {
    const { filename, titleKey } = config.files[i];
    const chapterNumber = i + 1;
    const filePath = path.join(rawDir, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`  [warn] File not found: ${filename}`);
      continue;
    }

    let content = fs.readFileSync(filePath, "utf-8");

    // Strip header lines like "原文(無註)" at the very start
    const headerPatterns = [
      /^原文\(無註\)\s*\n/,
      /^原文（無註）\s*\n/,
    ];
    for (const pat of headerPatterns) {
      content = content.replace(pat, "");
    }

    // For Erya's 四庫全書本 file, the content is mostly a table of contents
    // and metadata. We still process it as-is since it has the 注疏序 content.

    // Strip the first line if it's just the title repeated from filename
    const firstLine = content.split("\n")[0].trim();
    const titlePatterns = [
      /^論語序$/,
      /^卷.*學而.*$/,
      /^卷.*為政.*$/,
      /^孟子注疏題辭解$/,
      /^◎序$/,
    ];

    // Get the title for this chapter
    const title = config.titles[titleKey] || titleKey;

    // Split into paragraphs
    const paragraphs = splitIntoParagraphs(content);

    const chapter: ProcessedChapter = {
      chapterNumber,
      title,
      sourceContent: {
        paragraphs: paragraphs.map((text, idx) => ({
          index: idx + 1,
          text,
        })),
      },
    };

    const outFilename = `chapter-${String(chapterNumber).padStart(3, "0")}.json`;
    fs.writeFileSync(
      path.join(outputDir, outFilename),
      JSON.stringify(chapter, null, 2) + "\n"
    );

    totalParagraphs += paragraphs.length;
    processedCount++;

    console.log(
      `  Ch ${chapterNumber}: "${title}" — ${paragraphs.length} paragraphs → ${outFilename}`
    );
  }

  console.log(
    `  Total: ${processedCount} chapters, ${totalParagraphs} paragraphs\n`
  );
}

function main() {
  console.log("=== Processing Shisan Jing Zhushu (Batch 1) ===\n");

  const configs = getTextConfigs();

  for (const config of configs) {
    console.log(`\nProcessing: ${config.rawDir} → ${config.outputSlug}`);
    processText(config);
  }

  console.log("\n=== Done ===");
}

main();
