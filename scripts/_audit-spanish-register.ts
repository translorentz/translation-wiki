// Spanish register audit.
// Samples N random chapters from a given pool (or a wave's texts) and checks:
//   - NO \bvosotros\b
//   - NO \bos\b clitic
//   - NO Peninsular markers: \bordenador\b, \bpiscina\b (as exclusive),
//     \bcoger\b outside literary/Latin-American sense (flag-only)
//   - For mx-bucket chapters (literature / poetry), >= 80% contain ¿ or ¡
//
// Usage:
//   pnpm tsx scripts/_audit-spanish-register.ts --wave 2d --sample 30
//   pnpm tsx scripts/_audit-spanish-register.ts --slugs slug1,slug2 --sample 10

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

type Finding = {
  slug: string;
  chapterNumber: number;
  register: "mx" | "neutro";
  sourceLanguage: string;
  genre: string;
  textType: string;
  checks: {
    vosotros: number;
    osClitic: number;
    ordenador: number;
    piscina: number;
    cogerFlag: number;
    hasSpanishPunct: boolean; // ¿ or ¡
  };
  violations: string[];
};

function parseArgs() {
  const argv = process.argv.slice(2);
  let wave: string | undefined;
  let slugsArg: string | undefined;
  let sample = 30;
  let outPath = "/tmp/es-register-audit.json";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--wave") wave = argv[i + 1];
    if (argv[i] === "--slugs") slugsArg = argv[i + 1];
    if (argv[i] === "--sample") sample = parseInt(argv[i + 1]!, 10);
    if (argv[i] === "--out") outPath = argv[i + 1]!;
  }
  return { wave, slugsArg, sample, outPath };
}

function resolveRegister(textType: string, genre: string): "mx" | "neutro" {
  if (textType === "poetry") return "mx";
  if (genre === "literature" || genre === "poetry") return "mx";
  return "neutro";
}

async function main() {
  const { wave, slugsArg, sample, outPath } = parseArgs();

  let slugs: string[] = [];
  if (slugsArg) {
    slugs = slugsArg.split(",").map((s) => s.trim()).filter(Boolean);
  } else if (wave === "2d" || wave === "2D") {
    const partition = JSON.parse(
      fs.readFileSync("/tmp/es-wave-2d-partition.json", "utf-8")
    ) as Array<{ slugs: string[] }>;
    slugs = partition.flatMap((p) => p.slugs);
  } else {
    console.error("Must pass --wave 2d or --slugs slug1,slug2,...");
    process.exit(2);
  }

  // Fetch random translated chapters
  const rows = await sql<
    {
      slug: string;
      chapter_number: number;
      source_language: string;
      text_type: string;
      genre: string;
      translation_content: unknown;
    }[]
  >`
    SELECT
      t.slug,
      c.chapter_number,
      l.code AS source_language,
      t.text_type,
      t.genre,
      tv.content AS translation_content
    FROM chapters c
    JOIN texts t ON t.id = c.text_id
    JOIN languages l ON l.id = t.language_id
    JOIN translations tr ON tr.chapter_id = c.id AND tr.target_language = 'es'
    JOIN translation_versions tv ON tv.id = tr.current_version_id
    WHERE t.slug = ANY(${slugs})
    ORDER BY random()
    LIMIT ${sample * 2}
  `;

  // Split into mx and neutro buckets, pick up to `sample` each
  const mxRows: typeof rows = [];
  const neutroRows: typeof rows = [];
  for (const r of rows) {
    const reg = resolveRegister(r.text_type, r.genre);
    if (reg === "mx" && mxRows.length < sample) mxRows.push(r);
    if (reg === "neutro" && neutroRows.length < sample) neutroRows.push(r);
  }

  const findings: Finding[] = [];

  for (const row of [...mxRows, ...neutroRows]) {
    const content = row.translation_content as { paragraphs: { text: string }[] };
    if (!content?.paragraphs) continue;
    const allText = content.paragraphs.map((p) => p.text).join("\n");

    const vosotros = (allText.match(/\bvosotros\b/gi) || []).length;
    const osClitic = (allText.match(/\bos\s+(he|has|ha|hemos|habéis|han|vi|viste|vio|dije|digo|doy|voy|tengo|pido)/gi) || []).length;
    const ordenador = (allText.match(/\bordenador\b/gi) || []).length;
    const piscina = (allText.match(/\bpiscina\b/gi) || []).length;
    const cogerFlag = (allText.match(/\bcog(er|ió|ía|iendo|ida|ido)\b/gi) || []).length;
    const hasSpanishPunct = /[¿¡]/.test(allText);

    const violations: string[] = [];
    if (vosotros > 0) violations.push(`vosotros×${vosotros}`);
    if (osClitic > 0) violations.push(`os-clitic×${osClitic}`);
    if (ordenador > 0) violations.push(`ordenador×${ordenador}`);
    if (piscina > 0) violations.push(`piscina×${piscina}`);

    const register = resolveRegister(row.text_type, row.genre);
    findings.push({
      slug: row.slug,
      chapterNumber: row.chapter_number,
      register,
      sourceLanguage: row.source_language,
      genre: row.genre,
      textType: row.text_type,
      checks: {
        vosotros,
        osClitic,
        ordenador,
        piscina,
        cogerFlag,
        hasSpanishPunct,
      },
      violations,
    });
  }

  // Summary
  const mxSample = findings.filter((f) => f.register === "mx");
  const neutroSample = findings.filter((f) => f.register === "neutro");
  const mxWithPunct = mxSample.filter((f) => f.checks.hasSpanishPunct).length;
  const mxPunctRate = mxSample.length > 0 ? mxWithPunct / mxSample.length : 0;
  const violationsFound = findings.filter((f) => f.violations.length > 0);

  const summary = {
    timestamp: new Date().toISOString(),
    sampleRequested: sample,
    mxSampled: mxSample.length,
    neutroSampled: neutroSample.length,
    totalSampled: findings.length,
    mxWithSpanishPunct: mxWithPunct,
    mxPunctRate: (mxPunctRate * 100).toFixed(1) + "%",
    mxPunctPass: mxPunctRate >= 0.8,
    hardViolations: violationsFound.length,
    hardViolationDetails: violationsFound.map((f) => ({
      slug: f.slug,
      chapter: f.chapterNumber,
      register: f.register,
      violations: f.violations,
    })),
    passed: violationsFound.length === 0 && (mxSample.length === 0 || mxPunctRate >= 0.8),
  };

  fs.writeFileSync(outPath, JSON.stringify({ summary, findings }, null, 2));

  console.log(`Register audit: sample=${findings.length} (mx=${mxSample.length}, neutro=${neutroSample.length})`);
  console.log(`  Hard violations: ${violationsFound.length}`);
  console.log(`  MX Spanish punct (¿/¡): ${mxWithPunct}/${mxSample.length} (${(mxPunctRate * 100).toFixed(1)}%)`);
  console.log(`  PASS: ${summary.passed}`);
  if (violationsFound.length > 0) {
    console.log("\n  Violations:");
    for (const v of violationsFound) {
      console.log(`    ${v.slug} ch${v.chapterNumber}: ${v.violations.join(", ")}`);
    }
  }

  await sql.end();
  process.exit(summary.passed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
