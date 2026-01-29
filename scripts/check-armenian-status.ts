/**
 * Quick status check for Armenian translations
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import * as fs from "fs";
import * as path from "path";

// Load .env.local
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const m = line.match(/^DATABASE_URL=(.+)$/);
    if (m) process.env.DATABASE_URL = m[1].replace(/^['"]|['"]$/g, "");
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client, { schema });

async function main() {
  // Get Armenian texts status
  const armenianTexts = await db.execute(sql`
    SELECT t.slug, t.title,
      (SELECT COUNT(*) FROM chapters c WHERE c.text_id = t.id) as total_chapters,
      (SELECT COUNT(*) FROM chapters c
       JOIN translations tr ON tr.chapter_id = c.id
       WHERE c.text_id = t.id AND tr.current_version_id IS NOT NULL) as translated_chapters
    FROM texts t
    JOIN languages l ON t.language_id = l.id
    WHERE l.code = 'hy'
    ORDER BY t.title
  `);

  console.log("=== Armenian Texts Translation Status ===\n");
  for (const row of armenianTexts) {
    const total = Number(row.total_chapters);
    const translated = Number(row.translated_chapters);
    const pct = total > 0 ? Math.round((100 * translated) / total) : 0;
    const status = translated === total ? "✅" : translated > 0 ? "🔄" : "❌";
    console.log(`${status} ${row.slug}: ${translated}/${total} (${pct}%)`);
  }

  // Check for gaps (placeholders)
  const gaps = await db.execute(sql`
    SELECT t.slug, COUNT(*) as gap_count
    FROM translations tr
    JOIN chapters c ON c.id = tr.chapter_id
    JOIN texts t ON t.id = c.text_id
    JOIN translation_versions tv ON tv.id = tr.current_version_id
    WHERE tv.content::text LIKE '%[Translation pending%'
    GROUP BY t.slug
    ORDER BY gap_count DESC
  `);

  console.log("\n=== Texts with placeholder gaps ===\n");
  if (gaps.length === 0) {
    console.log("None found - all translations complete!");
  } else {
    for (const row of gaps) {
      console.log(`⚠️  ${row.slug}: ${row.gap_count} chapters with placeholders`);
    }
  }

  await client.end();
}

main().catch(console.error);
