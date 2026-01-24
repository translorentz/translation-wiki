import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/server/db/schema";
import { eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL || "");
const db = drizzle(client, { schema });

async function main() {
  const text = await db.query.texts.findFirst({
    where: eq(schema.texts.slug, "yi-zhou-shu"),
  });
  if (!text) {
    console.log("NOT FOUND");
    process.exit(1);
  }

  const chapters = await db.query.chapters.findMany({
    where: eq(schema.chapters.textId, text.id),
    orderBy: (c, { asc }) => [asc(c.chapterNumber)],
  });

  let translated = 0;
  const untranslated: number[] = [];
  for (const ch of chapters) {
    const t = await db.query.translations.findFirst({
      where: eq(schema.translations.chapterId, ch.id),
    });
    if (t) {
      translated++;
    } else {
      untranslated.push(ch.chapterNumber);
    }
  }

  console.log(`Total chapters: ${chapters.length}`);
  console.log(`Translated: ${translated}`);
  console.log(`Remaining: ${chapters.length - translated}`);
  if (untranslated.length > 0 && untranslated.length <= 20) {
    console.log(`Untranslated chapters: ${untranslated.join(", ")}`);
  } else if (untranslated.length > 20) {
    console.log(`First untranslated: ${untranslated.slice(0, 10).join(", ")} ...`);
  }

  // If some are translated, spot check the first one
  if (translated > 0) {
    const firstTranslated = await db.query.chapters.findFirst({
      where: eq(schema.chapters.textId, text.id),
      orderBy: (c, { asc }) => [asc(c.chapterNumber)],
    });
    if (firstTranslated) {
      const trans = await db.query.translations.findFirst({
        where: eq(schema.translations.chapterId, firstTranslated.id),
        with: { currentVersion: true },
      });
      if (trans && trans.currentVersion) {
        const content = trans.currentVersion.content as any;
        console.log(`\nSpot check Ch1 translation:`);
        console.log(`  Paragraphs: ${content.paragraphs?.length || 0}`);
        if (content.paragraphs && content.paragraphs[0]) {
          console.log(`  First 200 chars: ${content.paragraphs[0].text.substring(0, 200)}`);
        }
      }
    }
  }

  await client.end();
}

main();
