import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const RAW_PATH = join(__dirname, "../data/raw/elegia/elegia.txt");
const OUTPUT_DIR = join(__dirname, "../data/processed/elegia");

interface Paragraph {
  index: number;
  text: string;
}

interface ChapterOutput {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: Paragraph[];
  };
}

function main() {
  const rawText = readFileSync(RAW_PATH, "utf-8");
  const lines = rawText.split(/\r?\n/);

  const liberPattern = /^Liber (I{1,3}V?|IV)$/;
  const liberIndices: { lineIndex: number; number: number; label: string }[] = [];

  const romanToArabic: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(liberPattern);
    if (match) {
      const roman = match[1];
      const arabic = romanToArabic[roman];
      if (arabic) {
        liberIndices.push({ lineIndex: i, number: arabic, label: roman });
      }
    }
  }

  if (liberIndices.length !== 4) {
    console.error("Expected 4 Liber headings, found " + liberIndices.length);
    process.exit(1);
  }

  for (let bookIdx = 0; bookIdx < liberIndices.length; bookIdx++) {
    const startLine = liberIndices[bookIdx].lineIndex + 1;
    const endLine = bookIdx < liberIndices.length - 1 ? liberIndices[bookIdx + 1].lineIndex : lines.length;

    const bookLines = lines.slice(startLine, endLine);
    const paragraphs: Paragraph[] = [];
    let currentStanza: string[] = [];

    for (const line of bookLines) {
      const trimmed = line.trim();
      if (trimmed === "") {
        if (currentStanza.length > 0) {
          paragraphs.push({ index: paragraphs.length, text: currentStanza.join("\n") });
          currentStanza = [];
        }
      } else {
        currentStanza.push(trimmed);
      }
    }

    if (currentStanza.length > 0) {
      paragraphs.push({ index: paragraphs.length, text: currentStanza.join("\n") });
    }

    const chapterNumber = liberIndices[bookIdx].number;
    const romanNumeral = liberIndices[bookIdx].label;

    const output: ChapterOutput = {
      chapterNumber,
      title: "Liber " + romanNumeral + " (Book " + romanNumeral + ")",
      sourceContent: { paragraphs },
    };

    const filename = "chapter-" + String(chapterNumber).padStart(3, "0") + ".json";
    const outputPath = join(OUTPUT_DIR, filename);
    writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", "utf-8");
    console.log("Written " + filename + ": " + paragraphs.length + " paragraphs");
  }

  console.log("Done! All 4 books processed.");
}

main();
