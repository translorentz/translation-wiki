/**
 * Migration script to categorize all texts by genre.
 *
 * Usage: pnpm tsx scripts/categorize-texts.ts
 *
 * Valid genres: philosophy, commentary, literature, history, science
 */

import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../src/server/db/schema";

// Load .env.local manually
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
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

// Genre categorization by text slug
const GENRE_MAP: Record<string, string> = {
  // Philosophy (philosophical/ethical works)
  zhuziyulei: "philosophy",
  chuanxilu: "philosophy",
  "kongzi-jiayu": "philosophy",
  "baihu-tong": "philosophy",
  deanima: "philosophy",
  diognetum: "philosophy",
  "sophistici-elenchi-paraphrasis": "philosophy",
  rizhilu: "philosophy",

  // Commentary (commentaries on other texts)
  "lunyu-zhushu": "commentary",
  "mengzi-zhushu": "commentary",
  "xiaojing-zhushu": "commentary",
  "erya-zhushu": "commentary",
  "zhouyi-zhengyi": "commentary",
  "shangshu-zhengyi": "commentary",
  "zhouli-zhushu": "commentary",
  "yili-zhushu": "commentary",
  "liji-zhengyi": "commentary",
  "liji-zhushu": "commentary",
  "zuozhuan-zhengyi": "commentary",
  "gongyang-zhushu": "commentary",
  "guliang-zhushu": "commentary",
  "eustathius-odyssey": "commentary",
  "hesiod-theogony-exegesis": "commentary",
  "guliang-zhuan": "commentary",

  // Literature (poetry, novels, epics, historical fiction)
  ptochoprodromos: "literature",
  "carmina-graeca": "literature",
  elegia: "literature",
  porunararruppadai: "literature",
  nandikkalambakam: "literature",
  "yashodhara-kaviyam": "literature",
  "udayanakumara-kaviyam": "literature",
  kaitser: "literature",
  samvel: "literature",
  "anna-saroyan": "literature",
  "khorhrdavor-miandznuhi": "literature",
  "yerkir-nairi": "literature",
  "dongzhou-lieguo-zhi": "literature", // Historical novel, not history
  "sanbao-taijian-xiyang-ji": "literature", // Fantasy-adventure novel
  "xingshi-yinyuan-zhuan": "literature", // Satirical novel
  "la-giovinezza-di-giulio-cesare": "literature", // Italian historical novel
  "cento-anni": "literature", // Italian historical novel

  // History (historical narratives, chronicles, biographies - NON-FICTION)
  tongjian: "history",
  "historia-nova": "history",
  lombards: "history",
  regno: "history",
  "diarium-urbis-romae": "history",
  "arshagouhi-teotig": "history",
  "yi-zhou-shu": "history",
  gaoshizhuan: "history",

  // Science (medicine, geography, ritual/ceremonial manuals)
  huangdineijing: "science",
  "periplus-maris-exteri": "science",
  "periplus-maris-interni": "science",
  "artemidori-geographia": "science",
  ceremonialis: "science",
  "yi-li": "science",
  fengsutongyi: "science",
};

async function categorizeTexts() {
  console.log("Starting text categorization...\n");

  // Get all texts from the database
  const texts = await db.select().from(schema.texts);
  console.log(`Found ${texts.length} texts in database.\n`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const text of texts) {
    const genre = GENRE_MAP[text.slug];

    if (!genre) {
      console.log(`[SKIP] ${text.slug}: No genre mapping found (keeping as uncategorized)`);
      notFound++;
      continue;
    }

    if (text.genre === genre) {
      console.log(`[SKIP] ${text.slug}: Already categorized as "${genre}"`);
      skipped++;
      continue;
    }

    await db
      .update(schema.texts)
      .set({ genre })
      .where(eq(schema.texts.id, text.id));

    console.log(`[UPDATE] ${text.slug}: "${text.genre}" -> "${genre}"`);
    updated++;
  }

  console.log("\n========================================");
  console.log("Categorization Summary:");
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (already correct): ${skipped}`);
  console.log(`  No mapping found: ${notFound}`);
  console.log("========================================\n");

  // Verify by querying genre distribution
  const result = await client`
    SELECT genre, COUNT(*) as count
    FROM texts
    GROUP BY genre
    ORDER BY count DESC
  `;

  console.log("Genre Distribution:");
  for (const row of result) {
    console.log(`  ${row.genre}: ${row.count} texts`);
  }

  await client.end();
  console.log("\nDone!");
}

categorizeTexts().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
