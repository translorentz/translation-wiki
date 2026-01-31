/**
 * Processes Zhicao Pin (太上洞玄靈寶芝草品) raw text into structured JSON.
 *
 * Source: Single file in data/raw/zhicao_pin/
 * The text is a Daoist pharmacopoeia cataloguing magical fungi (芝).
 *
 * Structure: A preface followed by ~130 fungus entries, each starting with
 * a name on its own line followed by a description paragraph.
 * We group entries into thematic chapters.
 *
 * Usage: pnpm tsx scripts/process-zhicao-pin.ts
 */

import fs from "fs";
import path from "path";

const RAW_FILE = path.resolve(
  "data/raw/zhicao_pin/taishang_dongxuan_lingbao_zhicao_pin.txt"
);
const OUTPUT_DIR = path.resolve("data/processed/zhicao-pin");

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

// Known fungus names that start entries
const FUNGUS_NAMES = [
  "青玉芝", "赤玉芝", "黄玉芝", "白玉芝", "黑玉芝", "五帝玉芝",
  "青帝玉芝", "赤帝玉芝", "黄帝玉芝", "白帝玉芝", "黑帝玉芝",
  "東方芝", "南方芝", "中央芝", "西方芝", "北方芝",
  "石臼芝", "木神芝", "鬼菌芝", "人威芝", "金精芝", "黄芝",
  "生金芝", "龜威芝", "龍威芝", "鳥威芝", "火精芝", "火錫芝",
  "赤松子芝", "木精芝", /* dup 木神芝 */ "天目芝", "天心芝", "白英芝", "水神芝", "土芝",
  "望玉芝", "木文芝", "銅芝", "天絳芝", "茯苓芝", /* dup 北方芝 */ "木菌芝", "風精芝", "靈精芝", "鳥文芝", "玉菌芝",
  "晝精芝", "夜精芝", /* dup 白玉芝 */ "朝精芝", "春精芝", "土菌芝", "木菌黄芝", "夏精芝", "秋精芝",
  "白雲芝", "左神芝", "右神芝", "木祿芝", "石菌芝", "赤圭芝", "鐵精芝", "柯精芝", /* dup 土菌芝 */ "石芝", "石精芝", "河閉芝",
  "水菌芝", "獸菌芝", "海闕芝", "雲瑤芝", "青菌芝", "雲芝", "崑崙芝", "人精芝", "山英芝",
  "紫芝", "冬如芝", "赤精芝", "紫石芝", "紫蓋芝", /* dup 赤精芝 */ "迎山連芝", "紫山芝", /* dup 紫芝 */ "木芝", "水芝", "重紫芝", "六柱紫芝", "紫科芝", /* dup 紫芝 */ /* dup 重紫芝 */ /* dup 紫芝 */ "科芝", /* dup 紫芝 */ "火芝", /* dup 科芝 */ /* dup 水芝 */
  "宮芝", "闕芝", "上祿芝", "玉精芝", "代侯芝", "曇芝", "不死芝", "朱芝", "天威芝", "辟精芝", "天寒芝", "赤英芝", "天芝", "天陸芝", "天闕芝", "地精芝", "日精芝", "月精芝", "四時精芝", "黑精芝", /* dup 木精芝 */ "水精芝", /* dup 金精芝 */ /* dup 水芝 */ "雨精芝", /* dup 水精芝 */ "雲精芝", "虎精芝",
];

interface Entry {
  name: string;
  text: string; // full text including name line merged with description
}

