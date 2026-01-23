import * as fs from "fs";
import * as path from "path";

const RAW_DIR = path.resolve(__dirname, "../data/raw/tongjian_jishi_benmo");
const OUTPUT_DIR = path.resolve(__dirname, "../data/processed/tongjian");

const chineseToArabic: Record<string, number> = {
  "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
  "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
  "十一": 11, "十二": 12, "十三": 13, "十四": 14, "十五": 15,
  "十六": 16, "十七": 17, "十八": 18, "十九": 19, "二十": 20,
  "二十一": 21, "二十二": 22, "二十三": 23, "二十四": 24, "二十五": 25,
  "二十六": 26, "二十七": 27, "二十八": 28, "二十九": 29, "三十": 30,
  "三十一": 31, "三十二": 32, "三十三": 33, "三十四": 34, "三十五": 35,
  "三十六": 36, "三十七": 37, "三十八": 38, "三十九": 39, "四十": 40,
  "四十一": 41, "四十二": 42,
};

function getEnglishTitle(chineseTitle: string): string {
  if (chineseTitle === "通鑑紀事本末序") {
    return "通鑑紀事本末序 (Preface to Comprehensive Mirror by Topical Arrangement)";
  }
  if (chineseTitle === "重刻通鑑紀事本末序") {
    return "重刻通鑑紀事本末序 (Preface to the Reprinted Edition)";
  }
  if (chineseTitle === "跋通鑑紀事本末") {
    return "跋通鑑紀事本末 (Colophon)";
  }
  const volumeMatch = chineseTitle.match(/^第(.+)卷$/);
  if (volumeMatch) {
    const chineseNum = volumeMatch[1];
    const arabicNum = chineseToArabic[chineseNum];
    if (arabicNum !== undefined) {
      return chineseTitle + " (Volume " + arabicNum + ")";
    }
  }
  return chineseTitle;
}

function processFile(filePath: string, chapterNumber: number): void {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  if (lines.length < 2) { console.error("File too short: " + filePath); return; }
  const rawTitle = lines[0].trim();
  const title = getEnglishTitle(rawTitle);
  const paragraphs: { index: number; text: string }[] = [];
  let prevText = "";
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i].trim();
    if (/^=+$/.test(line)) { continue; }
    if (/^=+/.test(line)) { line = line.replace(/^=+/, "").trim(); }
    if (line === "") { continue; }
    if (line === prevText) { continue; }
    paragraphs.push({ index: paragraphs.length, text: line });
    prevText = line;
  }
  const output = { chapterNumber, title, sourceContent: { paragraphs } };
  const outputFileName = "chapter-" + String(chapterNumber).padStart(3, "0") + ".json";
  const outputPath = path.join(OUTPUT_DIR, outputFileName);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log("  " + outputFileName + ": " + JSON.stringify(title) + " - " + paragraphs.length + " paragraphs");
}

function main(): void {
  console.log("Processing Tongjian Jishi Benmo raw files...");
  if (!fs.existsSync(OUTPUT_DIR)) { fs.mkdirSync(OUTPUT_DIR, { recursive: true }); }
  const files = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith(".txt")).sort();
  console.log("Found " + files.length + " raw files.");
  for (let i = 0; i < files.length; i++) { processFile(path.join(RAW_DIR, files[i]), i + 1); }
  console.log("Processed " + files.length + " files.");
  console.log("--- Verification ---");
  const outputFiles = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".json")).sort();
  console.log("Output files created: " + outputFiles.length);
  let allValid = true;
  for (const file of outputFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, file), "utf-8"));
    if (!data.sourceContent || !data.sourceContent.paragraphs || data.sourceContent.paragraphs.length === 0) {
      console.error("  ERROR: " + file + " has empty paragraphs!"); allValid = false;
    }
  }
  if (allValid && outputFiles.length === 45) { console.log("All 45 files created with non-empty paragraph arrays."); }
  else if (outputFiles.length !== 45) { console.error("ERROR: Expected 45 output files, got " + outputFiles.length); }
}

main();
