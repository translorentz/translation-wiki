/**
 * Check for chapters with placeholder or empty paragraphs in their translations.
 * These indicate partial/failed translations that need re-doing.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../src/server/db/schema";

const client = postgres(process.env.DATABASE_URL || "");
const db = drizzle(client, { schema });

interface Para {
  index: number;
  text: string;
}

async function check() {
  const versions = await db.query.translationVersions.findMany({
    columns: { id: true, translationId: true, content: true },
  });

  const problemChapters: Array<{
    text: string;
    chapter: number;
    totalParagraphs: number;
    placeholders: number;
    empty: number;
  }> = [];

  for (const v of versions) {
    const content = v.content as { paragraphs: Para[] } | null;
    if (content === null || content === undefined) continue;
    if (!content.paragraphs) continue;

    const placeholderParas = content.paragraphs.filter(
      (p) => p.text.includes("[Translation pending")
    );
    const emptyParas = content.paragraphs.filter(
      (p) => p.text.trim() === ""
    );

    if (placeholderParas.length > 0 || emptyParas.length > 0) {
      const translation = await db.query.translations.findFirst({
        where: eq(schema.translations.id, v.translationId),
        with: { chapter: { with: { text: true } } },
      });
      if (translation) {
        problemChapters.push({
          text: translation.chapter.text.slug,
          chapter: translation.chapter.chapterNumber,
          totalParagraphs: content.paragraphs.length,
          placeholders: placeholderParas.length,
          empty: emptyParas.length,
        });
      }
    }
  }

  if (problemChapters.length === 0) {
    console.log("No chapters with placeholder or empty paragraphs found. All translations are complete.");
  } else {
    console.log(`Found ${problemChapters.length} chapters with issues:\n`);
    for (const c of problemChapters) {
      const issues: string[] = [];
      if (c.placeholders > 0) issues.push(`${c.placeholders} placeholder(s)`);
      if (c.empty > 0) issues.push(`${c.empty} empty`);
      console.log(
        `  ${c.text} ch${c.chapter}: ${c.totalParagraphs} total paragraphs, ${issues.join(", ")}`
      );
    }
  }

  await client.end();
}

check().catch((err) => {
  console.error(err);
  process.exit(1);
});
