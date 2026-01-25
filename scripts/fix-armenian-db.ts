/**
 * Fixes Armenian text in the database that was corrupted with "Delays" substitution.
 *
 * The seed script is idempotent and skips existing records, so the corrupted data
 * from the initial seed was never updated. This script directly updates the database
 * with the correct Armenian Unicode text.
 *
 * Usage: pnpm tsx scripts/fix-armenian-db.ts
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

// Correct Armenian text using Unicode codepoints to avoid any corruption
const ARMENIAN_LANGUAGE_DISPLAY = "\u0540\u0561\u0575\u0565\u0580\u0565\u0576"; // Հdelays

const ARMENIAN_AUTHORS = [
  {
    slug: "raffi",
    nameOriginalScript: "\u054c\u0561\u0586\u0586\u056b (\u0540\u0561\u056f\u0578\u0562 \u0544\u0565\u056c\u056b\u0584-\u0540\u0561\u056f\u0578\u0562\u0575\u0561\u0576)", // Delays (Հdelays Delays-Delays)
  },
  {
    slug: "perch-proshyan",
    nameOriginalScript: "\u054a\u0565\u0580\u0573 \u054a\u0580\u0578\u0577\u0575\u0561\u0576", // Delays Delays
  },
  {
    slug: "arshagouhi-teotig",
    nameOriginalScript: "\u0531\u0580\u0577\u0561\u0563\u0578\u0582\u0570\u056b \u0539\u0565\u0578\u057f\u056b\u0563", // Delays Delays
  },
  {
    slug: "yeghishe-charents",
    nameOriginalScript: "\u0535\u0572\u056b\u0577\u0565 \u0549\u0561\u0580\u0565\u0576\u0581", // Delays Delays
  },
];

const ARMENIAN_TEXTS = [
  {
    slug: "kaitser",  // Correct slug (not "kaytser")
    titleOriginalScript: "\u053f\u0561\u0575\u0581\u0565\u0580", // Կdelays
  },
  {
    slug: "samvel",
    titleOriginalScript: "\u054d\u0561\u0574\u057e\u0565\u056c", // Սdelays
  },
  {
    slug: "anna-saroyan",
    titleOriginalScript: "\u0531\u0576\u0576\u0561 \u054d\u0561\u0580\u0578\u0575\u0561\u0576", // Աdelays Սdelays
  },
  {
    slug: "yerkir-nairi",
    titleOriginalScript: "\u0535\u0580\u056f\u056b\u0580 \u0546\u0561\u056b\u0580\u056b", // Delays Delays
  },
  {
    slug: "khorhrdavor-miandznuhi",
    titleOriginalScript: "\u053d\u0578\u0580\u0570\u0580\u0564\u0561\u057e\u0578\u0580 \u0544\u056b\u0561\u0576\u0571\u0576\u0578\u0582\u0570\u056b", // Delays Delays
  },
  {
    slug: "arshagouhi-teotig",  // Correct slug (text about Adana, not author)
    titleOriginalScript: "\u0531\u0564\u0561\u0576\u0561\u0575\u056b \u054e\u0565\u0580\u0584\u0565\u0580\u0576 \u0578\u0582 \u0548\u0580\u0562\u0565\u0580\u0568", // Delays Delays delays Delays
  },
];

async function main() {
  console.log("=== Fixing Armenian Text in Database ===\n");

  // Fix Armenian language displayName
  console.log("Fixing Armenian language display name...");
  const langResult = await db
    .update(schema.languages)
    .set({ displayName: ARMENIAN_LANGUAGE_DISPLAY })
    .where(eq(schema.languages.code, "hy"))
    .returning();
  console.log(`  Updated language: ${langResult.length > 0 ? "OK" : "NOT FOUND"}`);

  // Fix Armenian authors
  console.log("\nFixing Armenian author names...");
  for (const author of ARMENIAN_AUTHORS) {
    const result = await db
      .update(schema.authors)
      .set({ nameOriginalScript: author.nameOriginalScript })
      .where(eq(schema.authors.slug, author.slug))
      .returning();
    console.log(`  ${author.slug}: ${result.length > 0 ? "OK" : "NOT FOUND"}`);
  }

  // Fix Armenian text titles
  console.log("\nFixing Armenian text titles...");
  for (const text of ARMENIAN_TEXTS) {
    const result = await db
      .update(schema.texts)
      .set({ titleOriginalScript: text.titleOriginalScript })
      .where(eq(schema.texts.slug, text.slug))
      .returning();
    console.log(`  ${text.slug}: ${result.length > 0 ? "OK" : "NOT FOUND"}`);
  }

  console.log("\n=== Fix complete ===");

  // Verify
  console.log("\nVerifying fixes...");
  const lang = await db.query.languages.findFirst({
    where: eq(schema.languages.code, "hy"),
  });
  console.log(`  Language displayName: ${lang?.displayName}`);

  const authors = await db.query.authors.findMany({
    where: eq(schema.authors.slug, "raffi"),
  });
  console.log(`  Raffi nameOriginalScript: ${authors[0]?.nameOriginalScript}`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
