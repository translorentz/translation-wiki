import postgres from "postgres";
import fs from "fs";
import path from "path";

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

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  // Count affected chapters
  const count = await sql`
    SELECT COUNT(*) as cnt
    FROM chapters c
    JOIN texts t ON c.text_id = t.id
    WHERE t.slug = 'lektsii-po-istorii-drevney-tserkvi-v2'
    AND jsonb_typeof(c.source_content) = 'string'
  `;
  console.log(`Affected chapters: ${count[0].cnt}`);

  // Fix them
  const result = await sql`
    UPDATE chapters c
    SET source_content = (c.source_content#>>'{}')::jsonb
    FROM texts t
    WHERE c.text_id = t.id
    AND t.slug = 'lektsii-po-istorii-drevney-tserkvi-v2'
    AND jsonb_typeof(c.source_content) = 'string'
  `;
  console.log(`Fixed: ${result.count} rows`);

  // Verify sample
  const verify = await sql`
    SELECT c.chapter_number,
           jsonb_typeof(c.source_content) as content_type,
           jsonb_array_length(c.source_content->'paragraphs') as para_count
    FROM chapters c
    JOIN texts t ON c.text_id = t.id
    WHERE t.slug = 'lektsii-po-istorii-drevney-tserkvi-v2'
    ORDER BY c.chapter_number
    LIMIT 5
  `;
  console.log("\nVerification (first 5 chapters):");
  for (const v of verify) {
    console.log(`  Ch ${v.chapter_number}: type=${v.content_type}, paras=${v.para_count}`);
  }

  await sql.end();
}
main();
