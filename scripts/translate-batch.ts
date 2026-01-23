/**
 * Batch translates untranslated chapters using the Claude API.
 *
 * Usage: pnpm translate:batch [--text zhuzi-yulei|de-ceremoniis] [--start N] [--end N] [--delay MS]
 *
 * Prerequisites:
 * - Database seeded with chapters (pnpm db:seed)
 * - ANTHROPIC_API_KEY set in environment
 * - DATABASE_URL set in environment
 * - A system user exists in the database (created automatically if needed)
 *
 * The script creates translation versions attributed to the "system" user.
 * These are marked as AI-generated initial translations for human review.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, isNull, asc, desc, gte, lte } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import * as schema from "../src/server/db/schema";
import { buildTranslationPrompt } from "../src/server/translation/prompts";

// ============================================================
// Configuration
// ============================================================

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("ANTHROPIC_API_KEY is required.");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });
const anthropic = new Anthropic({ apiKey });

const DEFAULT_DELAY_MS = 3000;
const MODEL = "claude-sonnet-4-20250514";

// ============================================================
// Argument parsing
// ============================================================

function parseArgs() {
  const args = process.argv.slice(2);
  let textSlug: string | undefined;
  let start: number | undefined;
  let end: number | undefined;
  let delay = DEFAULT_DELAY_MS;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--text" && args[i + 1]) textSlug = args[i + 1];
    if (args[i] === "--start" && args[i + 1]) start = parseInt(args[i + 1]);
    if (args[i] === "--end" && args[i + 1]) end = parseInt(args[i + 1]);
    if (args[i] === "--delay" && args[i + 1]) delay = parseInt(args[i + 1]);
  }

  return { textSlug, start, end, delay };
}

// ============================================================
// System user management
// ============================================================

async function getOrCreateSystemUser(): Promise<number> {
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.username, "system"),
  });

  if (existing) return existing.id;

  const [user] = await db
    .insert(schema.users)
    .values({
      email: "system@translation-wiki.local",
      username: "system",
      passwordHash: "SYSTEM_USER_NO_LOGIN",
      role: "admin",
    })
    .returning({ id: schema.users.id });

  console.log("Created system user (id:", user.id, ")");
  return user.id;
}

// ============================================================
// Translation logic
// ============================================================

interface Paragraph {
  index: number;
  text: string;
}

async function translateParagraphs(
  paragraphs: Paragraph[],
  sourceLanguage: string
): Promise<Paragraph[]> {
  const { system, user } = buildTranslationPrompt({
    sourceLanguage,
    paragraphs,
  });

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: user }],
  });

  // Extract text content from response
  const textBlock = response.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse JSON from response (may be wrapped in markdown code block)
  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const translated: Paragraph[] = JSON.parse(jsonStr);

  // Validate structure
  if (!Array.isArray(translated)) {
    throw new Error("Response is not an array");
  }

  for (const p of translated) {
    if (typeof p.index !== "number" || typeof p.text !== "string") {
      throw new Error("Invalid paragraph structure in response");
    }
  }

  return translated;
}

async function translateChapter(
  chapter: {
    id: number;
    chapterNumber: number;
    title: string | null;
    sourceContent: unknown;
    textId: number;
  },
  sourceLanguage: string,
  systemUserId: number
): Promise<boolean> {
  const sourceContent = chapter.sourceContent as {
    paragraphs: Paragraph[];
  } | null;

  if (!sourceContent || sourceContent.paragraphs.length === 0) {
    console.log(`  [skip] Chapter ${chapter.chapterNumber}: no source content`);
    return false;
  }

  // Check if translation already exists
  const existingTranslation = await db.query.translations.findFirst({
    where: eq(schema.translations.chapterId, chapter.id),
  });

  if (existingTranslation?.currentVersionId) {
    console.log(
      `  [skip] Chapter ${chapter.chapterNumber}: already translated`
    );
    return false;
  }

  try {
    const translated = await translateParagraphs(
      sourceContent.paragraphs,
      sourceLanguage
    );

    // Create or get translation record
    let translation = existingTranslation;
    if (!translation) {
      const [newT] = await db
        .insert(schema.translations)
        .values({ chapterId: chapter.id })
        .returning();
      translation = newT;
    }

    // Create version
    const [version] = await db
      .insert(schema.translationVersions)
      .values({
        translationId: translation.id,
        versionNumber: 1,
        content: { paragraphs: translated },
        authorId: systemUserId,
        editSummary: "AI-generated initial translation (Claude)",
      })
      .returning();

    // Update head
    await db
      .update(schema.translations)
      .set({ currentVersionId: version.id, updatedAt: new Date() })
      .where(eq(schema.translations.id, translation.id));

    console.log(
      `  [done] Chapter ${chapter.chapterNumber}: ${translated.length} paragraphs translated`
    );
    return true;
  } catch (err) {
    console.error(
      `  [err]  Chapter ${chapter.chapterNumber}:`,
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  const { textSlug, start, end, delay } = parseArgs();

  console.log("=== Batch Translation ===\n");
  console.log(`Model: ${MODEL}`);
  console.log(`Delay: ${delay}ms between requests\n`);

  const systemUserId = await getOrCreateSystemUser();

  // Get texts to translate
  let textsToProcess = await db.query.texts.findMany({
    with: { language: true },
  });

  if (textSlug) {
    textsToProcess = textsToProcess.filter((t) => t.slug === textSlug);
    if (textsToProcess.length === 0) {
      console.error(`Text not found: ${textSlug}`);
      await client.end();
      process.exit(1);
    }
  }

  let totalTranslated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const text of textsToProcess) {
    console.log(`\n--- ${text.title} (${text.language.code}) ---\n`);

    // Build query conditions
    const conditions = [eq(schema.chapters.textId, text.id)];
    if (start !== undefined) {
      conditions.push(gte(schema.chapters.chapterNumber, start));
    }
    if (end !== undefined) {
      conditions.push(lte(schema.chapters.chapterNumber, end));
    }

    const chapters = await db.query.chapters.findMany({
      where: and(...conditions),
      orderBy: asc(schema.chapters.chapterNumber),
    });

    console.log(`Found ${chapters.length} chapters to process\n`);

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const success = await translateChapter(
        chapter,
        text.language.code,
        systemUserId
      );

      if (success) {
        totalTranslated++;
      } else {
        // Distinguish between skip and error (logged in translateChapter)
        totalSkipped++;
      }

      // Delay between API calls (skip delay for skipped chapters)
      if (success && i < chapters.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(
    `Translated: ${totalTranslated}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`
  );

  await client.end();
}

main().catch((err) => {
  console.error("Batch translation failed:", err);
  client.end().then(() => process.exit(1));
});
