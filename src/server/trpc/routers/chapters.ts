import { z } from "zod";
import { createTRPCRouter, publicProcedure, editorProcedure } from "../init";
import { db } from "@/server/db";
import {
  chapters,
  translations,
  translationVersions,
  sourceVersions,
} from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const chaptersRouter = createTRPCRouter({
  getByTextAndNumber: publicProcedure
    .input(
      z.object({
        textId: z.number(),
        chapterNumber: z.number(),
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

      return newSourceVersion;
    }),

  getSourceHistory: publicProcedure
    .input(z.object({ chapterId: z.number() }))
    .query(async ({ input }) => {
      const versions = await db.query.sourceVersions.findMany({
        where: eq(sourceVersions.chapterId, input.chapterId),
        orderBy: desc(sourceVersions.versionNumber),
        with: {
          author: { columns: { id: true, username: true } },
        },
      });
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
