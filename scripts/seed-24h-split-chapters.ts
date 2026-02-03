/**
 * Seeds the SECOND and THIRD parts of split chapters (b, c suffixes) for 24 Histories.
 *
 * The "a" parts are already seeded with their base chapter number.
 * This script seeds "b" and "c" parts with modified chapter numbers:
 * - 024c → chapterNumber 2403
 * - 099b → chapterNumber 9902
 * - 099c → chapterNumber 9903
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

// Split chapters where we need to add "b" and "c" parts
// (The "a" parts are already seeded with base chapter numbers)
const SPLIT_CHAPTERS: Record<string, string[]> = {
  hanshu: ["024c", "025c", "057c", "064c", "094c", "096c", "097c", "099b", "099c", "100c"],
  "hou-hanshu": ["001c", "010c", "028c", "030c", "040c", "060c", "074c", "079c", "080c", "082c"],
  "jiu-tangshu": [
    "017c", "018c", "019c", "020c", "185c", "186c", "187c", "189c",
    "190b", "190c", "194c", "196c", "199c", "200c"
  ],
  weishu: ["004c", "007c", "019b", "019c", "021c", "083c", "106b", "106c", "107c", "112c"],
  "xin-tangshu": [
    "023c", "027c", "028c", "030c", "043c", "049c", "070c", "071c",
    "072b", "072c", "073c", "074c", "075c", "215c", "216c", "217c",
    "221c", "222b", "222c", "223c", "224c", "225b", "225c"
  ]
};

async function main() {
  console.log("=== Seeding Split Chapter Parts (b, c) ===\n");

  const baseDir = path.resolve(__dirname, "../data/processed/24histories");
  let totalAdded = 0;
  let totalSkipped = 0;

  for (const [slug, chapters] of Object.entries(SPLIT_CHAPTERS)) {
    console.log(`\n--- ${slug} (${chapters.length} parts) ---`);

    // Get text ID
    const text = await db.query.texts.findFirst({
      where: eq(schema.texts.slug, slug),
    });

    if (!text) {
      console.log(`  [ERROR] Text not found: ${slug}`);
      continue;
    }

    const textDir = path.join(baseDir, slug);
    let added = 0;
    let skipped = 0;

    for (const chapterCode of chapters) {
      const filePath = path.join(textDir, `chapter-${chapterCode}.json`);

      if (!fs.existsSync(filePath)) {
        console.log(`  [warn] File not found: chapter-${chapterCode}.json`);
        skipped++;
        continue;
      }

      // Check if already exists by slug
      const existing = await db.query.chapters.findFirst({
        where: and(
          eq(schema.chapters.textId, text.id),
          eq(schema.chapters.slug, `chapter-${chapterCode}`)
        ),
      });

      if (existing) {
        skipped++;
        continue;
      }

      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const paragraphs: string[] = data.paragraphs || [];

      // Parse chapter code
      const numMatch = chapterCode.match(/^(\d+)([a-c])$/);
      if (!numMatch) {
        console.log(`  [warn] Unexpected format: ${chapterCode}`);
        skipped++;
        continue;
      }

      const baseNum = parseInt(numMatch[1], 10);
      const suffix = numMatch[2];

      // Create unique chapter number: base * 100 + suffix offset
      // 024c → 2403, 099b → 9902, 099c → 9903
      const suffixOffset = suffix === "a" ? 1 : suffix === "b" ? 2 : 3;
      const chapterNumber = baseNum * 100 + suffixOffset;

      // Ordering: base * 10 + suffix offset
      const ordering = baseNum * 10 + suffixOffset;

      // Title
      const partLabel = suffix === "a" ? "上" : suffix === "b" ? "中" : "下";
      const partEnglish = suffix === "a" ? "Part 1" : suffix === "b" ? "Part 2" : suffix === "c" ? "Part 2" : "";
      let chapterTitle = data.title || `卷${baseNum}${partLabel}`;
      if (!chapterTitle.includes("(")) {
        chapterTitle = `${chapterTitle} (Chapter ${baseNum} ${partEnglish})`.trim();
      }

      const sourceContent = JSON.stringify({
        paragraphs: paragraphs.map((text: string, idx: number) => ({ text, index: idx })),
      });

      try {
        await db.insert(schema.chapters).values({
          textId: text.id,
          chapterNumber,
          title: chapterTitle,
          slug: `chapter-${chapterCode}`,
          sourceContent,
          ordering,
        });
        console.log(`  [new] chapter-${chapterCode} (num: ${chapterNumber}): ${paragraphs.length} para`);
        added++;
      } catch (e: any) {
        console.error(`  [error] chapter-${chapterCode}: ${e.message}`);
        skipped++;
      }
    }

    // Update total_chapters
    const totalFiles = fs.readdirSync(textDir).filter(f => f.endsWith(".json")).length;
    await db.update(schema.texts)
      .set({ totalChapters: totalFiles })
      .where(eq(schema.texts.id, text.id));

    console.log(`  Added: ${added}, Skipped: ${skipped}`);
    totalAdded += added;
    totalSkipped += skipped;
  }

  console.log("\n=== Summary ===");
  console.log(`Total Added: ${totalAdded}`);
  console.log(`Total Skipped: ${totalSkipped}`);

  await client.end();
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  client.end().then(() => process.exit(1));
});
