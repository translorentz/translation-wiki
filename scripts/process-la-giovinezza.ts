import * as fs from "fs";
import * as path from "path";

/**
 * Process "La giovinezza di Giulio Cesare" by Giuseppe Rovani (1873)
 *
 * Source: Project Gutenberg eBooks #75196 (Vol 1) and #75197 (Vol 2)
 * Language: Italian
 * Structure:
 *   - Volume 1: Preludio + Chapters I-XV (16 sections)
 *   - Volume 2: Chapters I-XXV (25 chapters)
 *   - Total: 41 chapters
 *
 * The chapters in Volume 2 continue the story, so we number them sequentially
 * after Volume 1's chapters (17-41).
 */

const RAW_DIR = path.join(__dirname, "../data/raw/la_giovinezza");
const OUTPUT_DIR = path.join(__dirname, "../data/processed/la-giovinezza");

const VOL1_FILE = path.join(RAW_DIR, "pg75196.txt");
const VOL2_FILE = path.join(RAW_DIR, "pg75197.txt");

// Roman numeral to decimal conversion
function romanToDecimal(roman: string): number {
  const romanValues: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };
  let result = 0;
  for (let i = 0; i < roman.length; i++) {
    const current = romanValues[roman[i]];
    const next = romanValues[roman[i + 1]];
    if (next && current < next) {
      result -= current;
    } else {
      result += current;
    }
  }
  return result;
}

interface ChapterData {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

// English translations of chapter titles for display
const ENGLISH_TITLES: Record<string, string> = {
  // Volume 1
  "PRELUDIO": "Prelude",
  "IL TRIONFO DI POMPEO E L'ADOLESCENTE CESARE": "The Triumph of Pompey and the Adolescent Caesar",
  "LAJA PITTRICE E IL RITRATTO DI CESARE": "Laja the Painter and the Portrait of Caesar",
  "CESARE, SALLUSTIO E CATILINA": "Caesar, Sallust and Catiline",
  "ATTICA ACCADEMIA DI MUSICA E POESIA NEL PALAZZO DELL'EMINENTE SEMPRONIA": "Attic Academy of Music and Poetry in the Palace of the Eminent Sempronia",
  "L'IRA DI CETEGO": "The Wrath of Cethegus",
  "AURELIA E CATILINA": "Aurelia and Catiline",
  "LA MORTE DI CETEGO": "The Death of Cethegus",
  "MORTE D'AURELIA": "Death of Aurelia",
  "SEMPRONIA E CATILINA": "Sempronia and Catiline",
  "I GIUOCHI DEL CIRCO MASSIMO": "The Games of the Circus Maximus",
  "INCORONAZIONE DI CESARE NEL CIRCO MASSIMO": "Coronation of Caesar in the Circus Maximus",
  "SALLUSTIO E LA CATILINARIA": "Sallust and the Catilinarian",
  "LA PATRIA POTESTÀ": "Paternal Authority",
  "MARCO SCEVA": "Marcus Scaeva",
  "GLI ERGASTOLI PRESSO GLI ANTICHI ROMANI": "The Ergastula of the Ancient Romans",
  // Volume 2
  "GORDIENE": "Gordiene",
  "CESARE E PUBLIO SCEVA": "Caesar and Publius Scaeva",
  "MARCO SCEVA, CESARE E CATILINA NELLA CASA DELL'EMINENTE SEMPRONIA": "Marcus Scaeva, Caesar and Catiline in the House of the Eminent Sempronia",
  "CESARE E SERVILIA": "Caesar and Servilia",
  "LA CONGIURA DI CATILINA E IL SENATORE QUINTO CURIO": "The Conspiracy of Catiline and Senator Quintus Curius",
  "FULVIA E QUINTO CURIO": "Fulvia and Quintus Curius",
  "FULVIA E CICERONE": "Fulvia and Cicero",
  "CICERONE E IL CONSOLE ANTONIO": "Cicero and the Consul Antonius",
  "LA BATTAGLIA DI PERUGIA": "The Battle of Perugia",
  "CESARE E LA FIGLIA DI POMPEO MAGNO": "Caesar and the Daughter of Pompey the Great",
  "CLODIO E POMPEA": "Clodius and Pompeia",
  "LA FESTA DELLA DEA BONA": "The Festival of the Good Goddess",
  "AURELIA E CESARE": "Aurelia and Caesar",
  "I BAGNI AL PONTE FABRICIO": "The Baths at Fabrician Bridge",
  "CICERONE E MARC'ANTONIO": "Cicero and Mark Antony",
  "TERENZIA": "Terentia",
  "CESARE, CRASSO E CICERONE": "Caesar, Crassus and Cicero",
  "CLODIO": "Clodius",
  "LE TRE GRAZIE E I TRE FAUNI": "The Three Graces and the Three Fauns",
  "POMPEO E CESARE": "Pompey and Caesar",
  "L'IMPERIOSA": "The Imperious One",
  "RITORNO DI CESARE DALLA LUSITANIA": "Caesar's Return from Lusitania",
  "CESARE E ROMA": "Caesar and Rome",
  "IL TRIPICINIO": "The Tripartite Alliance",
  "CESARE CONSOLE": "Caesar as Consul",
};

function normalizeApostrophes(str: string): string {
  // Normalize various Unicode apostrophe/quote characters to ASCII single quote
  return str.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
}

function getEnglishTitle(italianTitle: string): string {
  // Normalize the title for lookup:
  // - Uppercase
  // - Normalize apostrophes (Unicode variants to ASCII)
  // - Remove extra whitespace
  // - Strip trailing period
  const normalized = normalizeApostrophes(italianTitle).toUpperCase().replace(/\s+/g, " ").replace(/\.$/, "").trim();
  return ENGLISH_TITLES[normalized] || "";
}

function formatChapterTitle(romanNumeral: string | null, italianTitle: string, volumeNum: number): string {
  // Clean up the Italian title (normalize apostrophes, remove trailing period)
  const cleanTitle = normalizeApostrophes(italianTitle).replace(/\.$/, "").trim();
  const english = getEnglishTitle(cleanTitle);
  const prefix = romanNumeral ? `${romanNumeral}. ` : "";
  const volSuffix = volumeNum === 1 ? " (Vol. I)" : " (Vol. II)";

  if (english) {
    return `${prefix}${cleanTitle}${volSuffix} — ${english}`;
  }
  return `${prefix}${cleanTitle}${volSuffix}`;
}

function splitIntoParagraphs(text: string): { index: number; text: string }[] {
  // Split on double newlines (blank lines)
  const rawParagraphs = text.split(/\n\s*\n/);
  const paragraphs: { index: number; text: string }[] = [];

  for (const para of rawParagraphs) {
    // Join lines within a paragraph, preserving flow
    const joined = para
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join(" ");

    if (joined.length > 0) {
      paragraphs.push({ index: paragraphs.length, text: joined });
    }
  }

  return paragraphs;
}

function extractTextContent(rawContent: string): string {
  // Find the start marker
  const startMarker = "*** START OF THE PROJECT GUTENBERG EBOOK";
  const endMarker = "*** END OF THE PROJECT GUTENBERG EBOOK";

  const startIdx = rawContent.indexOf(startMarker);
  const endIdx = rawContent.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error("Could not find Project Gutenberg markers");
  }

