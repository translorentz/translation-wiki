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
  { code: "el", name: "Modern Greek", displayName: "Ελληνικά" },
  { code: "la", name: "Latin", displayName: "Lingua Latina" },
  { code: "en", name: "English", displayName: "English" },
  { code: "ta", name: "Tamil", displayName: "தமிழ்" },
  { code: "it", name: "Italian", displayName: "Italian" },
  { code: "hy", name: "Armenian", displayName: "Հայերեն" },
  { code: "ms", name: "Malay", displayName: "Bahasa Melayu" },
  { code: "pl", name: "Polish", displayName: "Polski" },
  { code: "te", name: "Telugu", displayName: "తెలుగు" },
  { code: "cs", name: "Czech", displayName: "Čeština" },
  { code: "tr", name: "Turkish", displayName: "Türkçe" },
  { code: "ru", name: "Russian", displayName: "Русский" },
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
    name: "Shennong (Traditional Attribution)",
    nameOriginalScript: "神農",
    slug: "shennong",
    era: "Han Dynasty (c. 200 BCE)",
    description:
      "The Divine Farmer, a legendary Chinese emperor and cultural hero traditionally credited with teaching agriculture and herbal medicine. The Shennong Bencao Jing is attributed to him but was compiled by anonymous physicians.",
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
    name: "Gregory of Nazianzus",
    nameOriginalScript: "Γρηγόριος ὁ Θεολόγος",
    slug: "gregory-nazianzus",
    era: "4th century (c. 329–390 CE)",
    description:
      "One of the Cappadocian Fathers and Patriarch of Constantinople. Gregory was the preeminent Christian orator of late antiquity, whose theological orations on the Trinity earned him the title 'the Theologian.' His 45 surviving orations range from theological treatises to funeral panegyrics to invectives against the emperor Julian.",
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
    name: "Nar-Dos",
    nameOriginalScript: "\u0546\u0561\u0580-\u0534\u0578\u057d",
    slug: "nar-dos",
    era: "1867–1933",
    description:
      "Armenian novelist and short story writer, pen name of Mikayel Hovhannisyan. Pioneer of the psychological trend in Armenian critical realism, known for refined language and deep character studies of the bourgeois intelligentsia.",
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
  {
    name: "Su Shi (Su Dongpo)",
    nameOriginalScript: "蘇軾",
    slug: "su-shi",
    era: "Song Dynasty (1037–1101)",
    description:
      "One of the most celebrated poets, essayists, and statesmen of the Song Dynasty. Known for his prose, poetry, calligraphy, and painting.",
  },
  // Polish Pipeline Authors (7 new)
  {
    name: "Władysław Reymont",
    nameOriginalScript: "Władysław Reymont",
    slug: "wladyslaw-reymont",
    era: "Young Poland (1867–1925)",
    description:
      "Polish novelist and Nobel laureate (1924), best known for 'The Peasants.' A leading figure of the Young Poland movement, his naturalist prose depicts Polish rural and urban life with vivid psychological detail.",
  },
  {
    name: "Józef Ignacy Kraszewski",
    nameOriginalScript: "Józef Ignacy Kraszewski",
    slug: "jozef-ignacy-kraszewski",
    era: "Positivism (1812–1887)",
    description:
      "The most prolific Polish novelist of the 19th century, author of over 200 novels. His historical fiction spans Polish history from prehistoric times to the contemporary era.",
  },
  {
    name: "Karol Irzykowski",
    nameOriginalScript: "Karol Irzykowski",
    slug: "karol-irzykowski",
    era: "Young Poland (1873–1944)",
    description:
      "Polish novelist, literary critic, and film theorist. A pioneering modernist whose experimental novel 'Pałuba' anticipated techniques of the European avant-garde.",
  },
  {
    name: "Stefan Żeromski",
    nameOriginalScript: "Stefan Żeromski",
    slug: "stefan-zeromski",
    era: "Young Poland (1864–1925)",
    description:
      "One of the most important Polish novelists and dramatists, called 'the conscience of Polish literature.' His works explore social injustice, patriotism, and moral dilemmas.",
  },
  {
    name: "Eliza Orzeszkowa",
    nameOriginalScript: "Eliza Orzeszkowa",
    slug: "eliza-orzeszkowa",
    era: "Positivism (1841–1910)",
    description:
      "Leading Polish positivist novelist and social activist, nominated for the Nobel Prize in Literature. Her works champion social reform.",
  },
  {
    name: "Wacław Berent",
    nameOriginalScript: "Wacław Berent",
    slug: "waclaw-berent",
    era: "Young Poland (1873–1940)",
    description:
      "Polish novelist and translator, a leading figure of the Young Poland movement. Known for his modernist prose style and philosophical novels exploring Polish intellectual life.",
  },
  {
    name: "Juliusz Kaden-Bandrowski",
    nameOriginalScript: "Juliusz Kaden-Bandrowski",
    slug: "juliusz-kaden-bandrowski",
    era: "Interwar period (1885–1944)",
    description:
      "Polish novelist and journalist of the interwar period. Known for politically engaged novels depicting the mechanisms of power and corruption in newly independent Poland.",
  },
  // Czech Pipeline Authors
  {
    name: "Svatopluk Čech",
    nameOriginalScript: "Svatopluk Čech",
    slug: "svatopluk-cech",
    era: "Czech National Revival (1846–1908)",
    description:
      "Czech poet, novelist, and journalist of the National Revival. Known for satirical prose and verse celebrating Czech identity, including the beloved comic novels featuring the character Mr. Brouček.",
  },
  // Latin Pipeline Authors (new)
  {
    name: "Gottfried Wilhelm Leibniz",
    nameOriginalScript: "Gottfried Wilhelm Leibniz",
    slug: "gottfried-wilhelm-leibniz",
    era: "Early Modern (1646–1716)",
    description:
      "German polymath, philosopher, and mathematician. One of the most important logicians and natural philosophers of the Enlightenment, known for his contributions to calculus, metaphysics, and universal language theory.",
  },
  {
    name: "Albertus Magnus",
    nameOriginalScript: "Albertus Magnus",
    slug: "albertus-magnus",
    era: "High Medieval (c. 1200–1280)",
    description:
      "Dominican friar, bishop, and Doctor of the Church. The foremost Aristotelian scholar of the 13th century, teacher of Thomas Aquinas, and a prolific writer on philosophy, theology, and natural science.",
  },
  // Greek Pipeline Authors (new)
  {
    name: "Anonymous",
    nameOriginalScript: "Anonymous",
    slug: "anonymous",
    era: "Various",
    description:
      "Works of unknown or uncertain authorship from various periods and traditions.",
  },
  {
    name: "Christopher of Mytilene",
    nameOriginalScript: "Χριστόφορος ὁ Μυτιληναῖος",
    slug: "christopher-of-mytilene",
    era: "Middle Byzantine (c. 1000–1050)",
    description:
      "Byzantine poet active in Constantinople during the 11th century. Known for occasional verse in iambic trimeter addressing social, religious, and philosophical themes with wit and rhetorical skill.",
  },
  {
    name: "Vittorio Imbriani",
    nameOriginalScript: "Vittorio Imbriani",
    slug: "vittorio-imbriani",
    era: "Scapigliatura / Italian Realism (1840–1886)",
    description:
      "Italian novelist and literary critic associated with the Scapigliatura movement. Known for his satirical prose and dialectal experimentation.",
  },
  {
    name: "Bertrando Spaventa",
    nameOriginalScript: "Bertrando Spaventa",
    slug: "bertrando-spaventa",
    era: "Italian Hegelianism (1817–1883)",
    description:
      "Italian Hegelian philosopher who argued for Italy's centrality in the development of modern European philosophy. Key figure in the Naples school of idealism.",
  },
  {
    name: "Roberto Ardigò",
    nameOriginalScript: "Roberto Ardigò",
    slug: "roberto-ardigo",
    era: "Italian Positivism (1828–1920)",
    description:
      "Leading Italian positivist philosopher. Former priest turned secular thinker, he developed a system grounding psychology and ethics in empirical science.",
  },
  {
    name: "Francesco Algarotti",
    nameOriginalScript: "Francesco Algarotti",
    slug: "francesco-algarotti",
    era: "Italian Enlightenment (1712–1764)",
    description:
      "Venetian polymath, essayist, and art critic. A central figure of the Italian Enlightenment, known for popularizing Newtonian science and writing on diverse subjects from opera to military architecture.",
  },
  {
    name: "Vincenzo Gioberti",
    nameOriginalScript: "Vincenzo Gioberti",
    slug: "vincenzo-gioberti",
    era: "Risorgimento Philosophy (1801–1852)",
    description:
      "Italian philosopher, politician, and key intellectual of the Risorgimento. Advocated a federal Italy under papal presidency in his early work, later shifted toward secular democratic nationalism.",
  },
  {
    name: "Carlo Cattaneo",
    nameOriginalScript: "Carlo Cattaneo",
    slug: "carlo-cattaneo",
    era: "Risorgimento Federalism (1801–1869)",
    description:
      "Italian philosopher, political theorist, and federalist republican. A leader of Milan's Five Days revolt against Austria, he developed an original social philosophy centered on collective intelligence and associative thinking.",
  },
  {
    name: "Terenzio Mamiani",
    nameOriginalScript: "Terenzio Mamiani",
    slug: "terenzio-mamiani",
    era: "Italian Idealism (1799–1885)",
    description:
      "Italian philosopher, poet, and statesman. Minister of public instruction in unified Italy, he wrote extensively on metaphysics, attempting to reconcile Italian idealist tradition with modern thought.",
  },
  {
    name: "Filippo Baldini",
    nameOriginalScript: "Filippo Baldini",
    slug: "filippo-baldini",
    era: "Neapolitan Enlightenment (18th century)",
    description:
      "Neapolitan physician and medical writer known for his treatise on sorbets and cold beverages, examining their effects on human health from a medical-scientific perspective.",
  },
  {
    name: "Dhurjati",
    nameOriginalScript: "ధూర్జటి",
    slug: "dhurjati",
    era: "Vijayanagara Empire (16th century)",
    description:
      "Telugu poet and devotee of Lord Shiva, one of the Ashtadiggajas (eight great poets) at the court of Krishnadevaraya. Renowned for his devotional masterpiece Sri Kalahasteeswara Satakam, a century of verses addressed to the deity at Srikalahasti.",
  },
  {
    name: "Halit Ziya Usakligil",
    nameOriginalScript: null,
    slug: "halit-ziya-usakligil",
    era: "Late Ottoman (1866–1945)",
    description:
      "Pioneering Turkish novelist of the Servet-i Funun (Wealth of Knowledge) literary movement. Considered the first major Turkish novelist to write in the Western realist style, his works depict the inner lives and social milieu of late Ottoman Istanbul.",
  },
  // Modern Greek + Byzantine authors (Greek Pipeline Phase 2)
  {
    name: "Georgios Vizyinos",
    nameOriginalScript: "Γεώργιος Βιζυηνός",
    slug: "georgios-vizyinos",
    era: "Modern Greek Literature (1849–1896)",
    description:
      "Greek short story writer and poet, one of the founders of modern Greek prose fiction. His deeply personal stories draw on childhood memories in rural Thrace, blending psychological realism with folkloric elements.",
  },
  {
    name: "Emmanuel Roidis",
    nameOriginalScript: "Εμμανουήλ Ροΐδης",
    slug: "emmanuel-roidis",
    era: "Modern Greek Literature (1836–1904)",
    description:
      "Greek novelist and literary critic known for his satirical wit and erudition. His novel Pope Joan caused a scandal with its irreverent treatment of medieval church history.",
  },
  {
    name: "Demetrios Vikelas",
    nameOriginalScript: "Δημήτριος Βικέλας",
    slug: "demetrios-vikelas",
    era: "Modern Greek Literature (1835–1908)",
    description:
      "Greek novelist, businessman, and the first president of the International Olympic Committee. His novel Loukis Laras is considered a landmark of modern Greek fiction.",
  },
  {
    name: "Theodore Mouzalon",
    nameOriginalScript: "Θεόδωρος Μουζάλων",
    slug: "theodore-mouzalon",
    era: "Palaeologan Byzantine (13th century)",
    description:
      "Grand Logothete under the early Palaeologan dynasty. Scholar and official who served at the court of Michael VIII and Andronikos II Palaiologos, known for his hagiographic and rhetorical works.",
  },
  // ── Russian authors ──
  {
    name: "Konstantin Leontiev",
    nameOriginalScript: "Константин Николаевич Леонтьев",
    slug: "konstantin-leontiev",
    era: "Imperial Russian (1831–1891)",
    description:
      "Russian philosopher, writer, and diplomat. A conservative thinker who developed a cyclical theory of civilisations, he is best known for Byzantism and Slavdom, a critique of pan-Slavism.",
  },
  {
    name: "Nikolai Leskov",
    nameOriginalScript: "Николай Семёнович Лесков",
    slug: "nikolai-leskov",
    era: "Imperial Russian (1831–1895)",
    description:
      "Major Russian prose writer celebrated for his stylistic virtuosity and deep knowledge of Russian provincial and ecclesiastical life. His satirical sketches of the clergy are among his most distinctive works.",
  },
  {
    name: "Vasily Rozanov",
    nameOriginalScript: "Василий Васильевич Розанов",
    slug: "vasily-rozanov",
    era: "Late Imperial Russian (1856–1919)",
    description:
      "Provocative Russian religious philosopher and essayist. His fragmentary, aphoristic style and radical views on Christianity, sex, and Judaism made him one of the most controversial figures of the Silver Age.",
  },
  {
    name: "Andrei Muravyov",
    nameOriginalScript: "Андрей Николаевич Муравьёв",
    slug: "andrei-muravyov",
    era: "Imperial Russian (1806–1874)",
    description:
      "Russian diplomat, poet, and church historian. His Journey to the Holy Places in 1830 was a literary sensation that inspired Lermontov and helped revive Russian interest in the Orthodox East.",
  },
  {
    name: "Viktor Nesmelov",
    nameOriginalScript: "Виктор Иванович Несмелов",
    slug: "viktor-nesmelov",
    era: "Late Imperial Russian (1863–1937)",
    description:
      "Russian philosopher and theologian at Kazan Theological Academy. His Science of Man was praised by Berdyaev as a unique synthesis of Christian anthropology and philosophical inquiry.",
  },
  {
    name: "Evgeny Poselyanin",
    nameOriginalScript: "Евгений Николаевич Поселянин",
    slug: "evgeny-poselyanin",
    era: "Late Imperial Russian (1870–1931)",
    description:
      "Russian religious writer and hagiographer. His devotional works on the Mother of God and lives of the saints were widely read in pre-revolutionary Russia.",
  },
  {
    name: "Innocent of Kherson",
    nameOriginalScript: "Иннокентий Херсонский (Борисов)",
    slug: "innocent-of-kherson",
    era: "Imperial Russian (1800–1857)",
    description:
      "Archbishop of Kherson and Taurida, renowned as one of Russia's greatest preachers. His Last Days of the Earthly Life of Jesus Christ influenced Dostoevsky and remains a classic of Russian spiritual literature.",
  },
  {
    name: "Vasily Bolotov",
    nameOriginalScript: "Василий Васильевич Болотов",
    slug: "vasily-bolotov",
    era: "Late Imperial Russian (1853–1900)",
    description:
      "Russian church historian at the St. Petersburg Theological Academy, recognised as the foremost Russian specialist in ancient church history. His Lectures are considered a monument of Russian historical scholarship.",
  },
  // Latin Pipeline Batch 2 Authors
  {
    name: "Friedrich Nietzsche",
    nameOriginalScript: "Friedrich Wilhelm Nietzsche",
    slug: "friedrich-nietzsche",
    era: "Late 19th century (1844–1900)",
    description:
      "German philologist and philosopher. Before his philosophical works, he was a classical philologist at Basel, publishing Latin dissertations on Diogenes Laertius.",
  },
  {
    name: "Victor Brochard",
    nameOriginalScript: "Victor Charles Louis Brochard",
    slug: "victor-brochard",
    era: "Late 19th century (1848–1907)",
    description:
      "French philosopher and historian of ancient philosophy, known for his studies of Greek skepticism and Stoic epistemology.",
  },
  {
    name: "Martin Bucer",
    nameOriginalScript: "Martin Bucer",
    slug: "martin-bucer",
    era: "Reformation (1491–1551)",
    description:
      "German Protestant reformer based in Strasbourg, influential in developing Reformed theology and church organization.",
  },
  {
    name: "Al-Farabi",
    nameOriginalScript: "أبو نصر الفارابي",
    slug: "al-farabi",
    era: "Islamic Golden Age (c. 870–950)",
    description:
      "Persian polymath known as 'the Second Teacher' after Aristotle. His philosophical works were translated into Latin and influenced medieval scholasticism.",
  },
  {
    name: "Sven Aggesen",
    nameOriginalScript: "Svend Aggesen",
    slug: "sven-aggesen",
    era: "Medieval Denmark (fl. 1187)",
    description:
      "Danish historian who wrote one of the first coherent histories of Denmark under the patronage of Archbishop Absalon.",
  },
  {
    name: "Andrew of Bergamo",
    nameOriginalScript: "Andreas Bergomatis",
    slug: "andreas-bergomatis",
    era: "Carolingian Italy (fl. 877)",
    description:
      "Lombard priest who continued Paul the Deacon's history, chronicling the Lombard-Carolingian transition in northern Italy.",
  },
  {
    name: "Falco of Benevento",
    nameOriginalScript: "Falco Beneventanus",
    slug: "falco-benevento",
    era: "Norman Italy (fl. 1102–1139)",
    description:
      "One of the first lay chroniclers of medieval Italy, documenting the rise of Norman power in southern Italy.",
  },
  {
    name: "Lupus Protospatharius",
    nameOriginalScript: "Lupus Protospatharius",
    slug: "lupus-protospatharius",
    era: "Byzantine Italy (fl. 11th–12th century)",
    description:
      "Byzantine official in southern Italy whose chronicle covers Norman-Byzantine conflicts in Langobardia Minor (805–1102).",
  },
  {
    name: "Xu Changling (Attributed)",
    nameOriginalScript: "徐昌齡",
    slug: "xu-changling",
    era: "Ming Dynasty (fl. early 16th century)",
    description:
      "Ming dynasty author traditionally attributed as the author of Ruyi Jun Zhuan, though modern scholars debate the attribution. Some suggest the text may have been written by Huang Xun (黃訓).",
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
      "A 140-chapter record of Zhu Xi's philosophical conversations with his students, covering metaphysics, ethics, textual interpretation, governance, and self-cultivation. The largest and most systematic compilation of Neo-Confucian oral teachings, organized topically from cosmology to commentary on individual classics.",
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
      "A detailed manual of Byzantine imperial court protocol, describing coronations, receptions of foreign ambassadors, religious processions, hippodrome ceremonies, and palace banquets. Compiled as a practical guide to ensure the orderly conduct of state ritual, it is the most comprehensive surviving source for Byzantine court ceremonial.",
    sourceUrl: "https://archive.org/details/bub_gb_OFpFAAAAYAAJ",
    processedDir: "data/processed/ceremonialis",
    compositionYear: 959,
    compositionEra: "Reign of Constantine VII, Byzantine Empire",
    genre: "ritual",
  },
  {
    title: "Instructions for Practical Living (Chuan Xi Lu)",
    titleOriginalScript: "傳習錄",
    slug: "chuanxilu",
    languageCode: "zh",
    authorSlug: "wang-yangming",
    description:
      "Recorded conversations, letters, and essays expounding Wang Yangming's doctrine of innate moral knowing (liangzhi) and the unity of knowledge and action. The foundational text of the Yangming school, it challenged the orthodox Zhu Xi tradition by arguing that moral truth is discovered through action and introspection rather than textual study.",
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
      "A treatise on the nature, definition, and powers of the human soul, written after Cassiodorus retired to his monastery at Vivarium. Drawing on Augustine, Claudianus Mamertus, and the Aristotelian tradition, it examines the soul's incorporeality, its faculties of reason and memory, and its relationship to the body.",
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
      "A medieval Latin elegiac poem in four books lamenting the author's fall from fortune and seeking consolation through philosophy, modeled on Boethius's Consolation of Philosophy. Written in elegiac couplets, it stages a dialogue between the poet and Philosophy on the nature of suffering, fortune, and divine justice.",
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
      "A chronicle of the Lombard principality of Benevento from the Carolingian conquest through the late 9th century, covering the fragmentation of Lombard southern Italy, Saracen incursions, and the rivalries between Benevento, Salerno, and Capua. Written by a monk of Monte Cassino, it is the principal narrative source for this turbulent period of southern Italian history.",
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
      "A vivid Latin chronicle of political intrigue, rebellion, and court conspiracy in Norman Sicily during the reign of William I and the regency for William II. Notable for its Tacitean style and psychological acuity, it provides an unparalleled insider's account of palace coups, baronial revolts, and the clash between Norman, Greek, and Muslim populations in 12th-century Sicily.",
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
      "The first Chinese historical work organized by topical events rather than chronology. Yuan Shu reorganized Sima Guang's Zizhi Tongjian into 42 major narrative threads, each tracing a single political or military episode from beginning to end. This format, spanning from the Partition of Jin to the Later Zhou dynasty, became a new genre of Chinese historiography (jishi benmo).",
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
      "The foundational text of Chinese medicine, structured as dialogues between the Yellow Emperor and his physician Qi Bo. Comprising the Su Wen (Basic Questions) and Ling Shu (Spiritual Pivot), it covers physiology, pathology, diagnosis, acupuncture, and treatment according to yin-yang and five-phase theory. It remains the theoretical basis of traditional Chinese medicine today.",
    sourceUrl: "https://ctext.org/huangdi-neijing",
    processedDir: "data/processed/huangdineijing",
    compositionYear: -200,
    compositionEra: "Warring States to Western Han Dynasty",
    genre: "science",
  },
  {
    title: "Divine Farmer's Classic of Materia Medica (Shennong Bencao Jing)",
    titleOriginalScript: "神農本草經",
    slug: "shennong-bencao-jing",
    languageCode: "zh",
    authorSlug: "shennong",
    genre: "science",
    description:
      "The oldest known Chinese pharmacopoeia, cataloguing 365 medicinal substances — plants, minerals, and animal products — classified into three grades based on toxicity and therapeutic use. The upper grade contains life-prolonging tonics, the middle grade treats illness, and the lower grade contains potent but dangerous drugs. It established the classification framework used by Chinese pharmacology for two millennia.",
    sourceUrl: "https://zh.wikisource.org/wiki/神農本草經",
    processedDir: "data/processed/shennong-bencao-jing",
    compositionYear: -200,
    compositionEra: "Han Dynasty (c. 200 BCE)",
  },
  {
    title: "Poems of Poor Prodromos (Ptochoprodromika)",
    titleOriginalScript: "Πτωχοπροδρομικά",
    slug: "ptochoprodromos",
    languageCode: "grc",
    authorSlug: "theodore-prodromos",
    description:
      "Four satirical poems in vernacular Greek offering vivid portraits of everyday life in 12th-century Constantinople: a scholar lamenting his poverty, a henpecked husband, a monk complaining about monastic food, and a craftsman mocking the educated. Among the earliest substantial texts in demotic Greek, they provide a rare street-level view of Byzantine social life.",
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
      "An anthology of 21 medieval vernacular Greek poems spanning the 12th to 15th centuries, including romances, beast fables, satirical verse, laments, and historical narratives. The collection preserves texts by named poets (Sachlikis, Georgillas, Pikatorios) alongside anonymous works like the Poulologos and the Tale of Belisarius, documenting the emergence of a popular Greek literary tradition outside learned Byzantinism.",
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
      "One of the three classical commentaries on the Spring and Autumn Annals, interpreting the terse chronicle entries through a question-and-answer format. The Guliang tradition emphasizes ritual propriety and the moral significance of Confucius's word choices, reading the Annals as an encoded system of praise and blame rather than straightforward history.",
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
      "A Sangam Tamil poem from the Ten Idylls (Pattuppattu) in which a war-bard who has already received patronage from the Chola king Karikala directs a fellow bard toward the same court. The poem describes the king's palace, his generosity, the sounds and sights of the Chola capital, and the life of itinerant performers in early Tamil society.",
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
      "A record of debates on Confucian classical scholarship held at the White Tiger Hall conference of 79 CE, convened by Emperor Zhang of Han. Covering 43 topics from cosmology and human nature to marriage rites and governance, it represents the official synthesis of New Text and Old Text classical traditions and was the closest thing to an imperial orthodoxy in Han Confucianism.",
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
      "One of the Three Ritual Classics of Confucianism, prescribing step-by-step protocols for capping ceremonies, marriage, archery contests, court audiences, funeral rites, and sacrifices. The most procedurally detailed of the ritual texts, it reads as a stage-direction manual for the ceremonial life of the Zhou-era scholar-official class.",
    sourceUrl: "https://ctext.org/yi-li",
    processedDir: "data/processed/yi-li",
    compositionYear: -200,
    compositionEra: "Western Han (base text, c. 200 BCE); Eastern Han (Zheng Xuan commentary, c. 180 CE)",
    genre: "ritual",
  },
  {
    title: "Lost Book of Zhou (Yi Zhou Shu)",
    titleOriginalScript: "逸周書",
    slug: "yi-zhou-shu",
    languageCode: "zh",
    authorSlug: "zhou-scribes",
    description:
      "A collection of Zhou dynasty documents not included in the canonical Book of Documents, containing royal speeches, administrative records, military proclamations, and ritual prescriptions. These texts offer a less idealized view of early Zhou governance than the canonical Shangshu and preserve material on the Zhou conquest of Shang and early administrative practice.",
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
      "An encyclopedic work on Han dynasty customs, beliefs, etymology, and popular practices, organized into sections on ancient rulers, ritual, music, spirits, and geography. Ying Shao wrote to correct popular misconceptions and preserve accurate accounts of folk customs, making this a key source for Han social and religious history.",
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
      "Biographies of hermits, recluses, and scholars who refused official appointment, covering figures from mythical antiquity through the Han dynasty. The work celebrates the counter-tradition of withdrawal from public life, presenting refusal of office as a form of moral integrity rather than social failure.",
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
      "A kalambakam (multi-genre anthology) of 114 poems praising the Pallava king Nandivarman III, showcasing diverse Tamil verse forms including venba, kalithurai, and viruttam. The kalambakam genre requires poets to demonstrate mastery across many distinct meters and moods, making it both a royal panegyric and a virtuosic display of Tamil poetic technique.",
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
      "A Jain Tamil narrative poem in five cantos tracing the karmic consequences of a single act of violence through multiple animal rebirths — peacock, dog, snake, boar, fish, goat, and rooster. King Yashodhara and Queen Chandramati cycle through these births until they attain human form again, illustrating the Jain doctrines of karma, ahimsa, and the path to liberation.",
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
      "A Jain Tamil narrative poem in six cantos tracing Prince Udayana of the Vatsa kingdom through adventures, marriages, and battles to his eventual renunciation of worldly life. Part of the Perunkathai (Great Narrative) tradition shared across Indian literatures, the poem uses Udayana's journey to illustrate the Jain path from worldly entanglement to spiritual liberation.",
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
      "An anonymous early Christian apologetic letter defending Christianity to a pagan inquirer. Notable for its polished Greek rhetoric and its striking description of Christians as 'resident aliens' who 'dwell in their own fatherlands, but as sojourners.' One of the most eloquent surviving texts of early Christian self-definition.",
    sourceUrl: "https://github.com/OpenGreekAndLatin/First1KGreek",
    processedDir: "data/processed/diognetum",
    compositionYear: 180,
    compositionEra: "Late 2nd century CE",
  },
  {
    title: "The Orations of Gregory the Theologian",
    titleOriginalScript: "Λόγοι τοῦ ἁγίου Γρηγορίου τοῦ Θεολόγου",
    slug: "gregory-orations",
    languageCode: "grc",
    authorSlug: "gregory-nazianzus",
    genre: "philosophy",
    description:
      "The 45 surviving orations of St. Gregory of Nazianzus (Gregory the Theologian), the preeminent Christian orator of late antiquity. The collection includes the Five Theological Orations (27–31) on the Trinity, funeral panegyrics for his brother Caesarius, sister Gorgonia, father, and friend Basil the Great, invectives against the emperor Julian, and homilies on liturgical feasts. Gregory's mastery of Attic rhetoric established the norms of Christian preaching for a millennium.",
    sourceUrl: "https://www.greekdownloads.gr/pateres/grhgorios-nazianzhnos",
    processedDir: "data/processed/gregory-orations",
    compositionYear: 380,
    compositionEra: "4th century CE, Late Roman Empire",
  },
  {
    title: "New History (Historia Nova)",
    titleOriginalScript: "Ἱστορία Νέα",
    slug: "historia-nova",
    languageCode: "grc",
    authorSlug: "zosimus",
    description:
      "A pagan history of the Roman Empire in six books, covering from Augustus to the sack of Rome by Alaric in 410 CE. Zosimus attributes Rome's decline to the abandonment of the traditional gods — a direct counter-narrative to Christian triumphalism. A major source for late Roman political and military history, particularly for the 4th and 5th centuries.",
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
      "A Byzantine paraphrase of Aristotle's Sophistical Refutations, restating his analysis of fallacious arguments and debating tricks in more accessible prose Greek. The text served as a teaching tool in Byzantine higher education, where Aristotelian logic formed the backbone of the philosophical curriculum.",
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
      "A vast compendium of ancient and medieval scholarship on Homer's Odyssey, covering all 24 books with philological, mythological, and historical annotation. Eustathius preserves fragments of dozens of lost commentaries and lexica, making this not only the most comprehensive medieval Homer commentary but an irreplaceable repository of ancient Greek literary scholarship.",
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
      "A geographical survey of the seas beyond the Mediterranean, covering the coasts of Africa, Arabia, India, and the Far East in two books. Drawing on earlier sources now partly lost, it preserves Greco-Roman knowledge of Indian Ocean trade routes, coastal settlements, and distances between ports in the ancient world.",
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
      "An epitome of the lost Periplus of the Inner Sea by Menippus of Pergamon, preserving a condensed geographical survey of Mediterranean coastlines and distances between ports. The original work by Menippus is otherwise lost, making Marcianus' summary the primary surviving witness to this Hellenistic coastal geography.",
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
      "A fragmentary epitome of the eleven-book Geography by Artemidorus of Ephesus, preserving scattered place names, distances, and ethnographic notes from this major Hellenistic geographical work. Artemidorus' original, composed around 100 BCE, drew on personal travel and was widely cited in antiquity but is otherwise largely lost.",
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
      "An anonymous Byzantine commentary on Hesiod's Theogony, providing section-by-section exegesis with mythological, allegorical, and philosophical interpretations. The commentator reads Hesiod's genealogy of the gods through layers of Neoplatonic and Christian allegory, seeking rational meaning behind the myths of cosmic origins.",
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
      "A collection of 44 chapters recording dialogues and anecdotes of Confucius with his disciples and rulers, covering governance, ritual, music, virtue, and the exemplary person. Overlapping with but distinct from the Analects, it preserves traditions about Confucius that circulated independently, offering a broader picture of early Confucian oral teaching than any single canonical text.",
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
      "The Analects of Confucius presented with He Yan's collected commentary (drawing on earlier Han and Wei interpretations) and Xing Bing's Song dynasty sub-commentary. This annotated edition was the standard form in which the Analects were read, studied, and tested in the imperial examination system for nearly a millennium.",
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
      "The Mencius presented with Zhao Qi's Han dynasty commentary and Sun Shi's Song dynasty sub-commentary. Mencius's arguments for innate human goodness, the right of rebellion against tyrannical rulers, and the priority of the people over the sovereign made this one of the most politically consequential texts in the Confucian canon.",
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
      "The Classic of Filial Piety with Tang Xuanzong's imperial commentary and Xing Bing's sub-commentary. The shortest of the Thirteen Classics, it presents filial devotion as the root of all virtue and the foundation of social order, extending the principle from family to governance through a dialogue between Confucius and his disciple Zengzi.",
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
      "China's oldest dictionary, organizing words by semantic category — kinship terms, topography, flora, fauna, astronomical bodies, and more. Guo Pu's commentary adds natural-historical observations and identifications, making this an early work of both lexicography and natural history, elevated to canonical status as one of the Thirteen Classics.",
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
      "The Zuo Commentary on the Spring and Autumn Annals — the most detailed narrative history of China's Spring and Autumn period (722-468 BCE) — presented with Du Yu's commentary and Kong Yingda's sub-commentary. Vivid accounts of interstate diplomacy, battles, court intrigues, and ritual disputes make the Zuozhuan both a historical source and a literary masterpiece of early Chinese prose.",
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
      "The Gongyang Commentary on the Spring and Autumn Annals with He Xiu's commentary and Xu Yan's sub-commentary. The Gongyang school reads every word choice in Confucius's chronicle as encoding moral judgment, developing elaborate theories about historical progress, legitimate succession, and the rectification of names that profoundly influenced Chinese political thought.",
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
      "The Guliang Commentary on the Spring and Autumn Annals with Fan Ning's commentary and Yang Shixun's sub-commentary. The Guliang school focuses on ritual propriety and the precise moral weight of individual word choices, reading the chronicle as a handbook of ethical judgment expressed through deliberate variations in phrasing.",
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
      "The Rites of Zhou with Zheng Xuan's commentary and Jia Gongyan's sub-commentary. An idealized blueprint for government administration, organizing the entire state apparatus into six ministries with detailed specifications for every official role, from the Grand Chancellor to market inspectors. It profoundly influenced Chinese political reform movements, most notably Wang Anshi's New Policies.",
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
      "The Ceremonial Rites with Zheng Xuan's commentary and Jia Gongyan's sub-commentary. Step-by-step protocols for capping ceremonies, marriage, archery, court audiences, and funerals, annotated with meticulous textual analysis. The most procedurally exacting of the Three Ritual Classics, prescribing exact positions, gestures, and speeches for each participant.",
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
      "The Book of Rites with Kong Yingda's Orthodox Commentary — the most philosophically rich of the Three Ritual Classics, containing foundational essays on self-cultivation, education, music, mourning, and the moral structure of society. Includes the Great Learning and the Doctrine of the Mean, later extracted by Zhu Xi as two of the Four Books.",
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
      "Selected chapters from the Book of Rites with Zheng Xuan's Han dynasty commentary, including the Great Learning, Doctrine of the Mean, and other key treatises on self-cultivation, education, and ritual theory. Zheng Xuan's annotations connect the ritual prescriptions to their underlying ethical principles.",
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
      "The Book of Changes with Wang Bi's philosophical commentary and Kong Yingda's sub-commentary, covering all 64 hexagrams and the Ten Wings appendices. Wang Bi's approach stripped away Han cosmological numerology in favor of abstract philosophical interpretation, making this edition the standard through which the Yijing was read as a work of philosophy rather than mere divination.",
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
      "The Book of Documents with Kong Anguo's commentary and Kong Yingda's sub-commentary. A collection of speeches, proclamations, and records attributed to ancient rulers from Yao and Shun through the early Zhou dynasty, these texts articulate the earliest Chinese theories of legitimate governance, the Mandate of Heaven, and the ruler's moral responsibility to the people.",
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
      "A civic diary covering two centuries of Roman life (1294-1494), written in a mixture of Romanesco Italian and Latin. The chronicle records papal conclaves, noble faction warfare between Colonna and Orsini, civic governance, and daily life in the city, becoming especially detailed and vivid for the author's own lifetime under popes Sixtus IV and Innocent VIII.",
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
      "A compendium of philological, historical, geographical, and ethical investigations compiled over 30 years. Each entry pursues a question through careful accumulation of evidence — an approach that helped establish the methodology of kaozheng (evidential research) scholarship and influenced generations of Qing-era scholars.",
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
      "A 108-chapter historical novel dramatizing the Spring and Autumn and Warring States periods, drawing on the Zuozhuan, Guoyu, and Shiji. Covers five centuries of interstate warfare, diplomatic cunning, and heroic sacrifice — from the fall of the Western Zhou to the Qin unification — making it the most comprehensive narrative fiction treatment of China's classical age.",
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
      "A 100-chapter fantasy-adventure novel based on the historical voyages of the eunuch admiral Zheng He to Southeast Asia and the Indian Ocean. The narrative blends geography and diplomacy with Buddhist and Daoist supernatural battles, as Immortal Master Jin Bifeng and Celestial Master Zhang protect the fleet against demonic forces in foreign lands. One of the earliest Chinese novels to imagine the world beyond China's borders.",
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
      "A 100-chapter satirical novel exploring karmic retribution through two lifetimes of marriage. A dissolute man who kills a fox spirit and mistreats his wife is reborn as the hapless Di Xichen, tormented by his new wife Xue Sujie — the fox spirit reincarnated for revenge. Valued for its psychologically acute and mordantly funny depiction of household life, domestic abuse, and social mores in the Ming-Qing transition.",
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
      "An autobiographical novel of childhood in an Armenian village under Persian rule, depicting family life, folk customs, religious festivals, and the systematic oppression of Armenian peasants by tax collectors and feudal lords. The vivid, ethnographic detail of village life made it a foundational text of Armenian realist fiction.",
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
      "A historical novel set in 4th-century Armenia during the struggle against Sasanian Persian domination. The conflict between Christianity and Zoroastrianism plays out through the Armenian princely houses, culminating in betrayal, resistance, and sacrifice. The novel shaped Armenian national consciousness by dramatizing the foundational moment when Armenia chose its Christian identity over Persian imperial conformity.",
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
      "An epistolary novel in 23 letters chronicling a young Armenian woman's descent from comfortable bourgeois life into poverty and despair in Tiflis. Her father's gambling debts trigger a cascade of family catastrophe — paralysis, madness, her brother's death — revealed through increasingly desperate letters that chart her psychological disintegration.",
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
      "An eyewitness memoir of the author's journey through Cilicia in the aftermath of the April 1909 Adana massacre. Traveling from Istanbul through devastated Armenian communities, she recorded the destruction, met survivors and orphans, and helped organize relief. A primary historical source for the massacres that killed over 20,000 Armenians in the region.",
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
      "A lyrical modernist prose poem meditating on Armenian identity through vivid portraits of provincial town life — its characters, customs, and struggles. The narrator journeys through Armenia seeking to discover whether Nairi (an ancient name for the Armenian highlands) is a real place or merely 'a cerebral ache, a sickness of the heart.' Written in the aftermath of genocide and revolution, it is a foundational text of modern Armenian literary modernism.",
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
      "A first-person narrative set in the mountains of Syunik, where a recovering traveler encounters 'Sister Anna,' a woman who has anonymously devoted herself to education and village reform. Through her work running schools, training teachers, and challenging harmful customs, the novella presents an idealized portrait of Armenian social activism and the possibility of grassroots transformation in rural communities.",
    sourceUrl: "",
    processedDir: "data/processed/khorhrdavor-miandznuhi",
    compositionYear: 1884,
    compositionEra: "Late 19th century, Russian Armenia",
  },
  {
    title: "The Struggle (Payqar)",
    titleOriginalScript: "\u054a\u0561\u0575\u0584\u0561\u0580",
    slug: "payqar",
    languageCode: "hy",
    authorSlug: "nar-dos",
    description:
      "A psychological novel exploring the inner lives of the Armenian bourgeois intelligentsia, tracing their ideological conflicts, personal compromises, and moral struggles. Nar-Dos brought a new depth of psychological analysis to Armenian fiction, depicting characters caught between traditional values and the pressures of modernization.",
    sourceUrl: "https://hy.wikisource.org/wiki/\u054a\u0561\u0575\u0584\u0561\u0580",
    processedDir: "data/processed/payqar",
    compositionYear: 1911,
    compositionEra: "Early 20th-century Armenian Psychological Realism",
    genre: "literature",
    textType: "prose",
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
      "A historical novel following Julius Caesar from age 18 through his first consulship (82-59 BCE), depicting his entanglements with Sallust, Catiline, Crassus, Pompey, and Cicero against the backdrop of the Catilinarian conspiracy and the collapse of the Roman Republic. Subtitled 'Roman Scenes,' it uses the episodic format to evoke late Republican Rome with novelistic detail.",
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
      "A panoramic historical novel spanning 100 years of Italian history (1750-1850), following multiple Milanese families through the Enlightenment, French Revolution, Napoleonic era, and early Risorgimento. By using families rather than individuals as protagonists, Rovani achieves a scope comparable to Balzac's Comedie Humaine, charting a full century of social transformation through private lives.",
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
      "Biographies of one hundred eminent generals from the Zhou dynasty to the Five Dynasties, drawn from the seventeen standard histories. Each biography is followed by commentary citing Sun Tzu's Art of War, systematically connecting historical military practice to classical strategic theory. A key text in the Chinese tradition of learning warfare through historical example.",
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
      "A Byzantine world chronicle in 18 books, covering from the biblical creation narrative through ancient Rome to the reign of Alexios I Komnenos (1118 CE). Particularly valuable for preserving substantial passages from lost portions of Cassius Dio's Roman History, Zonaras' chronicle is a major source for periods where other Greek historical texts have been lost.",
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
      "A classical Malay narrative poem in syair quatrains about Siti Zubaidah, who disguises herself as a male warrior and conquers China to rescue her captive husband, Sultan Zainal Abidin. Blending Islamic court culture with Southeast Asian literary conventions, it is one of the most popular Malay syairs, notable for its strong female protagonist who leads armies and navigates between diplomacy and warfare.",
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
      "A biji miscellany in 30 volumes covering Yuan court affairs, ethnic classifications, arts, calligraphy, literature, and Mongol institutional practices. One of the most important primary sources for Yuan-dynasty social and cultural history, preserving detailed accounts of Mongol administration, the four-class ethnic hierarchy, and the arts and customs of a cosmopolitan empire.",
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
      "One of the earliest Tamil novels, following a virtuous princess through moral trials while incorporating social commentary against child marriage, extensive moral philosophy, hygiene advice, and Tamil proverbs. Part didactic treatise, part romance, it reflects the 19th-century Tamil reformist movement that used fiction as a vehicle for social improvement.",
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
      "A collection of 120 essays covering history, philosophy, literature, astronomy, and political thought, written in an elaborate Atticizing Greek prose. Metochites reflects on the instability of fortune, the rise and fall of civilizations, and the consolations of learning, drawing on deep reading of classical authors. Essays 1-81 exist in modern critical editions; the remaining untranslated essays are available here.",
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
      "A novel set in Milan following the failed Italian independence uprisings of 1848-49, following a group of young bohemians through love, betrayal, and political upheaval culminating in the insurrection of 6 February 1853. The novel coined the term 'Scapigliatura' for the Italian movement of anti-bourgeois artists and writers, making it the founding manifesto of Italian literary bohemianism.",
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
      "A novel set in the theatre world of early 19th-century Beijing, depicting the relationships between literati patrons and the young male dan (female-role) performers of the Peking opera stage. The only novel to comprehensively portray this world of aesthetic connoisseurship and homoerotic patronage, it is a key source for understanding Beijing theatrical culture and elite social life under the late Qing.",
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
      "A didactic poem of fatherly advice attributed to Emperor Alexios Komnenos, offering moral and practical counsel in vernacular Greek political verse. The poem counsels a young man on piety, prudence in friendship, comportment at court, and the dangers of vice — a Byzantine mirror for princes in miniature.",
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
      "A short vernacular Greek lament on the devastation wrought by Tamerlane's campaigns in Anatolia and the Near East, likely composed in the aftermath of the Battle of Ankara (1402). The poem registers the shock of Tamerlane's conquests as experienced from the Greek-speaking world.",
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
      "A verse chronicle of a devastating plague that struck Rhodes, recording the suffering, mass death, and social breakdown with the immediacy of an eyewitness account. One of the few medieval Greek poems directly documenting a specific epidemic.",
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
      "A vernacular Greek lament on the sufferings of Crete under Venetian rule, cataloguing the grievances of the Greek Cretan population — heavy taxation, legal inequality, and cultural suppression. A rare voice of colonial discontent from the medieval Greek world.",
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
      "Two collections of autobiographical and moralizing verse offering vivid accounts of the poet's dissolute youth in Cretan cities, his imprisonment, encounters with prostitutes, and eventual turn to moral reflection. Among the most personally revealing medieval Greek poems, they read almost like a picaresque memoir in verse.",
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
      "A satirical vernacular Greek poem advising old men against marrying young women, cataloguing the humiliations and domestic miseries that await the mismatched husband. Part of a broader European tradition of comic-didactic verse on marriage.",
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
      "Five medieval Greek beast fables in verse, including the Poulologos (a parliament of birds debating their relative merits) and tales involving donkeys, wolves, and foxes. These satirical animal poems use the conventions of the beast fable to mock human social hierarchies, monastic life, and courtly pretension.",
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
      "A vernacular Greek poem on the sorrows of living in exile — loneliness, poverty, and the ache of distance from home. The theme of xeniteia (living abroad) resonated deeply in the Byzantine and post-Byzantine Greek world, where economic migration and political exile were common experiences.",
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
      "A short vernacular Greek poem addressed to Venice, reflecting the complex relationship between Greek-speaking subjects and the Venetian Republic that ruled much of the eastern Mediterranean.",
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
      "A vernacular Greek meditation on death addressed to 'bitter and insatiable Hades,' lamenting the universality of mortality and the vanity of worldly achievements. Part of the rich Byzantine tradition of threnos (lamentation) poetry that processed grief through literary convention.",
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
      "An acrostic penitential poem following the 24 letters of the Greek alphabet, meditating on the vanity of worldly life, the inevitability of death, and the need for repentance. The alphabetic structure serves as both a mnemonic device and a symbol of completeness — working through sin from alpha to omega.",
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
      "A medieval Greek verse retelling of the ancient romance of Apollonius of Tyre — a tale of shipwreck, separation, and reunion that circulated across medieval Europe in Latin, English, and many other languages. This Greek version belongs to one of the most widely adapted stories of the pre-modern world, the same narrative that inspired Shakespeare's Pericles.",
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
      "A vernacular Greek verse narrative presenting the life and sayings of a wise elder as a model of practical wisdom and righteous living. The poem blends biographical narrative with gnomic wisdom in the tradition of Byzantine didactic literature.",
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
      "Three medieval Greek poems about the legendary general Belisarius, depicting his military glory and subsequent fall into disgrace — a story that became a byword for the ingratitude of rulers. The legend of Belisarius blinded and begging in the streets, though historically dubious, became one of the most popular narratives in Byzantine and post-Byzantine literature.",
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
      "A scholar-and-beauty romance set against the Taiping Rebellion, interweaving the love affairs of failed scholars and courtesans with the catastrophic civil war that killed tens of millions. Known for its lyrical embedded poetry and its melancholy depiction of literati culture collapsing alongside the Qing social order.",
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
      "A historical novel covering the fall of the Sui dynasty and the rise of the Tang, compiled from earlier fiction and historical sources. Features some of the most beloved characters in Chinese popular culture — the warrior Qin Shubao, the irrepressible Cheng Yaojin, and the future Emperor Taizong Li Shimin — in a sweeping narrative of dynastic collapse and renewal.",
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
      "Short essays recalling the vanished world of late Ming Jiangnan — opera performances, tea connoisseurship, lantern festivals, lake excursions, eccentric friends — written by a former aristocrat reduced to poverty after the Ming collapse. Each essay is a miniature of lost pleasure rendered in luminous prose, making this the supreme example of nostalgic writing in Chinese literature.",
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
      "An opinionated manual of aesthetics and daily life covering drama, music, costume, gardening, architecture, food, and health. Li Yu writes with wit and dogmatic confidence on everything from how to stage a play to how to arrange rocks in a garden, producing the most comprehensive surviving guide to the art of living in late imperial China.",
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
      "The largest and most famous Chinese joke collection, gathering hundreds of jokes organized by type: stupidity, greed, vanity, marital discord, quack doctors, and corrupt officials. The humor is earthy and often bawdy, targeting every level of society from emperors to beggars. First compiled in 1787, it draws on joke traditions stretching back centuries.",
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
      "A collection of poetry criticism combining anecdotes, critical judgments, and hundreds of quoted poems. Yuan Mei champions naturalness and personal feeling over formalist rules, arguing that poetry should express genuine emotion rather than imitate ancient models. His lively, anecdotal style made this the most widely read work of Chinese poetry criticism.",
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
      "The earliest systematic ranking of Chinese poets, grading 122 poets from the Han through the Southern Dynasties into three tiers with critical comments on each. Zhong Rong judges poets by their emotional authenticity and natural imagery, establishing an aesthetic framework that influenced Chinese literary criticism for over a millennium.",
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
      "A work of evidential scholarship investigating textual problems across the Confucian classics, dynastic histories, and philosophical texts. Wang Yinglin traces variant readings, identifies interpolations, and resolves contradictions through meticulous comparison of sources — a methodology that anticipated the kaozheng school by four centuries.",
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
      "An eclectic biji collection covering natural history, folklore, foreign lands, Buddhist and Daoist lore, food, drugs, ghosts, and oddities from across the Tang empire and beyond. Notable for containing the earliest known Chinese Cinderella story ('Ye Xian') and detailed accounts of Central Asian, Indian, and Southeast Asian customs gathered from foreign merchants and monks in Tang Chang'an.",
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
      "Personal notes recording anecdotes about politics, literature, customs, and daily life in the Southern Song, including eyewitness accounts of the border wars with the Jurchen Jin dynasty. Lu You's entries range from court politics and military campaigns to folk medicine, local customs, and literary gossip, offering an intimate view of 12th-century Chinese life.",
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
      "A detailed memoir of urban life in the Northern Song capital Kaifeng before its fall to the Jurchens in 1127, describing markets, restaurants, festivals, entertainments, and daily customs with nostalgic precision. Written in exile after the catastrophe, it preserves the most vivid surviving portrait of a medieval Chinese metropolis at its peak.",
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
      "A biji collection organized into four sections — narratives, anecdotes, literary criticism, and supernatural tales — covering early Qing politics, literature, and society. Wang Shizhen's extensive connections at court and in literary circles gave him access to stories and information unavailable to most writers.",
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
      "A monumental geographical commentary that transformed a terse catalog of 137 rivers into a richly detailed account of landscapes, cities, ruins, legends, and inscriptions along China's waterways. Li Daoyuan's prose descriptions of mountains, gorges, and rapids are celebrated as masterpieces of Chinese landscape writing, making the work both a geographical reference and a literary classic.",
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
      "A provocative collection of essays, letters, and critiques attacking Confucian hypocrisy and championing individual moral autonomy. Li Zhi defends the Water Margin and other vernacular novels as serious literature, argues for women's intellectual equality, and attacks the moral pretensions of establishment scholars — positions so inflammatory that the book was officially banned and Li Zhi imprisoned.",
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
      "A systematic survey of Ming dynasty Confucian thought organized by schools and lineages, covering 202 scholars across 19 intellectual traditions. Often called the first history of philosophy in any language, it traces how Wang Yangming's challenge to Zhu Xi orthodoxy generated a proliferation of competing schools that reshaped Chinese intellectual life.",
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
      "A collection of approximately 1,200 supernatural tales, moral anecdotes, and ghost stories written in a deliberately terse classical style as a counterpoint to Pu Songling's ornate Liaozhai Zhiyi. Ji Yun, the chief editor of the imperial library, uses encounters with foxes, ghosts, and strange phenomena as vehicles for sardonic moral commentary and philosophical reflection.",
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
      "At 154 chapters, the longest pre-modern Chinese novel. The protagonist Wen Suchen, a Neo-Confucian polymath, rises through military and scholarly achievements to become the most powerful figure in the empire while converting the entire known world to orthodox Confucian values. An extraordinary monument to late imperial scholarly ambition and ideological confidence.",
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
      "A didactic novel tracing the moral decline and eventual redemption of a scholar's son who squanders his father's legacy through gambling, bad company, and neglect of study. Set in a vividly realized Henan provincial town, the novel was lost for over a century before its rediscovery in the 1920s. No complete English translation exists.",
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
      "The foundational Chinese martial-arts and detective novel, combining the courtroom justice of Judge Bao with the exploits of righteous swordsmen who fight corruption outside the law. Originating in oral storytelling, it established the conventions of the gong'an (detective) and wuxia (martial arts) genres and has been adapted into countless operas, films, and television series.",
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
      "A roman à clef of late Qing diplomacy, politics, and scandal, following the diplomat Jin Wenqing and the courtesan Fu Caiyun (based on the real Sai Jinhua) through 30 years of Chinese history. One of the four great 'condemnation novels' of the late Qing, it satirizes the corruption and incompetence of a dynasty in terminal decline.",
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
      "A historical novel depicting the founding of the Song dynasty, following Zhao Kuangyin from his youth as a wandering warrior through his rise to the imperial throne. The characters are embellished with mythological origins — Zhao Kuangyin as the incarnation of a red-bearded dragon — blending historical narrative with the conventions of Chinese dynastic-founding romance.",
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
      "A fantastical novel set during the Yongle Emperor's violent usurpation of the throne (1402), centered on the historical rebel leader Tang Sai'er and a cast of female immortals and warriors. The novel uses Daoist supernatural elements and female protagonists to process the trauma of political violence, blending shenmo (gods and demons) conventions with a distinctly lyrical, elegiac sensibility.",
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
      "An anthology of literary Chinese tales from the late Ming and early Qing, curated by the influential literary tastemaker Zhang Chao. The collection showcases biographical sketches, strange tales, travel writing, and character portraits by dozens of authors, preserving many texts that might otherwise have been lost.",
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
      "A ten-chapter comic novella set in a ghost world populated by 'living ghosts,' 'lusty ghosts,' and 'tofu-stew ghosts,' written in a hybrid of Wu dialect (Shanghainese), classical Chinese, and vernacular prose. Much of the humor derives from double meanings that shift between standard Chinese and Wu dialect readings. Championed by Lu Xun and Hu Shi during the New Culture Movement as a pioneering work of dialectal fiction.",
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
      "A detailed record of Southern Song Hangzhou modeled on the earlier Dongjing Menghua Lu for Kaifeng. Documents markets, crafts, festivals, temples, street entertainers, and urban institutions before the Mongol conquest, providing one of the three major sources (alongside Wu Zimu's record and Zhou Mi's) for reconstructing life in medieval Hangzhou.",
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
      "A nostalgic record of Southern Song Hangzhou's court ceremonies, festivals, entertainments, and daily life, compiled after the Mongol conquest by one of the most cultured literati of the Song-Yuan transition. Particularly valuable for its detailed accounts of imperial celebrations, West Lake excursions, and the performing arts.",
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
      "A biji collection covering Southern Song court politics, painting connoisseurship, literary anecdotes, and historical controversies including the political persecution of Zhu Xi. Written from the perspective of a well-connected insider, it preserves politically sensitive accounts of factional struggles and policy debates that official histories suppressed or sanitized.",
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
      "A Song dynasty biji covering poetry criticism, historical anecdotes, philosophical discussions, and political commentary. Notable for its extensive quotation of Song poetry with critical analysis, its discussions of Du Fu and Su Shi, and its eyewitness observations on Southern Song governance and society.",
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
      "Private notes recording political events and anecdotes from the Northern Song, compiled by the historian Sima Guang as material that did not fit the scope of his Zizhi Tongjian. Particularly valuable for firsthand accounts of the Wang Anshi reform controversies and the factional politics of the 11th-century Song court.",
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
      "The most detailed surviving source on the Tang dynasty civil service examinations, recording the social rituals, literary culture, and competitive anxieties of examination candidates. Entries cover everything from the etiquette of congratulating successful examinees to the poetry composed at farewell banquets, illuminating the culture that produced much of classical Chinese poetry.",
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
      "A biji collection recording anecdotes of late Tang through Five Dynasties political life, literary culture, and social customs. Compiled over three decades by a well-connected official who served multiple regimes, it preserves firsthand accounts of the chaotic period when the Tang empire fragmented into competing kingdoms.",
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
      "An early collection of 129 anecdotes and legends about the Western Han capital Chang'an, recording palace intrigues, imperial eccentricities, technical marvels, and urban customs. Though its authorship is disputed, it preserves vivid accounts of Han court culture — including the famous story of Sima Xiangru and Zhuo Wenjun — that became staples of later Chinese literature.",
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
      "A late Qing collection of classical tales in the tradition of Pu Songling's Liaozhai, featuring supernatural love stories, ghost encounters, and tales of fox spirits. Noted for its literary polish and emotional depth, particularly in its treatment of tragic love between humans and spirits.",
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
      "A massive encyclopedic biji organized into five sections — heaven, earth, humanity, things, and affairs — covering astronomy, geography, natural history, customs, technology, and curiosities. Notable for containing the earliest known written reference to the hand game later known as rock-paper-scissors, as well as detailed accounts of Ming commercial and material culture.",
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
      "An early collection of myths, legends, and supernatural tales spanning from the creation of the world to the Jin dynasty, organized by historical period. Includes fantastical accounts of the mythical islands of Penglai and Kunlun, star-crossed immortals, and miraculous objects. A key source for Chinese mythology that influenced later fiction and poetry.",
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
      "A lyrical guide to West Lake in Hangzhou in 72 essays organized by geographic route, written decades after the Ming collapse left the lake's gardens and temples in ruins. Each entry layers personal memory, historical anecdote, and landscape description, creating a portrait of a place that exists more fully in prose than in the changed physical reality.",
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
      "An anthology of 1,238 stories of stratagems and wit drawn from Chinese history, organized by categories of intelligence: military strategy, judicial acumen, political scheming, verbal cleverness, and more. Each story illustrates a particular type of practical wisdom with examples from historical figures, making it both an entertaining collection and a manual of applied intelligence.",
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
      "The largest anthology of love stories in Chinese literature, gathering over 870 stories from official histories, biji, and fiction into 24 categories of love: faithful love, tragic love, jealous love, love between friends, love of beauty, and more. Feng Menglong's arrangement treats qing (emotion, passion) as a fundamental human force deserving systematic study.",
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
      "A work of evidential scholarship investigating the origins of customs, institutions, and received historical claims through critical examination of sources. Zhao Yi traces how practices like foot-binding, the examination system, and regional customs evolved over time, correcting common misconceptions with characteristic wit and methodical rigor.",
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
      "The standard biographical reference for Tang dynasty poets, containing entries for 398 poets arranged by era and quality. Each biography sketches the poet's life, examines his works, and assesses his literary achievement, providing the most comprehensive surviving guide to the personalities behind one of the greatest periods in Chinese poetry.",
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
      "An anthology of witticisms and satirical anecdotes from Chinese history, organized into 36 categories including absurd officials, pedantic scholars, shameless flatterers, and sharp retorts. A companion to Feng Menglong's Zhinang (wisdom) and Qingshi (love), this volume completes his encyclopedic survey of human behavior through its comic and ironic dimensions.",
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
      "An encyclopedic compendium of 4,000+ entries across 20 categories — from astronomy and geography to arts and botany — designed as a conversational reference for educated travelers. The title refers to the night boats where passengers competed in learned conversation; Zhang Dai compiled the essential facts a gentleman needed to hold his own in such exchanges.",
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
      "A late Qing martial arts novel set during the Zhengde reign, following seven swordsmen and thirteen heroes as they suppress a princely rebellion threatening the Ming throne. Combining wuxia combat with political intrigue and moral righteousness, it was among the most widely read novels of its era and influenced the modern martial arts fiction genre.",
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
      "A biji by a Qing imperial prince of the Aisin Gioro clan, offering insider accounts of court politics, Manchu customs, military campaigns, and Bannerman life from within the ruling house. The author's access to oral traditions and palace gossip makes this an irreplaceable source for aspects of Qing Manchu culture that outsiders could not observe or record.",
    sourceUrl: "https://zh.wikisource.org/wiki/嘯亭雜錄",
    processedDir: "data/processed/xiaoting-zalu",
    compositionYear: 1815,
    compositionEra: "Qing (c. 1815)",
  },
  {
    title: "Dongpo's Records from the Bamboo Grove (Dongpo Zhilin)",
    titleOriginalScript: "東坡志林",
    slug: "dongpo-zhilin",
    languageCode: "zh",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "su-shi",
    description:
      "Informal prose notes and essays written during Su Shi's various exiles, covering philosophy, history, dreams, supernatural encounters, and personal reflections. The entries range from meditations on impermanence and Buddhist thought to humorous anecdotes and observations on local customs, all rendered in Su Shi's characteristically fluid and witty prose.",
    sourceUrl: "https://zh.wikisource.org/wiki/東坡志林",
    processedDir: "data/processed/dongpo-zhilin",
    compositionYear: 1097,
    compositionEra: "Song Dynasty (c. 1097)",
  },
  // Polish Pipeline Texts (11 new)
  {
    title: "Ferments (Fermenty)",
    titleOriginalScript: "Fermenty",
    slug: "fermenty",
    languageCode: "pl",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "wladyslaw-reymont",
    description:
      "A naturalist novel tracing the restless search for meaning by a young woman of the provincial intelligentsia, moving between romantic disillusionment, social ambition, and spiritual crisis. The title's metaphor of fermentation captures the volatile, unsettled state of a generation caught between old certainties and new possibilities in late 19th-century Poland.",
    sourceUrl: "https://pl.wikisource.org/wiki/Fermenty",
    processedDir: "data/processed/fermenty",
    compositionYear: 1897,
    compositionEra: "19th century",
  },
  {
    title: "An Ancient Tale (Stara baśń)",
    titleOriginalScript: "Stara baśń",
    slug: "stara-basn",
    languageCode: "pl",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "jozef-ignacy-kraszewski",
    description:
      "A historical novel set in pre-Christian Poland during the legendary founding of the Piast dynasty, depicting the clash between Slavic paganism and emerging Christianity against a backdrop of tribal politics and foreign threats. The novel reconstructs the world of early Slavic society — its rituals, social structures, and beliefs — at the moment of Polish national origins.",
    sourceUrl: "https://pl.wikisource.org/wiki/Stara_ba%C5%9B%C5%84",
    processedDir: "data/processed/stara-basn",
    compositionYear: 1876,
    compositionEra: "19th century",
  },
  {
    title: "The Hag (Pałuba)",
    titleOriginalScript: "Pałuba",
    slug: "paluba",
    languageCode: "pl",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "karol-irzykowski",
    description:
      "A radically experimental metafictional novel that deconstructs the conventions of psychological realism through a self-aware narrator, embedded critical essays, and fragmented structure. Published in 1903, it anticipated techniques later associated with Joyce, Gide, and Gombrowicz by years. The novel examines the impossibility of truly knowing another person — or of honestly representing them in fiction.",
    sourceUrl: "https://pl.wikisource.org/wiki/Pa%C5%82uba_(Irzykowski)",
    processedDir: "data/processed/paluba",
    compositionYear: 1903,
    compositionEra: "20th century",
  },
  {
    title: "Sisyphean Labors (Syzyfowe prace)",
    titleOriginalScript: "Syzyfowe prace",
    slug: "syzyfowe-prace",
    languageCode: "pl",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "stefan-zeromski",
    description:
      "A novel about the Russification of Polish youth in a gymnasium under the Russian partition, following students who are forbidden to speak Polish or learn Polish history. The 'Sisyphean labors' of the title refer both to the imperial project of cultural erasure and to the students' stubborn, seemingly futile resistance that eventually kindles their national consciousness.",
    sourceUrl: "https://pl.wikisource.org/wiki/Syzyfowe_prace",
    processedDir: "data/processed/syzyfowe-prace",
    compositionYear: 1897,
    compositionEra: "19th century",
  },
  {
    title: "The Dziurdzia Family (Dziurdziowie)",
    titleOriginalScript: "Dziurdziowie",
    slug: "dziurdziowie",
    languageCode: "pl",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "eliza-orzeszkowa",
    description:
      "A naturalist peasant novel depicting the murder of a blacksmith's wife by a neighboring family driven by animosity, jealousy, and superstition about witchcraft. Set in rural Poland with unflinching realism, it examines how poverty, ignorance, and folk beliefs about evil can escalate into collective violence.",
    sourceUrl: "https://pl.wikisource.org/wiki/Dziurdziowie",
    processedDir: "data/processed/dziurdziowie",
    compositionYear: 1885,
    compositionEra: "19th century",
  },
  {
    title: "The Wellborn (Bene nati)",
    titleOriginalScript: "Bene nati",
    slug: "bene-nati",
    languageCode: "pl",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "eliza-orzeszkowa",
    description:
      "A novel about an attempted marriage across class lines in rural Poland, as a noblewoman and a peasant face fierce resistance from her noble family. The title ('wellborn') is ironic — the novel questions whether inherited social status has any relationship to genuine moral worth.",
    sourceUrl: "https://pl.wikisource.org/wiki/Bene_nati",
    processedDir: "data/processed/bene-nati",
    compositionYear: 1891,
    compositionEra: "19th century",
  },
  {
    title: "Winter Wheat (Ozimina)",
    titleOriginalScript: "Ozimina",
    slug: "ozimina",
    languageCode: "pl",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "waclaw-berent",
    description:
      "A modernist novel set over a single evening's salon gathering in Warsaw, through which Berent constructs a panoramic portrait of Polish intellectual society at the turn of the 20th century. The title ('winter wheat,' sown in autumn to germinate under snow) suggests ideas planted now that will only bear fruit in a future generation.",
    sourceUrl: "https://pl.wikisource.org/wiki/Ozimina_(Berent)",
    processedDir: "data/processed/ozimina",
    compositionYear: 1911,
    compositionEra: "Young Poland",
  },
  {
    title: "The Vampire (Wampir)",
    titleOriginalScript: "Wampir",
    slug: "wampir",
    languageCode: "pl",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "wladyslaw-reymont",
    description:
      "A psychological novel exploring the world of spiritualism and occultism in early 20th-century Europe, following characters drawn into seances, mesmerism, and claims of psychic phenomena. Reymont treats the supernatural ambiguously — the 'vampire' of the title may be a genuine occult force or a metaphor for the predatory dynamics between the characters.",
    sourceUrl: "https://pl.wikisource.org/wiki/Wampir_(Reymont,_1931)",
    processedDir: "data/processed/wampir",
    compositionYear: 1911,
    compositionEra: "Young Poland",
  },
  {
    title: "General Barcz (Generał Barcz)",
    titleOriginalScript: "Generał Barcz",
    slug: "general-barcz",
    languageCode: "pl",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "juliusz-kaden-bandrowski",
    description:
      "A political novel set in the early Second Polish Republic, depicting the ruthless machinations of a powerful general widely read as a portrait of Jozef Pilsudski. The novel exposes the mechanisms of political power — manipulation, patronage, intimidation — behind the idealistic rhetoric of newly independent Poland.",
    sourceUrl: "https://pl.wikisource.org/wiki/Genera%C5%82_Barcz",
    processedDir: "data/processed/general-barcz",
    compositionYear: 1923,
    compositionEra: "Interwar period",
  },
  {
    title: "The Boor (Cham)",
    titleOriginalScript: "Cham",
    slug: "cham",
    languageCode: "pl",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "eliza-orzeszkowa",
    description:
      "A tragic novella about a humble Niemen River fisherman's love for a neurotic, sophisticated city woman convalescing in the countryside. Their mutual attraction is destroyed by the unbridgeable gulf between his world of physical labor and natural rhythms and her world of nervous sensitivity and social convention.",
    sourceUrl: "https://pl.wikisource.org/wiki/Cham",
    processedDir: "data/processed/cham",
    compositionYear: 1888,
    compositionEra: "Positivism",
  },
  {
    title: "The History of Sin (Dzieje grzechu)",
    titleOriginalScript: "Dzieje grzechu",
    slug: "dzieje-grzechu",
    languageCode: "pl",
    genre: "literature",
    textType: "prose" as const,
    authorSlug: "stefan-zeromski",
    description:
      "A two-volume naturalist novel tracing the moral downfall of Ewa Pobratynska, a young woman from a respectable family who is seduced, abandoned, and drawn into a spiral of degradation. Zeromski combines psychological realism with fierce social critique, showing how patriarchal society systematically destroys women who fall outside its narrow boundaries of respectability.",
    sourceUrl: "https://pl.wikisource.org/wiki/Dzieje_grzechu",
    processedDir: "data/processed/dzieje-grzechu",
    compositionYear: 1908,
    compositionEra: "Young Poland",
  },
  {
    title: "God Save Us from the Orsenigos (Dio ne scampi dagli Orsenigo)",
    titleOriginalScript: "Dio ne scampi dagli Orsenigo",
    slug: "dio-ne-scampi-dagli-orsenigo",
    textType: "prose" as const,
    genre: "literature",
    languageCode: "it",
    authorSlug: "vittorio-imbriani",
    description:
      "A satirical novel following the intertwined fates of two Milanese families, the Dorias and the Orsenigos, through a tangle of romantic intrigue, social climbing, and moral compromise. Imbriani's sharp wit and dialectal experimentation mark this as a key work of the Scapigliatura movement.",
    sourceUrl: "https://it.wikisource.org/wiki/Dio_ne_scampi_dagli_Orsenigo",
    processedDir: "data/processed/dio-ne-scampi-dagli-orsenigo",
    compositionYear: 1876,
    compositionEra: "Scapigliatura",
  },
  {
    title: "Italian Philosophy in Its Relations with European Philosophy (La filosofia italiana nelle sue relazioni con la filosofia europea)",
    titleOriginalScript: "La filosofia italiana nelle sue relazioni con la filosofia europea",
    slug: "la-filosofia-italiana-spaventa",
    textType: "prose" as const,
    genre: "philosophy",
    languageCode: "it",
    authorSlug: "bertrando-spaventa",
    description:
      "A systematic argument for the continuity of Italian philosophical thought from the Renaissance through German Idealism and back, claiming that Hegel's dialectic was anticipated by Bruno, Campanella, and Vico. Spaventa's lectures reframed Italian philosophy as central, not peripheral, to the European tradition.",
    sourceUrl: "https://it.wikisource.org/wiki/La_filosofia_italiana_nelle_sue_relazioni_con_la_filosofia_europea",
    processedDir: "data/processed/la-filosofia-italiana-spaventa",
    compositionYear: 1862,
    compositionEra: "Italian Hegelianism",
  },
  {
    title: "Psychology as a Positive Science (La psicologia come scienza positiva)",
    titleOriginalScript: "La psicologia come scienza positiva",
    slug: "la-psicologia-come-scienza-positiva",
    textType: "prose" as const,
    genre: "philosophy",
    languageCode: "it",
    authorSlug: "roberto-ardigo",
    description:
      "A foundational work of Italian positivism arguing that psychology must be grounded in empirical observation rather than metaphysical speculation. Ardigò develops a naturalistic framework for understanding mental phenomena as continuous with biological processes.",
    sourceUrl: "https://it.wikisource.org/wiki/La_psicologia_come_scienza_positiva",
    processedDir: "data/processed/la-psicologia-come-scienza-positiva",
    compositionYear: 1870,
    compositionEra: "Italian Positivism",
  },
  {
    title: "Essay on the Duration of the Reigns of the Kings of Rome (Saggio sopra la durata de' regni de' re di Roma)",
    titleOriginalScript: "Saggio sopra la durata de' regni de' re di Roma",
    slug: "saggio-durata-regni-re-di-roma",
    textType: "prose" as const,
    genre: "history",
    languageCode: "it",
    authorSlug: "francesco-algarotti",
    description:
      "A short critical essay examining the traditionally reported lengths of the reigns of Rome's seven kings, applying early statistical reasoning to question the historical reliability of the received chronology.",
    sourceUrl: "https://it.wikisource.org/wiki/Saggio_sopra_la_durata_de%27_regni_de%27_re_di_Roma",
    processedDir: "data/processed/saggio-durata-regni-re-di-roma",
    compositionYear: 1745,
    compositionEra: "Italian Enlightenment",
  },
  {
    title: "On the Civil Renewal of Italy (Del rinnovamento civile d'Italia)",
    titleOriginalScript: "Del rinnovamento civile d'Italia",
    slug: "del-rinnovamento-civile-d-italia",
    textType: "prose" as const,
    genre: "philosophy",
    languageCode: "it",
    authorSlug: "vincenzo-gioberti",
    description:
      "A major political-philosophical treatise of the Risorgimento, written in exile after the failed revolutions of 1848. Gioberti analyzes why Italian unification failed and argues for a renewed civil and moral renewal as the precondition for political independence.",
    sourceUrl: "https://it.wikisource.org/wiki/Del_rinnovamento_civile_d%27Italia",
    processedDir: "data/processed/del-rinnovamento-civile-d-italia",
    compositionYear: 1851,
    compositionEra: "Risorgimento",
  },
  {
    title: "Psychology of Associated Minds (Psicologia delle menti associate)",
    titleOriginalScript: "Psicologia delle menti associate",
    slug: "psicologia-delle-menti-associate",
    textType: "prose" as const,
    genre: "philosophy",
    languageCode: "it",
    authorSlug: "carlo-cattaneo",
    description:
      "Five lectures developing Cattaneo's original theory of collective intelligence, arguing that human thought is fundamentally social and associative rather than individual. A pioneering work in social psychology and the philosophy of collective cognition.",
    sourceUrl: "https://filosofico.net",
    processedDir: "data/processed/psicologia-delle-menti-associate",
    compositionYear: 1859,
    compositionEra: "Risorgimento",
  },
  {
    title: "Confessions of a Metaphysician (Confessioni di un metafisico)",
    titleOriginalScript: "Confessioni di un metafisico",
    slug: "confessioni-di-un-metafisico",
    textType: "prose" as const,
    genre: "philosophy",
    languageCode: "it",
    authorSlug: "terenzio-mamiani",
    description:
      "An autobiographical philosophical work in which Mamiani traces the development of his metaphysical thought through personal experience, intellectual encounters, and the political upheavals of the Risorgimento. A rare first-person account of 19th-century Italian philosophical life.",
    sourceUrl: "https://it.wikisource.org/wiki/Confessioni_di_un_metafisico",
    processedDir: "data/processed/confessioni-di-un-metafisico",
    compositionYear: 1865,
    compositionEra: "Italian Idealism",
  },
  {
    title: "On Sorbets (De' sorbetti)",
    titleOriginalScript: "De' sorbetti",
    slug: "de-sorbetti",
    textType: "prose" as const,
    genre: "science",
    languageCode: "it",
    authorSlug: "filippo-baldini",
    description:
      "A medical-scientific treatise examining the preparation and health effects of sorbets and cold beverages. A charming curiosity of 18th-century Neapolitan medical writing that blends culinary art with Enlightenment-era physiological theory.",
    sourceUrl: "https://archive.org/details/desorbetti",
    processedDir: "data/processed/de-sorbetti",
    compositionYear: 1775,
    compositionEra: "Neapolitan Enlightenment",
  },
  {
    title: "Sri Kalahasteeswara Satakam",
    titleOriginalScript: "శ్రీ కాళహస్తీశ్వర శతకము",
    slug: "sri-kalahasteeswara-satakam",
    languageCode: "te",
    authorSlug: "dhurjati",
    description:
      "A century of devotional verses addressed to Lord Shiva at the Srikalahasti temple. Dhurjati's masterwork blends fervent personal devotion with philosophical inquiry, reflecting on human frailty, divine grace, and the futility of worldly attachment in verses of remarkable lyric intensity.",
    sourceUrl: "https://www.templesinindiainfo.com/sri-kalahasteeswara-satakam-telugu",
    processedDir: "data/processed/sri-kalahasteeswara-satakam",
    compositionYear: 1520,
    compositionEra: "Vijayanagara Empire",
    textType: "poetry" as const,
    genre: "philosophy" as const,
  },
  // Czech Pipeline Texts
  {
    title: "A Momentous Excursion of Mr. Brouček (Nový epochální výlet pana Broučka)",
    titleOriginalScript: "Nový epochální výlet pana Broučka, tentokráte do XV. století",
    slug: "novy-epochalni-vylet-pana-broucka",
    languageCode: "cs",
    authorSlug: "svatopluk-cech",
    description:
      "A satirical novella in which the bumbling Prague burgher Mr. Brouček is transported back to the Hussite Wars of the 15th century. Through comic misadventure and cultural clash, Čech satirizes contemporary Czech complacency by contrasting it with the heroic spirit of the Hussite reformers.",
    sourceUrl: "https://cs.wikisource.org/wiki/Nový_epochální_výlet_pana_Broučka,_tentokráte_do_XV._století",
    processedDir: "data/processed/novy-epochalni-vylet-pana-broucka",
    compositionYear: 1889,
    compositionEra: "Czech National Revival",
    textType: "prose" as const,
    genre: "literature" as const,
  },
  // Latin Pipeline Texts (new — clean Wikisource)
  {
    title: "History of the Discovery of Phosphorus (Historia Inventionis Phosphori)",
    titleOriginalScript: "Historia Inventionis Phosphori",
    slug: "historia-inventionis-phosphori",
    languageCode: "la",
    authorSlug: "gottfried-wilhelm-leibniz",
    description:
      "Leibniz's Latin account of the discovery of phosphorus by Hennig Brand in Hamburg, correcting misconceptions in earlier French reports. A fascinating document of early modern chemistry and the politics of scientific credit.",
    sourceUrl: "https://la.wikisource.org/wiki/Historia_inventionis_phosphori",
    processedDir: "data/processed/historia-inventionis-phosphori",
    compositionYear: 1710,
    compositionEra: "Early Enlightenment",
    textType: "prose" as const,
    genre: "science" as const,
  },
  {
    title: "On the Fifteen Problems (De Quindecim Problematibus)",
    titleOriginalScript: "De Quindecim Problematibus",
    slug: "de-quindecim-problematibus",
    languageCode: "la",
    authorSlug: "albertus-magnus",
    description:
      "Albertus Magnus's systematic refutation of fifteen propositions condemned at the University of Paris, addressing questions on the unity of the intellect, the eternity of the world, and the nature of the soul in Aristotelian philosophy.",
    sourceUrl: "https://la.wikisource.org/wiki/De_quindecim_problematibus",
    processedDir: "data/processed/de-quindecim-problematibus",
    compositionYear: 1270,
    compositionEra: "High Medieval Scholasticism",
    textType: "prose" as const,
    genre: "philosophy" as const,
  },
  // Greek Pipeline Texts (new)
  {
    title: "Knowledge of the Patriarchal Thrones (Γνῶσις πατριαρχῶν θρόνων)",
    titleOriginalScript: "Γνῶσις καὶ ἐπίγνωσις τῶν πατριαρχῶν θρόνων",
    slug: "gnosis-patriarchon-thronon",
    languageCode: "grc",
    authorSlug: "anonymous",
    description:
      "A brief Byzantine geographical text describing the jurisdictional boundaries of the five ancient patriarchates — Jerusalem, Rome, Constantinople, Alexandria, and Antioch — enumerating the lands and peoples under each throne's ecclesiastical authority.",
    sourceUrl: "https://el.wikisource.org/wiki/Γνῶσις_καὶ_ἐπίγνωσις_τῶν_πατριαρχῶν_θρόνων",
    processedDir: "data/processed/gnosis-patriarchon-thronon",
    compositionYear: 800,
    compositionEra: "Middle Byzantine",
    textType: "prose" as const,
    genre: "history" as const,
  },
  {
    title: "On the Inequality of Life (Εἰς τὴν τοῦ βίου ἀνισότητα)",
    titleOriginalScript: "Εἰς τὴν τοῦ βίου ἀνισότητα",
    slug: "eis-tin-tou-biou-anisotita",
    languageCode: "grc",
    authorSlug: "christopher-of-mytilene",
    description:
      "A 37-line poem in iambic trimeter addressing God on the injustice of worldly inequality. With bitter eloquence, Christopher demands to know why some feast while others starve, and provocatively suggests that annihilation would be preferable to cosmic unfairness.",
    sourceUrl: "https://archive.org/details/diegedichtedes00chriuoft",
    processedDir: "data/processed/eis-tin-tou-biou-anisotita",
    compositionYear: 1030,
    compositionEra: "Middle Byzantine",
    textType: "poetry" as const,
    genre: "literature" as const,
  },
  {
    title: "Mai ve Siyah (Blue and Black)",
    titleOriginalScript: "Mai ve Siyah",
    slug: "mai-ve-siyah",
    languageCode: "tr",
    genre: "literature" as const,
    textType: "prose" as const,
    authorSlug: "halit-ziya-usakligil",
    description:
      "A landmark Turkish novel following Ahmet Cemil, a young poet in late Ottoman Istanbul, whose literary ambitions and romantic ideals collide with the harsh realities of the press world and social convention. The title's 'Blue and Black' symbolizes the contrast between dreams and disillusionment.",
    sourceUrl: "https://archive.org/details/mai-ve-siyah",
    processedDir: "data/processed/mai-ve-siyah",
    compositionYear: 1897,
    compositionEra: "Late Ottoman",
  },
  // Modern Greek texts
  {
    title: "My Mother's Sin (To Amartima tis Mitros mou)",
    titleOriginalScript: "Το Αμάρτημα της Μητρός μου",
    slug: "to-amartima-tis-mitros-mou",
    languageCode: "el",
    authorSlug: "georgios-vizyinos",
    description:
      "A deeply personal short story by one of the founders of modern Greek prose fiction, exploring family guilt and maternal sacrifice in rural Thrace.",
    sourceUrl: "https://el.wikisource.org/wiki/Το_Αμάρτημα_της_Μητρός_μου",
    processedDir: "data/processed/to-amartima-tis-mitros-mou",
    compositionYear: 1883,
    compositionEra: "19th century",
    textType: "prose" as const,
    genre: "literature" as const,
  },
  {
    title: "Pope Joan (I Papissa Ioanna)",
    titleOriginalScript: "Η Πάπισσα Ιωάννα",
    slug: "i-papissa-ioanna",
    languageCode: "el",
    authorSlug: "emmanuel-roidis",
    description:
      "A satirical novel retelling the medieval legend of a female pope, blending irreverent wit with genuine medieval scholarship.",
    sourceUrl: "https://el.wikisource.org/wiki/Η_Πάπισσα_Ιωάννα",
    processedDir: "data/processed/i-papissa-ioanna",
    compositionYear: 1866,
    compositionEra: "19th century",
    textType: "prose" as const,
    genre: "literature" as const,
  },
  {
    title: "Loukis Laras (Loukis Laras)",
    titleOriginalScript: "Λουκής Λάρας",
    slug: "loukis-laras",
    languageCode: "el",
    authorSlug: "demetrios-vikelas",
    description:
      "A historical novel set during the Greek War of Independence, following a young merchant's coming of age amid revolution and displacement.",
    sourceUrl: "https://el.wikisource.org/wiki/Λουκής_Λάρας",
    processedDir: "data/processed/loukis-laras",
    compositionYear: 1879,
    compositionEra: "19th century",
    textType: "prose" as const,
    genre: "literature" as const,
  },
  // Byzantine Greek texts
  {
    title: "Tale of the Four-Footed Animals (Diegesis Paidiophrastos)",
    titleOriginalScript: "Διήγησις παιδιόφραστος των τετραπόδων ζώων",
    slug: "diegesis-paidiophrastos",
    languageCode: "grc",
    authorSlug: "anonymous-byzantine",
    description:
      "A Byzantine vernacular satirical poem of 1,082 verses in which animals gather in assembly to debate their virtues, a medieval predecessor to Animal Farm.",
    sourceUrl: "https://el.wikisource.org/wiki/Διήγησις_παιδιόφραστος_των_τετραπόδων_ζώων",
    processedDir: "data/processed/diegesis-paidiophrastos",
    compositionYear: 1350,
    compositionEra: "14th century",
    textType: "poetry" as const,
    genre: "literature" as const,
  },
  {
    title: "Tale of the Fruit-Book (Diegesis tou Porikologou)",
    titleOriginalScript: "Διήγησις του Πωρικολόγου",
    slug: "diegesis-tou-porikologou",
    languageCode: "grc",
    authorSlug: "anonymous-byzantine",
    description:
      "A Byzantine allegorical satire in which fruits and vegetables are personified as members of a royal court, with the Quince reigning as emperor.",
    sourceUrl: "https://el.wikisource.org/wiki/Διήγησις_του_Πωρικολόγου",
    processedDir: "data/processed/diegesis-tou-porikologou",
    compositionYear: 1350,
    compositionEra: "14th century",
    textType: "prose" as const,
    genre: "literature" as const,
  },
  {
    title: "The Capture of Thessaloniki by the Normans (Aloseos Thessalonikis)",
    titleOriginalScript: "Ιστορία της αλώσεως της Θεσσαλονίκης υπό των Νορμανδών",
    slug: "aloseos-thessalonikis-normandon",
    languageCode: "grc",
    authorSlug: "eustathius",
    description:
      "An eyewitness account by the Archbishop of Thessaloniki of the Norman sack of 1185, combining personal memoir with historical chronicle.",
    sourceUrl: "https://el.wikisource.org/wiki/Ιστορία_της_αλώσεως_της_Θεσσαλονίκης_υπό_των_Νορμανδών",
    processedDir: "data/processed/aloseos-thessalonikis-normandon",
    compositionYear: 1185,
    compositionEra: "12th century",
    textType: "prose" as const,
    genre: "history" as const,
  },
  {
    title: "Oration on the New Martyr Niketas (Mouzalon Logos eis Nikitan)",
    titleOriginalScript: "Θεοδώρου Μουζάλωνος λόγος εις τον νέον μάρτυρα Νικήταν",
    slug: "mouzalon-logos-eis-nikitan",
    languageCode: "grc",
    authorSlug: "theodore-mouzalon",
    description:
      "A hagiographic oration by the Grand Logothete of the Palaeologan court commemorating the martyrdom of Niketas, a rare witness to early Palaeologan religious politics.",
    sourceUrl: "https://el.wikisource.org/wiki/Θεοδώρου_του_Μουζάλωνος_λόγος_εις_τον_νέον_μάρτυρα_Νικήταν",
    processedDir: "data/processed/mouzalon-logos-eis-nikitan",
    compositionYear: 1280,
    compositionEra: "13th century",
    textType: "prose" as const,
    genre: "history" as const,
  },
  // ── Russian texts ──
  {
    title: "Byzantism and Slavdom (Vizantizm i slavyanstvo)",
    titleOriginalScript: "Византизм и славянство",
    slug: "vizantizm-i-slavyanstvo",
    languageCode: "ru",
    authorSlug: "konstantin-leontiev",
    description:
      "Leontiev's most important work of political philosophy, arguing that Byzantine civilisational principles — not pan-Slavism — should guide Russia's historical destiny. A penetrating cyclical theory of cultures.",
    sourceUrl: "https://ru.wikisource.org/wiki/Византизм_и_Славянство_(Леонтьев)",
    processedDir: "data/processed/vizantizm-i-slavyanstvo",
    compositionYear: 1875,
    compositionEra: "19th century",
    textType: "prose" as const,
    genre: "philosophy" as const,
  },
  {
    title: "Trifles of Archiepiscopal Life (Melochi arkhiyereyskoy zhizni)",
    titleOriginalScript: "Мелочи архиерейской жизни",
    slug: "melochi-arkhiyereyskoy-zhizni",
    languageCode: "ru",
    authorSlug: "nikolai-leskov",
    description:
      "Satirical sketches of the everyday life and mores of Russian Orthodox bishops, drawn from Leskov's deep knowledge of the clergy. A sharp, often comic portrait of ecclesiastical culture in imperial Russia.",
    sourceUrl: "https://ru.wikisource.org/wiki/Мелочи_архиерейской_жизни_(Лесков)",
    processedDir: "data/processed/melochi-arkhiyereyskoy-zhizni",
    compositionYear: 1878,
    compositionEra: "19th century",
    textType: "prose" as const,
    genre: "literature" as const,
  },
  {
    title: "Near the Church Walls, Vol. 1 (Okolo tserkovnykh sten)",
    titleOriginalScript: "Около церковных стен",
    slug: "okolo-tserkovnykh-sten",
    languageCode: "ru",
    authorSlug: "vasily-rozanov",
    description:
      "A collection of religious-philosophical essays by Rozanov on the crisis of the Russian Orthodox Church, the Old Believers, missionaries, and the meaning of faith in modern life. Written in his characteristically aphoristic, provocative style.",
    sourceUrl: "https://ru.wikisource.org/wiki/Около_церковных_стен._Том_первый_(Розанов)",
    processedDir: "data/processed/okolo-tserkovnykh-sten",
    compositionYear: 1906,
    compositionEra: "Early 20th century",
    textType: "prose" as const,
    genre: "philosophy" as const,
  },
  {
    title: "Journey to the Holy Places in 1830 (Puteshestviye ko Svyatym Mestam)",
    titleOriginalScript: "Путешествие ко Святым местам в 1830 году",
    slug: "puteshestviye-ko-svyatym-mestam",
    languageCode: "ru",
    authorSlug: "andrei-muravyov",
    description:
      "A vivid travel narrative of Muravyov's pilgrimage to Constantinople, Jerusalem, and the monasteries of the Levant. A literary sensation upon publication, it inspired Lermontov's Branch of Palestine and revived Russian interest in the Orthodox East.",
    sourceUrl: "https://ru.wikisource.org/wiki/Путешествие_ко_святым_местам_в_1830_году_(Муравьев)",
    processedDir: "data/processed/puteshestviye-ko-svyatym-mestam",
    compositionYear: 1832,
    compositionEra: "19th century",
    textType: "prose" as const,
    genre: "literature" as const,
  },
  {
    title: "The Science of Man (Nauka o cheloveke)",
    titleOriginalScript: "Наука о человеке",
    slug: "nauka-o-cheloveke",
    languageCode: "ru",
    authorSlug: "viktor-nesmelov",
    description:
      "A philosophical anthropology exploring the paradox of human self-consciousness and the relation between the natural and ideal dimensions of human existence. Praised by Berdyaev as a unique achievement of Russian religious thought.",
    sourceUrl: "https://azbyka.ru/otechnik/Nesmelov_Viktor/nauka-o-cheloveke/",
    processedDir: "data/processed/nauka-o-cheloveke",
    compositionYear: 1898,
    compositionEra: "Late 19th century",
    textType: "prose" as const,
    genre: "philosophy" as const,
  },
  {
    title: "The Mother of God (Bogomater)",
    titleOriginalScript: "Богоматерь",
    slug: "bogomater",
    languageCode: "ru",
    authorSlug: "evgeny-poselyanin",
    description:
      "A devotional account of the earthly life of the Theotokos and a comprehensive survey of her miraculous icons venerated across the Orthodox world, arranged by month. A monument of pre-revolutionary Russian piety.",
    sourceUrl: "https://azbyka.ru/fiction/bogomater-opisanie-ee-zemnoj-zhizni-i-chudotvornyx-ikon/",
    processedDir: "data/processed/bogomater",
    compositionYear: 1909,
    compositionEra: "Early 20th century",
    textType: "prose" as const,
    genre: "commentary" as const,
  },
  {
    title: "The Last Days of the Earthly Life of Jesus Christ (Posledniye dni zemnoy zhizni Iisusa Khrista)",
    titleOriginalScript: "Последние дни земной жизни Господа нашего Иисуса Христа",
    slug: "posledniye-dni-zemnoy-zhizni",
    languageCode: "ru",
    authorSlug: "innocent-of-kherson",
    description:
      "A deeply felt meditation on the Passion of Christ by one of Russia's greatest preachers. Its literary power influenced Dostoevsky, and it remains a classic of Russian spiritual prose.",
    sourceUrl: "https://azbyka.ru/otechnik/Innokentij_Hersonskij/poslednie_dni_zhizni_hrista/",
    processedDir: "data/processed/posledniye-dni-zemnoy-zhizni",
    compositionYear: 1830,
    compositionEra: "19th century",
    textType: "prose" as const,
    genre: "commentary" as const,
  },
  {
    title: "Lectures on the History of the Ancient Church, Vol. 1 (Lektsii po istorii Drevney Tserkvi)",
    titleOriginalScript: "Лекции по истории Древней Церкви",
    slug: "lektsii-po-istorii-drevney-tserkvi",
    languageCode: "ru",
    authorSlug: "vasily-bolotov",
    description:
      "The introductory volume of Bolotov's monumental lecture course on early church history, covering methodology, sources, and the historical context of Christianity's first centuries. A cornerstone of Russian historical scholarship.",
    sourceUrl: "https://azbyka.ru/otechnik/Vasilij_Bolotov/lektsii-po-istorii-drevnej-tserkvi/",
    processedDir: "data/processed/lektsii-po-istorii-drevney-tserkvi",
    compositionYear: 1907,
    compositionEra: "Early 20th century",
    textType: "prose" as const,
    genre: "history" as const,
  },
  // Latin Pipeline Batch 2 Texts
  {
    title: "Laertian Analyses (Analecta Laertiana)",
    titleOriginalScript: "Analecta Laertiana",
    slug: "analecta-laertiana",
    languageCode: "la",
    authorSlug: "friedrich-nietzsche",
    description:
      "Nietzsche's Latin philological dissertation on Diogenes Laertius, published in Rheinisches Museum für Philologie (1870). An early scholarly work analyzing passages from the Lives of the Philosophers.",
    sourceUrl: "https://la.wikisource.org/wiki/Analecta_Laertiana",
    processedDir: "data/processed/analecta-laertiana",
    compositionYear: 1870,
    compositionEra: "19th century",
    textType: "prose" as const,
    genre: "commentary" as const,
  },
  {
    title: "What the Stoics Thought About Assent (De assensione Stoici quid senserint)",
    titleOriginalScript: "De assensione Stoici quid senserint",
    slug: "de-assensione-stoici",
    languageCode: "la",
    authorSlug: "victor-brochard",
    description:
      "A 19th-century Latin dissertation on Stoic epistemology, examining the concept of synkatathesis (assent) and its role in Stoic theory of knowledge.",
    sourceUrl: "https://la.wikisource.org/wiki/De_assensione_Stoici_quid_senserint",
    processedDir: "data/processed/de-assensione-stoici",
    compositionYear: 1879,
    compositionEra: "19th century",
    textType: "prose" as const,
    genre: "philosophy" as const,
  },
  {
    title: "On Blessedness (De Beatitudine)",
    titleOriginalScript: "De Beatitudine",
    slug: "de-beatitudine",
    languageCode: "la",
    authorSlug: "anonymous",
    description:
      "A medieval scholastic treatise on the nature of happiness and blessedness, examining whether beatitude exists in rational life alone or in all living beings.",
    sourceUrl: "https://la.wikisource.org/wiki/De_Beatitudine",
    processedDir: "data/processed/de-beatitudine",
    compositionYear: 1300,
    compositionEra: "Medieval",
    textType: "prose" as const,
    genre: "philosophy" as const,
  },
  {
    title: "On the Generation of Stars (De generatione stellarum)",
    titleOriginalScript: "De generatione stellarum",
    slug: "de-generatione-stellarum",
    languageCode: "la",
    authorSlug: "anonymous",
    description:
      "A medieval astronomical treatise discussing Aristotelian concepts of celestial bodies, the sun as principle of generation, and the elemental natures of zodiac signs.",
    sourceUrl: "https://la.wikisource.org/wiki/De_generatione_stellarum",
    processedDir: "data/processed/de-generatione-stellarum",
    compositionYear: 1250,
    compositionEra: "13th century",
    textType: "prose" as const,
    genre: "science" as const,
  },
  {
    title: "On Honest Games (De honestis ludis)",
    titleOriginalScript: "De honestis ludis",
    slug: "de-honestis-ludis",
    languageCode: "la",
    authorSlug: "martin-bucer",
    description:
      "A Reformation-era treatise on appropriate Christian recreations, discussing what forms of play, music, dance, and entertainment are suitable for the faithful.",
    sourceUrl: "https://la.wikisource.org/wiki/De_honestis_ludis",
    processedDir: "data/processed/de-honestis-ludis",
    compositionYear: 1540,
    compositionEra: "Reformation",
    textType: "prose" as const,
    genre: "philosophy" as const,
  },
  {
    title: "On Atmospheric Impressions (De impressionibus aeris)",
    titleOriginalScript: "De impressionibus aeris",
    slug: "de-impressionibus-aeris",
    languageCode: "la",
    authorSlug: "albertus-magnus",
    description:
      "A medieval meteorological treatise by Albertus Magnus discussing weather forecasting based on celestial movements, planetary influences, and zodiac signs.",
    sourceUrl: "https://la.wikisource.org/wiki/De_impressionibus_aeris",
    processedDir: "data/processed/de-impressionibus-aeris",
    compositionYear: 1260,
    compositionEra: "13th century",
    textType: "prose" as const,
    genre: "science" as const,
  },
  {
    title: "On the Intellect (De intellectu)",
    titleOriginalScript: "De intellectu",
    slug: "de-intellectu",
    languageCode: "la",
    authorSlug: "al-farabi",
    description:
      "The medieval Latin translation of Al-Farabi's treatise on the intellect, a key text in the transmission of Arabic philosophy to the Latin West.",
    sourceUrl: "https://la.wikisource.org/wiki/De_intellectu",
    processedDir: "data/processed/de-intellectu",
    compositionYear: 1150,
    compositionEra: "12th century (Latin trans.)",
    textType: "prose" as const,
    genre: "philosophy" as const,
  },
  {
    title: "Brief Norman Chronicle (Breve Chronicon Northmannicum)",
    titleOriginalScript: "Breve Chronicon Northmannicum",
    slug: "breve-chronicon-northmannicum",
    languageCode: "la",
    authorSlug: "anonymous",
    description:
      "A short anonymous chronicle of the Norman conquest of southern Italy (1041–1085), detailing the rise of Robert Guiscard. Authenticity disputed.",
    sourceUrl: "https://la.wikisource.org/wiki/Breve_Chronicon_Northmannicum",
    processedDir: "data/processed/breve-chronicon-northmannicum",
    compositionYear: 1100,
    compositionEra: "12th century",
    textType: "prose" as const,
    genre: "history" as const,
  },
  {
    title: "Brief History of the Kings of Denmark (Brevis historia regum Dacie)",
    titleOriginalScript: "Brevis historia regum Dacie",
    slug: "brevis-historia-regum-dacie",
    languageCode: "la",
    authorSlug: "sven-aggesen",
    description:
      "One of the first coherent histories of Denmark, covering legendary kings from Skiold through the historical period to Knut VI. Written under Archbishop Absalon's patronage.",
    sourceUrl: "https://la.wikisource.org/wiki/Brevis_historia_regum_Dacie_(S)",
    processedDir: "data/processed/brevis-historia-regum-dacie",
    compositionYear: 1187,
    compositionEra: "12th century",
    textType: "prose" as const,
    genre: "history" as const,
  },
  {
    title: "Chronicle of Andrew of Bergamo (Chronicon)",
    titleOriginalScript: "Chronicon",
    slug: "chronicon-andreas-bergomatis",
    languageCode: "la",
    authorSlug: "andreas-bergomatis",
    description:
      "A 9th-century Lombard chronicle continuing Paul the Deacon's history, covering the Lombard-Carolingian transition including kings Liutprand, Desiderius, and Charlemagne's conquest.",
    sourceUrl: "https://la.wikisource.org/wiki/Chronicon_(Andreas_Bergomatis)",
    processedDir: "data/processed/chronicon-andreas-bergomatis",
    compositionYear: 877,
    compositionEra: "9th century",
    textType: "prose" as const,
    genre: "history" as const,
  },
  {
    title: "Chronicle of Benevento (Chronicon Beneventanum)",
    titleOriginalScript: "Chronicon Beneventanum",
    slug: "chronicon-beneventanum",
    languageCode: "la",
    authorSlug: "falco-benevento",
    description:
      "A 12th-century chronicle of Benevento (1102–1139) by one of the first lay chroniclers of medieval Italy, documenting the rise of Norman Roger II of Sicily.",
    sourceUrl: "https://la.wikisource.org/wiki/Chronicon_Beneventanum",
    processedDir: "data/processed/chronicon-beneventanum",
    compositionYear: 1139,
    compositionEra: "12th century",
    textType: "prose" as const,
    genre: "history" as const,
  },
  {
    title: "Lusitanian Chronicle (Chronicon Lusitanum)",
    titleOriginalScript: "Chronicon Lusitanum",
    slug: "chronicon-lusitanum",
    languageCode: "la",
    authorSlug: "anonymous",
    description:
      "A medieval chronicle of Portugal from the Visigothic migrations (311) through Afonso Henriques (1139–1185). Important early Portuguese historiography.",
    sourceUrl: "https://la.wikisource.org/wiki/Chronicon_Lusitanum",
    processedDir: "data/processed/chronicon-lusitanum",
    compositionYear: 1185,
    compositionEra: "12th century",
    textType: "prose" as const,
    genre: "history" as const,
  },
  {
    title: "Chronicle of Events in the Kingdom of Naples (Chronicon Rerum in regno Neapolitano gestarum)",
    titleOriginalScript: "Chronicon Rerum in regno Neapolitano gestarum",
    slug: "chronicon-neapolitanum",
    languageCode: "la",
    authorSlug: "lupus-protospatharius",
    description:
      "A chronicle of Langobardia Minor (805–1102) covering Norman-Byzantine conflicts in southern Italy. Important source for the Norman conquest.",
    sourceUrl: "https://la.wikisource.org/wiki/Chronicon_Rerum_in_regno_Neapolitano_gestarum",
    processedDir: "data/processed/chronicon-neapolitanum",
    compositionYear: 1102,
    compositionEra: "12th century",
    textType: "prose" as const,
    genre: "history" as const,
  },
  {
    title: "On the Cathar Heresy in Lombardy (De haeresi Catharorum in Lombardia)",
    titleOriginalScript: "De haeresi Catharorum in Lombardia",
    slug: "de-haeresi-catharorum",
    languageCode: "la",
    authorSlug: "anonymous",
    description:
      "An anonymous treatise on Italian Catharism (c. 1190–1215), describing the Cathar churches, their ordinations from Bulgaria and Constantinople, and episcopal succession.",
    sourceUrl: "https://la.wikisource.org/wiki/De_haeresi_Catharorum_in_Lombardia",
    processedDir: "data/processed/de-haeresi-catharorum",
    compositionYear: 1210,
    compositionEra: "Early 13th century",
    textType: "prose" as const,
    genre: "history" as const,
  },
  {
    title: "The Lord of Perfect Satisfaction (Ruyi Jun Zhuan)",
    titleOriginalScript: "如意君傳",
    slug: "ruyi-jun-zhuan",
    languageCode: "zh",
    authorSlug: "xu-changling",
    description:
      "A Ming dynasty erotic novella set in the Tang dynasty, chronicling Empress Wu Zetian's rise to power alongside her romantic liaisons, particularly with the fictional Xue Aocao, who receives the title 'Lord of Perfect Satisfaction' (如意君). Written predominantly in Classical Chinese with vernacular dialogue, the text extensively quotes from historical and philosophical works including the Records of the Grand Historian, the Mencius, and the Classic of Poetry. Considered by some scholars as the first Chinese pornographic novel, it profoundly influenced subsequent erotic fiction for over a century. **Content Note:** This text contains explicit sexual content. It is included for its historical and literary significance as a representative work of Ming dynasty erotic fiction.",
    sourceUrl: "https://zh.wikisource.org/wiki/%E5%A6%82%E6%84%8F%E5%90%9B%E5%82%B3",
    processedDir: "data/processed/ruyi-jun-zhuan",
    compositionYear: 1527,
    compositionEra: "Ming Dynasty",
    textType: "prose" as const,
    genre: "literature" as const,
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

