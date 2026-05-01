/**
 * Seed Ouyang Xiu Ji - Collected Works of Ouyang Xiu.
 * Author ouyang-xiu (id 592) already exists in DB.
 */

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
      process.env.DATABASE_URL = match[1]!.replace(/^['"]|['"]$/g, "");
    }
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql, { schema });

async function main() {
  const author = await db.query.authors.findFirst({
    where: eq(schema.authors.slug, "ouyang-xiu"),
  });
  if (!author) {
    console.error("Author ouyang-xiu not found in DB!");
    process.exit(1);
  }
  console.log(`Found author: ${author.name} (ID ${author.id})`);

  const language = await db.query.languages.findFirst({
    where: eq(schema.languages.code, "zh"),
  });
  if (!language) {
    console.error("Language zh not found in DB!");
    process.exit(1);
  }
  console.log(`Found language: ${language.name} (ID ${language.id})`);

  const existingText = await db.query.texts.findFirst({
    where: eq(schema.texts.slug, "ouyangxiu-ji"),
  });

  if (existingText) {
    console.log(`Text ouyangxiu-ji already exists (ID ${existingText.id}), skipping text creation.`);
  } else {
    const [text] = await db
      .insert(schema.texts)
      .values({
        title: "Collected Works of Ouyang Xiu (Ouyangxiu Ji)",
        titleOriginalScript: "歐陽脩集",
        titleZh: "歐陽脩集",
        slug: "ouyangxiu-ji",
        languageId: language.id,
        genre: "literature",
        textType: "prose",
        authorId: author.id,
        description: "The 153-juan compilation of Ouyang Xiu's writings, gathering work composed across his career as Hanlin Academician, Vice Grand Councillor, and Minister of Rites under emperors Renzong, Yingzong, and Shenzong. The collection opens with the Jushi Collection (居士集) of fifty juan that Ouyang Xiu himself selected and arranged before his death, comprising the ancient-style and regulated verse of his earlier years (juan 1-12) and the prefaces, records, inscriptions, biographies, epitaphs, expository essays, and political discussions for which he is most studied (juan 13-50). The Jushi Outer Collection (居士外集) and the philosophical dialogue Yi Tongzi Wen (易童子問) on the Yijing follow, together with two large bodies of state writings — the Outer and Inner Drafts (外制集, 內制集) of edicts produced during his service in the Hanlin Academy, the parallel-prose memorials of the Biaozou Shuqi Siliu Ji, and eighteen juan of Zouyi memorials covering matters of personnel, fiscal policy, military preparation, and the Qingli reforms. Specialised volumes preserve his envoy memorials from Hedong and Hebei, the Pu Deliberations on the proper ritual treatment of Yingzong's biological father, and the Chongwen Library Catalogue annotations. Five volumes of biji notebooks — Guitian-lu (歸田錄), Shihua (詩話, the earliest surviving work to bear that title and the founding model of the genre), Bishuo, Shibi, and the travel diary Yuyi-zhi — record anecdotes about Northern Song court life, literary judgments, and observations on calligraphy. The three juan of Shi-yu (詩餘) preserve his ci lyrics, including the Caisangzi cycle on West Lake. Ten juan of Jigu-lu colophons accompany his pioneering Records of Collected Antiquities, the first systematic catalogue of bronze and stone inscriptions in China and a foundational work of antiquarian scholarship. The collection closes with ten juan of personal letters to Han Qi, Mei Yaochen, Sima Guang, his sons, and other correspondents.",
        descriptionZh: "歐陽脩著作之全集，凡一百五十三卷。集前部為其手定之《居士集》五十卷：卷一至十二為古體、近體詩；卷十三至五十收序、記、碑、誌、論、書、行狀、神道碑等諸體散文，乃北宋古文運動代表作之所在。其後為《居士外集》二十五卷、《易童子問》三卷（論《周易》大義），《外制集》、《內制集》共十一卷收翰苑誥詔，《表奏書啓四六集》及《奏議》十八卷錄其官守之奏議文字，論及慶曆新政、人事、財賦、邊防諸大政。又有《河東》、《河北奉使奏草》、《奏事錄》、《濮議》（論英宗追崇生父之禮）、《崇文總目敘釋》。筆記之屬計五卷：《歸田錄》二卷敘北宋朝野故事，《詩話》一卷為現存最早以此為名者，開後世詩話一體之先河，《筆說》、《試筆》各一卷，又有遊宦日記《于役志》。《詩餘》三卷收其詞作，《採桑子》西湖十首尤膾炙人口。《集古錄》及《跋尾》十卷為金石學奠基之作，乃中國最早系統著錄金石銘刻之專書。最後十卷《書簡》收其與韓琦、梅堯臣、司馬光、諸子及友朋往還之私牘。",
        sourceUrl: "https://zh.wikisource.org/wiki/歐陽修集",
        compositionYear: 1072,
        compositionYearDisplay: "Northern Song, 11th century",
        totalChapters: 153,
      })
      .returning();
    console.log(`Created text: ${text.title} (ID ${text.id})`);
  }

  await sql.end();
  console.log("Done. Now run: pnpm tsx scripts/seed-chapters-only.ts --text ouyangxiu-ji");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
