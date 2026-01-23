import * as fs from "fs";
import * as path from "path";

const RAW_FILE = path.join(__dirname, "../data/raw/regno/regno_sicile.txt");
const OUTPUT_DIR = path.join(__dirname, "../data/processed/regno");

const CHAPTER_HEADING_RE = /^([IVXLCDM]+)\.\s+(.+)$/;

interface ChapterData {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

const ENGLISH_TITLES: Record<number, string> = {
  1: "On the King's Journey to Salerno",
  2: "On the Count of Lorotello",
  3: "On the Belief in the King's Death",
  4: "On Maio",
  5: "On the Will and Mind of the Count",
  6: "On the Revelation of Maio",
  7: "On the King's Journey to Apulia and the Battle with the Greeks",
  8: "On the Destruction of the City of Bari",
  9: "On the King's Return to Sicily",
  10: "On the Loss of Africa",
  11: "On Maio",
  12: "On Count Andrea",
  13: "On Matthew Bonello and How He Killed Maio",
  14: "On the Capture of the King",
  15: "On Roger, Son of the King",
  16: "On the Liberation of the King",
  17: "On William, Son of the King",
  18: "On the Grief of the King",
  19: "The King's Address to the People",
  20: "The Restoration of Matthew Bonello to the King's Favour",
  21: "On the Capture of Matthew Bonello and on Roger the Slave",
  22: "On the Punishment of Traitors Throughout the Realm and the Destruction of Piazza",
  23: "On the Castle of Butera, How It Was Destroyed",
  24: "On the Habitation of Butera",
  25: "On the King's Death and the Creation of King William His Son",
  26: "On the Queen and Her Officials",
  27: "On the Fact That He Who Was Hated by Many in Life Was Loved After Death",
  28: "On the Friendship Formed Between the Elect of Syracuse and Count Richard",
  29: "On the Fickleness of Women",
  30: "On the Sentence Pronounced by the Cardinal Against Justice in Part",
  31: "On the Queen's Brother and His Character",
  32: "On the Quality and Diversity of the Men of Messina",
  33: "On the State of the Court",
  34: "On the Arrival of Stephen, Son of the Count of Perche",
  35: "On the Creation of Stephen as Chancellor",
  36: "On the Custom of the Church of Palermo",
  37: "On the Organisation of the Court",
  38: "On the Avarice of Oddo",
  39: "On Him Who Returned Evil for Good",
  40: "On the Fact That Notaries Should Receive from Each What Is Due",
  41: "On the Accusation of Robert of Calatabiano",
  42: "On the Sentence Pronounced Against Robert",
  43: "On the Envy Against Chancellor Stephen",
  44: "A Reason Against Detractors",
  45: "Note That Hatreds Should Be Dissimulated for a Time",
  46: "Note That Greed Corrupts Faith",
  47: "How Robert of Bellismensis Fell Ill",
  48: "Note the Peril of the Physician",
  49: "On the Capture of Salernus the Physician Who Administered Poison",
  50: "On the Sentence Pronounced Against Salernus the Physician",
  51: "On the King's Journey to Messina",
  52: "On the Officials of the Court",
  53: "On the Accusation of the Strategos",
  54: "On the King's Return to Palermo",
  55: "On the Officials of the Court",
};

function toTitleCase(str: string): string {
  const lowercase = new Set(["de", "et", "in", "ad", "per", "cum", "pro", "a", "ab", "ex", "ac"]);
  return str.split(" ").map((word, idx) => {
    if (word.startsWith("[") || word.startsWith("(")) return word;
    const lower = word.toLowerCase();
    if (idx > 0 && lowercase.has(lower)) return lower;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
}

function formatChapterTitle(romanNumeral: string, latinTitle: string, chapterIndex: number): string {
  const titleCased = toTitleCase(latinTitle.replace(/\.$/, "").trim());
  const english = ENGLISH_TITLES[chapterIndex];
  if (english) {
    return `${romanNumeral}. ${titleCased} (${english})`;
  }
  return `${romanNumeral}. ${titleCased}`;
}

function splitIntoParagraphs(text: string): { index: number; text: string }[] {
  const rawParagraphs = text.split(/\n\s*\n/);
  const paragraphs: { index: number; text: string }[] = [];
  for (const para of rawParagraphs) {
    const joined = para.split("\n").map((line) => line.trim()).filter((line) => line.length > 0).join(" ");
    if (joined.length > 0) {
      paragraphs.push({ index: paragraphs.length, text: joined });
    }
  }
  return paragraphs;
}

function processRegno(): void {
  const rawContent = fs.readFileSync(RAW_FILE, "utf-8");
  const lines = rawContent.split("\n");

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const chapters: ChapterData[] = [];
  let currentLines: string[] = [];
  let currentChapterRoman: string | null = null;
  let currentChapterTitle: string | null = null;
  let inPrologue = true;
  let headerSkipped = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!headerSkipped && line.trim() === "LIBER DE REGNO SICILIE - HUGO FALCANDUS") {
      headerSkipped = true;
      continue;
    }

    const match = line.trim().match(CHAPTER_HEADING_RE);
    if (match) {
      if (inPrologue) {
        const prologueText = currentLines.join("\n").trim();
        if (prologueText.length > 0) {
          chapters.push({
            chapterNumber: 1,
            title: "Prologus (Prologue)",
            sourceContent: { paragraphs: splitIntoParagraphs(prologueText) },
          });
        }
        inPrologue = false;
      } else if (currentChapterRoman !== null && currentChapterTitle !== null) {
        const chapterText = currentLines.join("\n").trim();
        const chapterIndex = chapters.length;
        chapters.push({
          chapterNumber: chapters.length + 1,
          title: formatChapterTitle(currentChapterRoman, currentChapterTitle, chapterIndex),
          sourceContent: { paragraphs: splitIntoParagraphs(chapterText) },
        });
      }

      currentChapterRoman = match[1];
      currentChapterTitle = match[2];
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentChapterRoman !== null && currentChapterTitle !== null) {
    const chapterText = currentLines.join("\n").trim();
    const chapterIndex = chapters.length;
    chapters.push({
      chapterNumber: chapters.length + 1,
      title: formatChapterTitle(currentChapterRoman, currentChapterTitle, chapterIndex),
      sourceContent: { paragraphs: splitIntoParagraphs(chapterText) },
    });
  }

  for (const chapter of chapters) {
    const fileName = `chapter-${String(chapter.chapterNumber).padStart(3, "0")}.json`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(chapter, null, 2) + "\n", "utf-8");
  }

  console.log(`Processed ${chapters.length} chapters from Liber de Regno Sicilie.`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log("\nChapter listing:");
  for (const chapter of chapters) {
    const paraCount = chapter.sourceContent.paragraphs.length;
    console.log(`  chapter-${String(chapter.chapterNumber).padStart(3, "0")}.json: "${chapter.title}" (${paraCount} paragraph${paraCount !== 1 ? "s" : ""})`);
  }
}

processRegno();
