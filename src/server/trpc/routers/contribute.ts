import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, editorProcedure, publicProcedure } from "../init";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import {
  sourceUploadSchema,
  translationUploadSchema,
  validateSourceUpload,
  validateTranslationUpload,
} from "@/lib/validateUpload";

export const contributeRouter = createTRPCRouter({
  /**
   * List all valid language codes in the corpus.
   */
  getLanguages: publicProcedure.query(async () => {
    const langs = await db
      .select({
        id: schema.languages.id,
        code: schema.languages.code,
        name: schema.languages.name,
      })
      .from(schema.languages)
      .orderBy(schema.languages.name);
    return langs;
  }),

  /**
   * Upload a new source text with chapters.
   */
  uploadSource: editorProcedure
    .input(sourceUploadSchema)
    .mutation(async ({ input, ctx }) => {
      // 1. Validate paragraph indices
      const validation = validateSourceUpload(input);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Validation errors:\n${validation.errors.join("\n")}`,
        });
      }

      // 2. Validate language exists
      const [language] = await db
        .select()
        .from(schema.languages)
        .where(eq(schema.languages.code, input.language));

      if (!language) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Language "${input.language}" is not in the corpus. Use one of the existing language codes.`,
        });
      }

      // 3. Check if text slug already exists for this language
      const [existingText] = await db
        .select({ id: schema.texts.id })
        .from(schema.texts)
        .where(
          and(
            eq(schema.texts.slug, input.slug),
            eq(schema.texts.languageId, language.id)
          )
        );

      if (existingText) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A text with slug "${input.slug}" already exists for language "${input.language}".`,
        });
      }

      // 4. Find or create author
      let [author] = await db
        .select()
        .from(schema.authors)
        .where(eq(schema.authors.slug, input.authorSlug));

      if (!author) {
        const [newAuthor] = await db
          .insert(schema.authors)
          .values({
            name: input.authorName,
            slug: input.authorSlug,
          })
          .returning();
        author = newAuthor;
      }

      // 5. Create text
      const [text] = await db
        .insert(schema.texts)
        .values({
          title: input.title,
          slug: input.slug,
          languageId: language.id,
          authorId: author.id,
          description: input.description ?? null,
          textType: input.textType,
          genre: input.genre,
          compositionYear: input.compositionYear ?? null,
          compositionYearDisplay: input.compositionYearDisplay ?? null,
          totalChapters: input.chapters.length,
        })
        .returning();

      // 6. Create chapters
      const chapterValues = input.chapters.map((ch, i) => ({
        textId: text.id,
        chapterNumber: i + 1,
        slug: `chapter-${String(i + 1).padStart(3, "0")}`,
        title: ch.title,
        sourceContent: {
          paragraphs: ch.paragraphs,
        },
        ordering: i + 1,
      }));

      await db.insert(schema.chapters).values(chapterValues);

      return {
        textId: text.id,
        slug: text.slug,
        chaptersCreated: input.chapters.length,
        languageCode: language.code,
        authorSlug: author.slug,
      };
    }),

  /**
   * Upload a translation for an existing text.
   */
  uploadTranslation: editorProcedure
    .input(translationUploadSchema)
    .mutation(async ({ input, ctx }) => {
      // 1. Validate paragraph indices
      const validation = validateTranslationUpload(input);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Validation errors:\n${validation.errors.join("\n")}`,
        });
      }

      // 2. Find the text
      const [text] = await db
        .select({ id: schema.texts.id })
        .from(schema.texts)
        .where(eq(schema.texts.slug, input.textSlug));

      if (!text) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Text with slug "${input.textSlug}" not found.`,
        });
      }

      // 3. Get all chapters for this text
      const textChapters = await db
        .select({
          id: schema.chapters.id,
          chapterNumber: schema.chapters.chapterNumber,
          sourceContent: schema.chapters.sourceContent,
        })
        .from(schema.chapters)
        .where(eq(schema.chapters.textId, text.id));

      const chapterMap = new Map(
        textChapters.map((c) => [c.chapterNumber, c])
      );

      // 4. Validate chapter numbers exist and paragraph counts match
      const errors: string[] = [];
      for (const ch of input.chapters) {
        const dbChapter = chapterMap.get(ch.chapterNumber);
        if (!dbChapter) {
          errors.push(
            `Chapter ${ch.chapterNumber} does not exist in text "${input.textSlug}".`
          );
          continue;
        }

        // Check paragraph count alignment
        const sourceParas = (
          dbChapter.sourceContent as { paragraphs: { index: number; text: string }[] } | null
        )?.paragraphs;
        if (sourceParas && sourceParas.length !== ch.paragraphs.length) {
          errors.push(
            `Chapter ${ch.chapterNumber}: translation has ${ch.paragraphs.length} paragraphs but source has ${sourceParas.length}. They must match.`
          );
        }
      }

      if (errors.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Validation errors:\n${errors.join("\n")}`,
        });
      }

      // 5. Insert translations
      const userId = Number(ctx.user.id);
      let created = 0;
      let skipped = 0;

      for (const ch of input.chapters) {
        const dbChapter = chapterMap.get(ch.chapterNumber)!;

        // Check if translation already exists
        const [existing] = await db
          .select({ id: schema.translations.id })
          .from(schema.translations)
          .where(
            and(
              eq(schema.translations.chapterId, dbChapter.id),
              eq(schema.translations.targetLanguage, input.targetLanguage)
            )
          );

        if (existing) {
          skipped++;
          continue;
        }

        // Create translation record
        const [translation] = await db
          .insert(schema.translations)
          .values({
            chapterId: dbChapter.id,
            targetLanguage: input.targetLanguage,
          })
          .returning();

        // Create version
        const [version] = await db
          .insert(schema.translationVersions)
          .values({
            translationId: translation.id,
            versionNumber: 1,
            content: { paragraphs: ch.paragraphs },
            authorId: userId,
          })
          .returning();

        // Set current version
        await db
          .update(schema.translations)
          .set({ currentVersionId: version.id })
          .where(eq(schema.translations.id, translation.id));

        created++;
      }

      return {
        textSlug: input.textSlug,
        targetLanguage: input.targetLanguage,
        chaptersCreated: created,
        chaptersSkipped: skipped,
      };
    }),

  /**
   * Validate a JSON upload without persisting anything.
   * Returns detailed validation results.
   */
  validateSource: editorProcedure
    .input(z.object({ json: z.string() }))
    .mutation(async ({ input }) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(input.json);
      } catch {
        return {
          valid: false,
          errors: ["Invalid JSON: could not parse the input."],
        };
      }

      const result = sourceUploadSchema.safeParse(parsed);
      if (!result.success) {
        return {
          valid: false,
          errors: result.error.issues.map(
            (i) => `${i.path.join(".")}: ${i.message}`
          ),
        };
      }

      const validation = validateSourceUpload(result.data);
      if (!validation.valid) {
        return { valid: false, errors: validation.errors };
      }

      // Check language exists
      const [language] = await db
        .select({ code: schema.languages.code })
        .from(schema.languages)
        .where(eq(schema.languages.code, result.data.language));

      if (!language) {
        const allLangs = await db
          .select({ code: schema.languages.code })
          .from(schema.languages);
        return {
          valid: false,
          errors: [
            `Language "${result.data.language}" not found. Valid codes: ${allLangs.map((l) => l.code).join(", ")}`,
          ],
        };
      }

      // Check author slug
      const [existingAuthor] = await db
        .select({ slug: schema.authors.slug, name: schema.authors.name })
        .from(schema.authors)
        .where(eq(schema.authors.slug, result.data.authorSlug));

      const warnings: string[] = [];
      if (existingAuthor) {
        warnings.push(
          `Author "${result.data.authorSlug}" already exists as "${existingAuthor.name}". The existing author record will be used.`
        );
      }

      return {
        valid: true,
        errors: [],
        warnings,
        summary: {
          language: language.code,
          author: result.data.authorName,
          title: result.data.title,
          chapters: result.data.chapters.length,
          totalParagraphs: result.data.chapters.reduce(
            (sum, ch) => sum + ch.paragraphs.length,
            0
          ),
        },
      };
    }),
});
