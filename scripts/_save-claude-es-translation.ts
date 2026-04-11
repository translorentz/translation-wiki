/**
 * Save a Claude direct-translate Spanish translation for a short-verse chapter.
 *
 * Usage:
 *   cat payload.json | pnpm tsx scripts/_save-claude-es-translation.ts [--dry-run]
 *
 * Payload format (stdin):
 *   {
 *     "text_slug": "carmina-life-of-wise-elder",
 *     "chapter_number": 1,
 *     "paragraphs": [
 *       { "index": 0, "text": "Las hojas del otoño\ncaen sobre la tierra." },
 *       ...
 *     ],
 *     "edit_summary": "Claude direct translation: ..."
 *   }
 *
 * This script is the fallback for short-verse chapters where DeepSeek has failed
 * 3+ times with [LINEBREAK ERROR]. Claude (the subagent) translates the chapter
 * directly, preserving exact line structure, and saves via this helper.
 *
 * Validation before save:
 *   - every paragraph must have {index, text}
 *   - paragraph count matches source
 *   - text must not be empty / whitespace-only
 *   - line count per paragraph must match source (the whole point)
 *
 * The insert uses sql.json() to avoid double-encoded JSONB (per CLAUDE.md).
 * Author ID is hardcoded to the system user (same pattern as translate-batch.ts).
 * edit_summary MUST start with "Claude direct translation:" for audit trail.
 */

import fs from "fs";
import path from "path";
import postgres from "postgres";

// ---------- env loading ----------
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

const DRY_RUN = process.argv.includes("--dry-run");

interface InputParagraph {
  index: number;
  text: string;
}
interface Payload {
  text_slug: string;
  chapter_number: number;
  paragraphs: InputParagraph[];
  edit_summary: string;
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function fail(messages: string[]): never {
  console.error("VALIDATION FAILED:");
  for (const m of messages) console.error("  -", m);
  process.exit(1);
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) {
    console.error("No payload on stdin. Pipe a JSON payload.");
    process.exit(2);
  }

