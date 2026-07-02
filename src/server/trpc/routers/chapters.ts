import { z } from "zod";
import { unstable_cache, revalidateTag } from "next/cache";
import { createTRPCRouter, publicProcedure, editorProcedure } from "../init";
import { db } from "@/server/db";
import {
  chapters,
  translations,
  translationVersions,
  sourceVersions,
} from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Cache tag for chapter reads. Invalidated by source/translation mutations
// below so editors see their changes on the very next render.
const CHAPTER_TAG = "chapter";
// `texts.getBySlug` (in the texts router) embeds the chapter list, so source
// edits also bust the text cache. text-ids invalidation lives in
// translations.ts (the only mutation that flips a text's translation status).
const TEXT_TAG = "text";

const cachedChapterByTextAndSlug = unstable_cache(
  async (textId: number, slug: string, targetLanguage: string) => {
    const chapter = await db.query.chapters.findFirst({
      where: and(eq(chapters.textId, textId), eq(chapters.slug, slug)),
      with: {
        translations: {
          where: eq(translations.targetLanguage, targetLanguage),
          with: {
            currentVersion: {
              with: {
                author: {
                  columns: { id: true, username: true },
                },
              },
            },
          },
        },
      },
    });
    return chapter ?? null;
  },
  // 1-hour TTL. Translation edits invalidate CHAPTER_TAG immediately via
  // revalidateTag() from the mutations below, so a long TTL costs editors
  // nothing — it only cuts recurring Neon revalidation queries. Kept at 1h
  // (not longer) because translation pipeline scripts write new versions
  // directly to the DB, bypassing the tRPC mutations, and rely on TTL expiry
  // for their output to appear.
  ["chapters.getByTextAndSlug.v1"],
  { revalidate: 3600, tags: [CHAPTER_TAG] }
);