function parseEntries(lines: string[]): { preface: string; entries: Entry[] } {
  // Lines 1-2 are the preface
  const prefaceLines: string[] = [];
  const entries: Entry[] = [];

  let i = 0;
  // Collect preface: first lines before any fungus name
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    // Check if this line is a standalone fungus name (short line ending in 芝)
    if (line.length <= 6 && line.endsWith("芝")) {
      break;
    }
    prefaceLines.push(line);
    i++;
  }

  // Parse entries: each entry is a name line followed by description lines
  let currentName = "";
  let currentDesc: string[] = [];

  function flushEntry() {
    if (currentName && currentDesc.length > 0) {
      entries.push({
        name: currentName,
        text: currentName + "\n" + currentDesc.join(""),
      });
    } else if (currentName) {
      entries.push({ name: currentName, text: currentName });
    }
    currentName = "";
    currentDesc = [];
  }

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    // A fungus name line: short (<=6 chars), ends with 芝
    if (line.length <= 6 && line.endsWith("芝")) {
      flushEntry();
      currentName = line;
    } else {
      currentDesc.push(line);
    }
    i++;
  }
  flushEntry();

  return { preface: prefaceLines.join(""), entries };
}

// Chapter definitions: [title_zh, title_en, entry range as name-based filter]
interface ChapterDef {
  titleZh: string;
  titleEn: string;
  startEntry: number; // inclusive
  endEntry: number; // exclusive
}

function buildChapters(preface: string, entries: Entry[]): ProcessedChapter[] {
  const chapters: ProcessedChapter[] = [];
  let chapterNum = 1;

  // Chapter 1: Preface
  chapters.push({
    chapterNumber: chapterNum++,
    title: "序 (Preface)",
    sourceContent: {
      paragraphs: [{ index: 0, text: preface }],
    },
  });

  // Group entries by theme
  const groups: { title: string; entries: Entry[] }[] = [];

  let idx = 0;

  // Group: Jade Fungi (玉芝) - entries with 玉芝 in name (first 6)
  const jadeFungi: Entry[] = [];
  while (idx < entries.length && entries[idx].name.includes("玉芝")) {
    jadeFungi.push(entries[idx]);
    idx++;
  }
  if (jadeFungi.length > 0) groups.push({ title: "玉芝 (Jade Fungi)", entries: jadeFungi });

  // Group: Emperor Fungi (帝芝) - entries with 帝 in name
  const emperorFungi: Entry[] = [];
  while (idx < entries.length && entries[idx].name.includes("帝")) {
    emperorFungi.push(entries[idx]);
    idx++;
  }
  if (emperorFungi.length > 0) groups.push({ title: "帝芝 (Emperor Fungi)", entries: emperorFungi });

  // Group: Directional Fungi (方位芝)
  const directionalNames = ["東方芝", "南方芝", "中央芝", "西方芝", "北方芝"];
  const directionalFungi: Entry[] = [];
  while (idx < entries.length && directionalNames.includes(entries[idx].name)) {
    directionalFungi.push(entries[idx]);
    idx++;
  }
  if (directionalFungi.length > 0) groups.push({ title: "方位芝 (Directional Fungi)", entries: directionalFungi });

  // Group: Stone, Spirit, and Creature Fungi - next batch up to about 火錫芝
  const spiritCreature: Entry[] = [];
  const spiritCreatureEnd = ["赤松子芝"];
  while (idx < entries.length && !spiritCreatureEnd.includes(entries[idx].name)) {
    spiritCreature.push(entries[idx]);
    idx++;
  }
  if (spiritCreature.length > 0) groups.push({ title: "石精鬼靈芝 (Stone, Spirit, and Creature Fungi)", entries: spiritCreature });

  // Group: Wood and Plant Fungi - from 赤松子芝 up to about 望玉芝
  const woodPlant: Entry[] = [];
  const woodPlantEnd = ["望玉芝"];
  while (idx < entries.length && !woodPlantEnd.includes(entries[idx].name)) {
    woodPlant.push(entries[idx]);
    idx++;
  }
  if (woodPlant.length > 0) groups.push({ title: "木草芝 (Wood and Plant Fungi)", entries: woodPlant });

  // Group: Miscellaneous Named Fungi I - from 望玉芝 to 晝精芝
  const misc1: Entry[] = [];
  const misc1End = ["晝精芝"];
  while (idx < entries.length && !misc1End.includes(entries[idx].name)) {
    misc1.push(entries[idx]);
    idx++;
  }
  if (misc1.length > 0) groups.push({ title: "雜芝上 (Miscellaneous Fungi, Part 1)", entries: misc1 });

  // Group: Temporal Fungi - 晝精/夜精/朝精/春精/夏精/秋精 etc
  const temporal: Entry[] = [];
  const temporalEnd = ["白雲芝"];
  while (idx < entries.length && !temporalEnd.includes(entries[idx].name)) {
    temporal.push(entries[idx]);
    idx++;
  }
  if (temporal.length > 0) groups.push({ title: "時令芝 (Temporal and Seasonal Fungi)", entries: temporal });

  // Group: Cloud, Spirit, and Mineral Fungi - from 白雲芝 to 水菌芝
  const cloudMineral: Entry[] = [];
  const cloudMineralEnd = ["水菌芝"];
  while (idx < entries.length && !cloudMineralEnd.includes(entries[idx].name)) {
    cloudMineral.push(entries[idx]);
    idx++;
  }
  if (cloudMineral.length > 0) groups.push({ title: "雲石芝 (Cloud and Mineral Fungi)", entries: cloudMineral });

  // Group: Water and Beast Fungi - from 水菌芝 to 紫芝
  const waterBeast: Entry[] = [];
  const waterBeastEnd = ["紫芝"];
  while (idx < entries.length && entries[idx].name !== "紫芝") {
    waterBeast.push(entries[idx]);
    idx++;
  }
  if (waterBeast.length > 0) groups.push({ title: "水獸芝 (Water and Beast Fungi)", entries: waterBeast });

  // Group: Purple Fungi and Variants - from first 紫芝 to 宮芝
  const purple: Entry[] = [];
  const purpleEnd = ["宮芝"];
  while (idx < entries.length && !purpleEnd.includes(entries[idx].name)) {
    purple.push(entries[idx]);
    idx++;
  }
  if (purple.length > 0) groups.push({ title: "紫芝 (Purple Fungi)", entries: purple });

  // Group: Celestial and Elemental Fungi - everything remaining
  const celestial: Entry[] = [];
  while (idx < entries.length) {
    celestial.push(entries[idx]);
    idx++;
  }
  if (celestial.length > 0) groups.push({ title: "天地精芝 (Celestial and Elemental Fungi)", entries: celestial });

  // Convert groups to chapters
  for (const group of groups) {
    const paragraphs = group.entries.map((entry, i) => ({
      index: i,
      text: entry.text,
    }));

    chapters.push({
      chapterNumber: chapterNum++,
      title: group.title,
      sourceContent: { paragraphs },
    });
  }

  return chapters;
}

