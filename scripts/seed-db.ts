/**
 * Seeds the database with languages, authors, texts, and chapters
 * from the processed JSON files.
 *
 * Usage: pnpm db:seed
 *
 * Prerequisites:
 * - PostgreSQL running (docker compose up -d)
 * - Migrations applied (pnpm db:push or pnpm db:migrate)
 * - Text processing done (pnpm process:texts)
 *
 * This script is idempotent — re-running it will skip existing records.
 */

import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "../src/server/db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is required.");
  console.error("Copy .env.example to .env.local and configure it.");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: { index: number; text: string }[];
  };
}

// ============================================================
// Seed data definitions
// ============================================================

const LANGUAGES = [
  { code: "zh", name: "Classical Chinese", displayName: "文言文" },
  { code: "grc", name: "Greek", displayName: "Ἑλληνική" },
  { code: "la", name: "Latin", displayName: "Lingua Latina" },
  { code: "en", name: "English", displayName: "English" },
  { code: "ta", name: "Tamil", displayName: "தமிழ்" },
] as const;

const AUTHORS = [
  {
    name: "Zhu Xi",
    nameOriginalScript: "朱熹",
    slug: "zhu-xi",
    era: "Song Dynasty (1130–1200)",
    description:
      "Neo-Confucian philosopher whose recorded sayings form the Zhu Zi Yu Lei.",
  },
  {
    name: "Constantine VII Porphyrogennetos",
    nameOriginalScript: "Κωνσταντῖνος Ζʹ ὁ Πορφυρογέννητος",
    slug: "constantine-vii",
    era: "Byzantine Empire (905–959)",
    description:
      "Byzantine emperor and scholar who compiled De Ceremoniis, a treatise on imperial court protocol.",
  },
  {
    name: "Wang Yangming",
    nameOriginalScript: "王陽明",
    slug: "wang-yangming",
    era: "Ming Dynasty (1472–1529)",
    description:
      "Neo-Confucian philosopher, statesman, and military strategist who developed the philosophy of the unity of knowledge and action and the doctrine of innate moral knowing (良知).",
  },
  {
    name: "Cassiodorus",
    nameOriginalScript: "Flavius Magnus Aurelius Cassiodorus Senator",
    slug: "cassiodorus",
    era: "Ostrogothic Italy (c. 485–585)",
    description:
      "Roman statesman, writer, and monk who served under the Ostrogothic kings. His De Anima is a treatise on the nature and powers of the soul.",
  },
  {
    name: "Henry of Settimello",
    nameOriginalScript: "Henricus Septimellensis",
    slug: "henry-of-settimello",
    era: "Medieval Italy (fl. c. 1190)",
    description:
      "Medieval Italian Latin poet known for his Elegia, a philosophical poem lamenting the author's misfortunes and seeking consolation through philosophy.",
  },
  {
    name: "Erchempert",
    nameOriginalScript: "Erchempertus",
    slug: "erchempert",
    era: "Lombard Benevento (fl. c. 870–890)",
    description:
      "Lombard monk and chronicler who wrote the Historia Langobardorum Beneventanorum, a history of the Lombard principality of Benevento.",
  },
  {
    name: "Hugo Falcandus",
    nameOriginalScript: "Hugo Falcandus",
    slug: "hugo-falcandus",
    era: "Norman Sicily (fl. c. 1169–1182)",
    description:
      "Pseudonymous Latin chronicler of the Kingdom of Sicily during the later Norman period. His Liber de Regno Sicilie is a vivid account of court intrigue and political upheaval.",
  },
  {
    name: "Yuan Shu",
    nameOriginalScript: "袁樞",
    slug: "yuan-shu",
    era: "Southern Song Dynasty (1131–1205)",
    description:
      "Song dynasty historian who reorganized Sima Guang's Zizhi Tongjian into topical narratives, creating the Tongjian Jishi Benmo (通鑑紀事本末), the first Chinese historical work organized by events rather than chronology.",
  },
  {
    name: "Huangdi (Traditional Attribution)",
    nameOriginalScript: "黃帝",
    slug: "huangdi",
    era: "Warring States to Han Dynasty (c. 300 BCE – 200 CE)",
    description:
      "The Huang Di Nei Jing is traditionally attributed to the legendary Yellow Emperor (黃帝), but is actually a compilation of medical knowledge assembled by numerous anonymous physicians over several centuries.",
  },
  {
    name: "Theodore Prodromos",
    nameOriginalScript: "Θεόδωρος Πρόδρομος",
    slug: "theodore-prodromos",
    era: "Byzantine Empire (c. 1100–1170)",
    description:
      "Byzantine poet, novelist, and scholar. The Ptochoprodromika are satirical vernacular Greek poems attributed to him, offering vivid portraits of everyday life in 12th-century Constantinople.",
  },
  {
    name: "Wilhelm Wagner (editor)",
    nameOriginalScript: "Wilhelm Wagner",
    slug: "wagner",
    era: "19th century (1843–1907)",
    description:
      "German classical philologist who edited the Carmina Graeca Medii Aevi, a collection of 21 medieval vernacular Greek poems from manuscripts in various European libraries.",
  },
  {
    name: "Guliang Chi",
    nameOriginalScript: "穀梁赤",
    slug: "guliang-chi",
    era: "Warring States period (c. 300 BCE)",
    description:
      "Traditional author of the Guliang Zhuan, one of the three classical commentaries on the Spring and Autumn Annals. The commentary was likely compiled by his disciples and transmitted orally before being written down during the Han dynasty.",
  },
  {
    name: "Mudathirumaran",
    nameOriginalScript: "முடத்திருமாறன்",
    slug: "mudathirumaran",
    era: "Sangam period (c. 100-300 CE)",
    description:
      "Sangam Tamil poet, author of Porunararruppadai, one of the Ten Idylls (Pattuppattu). The poem describes the journey of a bard seeking patronage from a Chola king.",
  },
  {
    name: "Ban Gu",
    nameOriginalScript: "班固",
    slug: "ban-gu",
    era: "Eastern Han dynasty (32–92 CE)",
    description:
      "Eastern Han dynasty historian, compiler of the Book of Han (漢書). He presided over the White Tiger Hall conference of 79 CE and compiled the Baihu Tong (白虎通義), recording the debates on Confucian classical scholarship held before Emperor Zhang.",
  },
  {
    name: "Zheng Xuan (ed.)",
    nameOriginalScript: "鄭玄",
    slug: "zheng-xuan",
    era: "Eastern Han dynasty (127–200 CE)",
    description:
      "Han dynasty classical scholar whose authoritative commentary on the Yi Li (儀禮) has been transmitted alongside the base text for nearly two millennia. His annotations clarify ritual procedures, resolve textual ambiguities, and connect the Ceremonies and Rites to broader Confucian canonical traditions.",
  },
  {
    name: "Zhou Court Scribes",
    nameOriginalScript: "周室史官",
    slug: "zhou-scribes",
    era: "Western Zhou to Warring States (c. 1000-300 BCE)",
    description:
      "Collective attribution for the scribes and officials who composed the documents compiled in the Yi Zhou Shu. The texts were edited and annotated by Kong Chao (孔晁) during the Jin dynasty.",
  },
  {
    name: "Ying Shao",
    nameOriginalScript: "應劭",
    slug: "ying-shao",
    era: "Eastern Han dynasty (c. 140-204 CE)",
    description:
      "Eastern Han dynasty scholar and official who served as Prefect of Taishan. His Fengsu Tongyi (風俗通義) is an encyclopedic work on customs, etymology, beliefs, and social practices, preserving valuable information about Han dynasty folk culture and correcting popular misconceptions.",
  },
  {
    name: "Huangfu Mi",
    nameOriginalScript: "皇甫謐",
    slug: "huangfu-mi",
    era: "Western Jin dynasty (215-282 CE)",
    description:
      "Western Jin dynasty scholar, physician, and historian. Despite suffering from a debilitating illness, he devoted himself to scholarship and refused all official appointments. His Gaoshi Zhuan (高士傳) is a collection of biographies of recluses and scholars who refused office.",
  },
  {
    name: "Various Poets",
    nameOriginalScript: "பல்கவிஞர்கள்",
    slug: "nandikkalambakam-poets",
    era: "Pallava period (c. 850 CE)",
    description:
      "The Nandikkalambakam is a kalambakam (multi-genre anthology) composed by multiple poets praising King Nandivarman III Pallava. The kalambakam form features diverse poetic genres unified around a single patron or subject.",
  },
] as const;

