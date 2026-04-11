// Spanish Wave 2D progress monitor
// Queries the DB for count of completed ES translations among Wave 2D text slugs.

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
  // Load Wave 2D slugs from the partition
  const partitionPath = "/tmp/es-wave-2d-partition.json";
  if (!fs.existsSync(partitionPath)) {
    console.error(`${partitionPath} missing`);
    process.exit(1);
  }
  const partition = JSON.parse(fs.readFileSync(partitionPath, "utf-8")) as Array<{
    workerId: string;
    slugs: string[];
  }>;

  const surveyPath = "/tmp/es-corpus-survey.json";
  const survey = JSON.parse(fs.readFileSync(surveyPath, "utf-8")) as {
    wave2DTexts: Array<{ slug: string; chaptersNeedingEs: number }>;
  };
  const initialNeedBySlug = new Map(survey.wave2DTexts.map((t) => [t.slug, t.chaptersNeedingEs]));

  const allSlugs = partition.flatMap((p) => p.slugs);

  // Count total chapters in wave and total already-ES-translated
  const totalRow = await sql<{ total: number; translated: number }[]>`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM translations tr
          WHERE tr.chapter_id = c.id
            AND tr.target_language = 'es'
            AND tr.current_version_id IS NOT NULL
        )
      )::int AS translated
    FROM chapters c
    JOIN texts t ON t.id = c.text_id
    WHERE t.slug = ANY(${allSlugs})
      AND c.source_content IS NOT NULL
      AND jsonb_typeof(c.source_content->'paragraphs') = 'array'
      AND jsonb_array_length(c.source_content->'paragraphs') > 0
  `;

  const t = totalRow[0]!;
  const pct = t.total > 0 ? ((t.translated / t.total) * 100).toFixed(2) : "0.00";
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Wave 2D: ${t.translated}/${t.total} chapters translated (${pct}%)`);

  // Per-worker progress: count how many of each worker's slugs are fully translated
  for (const p of partition) {
    const workerRow = await sql<{ total: number; translated: number }[]>`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM translations tr
            WHERE tr.chapter_id = c.id
              AND tr.target_language = 'es'
              AND tr.current_version_id IS NOT NULL
          )
        )::int AS translated
      FROM chapters c
      JOIN texts t ON t.id = c.text_id
      WHERE t.slug = ANY(${p.slugs})
        AND c.source_content IS NOT NULL
        AND jsonb_typeof(c.source_content->'paragraphs') = 'array'
        AND jsonb_array_length(c.source_content->'paragraphs') > 0
    `;
    const w = workerRow[0]!;
    const wpct = w.total > 0 ? ((w.translated / w.total) * 100).toFixed(1) : "0.0";
    const status = fs.existsSync(`/tmp/es-wave-2d-${p.workerId}.status`)
      ? fs.readFileSync(`/tmp/es-wave-2d-${p.workerId}.status`, "utf-8").trim()
      : "?";
    console.log(`  ${p.workerId} [${status.padEnd(8)}]: ${w.translated}/${w.total} (${wpct}%)`);
  }

  // Log this progress snapshot
  const logLine = `${timestamp} total=${t.total} translated=${t.translated} pct=${pct}\n`;
  fs.appendFileSync("/tmp/es-wave-2d-progress.log", logLine);

  // Unused for now
  void initialNeedBySlug;

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
