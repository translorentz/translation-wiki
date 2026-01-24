/**
 * Regroup Hesiod Theogony Exegesis chapters from 109 individual sections
 * into ~12 logical thematic chapters following the structure of Hesiod's Theogony.
 *
 * The original 109 "chapters" each correspond to commentary on a specific line number
 * of the Theogony. This script merges them into coherent thematic groups.
 */

import * as fs from "fs";
import * as path from "path";

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

// Extract the line number from a section title like "Section 134" or "Section 319b"
function extractLineNumber(title: string): number {
  if (title === "Preface") return 0;
  const match = title.match(/Section\s+(\d+)/);
  if (!match) return -1;
  return parseInt(match[1], 10);
}

// Define the thematic groupings based on Hesiod's Theogony structure.
// Each group specifies a line range [start, end] (inclusive) and a descriptive title.
const CHAPTER_GROUPS: Array<{
  title: string;
  minLine: number;
  maxLine: number;
}> = [
  {
    title: "Commentary on the Proem: Invocation of the Muses (Lines 1-115)",
    minLine: 0, // "Preface" maps to 0
    maxLine: 115,
  },
  {
    title: "Commentary on the Cosmogony: Chaos, Gaia, Tartarus, Eros (Lines 116-153)",
    minLine: 116,
    maxLine: 153,
  },
  {
    title: "Commentary on the Castration of Uranus (Lines 154-210)",
    minLine: 154,
    maxLine: 210,
  },
  {
    title: "Commentary on the Children of Night (Lines 211-232)",
    minLine: 211,
    maxLine: 232,
  },
  {
    title: "Commentary on the Sea Deities: Nereus, Thaumas, Phorcys (Lines 233-269)",
    minLine: 233,
    maxLine: 269,
  },
  {
    title: "Commentary on Sea Monsters and the Gorgons (Lines 270-336)",
    minLine: 270,
    maxLine: 336,
  },
  {
    title: "Commentary on the Rivers, Oceanids, and Titans (Lines 337-452)",
    minLine: 337,
    maxLine: 452,
  },
  {
    title: "Commentary on the Birth and Rise of Zeus (Lines 453-506)",
    minLine: 453,
    maxLine: 506,
  },
  {
    title: "Commentary on Prometheus and the Theft of Fire (Lines 507-616)",
    minLine: 507,
    maxLine: 616,
  },
  {
    title: "Commentary on the Titanomachy (Lines 617-735)",
    minLine: 617,
    maxLine: 735,
  },
  {
    title: "Commentary on Tartarus (Lines 736-819)",
    minLine: 736,
    maxLine: 819,
  },
  {
    title: "Commentary on the Typhonomachy (Lines 820-880)",
    minLine: 820,
    maxLine: 880,
  },
  {
    title: "Commentary on the Marriages of Zeus (Lines 881-929)",
    minLine: 881,
    maxLine: 999, // catch-all for anything above 881
  },
];

const INPUT_DIR = path.resolve(__dirname, "../data/processed/hesiod-theogony-exegesis");

async function main() {
  // 1. Read all existing chapter files
  const files = fs.readdirSync(INPUT_DIR)
    .filter((f) => f.match(/^chapter-\d+\.json$/))
    .sort((a, b) => {
      const numA = parseInt(a.match(/(\d+)/)![1], 10);
      const numB = parseInt(b.match(/(\d+)/)![1], 10);
      return numA - numB;
    });

  console.log(`Found ${files.length} chapter files.`);

  // 2. Load all chapter data
  const allChapters: ChapterData[] = files.map((f) => {
    const raw = fs.readFileSync(path.join(INPUT_DIR, f), "utf-8");
    return JSON.parse(raw) as ChapterData;
  });

  // 3. Group chapters by their line number into the thematic groups
  const groupedChapters: ChapterData[][] = CHAPTER_GROUPS.map(() => []);

  let unassigned = 0;
  for (const chapter of allChapters) {
    const lineNum = extractLineNumber(chapter.title);
    let assigned = false;

    for (let i = 0; i < CHAPTER_GROUPS.length; i++) {
      const group = CHAPTER_GROUPS[i];
      if (lineNum >= group.minLine && lineNum <= group.maxLine) {
        groupedChapters[i].push(chapter);
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      console.warn(`WARNING: Could not assign chapter "${chapter.title}" (line ${lineNum}) to any group!`);
      unassigned++;
    }
  }

  if (unassigned > 0) {
    console.error(`${unassigned} chapters could not be assigned. Aborting.`);
    process.exit(1);
  }

  // Print group sizes
  console.log("\nGrouping results:");
  for (let i = 0; i < CHAPTER_GROUPS.length; i++) {
    const sections = groupedChapters[i].map((c) => c.title).join(", ");
    console.log(`  Chapter ${i + 1}: "${CHAPTER_GROUPS[i].title}" - ${groupedChapters[i].length} sections`);
    console.log(`    Sections: ${sections}`);
  }

  // 4. Create merged chapter files
  const newChapters: ChapterData[] = [];

  for (let i = 0; i < CHAPTER_GROUPS.length; i++) {
    const group = CHAPTER_GROUPS[i];
    const sections = groupedChapters[i];

    if (sections.length === 0) {
      console.warn(`WARNING: Group "${group.title}" has no sections! Skipping.`);
      continue;
    }

    // Sort sections by their line number to ensure correct ordering
    sections.sort((a, b) => extractLineNumber(a.title) - extractLineNumber(b.title));

    // Merge all paragraphs, re-indexing sequentially
    const mergedParagraphs: Paragraph[] = [];
    let paragraphIndex = 1;

    for (const section of sections) {
      for (const para of section.sourceContent.paragraphs) {
        mergedParagraphs.push({
          index: paragraphIndex,
          text: para.text,
        });
        paragraphIndex++;
      }
    }

    const newChapter: ChapterData = {
      chapterNumber: newChapters.length + 1,
      title: group.title,
      sourceContent: {
        paragraphs: mergedParagraphs,
      },
    };

    newChapters.push(newChapter);
  }

  console.log(`\nCreated ${newChapters.length} merged chapters.`);

  // Count total paragraphs
  const totalParagraphs = newChapters.reduce(
    (sum, ch) => sum + ch.sourceContent.paragraphs.length,
    0
  );
  const originalParagraphs = allChapters.reduce(
    (sum, ch) => sum + ch.sourceContent.paragraphs.length,
    0
  );
  console.log(`Total paragraphs: ${totalParagraphs} (original: ${originalParagraphs})`);

  if (totalParagraphs !== originalParagraphs) {
    console.error("ERROR: Paragraph count mismatch! Aborting.");
    process.exit(1);
  }

  // 5. Write new chapter files (overwriting old ones)
  for (const chapter of newChapters) {
    const filename = `chapter-${String(chapter.chapterNumber).padStart(3, "0")}.json`;
    const filepath = path.join(INPUT_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(chapter, null, 2) + "\n", "utf-8");
    console.log(`  Wrote ${filename} (${chapter.sourceContent.paragraphs.length} paragraphs)`);
  }

  // 6. Delete leftover old chapter files
  const maxNewChapter = newChapters.length;
  let deletedCount = 0;
  for (let i = maxNewChapter + 1; i <= 200; i++) {
    const filename = `chapter-${String(i).padStart(3, "0")}.json`;
    const filepath = path.join(INPUT_DIR, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      deletedCount++;
    }
  }
  console.log(`\nDeleted ${deletedCount} leftover chapter files.`);
  console.log("\nDone! Regrouping complete.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
