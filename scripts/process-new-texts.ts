import * as fs from "fs";
import * as path from "path";

const DATA_RAW = path.join(process.cwd(), "data/raw");
const DATA_PROCESSED = path.join(process.cwd(), "data/processed");

interface Paragraph {
  index: number;
  text: string;
}

interface Chapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: Paragraph[];
  };
}

function writeChapter(dir: string, chapter: Chapter) {
  const fileName = `chapter-${String(chapter.chapterNumber).padStart(3, "0")}.json`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(chapter, null, 2), "utf-8");
}

// ============================================================
// DE ANIMA (Cassiodorus)
// ============================================================
function processDeAnima() {
  console.log("Processing De Anima...");
  const raw = fs.readFileSync(
    path.join(DATA_RAW, "deanima_cassiodorus/De_anima.txt"),
    "utf-8"
  );
  const outDir = path.join(DATA_PROCESSED, "deanima");
  fs.mkdirSync(outDir, { recursive: true });

  // Split on Roman numeral chapter headers
  const chapterRegex = /^([IVXLC]+)\.\s+(.+?)\.?\s*$/gm;
  const matches: { index: number; num: string; title: string }[] = [];
  let match;
  while ((match = chapterRegex.exec(raw)) !== null) {
    matches.push({ index: match.index, num: match[1], title: match[2] });
  }

  const romanToInt: Record<string, number> = {};
  const romanNumerals = [
    "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
    "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"
  ];
  romanNumerals.forEach((r, i) => { romanToInt[r] = i + 1; });

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    const section = raw.slice(start, end);

    // Remove the header line itself
    const headerEnd = section.indexOf("\n");
    const body = section.slice(headerEnd + 1).trim();

    // Split into paragraphs by blank lines
    const paragraphs = body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const chapterNum = romanToInt[matches[i].num] || i + 1;
    const chapter: Chapter = {
      chapterNumber: chapterNum,
      title: `${matches[i].num}. ${matches[i].title}`,
      sourceContent: {
        paragraphs: paragraphs.map((text, idx) => ({ index: idx, text })),
      },
    };
    writeChapter(outDir, chapter);
  }

  const count = matches.length;
  console.log(`  De Anima: ${count} chapters processed`);
}

// ============================================================
// LOMBARDS (Erchempert)
// ============================================================
function processLombards() {
  console.log("Processing Lombards...");
  const raw = fs.readFileSync(
    path.join(DATA_RAW, "lombards_of_b/langabardorum.txt"),
    "utf-8"
  );
  const outDir = path.join(DATA_PROCESSED, "lombards");
  fs.mkdirSync(outDir, { recursive: true });

  const lines = raw.split("\n");

  // Find all section starts (lines beginning with "N. " where N is a number)
  const sectionStarts: { lineIdx: number; num: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\d+)\.\s/);
    if (m) {
      sectionStarts.push({ lineIdx: i, num: parseInt(m[1]) });
    }
  }

  for (let i = 0; i < sectionStarts.length; i++) {
    const startLine = sectionStarts[i].lineIdx;
    const endLine = i + 1 < sectionStarts.length ? sectionStarts[i + 1].lineIdx : lines.length;

    // Get all text for this section
    const sectionLines = lines.slice(startLine, endLine);
    const fullText = sectionLines.join("\n").trim();

    // Most sections are single paragraphs, but check for verse (short lines)
    // Split into paragraphs by blank lines if any
    const paragraphs = fullText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const chapter: Chapter = {
      chapterNumber: sectionStarts[i].num,
      title: `Section ${sectionStarts[i].num}`,
      sourceContent: {
        paragraphs: paragraphs.map((text, idx) => ({ index: idx, text })),
      },
    };
    writeChapter(outDir, chapter);
  }

  console.log(`  Lombards: ${sectionStarts.length} sections processed`);
}