const TEXTS = [
  {
    title: "Classified Conversations of Master Zhu (Zhu Zi Yu Lei)",
    titleOriginalScript: "朱子語類",
    slug: "zhuziyulei",
    languageCode: "zh",
    authorSlug: "zhu-xi",
    description:
      "Classified Conversations of Master Zhu — a massive compendium of 140 chapters recording the philosophical discussions of Zhu Xi with his students.",
    sourceUrl: "https://ctext.org/zhuzi-yulei",
    processedDir: "data/processed/zhuziyulei",
    compositionYear: 1270,
    compositionEra: "咸淳六年, Southern Song",
  },
  {
    title: "On the Ceremonies of the Byzantine Court",
    titleOriginalScript: "Περὶ τῆς Βασιλείου Τάξεως",
    slug: "ceremonialis",
    languageCode: "grc",
    authorSlug: "constantine-vii",
    description:
      "On the Ceremonies of the Byzantine Court — a detailed account of the ceremonies and protocol of the Byzantine imperial court, compiled in the 10th century.",
    sourceUrl: "https://archive.org/details/bub_gb_OFpFAAAAYAAJ",
    processedDir: "data/processed/ceremonialis",
    compositionYear: 959,
    compositionEra: "Reign of Constantine VII, Byzantine Empire",
  },
  {
    title: "Instructions for Practical Living (Chuan Xi Lu)",
    titleOriginalScript: "傳習錄",
    slug: "chuanxilu",
    languageCode: "zh",
    authorSlug: "wang-yangming",
    description:
      "Instructions for Practical Living — a collection of recorded conversations, letters, and essays by Wang Yangming, compiled by his disciples. The foundational text of the Yangming school of Neo-Confucianism.",
    sourceUrl: "https://ctext.org/chuan-xi-lu",
    processedDir: "data/processed/chuanxilu",
    compositionYear: 1518,
    compositionEra: "正德十三年, Ming Dynasty",
  },
  {
    title: "On the Soul",
    titleOriginalScript: "De Anima",
    slug: "deanima",
    languageCode: "la",
    authorSlug: "cassiodorus",
    description:
      "On the Soul — a treatise on the nature, definition, qualities, and powers of the human soul, written after Cassiodorus retired to his monastery at Vivarium.",
    sourceUrl: "https://www.thelatinlibrary.com/cassiodorus/anima.shtml",
    processedDir: "data/processed/deanima",
    compositionYear: 540,
    compositionEra: "Post-consulship, Ostrogothic Italy",
  },
  {
    title: "Elegy on Misfortune",
    titleOriginalScript: "Elegia sive de Miseria",
    slug: "elegia",
    languageCode: "la",
    authorSlug: "henry-of-settimello",
    description:
      "A medieval Latin elegiac poem in four books lamenting the author's fall from fortune and seeking consolation through philosophy, modeled on Boethius's Consolation of Philosophy.",
    sourceUrl: "",
    processedDir: "data/processed/elegia",
    compositionYear: 1190,
    compositionEra: "Late 12th century, Tuscany",
    textType: "poetry" as const,
  },
  {
    title: "History of the Lombards of Benevento",
    titleOriginalScript: "Historia Langobardorum Beneventanorum",
    slug: "lombards",
    languageCode: "la",
    authorSlug: "erchempert",
    description:
      "History of the Lombards of Benevento — a chronicle covering the Lombard principality of Benevento from the Carolingian conquest to the late 9th century, written by a monk of Monte Cassino.",
    sourceUrl: "",
    processedDir: "data/processed/lombards",
    compositionYear: 889,
    compositionEra: "Late 9th century, Southern Italy",
  },
  {
    title: "The Book of the Kingdom of Sicily",
    titleOriginalScript: "Liber de Regno Sicilie",
    slug: "regno",
    languageCode: "la",
    authorSlug: "hugo-falcandus",
    description:
      "The Book of the Kingdom of Sicily — a vivid Latin chronicle of political intrigue, rebellion, and court conspiracy in Norman Sicily during the reign of William I and the regency for William II.",
    sourceUrl: "",
    processedDir: "data/processed/regno",
    compositionYear: 1169,
    compositionEra: "Norman Kingdom of Sicily",
  },
  {
    title: "Narratives from the Comprehensive Mirror (Tongjian Jishi Benmo)",
    titleOriginalScript: "通鑑紀事本末",
    slug: "tongjian",
    languageCode: "zh",
    authorSlug: "yuan-shu",
    description:
      "Event-by-Event Narrative of the Comprehensive Mirror — the first Chinese historical work organized by topical events rather than chronology, reorganizing Sima Guang's Zizhi Tongjian into 42 self-contained narratives spanning from the Partition of Jin to the Later Zhou dynasty.",
    sourceUrl: "https://ctext.org/tongjian-jishi-benmo",
    processedDir: "data/processed/tongjian",
    compositionYear: 1174,
    compositionEra: "淳熙元年, Southern Song",
  },
  {
    title: "The Yellow Emperor's Classic of Medicine (Huang Di Nei Jing)",
    titleOriginalScript: "黃帝內經",
    slug: "huangdineijing",
    languageCode: "zh",
    authorSlug: "huangdi",
    description:
      "The foundational text of Chinese medicine, comprising two parts: the Su Wen (素問, Basic Questions) and the Ling Shu (靈樞, Spiritual Pivot). A dialogue between the Yellow Emperor and his physician Qi Bo covering physiology, pathology, diagnosis, and treatment according to the principles of yin-yang and the five phases.",
    sourceUrl: "https://ctext.org/huangdi-neijing",
    processedDir: "data/processed/huangdineijing",
    compositionYear: -200,
    compositionEra: "Warring States to Western Han Dynasty",
  },
  {
    title: "Poems of Poor Prodromos (Ptochoprodromika)",
    titleOriginalScript: "Πτωχοπροδρομικά",
    slug: "ptochoprodromos",
    languageCode: "grc",
    authorSlug: "theodore-prodromos",
    description:
      "Satirical vernacular Greek poems offering vivid portraits of everyday life in 12th-century Constantinople — a scholar lamenting his poverty, a henpecked husband, a monk complaining about monastic food, and a craftsman mocking the educated.",
    sourceUrl: "",
    processedDir: "data/processed/ptochoprodromos",
    compositionYear: 1140,
    compositionEra: "Reign of Manuel I Komnenos, Byzantine Empire",
    textType: "poetry" as const,
  },
  {
    title: "Medieval Greek Poems (Carmina Graeca Medii Aevi)",
    titleOriginalScript: "Carmina Graeca Medii Aevi",
    slug: "carmina-graeca",
    languageCode: "grc",
    authorSlug: "wagner",
    description:
      "A collection of 21 medieval vernacular Greek poems from the 12th–15th centuries, including romances, beast fables, satirical verse, laments, and historical narratives. Texts include the Tale of Belisarius, Poulologos (Tale of the Birds), and works by Sachlikis, Georgillas, and Pikatorios.",
    sourceUrl: "https://archive.org/details/carminagraecame00wagngoog",
    processedDir: "data/processed/carmina-graeca",
    compositionYear: 1874,
    compositionEra: "Published Leipzig, 1874 (poems date 12th–15th c.)",
    textType: "poetry" as const,
  },
  {
    title: "Commentary of Guliang (Guliang Zhuan)",
    titleOriginalScript: "穀梁傳",
    slug: "guliang-zhuan",
    languageCode: "zh",
    authorSlug: "guliang-chi",
    description:
      "One of the three classical commentaries on the Spring and Autumn Annals (Chunqiu). The Guliang Zhuan interprets the terse chronicle entries through a question-and-answer format, emphasizing ritual propriety, the praise-and-blame principles of the Annals, and the moral significance of word choices in the original text.",
    sourceUrl: "https://ctext.org/guliang-zhuan",
    processedDir: "data/processed/guliang-zhuan",
    compositionYear: -200,
    compositionEra: "Warring States to Western Han Dynasty",
  },
  {
    title: "The War-Bard's Guide (Porunararruppadai)",
    titleOriginalScript: "பொருநராற்றுப்படை",
    slug: "porunararruppadai",
    languageCode: "ta",
    authorSlug: "mudathirumaran",
    description:
      "A Sangam Tamil poem from the Pattuppattu (Ten Idylls), describing the journey of a bard seeking patronage from a Chola king. One of the earliest examples of Tamil bardic poetry.",
    sourceUrl: "https://www.projectmadurai.org/",
    processedDir: "data/processed/porunararruppadai",
    compositionYear: 200,
    compositionEra: "Sangam period (c. 100-300 CE)",
    textType: "poetry" as const,
  },
  {
    title: "Comprehensive Discussions in the White Tiger Hall (Baihu Tong)",
    titleOriginalScript: "白虎通義",
    slug: "baihu-tong",
    languageCode: "zh",
    authorSlug: "ban-gu",
    description:
      "Comprehensive Discussions in the White Tiger Hall — a record of debates on Confucian classical scholarship held at the White Tiger Hall conference of 79 CE, covering 43 topics including ritual, governance, cosmology, human nature, and social institutions.",
    sourceUrl: "https://ctext.org/bai-hu-tong",
    processedDir: "data/processed/baihu-tong",
    compositionYear: 79,
    compositionEra: "建初四年, Eastern Han dynasty",
  },
  {
    title: "Ceremonies and Rites (Yi Li)",
    titleOriginalScript: "儀禮",
    slug: "yi-li",
    languageCode: "zh",
    authorSlug: "zheng-xuan",
    description:
      "One of the Three Ritual Classics (三禮) of Confucianism, detailing ceremonies for the scholar-official class including capping, marriage, audience, archery, funeral, and sacrificial rites. This edition presents the base text (經) of all 17 traditional chapters.",
    sourceUrl: "https://ctext.org/yi-li",
    processedDir: "data/processed/yi-li",
    compositionYear: -200,
    compositionEra: "Western Han (base text, c. 200 BCE); Eastern Han (Zheng Xuan commentary, c. 180 CE)",
  },
  {
    title: "Lost Book of Zhou (Yi Zhou Shu)",
    titleOriginalScript: "逸周書",
    slug: "yi-zhou-shu",
    languageCode: "zh",
    authorSlug: "zhou-scribes",
    description:
      "A collection of ancient Zhou dynasty documents not included in the canonical Book of Documents (Shang Shu). Contains historical narratives, royal speeches, administrative records, and ritual texts from the Western Zhou period. The received text has 70 traditional chapters, of which 61 are extant plus a preface.",
    sourceUrl: "https://ctext.org/lost-book-of-zhou",
    processedDir: "data/processed/yi-zhou-shu",
    compositionYear: -800,
    compositionEra: "Western Zhou to Warring States (c. 1000-300 BCE)",
  },
  {
    title: "Comprehensive Meaning of Customs (Fengsu Tongyi)",
    titleOriginalScript: "風俗通義",
    slug: "fengsutongyi",
    languageCode: "zh",
    authorSlug: "ying-shao",
    description:
      "An encyclopedic work on customs, beliefs, etymology, and social practices by Ying Shao (應劭) of the Eastern Han dynasty (c. 195 CE). Covers topics ranging from ancient kings and hegemons to ritual practices, music, spirits, and geography.",
    sourceUrl: "https://ctext.org/fengsu-tongyi",
    processedDir: "data/processed/fengsutongyi",
    compositionYear: 195,
    compositionEra: "Eastern Han dynasty (c. 195 CE)",
  },
  {
    title: "Biographies of Lofty Scholars (Gaoshi Zhuan)",
    titleOriginalScript: "高士傳",
    slug: "gaoshizhuan",
    languageCode: "zh",
    authorSlug: "huangfu-mi",
    description:
      "A collection of biographies of hermits, recluses, and virtuous scholars who refused office, compiled by Huangfu Mi (皇甫謐) of the Western Jin dynasty (c. 270 CE). Covers figures from mythical antiquity through the Han dynasty.",
    sourceUrl: "https://ctext.org/gaoshi-zhuan",
    processedDir: "data/processed/gaoshizhuan",
    compositionYear: 270,
    compositionEra: "Western Jin dynasty (c. 270 CE)",
  },
  {
    title: "The Anthology of Nandi (Nandikkalambakam)",
    titleOriginalScript: "நந்திக்கலம்பகம்",
    slug: "nandikkalambakam",
    languageCode: "ta",
    authorSlug: "nandikkalambakam-poets",
    description:
      "A kalambakam (multi-genre anthology) praising King Nandivarman III Pallava (c. 850 CE). The work comprises 88 poems plus supplements in diverse Tamil poetic genres, unified in praise of the Pallava king and his military achievements.",
    sourceUrl: "",
    processedDir: "data/processed/nandikkalambakam",
    compositionYear: 850,
    compositionEra: "Pallava period (c. 850 CE)",
    textType: "poetry" as const,
  },
] as const;

