// Spanish Corpus Survey — Phase 2 scope determination
//
// Queries the Neon DB to count chapters/texts/paragraphs that still need
// Spanish translation, grouped by source language, genre, and wave.
//
// Wave assignments mirror docs/snappy-tumbling-shamir.md section Phase 2.1.
//
// Outputs:
//   docs/es-corpus-survey.md   (human-readable)
//   /tmp/es-corpus-survey.json (machine-readable)

import fs from "fs";
import path from "path";
import postgres from "postgres";

// Load DATABASE_URL from .env.local (ignore commented lines, strip quotes)
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

// The canonical list of 24 History slugs for wave 2A assignment.
const HISTORY_SLUGS = new Set([
  "shiji",
  "hanshu",
  "hou-hanshu",
  "sanguozhi",
  "jinshu",
  "songshu",
  "nanqishu",
  "liangshu",
  "chenshu",
  "weishu",
  "beiqishu",
  "zhoushu",
  "suishu",
  "jiu-tangshu",
  "xin-tangshu",
  "jiu-wudaishi",
  "xin-wudaishi",
  "songshi",
  "liaoshi",
  "jinshi",
  "yuanshi",
  "mingshi",
  "qingshi",
  "qingshigao",
  "beishi",
  "nanshi",
  "mingshilu",
]);

type Wave = "2A" | "2B" | "2C" | "2D" | "2E" | "2F" | "2G" | "2H";

function assignWave(slug: string, language: string): Wave {
  if (language === "zh") {
    return HISTORY_SLUGS.has(slug) ? "2A" : "2B";
  }
  if (language === "en") return "2C";
  if (language === "fr" || language === "it" || language === "pt" || language === "ro") return "2D";
  if (language === "la" || language === "grc" || language === "el") return "2E";
  if (language === "fa" || language === "chg" || language === "ar") return "2F";
  // Slavic + Indic + other
  const wave2G = new Set([
    "ru",
    "pl",
    "cs",
    "sr",
    "hr",
    "bg",
    "uk",
    "sk",
    "sl",
    "mk",
    "ja",
    "ko",
    "vi",
    "hi",
    "ta",
    "te",
    "sa",
    "gu",
    "ml",
    "kn",
    "bn",
    "pa",
    "mr",
    "ne",
    "si",
    "my",
    "km",
    "th",
    "lo",
    "hy",
    "xcl",
    "hu",
    "de",
    "nl",
    "da",
    "sv",
    "no",
    "is",
    "fi",
    "et",
    "lv",
    "lt",
    "ms",
    "id",
    "tl",
    "tr",
    "az",
    "uz",
    "kk",
    "ky",
    "tt",
    "he",
    "yi",
    "syc",
    "copt",
    "gez",
    "am",
    "sw",
    "ha",
    "yo",
    "zu",
    "eu",
    "ca",
    "gl",
    "oc",
    "br",
    "cy",
    "ga",
    "gd",
  ]);
  if (wave2G.has(language)) return "2G";
  return "2H";
}

type TextRow = {
  text_id: number;
  slug: string;
  language: string;
  genre: string;
  text_type: string;
  total_chapters_in_text: number;
  chapters_with_source: number;
  chapters_needing_es: number;
  paragraphs_needing_es: number;
};

