/**
 * Scans translation content for untranslated Chinese characters.
 *
 * Usage: pnpm tsx scripts/check-untranslated-chinese.ts [--text <slug>]
 *
 * This script connects to the database and checks all translation versions
 * for any remaining Chinese Unicode characters that should have been translated.
 *
 * Chinese Unicode ranges checked:
 * - CJK Unified Ideographs: \u4e00-\u9fff
 * - CJK Punctuation: \u3000-\u303f
 */

import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, asc } from "drizzle-orm";
import * as schema from "../src/server/db/schema";

// ============================================================
// Configuration
// ============================================================

// Load .env.local manually
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const dbMatch = line.match(/^DATABASE_URL=(.+)$/);
    if (dbMatch) {
      process.env.DATABASE_URL = dbMatch[1].replace(/^['"]|['"]$/g, "");
    }
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

// ============================================================
// Argument parsing
// ============================================================

function parseArgs(): { textSlug: string | undefined } {
  const args = process.argv.slice(2);
  let textSlug: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--text" && args[i + 1]) {
      textSlug = args[i + 1];
    }
  }

  return { textSlug };
}

// ============================================================
// Chinese character detection
// ============================================================

// CJK Unified Ideographs: U+4E00 to U+9FFF
// CJK Punctuation and Symbols: U+3000 to U+303F
const CHINESE_REGEX = /[\u4e00-\u9fff\u3000-\u303f]+/g;

interface Issue {
  chapterNumber: number;
  paragraphIndex: number;
  text: string;
  foundChars: string[];
}

function findChineseCharacters(text: string): string[] {
  const matches = text.match(CHINESE_REGEX);
  return matches ? [...new Set(matches)] : [];
}

// ============================================================
// Main scanning logic
// ============================================================

async function scanText(textSlug: string): Promise<Issue[]> {
  const issues: Issue[] = [];

  // Find the text
  const text = await db.query.texts.findFirst({
    where: eq(schema.texts.slug, textSlug),
    with: { language: true },
  });

  if (!text) {
    console.error(`Text not found: ${textSlug}`);
    return issues;
  }

  // Only scan Chinese texts (the issue is about untranslated Chinese)
  if (text.language.code !== "zh") {
    console.log(`Skipping ${textSlug}: not a Chinese text (language: ${text.language.code})`);
    return issues;
  }

  // Get all chapters with their current translations
  const chapters = await db.query.chapters.findMany({
    where: eq(schema.chapters.textId, text.id),
    orderBy: asc(schema.chapters.chapterNumber),
    with: {
      translations: {
        with: {
          currentVersion: true,
        },
      },
    },
  });

  for (const chapter of chapters) {
    const translation = chapter.translations[0];
    if (!translation?.currentVersion) continue;

    const content = translation.currentVersion.content as {
      paragraphs: { index: number; text: string }[];
    } | null;

    if (!content?.paragraphs) continue;

    for (const paragraph of content.paragraphs) {
      const foundChars = findChineseCharacters(paragraph.text);
      if (foundChars.length > 0) {
        issues.push({
          chapterNumber: chapter.chapterNumber,
          paragraphIndex: paragraph.index,
          text: paragraph.text.length > 100
            ? paragraph.text.substring(0, 100) + "..."
            : paragraph.text,
          foundChars,
        });
      }
    }
  }

  return issues;
}

async function main() {
  const { textSlug } = parseArgs();

  console.log("Scanning translations for untranslated Chinese characters...\n");

  // Get texts to scan
  let textsToScan: { slug: string }[];

  if (textSlug) {
    textsToScan = [{ slug: textSlug }];
  } else {
    // Scan all Chinese texts
    const chineseLanguage = await db.query.languages.findFirst({
      where: eq(schema.languages.code, "zh"),
    });

    if (!chineseLanguage) {
      console.error("No Chinese language found in database");
      await client.end();
      process.exit(1);
    }

    const texts = await db.query.texts.findMany({
      where: eq(schema.texts.languageId, chineseLanguage.id),
    });

    textsToScan = texts.map((t) => ({ slug: t.slug }));
  }

  let totalIssues = 0;
  let textsWithIssues = 0;

  for (const { slug } of textsToScan) {
    const issues = await scanText(slug);

    if (issues.length > 0) {
      console.log(`=== ${slug} ===`);
      textsWithIssues++;

      // Group issues by chapter
      const byChapter = new Map<number, Issue[]>();
      for (const issue of issues) {
        const existing = byChapter.get(issue.chapterNumber) || [];
        existing.push(issue);
        byChapter.set(issue.chapterNumber, existing);
      }

      for (const [chapterNum, chapterIssues] of byChapter) {
        for (const issue of chapterIssues) {
          console.log(
            `Chapter ${chapterNum}, paragraph ${issue.paragraphIndex}: "${issue.text}" (found: ${issue.foundChars.join(", ")})`
          );
        }
      }
      console.log();

      totalIssues += issues.length;
    }
  }

  // Summary
  console.log("=== Summary ===");
  if (totalIssues === 0) {
    console.log("No untranslated Chinese characters found.");
  } else {
    console.log(
      `Found ${totalIssues} paragraph(s) with untranslated Chinese in ${textsWithIssues} text(s).`
    );
  }

  await client.end();
}

main().catch((err) => {
  console.error("Scan failed:", err);
  client.end().then(() => process.exit(1));
});
