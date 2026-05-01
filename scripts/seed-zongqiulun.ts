import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../src/server/db/schema";

const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^DATABASE_URL=(.+)$/);
    if (match) {
      process.env.DATABASE_URL = match[1].replace(/^[\u0027\"]|[\u0027\"]$/g, "");
    }
  }
}

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  console.log("=== Seeding Zongqiulun by Ouyang Xiu ===\n");

  const zhLang = await db.query.languages.findFirst({
    where: eq(schema.languages.code, "zh"),
  });
  if (!zhLang) throw new Error("Chinese language not found in database");
  console.log(`Language: ${zhLang.name} (ID: ${zhLang.id})`);

  let author = await db.query.authors.findFirst({
    where: eq(schema.authors.slug, "ouyang-xiu"),
  });

  if (!author) {
    console.log("Creating author: Ouyang Xiu...");
    const [created] = await db
      .insert(schema.authors)
      .values({
        slug: "ouyang-xiu",
        name: "Ouyang Xiu",
        nameZh: "歐陽脩",
        nameOriginalScript: "歐陽脩",
        era: "Northern Song (1007–1072)",
        description:
          "Northern Song scholar-official, historian, and literary reformer (1007–1072). Held the offices of Hanlin Academician, Vice Grand Councillor, and Minister of Rites under emperors Renzong, Yingzong, and Shenzong. Compiled the New History of the Tang (新唐書) with Song Qi and authored the New History of the Five Dynasties (新五代史). As an arbiter of literary taste he led the guwen movement, championing a return to the plain expository prose of Han Yu and Liu Zongyuan against the ornate parallel style then in fashion. He sponsored the early careers of Su Shi, Su Zhe, Wang Anshi, and Zeng Gong, who together with him and his mentor Han Qi are counted among the Eight Masters of the Tang and Song. His critical writings on calligraphy, epigraphy, and poetics — the Jigu Lu (集古錄) being the first systematic catalogue of bronze and stone inscriptions in China — laid foundations for later antiquarian scholarship.",
        descriptionZh:
          "北宋政治家、史學家、文學家（1007–1072）。歷仕仁宗、英宗、神宗三朝，官至翰林學士、樞密副使、參知政事，諡文忠。與宋祁同修《新唐書》，獨撰《新五代史》。倡導古文運動，主張回歸韓愈、柳宗元的散文傳統，反對盛行的駢儷文風，獎掖蘇軾、蘇轍、王安石、曾鞏等後進，同列「唐宋八大家」。所著《集古錄》為中國第一部金石學專著，於書畫、金石、詩話多有開創之功。",
      })
      .onConflictDoNothing()
      .returning();

    if (created) {
      author = created;
      console.log(`Created author: ${created.name} (ID: ${created.id})`);
    } else {
      const fallback = await db.query.authors.findFirst({
        where: eq(schema.authors.slug, "ouyang-xiu"),
      });
      if (!fallback) throw new Error("Failed to create or find ouyang-xiu");
      author = fallback;
      console.log(`Author already existed: ${fallback.name} (ID: ${fallback.id})`);
    }
  } else {
    console.log(`Author exists: ${author.name} (ID: ${author.id})`);
  }

  const existingText = await db.query.texts.findFirst({
    where: eq(schema.texts.slug, "zongqiulun"),
  });

  if (existingText) {
    console.log(`Text exists: ${existingText.title} (ID: ${existingText.id})`);
  } else {
    console.log("Inserting text: Zongqiulun...");
    const [text] = await db
      .insert(schema.texts)
      .values({
        slug: "zongqiulun",
        title: "Discourse on Releasing Prisoners (Zongqiulun)",
        titleOriginalScript: "縱囚論",
        titleZh: "縱囚論",
        authorId: author.id,
        languageId: zhLang.id,
        textType: "prose",
        genre: "literature",
        compositionYear: 1058,
        compositionEra: "Northern Song",
        compositionYearDisplay: "Northern Song, c. 1058",
        description:
          "A short argumentative essay by Ouyang Xiu interrogating the famous incident in 632 CE when Tang Taizong released over three hundred condemned prisoners on the promise that they return on a fixed date to be executed, and was honoured for his clemency when every one of them returned. Ouyang Xiu rejects the conventional reading of the episode as evidence of Taizong\u0027s moral reach, arguing instead that ruler and prisoners had silently colluded in a mutual deception staged for the production of the emperor\u0027s reputation. The essay sets out a general principle that the governance of sage-kings must rest on what is natural to human feeling rather than on extraordinary acts cultivated for fame, and concludes that the release of prisoners cannot be a constant law because it would empty capital punishment of force. The piece is one of the most widely studied examples of Northern Song guwen prose for its terse parallel structures and its method of overturning a received historical judgment by re-examining the motives of its participants.",
        descriptionZh:
          "歐陽脩議論文，質疑唐太宗貞觀六年（632）縱放三百多名死囚使其自歸就死、死囚悉皆如期歸來這一史事的傳統評價。文中指出此事實為君臣心知肚明之共謀：太宗料其必歸而縱之，囚徒料其必赦而歸之，「上下交相賊以成此名」，並非真正的恩德感化。據此提出聖人之治本於人情，不立異以為高，不逆情以干譽；縱囚一事偶為可也，常為則殺人者皆不死，不可以為天下之常法。全篇以對舉句式翻案立論，是北宋古文運動的代表作之一。",
        sourceUrl: "https://zh.wikisource.org/wiki/縱囚論",
        totalChapters: 1,
      })
      .onConflictDoNothing()
      .returning();

    if (text) {
      console.log(`Created text: ${text.title} (ID: ${text.id})`);
    } else {
      console.log("Text insert returned nothing — already exists?");
    }
  }

  await sql.end();
  console.log("\n=== Seeding complete ===");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
