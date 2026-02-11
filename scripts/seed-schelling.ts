/**
 * Seeds Schelling's Urfassung der Philosophie der Offenbarung.
 * Creates German language (if needed), author, and text entries.
 * Then calls seed-chapters-only.ts for the chapters.
 *
 * Usage: pnpm tsx scripts/seed-schelling.ts
 */

import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
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

const AUTHOR = {
  name: "Friedrich Wilhelm Joseph Schelling",
  nameOriginalScript: "Friedrich Wilhelm Joseph Schelling",
  slug: "schelling",
  era: "German Idealism (1775–1854)",
  description:
    "German philosopher who, along with Fichte and Hegel, founded German Idealism. His thought evolved through distinct phases: early Naturphilosophie, identity philosophy, freedom philosophy, and late 'positive philosophy' engaging with mythology and revelation.",
};

const TEXT = {
  title: "Original Version of the Philosophy of Revelation (Urfassung der Philosophie der Offenbarung)",
  titleOriginalScript: "Urfassung der Philosophie der Offenbarung",
  slug: "urfassung",
  languageCode: "de",
  authorSlug: "schelling",
  description:
    "Schelling's Munich lectures of 1831/32, representing the original articulation of his 'Philosophy of Revelation.' These 83 lectures constitute his mature system of 'positive philosophy,' which seeks to understand the actual process by which God reveals himself through mythology and Christianity. Unlike 'negative philosophy' (pure reason), positive philosophy starts from existence and traces the actual historical unfolding of divine self-manifestation. The text engages deeply with biblical exegesis, patristic theology, and the history of religions, presenting Christianity as the culmination of a cosmic process of divine revelation. This edition, published posthumously by Walter E. Ehrhardt in 1992, preserves Schelling's original lecture manuscript.",
  sourceUrl:
    "https://archive.org/details/urfassung-der-philosophie-der-offenbarung-schelling",
  processedDir: "data/processed/urfassung",
  compositionYear: 1832,
  compositionEra: "19th century",
  textType: "prose" as const,
  genre: "philosophy" as const,
};

async function main() {
  console.log("=== Seeding Schelling Urfassung ===\n");

  // 1. Ensure German language exists
  console.log("1. Checking German language...");
  const existingLang = await db
    .select()
    .from(schema.languages)
    .where(eq(schema.languages.code, "de"))
    .limit(1);

  if (existingLang.length === 0) {
    console.log("   Creating German language entry...");
    await db.insert(schema.languages).values({
      code: "de",
      name: "German",
      displayName: "German",
    });
    console.log("   ✓ German language created");
  } else {
    console.log("   ✓ German language already exists");
  }

  // 2. Get language ID
  const [lang] = await db
    .select()
    .from(schema.languages)
    .where(eq(schema.languages.code, "de"));

  // 3. Create or get author
  console.log("\n2. Checking author...");
  const existingAuthor = await db
    .select()
    .from(schema.authors)
    .where(eq(schema.authors.slug, AUTHOR.slug))
    .limit(1);

  let authorId: string;
  if (existingAuthor.length === 0) {
    console.log(`   Creating author: ${AUTHOR.name}...`);
    const [newAuthor] = await db
      .insert(schema.authors)
      .values({
        name: AUTHOR.name,
        nameOriginalScript: AUTHOR.nameOriginalScript,
        slug: AUTHOR.slug,
        era: AUTHOR.era,
        description: AUTHOR.description,
      })
      .returning();
    authorId = newAuthor.id;
    console.log(`   ✓ Author created with ID: ${authorId}`);
  } else {
    authorId = existingAuthor[0].id;
    console.log(`   ✓ Author already exists with ID: ${authorId}`);
  }

  // 4. Create or get text
  console.log("\n3. Checking text...");
  const existingText = await db
    .select()
    .from(schema.texts)
    .where(eq(schema.texts.slug, TEXT.slug))
    .limit(1);

  let textId: string;
  if (existingText.length === 0) {
    console.log(`   Creating text: ${TEXT.title}...`);
    const [newText] = await db
      .insert(schema.texts)
      .values({
        title: TEXT.title,
        titleOriginalScript: TEXT.titleOriginalScript,
        slug: TEXT.slug,
        languageId: lang.id,
        authorId: authorId,
        description: TEXT.description,
        sourceUrl: TEXT.sourceUrl,
        compositionYear: TEXT.compositionYear,
        compositionEra: TEXT.compositionEra,
        textType: TEXT.textType,
        genre: TEXT.genre,
        totalChapters: 0, // Will be updated by seed-chapters-only.ts
      })
      .returning();
    textId = newText.id;
    console.log(`   ✓ Text created with ID: ${textId}`);
  } else {
    textId = existingText[0].id;
    console.log(`   ✓ Text already exists with ID: ${textId}`);
  }

  // 5. Verify processed files exist
  const processedDir = path.resolve(__dirname, "..", TEXT.processedDir);
  const files = fs
    .readdirSync(processedDir)
    .filter((f) => f.endsWith(".json") && !f.includes("excluded"))
    .sort();

  console.log(`\n4. Found ${files.length} chapter files in ${TEXT.processedDir}`);

  // 6. Now seed chapters using seed-chapters-only.ts
  console.log("\n5. Seeding chapters...");
  const { execSync } = require("child_process");
  try {
    execSync(`pnpm tsx scripts/seed-chapters-only.ts --text ${TEXT.slug}`, {
      cwd: path.resolve(__dirname, ".."),
      stdio: "inherit",
    });
    console.log("\n✓ Chapters seeded successfully");
  } catch (error) {
    console.error("\n✗ Error seeding chapters:", error);
    process.exit(1);
  }

  // 7. Verify final state
  const [finalText] = await db
    .select()
    .from(schema.texts)
    .where(eq(schema.texts.slug, TEXT.slug));

  const chapterCount = await db
    .select()
    .from(schema.chapters)
    .where(eq(schema.chapters.textId, textId));

  console.log("\n=== Summary ===");
  console.log(`Language: German (de)`);
  console.log(`Author: ${AUTHOR.name}`);
  console.log(`Text: ${TEXT.title}`);
  console.log(`Chapters in DB: ${chapterCount.length}`);
  console.log(`Total chapters recorded: ${finalText.totalChapters}`);

  await client.end();
  console.log("\nDone!");
}

main().catch(console.error);
