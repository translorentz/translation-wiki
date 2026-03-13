/**
 * Seed script for Psaltirea în versuri (Psalter in Verse) by Dosoftei.
 *
 * Inserts:
 * 1. Author: Dosoftei (Romanian Metropolitan, 1624-1693)
 * 2. Text: Psaltirea în versuri (psaltirea-in-versuri)
 *
 * After running this script, use seed-chapters-only.ts:
 *   pnpm tsx scripts/seed-chapters-only.ts --text psaltirea-in-versuri
 */

import postgres from "postgres";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL not set in .env.local");
}

const sql = postgres(DATABASE_URL, { ssl: "require" });

async function main() {
  console.log("Seeding Dosoftei + Psaltirea în versuri...");

  // 1. Get Romanian language ID
  const [roLang] = await sql`SELECT id FROM languages WHERE code = 'ro'`;
  if (!roLang) {
    throw new Error("Romanian language not found in DB. Ensure it was seeded.");
  }
  const languageId = roLang.id;
  console.log(`Romanian language ID: ${languageId}`);

  // 2. Upsert author: Dosoftei
  const [author] = await sql`
    INSERT INTO authors (name, name_original_script, name_zh, slug, era, description)
    VALUES (
      'Dosoftei',
      'Dosoftei',
      '多索夫泰',
      'dosoftei',
      'Moldavian Orthodox (1624–1693)',
      'Metropolitan of Moldavia and the foremost religious writer of seventeenth-century Romanian literature. Born Dimitrie Barilă in Suceava, he served as Bishop of Roman and then as Metropolitan of Moldavia (1671–1686, 1692–1693). A polyglot scholar with knowledge of Church Slavonic, Greek, Latin, Polish, and Hungarian, he translated and composed the first verse psalter in Romanian, the first Romanian liturgical text to be printed, and the first Romanian hagiographic collection. His Psaltirea în versuri (1673) transformed the biblical psalms into Romanian verse and established a literary standard for the language.'
    )
    ON CONFLICT (slug) DO UPDATE SET
      name_zh = EXCLUDED.name_zh,
      description = EXCLUDED.description
    RETURNING id, slug, name
  `;
  console.log(`Author: ${author.name} (id=${author.id}, slug=${author.slug})`);

  // 3. Insert text: Psaltirea în versuri (check if already exists first)
  const [existingText] = await sql`SELECT id, slug FROM texts WHERE slug = 'psaltirea-in-versuri'`;

  let text;
  if (existingText) {
    console.log(`Text already exists (id=${existingText.id}), updating metadata...`);
    [text] = await sql`
      UPDATE texts SET
        title_zh = '韵文诗篇',
        description = 'A Romanian verse translation of the biblical Psalms composed by Dosoftei, Metropolitan of Moldavia, and printed at Uniev in 1673. The work renders the psalms into Romanian rhyming couplets, adapting Polish verse models (particularly Jan Kochanowski''s Psałterz Dawidów) to the phonology and idiom of seventeenth-century Moldavian Romanian. It was the first major poetic work in Romanian and the first printed book in the Romanian language to use verse throughout. The Wikisource transcription covers 142 psalms from the 1673 Uniev edition.',
        description_zh = '摩尔达维亚都主教多索夫泰创作的圣经诗篇罗马尼亚韵文译本，于1673年在乌涅夫付印。全书以押韵双行诗呈现诗篇，参照波兰韵文范本（尤其是扬·科哈诺夫斯基的《达维德诗篇》），融合十七世纪摩尔达维亚罗马尼亚语的音韵与习惯。这是罗马尼亚语第一部重要诗歌作品，也是第一部全程采用韵文的罗马尼亚语印刷书籍。维基文库转录本涵盖1673年乌涅夫版142篇诗篇。',
        total_chapters = 142,
        text_type = 'poetry',
        genre = 'ritual',
        composition_year_display = '1673'
      WHERE slug = 'psaltirea-in-versuri'
      RETURNING id, slug, title, total_chapters
    `;
  } else {
    [text] = await sql`
      INSERT INTO texts (
        title,
        title_original_script,
        title_zh,
        slug,
        language_id,
        author_id,
        description,
        description_zh,
        source_url,
        composition_year,
        composition_year_display,
        composition_era,
        text_type,
        genre,
        total_chapters
      )
      VALUES (
        'Psalter in Verse (Psaltirea în versuri)',
        'Psaltirea în versuri',
        '韵文诗篇',
        'psaltirea-in-versuri',
        ${languageId},
        ${author.id},
        'A Romanian verse translation of the biblical Psalms composed by Dosoftei, Metropolitan of Moldavia, and printed at Uniev in 1673. The work renders the psalms into Romanian rhyming couplets, adapting Polish verse models (particularly Jan Kochanowski''s Psałterz Dawidów) to the phonology and idiom of seventeenth-century Moldavian Romanian. It was the first major poetic work in Romanian and the first printed book in the Romanian language to use verse throughout. The Wikisource transcription covers 142 psalms from the 1673 Uniev edition.',
        '摩尔达维亚都主教多索夫泰创作的圣经诗篇罗马尼亚韵文译本，于1673年在乌涅夫付印。全书以押韵双行诗呈现诗篇，参照波兰韵文范本（尤其是扬·科哈诺夫斯基的《达维德诗篇》），融合十七世纪摩尔达维亚罗马尼亚语的音韵与习惯。这是罗马尼亚语第一部重要诗歌作品，也是第一部全程采用韵文的罗马尼亚语印刷书籍。维基文库转录本涵盖1673年乌涅夫版142篇诗篇。',
        'https://ro.wikisource.org/wiki/Psaltirea_%C3%AEn_versuri',
        1673,
        '1673',
        'Moldavian Baroque',
        'poetry',
        'ritual',
        142
      )
      RETURNING id, slug, title, total_chapters
    `;
  }
  console.log(`Text: "${text.title}" (id=${text.id}, slug=${text.slug}, total_chapters=${text.total_chapters})`);

  // 4. Verify
  const [verify] = await sql`
    SELECT t.id, t.slug, t.total_chapters, t.title_zh, a.name_zh as author_name_zh
    FROM texts t
    JOIN authors a ON a.id = t.author_id
    WHERE t.slug = 'psaltirea-in-versuri'
  `;
  console.log("\nVerification:");
  console.log(`  Text ID: ${verify.id}`);
  console.log(`  Slug: ${verify.slug}`);
  console.log(`  Total chapters (metadata): ${verify.total_chapters}`);
  console.log(`  Title ZH: ${verify.title_zh}`);
  console.log(`  Author ZH: ${verify.author_name_zh}`);
  console.log("\nDone! Now run:");
  console.log("  pnpm tsx scripts/seed-chapters-only.ts --text psaltirea-in-versuri");

  await sql.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