// ============================================================
// Seed functions
// ============================================================

async function seedLanguages(): Promise<Map<string, number>> {
  console.log("Seeding languages...");
  const codeToId = new Map<string, number>();

  for (const lang of LANGUAGES) {
    // Check if already exists
    const existing = await db.query.languages.findFirst({
      where: eq(schema.languages.code, lang.code),
    });

    if (existing) {
      codeToId.set(lang.code, existing.id);
      console.log(`  [skip] ${lang.code} — ${lang.name}`);
    } else {
      const [inserted] = await db
        .insert(schema.languages)
        .values(lang)
        .returning({ id: schema.languages.id });
      codeToId.set(lang.code, inserted.id);
      console.log(`  [add]  ${lang.code} — ${lang.name}`);
    }
  }

  return codeToId;
}

async function seedAuthors(): Promise<Map<string, number>> {
  console.log("\nSeeding authors...");
  const slugToId = new Map<string, number>();

  for (const author of AUTHORS) {
    const existing = await db.query.authors.findFirst({
      where: eq(schema.authors.slug, author.slug),
    });

    if (existing) {
      slugToId.set(author.slug, existing.id);
      console.log(`  [skip] ${author.name}`);
    } else {
      const [inserted] = await db
        .insert(schema.authors)
        .values(author)
        .returning({ id: schema.authors.id });
      slugToId.set(author.slug, inserted.id);
      console.log(`  [add]  ${author.name}`);
    }
  }

  return slugToId;
}

