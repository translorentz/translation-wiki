/**
 * Seeds the Twenty-Four Histories (二十四史) into the database.
 *
 * Usage: pnpm tsx scripts/seed-24histories.ts
 *
 * This creates:
 * 1. The "Twenty-four Histories" author
 * 2. All 24 history texts
 * 3. All chapters from data/processed/24histories/<slug>/chapter-NNN.json (cleaned)
 *
 * Safe to re-run: uses insert-or-skip logic.
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

// The Twenty-Four Histories author
const AUTHOR = {
  name: "The Twenty-four Histories",
  nameOriginalScript: "二十四史",
  slug: "twenty-four-histories",
  era: "Various (c. 91 BCE – 1739 CE)",
  description:
    "The Twenty-four Histories (二十四史) are the official histories of Chinese dynasties from legendary times to the Ming dynasty. Compiled over two millennia by court historians, they form the canonical corpus of Chinese historical writing.",
};

// All 24 histories with metadata
const HISTORIES = [
  {
    slug: "shiji",
    titleOriginalScript: "史記",
    titleEnglish: "Records of the Grand Historian",
    expectedChapters: 129,
    compositionYear: -91,
    compositionEra: "Western Han (c. 91 BCE)",
  },
  {
    slug: "hanshu",
    titleOriginalScript: "漢書",
    titleEnglish: "Book of Han",
    expectedChapters: 110,
    compositionYear: 111,
    compositionEra: "Eastern Han (c. 111 CE)",
  },
  {
    slug: "hou-hanshu",
    titleOriginalScript: "後漢書",
    titleEnglish: "Book of Later Han",
    expectedChapters: 130,
    compositionYear: 445,
    compositionEra: "Liu Song (c. 445 CE)",
  },
  {
    slug: "sanguozhi",
    titleOriginalScript: "三國志",
    titleEnglish: "Records of the Three Kingdoms",
    expectedChapters: 65,
    compositionYear: 289,
    compositionEra: "Western Jin (c. 289 CE)",
  },
  {
    slug: "jinshu",
    titleOriginalScript: "晉書",
    titleEnglish: "Book of Jin",
    expectedChapters: 130,
    compositionYear: 648,
    compositionEra: "Tang (648 CE)",
  },
  {
    slug: "songshu",
    titleOriginalScript: "宋書",
    titleEnglish: "Book of Song",
    expectedChapters: 100,
    compositionYear: 493,
    compositionEra: "Southern Qi (c. 493 CE)",
  },
  {
    slug: "nan-qi-shu",
    titleOriginalScript: "南齊書",
    titleEnglish: "Book of Southern Qi",
    expectedChapters: 59,
    compositionYear: 537,
    compositionEra: "Liang (c. 537 CE)",
  },
  {
    slug: "liangshu",
    titleOriginalScript: "梁書",
    titleEnglish: "Book of Liang",
    expectedChapters: 56,
    compositionYear: 636,
    compositionEra: "Tang (636 CE)",
  },
  {
    slug: "chenshu",
    titleOriginalScript: "陳書",
    titleEnglish: "Book of Chen",
    expectedChapters: 36,
    compositionYear: 636,
    compositionEra: "Tang (636 CE)",
  },
  {
    slug: "weishu",
    titleOriginalScript: "魏書",
    titleEnglish: "Book of Wei",
    expectedChapters: 124,
    compositionYear: 554,
    compositionEra: "Northern Qi (554 CE)",
  },
  {
    slug: "bei-qi-shu",
    titleOriginalScript: "北齊書",
    titleEnglish: "Book of Northern Qi",
    expectedChapters: 50,
    compositionYear: 636,
    compositionEra: "Tang (636 CE)",
  },
  {
    slug: "zhoushu",
    titleOriginalScript: "周書",
    titleEnglish: "Book of Zhou",
    expectedChapters: 50,
    compositionYear: 636,
    compositionEra: "Tang (636 CE)",
  },
  {
    slug: "suishu",
    titleOriginalScript: "隋書",
    titleEnglish: "Book of Sui",
    expectedChapters: 85,
    compositionYear: 636,
    compositionEra: "Tang (636 CE)",
  },
  {
    slug: "nanshi",
    titleOriginalScript: "南史",
    titleEnglish: "History of the Southern Dynasties",
    expectedChapters: 80,
    compositionYear: 659,
    compositionEra: "Tang (659 CE)",
  },
  {
    slug: "beishi",
    titleOriginalScript: "北史",
    titleEnglish: "History of the Northern Dynasties",
    expectedChapters: 100,
    compositionYear: 659,
    compositionEra: "Tang (659 CE)",
  },
  {
    slug: "jiu-tangshu",
    titleOriginalScript: "舊唐書",
    titleEnglish: "Old Book of Tang",
    expectedChapters: 214,
    compositionYear: 945,
    compositionEra: "Later Jin (945 CE)",
  },
  {
    slug: "xin-tangshu",
    titleOriginalScript: "新唐書",
    titleEnglish: "New Book of Tang",
    expectedChapters: 248,
    compositionYear: 1060,
    compositionEra: "Northern Song (1060 CE)",
  },
  {
    slug: "jiu-wudaishi",
    titleOriginalScript: "舊五代史",
    titleEnglish: "Old History of the Five Dynasties",
    expectedChapters: 150,
    compositionYear: 974,
    compositionEra: "Northern Song (974 CE)",
  },
  {
    slug: "xin-wudaishi",
    titleOriginalScript: "新五代史",
    titleEnglish: "New History of the Five Dynasties",
    expectedChapters: 74,
    compositionYear: 1072,
    compositionEra: "Northern Song (1072 CE)",
  },
  {
    slug: "songshi",
    titleOriginalScript: "宋史",
    titleEnglish: "History of Song",
    expectedChapters: 496,
    compositionYear: 1345,
    compositionEra: "Yuan (1345 CE)",
  },
  {
    slug: "liaoshi",
    titleOriginalScript: "遼史",
    titleEnglish: "History of Liao",
    expectedChapters: 116,
    compositionYear: 1344,
    compositionEra: "Yuan (1344 CE)",
  },
  {
    slug: "jinshi",
    titleOriginalScript: "金史",
    titleEnglish: "History of Jin",
    expectedChapters: 135,
    compositionYear: 1345,
    compositionEra: "Yuan (1345 CE)",
  },
  {
    slug: "yuanshi",
    titleOriginalScript: "元史",
    titleEnglish: "History of Yuan",
    expectedChapters: 210,
    compositionYear: 1370,
    compositionEra: "Ming (1370 CE)",
  },
  {
    slug: "mingshi",
    titleOriginalScript: "明史",
    titleEnglish: "History of Ming",
    expectedChapters: 332,
    compositionYear: 1739,
    compositionEra: "Qing (1739 CE)",
  },
];

async function main() {
  console.log("=== Seeding Twenty-Four Histories ===\n");

  // Get Chinese language ID
  const chineseLang = await db.query.languages.findFirst({
    where: eq(schema.languages.code, "zh"),
  });
  if (!chineseLang) {
    console.error("Chinese language not found in database! Run seed-db.ts first.");
    process.exit(1);
  }
  console.log(`Chinese language ID: ${chineseLang.id}`);

  // Seed author
  console.log("\nSeeding author...");
  let authorId: number;
  const existingAuthor = await db.query.authors.findFirst({
    where: eq(schema.authors.slug, AUTHOR.slug),
  });
  if (existingAuthor) {
    console.log(`  [skip] ${AUTHOR.name} (exists, ID: ${existingAuthor.id})`);
    authorId = existingAuthor.id;
  } else {
    const [inserted] = await db.insert(schema.authors).values(AUTHOR).returning();
    console.log(`  [new] ${AUTHOR.name} (ID: ${inserted.id})`);
    authorId = inserted.id;
  }

  // Seed texts and chapters
  console.log("\nSeeding texts and chapters...");
  const baseDir = path.resolve(__dirname, "../data/processed/24histories");

  let totalTextsAdded = 0;
  let totalTextsSkipped = 0;
  let totalChaptersAdded = 0;
  let totalChaptersSkipped = 0;

  for (const history of HISTORIES) {
    const textDir = path.join(baseDir, history.slug);
    if (!fs.existsSync(textDir)) {
      console.log(`  [warn] Directory not found: ${history.slug} — skipping`);
      continue;
    }

    // Format title: "Chinese Name (English Name)"
    const title = `${history.titleOriginalScript} (${history.titleEnglish})`;

    // Check if text exists
    let textId: number;
    const existingText = await db.query.texts.findFirst({
      where: and(
        eq(schema.texts.slug, history.slug),
        eq(schema.texts.languageId, chineseLang.id)
      ),
    });

    if (existingText) {
      console.log(`  [skip] ${history.slug} (text exists)`);
      textId = existingText.id;
      totalTextsSkipped++;
    } else {
      const [inserted] = await db.insert(schema.texts).values({
        title,
        titleOriginalScript: history.titleOriginalScript,
        slug: history.slug,
        languageId: chineseLang.id,
        authorId,
        description: `${history.titleEnglish} (${history.titleOriginalScript}), one of the Twenty-four Histories. Composed ${history.compositionEra}.`,
        sourceUrl: `https://ctext.org/${history.slug}`,
        compositionYear: history.compositionYear,
        compositionEra: history.compositionEra,
        textType: "prose",
        genre: "history",
      }).returning();
      console.log(`  [new] ${history.slug} (ID: ${inserted.id})`);
      textId = inserted.id;
      totalTextsAdded++;
    }

    // Read chapter files
    const files = fs.readdirSync(textDir)
      .filter((f: string) => /^chapter-\d+\.json$/.test(f))
      .sort((a: string, b: string) => {
        const numA = parseInt(a.replace("chapter-", "").replace(".json", ""), 10);
        const numB = parseInt(b.replace("chapter-", "").replace(".json", ""), 10);
        return numA - numB;
      });

    if (files.length === 0) {
      console.log(`    [warn] No chapter files found`);
      continue;
    }

    console.log(`    Processing ${files.length} chapters...`);

    let chaptersAdded = 0;
    let chaptersSkipped = 0;

    for (const file of files) {
      const chapterNum = parseInt(file.replace("chapter-", "").replace(".json", ""), 10);
      const filePath = path.join(textDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      // Format chapter title: "卷N (Chapter N)" or use the title from JSON
      let chapterTitle = data.title || `卷${chapterNum}`;
      // If title is just "卷NNN", add English
      if (/^卷\d+$/.test(chapterTitle)) {
        chapterTitle = `${chapterTitle} (Chapter ${chapterNum})`;
      }

      const paragraphs: string[] = data.paragraphs || [];
      const sourceContent = JSON.stringify({
        paragraphs: paragraphs.map((text: string, idx: number) => ({ text, index: idx })),
      });
      const chapterSlug = `chapter-${chapterNum}`;

      try {
        const result = await db.insert(schema.chapters).values({
          textId,
          chapterNumber: chapterNum,
          title: chapterTitle,
          slug: chapterSlug,
          sourceContent,
          ordering: chapterNum,
        }).onConflictDoNothing();

        if (result.rowCount && result.rowCount > 0) {
          chaptersAdded++;
        } else {
          chaptersSkipped++;
        }
      } catch (e: any) {
        console.error(`    Error: ch ${chapterNum}: ${e.message}`);
        chaptersSkipped++;
      }
    }

    // Update total_chapters
    await db.update(schema.texts)
      .set({ totalChapters: files.length })
      .where(eq(schema.texts.id, textId));

    console.log(`    Chapters: added ${chaptersAdded}, skipped ${chaptersSkipped}`);
    totalChaptersAdded += chaptersAdded;
    totalChaptersSkipped += chaptersSkipped;
  }

  console.log("\n=== Summary ===");
  console.log(`Texts: ${totalTextsAdded} added, ${totalTextsSkipped} skipped`);
  console.log(`Chapters: ${totalChaptersAdded} added, ${totalChaptersSkipped} skipped`);
  console.log("\nDone!");

  await client.end();
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  client.end().then(() => process.exit(1));
});
