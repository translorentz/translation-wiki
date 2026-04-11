import fs from "fs";
import path from "path";
import postgres from "postgres";

// Load DATABASE_URL from .env.local (ignore commented lines, strip both quote types)
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

type PilotPick = {
  key: string; // descriptive label (may include specialist flavor)
  slug: string;
  chapterNumber: number;
  sourceLanguage: string; // language.code
  register: "mx" | "neutro";
  textType: string;
  genre: string;
  totalChapters: number;
  notes: string;
};

async function findTextByLanguageGenre(opts: {
  language: string;
  genre?: string;
  textType?: string;
  slugPatterns?: string[]; // prioritize these slugs first
  excludeSlugs?: string[];
  requireSmallChapter?: boolean; // true = only pick texts that have a chapter with 5-80 paragraphs
}): Promise<{ slug: string; total_chapters: number; text_type: string; genre: string } | null> {
  const { language, genre, textType, slugPatterns, excludeSlugs, requireSmallChapter } = opts;

  // English source texts: don't require EN translation existence (EN source = no EN target)
  const requireEnTrans = language !== "en" && language !== "es";

  // Prefer explicit slug matches first
  if (slugPatterns && slugPatterns.length > 0) {
    for (const pat of slugPatterns) {
      const rows = requireEnTrans
        ? await sql<
            { slug: string; total_chapters: number; text_type: string; genre: string }[]
          >`
            SELECT t.slug, t.total_chapters, t.text_type, t.genre
            FROM texts t
            JOIN languages l ON l.id = t.language_id
            WHERE l.code = ${language}
              AND t.slug = ${pat}
              AND t.total_chapters > 0
              AND EXISTS (
                SELECT 1 FROM chapters c
                JOIN translations tr ON tr.chapter_id = c.id AND tr.target_language = 'en'
                JOIN translation_versions tv ON tv.id = tr.current_version_id
                WHERE c.text_id = t.id
              )
            LIMIT 1
          `
        : await sql<
            { slug: string; total_chapters: number; text_type: string; genre: string }[]
          >`
            SELECT t.slug, t.total_chapters, t.text_type, t.genre
            FROM texts t
            JOIN languages l ON l.id = t.language_id
            WHERE l.code = ${language}
              AND t.slug = ${pat}
              AND t.total_chapters > 0
              AND EXISTS (SELECT 1 FROM chapters c WHERE c.text_id = t.id)
            LIMIT 1
          `;
      if (rows.length > 0) return rows[0]!;
    }
  }

  // General selection
  const conds: string[] = [`l.code = $1`];
  const params: (string | number)[] = [language];
  if (genre) {
    conds.push(`t.genre = $${params.length + 1}`);
    params.push(genre);
  }
  if (textType) {
    conds.push(`t.text_type = $${params.length + 1}`);
    params.push(textType);
  }
  if (excludeSlugs && excludeSlugs.length) {
    conds.push(`t.slug NOT IN (${excludeSlugs.map((_, i) => `$${params.length + 1 + i}`).join(",")})`);
    params.push(...excludeSlugs);
  }
  const existsClause = requireEnTrans
    ? `AND EXISTS (
         SELECT 1 FROM chapters c
         JOIN translations tr ON tr.chapter_id = c.id AND tr.target_language = 'en'
         WHERE c.text_id = t.id
       )`
    : `AND EXISTS (SELECT 1 FROM chapters c WHERE c.text_id = t.id)`;
  const sizeClause = requireSmallChapter
    ? `AND EXISTS (
         SELECT 1 FROM chapters c2
         WHERE c2.text_id = t.id
           AND jsonb_array_length(c2.source_content->'paragraphs') BETWEEN 5 AND 40
           AND length(c2.source_content::text) < 12000
       )`
    : "";
  const query = `
    SELECT t.slug, t.total_chapters, t.text_type, t.genre
    FROM texts t
    JOIN languages l ON l.id = t.language_id
    WHERE ${conds.join(" AND ")}
      AND t.total_chapters > 0
      ${existsClause}
      ${sizeClause}
    ORDER BY t.total_chapters ASC
    LIMIT 1
  `;
  const rows = await sql.unsafe<
    { slug: string; total_chapters: number; text_type: string; genre: string }[]
  >(query, params as string[]);
  return rows.length > 0 ? rows[0]! : null;
}

function resolveRegister(textType: string, genre: string): "mx" | "neutro" {
  // Literature + poetry => mx; everything else => neutro
  if (textType === "poetry") return "mx";
  if (genre === "literature" || genre === "poetry") return "mx";
  return "neutro";
}