  // Get content between markers
  let content = rawContent.substring(startIdx, endIdx);

  // Remove the start marker line
  const firstNewline = content.indexOf("\n");
  content = content.substring(firstNewline + 1);

  // Remove "FINE DEL..." markers and everything after
  const fineMarkerV1 = "FINE DEL PRIMO VOLUME.";
  const fineMarkerV2 = "FINE DEL SECONDO ED ULTIMO VOLUME.";

  let fineIdx = content.indexOf(fineMarkerV1);
  if (fineIdx === -1) {
    fineIdx = content.indexOf(fineMarkerV2);
  }
  if (fineIdx !== -1) {
    content = content.substring(0, fineIdx);
  }

  return content.trim();
}

function parseVolume(content: string, volumeNum: number, startChapterNum: number): ChapterData[] {
  const chapters: ChapterData[] = [];
  const lines = content.split("\n");

  // Pattern to match chapter headings: "I." or "II." or "XV." etc at start of line
  const chapterHeadingRe = /^([IVXLCDM]+)\.\s*$/;

  let currentLines: string[] = [];
  let currentRoman: string | null = null;
  let currentTitle: string | null = null;
  let inFrontMatter = true;
  let foundPreludio = false;
  let preludioLines: string[] = [];

  // Skip title page and front matter until we find PRELUDIO or first chapter
  let i = 0;

  // For Volume 1, look for PRELUDIO section
  if (volumeNum === 1) {
    while (i < lines.length) {
      const line = lines[i].trim();

      if (line === "PRELUDIO") {
        foundPreludio = true;
        i++;
        break;
      }
      i++;
    }

    // Collect PRELUDIO content until first Roman numeral chapter
    if (foundPreludio) {
      while (i < lines.length) {
        const line = lines[i].trim();
        const match = line.match(chapterHeadingRe);

        if (match) {
          // Found first chapter, save PRELUDIO
          const preludioText = preludioLines.join("\n").trim();
          if (preludioText.length > 0) {
            chapters.push({
              chapterNumber: startChapterNum,
              title: formatChapterTitle(null, "Preludio", volumeNum),
              sourceContent: { paragraphs: splitIntoParagraphs(preludioText) },
            });
          }
          currentRoman = match[1];
          inFrontMatter = false;
          i++;
          break;
        }

        preludioLines.push(lines[i]);
        i++;
      }
    }
  } else {
    // Volume 2: Skip front matter until first chapter
    while (i < lines.length) {
      const line = lines[i].trim();
      const match = line.match(chapterHeadingRe);

      if (match) {
        currentRoman = match[1];
        inFrontMatter = false;
        i++;
        break;
      }
      i++;
    }
  }

  // Now look for the chapter title (next non-empty line)
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.length > 0) {
      currentTitle = line;
      i++;
      break;
    }
    i++;
  }

  // Process remaining content
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const match = trimmed.match(chapterHeadingRe);

    if (match) {
      // Save current chapter
      if (currentRoman !== null && currentTitle !== null) {
        const chapterText = currentLines.join("\n").trim();
        if (chapterText.length > 0) {
          const chapterNum = startChapterNum + chapters.length;
          chapters.push({
            chapterNumber: chapterNum,
            title: formatChapterTitle(currentRoman, currentTitle, volumeNum),
            sourceContent: { paragraphs: splitIntoParagraphs(chapterText) },
          });
        }
      }

      currentRoman = match[1];
      currentLines = [];

      // Look for title on next non-empty line
      i++;
      while (i < lines.length) {
        const titleLine = lines[i].trim();
        if (titleLine.length > 0) {
          currentTitle = titleLine;
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    currentLines.push(line);
    i++;
  }

  // Save last chapter
  if (currentRoman !== null && currentTitle !== null) {
    const chapterText = currentLines.join("\n").trim();
    if (chapterText.length > 0) {
      const chapterNum = startChapterNum + chapters.length;
      chapters.push({
        chapterNumber: chapterNum,
        title: formatChapterTitle(currentRoman, currentTitle, volumeNum),
        sourceContent: { paragraphs: splitIntoParagraphs(chapterText) },
      });
    }
  }

  return chapters;
}

function processLaGiovinezza(): void {
  console.log("Processing 'La giovinezza di Giulio Cesare' by Giuseppe Rovani (1873)");
  console.log("=".repeat(70));

  // Read raw files
  const vol1Raw = fs.readFileSync(VOL1_FILE, "utf-8");
  const vol2Raw = fs.readFileSync(VOL2_FILE, "utf-8");

  // Extract content (strip Gutenberg headers/footers)
  const vol1Content = extractTextContent(vol1Raw);
  const vol2Content = extractTextContent(vol2Raw);

  console.log(`\nVolume 1 content: ${vol1Content.length} characters`);
  console.log(`Volume 2 content: ${vol2Content.length} characters`);

  // Parse volumes
  const vol1Chapters = parseVolume(vol1Content, 1, 1);
  const vol2Chapters = parseVolume(vol2Content, 2, vol1Chapters.length + 1);

  const allChapters = [...vol1Chapters, ...vol2Chapters];

  console.log(`\nVolume 1: ${vol1Chapters.length} chapters (Preludio + I-XV)`);
  console.log(`Volume 2: ${vol2Chapters.length} chapters (I-XXV)`);
  console.log(`Total: ${allChapters.length} chapters`);

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write chapter files
  for (const chapter of allChapters) {
    const fileName = `chapter-${String(chapter.chapterNumber).padStart(3, "0")}.json`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(chapter, null, 2) + "\n", "utf-8");
  }

  // Print summary
  console.log(`\nOutput directory: ${OUTPUT_DIR}`);
  console.log("\n" + "=".repeat(70));
  console.log("CHAPTER LISTING");
  console.log("=".repeat(70));

  let totalParagraphs = 0;
  let totalChars = 0;

  for (const chapter of allChapters) {
    const paraCount = chapter.sourceContent.paragraphs.length;
    const charCount = chapter.sourceContent.paragraphs.reduce((sum, p) => sum + p.text.length, 0);
    totalParagraphs += paraCount;
    totalChars += charCount;

    const shortTitle = chapter.title.length > 60
      ? chapter.title.substring(0, 57) + "..."
      : chapter.title;
    console.log(
      `  chapter-${String(chapter.chapterNumber).padStart(3, "0")}.json: ` +
      `${paraCount} para, ${charCount.toLocaleString()} chars — ${shortTitle}`
    );
  }

  console.log("\n" + "=".repeat(70));
  console.log(`TOTAL: ${allChapters.length} chapters, ${totalParagraphs} paragraphs, ${totalChars.toLocaleString()} characters`);
  console.log("=".repeat(70));
}

processLaGiovinezza();
