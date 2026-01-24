/**
 * For chapters with empty translation paragraphs, check if the source is also empty.
 * If source is non-empty but translation is empty, this is a genuine gap that needs retranslation.
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

  const genuineGaps: Array<{
    text: string;
    chapter: number;
    gapCount: number;
    gapIndices: number[];
  }> = [];

  for (const v of versions) {
    const content = v.content as { paragraphs: Para[] } | null;
    if (content === null || content === undefined) continue;
    if (!content.paragraphs) continue;

    const emptyParas = content.paragraphs.filter((p) => p.text.trim() === "");
    if (emptyParas.length === 0) continue;

    // Get the chapter's source content
    const translation = await db.query.translations.findFirst({
      where: eq(schema.translations.id, v.translationId),
      with: { chapter: { with: { text: true } } },
    });
    if (!translation) continue;

    const sourceContent = translation.chapter.sourceContent as { paragraphs: Para[] } | null;
    if (!sourceContent) continue;

    // Check which empty translation paragraphs have non-empty source
    const gaps: number[] = [];
    for (const ep of emptyParas) {
      const sourcePara = sourceContent.paragraphs.find((sp) => sp.index === ep.index);
      if (sourcePara && sourcePara.text.trim().length > 0) {
        gaps.push(ep.index);
      }
    }

    if (gaps.length > 0) {
      genuineGaps.push({
        text: translation.chapter.text.slug,
        chapter: translation.chapter.chapterNumber,
        gapCount: gaps.length,
        gapIndices: gaps,
      });
    }
  }

  if (genuineGaps.length === 0) {
    console.log("No genuine translation gaps found. All empty paragraphs correspond to empty sources.");
  } else {
    // Sort by text then chapter
    genuineGaps.sort((a, b) => a.text.localeCompare(b.text) || a.chapter - b.chapter);

    let totalGaps = 0;
    console.log(`Found ${genuineGaps.length} chapters with genuine translation gaps:\n`);
    for (const g of genuineGaps) {
      totalGaps += g.gapCount;
      const indices = g.gapIndices.length <= 10
        ? g.gapIndices.join(", ")
        : g.gapIndices.slice(0, 10).join(", ") + "...";
      console.log(`  ${g.text} ch${g.chapter}: ${g.gapCount} gaps at indices [${indices}]`);
    }
    console.log(`\nTotal: ${totalGaps} paragraphs across ${genuineGaps.length} chapters need retranslation.`);
  }

  await client.end();
}

check().catch((err) => {
  console.error(err);
  process.exit(1);
});
