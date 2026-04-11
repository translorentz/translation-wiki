import fs from "fs";
import path from "path";
import postgres from "postgres";

const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^DATABASE_URL=(.+)$/);
    if (match) {
      process.env.DATABASE_URL = match[1]!.replace(/^['"]|['"]$/g, "");
      break;
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  console.log("Adding Spanish metadata columns...");

  // authors.name_es
  await sql`ALTER TABLE authors ADD COLUMN IF NOT EXISTS name_es varchar(255)`;
  console.log("  + authors.name_es");

  // authors.description_es
  await sql`ALTER TABLE authors ADD COLUMN IF NOT EXISTS description_es text`;
  console.log("  + authors.description_es");

  // texts.title_es
  await sql`ALTER TABLE texts ADD COLUMN IF NOT EXISTS title_es varchar(500)`;
  console.log("  + texts.title_es");

  // texts.description_es
  await sql`ALTER TABLE texts ADD COLUMN IF NOT EXISTS description_es text`;
  console.log("  + texts.description_es");

  // chapters.title_es
  await sql`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS title_es varchar(500)`;
  console.log("  + chapters.title_es");

  // Verify columns exist
  const rows = await sql`
    SELECT table_name, column_name, data_type, character_maximum_length
    FROM information_schema.columns
    WHERE column_name IN ('name_es', 'title_es', 'description_es')
      AND table_name IN ('authors', 'texts', 'chapters')
    ORDER BY table_name, column_name
  `;
  console.log("\nVerification — columns in DB:");
  for (const r of rows) {
    console.log(`  ${r.table_name}.${r.column_name} (${r.data_type}${r.character_maximum_length ? `(${r.character_maximum_length})` : ""})`);
  }

  await sql.end();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