async function seedTexts(
  languageIds: Map<string, number>,
  authorIds: Map<string, number>
): Promise<Map<string, number>> {
  console.log("\nSeeding texts...");
  const slugToId = new Map<string, number>();

  for (const text of TEXTS) {
    const languageId = languageIds.get(text.languageCode);
    const authorId = authorIds.get(text.authorSlug);

    if (!languageId || !authorId) {
      console.error(`  [err]  Missing language or author for ${text.slug}`);
      continue;
    }

    const existing = await db.query.texts.findFirst({
      where: and(
        eq(schema.texts.slug, text.slug),
        eq(schema.texts.languageId, languageId)
      ),
    });

    if (existing) {
      slugToId.set(text.slug, existing.id);
      console.log(`  [skip] ${text.title}`);
    } else {
      const [inserted] = await db
        .insert(schema.texts)
        .values({
          title: text.title,
          titleOriginalScript: text.titleOriginalScript,
          slug: text.slug,
          languageId,
          authorId,
          description: text.description,
          sourceUrl: text.sourceUrl,
          totalChapters: 0, // Updated after chapters are inserted
          compositionYear: text.compositionYear,
          compositionEra: text.compositionEra,
          ...("textType" in text && { textType: text.textType }),
        })
        .returning({ id: schema.texts.id });
      slugToId.set(text.slug, inserted.id);
      console.log(`  [add]  ${text.title}`);
    }
  }

  return slugToId;
}

