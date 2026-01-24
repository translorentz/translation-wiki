import fs from "fs";
import path from "path";
import postgres from "postgres";

// Load .env.local manually (last DATABASE_URL wins, matching dotenv behavior)
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
let dbUrl = "";
for (const line of envContent.split("\n")) {
  const match = line.match(/^DATABASE_URL=(.+)$/);
  if (match) {
    dbUrl = match[1].replace(/^['"]|['"]$/g, ""); // strip quotes
  }
}

if (!dbUrl) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = postgres(dbUrl);

async function main() {
  // Find the text
  const [text] = await sql`SELECT id FROM texts WHERE slug = 'hesiod-theogony-exegesis'`;
  if (!text) {
    console.error("Text not found");
    process.exit(1);
  }

  console.log(`Found text with id: ${text.id}`);

  // Get all chapter IDs
  const chapters = await sql`SELECT id FROM chapters WHERE text_id = ${text.id}`;
  const chapterIds = chapters.map((c) => c.id);

  if (chapterIds.length === 0) {
    console.log("No chapters found");
    process.exit(0);
  }

  console.log(`Found ${chapterIds.length} chapters to delete`);

  // Delete translation_versions -> translations -> chapters (in FK order)
  const translations =
    await sql`SELECT id FROM translations WHERE chapter_id = ANY(${chapterIds})`;
  const translationIds = translations.map((t) => t.id);

  console.log(`Found ${translationIds.length} translations to delete`);

  if (translationIds.length > 0) {
    const deletedVersions =
      await sql`DELETE FROM translation_versions WHERE translation_id = ANY(${translationIds})`;
    console.log(`Deleted translation_versions`);

    const deletedTranslations =
      await sql`DELETE FROM translations WHERE id = ANY(${translationIds})`;
    console.log(`Deleted translations`);
  }

  // Also delete any discussion threads and posts for these chapters
  const threads =
    await sql`SELECT id FROM discussion_threads WHERE chapter_id = ANY(${chapterIds})`;
  const threadIds = threads.map((t) => t.id);

  if (threadIds.length > 0) {
    await sql`DELETE FROM discussion_posts WHERE thread_id = ANY(${threadIds})`;
    await sql`DELETE FROM discussion_threads WHERE id = ANY(${threadIds})`;
    console.log(`Deleted ${threadIds.length} discussion threads`);
  }

  await sql`DELETE FROM chapters WHERE text_id = ${text.id}`;
  console.log(`Deleted ${chapterIds.length} chapters`);

  console.log(
    `\nDone! Deleted ${chapterIds.length} chapters, ${translationIds.length} translations`
  );
  await sql.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
