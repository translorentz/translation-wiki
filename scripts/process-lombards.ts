import * as fs from "fs";
import * as path from "path";

const RAW_FILE = path.resolve(__dirname, "../data/raw/lombards_of_b/langabardorum.txt");
const OUTPUT_DIR = path.resolve(__dirname, "../data/processed/lombards");

const SECTION_TITLES: Record<number, string> = {
  1: "De Langobardorum Serie (On the Lombard Lineage)",
  2: "De Italia Capta (On the Capture of Italy)",
  3: "De Urbe Salerno (On the City of Salerno)",
  4: "De Grimoaldo Restituto (On the Restoration of Grimoald)",
  5: "De Coniugio Grimoaldi (On the Marriage of Grimoald)",
  6: "De Bellis Karli (On the Wars of Charlemagne)",
  7: "De Grimoaldo Altero (On the Second Grimoald)",
  8: "De Praelio Neapolitano (On the Battle of Naples)",
  9: "De Morte Grimoaldi (On the Death of Grimoald)",
  10: "De Sicone Principe (On Prince Sico)",
  11: "De Adventu Saracenorum (On the Arrival of the Saracens)",
  12: "De Sicardo Tyranno (On Sicard the Tyrant)",
  13: "De Morte Rofridi (On the Death of Rofrid)",
  14: "De Radelgiso Principe (On Prince Radelgis)",
  15: "De Landulfo Capuano (On Landulf of Capua)",
  16: "De Bari Capta (On the Capture of Bari)",
  17: "De Bello Civili (On the Civil War)",
  18: "De Guidone Spoletino (On Guido of Spoleto)",
  19: "De Divisione Regni (On the Division of the Kingdom)",
  20: "De Saracenis Depraedantibus (On the Saracen Raids)",
  21: "De Filiis Landulfi (On the Sons of Landulf)",
  22: "De Testamento Landulfi (On the Testament of Landulf)",
  23: "De Morte Siconolfi (On the Death of Siconulf)",
  24: "De Incendio Sicopolis (On the Fire of Sicopolis)",
  25: "De Capua Nova (On New Capua)",
  26: "De Landone et Fratribus (On Lando and His Brothers)",
  27: "De Saracenis Gariliano (On the Saracens of the Garigliano)",
  28: "De Pandonolfo Capuano (On Pandonulf of Capua)",
  29: "De Bellis Adelchisi (On the Wars of Adelchis)",
  30: "De Landolfo Episcopo (On Bishop Landulf)",
  31: "De Praelio Suessolano (On the Battle of Suessola)",
  32: "De Augusto Lodovico (On Emperor Louis)",
  33: "De Obsidione Bari (On the Siege of Bari)",
  34: "De Captione Lodovici (On the Capture of Louis)",
  35: "De Saracenis Calabriae (On the Saracens of Calabria)",
  36: "De Landolfo Seniore (On Landulf the Elder)",
  37: "De Bellis Capuanorum (On the Wars of the Capuans)",
  38: "De Guaiferio Comite (On Count Guaifer)",
  39: "De Morte Landonis (On the Death of Lando)",
  40: "De Athanasio Episcopo (On Bishop Athanasius)",
  41: "De Sergio Neapolitano (On Sergius of Naples)",
  42: "De Saracenis et Graecis (On the Saracens and Greeks)",
  43: "De Landolfo Iuniore (On Landulf the Younger)",
  44: "De Proditione Athanasii (On the Treachery of Athanasius)",
  45: "De Captivitate Episcopi (On the Captivity of the Bishop)",
  46: "De Ecclesiis Devastatis (On the Devastated Churches)",
  47: "De Monasterio Sancti Vincentii (On the Monastery of St. Vincent)",
  48: "De Praeliis Saracenorum (On the Battles with the Saracens)",
  49: "De Guaimario Principe (On Prince Guaimar)",
  50: "De Athanasio Neapolitano (On Athanasius of Naples)",
  51: "De Bellis Liburiae (On the Wars of Liburia)",
  52: "De Capua Obsessa (On the Siege of Capua)",
  53: "De Pandenolfo et Landone (On Pandenolf and Lando)",
  54: "De Divisione Capuae (On the Division of Capua)",
  55: "De Landonolfo Teanese (On Landonulf of Teano)",
  56: "De Atenolfo Gastaldeo (On Atenulf the Gastald)",
  57: "De Landone et Atenolfo (On Lando and Atenulf)",
  58: "De Consilio Capuanorum (On the Council of Capuans)",
  59: "De Foedere Rupto (On the Broken Treaty)",
  60: "De Insidiis Atenolfi (On the Plots of Atenulf)",
  61: "De Praeparatione Belli (On the Preparation for War)",
  62: "De Dolo Atenolfi (On the Deception of Atenulf)",
  63: "De Febre Landonis (On the Fever of Lando)",
  64: "De Expulsione Filiorum Landonis (On the Expulsion of Lando's Sons)",
  65: "De Atenolfo Comite (On Count Atenulf)",
  66: "De Theophylacto Stratigo (On the Strategos Theophylactus)",
  67: "De Guaimario Constantinopoli (On Guaimar at Constantinople)",
  68: "De Reditu Landonis (On the Return of Lando)",
  69: "De Rebus Monasterii (On the Monastery's Properties)",
  70: "De Insidiis Athanasii (On the Plots of Athanasius)",
  71: "De Aione Duce (On Duke Aio)",
  72: "De Praelio Liburiae (On the Battle of Liburia)",
  73: "De Victoria Atenolfi (On the Victory of Atenulf)",
  74: "De Guaiferio Praefecto (On Prefect Guaifer)",
  75: "De Pace Athanasii (On the Peace with Athanasius)",
  76: "De Aione Apuliae (On Aio of Apulia)",
  77: "De Bello Neapolitano (On the Neapolitan War)",
  78: "De Iure Novo Atenolfi (On Atenulf's New Laws)",
  79: "De Guidone Iuniore (On the Younger Guido)",
  80: "De Aione Obsesso (On the Siege of Aio)",
  81: "De Praelio Navali (On the Naval Battle)",
  82: "De Guidone in Italia (On Guido in Italy)",
};

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

