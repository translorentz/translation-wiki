/**
 * Spanish quote retrofit — convert legacy ES translations from curly "" primary
 * (the wrong convention inherited from EN/ZH Universal Dialogue Punctuation Rule)
 * to pan-Hispanic RAE:
 *   - «...» comillas latinas as primary (for quotations)
 *   - — raya as primary (for character dialogue in narrative)
 *   - curly "" only as nested secondary
 *
 * Strategy: per-chapter judicious regex, safe fallbacks, versioning-compliant
 * (inserts new translation_versions; does NOT mutate in place).
 *
 * Usage:
 *   pnpm tsx scripts/_retrofit-es-quotes.ts --dry-run
 *   pnpm tsx scripts/_retrofit-es-quotes.ts --dry-run --chapter-id 12345
 *   pnpm tsx scripts/_retrofit-es-quotes.ts --chapter-id 12345   # single chapter
 *   pnpm tsx scripts/_retrofit-es-quotes.ts                       # all ES chapters
 *
 * Safety:
 *   - Dry-run mode: reports changes without writing
 *   - Per-paragraph length validation (95–105%)
 *   - Per-paragraph curly-double count validation (must decrease for changed paras)
 *   - Inserts a NEW translation_version with an edit summary (append-only)
 *   - Halts if > 100 paragraphs fail validation
 */

import fs from "fs";
import path from "path";
import postgres from "postgres";

// Load DATABASE_URL from .env.local
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

type Paragraph = { index: number; text: string };
type Content = { paragraphs: Paragraph[] };

const AI_USER_ID = 1; // System user for automated edits

interface Args {
  dryRun: boolean;
  chapterId: number | null;
  textSlug: string | null;
  limit: number | null;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const out: Args = { dryRun: false, chapterId: null, textSlug: null, limit: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--chapter-id") out.chapterId = parseInt(args[++i]!, 10);
    else if (a === "--text-slug") out.textSlug = args[++i]!;
    else if (a === "--limit") out.limit = parseInt(args[++i]!, 10);
  }
  return out;
}

/**
 * Convert a paragraph of text from curly "" primary to «» primary.
 * Returns the new text, or the original if no safe transformation is possible.
 *
 * Rules (applied in order):
 *   1. Leave paragraph-leading — (raya dialogue) alone
 *   2. Leave existing «...» alone (already correct)
 *   3. Convert 「...」 and 『...』 → «...»
 *   4. For curly "...", convert to «...» ONLY when it is at top level
 *      (not nested inside existing «»)
 *   5. Convert straight ASCII " pairs → «...» (should be rare)
 *
 * Apostrophes in contractions (l', d', c'est, it's, o'clock) are preserved.
 */
function retrofitParagraph(text: string): string {
  let s = text;

  // 1. Japanese corner brackets → «»
  s = s.replace(/「([^」]{0,1500})」/g, "\u00ab$1\u00bb");
  s = s.replace(/『([^』]{0,1500})』/g, "\u00ab$1\u00bb");
  // Any stragglers
  s = s.replace(/[「『]/g, "\u00ab").replace(/[」』]/g, "\u00bb");

  // 2. Segment the string by guillemet depth so we only transform top level.
  type Segment = { inside: boolean; text: string };
  const segments: Segment[] = [];
  {
    let depth = 0;
    let buf = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i]!;
      if (ch === "\u00ab") {
        if (depth === 0 && buf.length > 0) {
          segments.push({ inside: false, text: buf });
          buf = "";
        }
        depth++;
        buf += ch;
      } else if (ch === "\u00bb") {
        buf += ch;
        depth--;
        if (depth === 0) {
          segments.push({ inside: true, text: buf });
          buf = "";
        } else if (depth < 0) {
          // Stray close — reset
          depth = 0;
          segments.push({ inside: false, text: buf });
          buf = "";
        }
      } else {
        buf += ch;
      }
    }
    if (buf.length > 0) {
      segments.push({ inside: depth > 0, text: buf });
    }
  }

  // 3. For each top-level (outside) segment, convert curly "..." → «...»
  //    We use a non-greedy match bounded to 1500 chars.
  for (const seg of segments) {
    if (seg.inside) continue;
    seg.text = seg.text.replace(
      /\u201C([^\u201C\u201D]{0,1500})\u201D/g,
      "\u00ab$1\u00bb"
    );
    // Straight ASCII " pairs → «»
    {
      const parts = seg.text.split('"');
      if (parts.length > 1) {
        let out = parts[0]!;
        for (let i = 1; i < parts.length; i++) {
          out += i % 2 === 1 ? "\u00ab" : "\u00bb";
          out += parts[i]!;
        }
        seg.text = out;
      }
    }
  }

  return segments.map((seg) => seg.text).join("");
}

