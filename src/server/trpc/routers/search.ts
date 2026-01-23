import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import { db } from "@/server/db";
import { chapters, texts, authors, languages } from "@/server/db/schema";
import { sql, eq, ilike, or } from "drizzle-orm";

export const searchRouter = createTRPCRouter({
  query: publicProcedure
    .input(
      z.object({
        q: z.string().min(1).max(200),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      const pattern = `%${input.q}%`;

      // Search chapter titles and source content text
      const results = await db
        .select({
          chapterId: chapters.id,
          chapterNumber: chapters.chapterNumber,
          chapterTitle: chapters.title,
          chapterSlug: chapters.slug,
          textId: texts.id,
          textTitle: texts.title,
          textSlug: texts.slug,
          authorName: authors.name,
          authorSlug: authors.slug,
          langCode: languages.code,
        })
        .from(chapters)
        .innerJoin(texts, eq(chapters.textId, texts.id))
        .innerJoin(authors, eq(texts.authorId, authors.id))
        .innerJoin(languages, eq(texts.languageId, languages.id))
        .where(
          or(
            ilike(chapters.title, pattern),
            sql`${chapters.sourceContent}::text ILIKE ${pattern}`
          )
        )
        .limit(input.limit);

      return results;
    }),
});