function splitIntoParagraphs(sectionText: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  // Normalize Unicode line separators (U+2028) to spaces
  const text = sectionText.replace(/\u2028/g, " ").trim();

  // Check for embedded verse quotations in specific sections
  const versePatterns: RegExp[] = [
    // Section 6: verse by Grimoald
    /(Liber et ingenuus sum natus utroque parente;\s*Semper ero liber, credo, tuente Deo)/,
    // Section 9: verse about Benedict
    /(Heu, Benedicte, mihi\? Cur me undique rodis\? Inique,\s*Me prius hinc pulso, nunc mea membra lucras\?)/,
    // Section 21: prophetic verse about Landulf
    /(Heu me, dulcis amans, quae nos tunc fata secuntur,\s*Augurium saevum monstrat tua visio dira!\s*Hac tuus hic ortus tegitur qui clausus in alvo,\s*Diliget haut ullum spernet qui sanguine caros,\s*Postremo cives viperino devoret ore,\s*Ac velud ignis edax rectorum pectora buret\.)/,
  ];

  let hasVerse = false;
  for (const pattern of versePatterns) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      hasVerse = true;
      const before = text.substring(0, match.index).trim();
      const verse = match[1].trim();
      const after = text.substring(match.index + match[0].length).trim();

      let idx = 0;
      if (before) {
        paragraphs.push({ index: idx++, text: before });
      }
      paragraphs.push({ index: idx++, text: verse });
      if (after) {
        paragraphs.push({ index: idx++, text: after });
      }
      break;
    }
  }

  if (!hasVerse) {
    paragraphs.push({ index: 0, text: text });
  }

  return paragraphs;
}

function main() {
  const rawText = fs.readFileSync(RAW_FILE, "utf-8");
  const rawLines = rawText.split("\n");

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Parse sections: group lines by section number.
  // A section starts with "N. " and continues until the next section start.
  // Non-numbered lines are continuations of the previous section.
  const sections: { number: number; text: string }[] = [];
  const sectionStartRegex = /^(\d+)\.\s+(.+)$/;
  let currentNumber = 0;
  let currentParts: string[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Skip title line
    if (trimmed.includes("ERCHEMPERT") || trimmed.includes("LANGABARDORVM")) continue;

    const match = trimmed.match(sectionStartRegex);
    if (match) {
      // Save previous section if exists
      if (currentNumber > 0 && currentParts.length > 0) {
        sections.push({ number: currentNumber, text: currentParts.join(" ") });
      }
      currentNumber = parseInt(match[1], 10);
      currentParts = [match[2]];
    } else if (currentNumber > 0) {
      // Continuation line: append to current section
      currentParts.push(trimmed);
    }
  }
  // Save last section
  if (currentNumber > 0 && currentParts.length > 0) {
    sections.push({ number: currentNumber, text: currentParts.join(" ") });
  }

  console.log("Found " + sections.length + " sections in raw file.");

  for (const section of sections) {
    const title = SECTION_TITLES[section.number];
    if (!title) {
      console.warn("Warning: No title for section " + section.number);
    }

    const chapterTitle = section.number + ". " + (title || "Sectio " + section.number + " (Section " + section.number + ")");
    const paragraphs = splitIntoParagraphs(section.text);

    const chapterData: ChapterData = {
      chapterNumber: section.number,
      title: chapterTitle,
      sourceContent: {
        paragraphs: paragraphs,
      },
    };

    const fileName = "chapter-" + String(section.number).padStart(3, "0") + ".json";
    const outputPath = path.join(OUTPUT_DIR, fileName);
    fs.writeFileSync(outputPath, JSON.stringify(chapterData, null, 2), "utf-8");
  }

  console.log("Successfully processed " + sections.length + " sections into " + OUTPUT_DIR);
}

main();
