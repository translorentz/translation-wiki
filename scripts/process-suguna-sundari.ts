/**
 * Processes Suguna Sundari (சுகுணசுந்தரி சரித்திரம்) raw text into structured JSON.
 *
 * Source: data/raw/suguna_sundari/suguna_sundari.txt
 * Author: Mayuram Vedanayakam Pillai (1826-1889)
 * Published: 1887
 *
 * One of the earliest Tamil novels. Prose text with 21 chapters, each containing
 * numbered sub-sections. Front matter (prefaces, biography, TOC, proverbs list)
 * is separated into chapter-000.json. The novel body (chapters 1-21) maps to
 * chapter-001.json through chapter-021.json.
 *
 * Usage: pnpm tsx scripts/process-suguna-sundari.ts
 */

import fs from "fs";
import path from "path";

const RAW_FILE = path.resolve("data/raw/suguna_sundari/suguna_sundari.txt");
const OUTPUT_DIR = path.resolve("data/processed/suguna-sundari");

// Known main chapter titles from the TOC (lines 120-130).
// These are used to distinguish main chapters from sub-sections,
// since sub-sections also use numbered headings.
const MAIN_CHAPTER_TITLES: [number, string][] = [
  [1, "சுகுணசுந்தரியும் புவனேந்திரனும்"],
  [2, "மதுரேசனும் புவனேந்திரனும்"],
  [3, "பொறாமையும் சூழ்ச்சியும்"],
  [4, "சூழ்ச்சியும் கலக்கமும்"],
  [5, "புறங்கூறலும் கதைகளும்"],
  [6, "புன்மையும் பொய்ம்மையும்"],
  [7, "உடல்நலம் ஓம்பல்"],
  [8, "புவனேந்திரன் பொன் மொழிகள்"],
  [9, "திருமணப் பேச்சுகள்"],
  [10, "எதிர்பாராத நிகழ்ச்சிகள்"],
  [11, "மண மறுப்பும் சிறை இருப்பும்"],
  [12, "பழியும் சூழ்ச்சியும்"],
  [13, "முயற்சியும் சூழ்ச்சியும்"],
  [14, "சுகுணசுந்தரியின் சொற்பொழிவு"],
  [15, "சூழ்ச்சியின் வெற்றி"],
  [16, "இன்பமும் துன்பமும்"],
  [17, "துன்பம் வந்தால் தொடர்ந்துவரும்"],
  [18, "பெருமக்கள் குழுவின் முடிவு"],
  [19, "போரும் வெற்றியும்"],
  [20, "ஆரிய நாட்டு அரசர்"],
  [21, "முடிசூட்டு விழாவும் திருமணமும்"],
];

const FRONT_MATTER_END_LINE = 195; // "---" separator before novel body

interface ChapterData {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

function main() {
  console.log("Processing Suguna Sundari (சுகுணசுந்தரி சரித்திரம்)...\n");

  const rawContent = fs.readFileSync(RAW_FILE, "utf-8");
  const lines = rawContent.split("\n");

  console.log(`Total lines: ${lines.length}`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Find main chapter start lines by matching known titles
  const chapterStarts: { lineIndex: number; num: number; title: string }[] = [];

  for (const [num, title] of MAIN_CHAPTER_TITLES) {
    const prefix = `${num}. `;
    for (let i = FRONT_MATTER_END_LINE; i < lines.length; i++) {
      const line = lines[i].trim();
      // Match exactly "N. <title>" — allow minor spacing differences
      if (line.startsWith(prefix) && line.replace(/\s+/g, " ").includes(title.replace(/\s+/g, " "))) {
        chapterStarts.push({ lineIndex: i, num, title });
        break;
      }
    }
  }

  console.log(`Found ${chapterStarts.length} main chapters\n`);

  // Process front matter as chapter 0
  const frontMatterLines = lines.slice(0, FRONT_MATTER_END_LINE);
  const frontMatterParas = processParagraphs(frontMatterLines);
  const frontMatter: ChapterData = {
    chapterNumber: 0,
    title: "Front Matter",
    sourceContent: { paragraphs: frontMatterParas },
  };
  writeChapter(0, frontMatter);

  // Process each main chapter
  let totalParagraphs = frontMatter.sourceContent.paragraphs.length;
  let totalChars = frontMatter.sourceContent.paragraphs.reduce((s, p) => s + p.text.length, 0);

  for (let i = 0; i < chapterStarts.length; i++) {
    const start = chapterStarts[i];
    const endLine = i + 1 < chapterStarts.length
      ? chapterStarts[i + 1].lineIndex
      : lines.length;

    // Extract chapter content (skip the chapter heading line and its synopsis line)
    const chapterLines = lines.slice(start.lineIndex, endLine);
    const paras = processParagraphs(chapterLines);
    const chapter: ChapterData = {
      chapterNumber: start.num,
      title: start.title,
      sourceContent: { paragraphs: paras },
    };

    writeChapter(start.num, chapter);
    totalParagraphs += paras.length;
    totalChars += paras.reduce((s, p) => s + p.text.length, 0);

    console.log(
      `Chapter ${String(start.num).padStart(2)}: ${paras.length} paragraphs, ` +
      `${paras.reduce((s, p) => s + p.text.length, 0)} chars — ${start.title}`
    );
  }

  console.log(`\nTotal: ${chapterStarts.length + 1} files (front matter + 21 chapters)`);
  console.log(`Total paragraphs: ${totalParagraphs}`);
  console.log(`Total characters: ${totalChars}`);
}

function processParagraphs(lines: string[]): { index: number; text: string }[] {
  const text = lines.join("\n");
  const blocks = text.split(/\n\s*\n/);
  const paragraphs: { index: number; text: string }[] = [];
  let idx = 0;

  for (const block of blocks) {
    const trimmed = block.trim();
    if (trimmed && !trimmed.match(/^-+$/)) {
      paragraphs.push({ index: idx, text: trimmed });
      idx++;
    }
  }

  return paragraphs;
}

function writeChapter(num: number, data: ChapterData) {
  const filename = `chapter-${String(num).padStart(3, "0")}.json`;
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
}

main();