export const chaptersRouter = createTRPCRouter({
  getByTextAndNumber: publicProcedure
    .input(
      z.object({
        textId: z.number(),
        chapterNumber: z.number(),
        targetLanguage: z.string().default("en"),
      })
    )
    .query(async ({ input }) => {
      const chapter = await db.query.chapters.findFirst({
        where: and(
          eq(chapters.textId, input.textId),
          eq(chapters.chapterNumber, input.chapterNumber)
        ),
        with: {
          translations: {
            where: eq(translations.targetLanguage, input.targetLanguage),
            with: {
              currentVersion: {
                with: {
                  author: {
                    columns: { id: true, username: true },
                  },
                },
              },
            },
          },
        },
      });
      return chapter ?? null;
    }),

  getByTextAndSlug: publicProcedure
    .input(
      z.object({
        textId: z.number(),
        slug: z.string(),
        targetLanguage: z.string().default("en"),
      })
    )
    .query(async ({ input }) => {
      return cachedChapterByTextAndSlug(
        input.textId,
        input.slug,
        input.targetLanguage
      );
    }),

  updateSource: editorProcedure
    .input(
      z.object({
        chapterId: z.number(),
        content: z.object({
          paragraphs: z.array(
            z.object({
              index: z.number(),
              text: z.string().nullable(),
            })
          ),
        }),
        editSummary: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = Number(ctx.user.id);

      // Get current version number
      const latestVersion = await db.query.sourceVersions.findFirst({
        where: eq(sourceVersions.chapterId, input.chapterId),
        orderBy: desc(sourceVersions.versionNumber),
      });

      const newVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

      // Create new source version
      const [newVersion] = await db
        .insert(sourceVersions)
        .values({
          chapterId: input.chapterId,
          versionNumber: newVersionNumber,
          content: input.content,
          authorId: userId,
          editSummary: input.editSummary,
          previousVersionId: latestVersion?.id,
        })
        .returning();

      // Update chapter with new source content and version pointer
      await db
        .update(chapters)
        .set({
          sourceContent: input.content,
          currentSourceVersionId: newVersion.id,
        })
        .where(eq(chapters.id, input.chapterId));

      // { expire: 0 } = immediate invalidation. Without a profile arg, Next 16
      // logs a deprecation warning and treats this as stale-while-revalidate.
      revalidateTag(CHAPTER_TAG, { expire: 0 });
      revalidateTag(TEXT_TAG, { expire: 0 });

      return newVersion;
    }),

  // Update source with optional translation updates (for deleting translation paragraphs)
  updateSourceWithTranslation: editorProcedure
    .input(
      z.object({
        chapterId: z.number(),
        content: z.object({
          paragraphs: z.array(
            z.object({
              index: z.number(),
              text: z.string().nullable(),
            })
          ),
        }),
        editSummary: z.string().optional(),
        // Optional translation updates
        translationId: z.number().optional(),
        translationUpdates: z
          .array(
            z.object({
              index: z.number(),
              text: z.string().nullable(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = Number(ctx.user.id);

      // Get current source version number
      const latestSourceVersion = await db.query.sourceVersions.findFirst({
        where: eq(sourceVersions.chapterId, input.chapterId),
        orderBy: desc(sourceVersions.versionNumber),
      });

      const newSourceVersionNumber =
        (latestSourceVersion?.versionNumber ?? 0) + 1;

      // Create new source version
      const [newSourceVersion] = await db
        .insert(sourceVersions)
        .values({
          chapterId: input.chapterId,
          versionNumber: newSourceVersionNumber,
          content: input.content,
          authorId: userId,
          editSummary: input.editSummary,
          previousVersionId: latestSourceVersion?.id,
        })
        .returning();

      // Update chapter with new source content and version pointer
      await db
        .update(chapters)
        .set({
          sourceContent: input.content,
          currentSourceVersionId: newSourceVersion.id,
        })
        .where(eq(chapters.id, input.chapterId));

      // Handle translation updates if provided
      if (input.translationId && input.translationUpdates) {
        // Get the translation
        const translation = await db.query.translations.findFirst({
          where: eq(translations.id, input.translationId),
        });

        if (translation) {
          // Get current translation version
          const latestTranslationVersion =
            await db.query.translationVersions.findFirst({
              where: eq(translationVersions.translationId, input.translationId),
              orderBy: desc(translationVersions.versionNumber),
            });

          const newTranslationVersionNumber =
            (latestTranslationVersion?.versionNumber ?? 0) + 1;

          const newTranslationContent = {
            paragraphs: input.translationUpdates,
          };

          // Create new translation version
          const [newTranslationVersion] = await db
            .insert(translationVersions)
            .values({
              translationId: input.translationId,
              versionNumber: newTranslationVersionNumber,
              content: newTranslationContent,
              authorId: userId,
              editSummary: input.editSummary
                ? `${input.editSummary} (source edit)`
                : "Paragraph removed via source edit",
              previousVersionId: latestTranslationVersion?.id,
            })
            .returning();

          // Update translation pointer
          await db
            .update(translations)
            .set({ currentVersionId: newTranslationVersion.id })
            .where(eq(translations.id, input.translationId));
        }
      }

      // { expire: 0 } = immediate invalidation. Without a profile arg, Next 16
      // logs a deprecation warning and treats this as stale-while-revalidate.
      revalidateTag(CHAPTER_TAG, { expire: 0 });
      revalidateTag(TEXT_TAG, { expire: 0 });

      return newSourceVersion;
    }),

  getSourceHistory: publicProcedure
    .input(z.object({ chapterId: z.number() }))
    .query(async ({ input }) => {
      // Get all source versions from database
      const versions = await db.query.sourceVersions.findMany({
        where: eq(sourceVersions.chapterId, input.chapterId),
        orderBy: desc(sourceVersions.versionNumber),
        with: {
          author: { columns: { id: true, username: true } },
        },
      });

      // Get the chapter to access original seeded content
      const chapter = await db.query.chapters.findFirst({
        where: eq(chapters.id, input.chapterId),
        columns: {
          id: true,
          sourceContent: true,
        },
      });

      if (!chapter) {
        return versions;
      }

      // Check if we need to synthesize a "version 0" for the original seeded content
      // We add version 0 if:
      // 1. There are no versions at all, OR
      // 2. The earliest version is version 1 (meaning the seeded content was never recorded)
      const hasVersion0 = versions.some((v) => v.versionNumber === 0);
      const needsSynthesizedVersion0 = !hasVersion0 && chapter.sourceContent;

      if (needsSynthesizedVersion0) {
        // Use the earliest version's createdAt if available, otherwise use a placeholder
        const earliestVersion = versions[versions.length - 1];
        const seededDate = earliestVersion?.createdAt ?? new Date("2024-01-01");

        // Synthesize a version 0 entry for the original seeded content
        const synthesizedVersion0 = {
          id: -1, // Negative ID to indicate synthetic
          chapterId: input.chapterId,
          versionNumber: 0,
          content: chapter.sourceContent,
          editSummary: "Original seeded content",
          createdAt: seededDate,
          previousVersionId: null,
          author: { id: 0, username: "System" },
        };

        // Return versions with synthesized version 0 at the end (lowest version number)
        return [...versions, synthesizedVersion0];
      }

      return versions;
    }),

  getSourceVersion: publicProcedure
    .input(z.object({ versionId: z.number() }))
    .query(async ({ input }) => {
      const version = await db.query.sourceVersions.findFirst({
        where: eq(sourceVersions.id, input.versionId),
        with: {
          author: { columns: { id: true, username: true } },
        },
      });
      return version ?? null;
    }),
});
