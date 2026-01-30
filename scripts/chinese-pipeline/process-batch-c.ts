/**
 * Process Batch C: Convert raw .txt files into chapter JSON files.
 * Reads from data/raw/<slug>/ and writes to data/processed/<slug>/chapter-NNN.json
 */

import * as fs from "fs";
import * as path from "path";

const BASE_DIR = path.resolve(__dirname, "../..");
const RAW_DIR = path.join(BASE_DIR, "data", "raw");
const PROCESSED_DIR = path.join(BASE_DIR, "data", "processed");

const SLUGS = [
  "sushui-jiwen",
  "tang-zhiyan",
  "beimeng-suoyan",
  "xijing-zaji",
  "yeyu-qiudeng-lu",
  "wuzazu",
  "shiyi-ji",
  "xihu-mengxun",
  "zhinang",
  "qingshi",
  "gaiyu-congkao",
  "tang-caizi-zhuan",
  "gujin-tangai",
  "yehangchuan",
  "qijian-shisan-xia",
  "xiaoting-zalu",
];

interface Paragraph {
  index: number;
  text: string;
}

interface ChapterJson {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: Paragraph[];
  };
}

function splitIntoParagraphs(text: string): string[] {
  // Split on double newlines, filter empty
  return text
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter((p) => p.length > 0);
}

function processText(slug: string): void {
  const rawDir = path.join(RAW_DIR, slug);
  const outDir = path.join(PROCESSED_DIR, slug);

  if (!fs.existsSync(rawDir)) {
    console.log(`SKIP ${slug}: no raw directory`);
    return;
  }

  const files = fs
    .readdirSync(rawDir)
    .filter((f) => f.endsWith(".txt"))
    .sort();

  if (files.length === 0) {
    console.log(`SKIP ${slug}: no .txt files`);
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Processing ${slug}: ${files.length} files`);

  for (let i = 0; i < files.length; i++) {
    const chapterNumber = i + 1;
    const filePath = path.join(rawDir, files[i]);
    const rawText = fs.readFileSync(filePath, "utf-8");

    // Extract title from filename: NNN_title.txt -> title
    const titleMatch = files[i].match(/^\d+_(.+)\.txt$/);
    const title = titleMatch ? titleMatch[1] : `Chapter ${chapterNumber}`;

    const paragraphs = splitIntoParagraphs(rawText);
    const chapterJson: ChapterJson = {
      chapterNumber,
      title,
      sourceContent: {
        paragraphs: paragraphs.map((text, idx) => ({
          index: idx + 1,
          text,
        })),
      },
    };

    const outPath = path.join(outDir, `chapter-${String(chapterNumber).padStart(3, "0")}.json`);
    fs.writeFileSync(outPath, JSON.stringify(chapterJson, null, 2), "utf-8");
  }

  console.log(`  -> ${files.length} chapter JSONs written to ${outDir}`);
}

function main() {
  console.log(`=== Process Batch C: ${SLUGS.length} texts ===`);
  for (const slug of SLUGS) {
    processText(slug);
  }
  console.log("=== Done ===");
}

main();