async function pick(
  key: string,
  language: string,
  options: {
    genre?: string;
    textType?: string;
    slugPatterns?: string[];
    excludeSlugs?: string[];
    notes?: string;
  } = {}
): Promise<PilotPick | null> {
  const text = await findTextByLanguageGenre({
    language,
    genre: options.genre,
    textType: options.textType,
    slugPatterns: options.slugPatterns,
    excludeSlugs: options.excludeSlugs,
    requireSmallChapter: true,
  });
  if (!text) return null;

  // Pilot-size gating: prefer a chapter with 10-80 paragraphs for fast validation.
  // First try middle chapter, then scan for any chapter in the sweet spot.
  const middle =
    text.total_chapters <= 1 ? 1 : Math.max(1, Math.floor(text.total_chapters / 2));

  // Check middle chapter size
  const midRows = await sql<{ chapter_number: number; paras: number; chars: number }[]>`
    SELECT c.chapter_number,
           jsonb_array_length(c.source_content->'paragraphs')::int AS paras,
           length(c.source_content::text)::int AS chars
    FROM chapters c JOIN texts t ON t.id = c.text_id
    WHERE t.slug = ${text.slug} AND c.chapter_number = ${middle}
    LIMIT 1
  `;

  let cn: number | null = null;
  if (
    midRows.length > 0 &&
    midRows[0]!.paras >= 5 &&
    midRows[0]!.paras <= 40 &&
    midRows[0]!.chars < 12000
  ) {
    cn = midRows[0]!.chapter_number;
  } else {
    // Scan for first chapter in [5, 40] paragraphs AND <12000 chars, closest to middle
    const scanRows = await sql<{ chapter_number: number; paras: number }[]>`
      SELECT c.chapter_number, jsonb_array_length(c.source_content->'paragraphs')::int AS paras
      FROM chapters c JOIN texts t ON t.id = c.text_id
      WHERE t.slug = ${text.slug}
        AND jsonb_array_length(c.source_content->'paragraphs') BETWEEN 5 AND 40
        AND length(c.source_content::text) < 12000
      ORDER BY ABS(c.chapter_number - ${middle}) ASC
      LIMIT 1
    `;
    if (scanRows.length > 0) {
      cn = scanRows[0]!.chapter_number;
    } else {
      // Fallback: smallest chapter
      const anyRows = await sql<{ chapter_number: number; paras: number }[]>`
        SELECT c.chapter_number, jsonb_array_length(c.source_content->'paragraphs')::int AS paras
        FROM chapters c JOIN texts t ON t.id = c.text_id
        WHERE t.slug = ${text.slug}
        ORDER BY jsonb_array_length(c.source_content->'paragraphs') ASC
        LIMIT 1
      `;
      if (anyRows.length === 0) return null;
      cn = anyRows[0]!.chapter_number;
    }
  }
  return {
    key,
    slug: text.slug,
    chapterNumber: cn,
    sourceLanguage: language,
    register: resolveRegister(text.text_type, text.genre),
    textType: text.text_type,
    genre: text.genre,
    totalChapters: text.total_chapters,
    notes: options.notes ?? "",
  };
}

