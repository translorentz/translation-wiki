import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/server/db/schema";
import { eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL || "");
const db = drizzle(client, { schema });

async function main() {
  const text = await db.query.texts.findFirst({
    where: eq(schema.texts.slug, "yi-zhou-shu"),
    with: { language: true, author: true },
  });
  if (!text) {
    console.log("NOT FOUND");
    process.exit(1);
  }
  console.log("Text:", text.title, "| Lang:", text.language.code, "| Author:", text.author.name);

  const chapters = await db.query.chapters.findMany({
    where: eq(schema.chapters.textId, text.id),
    orderBy: (c, { asc }) => [asc(c.chapterNumber)],
  });
  console.log("Chapters:", chapters.length);

  const ch1 = chapters[0];
  const sc1 = ch1.sourceContent as any;
  console.log("Ch1:", ch1.title, "-", sc1.paragraphs.length, "paragraphs");
  console.log("Sample:", sc1.paragraphs[0].text.substring(0, 100));

  const ch29 = chapters.find((c) => c.chapterNumber === 29);
  if (ch29) {
    const sc29 = ch29.sourceContent as any;
    console.log("\nCh29:", ch29.title, "-", sc29.paragraphs.length, "paragraphs");
    console.log("Sample:", sc29.paragraphs[0].text.substring(0, 100));
  }

  const ch62 = chapters.find((c) => c.chapterNumber === 62);
  if (ch62) {
    const sc62 = ch62.sourceContent as any;
    console.log("\nCh62:", ch62.title, "-", sc62.paragraphs.length, "paragraphs");
    console.log("Sample:", sc62.paragraphs[0].text.substring(0, 100));
  }

  await client.end();
}

main();
