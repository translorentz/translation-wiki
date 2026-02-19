import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import { db } from "@/server/db";
import { texts, authors, languages, chapters, translations } from "@/server/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";

export const textsRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ languageCode: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const result = await db.query.texts.findMany({
        with: {
          author: true,
          language: true,
        },
        orderBy: (texts, { asc }) => [asc(texts.title)],
      });

      if (input?.languageCode) {
        return result.filter((t) => t.language.code === input.languageCode);
      }
      return result;
    }),

  getTextIdsWithTranslation: publicProcedure
    .input(z.object({ targetLanguage: z.string() }))
    .query(async ({ input }) => {
      const result = await db
        .selectDistinct({ textId: chapters.textId })
        .from(chapters)
        .innerJoin(translations, eq(translations.chapterId, chapters.id))
        .where(
          and(
            eq(translations.targetLanguage, input.targetLanguage),
            isNotNull(translations.currentVersionId)
          )
        );
      return result.map((r) => r.textId);
    }),

  getBySlug: publicProcedure
    .input(
      z.object({
        langCode: z.string(),
        authorSlug: z.string(),
        textSlug: z.string(),
      })
    )
    .query(async ({ input }) => {
      const result = await db.query.texts.findFirst({
        where: eq(texts.slug, input.textSlug),
        with: {
          author: true,
          language: true,
          chapters: {
            orderBy: (chapters, { asc }) => [asc(chapters.ordering)],
            columns: {
              id: true,
              chapterNumber: true,
              slug: true,
              title: true,
              titleZh: true,
              ordering: true,
            },
          },
        },
      });
      return result ?? null;
    }),
});