async function main() {
  console.log("Querying Spanish corpus scope...\n");

  // Per-text stats: chapters-needing-es = chapters with source_content and no ES translation
  const textRows = await sql<TextRow[]>`
    WITH chap_stats AS (
      SELECT
        c.text_id,
        COUNT(*) FILTER (
          WHERE c.source_content IS NOT NULL
            AND jsonb_typeof(c.source_content->'paragraphs') = 'array'
            AND jsonb_array_length(c.source_content->'paragraphs') > 0
        ) AS chapters_with_source,
        COUNT(*) FILTER (
          WHERE c.source_content IS NOT NULL
            AND jsonb_typeof(c.source_content->'paragraphs') = 'array'
            AND jsonb_array_length(c.source_content->'paragraphs') > 0
            AND NOT EXISTS (
              SELECT 1
              FROM translations tr
              WHERE tr.chapter_id = c.id
                AND tr.target_language = 'es'
                AND tr.current_version_id IS NOT NULL
            )
        ) AS chapters_needing_es,
        COALESCE(SUM(
          CASE WHEN c.source_content IS NOT NULL
            AND jsonb_typeof(c.source_content->'paragraphs') = 'array'
            AND jsonb_array_length(c.source_content->'paragraphs') > 0
            AND NOT EXISTS (
              SELECT 1 FROM translations tr
              WHERE tr.chapter_id = c.id
                AND tr.target_language = 'es'
                AND tr.current_version_id IS NOT NULL
            )
          THEN jsonb_array_length(c.source_content->'paragraphs')
          ELSE 0 END
        ), 0) AS paragraphs_needing_es
      FROM chapters c
      GROUP BY c.text_id
    )
    SELECT
      t.id AS text_id,
      t.slug,
      l.code AS language,
      t.genre,
      t.text_type,
      t.total_chapters AS total_chapters_in_text,
      cs.chapters_with_source::int,
      cs.chapters_needing_es::int,
      cs.paragraphs_needing_es::int
    FROM texts t
    JOIN languages l ON l.id = t.language_id
    JOIN chap_stats cs ON cs.text_id = t.id
    WHERE l.code <> 'es'
    ORDER BY l.code, t.slug
  `;

  console.log(`Loaded ${textRows.length} texts.\n`);

  // Totals
  let totalChaptersNeedingEs = 0;
  let totalParagraphsNeedingEs = 0;
  let totalTextsNeedingEs = 0;

  const byLanguage = new Map<
    string,
    {
      language: string;
      texts: number;
      textsNeeding: number;
      chapters: number;
      paragraphs: number;
      chaptersNeedingEs: number;
      paragraphsNeedingEs: number;
    }
  >();
  const byGenre = new Map<
    string,
    { genre: string; texts: number; chapters: number; paragraphs: number; chaptersNeedingEs: number; paragraphsNeedingEs: number }
  >();
  const byWave = new Map<
    Wave,
    {
      wave: Wave;
      texts: number;
      chapters: number;
      paragraphs: number;
      languages: Set<string>;
    }
  >();

  // Per-text wave assignments
  const textWaveAssignments: Array<{
    slug: string;
    language: string;
    genre: string;
    wave: Wave;
    chaptersNeedingEs: number;
    paragraphsNeedingEs: number;
  }> = [];

  for (const row of textRows) {
    const needs = row.chapters_needing_es > 0;
    if (needs) {
      totalTextsNeedingEs++;
      totalChaptersNeedingEs += row.chapters_needing_es;
      totalParagraphsNeedingEs += row.paragraphs_needing_es;
    }

    // byLanguage
    if (!byLanguage.has(row.language)) {
      byLanguage.set(row.language, {
        language: row.language,
        texts: 0,
        textsNeeding: 0,
        chapters: 0,
        paragraphs: 0,
        chaptersNeedingEs: 0,
        paragraphsNeedingEs: 0,
      });
    }
    const langRow = byLanguage.get(row.language)!;
    langRow.texts += 1;
    langRow.chapters += row.chapters_with_source;
    langRow.paragraphs += 0; // we'll fill below from a lightweight extra stat
    langRow.chaptersNeedingEs += row.chapters_needing_es;
    langRow.paragraphsNeedingEs += row.paragraphs_needing_es;
    if (needs) langRow.textsNeeding += 1;

    // byGenre
    if (!byGenre.has(row.genre)) {
      byGenre.set(row.genre, {
        genre: row.genre,
        texts: 0,
        chapters: 0,
        paragraphs: 0,
        chaptersNeedingEs: 0,
        paragraphsNeedingEs: 0,
      });
    }
    const genreRow = byGenre.get(row.genre)!;
    genreRow.texts += 1;
    genreRow.chapters += row.chapters_with_source;
    genreRow.chaptersNeedingEs += row.chapters_needing_es;
    genreRow.paragraphsNeedingEs += row.paragraphs_needing_es;

    // byWave — only count texts that need ES
    if (needs) {
      const wave = assignWave(row.slug, row.language);
      if (!byWave.has(wave)) {
        byWave.set(wave, { wave, texts: 0, chapters: 0, paragraphs: 0, languages: new Set() });
      }
      const waveRow = byWave.get(wave)!;
      waveRow.texts += 1;
      waveRow.chapters += row.chapters_needing_es;
      waveRow.paragraphs += row.paragraphs_needing_es;
      waveRow.languages.add(row.language);
      textWaveAssignments.push({
        slug: row.slug,
        language: row.language,
        genre: row.genre,
        wave,
        chaptersNeedingEs: row.chapters_needing_es,
        paragraphsNeedingEs: row.paragraphs_needing_es,
      });
    }
  }

  // Sort languages by chaptersNeedingEs desc
  const langList = [...byLanguage.values()].sort((a, b) => b.chaptersNeedingEs - a.chaptersNeedingEs);
  const genreList = [...byGenre.values()].sort((a, b) => b.chaptersNeedingEs - a.chaptersNeedingEs);
  const waveList: Wave[] = ["2A", "2B", "2C", "2D", "2E", "2F", "2G", "2H"];

  // JSON output
  const json = {
    generatedAt: new Date().toISOString(),
    totalChaptersNeedingEs,
    totalParagraphsNeedingEs,
    totalTextsNeedingEs,
    totalTextsInCorpus: textRows.length,
    byLanguage: langList.map((l) => ({
      language: l.language,
      texts: l.texts,
      textsNeeding: l.textsNeeding,
      chapters: l.chapters,
      chaptersNeedingEs: l.chaptersNeedingEs,
      paragraphsNeedingEs: l.paragraphsNeedingEs,
    })),
    byGenre: genreList.map((g) => ({
      genre: g.genre,
      texts: g.texts,
      chapters: g.chapters,
      chaptersNeedingEs: g.chaptersNeedingEs,
      paragraphsNeedingEs: g.paragraphsNeedingEs,
    })),
    byWave: Object.fromEntries(
      waveList.map((w) => {
        const wr = byWave.get(w);
        return [
          w,
          wr
            ? {
                texts: wr.texts,
                chapters: wr.chapters,
                paragraphs: wr.paragraphs,
                languages: [...wr.languages].sort(),
              }
            : { texts: 0, chapters: 0, paragraphs: 0, languages: [] },
        ];
      })
    ),
    wave2DTexts: textWaveAssignments
      .filter((t) => t.wave === "2D")
      .sort((a, b) => b.chaptersNeedingEs - a.chaptersNeedingEs),
  };

  const jsonPath = "/tmp/es-corpus-survey.json";
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
  console.log(`Wrote ${jsonPath}`);

  // Markdown output
  const md: string[] = [];
  md.push("# Spanish Corpus Survey — Phase 2 Scope");
  md.push("");
  md.push(`**Generated:** ${new Date().toISOString()}`);
  md.push("");
  md.push("## Top-line totals");
  md.push("");
  md.push(`- **Texts in corpus (non-es source):** ${textRows.length}`);
  md.push(`- **Texts needing Spanish translation:** ${totalTextsNeedingEs}`);
  md.push(`- **Chapters needing Spanish translation:** ${totalChaptersNeedingEs.toLocaleString()}`);
  md.push(`- **Paragraphs needing Spanish translation:** ${totalParagraphsNeedingEs.toLocaleString()}`);
  md.push("");
  md.push("## Per source language (sorted by chapters needing ES)");
  md.push("");
  md.push("| Language | Texts | Texts needing ES | Chapters | Chapters needing ES | Paragraphs needing ES |");
  md.push("|----------|-------|------------------|----------|---------------------|-----------------------|");
  for (const l of langList) {
    md.push(
      `| ${l.language} | ${l.texts} | ${l.textsNeeding} | ${l.chapters.toLocaleString()} | ${l.chaptersNeedingEs.toLocaleString()} | ${l.paragraphsNeedingEs.toLocaleString()} |`
    );
  }
  md.push("");
  md.push("## Per genre (sorted by chapters needing ES)");
  md.push("");
  md.push("| Genre | Texts | Chapters | Chapters needing ES | Paragraphs needing ES |");
  md.push("|-------|-------|----------|---------------------|-----------------------|");
  for (const g of genreList) {
    md.push(
      `| ${g.genre} | ${g.texts} | ${g.chapters.toLocaleString()} | ${g.chaptersNeedingEs.toLocaleString()} | ${g.paragraphsNeedingEs.toLocaleString()} |`
    );
  }
  md.push("");
  md.push("## Per wave (Phase 2 partitioning)");
  md.push("");
  md.push("| Wave | Scope | Texts | Chapters | Paragraphs | Languages |");
  md.push("|------|-------|-------|----------|------------|-----------|");
  const waveScope: Record<Wave, string> = {
    "2A": "Chinese 24 Histories",
    "2B": "Other Chinese",
    "2C": "English",
    "2D": "Romance (fr/it/pt/ro)",
    "2E": "Latin/Greek (la/grc/el)",
    "2F": "Persian/Chagatai/Arabic",
    "2G": "Slavic + Indic + Other",
    "2H": "Catch-all",
  };
  for (const w of waveList) {
    const wr = byWave.get(w);
    const scope = waveScope[w];
    if (wr) {
      md.push(
        `| ${w} | ${scope} | ${wr.texts} | ${wr.chapters.toLocaleString()} | ${wr.paragraphs.toLocaleString()} | ${[...wr.languages].sort().join(", ")} |`
      );
    } else {
      md.push(`| ${w} | ${scope} | 0 | 0 | 0 | — |`);
    }
  }
  md.push("");
  md.push("## Wave 2D — Romance languages detail");
  md.push("");
  md.push("| Slug | Language | Genre | Chapters needing ES | Paragraphs needing ES |");
  md.push("|------|----------|-------|---------------------|-----------------------|");
  for (const t of json.wave2DTexts) {
    md.push(
      `| ${t.slug} | ${t.language} | ${t.genre} | ${t.chaptersNeedingEs.toLocaleString()} | ${t.paragraphsNeedingEs.toLocaleString()} |`
    );
  }
  md.push("");

  const mdPath = "docs/es-corpus-survey.md";
  fs.writeFileSync(mdPath, md.join("\n"));
  console.log(`Wrote ${mdPath}`);

  // Print summary to console
  console.log("\n========== SUMMARY ==========");
  console.log(`Total chapters needing ES: ${totalChaptersNeedingEs.toLocaleString()}`);
  console.log(`Total texts needing ES:    ${totalTextsNeedingEs}`);
  console.log(`Total paragraphs:          ${totalParagraphsNeedingEs.toLocaleString()}`);
  console.log("\nTop 10 languages by chapters needing ES:");
  for (const l of langList.slice(0, 10)) {
    console.log(`  ${l.language.padEnd(10)} ${l.chaptersNeedingEs.toString().padStart(6)} chapters (${l.textsNeeding} texts)`);
  }
  console.log("\nWaves:");
  for (const w of waveList) {
    const wr = byWave.get(w);
    if (wr) {
      console.log(`  ${w} ${waveScope[w].padEnd(30)} ${wr.texts.toString().padStart(4)} texts, ${wr.chapters.toString().padStart(6)} chapters`);
    }
  }
  console.log("\nWave 2D texts:");
  for (const t of json.wave2DTexts) {
    console.log(`  ${t.slug.padEnd(50)} ${t.language} ${t.chaptersNeedingEs.toString().padStart(5)} ch`);
  }

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