interface RetrofitResult {
  translationId: number;
  chapterId: number;
  textSlug: string;
  chapterNumber: number;
  versionId: number;
  paragraphsChanged: number;
  paragraphsFailed: number;
  lengthRatio: number;
  curlyBefore: number;
  curlyAfter: number;
  guillemetsBefore: number;
  guillemetsAfter: number;
  status: "changed" | "unchanged" | "failed";
  reason?: string;
}

async function retrofitChapter(
  translationId: number,
  chapterId: number,
  textSlug: string,
  chapterNumber: number,
  versionId: number,
  content: Content,
  dryRun: boolean
): Promise<RetrofitResult> {
  const result: RetrofitResult = {
    translationId,
    chapterId,
    textSlug,
    chapterNumber,
    versionId,
    paragraphsChanged: 0,
    paragraphsFailed: 0,
    lengthRatio: 1,
    curlyBefore: 0,
    curlyAfter: 0,
    guillemetsBefore: 0,
    guillemetsAfter: 0,
    status: "unchanged",
  };

  if (!content?.paragraphs || !Array.isArray(content.paragraphs)) {
    result.status = "failed";
    result.reason = "malformed content";
    return result;
  }

  // Compute before metrics
  const allTextBefore = content.paragraphs.map((p) => p.text).join("\n");
  result.curlyBefore = (allTextBefore.match(/[\u201C\u201D]/g) || []).length;
  result.guillemetsBefore = (allTextBefore.match(/[\u00ab\u00bb]/g) || []).length;

  // Build new paragraphs
  const newParagraphs: Paragraph[] = [];
  for (const p of content.paragraphs) {
    const original = p.text;
    const transformed = retrofitParagraph(original);

    if (transformed === original) {
      newParagraphs.push({ index: p.index, text: original });
      continue;
    }

    // Validate: length within 95-105%
    const ratio = transformed.length / Math.max(1, original.length);
    if (ratio < 0.95 || ratio > 1.05) {
      result.paragraphsFailed++;
      newParagraphs.push({ index: p.index, text: original });
      continue;
    }

    // Validate: curly count should be <= before (we're converting to «»)
    const curlyBefore = (original.match(/[\u201C\u201D]/g) || []).length;
    const curlyAfter = (transformed.match(/[\u201C\u201D]/g) || []).length;
    if (curlyAfter > curlyBefore) {
      result.paragraphsFailed++;
      newParagraphs.push({ index: p.index, text: original });
      continue;
    }

    newParagraphs.push({ index: p.index, text: transformed });
    result.paragraphsChanged++;
  }

  const allTextAfter = newParagraphs.map((p) => p.text).join("\n");
  result.curlyAfter = (allTextAfter.match(/[\u201C\u201D]/g) || []).length;
  result.guillemetsAfter = (allTextAfter.match(/[\u00ab\u00bb]/g) || []).length;
  result.lengthRatio = allTextAfter.length / Math.max(1, allTextBefore.length);

  if (result.paragraphsChanged === 0) {
    result.status = "unchanged";
    return result;
  }

  // Insert new version (append-only)
  if (!dryRun) {
    const newContent: Content = { paragraphs: newParagraphs };
    // Get next version number
    const versionRows = await sql<{ max_version: number | null }[]>`
      SELECT MAX(version_number) AS max_version
      FROM translation_versions
      WHERE translation_id = ${translationId}
    `;
    const nextVersion = (versionRows[0]?.max_version ?? 0) + 1;

    const [inserted] = await sql<{ id: number }[]>`
      INSERT INTO translation_versions (
        translation_id,
        version_number,
        content,
        author_id,
        edit_summary,
        previous_version_id,
        created_at
      )
      VALUES (
        ${translationId},
        ${nextVersion},
        ${sql.json(newContent as unknown as Record<string, unknown>)},
        ${AI_USER_ID},
        ${`ES quote retrofit: curly \u201C\u201D primary \u2192 \u00ab\u00bb primary (${result.paragraphsChanged} paragraphs)`},
        ${versionId},
        NOW()
      )
      RETURNING id
    `;

    if (!inserted) {
      result.status = "failed";
      result.reason = "insert version failed";
      return result;
    }

    // Update translations.current_version_id
    await sql`
      UPDATE translations
      SET current_version_id = ${inserted.id}
      WHERE id = ${translationId}
    `;
  }

  result.status = "changed";
  return result;
}