  let payload: Payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    console.error("Invalid JSON payload:", e instanceof Error ? e.message : e);
    process.exit(2);
  }

  // ---- structural validation ----
  const errs: string[] = [];
  if (!payload.text_slug || typeof payload.text_slug !== "string") {
    errs.push("text_slug missing or not a string");
  }
  if (typeof payload.chapter_number !== "number" || Number.isNaN(payload.chapter_number)) {
    errs.push("chapter_number missing or not a number");
  }
  if (!Array.isArray(payload.paragraphs) || payload.paragraphs.length === 0) {
    errs.push("paragraphs missing or empty");
  }
  if (!payload.edit_summary || typeof payload.edit_summary !== "string") {
    errs.push("edit_summary missing or not a string");
  } else if (!payload.edit_summary.startsWith("Claude direct translation:")) {
    errs.push(
      "edit_summary must start with 'Claude direct translation:' (audit trail requirement)"
    );
  }
  if (errs.length) fail(errs);

  for (let i = 0; i < payload.paragraphs.length; i++) {
    const p = payload.paragraphs[i]!;
    if (typeof p.index !== "number") errs.push(`paragraph ${i}: missing numeric index`);
    if (typeof p.text !== "string") errs.push(`paragraph ${i}: missing string text`);
    else if (p.text.trim().length === 0)
      errs.push(`paragraph ${i}: text is empty or whitespace-only`);
  }
  if (errs.length) fail(errs);

  // Verify indices are unique (we'll match against source indices after fetching)
  const seenIdx = new Set<number>();
  for (const p of payload.paragraphs) {
    if (seenIdx.has(p.index)) errs.push(`duplicate paragraph index: ${p.index}`);
    seenIdx.add(p.index);
  }
  if (errs.length) fail(errs);

  // ---- DB fetch source for comparison ----
  const sql = postgres(process.env.DATABASE_URL!);

  const rows = await sql<
    {
      chapter_id: number;
      source_content: { paragraphs?: { index: number; text: string }[] };
      text_id: number;
      text_slug: string;
    }[]
  >`
    SELECT c.id AS chapter_id, c.source_content, t.id AS text_id, t.slug AS text_slug
    FROM chapters c
    JOIN texts t ON t.id = c.text_id
    WHERE t.slug = ${payload.text_slug} AND c.chapter_number = ${payload.chapter_number}
    LIMIT 1
  `;

  if (rows.length === 0) {
    await sql.end();
    fail([`Chapter not found: text_slug=${payload.text_slug} chapter_number=${payload.chapter_number}`]);
  }

  const row = rows[0]!;
  const srcParas = row.source_content?.paragraphs ?? [];
  if (!Array.isArray(srcParas) || srcParas.length === 0) {
    await sql.end();
    fail([`Source content has no paragraphs for ${payload.text_slug} ch${payload.chapter_number}`]);
  }

  // ---- paragraph count match ----
  if (srcParas.length !== payload.paragraphs.length) {
    await sql.end();
    fail([
      `paragraph count mismatch: source=${srcParas.length}, translation=${payload.paragraphs.length}`,
    ]);
  }

  // ---- indices must match source exactly ----
  const srcIdxSet = new Set(srcParas.map((p) => p.index));
  const idxMismatches: string[] = [];
  for (const p of payload.paragraphs) {
    if (!srcIdxSet.has(p.index)) {
      idxMismatches.push(`translation has index ${p.index} but source does not`);
    }
  }
  if (idxMismatches.length > 0) {
    await sql.end();
    fail(idxMismatches);
  }

  // Build map of src by index
  const srcByIdx = new Map<number, string>();
  for (const p of srcParas) srcByIdx.set(p.index, p.text);

  // ---- line count match per paragraph (the whole point) ----
  const lineMismatches: string[] = [];
  for (const p of payload.paragraphs) {
    const srcText = srcByIdx.get(p.index)!;
    const srcLines = srcText.split("\n").length;
    const transLines = p.text.split("\n").length;
    if (srcLines !== transLines) {
      lineMismatches.push(`p${p.index}: src=${srcLines} lines, trans=${transLines} lines`);
    }
  }
  if (lineMismatches.length > 0) {
    await sql.end();
    fail([
      "line count mismatch (verse structure must be preserved exactly):",
      ...lineMismatches.slice(0, 10),
    ]);
  }

  // ---- length sanity (trans shouldn't be absurdly short/long) ----
  const srcChars = srcParas.map((p) => p.text).join("\n").length;
  const transChars = payload.paragraphs.map((p) => p.text).join("\n").length;
  const ratio = srcChars > 0 ? transChars / srcChars : 0;
  // Loose bounds: 0.2 to 6.0 — mainly to catch accidents, not enforce policy
  if (srcChars > 100 && (ratio < 0.2 || ratio > 6.0)) {
    await sql.end();
    fail([
      `length ratio out of sane bounds: ${ratio.toFixed(2)} (src=${srcChars}, trans=${transChars})`,
    ]);
  }

  console.log(`Validated: ${payload.paragraphs.length} paragraphs, ratio=${ratio.toFixed(2)}`);
  console.log(`Target: ${payload.text_slug} ch${payload.chapter_number} (chapter_id=${row.chapter_id})`);

  if (DRY_RUN) {
    console.log("\n[DRY RUN] Would insert:");
    console.log(`  translations row: chapter_id=${row.chapter_id}, target_language='es'`);
    console.log(`  translation_versions row:`);
    console.log(`    version_number=1`);
    console.log(`    author_id=1 (AI_USER_ID)`);
    console.log(`    edit_summary="${payload.edit_summary}"`);
    console.log(`    content.paragraphs.length=${payload.paragraphs.length}`);
    console.log(`    first paragraph preview: ${payload.paragraphs[0]!.text.slice(0, 100)}...`);
    await sql.end();
    process.exit(0);
  }

  // ---- find or create system user (username='system') ----
  const sysUserRows = await sql<{ id: number }[]>`
    SELECT id FROM users WHERE username = 'system' LIMIT 1
  `;
  let systemUserId: number;
  if (sysUserRows.length === 0) {
    const inserted = await sql<{ id: number }[]>`
      INSERT INTO users (email, username, password_hash, role)
      VALUES ('system@translation-wiki.local', 'system', 'SYSTEM_USER_NO_LOGIN', 'admin')
      RETURNING id
    `;
    systemUserId = inserted[0]!.id;
    console.log(`Created system user (id=${systemUserId})`);
  } else {
    systemUserId = sysUserRows[0]!.id;
  }

  // ---- find or create translations row ----
  const existingTrans = await sql<{ id: number; current_version_id: number | null }[]>`
    SELECT id, current_version_id FROM translations
    WHERE chapter_id = ${row.chapter_id} AND target_language = 'es'
    LIMIT 1
  `;

  let translationId: number;
  let nextVersionNumber = 1;
  if (existingTrans.length === 0) {
    const inserted = await sql<{ id: number }[]>`
      INSERT INTO translations (chapter_id, target_language)
      VALUES (${row.chapter_id}, 'es')
      RETURNING id
    `;
    translationId = inserted[0]!.id;
  } else {
    translationId = existingTrans[0]!.id;
    // Compute next version number
    const maxV = await sql<{ mx: number | null }[]>`
      SELECT MAX(version_number) AS mx FROM translation_versions WHERE translation_id = ${translationId}
    `;
    nextVersionNumber = (maxV[0]!.mx ?? 0) + 1;
  }

  // ---- insert translation_versions row (sql.json to avoid double-encoding) ----
  const content = { paragraphs: payload.paragraphs };
  const versionRows = await sql<{ id: number }[]>`
    INSERT INTO translation_versions (
      translation_id, version_number, content, author_id, edit_summary, created_at
    ) VALUES (
      ${translationId},
      ${nextVersionNumber},
      ${sql.json(content)},
      ${systemUserId},
      ${payload.edit_summary},
      NOW()
    )
    RETURNING id
  `;
  const versionId = versionRows[0]!.id;

  // ---- update head pointer ----
  await sql`
    UPDATE translations
    SET current_version_id = ${versionId}, updated_at = NOW()
    WHERE id = ${translationId}
  `;

  console.log(
    `SAVED: ${payload.text_slug} ch${payload.chapter_number} → translation_versions.id=${versionId}, version=${nextVersionNumber}`
  );

  await sql.end();
  process.exit(0);
}

main().catch((e) => {
  console.error("FATAL:", e instanceof Error ? e.stack || e.message : e);
  process.exit(2);
});
