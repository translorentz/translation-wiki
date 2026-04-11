import fs from "fs";
import path from "path";
import postgres from "postgres";

// Load DATABASE_URL
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
  process.exit(2);
}

const sql = postgres(process.env.DATABASE_URL);

// Spanish target length ratio thresholds (mirrors translate-batch.ts MIN_LENGTH_RATIO_ES)
const MIN_LENGTH_RATIO_ES: Record<string, number> = {
  zh: 0.4,
  "zh-literary": 0.4,
  "zh-science": 0.4,
  "zh-biji": 0.4,
  "zh-poetry": 0.3,
  "zh-joseon-sillok": 0.4,
  grc: 0.5,
  "grc-history": 0.5,
  "grc-gregory": 0.5,
  "grc-philosophy": 0.5,
  la: 0.5,
  "la-hymn": 0.4,
  fa: 0.6,
  "fa-prose": 0.5,
  chg: 0.5,
  "chg-babur": 0.5,
  ja: 0.4,
  ru: 0.4,
  "ru-literary": 0.4,
  "ru-tipikon": 0.4,
  ar: 0.5,
  "ar-sufi": 0.5,
  "ar-fiqh": 0.5,
  fr: 0.8,
  "fr-literary": 0.8,
  "fr-poetry": 0.6,
  "fr-metropolitan": 0.8,
  "fr-metropolitan-poetry": 0.6,
  "fr-academic": 0.8,
  it: 0.8,
  "it-literary-19c": 0.8,
  "it-nonfiction-19c": 0.8,
  "it-renaissance-dialogue": 0.8,
  en: 0.8,
  "en-philosophy": 0.8,
  "en-philosophy-18c": 0.8,
  "en-victorian": 0.8,
  "en-science": 0.8,
  de: 0.7,
  "de-philosophy": 0.7,
  pl: 0.6,
  "pl-poetry": 0.5,
  "pl-philosophy": 0.7,
  hu: 0.6,
  "hu-poetry": 0.5,
  sr: 0.6,
  "sr-scholarly": 0.4,
  "sr-philosophy": 0.6,
  ta: 0,
  "ta-prose": 0.4,
  te: 0.4,
  "te-prose": 0.4,
  xcl: 0.1,
  "xcl-literature": 0.1,
  hy: 0.5,
  default: 0.7,
};

type Failure = { check: string; expected: string | number; got: string | number; details?: string };

type Paragraph = { index: number; text: string };
type Content = { paragraphs: Paragraph[] };

function countSlashes(text: string): number {
  // Count "/" but not "//" or parts of URLs (simple heuristic: count isolated slashes)
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "/") n++;
  }
  return n;
}

function run(): Promise<void> {
  return main();
}