async function main() {
  const args = parseArgs();

  console.log("=".repeat(72));
  console.log("Spanish quote retrofit");
  console.log("=".repeat(72));
  console.log(`Mode: ${args.dryRun ? "DRY RUN (no writes)" : "LIVE"}`);
  if (args.chapterId) console.log(`Chapter ID: ${args.chapterId}`);
  if (args.textSlug) console.log(`Text slug: ${args.textSlug}`);
  if (args.limit) console.log(`Limit: ${args.limit}`);
  console.log();

  // Fetch ES translations
  let rows: {
    translation_id: number;
    chapter_id: number;
    text_slug: string;
    chapter_number: number;
    version_id: number;
    content: unknown;
  }[];

  if (args.chapterId) {
    rows = await sql`
      SELECT
        tr.id AS translation_id,
        c.id AS chapter_id,
        t.slug AS text_slug,
        c.chapter_number,
        tv.id AS version_id,
        tv.content
      FROM translations tr
      JOIN chapters c ON c.id = tr.chapter_id
      JOIN texts t ON t.id = c.text_id
      JOIN translation_versions tv ON tv.id = tr.current_version_id
      WHERE tr.target_language = 'es'
        AND c.id = ${args.chapterId}
    `;
  } else if (args.textSlug) {
    rows = await sql`
      SELECT
        tr.id AS translation_id,
        c.id AS chapter_id,
        t.slug AS text_slug,
        c.chapter_number,
        tv.id AS version_id,
        tv.content
      FROM translations tr
      JOIN chapters c ON c.id = tr.chapter_id
      JOIN texts t ON t.id = c.text_id
      JOIN translation_versions tv ON tv.id = tr.current_version_id
      WHERE tr.target_language = 'es'
        AND t.slug = ${args.textSlug}
      ORDER BY c.chapter_number
      ${args.limit ? sql`LIMIT ${args.limit}` : sql``}
    `;
  } else {
    rows = await sql`
      SELECT
        tr.id AS translation_id,
        c.id AS chapter_id,
        t.slug AS text_slug,
        c.chapter_number,
        tv.id AS version_id,
        tv.content
      FROM translations tr
      JOIN chapters c ON c.id = tr.chapter_id
      JOIN texts t ON t.id = c.text_id
      JOIN translation_versions tv ON tv.id = tr.current_version_id
      WHERE tr.target_language = 'es'
      ORDER BY t.slug, c.chapter_number
      ${args.limit ? sql`LIMIT ${args.limit}` : sql``}
    `;
  }

  console.log(`Fetched ${rows.length} ES translations`);
  console.log();

  const results: RetrofitResult[] = [];
  let totalChanged = 0;
  let totalFailed = 0;
  let totalUnchanged = 0;
  let totalParasChanged = 0;
  let totalParasFailed = 0;

  for (const row of rows) {
    try {
      const res = await retrofitChapter(
        row.translation_id,
        row.chapter_id,
        row.text_slug,
        row.chapter_number,
        row.version_id,
        row.content as Content,
        args.dryRun
      );
      results.push(res);
      if (res.status === "changed") {
        totalChanged++;
        totalParasChanged += res.paragraphsChanged;
        totalParasFailed += res.paragraphsFailed;
      } else if (res.status === "failed") {
        totalFailed++;
      } else {
        totalUnchanged++;
      }

      if (res.status === "changed" || res.status === "failed") {
        console.log(
          `  [${res.status.toUpperCase()}] ${row.text_slug} ch${row.chapter_number}: ` +
            `changed=${res.paragraphsChanged} failed=${res.paragraphsFailed} ` +
            `curly ${res.curlyBefore}\u2192${res.curlyAfter} ` +
            `« » ${res.guillemetsBefore}\u2192${res.guillemetsAfter} ` +
            `ratio=${res.lengthRatio.toFixed(3)}` +
            (res.reason ? ` reason=${res.reason}` : "")
        );
      }
    } catch (err) {
      totalFailed++;
      console.error(
        `  [ERROR] ${row.text_slug} ch${row.chapter_number}: ${(err as Error).message}`
      );
    }
  }

  console.log();
  console.log("=".repeat(72));
  console.log(`Summary (${args.dryRun ? "DRY RUN" : "LIVE"})`);
  console.log("=".repeat(72));
  console.log(`Chapters processed: ${rows.length}`);
  console.log(`  Changed: ${totalChanged}`);
  console.log(`  Unchanged: ${totalUnchanged}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log(`Paragraphs modified: ${totalParasChanged}`);
  console.log(`Paragraph validation failures: ${totalParasFailed}`);

  if (totalParasFailed > 100) {
    console.error();
    console.error(
      `HALT TRIGGER: ${totalParasFailed} paragraphs failed validation (threshold 100)`
    );
    await sql.end();
    process.exit(3);
  }

  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Retrofit crashed:", err);
  process.exit(2);
});
