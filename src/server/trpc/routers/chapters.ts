import { z } from "zod";
import { createTRPCRouter, publicProcedure, editorProcedure } from "../init";
import { db } from "@/server/db";
import { chapters, translations, translationVersions, sourceVersions } from "@/server/db/schema";
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