async function main() {
  const picks: PilotPick[] = [];
  const seen = new Set<string>(); // slug:chapter to avoid dup pilots

  const push = (p: PilotPick | null) => {
    if (!p) return;
    const key = `${p.slug}:${p.chapterNumber}`;
    if (seen.has(key)) return;
    seen.add(key);
    picks.push(p);
  };

  // fa — Persian poetry (slash verification) — prefer a Shahnameh-like slug
  push(
    await pick("fa", "fa", {
      textType: "poetry",
      slugPatterns: ["shahnameh-jame-tabriz", "shahnameh", "divan-hafez", "divan-e-hafez"],
      notes: "Persian poetry — hemistich / slash verification",
    })
  );

  // chg — Chagatai poetry (slash verification) — Babur divan
  push(
    await pick("chg", "chg", {
      slugPatterns: ["babur-divan", "divan-babur"],
      notes: "Chagatai poetry — hemistich / slash verification",
    })
  );

  // zh-literary — Classical Chinese literary (genre literature or commentary)
  push(
    await pick("zh-literary", "zh", {
      genre: "literature",
      notes: "Classical Chinese literary prose (zh-literary specialist)",
    })
  );

  // zh-shiji — any 24 Histories text
  push(
    await pick("zh-shiji", "zh", {
      slugPatterns: ["shiji", "hanshu", "hou-hanshu", "sanguozhi", "jinshu"],
      notes: "Classical Chinese 24-Histories (zh-shiji family)",
    })
  );

  // zh — general Chinese — philosophy or ritual (NEUTRO register)
  push(
    await pick("zh", "zh", {
      genre: "philosophy",
      excludeSlugs: picks.map((p) => p.slug),
      notes: "Classical Chinese philosophy (NEUTRO register)",
    })
  );

  // grc — Ancient Greek (history/theology base)
  push(
    await pick("grc", "grc", {
      genre: "history",
      notes: "Ancient/Byzantine Greek history",
    })
  );

  // grc-philosophy — Greek philosophy (Plotinus / Elias / Proclus)
  push(
    await pick("grc-philosophy", "grc", {
      genre: "philosophy",
      notes: "Greek philosophy (grc-philosophy specialist)",
    })
  );

  // la — Latin general
  push(
    await pick("la", "la", {
      notes: "Latin general",
      excludeSlugs: ["hymni-ecclesiae", "bombyx"],
    })
  );

  // la-hymn — Latin verse — hymni-ecclesiae or bombyx
  push(
    await pick("la-hymn", "la", {
      slugPatterns: ["hymni-ecclesiae", "bombyx"],
      notes: "Latin verse line preservation",
    })
  );

  // fr / fr-literary — French literary prose (em-dash conversion)
  push(
    await pick("fr-literary", "fr", {
      genre: "literature",
      notes: "French literary prose (em-dash conversion)",
    })
  );

  // it-literary-19c
  push(
    await pick("it-literary-19c", "it", {
      genre: "literature",
      notes: "Italian 19c literary",
    })
  );

  // ru-literary
  push(
    await pick("ru-literary", "ru", {
      genre: "literature",
      notes: "Russian 19c literary",
    })
  );

  // en-philosophy — Bradley / Bosanquet
  push(
    await pick("en-philosophy", "en", {
      slugPatterns: ["appearance-and-reality", "philosophical-theory-of-state"],
      notes: "British Idealist (en-philosophy specialist)",
    })
  );

  // en-philosophy-18c — Hutcheson (explicit specialist slug)
  push(
    await pick("en-philosophy-18c", "en", {
      slugPatterns: ["hutcheson-inquiry", "analogy-of-religion"],
      notes: "18c moral philosophy (en-philosophy-18c specialist) — Hutcheson",
    })
  );

  // en-victorian
  push(
    await pick("en-victorian", "en", {
      genre: "literature",
      notes: "Victorian English literature (en-victorian specialist)",
    })
  );

  // ar — Arabic
  push(
    await pick("ar", "ar", {
      notes: "Arabic (general/specialist)",
    })
  );

  // pl
  push(
    await pick("pl", "pl", {
      notes: "Polish",
    })
  );

  // sr
  push(
    await pick("sr", "sr", {
      notes: "Serbian",
    })
  );

  // de
  push(
    await pick("de", "de", {
      notes: "German",
    })
  );

  // hu
  push(
    await pick("hu", "hu", {
      notes: "Hungarian",
    })
  );

  // ta
  push(
    await pick("ta", "ta", {
      notes: "Tamil",
    })
  );

  // hy
  push(
    await pick("hy", "hy", {
      notes: "Armenian",
    })
  );

  console.log(`\nSelected ${picks.length} pilot chapters:`);
  for (const p of picks) {
    console.log(
      `  ${p.key.padEnd(22)} ${p.slug.padEnd(40)} ch${p.chapterNumber.toString().padStart(4)} [${p.sourceLanguage}/${p.textType}/${p.genre}/${p.register}] ${p.notes}`
    );
  }

  // Write selection outputs
  const jsonOutPath = "/tmp/es-pilot-selection.json";
  fs.writeFileSync(jsonOutPath, JSON.stringify(picks, null, 2));
  console.log(`\nWrote JSON: ${jsonOutPath}`);

  const mdLines: string[] = [
    "# Spanish Pilot — Phase 1 Text Selection",
    "",
    `**Total pilots:** ${picks.length}`,
    `**Selection date:** ${new Date().toISOString()}`,
    "",
    "| # | Key | Slug | Chapter | Source Lang | TextType | Genre | Register | Notes |",
    "|---|-----|------|---------|-------------|----------|-------|----------|-------|",
  ];
  picks.forEach((p, i) => {
    mdLines.push(
      `| ${i + 1} | ${p.key} | ${p.slug} | ${p.chapterNumber} | ${p.sourceLanguage} | ${p.textType} | ${p.genre} | ${p.register} | ${p.notes} |`
    );
  });
  mdLines.push("", "## Selection rules applied", "", "- Smallest fully-translated (EN) text per source-language / genre bucket", "- Middle chapter (floor(total_chapters / 2), falling back to chapter 1)", "- Hard fallback slugs for fa (Shahnameh family) and chg (Babur divan family)", "- De-duplicated by (slug, chapter)", "");
  fs.writeFileSync("docs/spanish-pilot-selection.md", mdLines.join("\n"));
  console.log("Wrote docs/spanish-pilot-selection.md");

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
