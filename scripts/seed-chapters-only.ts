/**
 * Fast targeted chapter seeder.
 *
 * Usage: pnpm tsx scripts/seed-chapters-only.ts --text <slug> [--text <slug2> ...]
 *
 * Inserts chapters from data/processed/<slug>/chapter-NNN.json into the DB
 * for texts that already exist (authors/texts rows must already be in DB).
 * Uses ON CONFLICT DO NOTHING for safety — idempotent, safe to re-run.
 *
 * This replaces the slow full-catalogue text-catalogue.ts for incremental additions.
 * text-catalogue.ts iterates ALL ~4,300+ chapters doing insert-or-skip on each,
 * which takes minutes. This script only touches the texts you specify.
 */

import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import { validateSourceContent } from "./lib/validate-source-content";

// Load .env.local
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
  console.error("DATABASE_URL not found. Check .env.local");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function main() {
  const args = process.argv.slice(2);
  const slugs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--text" && args[i + 1]) {
      slugs.push(args[i + 1]!);
      i++;
    }
  }

  if (slugs.length === 0) {
    console.error("Usage: pnpm tsx scripts/seed-chapters-only.ts --text <slug> [--text <slug2> ...]");
    process.exit(1);
  }

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const slug of slugs) {
    // Look up text
    const [text] = await db.select().from(schema.texts).where(eq(schema.texts.slug, slug)).limit(1);
    if (!text) {
      console.error(`  SKIP: text "${slug}" not found in DB — add it to text-catalogue.ts first`);
      continue;
    }

    // Find processed dir
    const processedDir = path.join(__dirname, "..", "data", "processed", slug);
    if (!fs.existsSync(processedDir)) {
      console.error(`  SKIP: no processed dir at ${processedDir}`);
      continue;
    }

    // Read chapter files
    const files = fs.readdirSync(processedDir)
      .filter((f: string) => /^chapter-\d+\.json$/.test(f))
      .sort();

    if (files.length === 0) {
      console.error(`  SKIP: no chapter files in ${processedDir}`);
      continue;
    }

    let inserted = 0;
    let skipped = 0;

    for (const file of files) {
      const chapterNum = parseInt(file.replace("chapter-", "").replace(".json", ""), 10);
      const data = JSON.parse(fs.readFileSync(path.join(processedDir, file), "utf-8"));

      const title = data.title || `Chapter ${chapterNum}`;

      // Handle multiple formats:
      // 1. Old format: { paragraphs: ["text1", "text2", ...] } - plain strings
      // 2. New format: { sourceContent: { paragraphs: [{index, text}, ...] } }
      // 3. Mixed format: { paragraphs: [{index, text}, ...] } - objects already
      let sourceContent: { paragraphs: { index: number; text: string }[] };
      if (data.sourceContent?.paragraphs) {
        // New format - already structured correctly
        sourceContent = data.sourceContent;
      } else if (data.paragraphs && Array.isArray(data.paragraphs)) {
        // Check if paragraphs are already objects or plain strings
        const firstPara = data.paragraphs[0];
        if (typeof firstPara === "string") {
          // Old format - convert string[] to {index, text}[]
          sourceContent = {
            paragraphs: data.paragraphs.map((text: string, idx: number) => ({ text, index: idx })),
          };
        } else if (firstPara && typeof firstPara === "object" && "text" in firstPara) {
          // Mixed format - already has {index, text} objects
          sourceContent = { paragraphs: data.paragraphs };
        } else {
          console.error(`  SKIP: ${file} - unrecognized paragraph format`);
          skipped++;
          continue;
        }
      } else {
        console.error(`  SKIP: ${file} - no paragraphs found`);
        skipped++;
        continue;
      }

      // IMPORTANT: Pass object directly to Drizzle, NOT JSON.stringify()
      // Drizzle handles JSONB serialization automatically
      const chapterSlug = `chapter-${chapterNum}`;

      try {
        // Use sql.json() to ensure proper JSONB encoding without double-encoding
        const result = await db.insert(schema.chapters).values({
          textId: text.id,
          chapterNumber: chapterNum,
          title,
          slug: chapterSlug,
          sourceContent: sourceContent as any, // Drizzle will serialize the object correctly
          ordering: chapterNum,
        }).onConflictDoNothing();

        if (result.rowCount && result.rowCount > 0) {
          inserted++;
        } else {
          skipped++;
        }
      } catch (e: any) {
        console.error(`  Error: ${slug} ch ${chapterNum}: ${e.message}`);
        skipped++;
      }
    }

    // Update total_chapters
    await db.update(schema.texts)
      .set({ totalChapters: files.length })
      .where(eq(schema.texts.id, text.id));

    console.log(`  ${slug}: ${files.length} chapters (inserted: ${inserted}, skipped: ${skipped})`);

    // GUARDRAIL: Validate no double-encoding occurred
    if (inserted > 0) {
      const validation = await validateSourceContent(client, slug);
      if (validation.invalid > 0) {
        console.error(`  ⚠️ DOUBLE-ENCODING DETECTED in ${slug}:`);
        validation.issues.forEach((issue) => console.error(`     ${issue}`));
        console.error(`  Run: scripts/lib/validate-source-content.ts to fix`);
      }
    }
    totalInserted += inserted;
    totalSkipped += skipped;
  }

  console.log(`\nDone. Inserted: ${totalInserted}, Skipped: ${totalSkipped}`);
  await client.end();
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