async function seedChapters(textIds: Map<string, number>): Promise<void> {
  console.log("\nSeeding chapters...");

  for (const text of TEXTS) {
    const textId = textIds.get(text.slug);
    if (!textId) {
      console.error(`  [err]  No text ID for ${text.slug}`);
      continue;
    }

    const processedDir = path.resolve(text.processedDir);
    if (!fs.existsSync(processedDir)) {
      console.warn(`  [warn] Processed dir not found: ${processedDir}`);
      console.warn(`         Run 'pnpm process:texts --text ${text.slug}' first.`);
      continue;
    }

    const files = fs
      .readdirSync(processedDir)
      .filter((f) => f.startsWith("chapter-") && f.endsWith(".json") && !f.includes("-translation"))
      .sort();

    if (files.length === 0) {
      console.warn(`  [warn] No chapter files in ${processedDir}`);
      continue;
    }

    console.log(`\n  ${text.title}: ${files.length} chapters`);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      const chapter: ProcessedChapter = JSON.parse(
        fs.readFileSync(path.join(processedDir, file), "utf-8")
      );

      // Check if chapter already exists
      const existing = await db.query.chapters.findFirst({
        where: and(
          eq(schema.chapters.textId, textId),
          eq(schema.chapters.chapterNumber, chapter.chapterNumber)
        ),
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      const chapterSlug = `chapter-${chapter.chapterNumber}`;

      await db.insert(schema.chapters).values({
        textId,
        chapterNumber: chapter.chapterNumber,
        slug: chapterSlug,
        title: chapter.title,
        sourceContent: chapter.sourceContent,
        ordering: chapter.chapterNumber,
      });

      insertedCount++;
    }

    // Update totalChapters on the text record
    await db
      .update(schema.texts)
      .set({ totalChapters: files.length })
      .where(eq(schema.texts.id, textId));

    console.log(`    Inserted: ${insertedCount}, Skipped: ${skippedCount}`);
  }
}

async function getOrCreateSystemUser(): Promise<number> {
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.username, "ai-translator"),
  });
  if (existing) return existing.id;

  const [inserted] = await db
    .insert(schema.users)
    .values({
      email: "ai@deltoi.org",
      username: "ai-translator",
      passwordHash: "---none---",
      role: "editor",
    })
    .returning({ id: schema.users.id });
  console.log("  [add]  System user: ai-translator");
  return inserted.id;
}

