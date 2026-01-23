import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../init";
import { db } from "@/server/db";
import {
  translations,
  translationVersions,
  chapters,
} from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";

const paragraphSchema = z.object({
  paragraphs: z.array(
    z.object({
      index: z.number(),
      text: z.string(),
    })
  ),
});

export const translationsRouter = createTRPCRouter({
  getForChapter: publicProcedure
    .input(z.object({ chapterId: z.number() }))
    .query(async ({ input }) => {
      const translation = await db.query.translations.findFirst({
        where: eq(translations.chapterId, input.chapterId),
        with: {
          currentVersion: {
            with: {
              author: { columns: { id: true, username: true } },
            },
          },
        },
      });
      return translation ?? null;
    }),

  createVersion: protectedProcedure
    .input(
      z.object({
        chapterId: z.number(),
        content: paragraphSchema,
        editSummary: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = Number(ctx.user.id);

      // Find or create translation record
      let translation = await db.query.translations.findFirst({
        where: eq(translations.chapterId, input.chapterId),
      });

      if (!translation) {
        const [newTranslation] = await db
          .insert(translations)
          .values({ chapterId: input.chapterId })
          .returning();
        translation = newTranslation;
      }

      // Get current version number
      const latestVersion = await db.query.translationVersions.findFirst({
        where: eq(translationVersions.translationId, translation.id),
        orderBy: desc(translationVersions.versionNumber),
      });

      const newVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

      // Create new version
      const [newVersion] = await db
        .insert(translationVersions)
        .values({
          translationId: translation.id,
          versionNumber: newVersionNumber,
          content: input.content,
          authorId: userId,
          editSummary: input.editSummary,
          previousVersionId: latestVersion?.id,
        })
        .returning();

      // Update translation head
      await db
        .update(translations)
        .set({
          currentVersionId: newVersion.id,
          updatedAt: new Date(),
        })
        .where(eq(translations.id, translation.id));

      return newVersion;
    }),

  getHistory: publicProcedure
    .input(z.object({ translationId: z.number() }))
    .query(async ({ input }) => {
      const versions = await db.query.translationVersions.findMany({
        where: eq(translationVersions.translationId, input.translationId),
        orderBy: desc(translationVersions.versionNumber),
        with: {
          author: { columns: { id: true, username: true } },
        },
      });
      return versions;
    }),
});
