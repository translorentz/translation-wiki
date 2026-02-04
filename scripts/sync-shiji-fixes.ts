/**
 * Sync Shiji fixes to the database.
 *
 * This script updates chapters 2 and 67 with their corrected content,
 * and inserts the missing chapter 22.
 *
 * Usage: pnpm tsx scripts/sync-shiji-fixes.ts
 */

import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "../src/server/db/schema";

// Load .env.local
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

const SHIJI_DIR = path.resolve(__dirname, "../data/processed/24histories/shiji");

async function main() {
  console.log("=== Syncing Shiji Fixes to Database ===\n");

  // Find the Shiji text
  const shijiText = await db.query.texts.findFirst({
    where: eq(schema.texts.slug, "shiji"),
  });

  if (!shijiText) {
    console.error("Shiji text not found in database!");
    process.exit(1);
  }

  console.log(`Found Shiji text: ID ${shijiText.id}`);

  // Process chapters 2, 22, and 67
  const chaptersToSync = [2, 22, 67];

  for (const chapterNum of chaptersToSync) {
    const filePath = path.join(SHIJI_DIR, `chapter-${String(chapterNum).padStart(3, "0")}.json`);

    if (!fs.existsSync(filePath)) {
      console.error(`  [error] File not found: ${filePath}`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const paragraphs: string[] = data.paragraphs || [];

    // Format source_content the same way as the seeding script
    const sourceContent = JSON.stringify({
      paragraphs: paragraphs.map((text: string, idx: number) => ({ text, index: idx })),
    });

    // Format chapter title
    let chapterTitle = data.title || `卷${chapterNum}`;
    // If title is just "卷NNN", add English
    if (/^卷\d+$/.test(chapterTitle)) {
      chapterTitle = `${chapterTitle} (Chapter ${chapterNum})`;
    }

    const chapterSlug = `chapter-${chapterNum}`;

    // Check if chapter exists
    const existingChapter = await db.query.chapters.findFirst({
      where: and(
        eq(schema.chapters.textId, shijiText.id),
        eq(schema.chapters.chapterNumber, chapterNum)
      ),
    });

    if (existingChapter) {
      // Update existing chapter
      await db.update(schema.chapters)
        .set({
          title: chapterTitle,
          sourceContent,
        })
        .where(eq(schema.chapters.id, existingChapter.id));

      console.log(`  [update] Chapter ${chapterNum}: ${paragraphs.length} paragraphs, title: "${chapterTitle}"`);
    } else {
      // Insert new chapter
      await db.insert(schema.chapters).values({
        textId: shijiText.id,
        chapterNumber: chapterNum,
        title: chapterTitle,
        slug: chapterSlug,
        sourceContent,
        ordering: chapterNum,
      });

      console.log(`  [insert] Chapter ${chapterNum}: ${paragraphs.length} paragraphs, title: "${chapterTitle}"`);
    }
  }

  // Update the total_chapters count
  const files = fs.readdirSync(SHIJI_DIR)
    .filter((f: string) => /^chapter-\d+\.json$/.test(f));

  await db.update(schema.texts)
    .set({ totalChapters: files.length })
    .where(eq(schema.texts.id, shijiText.id));

  console.log(`\nUpdated totalChapters to ${files.length}`);
  console.log("\n=== Sync Complete ===");

  await client.end();
}

main().catch((err) => {
  console.error("Sync failed:", err);
  client.end().then(() => process.exit(1));
});