async function seedTranslations(textIds: Map<string, number>): Promise<void> {
  console.log("\nSeeding translations...");
  const systemUserId = await getOrCreateSystemUser();

  for (const text of TEXTS) {
    const textId = textIds.get(text.slug);
    if (!textId) continue;

    const processedDir = path.resolve(text.processedDir);
    if (!fs.existsSync(processedDir)) continue;

    const translationFiles = fs
      .readdirSync(processedDir)
      .filter((f) => f.includes("-translation.json"))
      .sort();

    if (translationFiles.length === 0) continue;

    console.log(`\n  ${text.title}: ${translationFiles.length} translation files`);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const file of translationFiles) {
      // Extract chapter number from filename (e.g., "chapter-1-translation.json" → 1)
      const match = file.match(/chapter-(\d+)-translation\.json/);
      if (!match) continue;
      const chapterNumber = parseInt(match[1]);

      // Find the chapter record
      const chapter = await db.query.chapters.findFirst({
        where: and(
          eq(schema.chapters.textId, textId),
          eq(schema.chapters.chapterNumber, chapterNumber)
        ),
      });
      if (!chapter) {
        console.warn(`    [warn] Chapter ${chapterNumber} not found for ${text.slug}`);
        continue;
      }

      // Check if translation already exists for this chapter
      const existingTranslation = await db.query.translations.findFirst({
        where: eq(schema.translations.chapterId, chapter.id),
      });
      if (existingTranslation) {
        skippedCount++;
        continue;
      }

      // Read translation content
      const translationContent = JSON.parse(
        fs.readFileSync(path.join(processedDir, file), "utf-8")
      );

      // Create translation record
      const [translation] = await db
        .insert(schema.translations)
        .values({ chapterId: chapter.id })
        .returning({ id: schema.translations.id });

      // Create version record
      const [version] = await db
        .insert(schema.translationVersions)
        .values({
          translationId: translation.id,
          versionNumber: 1,
          content: translationContent,
          authorId: systemUserId,
          editSummary: "Initial AI-generated translation",
        })
        .returning({ id: schema.translationVersions.id });

      // Update translation to point to current version
      await db
        .update(schema.translations)
        .set({ currentVersionId: version.id })
        .where(eq(schema.translations.id, translation.id));

      insertedCount++;
    }

    console.log(`    Inserted: ${insertedCount}, Skipped: ${skippedCount}`);
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log("=== Database Seed ===\n");

  const languageIds = await seedLanguages();
  const authorIds = await seedAuthors();
  const textIds = await seedTexts(languageIds, authorIds);
  await seedChapters(textIds);
  await seedTranslations(textIds);

  console.log("\n=== Seed complete ===");

  // Close the connection
  await client.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  client.end().then(() => process.exit(1));
});
