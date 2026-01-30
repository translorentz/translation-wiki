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
  {
    name: "Stefanos Sachlikis",
    nameOriginalScript: "Στέφανος Σαχλήκης",
    slug: "sachlikis",
    era: "14th century Crete",
    description:
      "Cretan Greek poet known for his autobiographical verse about his dissolute youth and imprisonment. His works provide valuable insight into medieval Cretan society.",
  },
  {
    name: "Emmanuel Georgillas",
    nameOriginalScript: "Ἐμμανουὴλ Γεωργιλλᾶς",
    slug: "georgillas",
    era: "15th century Rhodes",
    description:
      "Rhodian Greek poet who chronicled historical events including the plague of Rhodes and the story of Belisarius in vernacular verse.",
  },
  {
    name: "Ioannis Pikatorios",
    nameOriginalScript: "Ἰωάννης Πικατόρος",
    slug: "pikatorios",
    era: "15th century Crete",
    description:
      "Cretan Greek poet known for his Lament on Hades, a vernacular Greek poem about death and the underworld.",
  },
  {
    name: "Manolis Sklabos",
    nameOriginalScript: "Μανολῆς Σκλάβος",
    slug: "sklabos",
    era: "15th century Crete",
    description:
      "Cretan Greek poet who composed a lament on the misfortunes of Crete under Venetian rule.",
  },
  {
    name: "Anonymous Byzantine Poets",
    nameOriginalScript: null,
    slug: "anonymous-byzantine",
    era: "12th–15th century Byzantine Empire",
    description:
      "Anonymous authors of medieval Greek vernacular poetry. These works circulated without attribution in the late Byzantine period.",
  },
  // Chinese Pipeline Authors (43 new)
  {
    name: "Wei Xiuren",
    nameOriginalScript: "魏秀仁",
    slug: "wei-xiuren",
    era: "Late Qing (c. 1858)",
    description:
      "Late Qing novelist known for Huayue Hen, a scholar-and-beauty romance interweaving love with the Taiping Rebellion.",
  },
  {
    name: "Chu Renhuo",
    nameOriginalScript: "褚人獲",
    slug: "chu-renhuo",
    era: "Early Qing (c. 1695)",
    description:
      "Early Qing novelist who compiled the Romance of the Sui and Tang Dynasties from earlier historical fiction.",
  },
  {
    name: "Zhang Dai",
    nameOriginalScript: "張岱",
    slug: "zhang-dai",
    era: "Ming-Qing transition (1597-1689)",
    description:
      "One of the finest prose stylists of late imperial China, known for his nostalgic essays on the vanished world of the late Ming.",
  },
  {
    name: "Li Yu",
    nameOriginalScript: "李漁",
    slug: "li-yu",
    era: "Early Qing (1611-1680)",
    description:
      "Polymath dramatist, fiction writer, and aesthete who wrote on drama, music, gardening, food, and daily life.",
  },
  {
    name: "Youzhi Daoren",
    nameOriginalScript: "游戲道人",
    slug: "youzhi-daoren",
    era: "Qing (1787)",
    description:
      "Pseudonymous compiler of the Expanded Records of the Forest of Laughter, China's most famous joke collection.",
  },
  {
    name: "Yuan Mei",
    nameOriginalScript: "袁枚",
    slug: "yuan-mei",
    era: "Qing (1716-1798)",
    description:
      "Leading Qing poet and literary critic who championed naturalness and feeling in poetry.",
  },
  {
    name: "Zhong Rong",
    nameOriginalScript: "鍾嶸",
    slug: "zhong-rong",
    era: "Southern Liang (c. 468-518 CE)",
    description:
      "Southern Dynasties literary critic who wrote the earliest systematic ranking of Chinese poets.",
  },
  {
    name: "Wang Fu",
    nameOriginalScript: "王符",
    slug: "wang-fu",
    era: "Eastern Han (c. 90-165 CE)",
    description:
      "Eastern Han social critic who wrote trenchant essays on governance, corruption, and moral decay from outside the establishment.",
  },
  {
    name: "Hong Mai",
    nameOriginalScript: "洪邁",
    slug: "hong-mai",
    era: "Southern Song (1123-1202)",
    description:
      "Prolific Southern Song scholar and official who compiled one of China's most erudite biji collections.",
  },
  {
    name: "Wang Yinglin",
    nameOriginalScript: "王應麟",
    slug: "wang-yinglin",
    era: "Late Song (1223-1296)",
    description:
      "Song dynasty scholar known for meticulous evidential scholarship across the classics, histories, and philosophy.",
  },
  {
    name: "Duan Chengshi",
    nameOriginalScript: "段成式",
    slug: "duan-chengshi",
    era: "Tang (c. 803-863 CE)",
    description:
      "Tang dynasty polymath whose eclectic biji collection covered natural history, folklore, foreign lands, and supernatural tales.",
  },
  {
    name: "Lu You",
    nameOriginalScript: "陸游",
    slug: "lu-you",
    era: "Southern Song (1125-1210)",
    description:
      "One of the greatest Song poets, also known for his prose notes on politics, literature, and the Jurchen wars.",
  },
  {
    name: "Meng Yuanlao",
    nameOriginalScript: "孟元老",
    slug: "meng-yuanlao",
    era: "Southern Song (12th century)",
    description:
      "Southern Song memoirist who recorded the urban life of Northern Song Kaifeng before its fall to the Jurchens.",
  },
  {
    name: "Wang Shizhen",
    nameOriginalScript: "王士禛",
    slug: "wang-shizhen-qing",
    era: "Early Qing (1634-1711)",
    description:
      "Leading poet-critic of the early Qing, known for his theory of 'spiritual resonance' (shengyun) in poetry.",
  },
  {
    name: "Li Daoyuan",
    nameOriginalScript: "酈道元",
    slug: "li-daoyuan",
    era: "Northern Wei (c. 472-527 CE)",
    description:
      "Northern Wei geographer who transformed a terse river catalog into the greatest geographical text of pre-modern China.",
  },
  {
    name: "Jia Sixie",
    nameOriginalScript: "賈思勰",
    slug: "jia-sixie",
    era: "Northern Wei (6th century CE)",
    description:
      "Northern Wei agricultural scholar who compiled the oldest and most comprehensive surviving Chinese agricultural manual.",
  },
  {
    name: "Li Zhi",
    nameOriginalScript: "李贄",
    slug: "li-zhi",
    era: "Late Ming (1527-1602)",
    description:
      "Iconoclastic late Ming thinker who attacked Confucian hypocrisy and championed individual moral autonomy.",
  },
  {
    name: "Huang Zongxi",
    nameOriginalScript: "黃宗羲",
    slug: "huang-zongxi",
    era: "Early Qing (1610–1695)",
    description:
      "Leading philosopher and political thinker of the Ming-Qing transition. Author of the first systematic history of Chinese philosophy.",
  },
  {
    name: "Ji Yun",
    nameOriginalScript: "紀昀",
    slug: "ji-yun",
    era: "Qing (1724–1805)",
    description:
      "Chief editor of the Siku Quanshu and powerful literary official. Wrote supernatural tales in a deliberately terse classical style.",
  },
  {
    name: "Li Baichuan",
    nameOriginalScript: "李百川",
    slug: "li-baichuan",
    era: "Qing (c. 18th century)",
    description:
      "Author of one of the great mid-Qing novels blending Daoist cultivation with political intrigue.",
  },
  {
    name: "Xia Jingqu",
    nameOriginalScript: "夏敬渠",
    slug: "xia-jingqu",
    era: "Qing (1705–1787)",
    description:
      "Author of the longest pre-modern Chinese novel at 154 chapters.",
  },
  {
    name: "Li Lüyuan",
    nameOriginalScript: "李綠園",
    slug: "li-luyuan",
    era: "Qing (1707–1790)",
    description:
      "Author of a major Qing educational novel rediscovered only in the 20th century.",
  },
  {
    name: "Yu Wanchun",
    nameOriginalScript: "俞萬春",
    slug: "yu-wanchun",
    era: "Qing (1794–1849)",
    description:
      "Author of the anti-Water Margin sequel praised by Lu Xun for its literary quality.",
  },
  {
    name: "Shi Yukun",
    nameOriginalScript: "石玉崑",
    slug: "shi-yukun",
    era: "Qing (c. 19th century)",
    description:
      "Storyteller whose oral performances became the foundational Chinese martial-arts and detective novel.",
  },
  {
    name: "Zeng Pu",
    nameOriginalScript: "曾樸",
    slug: "zeng-pu",
    era: "Late Qing (1872–1935)",
    description:
      "Author of one of the four great novels of the late Qing, a roman à clef of diplomacy and scandal.",
  },
  {
    name: "Wu Xuan",
    nameOriginalScript: "吳璚",
    slug: "wu-xuan",
    era: "Qing (c. early 18th century)",
    description:
      "Author of a historical novel about the founding of the Song dynasty.",
  },
  {
    name: "Lü Xiong",
    nameOriginalScript: "呂熊",
    slug: "lu-xiong",
    era: "Qing (c. early 18th century)",
    description:
      "Author of a fantastical novel blending historical events with Daoist supernatural elements.",
  },
  {
    name: "Zhang Chao",
    nameOriginalScript: "張潮",
    slug: "zhang-chao",
    era: "Qing (1650–1707?)",
    description:
      "Literary arbiter and anthologist of the finest late Ming and early Qing tales.",
  },
  {
    name: "Zhang Nanzhuang",
    nameOriginalScript: "張南莊",
    slug: "zhang-nanzhuang",
    era: "Qing (c. late 18th century)",
    description:
      "Author of the first novel written in Wu dialect, championed by Lu Xun.",
  },
  {
    name: "Wu Zimu",
    nameOriginalScript: "吳自牧",
    slug: "wu-zimu",
    era: "Song (c. 13th century)",
    description:
      "Author of a detailed record of life in Southern Song Hangzhou.",
  },
  {
    name: "Zhou Mi",
    nameOriginalScript: "周密",
    slug: "zhou-mi",
    era: "Song-Yuan (1232–1298)",
    description:
      "Leading literatus of the Song-Yuan transition. Prolific writer of biji recording the vanished world of Southern Song Hangzhou.",
  },
  {
    name: "Luo Dajing",
    nameOriginalScript: "羅大經",
    slug: "luo-dajing",
    era: "Song (c. 13th century)",
    description:
      "Song dynasty biji writer covering poetry criticism, history, and philosophy.",
  },
  {
    name: "Sima Guang",
    nameOriginalScript: "司馬光",
    slug: "sima-guang",
    era: "Northern Song (1019-1086)",
    description:
      "Great historian and statesman of the Northern Song, author of the Zizhi Tongjian.",
  },
  {
    name: "Wang Dingbao",
    nameOriginalScript: "王定保",
    slug: "wang-dingbao",
    era: "Five Dynasties (c. 870-940)",
    description:
      "Five Dynasties scholar who compiled the most important source on Tang dynasty examination culture.",
  },
  {
    name: "Sun Guangxian",
    nameOriginalScript: "孫光憲",
    slug: "sun-guangxian",
    era: "Five Dynasties (c. 900-968)",
    description:
      "Five Dynasties official and prolific biji writer covering late Tang and Five Dynasties anecdotes.",
  },
  {
    name: "Liu Xin / Ge Hong (attr.)",
    nameOriginalScript: "劉歆 / 葛洪",
    slug: "liu-xin-ge-hong",
    era: "Han-Jin (uncertain)",
    description:
      "Authorship disputed between Han dynasty Liu Xin and Jin dynasty Ge Hong.",
  },
  {
    name: "Xuan Ding",
    nameOriginalScript: "宣鼎",
    slug: "xuan-ding",
    era: "Late Qing (1832-1880)",
    description:
      "Late Qing writer of classical tales in the Liaozhai tradition.",
  },
  {
    name: "Xie Zhaozhe",
    nameOriginalScript: "謝肇淛",
    slug: "xie-zhaozhe",
    era: "Ming (1567-1624)",
    description:
      "Ming encyclopedist and official, author of the monumental Wuzazu.",
  },
  {
    name: "Wang Jia",
    nameOriginalScript: "王嘉",
    slug: "wang-jia",
    era: "Jin (c. 350-390)",
    description:
      "Jin dynasty Daoist scholar and collector of myths and supernatural tales.",
  },
  {
    name: "Zhao Yi",
    nameOriginalScript: "趙翼",
    slug: "zhao-yi",
    era: "Qing (1727-1814)",
    description:
      "Leading Qing historian and poet, one of the three great historians of the Qian-Jia era.",
  },
  {
    name: "Xin Wenfang",
    nameOriginalScript: "辛文房",
    slug: "xin-wenfang",
    era: "Yuan (fl. 1304)",
    description:
      "Yuan dynasty literary biographer who compiled the standard reference on Tang poets.",
  },
  {
    name: "Tang Yunzhou",
    nameOriginalScript: "唐芸洲",
    slug: "tang-yunzhou",
    era: "Late Qing (fl. 1890s)",
    description:
      "Late Qing martial arts novelist.",
  },
  {
    name: "Zhaolian",
    nameOriginalScript: "昭槤",
    slug: "zhaolian",
    era: "Qing (1776-1833)",
    description:
      "Qing imperial prince (Aisin Gioro clan) who wrote insider accounts of court life and Manchu customs.",
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
  {
    title: "Admonitory Poem of Alexios Komnenos (Poiema Parainetikon)",
    titleOriginalScript: "Ἀλεξίου Κομνηνοῦ ποίημα παραινετικόν",
    slug: "carmina-alexios-komnenos",
    languageCode: "grc",
    genre: "literature",
    textType: "poetry" as const,
    authorSlug: "anonymous-byzantine",
    description:
      "A didactic poem of fatherly advice attributed to Alexios Komnenos, offering moral and practical counsel in political-verse couplets.",
    sourceUrl: "https://archive.org/details/carminagraecame00wagngoog",
    processedDir: "data/processed/carmina-alexios-komnenos",
    compositionYear: 1150,
    compositionEra: "12th century, Byzantine Empire",
  },
  {
    title: "Lament about Tamerlane (Threnos peri Tamyrlankou)",
    titleOriginalScript: "Θρῆνος περὶ Ταμυρλάγγου",
    slug: "carmina-tamerlane-lament",
    languageCode: "grc",
    genre: "literature",
    textType: "poetry" as const,
    authorSlug: "anonymous-byzantine",
    description:
      "A short vernacular Greek lament on the devastation caused by Tamerlane's campaigns.",
    sourceUrl: "https://archive.org/details/carminagraecame00wagngoog",
    processedDir: "data/processed/carmina-tamerlane-lament",
    compositionYear: 1410,
    compositionEra: "Early 15th century",
  },
  {
    title: "Plague of Rhodes (Thanatikon tes Rhodou)",
    titleOriginalScript: "Θανατικὸν τῆς Ρόδου",
    slug: "carmina-plague-of-rhodes",
    languageCode: "grc",
    genre: "literature",
    textType: "poetry" as const,
    authorSlug: "georgillas",
    description:
      "Emmanuel Georgillas' verse chronicle of a devastating plague that struck the island of Rhodes.",
    sourceUrl: "https://archive.org/details/carminagraecame00wagngoog",
    processedDir: "data/processed/carmina-plague-of-rhodes",
    compositionYear: 1500,
    compositionEra: "Late 15th century, Rhodes",
  },
  {
    title: "Misfortune of Crete (He Symphora tes Kretes)",
    titleOriginalScript: "Ἡ Συμφορὰ τῆς Κρήτης",
    slug: "carmina-misfortune-of-crete",
    languageCode: "grc",
    genre: "literature",
    textType: "poetry" as const,
    authorSlug: "sklabos",
    description:
      "Manolis Sklabos' lament on the sufferings of Crete, a vernacular Greek poem about hardship under foreign rule.",
    sourceUrl: "https://archive.org/details/carminagraecame00wagngoog",
    processedDir: "data/processed/carmina-misfortune-of-crete",
    compositionYear: 1460,
    compositionEra: "Mid-15th century, Venetian Crete",
  },
  {
    title: "Writings of Sachlikis (Graphai kai stichoi Sachleke)",
    titleOriginalScript: "Γραφαὶ καὶ στίχοι Στεφάνου τοῦ Σαχλήκη",
    slug: "carmina-sachlikis",
    languageCode: "grc",
    genre: "literature",
    textType: "poetry" as const,
    authorSlug: "sachlikis",
    description:
      "Two collections of autobiographical and moralizing verse by Stefanos Sachlikis, offering vivid accounts of Cretan urban life, imprisonment, and social commentary.",
    sourceUrl: "https://archive.org/details/carminagraecame00wagngoog",
    processedDir: "data/processed/carmina-sachlikis",
    compositionYear: 1380,
    compositionEra: "Late 14th century, Venetian Crete",
  },
  {
    title: "About an Old Man Not Marrying a Girl (Peri gerontos)",
    titleOriginalScript: "Περὶ γέροντος νὰ μὴν πάρῃ κορίτσι",
    slug: "carmina-old-man-and-girl",
    languageCode: "grc",
    genre: "literature",
    textType: "poetry" as const,
    authorSlug: "anonymous-byzantine",
    description:
      "A satirical vernacular Greek poem advising old men against marrying young women.",
    sourceUrl: "https://archive.org/details/carminagraecame00wagngoog",
    processedDir: "data/processed/carmina-old-man-and-girl",
    compositionYear: 1350,
    compositionEra: "14th century",
  },
  {
    title: "Beast Fables (Diegeseis Zoon)",
    titleOriginalScript: "Διηγήσεις Ζώων",
    slug: "carmina-beast-fables",
    languageCode: "grc",
    genre: "literature",
    textType: "poetry" as const,
    authorSlug: "anonymous-byzantine",
    description:
      "Five medieval Greek beast fables: the Synaxarion of the Honored Donkey, Tale of Donkey Wolf and Fox, Childish Tale of Four-legged Animals, Poulologos (Tale of the Birds), and Tale of the Tricologos.",
    sourceUrl: "https://archive.org/details/carminagraecame00wagngoog",
    processedDir: "data/processed/carmina-beast-fables",
    compositionYear: 1350,
    compositionEra: "14th–15th century, Byzantine Empire",
  },
  {
    title: "On Living Abroad (Peri tes xeniteias)",
    titleOriginalScript: "Περὶ τῆς ξενιτείας",
    slug: "carmina-on-living-abroad",
    languageCode: "grc",
    genre: "literature",
    textType: "poetry" as const,
    authorSlug: "anonymous-byzantine",
    description:
      "A vernacular Greek poem on the sorrows of living in exile far from one's homeland.",
    sourceUrl: "https://archive.org/details/carminagraecame00wagngoog",
    processedDir: "data/processed/carmina-on-living-abroad",
    compositionYear: 1400,
    compositionEra: "15th century",
  },
  {
    title: "To Venice (Eis Venetian)",
    titleOriginalScript: "Εἰς Βενετίαν",
    slug: "carmina-to-venice",
    languageCode: "grc",
    genre: "literature",
    textType: "poetry" as const,
    authorSlug: "anonymous-byzantine",
    description:
      "A short vernacular Greek poem addressed to the city of Venice.",
    sourceUrl: "https://archive.org/details/carminagraecame00wagngoog",
    processedDir: "data/processed/carmina-to-venice",
    compositionYear: 1400,
    compositionEra: "15th century",
  },
  {
    title: "Pikatorios' Lament on Hades (Rima threnetike)",
    titleOriginalScript: "Ῥίμα θρηνητικὴ εἰς τὸν πικρὸν καὶ ἀκόρεστον Ἅδην",
    slug: "carmina-pikatorios-lament",
    languageCode: "grc",
    genre: "literature",
    textType: "poetry" as const,
    authorSlug: "pikatorios",
    description:
      "Ioannis Pikatorios' lament on insatiable Hades, a vernacular Greek meditation on death and the underworld.",
    sourceUrl: "https://archive.org/details/carminagraecame00wagngoog",
    processedDir: "data/processed/carmina-pikatorios-lament",
    compositionYear: 1460,
    compositionEra: "Mid-15th century, Venetian Crete",
  },
  {
    title: "Penitential Alphabet (Alphabetos katanyktikos)",
    titleOriginalScript: "Ἀλφάβητος κατανυκτικὸς καὶ ψυχωφελής",
    slug: "carmina-penitential-alphabet",
    languageCode: "grc",
    genre: "literature",
    textType: "poetry" as const,
    authorSlug: "anonymous-byzantine",
    description:
      "An acrostic penitential poem following the Greek alphabet, meditating on the vanity of the world.",
    sourceUrl: "https://archive.org/details/carminagraecame00wagngoog",
    processedDir: "data/processed/carmina-penitential-alphabet",
    compositionYear: 1300,
    compositionEra: "13th–14th century",
  },
  {
    title: "Tale of Apollonius of Tyre (Diegesis Apolloniou)",
    titleOriginalScript: "Διήγησις πολυπαθοῦς Ἀπολλωνίου τοῦ Τύρου",
    slug: "carmina-apollonius-of-tyre",
    languageCode: "grc",
    genre: "literature",
    textType: "poetry" as const,
    authorSlug: "anonymous-byzantine",
    description:
      "A medieval Greek verse romance retelling the ancient tale of Apollonius of Tyre, a story of shipwreck, separation, and reunion.",
    sourceUrl: "https://archive.org/details/carminagraecame00wagngoog",
    processedDir: "data/processed/carmina-apollonius-of-tyre",
    compositionYear: 1400,
    compositionEra: "14th–15th century",
  },
  {
    title: "Life of a Wise Elder (Bios sophotatou gerontos)",
    titleOriginalScript: "Βίος καὶ πολιτεία τινὸς δοκιμωτάτου καὶ σοφωτάτου γέροντος",
    slug: "carmina-life-of-wise-elder",
    languageCode: "grc",
    genre: "literature",
    textType: "poetry" as const,
    authorSlug: "anonymous-byzantine",
    description:
      "A vernacular Greek verse narrative about the life and wisdom of a revered elder.",
    sourceUrl: "https://archive.org/details/carminagraecame00wagngoog",
    processedDir: "data/processed/carmina-life-of-wise-elder",
    compositionYear: 1350,
    compositionEra: "14th century",
  },
  {
    title: "Belisarius Poems (Poemata peri Belisariou)",
    titleOriginalScript: "Ποιήματα περὶ Βελισαρίου",
    slug: "carmina-belisarius",
    languageCode: "grc",
    genre: "literature",
    textType: "poetry" as const,
    authorSlug: "anonymous-byzantine",
    description:
      "Three medieval Greek poems about the legendary Byzantine general Belisarius: an anonymous tale, Georgillas' historical account, and an anonymous rhymed narrative.",
    sourceUrl: "https://archive.org/details/carminagraecame00wagngoog",
    processedDir: "data/processed/carmina-belisarius",
    compositionYear: 1450,
    compositionEra: "14th–15th century, Byzantine Empire",
  },
  // Chinese Pipeline Texts (44 new)
  {
    title: "Traces of Flowers and the Moon (Huayue Hen)",
    titleOriginalScript: "花月痕",
    slug: "huayue-hen",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "wei-xiuren",
    description:
      "A major scholar-and-beauty romance of the late Qing, interweaving love stories with the Taiping Rebellion. Known for its lyrical poetry and depiction of courtesans and failed scholars.",
    sourceUrl: "https://zh.wikisource.org/wiki/花月痕",
    processedDir: "data/processed/huayue-hen",
    compositionYear: 1858,
    compositionEra: "Late Qing",
  },
  {
    title: "Romance of the Sui and Tang Dynasties (Sui Tang Yanyi)",
    titleOriginalScript: "隋唐演義",
    slug: "sui-tang-yanyi",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "chu-renhuo",
    description:
      "The great historical novel of the Sui-Tang transition, covering the fall of the Sui dynasty through the rise of the Tang. Features famous characters like Li Shimin, Qin Shubao, and Cheng Yaojin.",
    sourceUrl: "https://zh.wikisource.org/wiki/隋唐演義",
    processedDir: "data/processed/sui-tang-yanyi",
    compositionYear: 1695,
    compositionEra: "Early Qing",
  },
  {
    title: "Dream Memories of Tao'an (Taoan Mengyi)",
    titleOriginalScript: "陶庵夢憶",
    slug: "taoan-mengyi",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "zhang-dai",
    description:
      "The finest collection of nostalgic essays in Chinese literature. Zhang Dai, a ruined Ming aristocrat, recalls the vanished world of late Ming Jiangnan: opera, tea, lantern festivals, lake excursions.",
    sourceUrl: "https://zh.wikisource.org/wiki/陶庵夢憶",
    processedDir: "data/processed/taoan-mengyi",
    compositionYear: 1665,
    compositionEra: "Ming-Qing transition",
  },
  {
    title: "Random Thoughts on Idle Pleasures (Xianqing Ouji)",
    titleOriginalScript: "閑情偶寄",
    slug: "xianqing-ouji",
    languageCode: "zh",
    genre: "commentary",
    textType: "prose" as const,
    authorSlug: "li-yu",
    description:
      "The most comprehensive manual of aesthetics and daily life in Chinese literature. Covers drama, music, costume, gardening, food, architecture, and health with wit and opinion.",
    sourceUrl: "https://zh.wikisource.org/wiki/閑情偶寄",
    processedDir: "data/processed/xianqing-ouji",
    compositionYear: 1671,
    compositionEra: "Early Qing",
  },
  {
    title: "Expanded Records of the Forest of Laughter (Xiaolin Guangji)",
    titleOriginalScript: "笑林廣記",
    slug: "xiaolin-guangji",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "youzhi-daoren",
    description:
      "The largest and most famous Chinese joke collection. Hundreds of jokes organized by category: stupid people, ridiculous officials, stingy men, marital humor, and more.",
    sourceUrl: "https://zh.wikisource.org/wiki/笑林廣記",
    processedDir: "data/processed/xiaolin-guangji",
    compositionYear: 1787,
    compositionEra: "Qing",
  },
  {
    title: "Random Notes on Poetry from the Sui Garden (Suiyuan Shihua)",
    titleOriginalScript: "隨園詩話",
    slug: "suiyuan-shihua",
    languageCode: "zh",
    genre: "commentary",
    textType: "prose" as const,
    authorSlug: "yuan-mei",
    description:
      "The most entertaining collection of poetry criticism in Chinese. Yuan Mei combines anecdotes, critical judgments, and hundreds of quoted poems, championing spirit and feeling over formalism.",
    sourceUrl: "https://zh.wikisource.org/wiki/隨園詩話",
    processedDir: "data/processed/suiyuan-shihua",
    compositionYear: 1790,
    compositionEra: "Qing",
  },
  {
    title: "Grades of Poetry (Shipin)",
    titleOriginalScript: "詩品",
    slug: "shipin",
    languageCode: "zh",
    genre: "commentary",
    textType: "prose" as const,
    authorSlug: "zhong-rong",
    description:
      "The earliest systematic ranking and critical evaluation of Chinese poets. Zhong Rong grades 122 poets from Han to his own day into three tiers with critical comments on each.",
    sourceUrl: "https://zh.wikisource.org/wiki/詩品",
    processedDir: "data/processed/shipin",
    compositionYear: 515,
    compositionEra: "Southern Liang",
  },
  {
    title: "Records of Learning Difficulties (Kunxue Jiwen)",
    titleOriginalScript: "困學紀聞",
    slug: "kunxue-jiwen",
    languageCode: "zh",
    genre: "philosophy",
    textType: "prose" as const,
    authorSlug: "wang-yinglin",
    description:
      "One of the greatest works of evidential scholarship in Chinese history. Wang Yinglin meticulously investigates textual problems across the classics, histories, and philosophy.",
    sourceUrl: "https://zh.wikisource.org/wiki/困學紀聞",
    processedDir: "data/processed/kunxue-jiwen",
    compositionYear: 1275,
    compositionEra: "Late Song",
  },
  {
    title: "Miscellaneous Morsels from Youyang (Youyang Zazu)",
    titleOriginalScript: "酉陽雜俎",
    slug: "youyang-zazu",
    languageCode: "zh",
    genre: "history",
    textType: "prose" as const,
    authorSlug: "duan-chengshi",
    description:
      "The most fascinating and eclectic biji collection of the Tang dynasty. Covers natural history, folklore, foreign lands, Buddhist and Daoist lore, food, drugs, ghosts, and oddities. Contains the earliest known Chinese Cinderella story.",
    sourceUrl: "https://zh.wikisource.org/wiki/酉陽雜俎",
    processedDir: "data/processed/youyang-zazu",
    compositionYear: 860,
    compositionEra: "Tang",
  },
  {
    title: "Notes from the Old Scholar's Studio (Laoxuean Biji)",
    titleOriginalScript: "老學庵筆記",
    slug: "laoxuean-biji",
    languageCode: "zh",
    genre: "history",
    textType: "prose" as const,
    authorSlug: "lu-you",
    description:
      "Personal notes by one of the greatest Song poets. Lu You records anecdotes about politics, literature, customs, and daily life in the Southern Song, full of eyewitness accounts of the Jurchen wars.",
    sourceUrl: "https://zh.wikisource.org/wiki/老學庵筆記",
    processedDir: "data/processed/laoxuean-biji",
    compositionYear: 1195,
    compositionEra: "Southern Song",
  },
  {
    title: "Dreams of Splendor of the Eastern Capital (Dongjing Menghua Lu)",
    titleOriginalScript: "東京夢華錄",
    slug: "dongjing-menghua-lu",
    languageCode: "zh",
    genre: "history",
    textType: "prose" as const,
    authorSlug: "meng-yuanlao",
    description:
      "The most detailed account of urban life in the Northern Song capital Kaifeng before its fall to the Jurchen in 1127. Markets, restaurants, festivals, entertainment, and daily customs described with nostalgic precision.",
    sourceUrl: "https://zh.wikisource.org/wiki/東京夢華錄",
    processedDir: "data/processed/dongjing-menghua-lu",
    compositionYear: 1147,
    compositionEra: "Southern Song",
  },
  {
    title: "Random Talks North of the Pond (Chibei Outan)",
    titleOriginalScript: "池北偶談",
    slug: "chibei-outan",
    languageCode: "zh",
    genre: "history",
    textType: "prose" as const,
    authorSlug: "wang-shizhen-qing",
    description:
      "A major biji collection by the leading poet-critic of the early Qing. Covers literature, history, supernatural tales, and contemporary events across four thematic sections.",
    sourceUrl: "https://zh.wikisource.org/wiki/池北偶談",
    processedDir: "data/processed/chibei-outan",
    compositionYear: 1691,
    compositionEra: "Early Qing",
  },
  {
    title: "Commentary on the Waterways Classic (Shuijing Zhu)",
    titleOriginalScript: "水經注",
    slug: "shuijing-zhu",
    languageCode: "zh",
    genre: "history",
    textType: "prose" as const,
    authorSlug: "li-daoyuan",
    description:
      "The greatest geographical text of pre-modern China. Li Daoyuan expanded a terse river catalog into a richly detailed account of landscapes, cities, legends, and inscriptions along China's waterways.",
    sourceUrl: "https://zh.wikisource.org/wiki/水經注",
    processedDir: "data/processed/shuijing-zhu",
    compositionYear: 520,
    compositionEra: "Northern Wei",
  },
  {
    title: "A Book to Burn (Fenshu)",
    titleOriginalScript: "焚書",
    slug: "fenshu",
    languageCode: "zh",
    genre: "philosophy",
    textType: "prose" as const,
    authorSlug: "li-zhi",
    description:
      "The most iconoclastic work of the late Ming. Li Zhi attacked Confucian hypocrisy, championed individual moral autonomy, and defended vernacular fiction and women's intellectual capacity.",
    sourceUrl: "https://zh.wikisource.org/wiki/焚書",
    processedDir: "data/processed/fenshu",
    compositionYear: 1590,
    compositionEra: "Late Ming",
  },
  {
    title: "Records of Ming Scholars (Mingru Xuean)",
    titleOriginalScript: "明儒學案",
    slug: "mingru-xuean",
    languageCode: "zh",
    genre: "philosophy",
    textType: "prose" as const,
    authorSlug: "huang-zongxi",
    description:
      "The first systematic history of philosophy in any language. Huang Zongxi traces the development of Confucian thought through the entire Ming dynasty, school by school.",
    sourceUrl: "https://zh.wikisource.org/wiki/明儒學案",
    processedDir: "data/processed/mingru-xuean",
    compositionYear: 1676,
    compositionEra: "Early Qing (1676)",
  },
  {
    title: "Random Jottings at the Cottage of Close Scrutiny (Yuewei Caotang Biji)",
    titleOriginalScript: "閱微草堂筆記",
    slug: "yuewei-caotang-biji",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "ji-yun",
    description:
      "The greatest collection of supernatural tales by China's most powerful literary official. Ji Yun deliberately wrote in a classical, sparse style as a counterpoint to Pu Songling's ornate Liaozhai. Contains ~1,200 stories of wit, moral commentary, and ghost stories.",
    sourceUrl: "https://zh.wikisource.org/wiki/閱微草堂筆記",
    processedDir: "data/processed/yuewei-caotang-biji",
    compositionYear: 1793,
    compositionEra: "Qing (1789–1798)",
  },
  {
    title: "An Old Rustic's Idle Talk (Yesou Puyan)",
    titleOriginalScript: "野叟曝言",
    slug: "yesou-puyan",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "xia-jingqu",
    description:
      "The longest pre-modern Chinese novel at 154 chapters. Follows scholar Wen Suchen through examinations, romances, and military campaigns in an encyclopedic narrative.",
    sourceUrl: "https://zh.wikisource.org/wiki/野叟曝言",
    processedDir: "data/processed/yesou-puyan",
    compositionYear: 1750,
    compositionEra: "Qing (c. 1750)",
  },
  {
    title: "Lamp at the Crossroads (Qilu Deng)",
    titleOriginalScript: "歧路燈",
    slug: "qilu-deng",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "li-luyuan",
    description:
      "A major Qing educational novel about a scholar's son squandering his inheritance. Only rediscovered in the 20th century; no complete English translation exists.",
    sourceUrl: "https://zh.wikisource.org/wiki/歧路燈",
    processedDir: "data/processed/qilu-deng",
    compositionYear: 1777,
    compositionEra: "Qing (c. 1777)",
  },
  {
    title: "Three Heroes and Five Gallants (Sanxia Wuyi)",
    titleOriginalScript: "三俠五義",
    slug: "sanxia-wuyi",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "shi-yukun",
    description:
      "The foundational Chinese martial-arts and detective novel combining Judge Bao courtroom drama with wuxia heroics. Source for countless later adaptations.",
    sourceUrl: "https://zh.wikisource.org/wiki/三俠五義",
    processedDir: "data/processed/sanxia-wuyi",
    compositionYear: 1879,
    compositionEra: "Qing (c. 1879)",
  },
  {
    title: "A Flower in a Sea of Sin (Niehai Hua)",
    titleOriginalScript: "孽海花",
    slug: "niehai-hua",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "zeng-pu",
    description:
      "A major roman à clef of late Qing diplomacy, politics, and scandal. Only 5 chapters translated into English (1982). One of the four great novels of the late Qing.",
    sourceUrl: "https://zh.wikisource.org/wiki/孽海花",
    processedDir: "data/processed/niehai-hua",
    compositionYear: 1905,
    compositionEra: "Late Qing (1905)",
  },
  {
    title: "Complete Tale of the Flying Dragon (Feilong Quanzhuan)",
    titleOriginalScript: "飛龍全傳",
    slug: "feilong-quanzhuan",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "wu-xuan",
    description:
      "Historical novel about the founding of the Song dynasty by Zhao Kuangyin (Emperor Taizu). A classic of dynastic-founding fiction.",
    sourceUrl: "https://zh.wikisource.org/wiki/飛龍全傳",
    processedDir: "data/processed/feilong-quanzhuan",
    compositionYear: 1715,
    compositionEra: "Qing (c. 1710s)",
  },
  {
    title: "Unofficial History of the Female Immortals (Nuxian Waishi)",
    titleOriginalScript: "女仙外史",
    slug: "nuxian-waishi",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "lu-xiong",
    description:
      "Fantastical novel set during the Yongle Emperor's usurpation, blending historical events with Daoist supernatural elements and female warrior protagonists.",
    sourceUrl: "https://zh.wikisource.org/wiki/女仙外史",
    processedDir: "data/processed/nuxian-waishi",
    compositionYear: 1711,
    compositionEra: "Qing (c. 1711)",
  },
  {
    title: "New Records of Yu Chu (Yuchu Xinzhi)",
    titleOriginalScript: "虞初新志",
    slug: "yuchu-xinzhi",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "zhang-chao",
    description:
      "Anthology of the finest literary Chinese tales from the late Ming and early Qing, curated by one of the period's foremost literary arbiters.",
    sourceUrl: "https://zh.wikisource.org/wiki/虞初新志",
    processedDir: "data/processed/yuchu-xinzhi",
    compositionYear: 1700,
    compositionEra: "Qing (c. 1700)",
  },
  {
    title: "What Canon? (Hedian)",
    titleOriginalScript: "何典",
    slug: "hedian",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "zhang-nanzhuang",
    description:
      "The first novel written in Wu dialect (Shanghainese). A satirical ghost-world picaresque championed by Lu Xun and Hu Shi during the New Culture Movement.",
    sourceUrl: "https://zh.wikisource.org/wiki/何典",
    processedDir: "data/processed/hedian",
    compositionYear: 1800,
    compositionEra: "Qing (c. 1800)",
  },
  {
    title: "Record of the Millet Dream (Mengliang Lu)",
    titleOriginalScript: "夢梁錄",
    slug: "mengliang-lu",
    languageCode: "zh",
    genre: "history",
    textType: "prose" as const,
    authorSlug: "wu-zimu",
    description:
      "Detailed record of life in Southern Song Hangzhou modeled on the Dongjing Menghua Lu. Documents markets, crafts, festivals, and urban culture before the Mongol conquest.",
    sourceUrl: "https://zh.wikisource.org/wiki/夢粱錄_(四庫全書本)",
    processedDir: "data/processed/mengliang-lu",
    compositionYear: 1274,
    compositionEra: "Song (c. 1274)",
  },
  {
    title: "Past Events of Wulin (Wulin Jiushi)",
    titleOriginalScript: "武林舊事",
    slug: "wulin-jiushi",
    languageCode: "zh",
    genre: "history",
    textType: "prose" as const,
    authorSlug: "zhou-mi",
    description:
      "Zhou Mi's nostalgic record of Southern Song Hangzhou's court ceremonies, festivals, entertainments, and daily life before the Mongol conquest.",
    sourceUrl: "https://zh.wikisource.org/wiki/武林舊事",
    processedDir: "data/processed/wulin-jiushi",
    compositionYear: 1290,
    compositionEra: "Song-Yuan (c. 1290)",
  },
  {
    title: "Rustic Words from East of Qi (Qidong Yeyu)",
    titleOriginalScript: "齊東野語",
    slug: "qidong-yeyu",
    languageCode: "zh",
    genre: "history",
    textType: "prose" as const,
    authorSlug: "zhou-mi",
    description:
      "Zhou Mi's politically revealing biji covering Southern Song court politics, the Zhu Xi scandal, painting connoisseurship, and other historical anecdotes.",
    sourceUrl: "https://zh.wikisource.org/wiki/齊東野語",
    processedDir: "data/processed/qidong-yeyu",
    compositionYear: 1291,
    compositionEra: "Song-Yuan (c. 1291)",
  },
  {
    title: "Jade Dew from the Crane Forest (Helin Yulu)",
    titleOriginalScript: "鶴林玉露",
    slug: "helin-yulu",
    languageCode: "zh",
    genre: "history",
    textType: "prose" as const,
    authorSlug: "luo-dajing",
    description:
      "Song dynasty biji covering poetry criticism, historical anecdotes, philosophical discussions, and political commentary.",
    sourceUrl: "https://zh.wikisource.org/wiki/鶴林玉露",
    processedDir: "data/processed/helin-yulu",
    compositionYear: 1248,
    compositionEra: "Song (c. 1248)",
  },
  {
    title: "Records Heard by the Si River (Sushui Jiwen)",
    titleOriginalScript: "涑水紀聞",
    slug: "sushui-jiwen",
    languageCode: "zh",
    genre: "history",
    textType: "prose" as const,
    authorSlug: "sima-guang",
    description:
      "Private notes by the great historian Sima Guang recording political events and anecdotes from the Northern Song that did not make it into the Zizhi Tongjian.",
    sourceUrl: "https://zh.wikisource.org/wiki/涑水紀聞",
    processedDir: "data/processed/sushui-jiwen",
    compositionYear: 1075,
    compositionEra: "Northern Song (c. 1070s)",
  },
  {
    title: "Gathered Words of the Tang (Tang Zhiyan)",
    titleOriginalScript: "唐摭言",
    slug: "tang-zhiyan",
    languageCode: "zh",
    genre: "history",
    textType: "prose" as const,
    authorSlug: "wang-dingbao",
    description:
      "The most detailed source on Tang dynasty civil service examinations, poetry culture, and the social world of examination candidates.",
    sourceUrl: "https://zh.wikisource.org/wiki/唐摭言",
    processedDir: "data/processed/tang-zhiyan",
    compositionYear: 940,
    compositionEra: "Five Dynasties (c. 940)",
  },
  {
    title: "Trivial Tales from North of the Dreams (Beimeng Suoyan)",
    titleOriginalScript: "北夢瑣言",
    slug: "beimeng-suoyan",
    languageCode: "zh",
    genre: "history",
    textType: "prose" as const,
    authorSlug: "sun-guangxian",
    description:
      "Important biji covering late Tang through Five Dynasties anecdotes, politics, and literary culture across three decades of compilation.",
    sourceUrl: "https://zh.wikisource.org/wiki/北夢瑣言",
    processedDir: "data/processed/beimeng-suoyan",
    compositionYear: 960,
    compositionEra: "Five Dynasties (c. 960)",
  },
  {
    title: "Miscellaneous Records of the Western Capital (Xijing Zaji)",
    titleOriginalScript: "西京雜記",
    slug: "xijing-zaji",
    languageCode: "zh",
    genre: "history",
    textType: "prose" as const,
    authorSlug: "liu-xin-ge-hong",
    description:
      "One of the earliest Chinese short story collections, recording court life, customs, and legends of the Western Han capital Chang'an. 129 stories.",
    sourceUrl: "https://zh.wikisource.org/wiki/西京雜記",
    processedDir: "data/processed/xijing-zaji",
    compositionYear: 300,
    compositionEra: "Han-Jin (uncertain)",
  },
  {
    title: "Records by the Autumn Lamp on Rainy Nights (Yeyu Qiudeng Lu)",
    titleOriginalScript: "夜雨秋燈錄",
    slug: "yeyu-qiudeng-lu",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "xuan-ding",
    description:
      "Late Qing collection of classical tales in the tradition of Liaozhai, noted for its literary polish and tragic love stories.",
    sourceUrl: "https://zh.wikisource.org/wiki/夜雨秋燈錄",
    processedDir: "data/processed/yeyu-qiudeng-lu",
    compositionYear: 1877,
    compositionEra: "Late Qing (c. 1877)",
  },
  {
    title: "Five Assorted Offerings (Wuzazu)",
    titleOriginalScript: "五雜俎",
    slug: "wuzazu",
    languageCode: "zh",
    genre: "history",
    textType: "prose" as const,
    authorSlug: "xie-zhaozhe",
    description:
      "Massive encyclopedic biji covering astronomy, geography, natural history, customs, and curiosities. Contains the earliest known mention of rock-paper-scissors.",
    sourceUrl: "https://zh.wikisource.org/wiki/五雜俎",
    processedDir: "data/processed/wuzazu",
    compositionYear: 1619,
    compositionEra: "Ming (c. 1619)",
  },
  {
    title: "Records of Things Gleaned (Shiyi Ji)",
    titleOriginalScript: "拾遺記",
    slug: "shiyi-ji",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "wang-jia",
    description:
      "Important early collection of myths, legends, and supernatural tales spanning from mythological antiquity to the Jin dynasty. Includes descriptions of Penglai and Kunlun.",
    sourceUrl: "https://zh.wikisource.org/wiki/拾遺記",
    processedDir: "data/processed/shiyi-ji",
    compositionYear: 380,
    compositionEra: "Jin (c. 380)",
  },
  {
    title: "Searching for West Lake in Dreams (Xihu Mengxun)",
    titleOriginalScript: "西湖夢尋",
    slug: "xihu-mengxun",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "zhang-dai",
    description:
      "Zhang Dai's lyrical guide to West Lake in Hangzhou, written decades after the Ming collapse. 72 essays organized by geographic route. Only partial translations exist in anthologies.",
    sourceUrl: "https://zh.wikisource.org/wiki/西湖夢尋",
    processedDir: "data/processed/xihu-mengxun",
    compositionYear: 1671,
    compositionEra: "Ming-Qing transition (c. 1671)",
  },
  {
    title: "The Wisdom Sack (Zhinang)",
    titleOriginalScript: "智囊",
    slug: "zhinang",
    languageCode: "zh",
    genre: "philosophy",
    textType: "prose" as const,
    authorSlug: "feng-menglong",
    description:
      "Massive anthology of 1,238 stories of stratagems and wit from Chinese history, organized by type of wisdom. Feng Menglong's most scholarly compilation.",
    sourceUrl: "https://zh.wikisource.org/wiki/智囊",
    processedDir: "data/processed/zhinang",
    compositionYear: 1626,
    compositionEra: "Ming (1626)",
  },
  {
    title: "History of Love (Qingshi)",
    titleOriginalScript: "情史",
    slug: "qingshi",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "feng-menglong",
    description:
      "The largest anthology of love stories in Chinese literature, with 870+ stories drawn from official histories, biji, and fiction. Organized into 24 categories of love and passion.",
    sourceUrl: "https://zh.wikisource.org/wiki/情史",
    processedDir: "data/processed/qingshi",
    compositionYear: 1630,
    compositionEra: "Ming (c. 1630)",
  },
  {
    title: "Studies at Leisure by the Staircase (Gaiyu Congkao)",
    titleOriginalScript: "陔餘叢考",
    slug: "gaiyu-congkao",
    languageCode: "zh",
    genre: "history",
    textType: "prose" as const,
    authorSlug: "zhao-yi",
    description:
      "Major work of Qing evidential scholarship investigating origins of customs, institutions, and historical claims. Zhao Yi was one of the three leading historians of the Qian-Jia era.",
    sourceUrl: "https://zh.wikisource.org/wiki/陔餘叢考",
    processedDir: "data/processed/gaiyu-congkao",
    compositionYear: 1790,
    compositionEra: "Qing (c. 1790)",
  },
  {
    title: "Biographies of Talented Men of the Tang (Tang Caizi Zhuan)",
    titleOriginalScript: "唐才子傳",
    slug: "tang-caizi-zhuan",
    languageCode: "zh",
    genre: "commentary",
    textType: "prose" as const,
    authorSlug: "xin-wenfang",
    description:
      "The most important source for biographies of Tang dynasty poets. Contains entries for 398 poets arranged by quality and era.",
    sourceUrl: "https://zh.wikisource.org/wiki/唐才子傳",
    processedDir: "data/processed/tang-caizi-zhuan",
    compositionYear: 1304,
    compositionEra: "Yuan (c. 1304)",
  },
  {
    title: "Survey of Jokes Past and Present (Gujin Tangai)",
    titleOriginalScript: "古今譚概",
    slug: "gujin-tangai",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "feng-menglong",
    description:
      "Curated anthology of witticisms and satirical anecdotes from Chinese history, organized into 36 categories. Companion volume to Zhinang and Qingshi.",
    sourceUrl: "https://zh.wikisource.org/wiki/古今譚概",
    processedDir: "data/processed/gujin-tangai",
    compositionYear: 1620,
    compositionEra: "Ming (1620)",
  },
  {
    title: "The Night Ferry (Yehangchuan)",
    titleOriginalScript: "夜航船",
    slug: "yehangchuan",
    languageCode: "zh",
    genre: "history",
    textType: "prose" as const,
    authorSlug: "zhang-dai",
    description:
      "A witty encyclopedic compendium covering 20 categories from astronomy to botany with 4,000+ entries, meant as conversational reference for educated travelers on night boats.",
    sourceUrl: "https://zh.wikisource.org/wiki/夜航船",
    processedDir: "data/processed/yehangchuan",
    compositionYear: 1655,
    compositionEra: "Ming-Qing transition (c. 1650s)",
  },
  {
    title: "Seven Swords and Thirteen Heroes (Qijian Shisan Xia)",
    titleOriginalScript: "七劍十三俠",
    slug: "qijian-shisan-xia",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "tang-yunzhou",
    description:
      "One of the most popular late Qing martial arts novels, set during the Zhengde reign. Features a band of righteous swordsmen suppressing a princely rebellion.",
    sourceUrl: "https://zh.wikisource.org/wiki/七劍十三俠",
    processedDir: "data/processed/qijian-shisan-xia",
    compositionYear: 1896,
    compositionEra: "Late Qing (c. 1896)",
  },
  {
    title: "Random Records from the Whistling Pavilion (Xiaoting Zalu)",
    titleOriginalScript: "嘯亭雜錄",
    slug: "xiaoting-zalu",
    languageCode: "zh",
    genre: "history",
    textType: "prose" as const,
    authorSlug: "zhaolian",
    description:
      "Written by a Qing imperial prince (Aisin Gioro clan), this biji offers insider accounts of Qing court politics, Manchu customs, and Bannerman life unavailable from any other source.",
    sourceUrl: "https://zh.wikisource.org/wiki/嘯亭雜錄",
    processedDir: "data/processed/xiaoting-zalu",
    compositionYear: 1815,
    compositionEra: "Qing (c. 1815)",
  },] as const;

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

