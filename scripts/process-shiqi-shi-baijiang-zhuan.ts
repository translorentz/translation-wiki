/**
 * Process Shiqi Shi Baijiang Zhuan (十七史百將傳) - Biographies of One Hundred Generals
 * from the Seventeen Histories
 *
 * Author: Zhang Yu (張預)
 * Era: Northern Song Dynasty (c. 1072 CE)
 *
 * Structure: 10 volumes, 100 generals total (10 per volume)
 * Each entry contains:
 *   1. General's name with state/dynasty prefix
 *   2. Biographical narrative drawn from standard histories
 *   3. Commentary citing Sun Tzu's Art of War (starts with "孫子曰" or "孙子曰")
 *
 * Output: One chapter per general (100 chapters total)
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

interface GeneralEntry {
  name: string; // e.g., "周齊太公", "前漢張良"
  biography: string;
  commentary: string;
}

const RAW_DIR = path.resolve(__dirname, "../data/raw/shiqi_shi_baijiang_zhuan");
const OUTPUT_DIR = path.resolve(
  __dirname,
  "../data/processed/shiqi-shi-baijiang-zhuan"
);

// Pattern to match general entry headers
// Format: [Dynasty/State][Name]
// Examples: 周齊太公, 吳孫武, 前漢張良, 唐李光弼, 唐·李靖
const DYNASTY_PREFIXES = [
  "周", "秦", "前漢", "前汉", "後漢", "后汉", "漢", "汉",
  "吳", "吴", "魏", "蜀", "趙", "赵", "燕", "齊", "齐",
  "晉", "晋", "前秦", "後秦", "前燕", "後燕", "北魏", "東魏", "西魏",
  "南朝宋", "南朝齊", "南朝梁", "南朝陳", "陳", "陈", "隋",
  "宋",  // Liu Song dynasty (420-479)
  "唐", "唐·", "後梁", "後唐", "後晉", "後漢", "後周",
  "五代", "梁", "越"
];

// Commentary marker patterns (both traditional and simplified)
const COMMENTARY_MARKERS = ["孫子曰", "孙子曰"];

function isNewGeneralEntry(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Check if line starts with a dynasty prefix and is relatively short (a name header)
  // Also must not contain "者" or be too long (which would indicate it's biography text)
  for (const prefix of DYNASTY_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      // Name lines are typically short (< 20 chars) and don't contain "者，"
      // unless it's just a name with punctuation
      if (trimmed.length < 20 && !trimmed.includes("者，") && !trimmed.includes("者,")) {
        return trimmed;
      }
    }
  }
  return null;
}

function isCommentaryStart(line: string): boolean {
  const trimmed = line.trim();
  return COMMENTARY_MARKERS.some(marker => trimmed.startsWith(marker));
}

function parseVolume(content: string): GeneralEntry[] {
  const entries: GeneralEntry[] = [];
  const lines = content.split("\n");

  let currentEntry: GeneralEntry | null = null;
  let bioBuffer: string[] = [];
  let commentaryBuffer: string[] = [];
  let inCommentary = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      continue;
    }

    // Check for commentary marker
    if (isCommentaryStart(trimmed)) {
      if (currentEntry) {
        // Save biography and switch to commentary mode
        currentEntry.biography = bioBuffer.join("\n").trim();
        bioBuffer = [];
      }
      inCommentary = true;
      commentaryBuffer.push(trimmed);
      continue;
    }

    // Check for new general entry
    const newName = isNewGeneralEntry(trimmed);
    if (newName) {
      // Save previous entry if exists
      if (currentEntry) {
        if (inCommentary) {
          currentEntry.commentary = commentaryBuffer.join("\n").trim();
        } else {
          currentEntry.biography = bioBuffer.join("\n").trim();
        }
        entries.push(currentEntry);
      }

      // Start new entry
      currentEntry = {
        name: newName,
        biography: "",
        commentary: "",
      };
      bioBuffer = [];
      commentaryBuffer = [];
      inCommentary = false;
      continue;
    }

    // Add to appropriate buffer
    if (currentEntry) {
      if (inCommentary) {
        commentaryBuffer.push(trimmed);
      } else {
        bioBuffer.push(trimmed);
      }
    }
  }

  // Handle last entry
  if (currentEntry) {
    if (inCommentary) {
      currentEntry.commentary = commentaryBuffer.join("\n").trim();
    } else {
      currentEntry.biography = bioBuffer.join("\n").trim();
    }
    entries.push(currentEntry);
  }

  return entries;
}

function createChapter(
  entry: GeneralEntry,
  chapterNumber: number
): ProcessedChapter {
  const paragraphs: Paragraph[] = [];
  let idx = 0;

  // Add name as first paragraph (title)
  paragraphs.push({ index: idx++, text: entry.name });

  // Split biography into paragraphs
  // The biography is typically one long continuous text
  if (entry.biography) {
    paragraphs.push({ index: idx++, text: entry.biography });
  }

  // Add commentary as separate paragraph
  if (entry.commentary) {
    paragraphs.push({ index: idx++, text: entry.commentary });
  }

  return {
    chapterNumber,
    title: entry.name,
    sourceContent: { paragraphs },
  };
}

async function main() {
  console.log("Processing Shiqi Shi Baijiang Zhuan...\n");

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const allEntries: GeneralEntry[] = [];

  // Process each volume
  for (let vol = 1; vol <= 10; vol++) {
    const volPath = path.join(RAW_DIR, `Volume_${vol.toString().padStart(2, "0")}.txt`);

    if (!fs.existsSync(volPath)) {
      console.error(`Volume ${vol} not found: ${volPath}`);
      continue;
    }

    const content = fs.readFileSync(volPath, "utf-8");
    const entries = parseVolume(content);

    console.log(`Volume ${vol}: Found ${entries.length} entries`);
    entries.forEach((e) => {
      console.log(`  - ${e.name}`);
    });

    allEntries.push(...entries);
  }

  console.log(`\nTotal entries found: ${allEntries.length}\n`);

  // Verify we have 100 entries (10 per volume)
  if (allEntries.length !== 100) {
    console.warn(`WARNING: Expected 100 entries, found ${allEntries.length}`);
  }

  // Create chapters
  let chapterNum = 1;
  for (const entry of allEntries) {
    const chapter = createChapter(entry, chapterNum);
    const filename = `chapter-${chapterNum.toString().padStart(3, "0")}.json`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    fs.writeFileSync(outputPath, JSON.stringify(chapter, null, 2));
    console.log(`Wrote ${filename}: ${entry.name}`);

    chapterNum++;
  }

  console.log(`\nDone! Processed ${chapterNum - 1} chapters.`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main().catch(console.error);
