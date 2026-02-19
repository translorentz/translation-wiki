import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import { db } from "@/server/db";
import { texts, authors, languages, chapters } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

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
