/**
 * Audits chapter titles across all texts to identify those missing English translations.
 *
 * Expected format for non-English texts:
 * - "Original Title (English Translation)" — e.g., "理氣 (Principle and Vital Force)"
 * - Or just English if the original script title is too complex
 *
 * Usage: pnpm tsx scripts/audit-chapter-titles.ts
 *
 * The script will:
 * 1. Query all chapters from the database grouped by text/language
 * 2. Identify chapters where the title is ONLY in the original script (no English)
 * 3. Report which texts have missing English translations
 */

import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql } from "drizzle-orm";
import * as schema from "../src/server/db/schema";

// Load .env.local manually
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^DATABASE_URL=(.+)$/);
    if (match) {
      process.env.DATABASE_URL = match[1].replace(/^['"]|['"]$/g, "");
    }
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is required.");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

// Character ranges for detecting non-Latin scripts
const SCRIPT_PATTERNS = {
  chinese: /[\u4E00-\u9FFF\u3400-\u4DBF]/,       // CJK Unified Ideographs
  greek: /[\u0370-\u03FF\u1F00-\u1FFF]/,         // Greek and Extended Greek (polytonic)
  armenian: /[\u0530-\u058F]/,                   // Armenian
  tamil: /[\u0B80-\u0BFF]/,                      // Tamil
  cyrillic: /[\u0400-\u04FF]/,                   // Cyrillic (if needed)
  latin: /[A-Za-z]/,                             // Basic Latin
};

// Languages that need English translations in chapter titles
const NEEDS_ENGLISH = ["zh", "grc", "la", "ta", "hy", "it"];

// English-only texts (Latin/Italian texts with English titles already)
// These don't need parenthetical English because the main title IS English
const ENGLISH_TITLE_LANGUAGES = ["en"];

interface ChapterTitleIssue {
  chapterNumber: number;
  title: string;
  issue: string;
}

interface TextAuditResult {
  textId: number;
  textSlug: string;
  textTitle: string;
  languageCode: string;
  totalChapters: number;
  chaptersWithIssues: ChapterTitleIssue[];
}

/**
 * Determines if a title contains an English translation.
 * Supported formats:
 * - "原文 (English)" or "Ελληνικά (English)" — parentheses format
 * - "Ἀρμενική — English" — em-dash format (used in Armenian texts)
 */
function hasEnglishTranslation(title: string): boolean {
  if (!title) return false;

  // Check for em-dash format first: "Armenian — English"
  const emDashMatch = title.match(/ — (.+)$/);
  if (emDashMatch) {
    const english = emDashMatch[1].trim();
    const latinChars = english.match(/[A-Za-z]/g)?.length || 0;
    if (latinChars >= 3 && latinChars > english.length * 0.3) {
      return true;
    }
  }

  // Look for parenthetical content at end
  const lastClose = title.lastIndexOf(")");
  if (lastClose !== title.length - 1 || lastClose <= 0) return false;

  // Find matching open paren
  let depth = 0;
  let openPos = -1;
  for (let i = lastClose; i >= 0; i--) {
    if (title[i] === ")") depth++;
    else if (title[i] === "(") {
      depth--;
      if (depth === 0) {
        openPos = i;
        break;
      }
    }
  }

  if (openPos <= 0) return false;

  const english = title.slice(openPos + 1, lastClose).trim();

  // Check if the parenthetical content is primarily Latin script (English)
  // Must have at least some Latin characters
  const latinChars = english.match(/[A-Za-z]/g)?.length || 0;
  return latinChars >= 3 && latinChars > english.length * 0.3;
}

/**
 * Determines if a title is entirely in English (Latin script).
 */
function isEnglishTitle(title: string): boolean {
  if (!title) return false;

  // Count characters by script
  let latinCount = 0;
  let otherScriptCount = 0;

  for (const char of title) {
    if (SCRIPT_PATTERNS.latin.test(char)) {
      latinCount++;
    } else if (
      SCRIPT_PATTERNS.chinese.test(char) ||
      SCRIPT_PATTERNS.greek.test(char) ||
      SCRIPT_PATTERNS.armenian.test(char) ||
      SCRIPT_PATTERNS.tamil.test(char)
    ) {
      otherScriptCount++;
    }
    // Ignore numbers, punctuation, spaces
  }

  // Title is English if mostly Latin with minimal other scripts
  return latinCount > 0 && otherScriptCount === 0;
}

/**
 * Identifies what non-Latin script is in the title.
 */
function detectScript(title: string): string {
  if (SCRIPT_PATTERNS.chinese.test(title)) return "Chinese";
  if (SCRIPT_PATTERNS.greek.test(title)) return "Greek";
  if (SCRIPT_PATTERNS.armenian.test(title)) return "Armenian";
  if (SCRIPT_PATTERNS.tamil.test(title)) return "Tamil";
  if (SCRIPT_PATTERNS.cyrillic.test(title)) return "Cyrillic";
  return "Unknown";
}

/**
 * Analyzes a chapter title and returns issues if any.
 */
function analyzeTitle(
  title: string | null,
  languageCode: string,
  chapterNumber: number
): ChapterTitleIssue | null {
  if (!title) {
    return {
      chapterNumber,
      title: "(null)",
      issue: "Missing title",
    };
  }

  // English-language texts don't need parenthetical translations
  if (ENGLISH_TITLE_LANGUAGES.includes(languageCode)) {
    return null;
  }

  // If the title is already entirely in English (Latin script), it's fine
  if (isEnglishTitle(title)) {
    return null;
  }

  // Check if title has English translation in parentheses
  if (hasEnglishTranslation(title)) {
    return null;
  }

  // Title contains non-Latin script but no English translation
  const script = detectScript(title);
  return {
    chapterNumber,
    title,
    issue: `${script} title without English translation`,
  };
}

async function auditChapterTitles(): Promise<TextAuditResult[]> {
  const results: TextAuditResult[] = [];

  // Get all texts with their languages
  const textsWithLanguages = await db
    .select({
      textId: schema.texts.id,
      textSlug: schema.texts.slug,
      textTitle: schema.texts.title,
      languageCode: schema.languages.code,
    })
    .from(schema.texts)
    .innerJoin(schema.languages, eq(schema.texts.languageId, schema.languages.id))
    .orderBy(schema.languages.code, schema.texts.title);

  for (const text of textsWithLanguages) {
    // Get all chapters for this text
    const chapters = await db
      .select({
        chapterNumber: schema.chapters.chapterNumber,
        title: schema.chapters.title,
      })
      .from(schema.chapters)
      .where(eq(schema.chapters.textId, text.textId))
      .orderBy(schema.chapters.chapterNumber);

    const issues: ChapterTitleIssue[] = [];

    for (const chapter of chapters) {
      const issue = analyzeTitle(chapter.title, text.languageCode, chapter.chapterNumber);
      if (issue) {
        issues.push(issue);
      }
    }

    results.push({
      textId: text.textId,
      textSlug: text.textSlug,
      textTitle: text.textTitle,
      languageCode: text.languageCode,
      totalChapters: chapters.length,
      chaptersWithIssues: issues,
    });
  }

  return results;
}

function printReport(results: TextAuditResult[]): void {
  console.log("=" .repeat(80));
  console.log("CHAPTER TITLE AUDIT REPORT");
  console.log("=" .repeat(80));
  console.log();

  // Summary by language
  const byLanguage = new Map<string, TextAuditResult[]>();
  for (const result of results) {
    const existing = byLanguage.get(result.languageCode) || [];
    existing.push(result);
    byLanguage.set(result.languageCode, existing);
  }

  let totalTextsWithIssues = 0;
  let totalChaptersWithIssues = 0;

  for (const [lang, texts] of byLanguage) {
    const textsWithIssues = texts.filter(t => t.chaptersWithIssues.length > 0);
    const chaptersWithIssues = textsWithIssues.reduce(
      (sum, t) => sum + t.chaptersWithIssues.length, 0
    );
    const totalChapters = texts.reduce((sum, t) => sum + t.totalChapters, 0);

    if (textsWithIssues.length === 0) {
      console.log(`[${lang}] ${texts.length} text(s), ${totalChapters} chapters - ALL OK`);
      continue;
    }

    console.log();
    console.log("-" .repeat(80));
    console.log(`[${lang}] ${textsWithIssues.length}/${texts.length} text(s) with issues, ${chaptersWithIssues}/${totalChapters} chapters affected`);
    console.log("-" .repeat(80));

    for (const text of textsWithIssues) {
      totalTextsWithIssues++;
      totalChaptersWithIssues += text.chaptersWithIssues.length;

      console.log();
      console.log(`  TEXT: ${text.textTitle}`);
      console.log(`  SLUG: ${text.textSlug}`);
      console.log(`  CHAPTERS: ${text.chaptersWithIssues.length}/${text.totalChapters} have issues`);
      console.log();

      // Show first 10 issues, then summarize
      const samplesToShow = Math.min(10, text.chaptersWithIssues.length);
      for (let i = 0; i < samplesToShow; i++) {
        const issue = text.chaptersWithIssues[i];
        console.log(`    Ch ${String(issue.chapterNumber).padStart(3)}: "${truncate(issue.title, 50)}" - ${issue.issue}`);
      }

      if (text.chaptersWithIssues.length > samplesToShow) {
        console.log(`    ... and ${text.chaptersWithIssues.length - samplesToShow} more chapters`);
      }
    }
  }

  console.log();
  console.log("=" .repeat(80));
  console.log("SUMMARY");
  console.log("=" .repeat(80));
  console.log(`Total texts with issues: ${totalTextsWithIssues}`);
  console.log(`Total chapters with issues: ${totalChaptersWithIssues}`);
  console.log();
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

async function main() {
  console.log("Auditing chapter titles...\n");

  const results = await auditChapterTitles();
  printReport(results);

  // Output JSON for further processing
  const outputPath = path.resolve(__dirname, "../data/chapter-title-audit.json");
  const issuesOnly = results.filter(r => r.chaptersWithIssues.length > 0);
  fs.writeFileSync(outputPath, JSON.stringify(issuesOnly, null, 2));
  console.log(`\nDetailed results written to: ${outputPath}`);

  await client.end();
}

main().catch((err) => {
  console.error("Audit failed:", err);
  client.end().then(() => process.exit(1));
});