async function main() {
  const slug = process.argv[2];
  const chapterNumStr = process.argv[3];
  if (!slug || !chapterNumStr) {
    console.error("Usage: tsx scripts/_audit-spanish-pilot.ts <text-slug> <chapter-number>");
    process.exit(2);
  }
  const chapterNumber = parseInt(chapterNumStr, 10);
  if (Number.isNaN(chapterNumber)) {
    console.error("chapter-number must be an integer");
    process.exit(2);
  }

  // Fetch chapter + source content + latest Spanish translation version
  const rows = await sql<
    {
      chapter_id: number;
      chapter_slug: string;
      source_content: unknown;
      source_language: string;
      text_type: string;
      genre: string;
      translation_content: unknown | null;
    }[]
  >`
    SELECT
      c.id AS chapter_id,
      c.slug AS chapter_slug,
      c.source_content,
      l.code AS source_language,
      t.text_type,
      t.genre,
      tv.content AS translation_content
    FROM chapters c
    JOIN texts t ON t.id = c.text_id
    JOIN languages l ON l.id = t.language_id
    LEFT JOIN translations tr ON tr.chapter_id = c.id AND tr.target_language = 'es'
    LEFT JOIN translation_versions tv ON tv.id = tr.current_version_id
    WHERE t.slug = ${slug} AND c.chapter_number = ${chapterNumber}
    LIMIT 1
  `;

  const failures: Failure[] = [];
  const outPath = `/tmp/es-pilot-audit-${slug}-${chapterNumber}.json`;

  if (rows.length === 0) {
    failures.push({ check: "chapter_exists", expected: "row present", got: "no matching chapter" });
    fs.writeFileSync(outPath, JSON.stringify({ slug, chapter: chapterNumber, passed: false, failures }, null, 2));
    await sql.end();
    process.exit(1);
  }

  const row = rows[0]!;
  if (!row.translation_content) {
    failures.push({ check: "es_translation_exists", expected: "present", got: "NULL" });
    fs.writeFileSync(outPath, JSON.stringify({ slug, chapter: chapterNumber, passed: false, failures }, null, 2));
    await sql.end();
    process.exit(1);
  }

  const source = row.source_content as Content;
  const translation = row.translation_content as Content;
  const sourceLanguage = row.source_language;
  const textType = row.text_type;

  if (!source?.paragraphs || !Array.isArray(source.paragraphs)) {
    failures.push({ check: "source_format", expected: "{paragraphs: []}", got: typeof source });
  }
  if (!translation?.paragraphs || !Array.isArray(translation.paragraphs)) {
    failures.push({ check: "translation_format", expected: "{paragraphs: []}", got: typeof translation });
  }

  if (failures.length > 0) {
    fs.writeFileSync(outPath, JSON.stringify({ slug, chapter: chapterNumber, passed: false, failures }, null, 2));
    await sql.end();
    process.exit(1);
  }

  const srcParas = source.paragraphs;
  const transParas = translation.paragraphs;

  // 1. Paragraph count match
  if (srcParas.length !== transParas.length) {
    failures.push({
      check: "paragraph_count",
      expected: srcParas.length,
      got: transParas.length,
    });
  }

  // Concatenate translation text for aggregate scans
  const allTransText = transParas.map((p) => p.text).join("\n");
  const allSrcText = srcParas.map((p) => p.text).join("\n");

  // 2. Em-dash dialogue: lines beginning with — or – followed by space
  // scan each paragraph and each line
  let emDashDialogueCount = 0;
  const emDashExamples: string[] = [];
  for (const p of transParas) {
    const lines = p.text.split("\n");
    for (const line of lines) {
      if (/^[\u2014\u2013]\s/.test(line)) {
        emDashDialogueCount++;
        if (emDashExamples.length < 3) emDashExamples.push(line.slice(0, 80));
      }
    }
  }
  if (emDashDialogueCount > 0) {
    failures.push({
      check: "em_dash_dialogue",
      expected: 0,
      got: emDashDialogueCount,
      details: emDashExamples.join(" | "),
    });
  }

  // 3. Guillemets
  const guillemetCount = (allTransText.match(/[«»]/g) || []).length;
  if (guillemetCount > 0) {
    failures.push({ check: "guillemets", expected: 0, got: guillemetCount });
  }

  // 4. Japanese brackets
  const jpBracketCount = (allTransText.match(/[「」『』]/g) || []).length;
  if (jpBracketCount > 0) {
    failures.push({ check: "jp_brackets", expected: 0, got: jpBracketCount });
  }

  // 5. Straight double quotes (should be all curly " " or single ' ')
  const straightDoubleCount = (allTransText.match(/"/g) || []).length;
  if (straightDoubleCount > 0) {
    failures.push({ check: "straight_double_quote", expected: 0, got: straightDoubleCount });
  }

  // 6. Straight single quotes NOT in apostrophe position (\w'\w is allowed)
  // Remove all \w'\w occurrences, then count remaining '
  const strippedSingles = allTransText.replace(/\w'\w/g, "__").replace(/\w'/g, "__");
  const straightSingleCount = (strippedSingles.match(/'/g) || []).length;
  if (straightSingleCount > 0) {
    failures.push({ check: "straight_single_quote", expected: 0, got: straightSingleCount });
  }

  // 7. Hemistich slash rate (fa/chg/chg-babur) for poetry
  // Count paragraphs where source has a slash and translation does not — mirrors
  // the inline guardrail in translate-batch.ts (line ~740). This is stricter than
  // comparing total slash counts because scholarly transliterations can contain
  // slashes for manuscript markers (e.g. "C/lla.") that are not hemistich separators.
  const hemistichSources = new Set(["fa", "chg", "chg-babur"]);
  if (hemistichSources.has(sourceLanguage) && textType === "poetry") {
    let srcWithSlash = 0;
    let transMissingSlash = 0;
    for (let i = 0; i < Math.min(srcParas.length, transParas.length); i++) {
      const srcHas = srcParas[i]!.text.includes("/");
      const transHas = transParas[i]!.text.includes("/");
      if (srcHas) srcWithSlash++;
      if (srcHas && !transHas) transMissingSlash++;
    }
    if (srcWithSlash > 0) {
      const preserved = srcWithSlash - transMissingSlash;
      const rate = preserved / srcWithSlash;
      if (rate < 0.95) {
        failures.push({
          check: "hemistich_slash_rate",
          expected: ">=95% of couplets preserve /",
          got: `${(rate * 100).toFixed(1)}% (${preserved}/${srcWithSlash})`,
        });
      }
    }
  }

  // 8. Poetry line count — for every stanza with srcLines>1, must match
  if (textType === "poetry") {
    const mismatches: { index: number; src: number; trans: number }[] = [];
    for (let i = 0; i < Math.min(srcParas.length, transParas.length); i++) {
      const srcLines = srcParas[i]!.text.split("\n").length;
      const transLines = transParas[i]!.text.split("\n").length;
      if (srcLines > 1 && srcLines !== transLines) {
        mismatches.push({ index: i, src: srcLines, trans: transLines });
      }
    }
    if (mismatches.length > 0) {
      failures.push({
        check: "poetry_line_count",
        expected: "equal per stanza",
        got: `${mismatches.length} mismatched stanzas`,
        details: mismatches
          .slice(0, 3)
          .map((m) => `p${m.index}: ${m.src}→${m.trans}`)
          .join(", "),
      });
    }
  }

  // 9. Length ratio
  const srcChars = allSrcText.length;
  const transChars = allTransText.length;
  const minRatio = MIN_LENGTH_RATIO_ES[sourceLanguage] ?? MIN_LENGTH_RATIO_ES.default!;
  if (srcChars > 500 && transChars / srcChars < minRatio) {
    failures.push({
      check: "length_ratio",
      expected: `>=${minRatio}`,
      got: (transChars / srcChars).toFixed(2),
      details: `src=${srcChars}, trans=${transChars}`,
    });
  }

  const result = {
    slug,
    chapter: chapterNumber,
    sourceLanguage,
    textType,
    passed: failures.length === 0,
    srcParagraphs: srcParas.length,
    transParagraphs: transParas.length,
    srcChars,
    transChars,
    ratio: srcChars > 0 ? transChars / srcChars : null,
    minRatio,
    failures,
  };

  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));

  await sql.end();
  process.exit(result.passed ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(2);
});
