/**
 * Translates English chapter title portions to Chinese.
 *
 * For non-Chinese texts, chapter titles often have English translations
 * in parentheses: "Κεφάλαιο Α (Chapter 1)". In zh locale, these should
 * display in Chinese: "Κεφάλαιο Α (第一章)".
 *
 * Usage: pnpm tsx scripts/translate-chapter-titles-zh.ts [--dry-run]
 */

import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, isNull, and, ne } from "drizzle-orm";
import OpenAI from "openai";
import * as schema from "../src/server/db/schema";
import { parseChapterTitle } from "../src/lib/utils";

// Load .env.local
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const dbMatch = line.match(/^DATABASE_URL=(.+)$/);
    if (dbMatch) {
      process.env.DATABASE_URL = dbMatch[1].replace(/^['"]|['"]$/g, "");
    }
    const dsMatch = line.match(/^DEEPSEEK_API_KEY=(.+)$/);
    if (dsMatch) {
      process.env.DEEPSEEK_API_KEY = dsMatch[1].replace(/^['"]|['"]$/g, "");
    }
  }
}

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: "https://api.deepseek.com",
});

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 80; // titles per API call

async function main() {
  console.log(`=== Chapter Title Translation to Chinese ===`);
  if (DRY_RUN) console.log("(DRY RUN — no DB updates)");

  // Get all chapters with their language code, excluding Chinese texts
  const chapters = await db
    .select({
      chapterId: schema.chapters.id,
      title: schema.chapters.title,
      titleZh: schema.chapters.titleZh,
      langCode: schema.languages.code,
      textSlug: schema.texts.slug,
    })
    .from(schema.chapters)
    .innerJoin(schema.texts, eq(schema.chapters.textId, schema.texts.id))
    .innerJoin(schema.languages, eq(schema.texts.languageId, schema.languages.id))
    .where(ne(schema.languages.code, "zh"));

  // Filter to chapters that have English portions and no titleZh yet
  const toTranslate: { chapterId: number; english: string; textSlug: string }[] = [];

  for (const ch of chapters) {
    if (ch.titleZh) continue; // already translated
    if (!ch.title) continue;

    const { english } = parseChapterTitle(ch.title);
    if (!english) continue; // no English portion to translate

    toTranslate.push({
      chapterId: ch.chapterId,
      english,
      textSlug: ch.textSlug,
    });
  }

  console.log(`Total non-zh chapters: ${chapters.length}`);
  console.log(`Chapters with English title portions needing translation: ${toTranslate.length}`);

  if (toTranslate.length === 0) {
    console.log("Nothing to translate.");
    await sql.end();
    return;
  }

  // Process in batches
  let translated = 0;
  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const batch = toTranslate.slice(i, i + BATCH_SIZE);
    const titles = batch.map((b) => b.english);

    console.log(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1}: translating ${titles.length} titles...`);

    try {
      const prompt = `Translate these English chapter titles to Simplified Chinese. Return ONLY a JSON array of translated strings, in the same order. Be concise and natural. Use standard Chinese conventions for chapter numbering (e.g., "Chapter 1" → "第一章", "Volume 3" → "卷三", "Book 5" → "第五卷", "Part 2" → "第二部分", "Preface" → "序言").

Titles to translate:
${JSON.stringify(titles)}`;

      const response = await deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        console.error("Empty response from DeepSeek, skipping batch");
        continue;
      }

      // Parse the JSON array from the response
      let translations: string[];
      try {
        // Strip markdown code fence if present
        const jsonStr = content.replace(/^```json\n?/, "").replace(/\n?```$/, "");
        translations = JSON.parse(jsonStr);
      } catch {
        console.error("Failed to parse response as JSON:", content.slice(0, 200));
        continue;
      }

      if (translations.length !== titles.length) {
        console.error(`Length mismatch: expected ${titles.length}, got ${translations.length}`);
        // Try to use what we got if lengths are close
        if (Math.abs(translations.length - titles.length) > 2) {
          continue;
        }
      }

      // Update database
      const updateCount = Math.min(translations.length, batch.length);
      for (let j = 0; j < updateCount; j++) {
        const zhTitle = translations[j];
        if (!zhTitle || typeof zhTitle !== "string") continue;

        if (DRY_RUN) {
          console.log(`  [DRY] ${batch[j].english} → ${zhTitle}`);
        } else {
          await db
            .update(schema.chapters)
            .set({ titleZh: zhTitle })
            .where(eq(schema.chapters.id, batch[j].chapterId));
        }
        translated++;
      }

      console.log(`  Translated ${updateCount} titles`);

      // Small delay between batches
      if (i + BATCH_SIZE < toTranslate.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (error) {
      console.error("API error:", error);
      continue;
    }
  }

  console.log(`\n=== Done: ${translated} titles translated ===`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
