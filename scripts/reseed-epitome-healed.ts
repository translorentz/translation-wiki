/**
 * Re-seed healed Epitome of Histories paragraphs into existing DB chapters.
 * Updates sourceContent for all 18 chapters.
 */

import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
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
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

const PROCESSED_DIR = path.join(
  __dirname,
  "..",
  "data",
  "processed",
  "epitome-of-histories-final"
);

interface ProcessedChapter {
  chapterNumber: number;
  title: string;
  sourceContent: {
    paragraphs: Array<{ index: number; text: string }>;
  };
}

async function main() {
  const text = await db.query.texts.findFirst({
    where: eq(schema.texts.slug, "epitome-historiarum"),
  });

  if (!text) {
    console.error("ERROR: epitome-historiarum text not found in DB");
    await client.end();
    process.exit(1);
  }

  console.log(`Found text: ${text.title} (id=${text.id})`);

  const files = fs
    .readdirSync(PROCESSED_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  let updated = 0;
  let notFound = 0;

  for (const file of files) {
    const chapter: ProcessedChapter = JSON.parse(
      fs.readFileSync(path.join(PROCESSED_DIR, file), "utf-8")
    );

    const existing = await db.query.chapters.findFirst({
      where: and(
        eq(schema.chapters.textId, text.id),
        eq(schema.chapters.chapterNumber, chapter.chapterNumber)
      ),
    });

    if (!existing) {
      console.log(`  [NOT FOUND] chapter ${chapter.chapterNumber}`);
      notFound++;
      continue;
    }

    await db
      .update(schema.chapters)
      .set({ sourceContent: chapter.sourceContent })
      .where(eq(schema.chapters.id, existing.id));

    const oldCount = (existing.sourceContent as any)?.paragraphs?.length ?? "?";
    const newCount = chapter.sourceContent.paragraphs.length;
    console.log(
      `  [UPDATED] chapter ${chapter.chapterNumber}: ${oldCount} -> ${newCount} paragraphs`
    );
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}, Not found: ${notFound}`);
  await client.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  await client.end();
  process.exit(1);
});