// ============================================================
// REGNO (Hugo Falcandus)
// ============================================================
function processRegno() {
  console.log("Processing Regno...");
  const raw = fs.readFileSync(
    path.join(DATA_RAW, "regno/regno_sicile.txt"),
    "utf-8"
  );
  const outDir = path.join(DATA_PROCESSED, "regno");
  fs.mkdirSync(outDir, { recursive: true });

  // Roman numeral pattern: line starts with Roman numerals followed by ". "
  // Note: uses IIII for 4, VIIII for 9, etc.
  const chapterRegex = /^([IVXLC]+)\.\s+(.+?)$/gm;
  const matches: { index: number; num: string; title: string }[] = [];
  let match;
  while ((match = chapterRegex.exec(raw)) !== null) {
    matches.push({ index: match.index, num: match[1], title: match[2] });
  }

  // Parse Roman numerals (including non-subtractive forms like IIII, VIIII)
  function parseRoman(s: string): number {
    const vals: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
    let total = 0;
    for (let i = 0; i < s.length; i++) {
      const cur = vals[s[i]] || 0;
      const next = i + 1 < s.length ? vals[s[i + 1]] || 0 : 0;
      if (cur < next) {
        total -= cur;
      } else {
        total += cur;
      }
    }
    return total;
  }

  // First, extract the prologue (text before first Roman numeral chapter)
  const prologueText = raw.slice(0, matches[0]?.index || raw.length).trim();
  const prologueParas = prologueText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Remove the title line from the prologue
  const prologueFiltered = prologueParas.filter(
    (p) => !p.startsWith("LIBER DE REGNO SICILIE")
  );

  const prologueChapter: Chapter = {
    chapterNumber: 1,
    title: "Prologus (Prologue)",
    sourceContent: {
      paragraphs: prologueFiltered.map((text, idx) => ({ index: idx, text })),
    },
  };
  writeChapter(outDir, prologueChapter);

  // Process each chapter
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    const section = raw.slice(start, end);

    // Remove the header line
    const headerEnd = section.indexOf("\n");
    const body = section.slice(headerEnd + 1).trim();

    const paragraphs = body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const romanNum = parseRoman(matches[i].num);
    const chapter: Chapter = {
      chapterNumber: romanNum + 1, // +1 because prologue is chapter 1
      title: `${matches[i].num}. ${matches[i].title}`,
      sourceContent: {
        paragraphs: paragraphs.map((text, idx) => ({ index: idx, text })),
      },
    };
    writeChapter(outDir, chapter);
  }

  console.log(`  Regno: ${matches.length + 1} chapters processed (1 prologue + ${matches.length} numbered)`);
}

// ============================================================
// TONGJIAN JISHI BENMO (通鑑紀事本末)
// ============================================================
function processTongjian() {
  console.log("Processing Tongjian...");
  const outDir = path.join(DATA_PROCESSED, "tongjian");
  fs.mkdirSync(outDir, { recursive: true });

  const rawDir = path.join(DATA_RAW, "tongjian_jishi_benmo");
  const files = fs.readdirSync(rawDir).sort();

  let chapterNum = 0;

  for (const file of files) {
    if (!file.endsWith(".txt")) continue;

    const content = fs.readFileSync(path.join(rawDir, file), "utf-8");
    chapterNum++;

    // Determine chapter title from the first line
    const lines = content.split("\n");
    let title = lines[0].trim();

    // Remove the "======" separator if it follows
    const cleanLines = lines.filter(
      (l) => !l.match(/^=+$/) && l.trim().length > 0
    );

    // The title is the first non-empty line
    title = cleanLines[0] || file.replace(".txt", "");

    // Get the body (everything after the title)
    const bodyStart = cleanLines.findIndex((l, i) => i > 0);
    const bodyLines = cleanLines.slice(bodyStart);

    // Join and split by blank lines (using original content minus title/separator)
    const bodyText = content
      .split("\n")
      .slice(1) // skip title
      .join("\n")
      .replace(/^=+\s*\n/, ""); // remove separator

    // Split into paragraphs by blank lines
    let paragraphs = bodyText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    // Deduplicate consecutive identical paragraphs (data corruption fix)
    const deduped: string[] = [];
    for (let i = 0; i < paragraphs.length; i++) {
      if (i === 0 || paragraphs[i] !== paragraphs[i - 1]) {
        deduped.push(paragraphs[i]);
      }
    }
    paragraphs = deduped;

    const chapter: Chapter = {
      chapterNumber: chapterNum,
      title,
      sourceContent: {
        paragraphs: paragraphs.map((text, idx) => ({ index: idx, text })),
      },
    };
    writeChapter(outDir, chapter);
  }

  console.log(`  Tongjian: ${chapterNum} chapters processed`);
}

// ============================================================
// MAIN
// ============================================================
function main() {
  console.log("Processing all new texts...\n");

  processDeAnima();
  processLombards();
  processRegno();
  processTongjian();

  console.log("\nAll texts processed successfully!");
}

main();
