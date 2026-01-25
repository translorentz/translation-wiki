/**
 * Updates the sourceContent for existing chapters of a text in the database.
 *
 * This script is used when the processing script has been improved and
 * the paragraph structure needs to be updated for chapters that already exist.
 *
 * Usage: pnpm tsx scripts/update-chapter-content.ts --text <slug>
 *
 * Example: pnpm tsx scripts/update-chapter-content.ts --text khorhrdavor-miandznuhi
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
  console.error("DATABASE_URL environment variable is not set.");
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

async function main() {
  const args = process.argv.slice(2);
  const textFlagIndex = args.indexOf("--text");

  if (textFlagIndex === -1 || !args[textFlagIndex + 1]) {
    console.error("Usage: pnpm tsx scripts/update-chapter-content.ts --text <slug>");
    process.exit(1);
  }

  const textSlug = args[textFlagIndex + 1];
  console.log(`\n=== Updating chapter content for: ${textSlug} ===\n`);

  // Find the text in the database
  const text = await db.query.texts.findFirst({
    where: eq(schema.texts.slug, textSlug),
  });

  if (!text) {
    console.error(`Error: Text with slug "${textSlug}" not found in database.`);
    process.exit(1);
  }

  console.log(`Found text: ${text.title} (ID: ${text.id})`);

  // Find the processed directory
  const processedDir = `data/processed/${textSlug}`;
  if (!fs.existsSync(processedDir)) {
    console.error(`Error: Processed directory not found: ${processedDir}`);
    process.exit(1);
  }

  // Read all chapter files
  const files = fs
    .readdirSync(processedDir)
    .filter((f) => f.startsWith("chapter-") && f.endsWith(".json"))
    .sort();

  console.log(`Found ${files.length} processed chapter files\n`);

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const file of files) {
    const chapter: ProcessedChapter = JSON.parse(
      fs.readFileSync(path.join(processedDir, file), "utf-8")
    );

    // Find the existing chapter in the database
    const existing = await db.query.chapters.findFirst({
      where: and(
        eq(schema.chapters.textId, text.id),
        eq(schema.chapters.chapterNumber, chapter.chapterNumber)
      ),
    });

    if (!existing) {
      console.log(`  Chapter ${chapter.chapterNumber}: not found in database`);
      notFoundCount++;
      continue;
    }

    // Update the sourceContent
    await db
      .update(schema.chapters)
      .set({
        sourceContent: chapter.sourceContent,
        title: chapter.title,
      })
      .where(eq(schema.chapters.id, existing.id));

    const paragraphCount = chapter.sourceContent.paragraphs.length;
    console.log(`  Chapter ${chapter.chapterNumber}: updated (${paragraphCount} paragraphs)`);
    updatedCount++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Not found: ${notFoundCount}`);
  console.log(`\nNote: Existing translations may now be misaligned with the new paragraph structure.`);
  console.log(`To retranslate, run: pnpm tsx scripts/translate-batch.ts --text ${textSlug} --retranslate`);

  process.exit(0);
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => {
    client.end();
  });
