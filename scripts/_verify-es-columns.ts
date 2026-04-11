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
  let allPassed = true;

  try {
    const r1 = await sql`SELECT name_es FROM authors LIMIT 1`;
    console.log(`authors.name_es queryable — returned ${r1.length} rows`);
  } catch (e) {
    console.error(`FAIL authors.name_es:`, e);
    allPassed = false;
  }

  try {
    const r2 = await sql`SELECT title_es, description_es FROM texts LIMIT 1`;
    console.log(`texts.title_es / description_es queryable — returned ${r2.length} rows`);
  } catch (e) {
    console.error(`FAIL texts.title_es/description_es:`, e);
    allPassed = false;
  }

  try {
    const r3 = await sql`SELECT title_es FROM chapters LIMIT 1`;
    console.log(`chapters.title_es queryable — returned ${r3.length} rows`);
  } catch (e) {
    console.error(`FAIL chapters.title_es:`, e);
    allPassed = false;
  }

  await sql.end();

  if (!allPassed) {
    console.error("VERIFICATION FAILED");
    process.exit(1);
  }
  console.log("ALL ES COLUMNS VERIFIED");
}

main();
