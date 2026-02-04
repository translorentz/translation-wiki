import fs from "fs";
import path from "path";
import postgres from "postgres";

// Load .env.local
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
// Get the last DATABASE_URL (Neon, not localhost)
for (const line of envContent.split("\n")) {
  const match = line.match(/^DATABASE_URL=(.+)$/);
  if (match) {
    process.env.DATABASE_URL = match[1].replace(/^['"]|['"]$/g, "");
    // Don't break - keep going to get the last one
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const sql = postgres(connectionString);

async function check() {
  // First check what slugs exist for Shiji
  const shijiChapters = await sql`
    SELECT slug FROM chapters
    WHERE slug LIKE '%shiji%'
    ORDER BY slug
    LIMIT 5
  `;
  console.log('Sample Shiji slugs:', shijiChapters.map(r => r.slug));

  const result = await sql`
    SELECT slug,
           CASE WHEN source_content::text LIKE '%青州%' THEN 'YES' ELSE 'NO' END as has_qingzhou,
           jsonb_array_length(source_content) as para_count
    FROM chapters
    WHERE slug LIKE '%shiji%'
      AND (slug LIKE '%-2' OR slug LIKE '%-22' OR slug LIKE '%-67')
    ORDER BY slug
  `;

  console.log('Database state:');
  for (const r of result) {
    console.log(`  ${r.slug}: ${r.para_count} paragraphs, has 青州: ${r.has_qingzhou}`);
  }

  await sql.end();
  process.exit(0);
}
check();