function main() {
  console.log("Processing Zhicao Pin (太上洞玄靈寶芝草品)...\n");

  const content = fs.readFileSync(RAW_FILE, "utf-8");
  const lines = content.split("\n").map((l) => l.trim());

  const { preface, entries } = parseEntries(lines);
  console.log(`Found ${entries.length} fungus entries\n`);

  const chapters = buildChapters(preface, entries);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalParagraphs = 0;
  let totalChars = 0;

  for (const chapter of chapters) {
    const outFileName = `chapter-${String(chapter.chapterNumber).padStart(3, "0")}.json`;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, outFileName),
      JSON.stringify(chapter, null, 2) + "\n"
    );

    const charCount = chapter.sourceContent.paragraphs.reduce(
      (sum, p) => sum + p.text.length,
      0
    );
    totalParagraphs += chapter.sourceContent.paragraphs.length;
    totalChars += charCount;

    console.log(
      `  Chapter ${chapter.chapterNumber} "${chapter.title}": ${chapter.sourceContent.paragraphs.length} paragraphs, ${charCount.toLocaleString()} chars → ${outFileName}`
    );
  }

  console.log(`\n========================================`);
  console.log(`Processing complete!`);
  console.log(`  Total chapters: ${chapters.length}`);
  console.log(`  Total paragraphs (entries): ${totalParagraphs}`);
  console.log(`  Total characters: ${totalChars.toLocaleString()}`);
  console.log(`  Output: ${OUTPUT_DIR}`);
  console.log(`========================================\n`);
}

main();
