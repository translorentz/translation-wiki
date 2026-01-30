/**
 * Process Batch B: Reads raw .txt files from data/raw/<slug>/
 * and creates chapter JSONs in data/processed/<slug>/chapter-NNN.json
 */

import * as fs from "fs";
import * as path from "path";

const BASE_DIR = path.resolve(__dirname, "../..");
const RAW_DIR = path.join(BASE_DIR, "data", "raw");
const PROCESSED_DIR = path.join(BASE_DIR, "data", "processed");

// Our 17 texts (indices 17-33)
const SLUGS = [
  "mingru-xuean",
  "yuewei-caotang-biji",
  "luye-xianzong",
  "yesou-puyan",
  "qilu-deng",
  "dangkou-zhi",
  "sanxia-wuyi",
  "niehai-hua",
  "feilong-quanzhuan",
  "nuxian-waishi",
  "xingshi-yan",
  "yuchu-xinzhi",
  "hedian",
  "mengliang-lu",
  "wulin-jiushi",
  "qidong-yeyu",
  "helin-yulu",
];

interface Paragraph {
  index: number;
  text: string;
}

interface ChapterJSON {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: Paragraph[];
  };
}

function processText(slug: string): void {
  const rawDir = path.join(RAW_DIR, slug);
  const outDir = path.join(PROCESSED_DIR, slug);

  if (!fs.existsSync(rawDir)) {
    console.log(`SKIP ${slug}: no raw directory`);
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });

  // Get all .txt files sorted by numeric prefix
  const files = fs
    .readdirSync(rawDir)
    .filter((f) => f.endsWith(".txt"))
    .sort((a, b) => {
      const na = parseInt(a.split("_")[0], 10);
      const nb = parseInt(b.split("_")[0], 10);
      return na - nb;
    });

  if (files.length === 0) {
    console.log(`SKIP ${slug}: no .txt files`);
    return;
  }

  console.log(`Processing ${slug}: ${files.length} files`);

  for (const file of files) {
    const chapterNum = parseInt(file.split("_")[0], 10);
    if (isNaN(chapterNum)) continue;

    const raw = fs.readFileSync(path.join(rawDir, file), "utf-8");

    // Extract title from filename (remove NNN_ prefix and .txt suffix)
    const titleFromFile = file.replace(/^\d+_/, "").replace(/\.txt$/, "");

    // Split into paragraphs on double newlines
    const paragraphs: Paragraph[] = raw
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((text, i) => ({ index: i + 1, text }));

    if (paragraphs.length === 0) {
      console.log(`  WARN: empty chapter ${chapterNum}`);
      continue;
    }

    const chapter: ChapterJSON = {
      chapterNumber: chapterNum,
      title: titleFromFile,
      sourceContent: { paragraphs },
    };

    const outPath = path.join(outDir, `chapter-${String(chapterNum).padStart(3, "0")}.json`);
    fs.writeFileSync(outPath, JSON.stringify(chapter, null, 2), "utf-8");
  }

  // Count output files
  const outFiles = fs.readdirSync(outDir).filter((f) => f.endsWith(".json"));
  console.log(`  Done: ${outFiles.length} chapter JSONs`);
}

function main() {
  console.log(`=== Process Batch B: ${SLUGS.length} texts ===`);
  for (const slug of SLUGS) {
    try {
      processText(slug);
    } catch (e) {
      console.error(`ERROR processing ${slug}:`, e);
    }
  }
}

main();
