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

// Load .env.local manually (last DATABASE_URL wins, matching dotenv behavior)
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^DATABASE_URL=(.+)$/);
    if (match) {
      process.env.DATABASE_URL = match[1].replace(/^['"]|['"]$/g, "");
    }
  }
}

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
  { code: "zh", name: "Chinese", displayName: "文言文" },
  { code: "grc", name: "Greek", displayName: "Ἑλληνική" },
  { code: "la", name: "Latin", displayName: "Lingua Latina" },
  { code: "en", name: "English", displayName: "English" },
  { code: "ta", name: "Tamil", displayName: "தமிழ்" },
  { code: "it", name: "Italian", displayName: "Italian" },
  { code: "hy", name: "Armenian", displayName: "Հայերեն" },
  { code: "ms", name: "Malay", displayName: "Bahasa Melayu" },
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
  {
    name: "Anonymous Jain Poet",
    nameOriginalScript: "சமணக் கவிஞர்",
    slug: "yashodhara-kaviyam-poet",
    era: "Chola period (c. 10th-12th century CE)",
    description:
      "The author of Yashodhara Kaviyam is an anonymous Jain Tamil poet of the Chola period. The poem narrates the story of King Yashodhara to illustrate the Jain doctrine of karma and the consequences of violence (himsa), demonstrating how souls transmigrate through various animal births due to past actions.",
  },
  {
    name: "Anonymous Jain Poet (Udayana cycle)",
    nameOriginalScript: "சமணக் கவிஞர்",
    slug: "udayanakumara-kaviyam-poet",
    era: "Late medieval period (c. 13th-14th century CE)",
    description:
      "The author of Udayanakumara Kaviyam is an anonymous Jain Tamil poet of the late medieval period. The poem belongs to the Perunkathai (Great Narrative) tradition and narrates the story of Prince Udayana of the Vatsa kingdom, incorporating Jain philosophical concepts such as the seven tattvas, ahimsa, and the path to liberation through renunciation.",
  },
  {
    name: "Anonymous (Diognetus)",
    nameOriginalScript: "Ἀνώνυμος",
    slug: "diognetus-author",
    era: "2nd century CE",
    description:
      "The author of the Epistle to Diognetus is unknown. The text was formerly attributed to Justin Martyr but is now recognized as an anonymous early Christian apologetic work, possibly from the late 2nd century. It is a rhetorical defense of Christianity addressed to a pagan enquirer named Diognetus.",
  },
  {
    name: "Zosimus",
    nameOriginalScript: "Ζώσιμος",
    slug: "zosimus",
    era: "Byzantine Empire (late 5th – early 6th century CE)",
    description:
      "Byzantine historian and former imperial advocate (comes) who wrote the Historia Nova (New History) in 6 books, covering Roman history from Augustus to the sack of Rome in 410 CE. A pagan, Zosimus attributed Rome's decline to the abandonment of traditional religion.",
  },
  {
    name: "Anonymous (Aristotelian commentator)",
    nameOriginalScript: "Ἀνώνυμος",
    slug: "soph-elenchi-paraphrast",
    era: "Byzantine period (date uncertain)",
    description:
      "The anonymous author of the Paraphrase on Aristotle's Sophistical Refutations. This Byzantine-era commentary restates and explicates Aristotle's treatise on fallacious reasoning in more accessible Greek prose.",
  },
  {
    name: "Eustathius of Thessalonica",
    nameOriginalScript: "Εὐστάθιος Θεσσαλονίκης",
    slug: "eustathius",
    era: "Byzantine Empire (c. 1115–1195/6 CE)",
    description:
      "Byzantine scholar, archbishop of Thessalonica, and author of extensive commentaries on Homer's Iliad and Odyssey. His commentaries are the most comprehensive surviving ancient and medieval exegeses of Homer, preserving fragments of many lost earlier commentaries and scholia. He also wrote works on history, theology, and rhetoric.",
  },
  {
    name: "Marcianus of Heraclea",
    nameOriginalScript: "Μαρκιανὸς ὁ Ἡρακλεώτης",
    slug: "marcianus",
    era: "Late Roman period (c. 400 CE)",
    description:
      "Greek geographer from Heraclea Pontica who compiled epitomes of earlier geographical works. His surviving texts include an independent Periplus of the Outer Sea and epitomes of works by Menippus of Pergamon and Artemidorus of Ephesus.",
  },
  {
    name: "Anonymous (Hesiod Commentary)",
    nameOriginalScript: "Ἀνώνυμος",
    slug: "anonymous-hesiod",
    era: "Byzantine period (date uncertain)",
    description:
      "Anonymous author of an exegetical commentary on Hesiod's Theogony, preserved in a manuscript edited by Hans Flach. The commentary provides mythological, allegorical, and philosophical interpretations of Hesiod's cosmogonic poem.",
  },
  {
    name: "Kong Anguo",
    nameOriginalScript: "孔安國",
    slug: "kong-anguo",
    era: "Western Han dynasty (c. 156–74 BCE)",
    description:
      "Han dynasty Confucian scholar and descendant of Confucius in the eleventh generation. He is traditionally credited with compiling and editing the Kongzi Jiayu (孔子家語), a collection of dialogues and anecdotes of Confucius, though the text likely incorporates material from various periods.",
  },
  {
    name: "He Yan",
    nameOriginalScript: "何晏",
    slug: "he-yan",
    era: "Three Kingdoms (c. 249 CE)",
    description:
      "Wei dynasty scholar who compiled the standard commentary on the Analects.",
  },
  {
    name: "Zhao Qi",
    nameOriginalScript: "趙岐",
    slug: "zhao-qi",
    era: "Eastern Han (c. 200 CE)",
    description:
      "Han dynasty scholar who wrote the standard commentary on Mencius.",
  },
  {
    name: "Xing Bing",
    nameOriginalScript: "邢昺",
    slug: "xing-bing",
    era: "Northern Song (c. 1000 CE)",
    description:
      "Song dynasty scholar who wrote sub-commentaries on several classics.",
  },
  {
    name: "Guo Pu",
    nameOriginalScript: "郭璞",
    slug: "guo-pu",
    era: "Eastern Jin (c. 324 CE)",
    description:
      "Jin dynasty scholar and naturalist who annotated the Erya dictionary.",
  },
  {
    name: "Kong Yingda",
    nameOriginalScript: "孔穎達",
    slug: "kong-yingda",
    era: "Sui–Tang dynasty (574–648 CE)",
    description:
      "Tang dynasty Confucian scholar who led the imperially commissioned project to produce the Correct Meaning (正義) commentaries on the Five Classics. His sub-commentaries on the Spring and Autumn Annals, Book of Rites, Book of Changes, Book of Documents, and Mao Shi became the orthodox interpretation for the imperial examination system.",
  },
  {
    name: "He Xiu",
    nameOriginalScript: "何休",
    slug: "he-xiu",
    era: "Eastern Han (129–182 CE)",
    description:
      "Han dynasty classical scholar who wrote the standard commentary (解詁) on the Gongyang Commentary to the Spring and Autumn Annals. Devoted seventeen years to his work, which became the authoritative interpretation of the Gongyang school's approach to the Chunqiu.",
  },
  {
    name: "Fan Ning",
    nameOriginalScript: "范寧",
    slug: "fan-ning",
    era: "Eastern Jin (339–401 CE)",
    description:
      "Jin dynasty scholar who wrote the Collected Commentaries (集解) on the Guliang Commentary to the Spring and Autumn Annals. His work gathered the interpretations of various scholars and became the standard annotation for the Guliang tradition.",
  },
  {
    name: "Jia Gongyan",
    nameOriginalScript: "賈公彥",
    slug: "jia-gongyan",
    era: "Tang Dynasty (c. 650 CE)",
    description:
      "Tang dynasty scholar who wrote sub-commentaries on the Rites of Zhou and Ceremonial Rites, expanding on Zheng Xuan's earlier annotations with detailed textual analysis.",
  },
  {
    name: "Zheng Xuan (Liji ed.)",
    nameOriginalScript: "鄭玄",
    slug: "zheng-xuan-liji",
    era: "Eastern Han dynasty (127-200 CE)",
    description:
      "The greatest classical scholar of the Han dynasty, who wrote definitive commentaries on the Three Rites and many other classics. His annotations on the Book of Rites remain essential for understanding the text.",
  },
  {
    name: "Stefano Infessura",
    nameOriginalScript: "Stefano Infessura",
    slug: "stefano-infessura",
    era: "15th century (c. 1435–1500)",
    description:
      "Roman notary and chronicler, scribasenato (scribe of the Senate) of Rome. His Diario della Città di Roma is a chronicle of Roman civic life and papal politics from 1294 to 1494, written in vernacular Romanesco Italian.",
  },
  {
    name: "Gu Yanwu",
    nameOriginalScript: "顧炎武",
    slug: "gu-yanwu",
    era: "Ming-Qing transition (1613–1682)",
    description:
      "One of the greatest scholars of the early Qing dynasty, known for his emphasis on practical learning (實學) and evidential research (考據學). His Rizhilu represents decades of meticulous philological, historical, and philosophical investigation.",
  },
  {
    name: "Feng Menglong",
    nameOriginalScript: "馮夢龍",
    slug: "feng-menglong",
    era: "Ming Dynasty (1574–1646)",
    description:
      "Ming dynasty writer, historian, and playwright. Best known for his vernacular short story collections (三言) and the historical novel Dongzhou Lieguo Zhi, which dramatizes the Spring and Autumn and Warring States periods.",
  },
  {
    name: "Luo Maodeng",
    nameOriginalScript: "羅懋登",
    slug: "luo-maodeng",
    era: "Ming Dynasty (fl. 1597)",
    description:
      "Ming dynasty novelist best known for Sanbao Taijian Xiyang Ji (三寶太監西洋記), a 100-chapter fantasy novel about the voyages of the eunuch admiral Zheng He to the Western Ocean. The novel blends historical events with Buddhist and Daoist supernatural elements.",
  },
  {
    name: "Xi Zhousheng",
    nameOriginalScript: "西周生",
    slug: "xi-zhousheng",
    era: "Late Ming/Early Qing (fl. 17th century)",
    description:
      "Pseudonymous author of Xingshi Yinyuan Zhuan (醒世姻緣傳), a 100-chapter satirical novel about marriage and karmic retribution. The author's true identity remains unknown; 'Xi Zhousheng' literally means 'Scholar Born in the Western Zhou.'",
  },
  {
    name: "Raffi",
    nameOriginalScript: "Ռաֆֆի (Հակոբ Մելիք-Հակոբյան)",
    slug: "raffi",
    era: "1835–1888",
    description:
      "Father of Armenian historical fiction, Raffi (pen name of Hakob Melik-Hakobian) was the most influential Armenian novelist of the 19th century. His works, including Khent, Davit Bek, and Kaytser, shaped Armenian national consciousness and literary tradition.",
  },
  {
    name: "Perch Proshyan",
    nameOriginalScript: "Պերճ Պրոշյան",
    slug: "perch-proshyan",
    era: "1837–1907",
    description:
      "Armenian novelist and educator known for his realistic depictions of Armenian village life. His epistolary novel Anna Saroyan explores themes of social change, family misfortune, and women's inner lives in 19th-century Tiflis (Tbilisi).",
  },
  {
    name: "Arshagouhi Teotig",
    nameOriginalScript: "Արշագուհի Թեոտիգ",
    slug: "arshagouhi-teotig",
    era: "1875–1960s",
    description:
      "Armenian writer, feminist, and eyewitness chronicler of the 1909 Adana massacre. Wife of the writer Teotig (Teotoros Lapjinjian). Her memoir 'Adana's Wounds and Orphans' documenting her journey through the massacre's aftermath is a key primary source for the events of April 1909.",
  },
  {
    name: "Yeghishe Charents",
    nameOriginalScript: "Եղիշե Չարենց",
    slug: "yeghishe-charents",
    era: "1897–1937",
    description:
      "Major Armenian poet and writer of the early Soviet period. Charents fought in World War I and briefly joined the Armenian Revolutionary Federation before embracing communism. His poetic novel 'Yerkir Nairi' (Land of Nairi, 1922) is considered a modernist masterpiece. He was arrested during the Stalinist purges and died in prison in 1937. His famous patriotic poem 'Ես սիրում եմ իմ անուշ Հայաստանը' (I Love My Sweet Armenia) contains an acrostic message critical of Soviet rule.",
  },
  {
    name: "Giuseppe Rovani",
    nameOriginalScript: "Giuseppe Rovani",
    slug: "giuseppe-rovani",
    era: "1818–1874",
    description:
      "Italian novelist and literary critic, a leading figure of the Milanese Scapigliatura movement. His major works include the panoramic historical novel 'Cento anni' (A Hundred Years) spanning 1750-1850, and 'La giovinezza di Giulio Cesare' (The Youth of Julius Caesar). Known for his rich depictions of Italian society and history.",
  },
  {
    name: "Zhang Yu",
    nameOriginalScript: "張預",
    slug: "zhang-yu",
    era: "Northern Song Dynasty (fl. c. 1072)",
    description:
      "Song dynasty military theorist and historian who compiled the Shiqi Shi Baijiang Zhuan (十七史百將傳), a collection of biographies of one hundred eminent generals drawn from the seventeen standard histories. Each biography is followed by commentary citing Sun Tzu's Art of War.",
  },
  {
    name: "John Zonaras",
    nameOriginalScript: "Ἰωάννης Ζωναρᾶς",
    slug: "john-zonaras",
    era: "Byzantine Empire (fl. c. 1100–1150)",
    description:
      "Byzantine chronicler and canonist who served under Emperor Alexios I Komnenos. After retiring to a monastery, he composed the Epitome Historiarum, a world chronicle from creation to 1118 CE.",
  },
  {
    name: "Anonymous (Malay)",
    nameOriginalScript: null,
    slug: "anonymous-malay",
    era: "Traditional Malay period (date uncertain)",
    description:
      "Anonymous author of the Syair Siti Zubaidah, a classical Malay narrative poem preserved in manuscript tradition from the Sambas region of West Kalimantan. The syair recounts the adventures of Sultan Abidin and Siti Zubaidah in the court of Negeri Kumbayat.",
  },
  {
    name: "Tao Zongyi",
    nameOriginalScript: "\u9676\u5B97\u5100",
    slug: "tao-zongyi",
    era: "Yuan Dynasty (c. 1329\u20131412)",
    description:
      "Yuan-dynasty scholar and writer. His Nancun Chuogeng Lu (Records of Resting from the Plough) is one of the most important biji miscellanies of the period, covering Yuan court affairs, customs, arts, literature, and institutional practices.",
  },
  {
    name: "Mayuram Vedanayakam Pillai",
    nameOriginalScript: "\u0BB5\u0BC7\u0BA4\u0BA8\u0BBE\u0BAF\u0B95\u0BAE\u0BCD \u0BAA\u0BBF\u0BB3\u0BCD\u0BB3\u0BC8",
    slug: "vedanayakam-pillai",
    era: "19th century (1826-1889)",
    description:
      "Pioneer of the Tamil novel. His Prathapa Mudaliar Charithram (1876) is widely considered the first Tamil novel. Suguna Sundari (1887) is his second novel, a morality tale incorporating social commentary against child marriage, extensive moral philosophy, and Tamil proverbs.",
  },
  {
    name: "Theodore Metochites",
    nameOriginalScript: "Θεόδωρος Μετοχίτης",
    slug: "theodore-metochites",
    era: "Byzantine Empire (1270–1332)",
    description:
      "Byzantine statesman, philosopher, and patron of the arts. As Grand Logothete under Emperor Andronikos II Palaiologos, he was the most powerful figure in the empire after the emperor. His Semeioseis Gnomikai is a vast collection of essays on history, philosophy, literature, and politics.",
  },
  {
    name: "Cletto Arrighi",
    nameOriginalScript: null,
    slug: "cletto-arrighi",
    era: "19th century (1830–1906)",
    description:
      "Pseudonym of Carlo Righetti. Milanese journalist, novelist, and playwright. A key figure of the Scapigliatura literary movement, he coined the term in his 1862 novel La Scapigliatura e il 6 Febbraio. He also founded the satirical newspaper L'Unione.",
  },
  {
    name: "Chen Sen",
    nameOriginalScript: "陳森",
    slug: "chen-sen",
    era: "Qing Dynasty (c. 1796–1870)",
    description:
      "Qing dynasty novelist. Little is known of his life beyond his authorship of Pinhua Baojian (A Precious Mirror of Ranked Flowers), a novel depicting the world of Beijing opera dan performers and the literati who patronize them, completed around 1849.",
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
      "Event-by-Event Narrative of the Comprehensive Mirror — the first Chinese historical work organized by topical events rather than chronology. Reorganizes Sima Guang's Zizhi Tongjian into 42 major narratives (presented here in 45 chapters), spanning from the Partition of Jin to the Later Zhou dynasty.",
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
      "The foundational text of Chinese medicine, presented here in its Su Wen (素問, Basic Questions) portion. A dialogue between the Yellow Emperor and his physician Qi Bo covering physiology, pathology, diagnosis, and treatment according to the principles of yin-yang and the five phases. The complete Huang Di Nei Jing also includes the Ling Shu (靈樞, Spiritual Pivot), not yet included here.",
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
      "A kalambakam (multi-genre anthology) of 114 poems praising King Nandivarman III Pallava (c. 850 CE). The work showcases diverse Tamil poetic genres including venba, kalithurai, and viruttam, unified in praise of the Pallava king and his military achievements.",
    sourceUrl: "",
    processedDir: "data/processed/nandikkalambakam",
    compositionYear: 850,
    compositionEra: "Pallava period (c. 850 CE)",
    textType: "poetry" as const,
  },
  {
    title: "The Story of Yashodhara (Yashodhara Kaviyam)",
    titleOriginalScript: "யசோதர காவியம்",
    slug: "yashodhara-kaviyam",
    languageCode: "ta",
    authorSlug: "yashodhara-kaviyam-poet",
    description:
      "A Jain Tamil epic poem in 5 carukkams (chapters) and 330 verses, narrating the story of King Yashodhara and Queen Chandramati to illustrate the Jain doctrine of karma and ahimsa. Through their various rebirths as animals — peacock, dog, snake, boar, fish, goat, and rooster — the poem demonstrates the consequences of violence and the path to liberation through non-violence and right conduct.",
    sourceUrl: "",
    processedDir: "data/processed/yashodhara-kaviyam",
    compositionYear: 1050,
    compositionEra: "Chola period (c. 10th-12th century CE)",
    textType: "poetry" as const,
  },
  {
    title: "The Tale of Prince Udayana (Udayanakumara Kaviyam)",
    titleOriginalScript: "உதயணகுமார காவியம்",
    slug: "udayanakumara-kaviyam",
    languageCode: "ta",
    authorSlug: "udayanakumara-kaviyam-poet",
    description:
      "A Jain Tamil narrative poem in 6 kandams (cantos) and 367 verses, telling the story of Prince Udayana (Udayanan) of the Vatsa kingdom. Part of the Perunkathai (Great Narrative) tradition, the poem traces Udayana's adventures, marriages, battles, and eventual renunciation, illustrating Jain philosophical concepts including the seven tattvas and the path from worldly life to spiritual liberation.",
    sourceUrl: "",
    processedDir: "data/processed/udayanakumara-kaviyam",
    compositionYear: 1300,
    compositionEra: "Late medieval period (c. 13th-14th century CE)",
    textType: "poetry" as const,
  },
  {
    title: "Epistle to Diognetus",
    titleOriginalScript: "Πρὸς Διόγνητον",
    slug: "diognetum",
    languageCode: "grc",
    authorSlug: "diognetus-author",
    description:
      "An anonymous early Christian apologetic letter addressed to a pagan named Diognetus, defending Christianity against paganism and Judaism. One of the earliest examples of Christian apologetics, notable for its elegant Greek rhetoric and its description of Christians as 'resident aliens' in the world.",
    sourceUrl: "https://github.com/OpenGreekAndLatin/First1KGreek",
    processedDir: "data/processed/diognetum",
    compositionYear: 180,
    compositionEra: "Late 2nd century CE",
  },
  {
    title: "New History (Historia Nova)",
    titleOriginalScript: "Ἱστορία Νέα",
    slug: "historia-nova",
    languageCode: "grc",
    authorSlug: "zosimus",
    description:
      "A history of the Roman Empire in 6 books, covering from the reign of Augustus to the sack of Rome by Alaric in 410 CE. Written from a pagan perspective, Zosimus attributes Rome's decline to the abandonment of the traditional gods. A major source for late Roman political and military history.",
    sourceUrl: "https://github.com/OpenGreekAndLatin/First1KGreek",
    processedDir: "data/processed/historia-nova",
    compositionYear: 500,
    compositionEra: "Late 5th – early 6th century CE, Byzantine Empire",
  },
  {
    title: "Paraphrase on Sophistical Refutations",
    titleOriginalScript: "Εἰς τοὺς Σοφιστικοὺς Ἐλέγχους Παράφρασις",
    slug: "sophistici-elenchi-paraphrasis",
    languageCode: "grc",
    authorSlug: "soph-elenchi-paraphrast",
    description:
      "A Byzantine paraphrase of Aristotle's Sophistical Refutations (De Sophisticis Elenchis), restating and explicating Aristotle's treatise on fallacious reasoning. The paraphrase makes Aristotle's dense logical analysis more accessible through expanded explanation in prose Greek.",
    sourceUrl: "https://github.com/OpenGreekAndLatin/First1KGreek",
    processedDir: "data/processed/sophistici-elenchi-paraphrasis",
    compositionYear: 900,
    compositionEra: "Byzantine period (date uncertain)",
  },
  {
    title: "Commentary on the Odyssey",
    titleOriginalScript: "Παρεκβολαὶ εἰς τὴν Ὁμήρου Ὀδύσσειαν",
    slug: "eustathius-odyssey",
    languageCode: "grc",
    authorSlug: "eustathius",
    description:
      "Eustathius of Thessalonica's commentary on Homer's Odyssey, composed in the 12th century. The work is a vast compendium of ancient and medieval scholarship on the Odyssey, preserving fragments of lost commentaries, lexica, and scholia. It covers all 24 books of the Odyssey with extensive philological, mythological, and historical annotation.",
    sourceUrl: "https://archive.org/details/commentariiadhom01eust",
    processedDir: "data/processed/eustathius-odyssey",
    compositionYear: 1170,
    compositionEra: "12th century CE, Byzantine Empire",
  },
  {
    title: "Circumnavigation of the Outer Sea (Periplus Maris Exteri)",
    titleOriginalScript: "Περίπλους τῆς ἔξω θαλάσσης",
    slug: "periplus-maris-exteri",
    languageCode: "grc",
    authorSlug: "marcianus",
    description:
      "Marcianus' independent geographical work describing the circumnavigation of the seas beyond the Mediterranean (the 'Outer Sea'), covering the coasts of Africa, Arabia, India, and the Far East. Organized in two books: Book 1 covers the eastern ocean, Book 2 the western.",
    sourceUrl: "",
    processedDir: "data/processed/periplus-maris-exteri",
    compositionYear: 400,
    compositionEra: "Late Roman period",
  },
  {
    title: "Menippus' Circumnavigation of the Inner Sea (Periplus Maris Interni)",
    titleOriginalScript: "Μενίππου Περίπλους τῆς ἐντὸς θαλάσσης",
    slug: "periplus-maris-interni",
    languageCode: "grc",
    authorSlug: "marcianus",
    description:
      "Marcianus' epitome of the Periplus of the Inner Sea (Mediterranean) by Menippus of Pergamon. A condensed geographical survey of Mediterranean coastlines and distances between ports.",
    sourceUrl: "",
    processedDir: "data/processed/periplus-maris-interni",
    compositionYear: 400,
    compositionEra: "Late Roman period",
  },
  {
    title: "Artemidorus' Geography (Epitome)",
    titleOriginalScript: "Ἀρτεμιδώρου Γεωγραφία",
    slug: "artemidori-geographia",
    languageCode: "grc",
    authorSlug: "marcianus",
    description:
      "Marcianus' epitome of the Geography by Artemidorus of Ephesus. A fragmentary condensation of Artemidorus' eleven-book geographical work, preserving scattered place names, distances, and ethnographic notes from the original.",
    sourceUrl: "",
    processedDir: "data/processed/artemidori-geographia",
    compositionYear: 400,
    compositionEra: "Late Roman period",
  },
  {
    title: "Exegesis on Hesiod's Theogony (Exegesis in Hesiodi Theogoniam)",
    titleOriginalScript: "Ἐξήγησις εἰς τὴν Ἡσιόδου Θεογονίαν",
    slug: "hesiod-theogony-exegesis",
    languageCode: "grc",
    authorSlug: "anonymous-hesiod",
    description:
      "An anonymous Byzantine commentary on Hesiod's Theogony, providing section-by-section exegesis with mythological, allegorical, and philosophical interpretations. Edited by Hans Flach.",
    sourceUrl: "",
    processedDir: "data/processed/hesiod-theogony-exegesis",
    compositionYear: 1100,
    compositionEra: "Byzantine period (date uncertain)",
  },
  {
    title: "The School Sayings of Confucius (Kongzi Jiayu)",
    titleOriginalScript: "孔子家語",
    slug: "kongzi-jiayu",
    languageCode: "zh",
    authorSlug: "kong-anguo",
    description:
      "A collection of 44 chapters recording dialogues, anecdotes, and discourses of Confucius with his disciples and various rulers. Traditionally attributed to Kong Anguo, the text covers topics including governance, ritual propriety, music, virtue, and the conduct of the exemplary person.",
    sourceUrl: "https://ctext.org/kongzi-jiayu",
    processedDir: "data/processed/kongzi-jiayu",
    compositionYear: -100,
    compositionEra: "Western Han dynasty (c. 2nd–1st century BCE)",
  },
  {
    title: "Analects with Commentary (Lunyu Zhushu)",
    titleOriginalScript: "論語註疏",
    slug: "lunyu-zhushu",
    languageCode: "zh",
    authorSlug: "he-yan",
    description:
      "The Analects of Confucius with He Yan's collected commentary and Xing Bing's sub-commentary, from the Thirteen Classics edition.",
    sourceUrl: "https://ctext.org/lunyu-zhushu",
    processedDir: "data/processed/lunyu-zhushu",
    compositionYear: 249,
    compositionEra: "Three Kingdoms / Northern Song (249 CE / 999 CE)",
  },
  {
    title: "Mencius with Commentary (Mengzi Zhushu)",
    titleOriginalScript: "孟子註疏",
    slug: "mengzi-zhushu",
    languageCode: "zh",
    authorSlug: "zhao-qi",
    description:
      "The Mencius with Zhao Qi's commentary and Sun Shi's sub-commentary, from the Thirteen Classics edition.",
    sourceUrl: "https://ctext.org/mengzi-zhushu",
    processedDir: "data/processed/mengzi-zhushu",
    compositionYear: 200,
    compositionEra: "Eastern Han / Northern Song (c. 200 CE / 1000 CE)",
  },
  {
    title: "Classic of Filial Piety with Commentary (Xiaojing Zhushu)",
    titleOriginalScript: "孝經註疏",
    slug: "xiaojing-zhushu",
    languageCode: "zh",
    authorSlug: "xing-bing",
    description:
      "The Classic of Filial Piety with Tang Xuanzong's commentary and Xing Bing's sub-commentary.",
    sourceUrl: "https://ctext.org/xiaojing-zhushu",
    processedDir: "data/processed/xiaojing-zhushu",
    compositionYear: 999,
    compositionEra: "Northern Song (999 CE)",
  },
  {
    title: "Erya Dictionary with Commentary (Erya Zhushu)",
    titleOriginalScript: "爾雅註疏",
    slug: "erya-zhushu",
    languageCode: "zh",
    authorSlug: "guo-pu",
    description:
      "China's oldest dictionary with Guo Pu's commentary and Xing Bing's sub-commentary, from the Thirteen Classics edition.",
    sourceUrl: "https://ctext.org/erya-zhushu",
    processedDir: "data/processed/erya-zhushu",
    compositionYear: 324,
    compositionEra: "Eastern Jin / Northern Song (324 CE / 999 CE)",
  },
  {
    title: "Zuo Commentary on Spring and Autumn with Commentary (Zuozhuan Zhengyi)",
    titleOriginalScript: "春秋左傳正義",
    slug: "zuozhuan-zhengyi",
    languageCode: "zh",
    authorSlug: "kong-yingda",
    description:
      "The Zuo Commentary on the Spring and Autumn Annals with Du Yu's commentary and Kong Yingda's sub-commentary. The most detailed narrative history of the Spring and Autumn period (722-468 BCE), with extensive scholarly annotations on political, military, and ritual events.",
    sourceUrl: "https://ctext.org/zuozhuan-zhengyi",
    processedDir: "data/processed/zuozhuan-zhengyi",
    compositionYear: 642,
    compositionEra: "Tang Dynasty (642 CE)",
  },
  {
    title: "Gongyang Commentary on Spring and Autumn with Commentary (Gongyang Zhushu)",
    titleOriginalScript: "春秋公羊傳註疏",
    slug: "gongyang-zhushu",
    languageCode: "zh",
    authorSlug: "he-xiu",
    description:
      "The Gongyang Commentary with He Xiu's explanatory commentary and Xu Yan's sub-commentary. Emphasizes the moral and political lessons encoded in Confucius's Spring and Autumn Annals through a question-and-answer format.",
    sourceUrl: "https://ctext.org/gongyang-zhushu",
    processedDir: "data/processed/gongyang-zhushu",
    compositionYear: 182,
    compositionEra: "Eastern Han / Tang (182 CE / c. 650 CE)",
  },
  {
    title: "Guliang Commentary on Spring and Autumn with Commentary (Guliang Zhushu)",
    titleOriginalScript: "春秋穀梁傳註疏",
    slug: "guliang-zhushu",
    languageCode: "zh",
    authorSlug: "fan-ning",
    description:
      "The Guliang Commentary with Fan Ning's commentary and Yang Shixun's sub-commentary. Focuses on ritual propriety and linguistic precision in interpreting the Spring and Autumn Annals.",
    sourceUrl: "https://ctext.org/guliang-zhushu",
    processedDir: "data/processed/guliang-zhushu",
    compositionYear: 401,
    compositionEra: "Eastern Jin / Tang (401 CE / c. 650 CE)",
  },
  {
    title: "Rites of Zhou with Commentary (Zhouli Zhushu)",
    titleOriginalScript: "周禮註疏",
    slug: "zhouli-zhushu",
    languageCode: "zh",
    authorSlug: "jia-gongyan",
    description:
      "The Rites of Zhou with Zheng Xuan's commentary and Jia Gongyan's sub-commentary. Describes the ideal administrative organization of the Zhou dynasty government with detailed annotations on ritual offices, duties, and protocols.",
    sourceUrl: "https://ctext.org/zhouli-zhushu",
    processedDir: "data/processed/zhouli-zhushu",
    compositionYear: 650,
    compositionEra: "Tang Dynasty (c. 650 CE)",
  },
  {
    title: "Ceremonial Rites with Commentary (Yili Zhushu)",
    titleOriginalScript: "儀禮註疏",
    slug: "yili-zhushu",
    languageCode: "zh",
    authorSlug: "jia-gongyan",
    description:
      "The Ceremonial Rites with Zheng Xuan's commentary and Jia Gongyan's sub-commentary. Detailed protocols for capping, marriage, archery, audience, and funeral rites with extensive textual analysis.",
    sourceUrl: "https://ctext.org/yili-zhushu",
    processedDir: "data/processed/yili-zhushu",
    compositionYear: 650,
    compositionEra: "Tang Dynasty (c. 650 CE)",
  },
  {
    title: "Book of Rites with Commentary (Liji Zhengyi)",
    titleOriginalScript: "禮記正義",
    slug: "liji-zhengyi",
    languageCode: "zh",
    authorSlug: "kong-yingda",
    description:
      "The Book of Rites with Kong Yingda's Orthodox Commentary. A comprehensive treatise on ritual, ethics, philosophy, and social organization with the most authoritative sub-commentary in the Confucian classical tradition.",
    sourceUrl: "https://ctext.org/liji-zhengyi",
    processedDir: "data/processed/liji-zhengyi",
    compositionYear: 642,
    compositionEra: "Tang Dynasty (642 CE)",
  },
  {
    title: "Book of Rites — Selected Chapters (Liji Zhushu)",
    titleOriginalScript: "禮記註疏",
    slug: "liji-zhushu",
    languageCode: "zh",
    authorSlug: "zheng-xuan-liji",
    description:
      "Selected chapters from the Book of Rites with Zheng Xuan's commentary. Includes the Great Learning (大學), Doctrine of the Mean (中庸), and other key treatises on ritual, ethics, and self-cultivation.",
    sourceUrl: "https://ctext.org/liji-zhushu",
    processedDir: "data/processed/liji-zhushu",
    compositionYear: 200,
    compositionEra: "Eastern Han (c. 200 CE)",
  },
  {
    title: "Book of Changes with Commentary (Zhouyi Zhengyi)",
    titleOriginalScript: "周易正義",
    slug: "zhouyi-zhengyi",
    languageCode: "zh",
    authorSlug: "kong-yingda",
    description:
      "The Book of Changes (Yi Jing) with Wang Bi's commentary and Kong Yingda's Orthodox Commentary (正義). Covers all 64 hexagrams and the Ten Wings appendices, with philosophical interpretations of divination, cosmology, and moral self-cultivation.",
    sourceUrl: "https://ctext.org/zhouyi-zhengyi",
    processedDir: "data/processed/zhouyi-zhengyi",
    compositionYear: 642,
    compositionEra: "Tang Dynasty (642 CE)",
  },
  {
    title: "Book of Documents with Commentary (Shangshu Zhengyi)",
    titleOriginalScript: "尚書正義",
    slug: "shangshu-zhengyi",
    languageCode: "zh",
    authorSlug: "kong-yingda",
    description:
      "The Book of Documents (Shang Shu) with Kong Anguo's commentary and Kong Yingda's Orthodox Commentary (正義). Contains speeches, proclamations, and historical records attributed to ancient Chinese rulers from Yao and Shun through the early Zhou dynasty.",
    sourceUrl: "https://ctext.org/shangshu-zhengyi",
    processedDir: "data/processed/shangshu-zhengyi",
    compositionYear: 642,
    compositionEra: "Tang Dynasty (642 CE)",
  },
  {
    title: "Diary of the City of Rome (Diarium Urbis Romae)",
    titleOriginalScript: "Diario della Città di Roma",
    slug: "diarium-urbis-romae",
    languageCode: "it",
    authorSlug: "stefano-infessura",
    description:
      "A Roman civic diary covering events from 1294 to 1494, written by the notary Stefano Infessura in a mixture of ancient Romanesco Italian and Latin. The text alternates between vernacular 15th-century Roman dialect and Latin passages (especially for ecclesiastical matters and formal statements). The chronicle records papal politics, conclaves, noble faction warfare (Colonna vs. Orsini), civic governance, and daily life in late medieval Rome.",
    sourceUrl: "https://archive.org/details/diariumurbisroma00infe",
    processedDir: "data/processed/diarium-urbis-romae",
    compositionYear: 1494,
    compositionEra: "15th century, Papal Rome",
  },
  {
    title: "Record of Daily Knowledge (Rizhilu)",
    titleOriginalScript: "日知錄",
    slug: "rizhilu",
    languageCode: "zh",
    authorSlug: "gu-yanwu",
    description:
      "A monumental work of Qing scholarship compiled over 30 years, covering philology, textual criticism, history, geography, government, and ethics. Gu Yanwu's rigorous evidential approach influenced generations of scholars and helped establish the methodology of kaozheng (evidential research) scholarship.",
    sourceUrl: "https://www.gutenberg.org/ebooks/25262",
    processedDir: "data/processed/rizhilu",
    compositionYear: 1670,
    compositionEra: "Early Qing Dynasty",
  },
  {
    title: "Romance of the Eastern Zhou (Dongzhou Lieguo Zhi)",
    titleOriginalScript: "東周列國志",
    slug: "dongzhou-lieguo-zhi",
    textType: "prose",
    genre: "literature",
    languageCode: "zh",
    authorSlug: "feng-menglong",
    description:
      "A historical novel dramatizing events from the Spring and Autumn period (770–476 BCE) through the Warring States period (475–221 BCE). Based on the Zuozhuan, Guoyu, and Shiji, this 108-chapter work brings to life the political intrigues, military campaigns, and heroic figures of ancient China's most turbulent era.",
    sourceUrl: "https://ctext.org/dongzhou-lieguo-zhi",
    processedDir: "data/processed/dongzhou-lieguo-zhi",
    compositionYear: 1632,
    compositionEra: "Late Ming Dynasty",
  },
  {
    title: "The Voyage of the Eunuch Sanbao to the Western Ocean (Sanbao Taijian Xiyang Ji)",
    titleOriginalScript: "三寶太監西洋記",
    slug: "sanbao-taijian-xiyang-ji",
    textType: "prose",
    genre: "literature",
    languageCode: "zh",
    authorSlug: "luo-maodeng",
    description:
      "A 100-chapter fantasy-adventure novel based on the historical voyages of the Ming dynasty eunuch admiral Zheng He (1371–1433). The novel blends historical elements with Buddhist and Daoist supernatural battles, featuring Immortal Master Jin Bifeng and Celestial Master Zhang as protectors of the fleet against demonic forces. One of the earliest Chinese novels to depict overseas travel and foreign lands.",
    sourceUrl: "https://ctext.org/sanbao-taijian-xiyang-ji",
    processedDir: "data/processed/sanbao-taijian-xiyang-ji",
    compositionYear: 1597,
    compositionEra: "Late Ming Dynasty",
  },
  {
    title: "Marriage Destinies to Awaken the World (Xingshi Yinyuan Zhuan)",
    titleOriginalScript: "醒世姻緣傳",
    slug: "xingshi-yinyuan-zhuan",
    textType: "prose",
    genre: "literature",
    languageCode: "zh",
    authorSlug: "xi-zhousheng",
    description:
      "A 100-chapter satirical novel exploring karmic retribution through two lifetimes of marriage. In the first life, the dissolute Chao Yuan kills a fox spirit and mistreats his wife, who dies tragically. In the second life, he is reborn as the hapless Di Xichen, tormented by his shrewish wife Xue Sujie—the fox spirit reincarnated for revenge. A mordant social comedy depicting Ming-Qing household life with unparalleled psychological realism.",
    sourceUrl: "https://ctext.org/xingshi-yinyuan-zhuan",
    processedDir: "data/processed/xingshi-yinyuan-zhuan",
    compositionYear: 1661,
    compositionEra: "Early Qing Dynasty",
  },
  {
    title: "The Spark (Kaytser)",
    titleOriginalScript: "Կայցեր",
    slug: "kaitser",
    languageCode: "hy",
    authorSlug: "raffi",
    description:
      "An autobiographical novel depicting childhood memories under Persian rule in Eastern Armenia. Kaytser (The Spark) is a foundational work of modern Armenian literature, offering vivid portraits of village life, family, and the oppression of Armenian peasants by tax collectors, feudal lords, and foreign rulers.",
    sourceUrl: "",
    processedDir: "data/processed/kaitser",
    compositionYear: 1883,
    compositionEra: "Late 19th century, Russian Armenia",
  },
  {
    title: "Samvel",
    titleOriginalScript: "Սամվել",
    slug: "samvel",
    languageCode: "hy",
    authorSlug: "raffi",
    description:
      "A historical novel set in 4th-century Armenia during the struggle against Persian domination. Samvel depicts the conflict between Christianity and Zoroastrianism, the tensions between Armenian princes and the Sasanian Empire, and the heroic resistance of Armenians under figures like Nerses the Great and the Mamikonian family. One of Raffi's masterpieces, it shaped Armenian national consciousness and remains a classic of Armenian literature.",
    sourceUrl: "",
    processedDir: "data/processed/samvel",
    compositionYear: 1886,
    compositionEra: "Late 19th century, Russian Armenia",
  },
  {
    title: "Anna Saroyan (Աննա Սարոյան)",
    titleOriginalScript: "Աննա Սարոյան",
    slug: "anna-saroyan",
    languageCode: "hy",
    authorSlug: "perch-proshyan",
    description:
      "An epistolary novel in 23 letters written from Tiflis (Tbilisi) between September 1880 and October 1881. Anna Saroyan chronicles a young Armenian woman's descent from comfortable bourgeois life into poverty following her father's gambling debts, paralysis, and madness. The letters reveal her psychological transformation, the death of her beloved brother, and her growing despair culminating in suicide.",
    sourceUrl: "",
    processedDir: "data/processed/anna-saroyan",
    compositionYear: 1881,
    compositionEra: "Late 19th century, Tiflis (Tbilisi)",
  },
  {
    title: "Adana's Wounds and Orphans",
    titleOriginalScript: "Ադանայի Վերքերն ու Որբերը",
    slug: "arshagouhi-teotig",
    languageCode: "hy",
    authorSlug: "arshagouhi-teotig",
    description:
      "An eyewitness memoir documenting the author's journey through Cilicia (October 1909 – January 1910) in the aftermath of the April 1909 Adana massacre. Arshagouhi traveled from Istanbul to Mersin, Adana, Misis, Hamidie, Erzin, Dörtyol, and Tarsus, recording the devastation, meeting survivors, widows, and orphans, and helping to organize relief efforts. A primary historical source for the massacres that killed over 20,000 Armenians.",
    sourceUrl: "",
    processedDir: "data/processed/arshagouhi-teotig",
    compositionYear: 1910,
    compositionEra: "Early 20th century, Ottoman Empire",
  },
  {
    title: "Land of Nairi (Yerkir Nairi)",
    titleOriginalScript: "Երկիր Նաիրի",
    slug: "yerkir-nairi",
    languageCode: "hy",
    authorSlug: "yeghishe-charents",
    description:
      "A lyrical prose poem and modernist masterpiece of Armenian literature. Written in Moscow in 1921, 'Yerkir Nairi' (Land of Nairi) is structured in three parts with a preface and epilogue. The work meditates on Armenian identity and the mythical 'Land of Nairi' (an ancient name for the Armenian highlands) through vivid portraits of provincial town life, its characters, and their struggles. The narrator seeks to discover whether Nairi is real or merely 'a cerebral ache, a sickness of the heart.'",
    sourceUrl: "",
    processedDir: "data/processed/yerkir-nairi",
    compositionYear: 1922,
    compositionEra: "Early Soviet period, Moscow",
  },
  {
    title: "The Mysterious Solitary Woman (Khorhrdavor Miandznuhi)",
    titleOriginalScript: "Խորհրդավոր Միանձնուհի",
    slug: "khorhrdavor-miandznuhi",
    languageCode: "hy",
    authorSlug: "perch-proshyan",
    description:
      "A first-person diary/memoir set in 1884-1887 in the mountains of Syunik, Armenia. The narrator, a man recovering from illness, travels to a remote village and encounters 'Sister Anna' — a remarkable woman who has devoted herself to education, social reform, and village improvement. Through her anonymous work running schools, training teachers, and reforming harmful customs, she embodies the ideal of selfless service to the common good.",
    sourceUrl: "",
    processedDir: "data/processed/khorhrdavor-miandznuhi",
    compositionYear: 1884,
    compositionEra: "Late 19th century, Russian Armenia",
  },
  {
    title: "The Youth of Julius Caesar (La Giovinezza di Giulio Cesare)",
    titleOriginalScript: "La giovinezza di Giulio Cesare",
    slug: "la-giovinezza-di-giulio-cesare",
    textType: "prose",
    genre: "literature",
    languageCode: "it",
    authorSlug: "giuseppe-rovani",
    description:
      "A historical novel depicting the youth of Julius Caesar, from age 18 (82 BCE) through his first consulship (59 BCE). Subtitled 'Scene Romane' (Roman Scenes), the work covers Caesar's relationships with Sallust, Catiline, Crassus, Pompey, and Cicero, as well as his romantic entanglements and the Catilinarian conspiracy.",
    sourceUrl: "https://www.gutenberg.org/ebooks/75196",
    processedDir: "data/processed/la-giovinezza",
    compositionYear: 1873,
    compositionEra: "Late 19th century, Milan",
  },
  {
    title: "A Hundred Years (Cento Anni)",
    titleOriginalScript: "Cent'anni",
    slug: "cento-anni",
    textType: "prose",
    genre: "literature",
    languageCode: "it",
    authorSlug: "giuseppe-rovani",
    description:
      "A sprawling historical novel spanning 100 years of Italian history from 1750 to 1850. Centered on Milan, it follows multiple generations through the Enlightenment, French Revolution, Napoleonic era, and early Risorgimento. The novel uses families rather than individuals as protagonists, allowing narrative scope across a full century.",
    sourceUrl: "https://www.liberliber.it/mediateca/libri/r/rovani/",
    processedDir: "data/processed/cento-anni",
    compositionYear: 1858,
    compositionEra: "Mid 19th century, Milan",
  },
  {
    title: "Biographies of One Hundred Generals (Shiqi Shi Baijiang Zhuan)",
    titleOriginalScript: "十七史百將傳",
    slug: "shiqi-shi-baijiang-zhuan",
    textType: "prose",
    genre: "history",
    languageCode: "zh",
    authorSlug: "zhang-yu",
    description:
      "Biographies of one hundred eminent generals from Chinese history, drawn from the seventeen standard histories. Each biography is followed by commentary citing Sun Tzu's Art of War, connecting the general's tactics to classical military theory. The work spans from the Zhou dynasty to the Five Dynasties period.",
    sourceUrl: "https://zh.wikisource.org/wiki/十七史百將傳",
    processedDir: "data/processed/shiqi-shi-baijiang-zhuan",
    compositionYear: 1072,
    compositionEra: "熙寧五年, Northern Song",
  },
  {
    title: "Epitome of Histories (Epitome Historiarum)",
    titleOriginalScript: "Ἐπιτομὴ ἱστοριῶν",
    slug: "epitome-historiarum",
    textType: "prose" as const,
    genre: "history",
    languageCode: "grc",
    authorSlug: "john-zonaras",
    description:
      "A Byzantine world chronicle by John Zonaras covering biblical and ancient history through the Byzantine period (18 books). Particularly valuable for preserving passages from lost portions of Cassius Dio's Roman History.",
    sourceUrl: "https://archive.org/details/bub_gb_OFpFAAAAYAAJ",
    processedDir: "data/processed/epitome-of-histories-final",
    compositionYear: 1150,
    compositionEra: "Mid-12th century, Byzantine Empire",
  },
  {
    title: "The Syair of Siti Zubaidah (Syair Siti Zubaidah)",
    titleOriginalScript: null,
    slug: "syair-siti-zubaidah",
    textType: "poetry" as const,
    languageCode: "ms",
    authorSlug: "anonymous-malay",
    description:
      "A classical Malay narrative poem in syair form (quatrains with AAAA rhyme scheme) recounting the adventures of Sultan Abidin and Siti Zubaidah. Preserved in manuscript tradition from the Sambas region of West Kalimantan, the poem reflects Malay court culture with its blend of Islamic and Southeast Asian literary conventions.",
    sourceUrl: "",
    processedDir: "data/processed/syair-siti-zubaidah",
    compositionYear: 1800,
    compositionEra: "Traditional Malay period (date uncertain, c. 18th\u201319th century)",
  },
  {
    title: "Records of Resting from the Plough (Nancun Chuogeng Lu)",
    titleOriginalScript: "\u5357\u6751\u8F1C\u8015\u9304",
    slug: "nancun-chuogeng-lu",
    textType: "prose" as const,
    genre: "history",
    languageCode: "zh",
    authorSlug: "tao-zongyi",
    description:
      "A Yuan-dynasty biji miscellany in 30 volumes covering court affairs, ethnic classifications, arts, calligraphy, literature, customs, and institutional practices of the Mongol Yuan empire. One of the most important primary sources for Yuan-dynasty social and cultural history.",
    sourceUrl: "https://ctext.org/nancun-chuogeng-lu",
    processedDir: "data/processed/nancun-chuogeng-lu",
    compositionYear: 1366,
    compositionEra: "Late Yuan Dynasty",
  },
  {
    title: "Suguna Sundari (\u0B9A\u0BC1\u0B95\u0BC1\u0BA3 \u0B9A\u0BC1\u0BA8\u0BCD\u0BA4\u0BB0\u0BBF)",
    titleOriginalScript: "\u0B9A\u0BC1\u0B95\u0BC1\u0BA3\u0B9A\u0BC1\u0BA8\u0BCD\u0BA4\u0BB0\u0BBF \u0B9A\u0BB0\u0BBF\u0BA4\u0BCD\u0BA4\u0BBF\u0BB0\u0BAE\u0BCD",
    slug: "suguna-sundari",
    textType: "prose" as const,
    genre: "literature",
    languageCode: "ta",
    authorSlug: "vedanayakam-pillai",
    description:
      "One of the earliest Tamil novels (1887), by Mayuram Vedanayakam Pillai. A morality tale about a virtuous princess, incorporating social commentary against child marriage, moral philosophy, hygiene advice, and Tamil proverbs including Thirukkural quotes.",
    sourceUrl: "",
    processedDir: "data/processed/suguna-sundari",
    compositionYear: 1887,
    compositionEra: "19th century (1887)",
  },
  {
    title: "Noteworthy Opinions (Semeioseis Gnomikai)",
    titleOriginalScript: "Σημειώσεις Γνωμικαί",
    slug: "semeioseis-gnomikai",
    textType: "prose" as const,
    genre: "philosophy",
    languageCode: "grc",
    authorSlug: "theodore-metochites",
    description:
      "A vast collection of 120 essays by the Byzantine polymath Theodore Metochites, covering history, philosophy, literature, rhetoric, astronomy, and political thought. Written in an elaborate Atticizing Greek style, the work reflects on the rise and fall of civilizations, the nature of government, and the value of learning. Essays 1–81 have been translated in critical editions, and the remaining untranslated essays are available here on Deltoi.",
    sourceUrl: "https://archive.org/details/miscellaneasemes00metouoft",
    processedDir: "data/processed/semeioseis-gnomikai",
    compositionYear: 1320,
    compositionEra: "Late Byzantine Empire (c. 1305–1325)",
  },
  {
    title: "La Scapigliatura e il 6 Febbraio",
    titleOriginalScript: null,
    slug: "scapigliatura-e-il-6-febbraio",
    textType: "prose" as const,
    genre: "literature",
    languageCode: "it",
    authorSlug: "cletto-arrighi",
    description:
      "A novel set in Milan during the turbulent years following the failed Italian independence uprisings of 1848–49. The story follows a group of young bohemians — the 'Scapigliatura' — through love, betrayal, and political upheaval, culminating in the insurrection of 6 February 1853. The novel coined the term 'Scapigliatura' for the Italian literary movement of anti-bourgeois artists and writers.",
    sourceUrl: "https://archive.org/details/arrighiscapigliatura",
    processedDir: "data/processed/scapigliatura-e-il-6-febbraio",
    compositionYear: 1862,
    compositionEra: "19th century (1862)",
  },
  {
    title: "A Precious Mirror of Ranked Flowers (Pinhua Baojian)",
    titleOriginalScript: "品花寶鑑",
    slug: "pinhua-baojian",
    textType: "prose" as const,
    genre: "literature",
    languageCode: "zh",
    authorSlug: "chen-sen",
    description:
      "A novel of manners set in the theatre world of early 19th-century Beijing. The story follows a group of literati and the dan (female-role) performers of the Peking opera stage, exploring themes of love, aesthetics, loyalty, and morality. The novel provides a vivid portrait of elite social life, theatrical culture, and the complex relationships between patrons and performers in the late Qing dynasty.",
    sourceUrl: "https://ctext.org/pinhua-baojian",
    processedDir: "data/processed/pinhua-baojian",
    compositionYear: 1849,
    compositionEra: "Late Qing Dynasty (c. 1849)",
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
          ...("genre" in text && { genre: text.genre }),
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
