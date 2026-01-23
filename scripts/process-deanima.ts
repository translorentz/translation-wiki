/**
 * Processes the raw De Anima text by Cassiodorus into structured JSON.
 *
 * The text has 18 chapters marked by Roman numeral headers (I through XVIII).
 * Each chapter header is in ALL CAPS format like "I. QUID AMICI REQUISIVERINT."
 * Paragraphs within chapters are separated by blank lines.
 */

import fs from "fs";
import path from "path";

const INPUT_FILE = path.resolve("data/raw/deanima_cassiodorus/De_anima.txt");
const OUTPUT_DIR = path.resolve("data/processed/deanima");

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
const titleTranslations: Record<string, string> = {
  "QUID AMICI REQUISIVERINT": "What Friends Asked",
  "QUID EIS RESPONSUM SIT": "How They Were Answered",
  "QUARE ANIMA DICATUR": "Why It Is Called the Soul",
  "DE DEFINITIONE ANIMAE": "On the Definition of the Soul",
  "DE QUALITATE ANIMAE": "On the Quality of the Soul",
  "FORMAM ANIMAM NON HABERE": "That the Soul Has No Form",
  "DE VIRTUTIBUS EIUS MORALIBUS": "On Its Moral Virtues",
  "DE VIRTUTIBUS EIUS NATURALIBUS": "On Its Natural Virtues",
  "DE ORIGINE ANIMAE": "On the Origin of the Soul",
  "DE SEDE ANIMAE": "On the Seat of the Soul",
  "DE POSITIONE CORPORIS": "On the Disposition of the Body",
  "DE COGNOSCENDIS MALIS HOMINIBUS": "On Recognizing Evil People",
  "DE COGNOSCENDIS BONIS HOMINIBUS": "On Recognizing Good People",
  "QUID AGANT ANIMAE POST HANC VITAM": "What Souls Do After This Life",
  "DE FUTURO SAECULO": "On the Future Age",
  "DE DEO": "On God",
  "RECAPITULATIO": "Recapitulation",
  "ORATIO": "Prayer",
};
function toTitleCase(str: string): string {
  const lowercaseWords = [
    "de", "in", "et", "a", "ab", "ad", "per", "cum",
    "non", "sit", "hanc", "eius", "eis",
  ];
  return str
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      if (lowercaseWords.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
function processDeAnima(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const rawText = fs.readFileSync(INPUT_FILE, "utf-8");
  const lines = rawText.split("\n");

  // Match chapter headers: Roman numerals + period + ALL CAPS title
  const chapterPattern = /^([IVX]+)\.\s+(.+?)\.?\s*$/;

  const chapterStarts: { line: number; numeral: string; rawTitle: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(chapterPattern);
    if (match) {
      const titlePart = match[2].trim();
      if (titlePart === titlePart.toUpperCase() && titlePart.length > 2) {
        chapterStarts.push({
          line: i,
          numeral: match[1],
          rawTitle: titlePart,
        });
      }
    }
  }

  console.log("Found " + chapterStarts.length + " chapters");
  for (let chIdx = 0; chIdx < chapterStarts.length; chIdx++) {
    const start = chapterStarts[chIdx];
    const endLine =
      chIdx + 1 < chapterStarts.length
        ? chapterStarts[chIdx + 1].line
        : lines.length;

    const contentLines = lines.slice(start.line + 1, endLine);

    const paragraphs: Paragraph[] = [];
    let currentParagraph: string[] = [];

    for (const line of contentLines) {
      const trimmed = line.trim();
      if (trimmed === "") {
        if (currentParagraph.length > 0) {
          paragraphs.push({
            index: paragraphs.length,
            text: currentParagraph.join(" ").trim(),
          });
          currentParagraph = [];
        }
      } else {
        currentParagraph.push(trimmed);
      }
    }

    // Flush remaining paragraph
    if (currentParagraph.length > 0) {
      paragraphs.push({
        index: paragraphs.length,
        text: currentParagraph.join(" ").trim(),
      });
    }
    const titleCase = toTitleCase(start.rawTitle);
    const englishTranslation =
      titleTranslations[start.rawTitle] || "Untranslated";
    const fullTitle =
      start.numeral + ". " + titleCase + " (" + englishTranslation + ")";

    const chapter: ProcessedChapter = {
      chapterNumber: chIdx + 1,
      title: fullTitle,
      sourceContent: {
        paragraphs,
      },
    };

    const filename = "chapter-" + String(chIdx + 1).padStart(3, "0") + ".json";
    const filepath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(chapter, null, 2), "utf-8");

    console.log(
      "  " + filename + ": " + JSON.stringify(fullTitle) + " - " + paragraphs.length + " paragraph(s)"
    );
  }

  console.log("");
  console.log(
    "Processing complete. " + chapterStarts.length + " chapters written to " + OUTPUT_DIR
  );
}

processDeAnima();
