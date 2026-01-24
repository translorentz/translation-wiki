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

      // First: find texts matching by title or author name (text-level results)
      const textMatches = await db
        .select({
          textId: texts.id,
          textTitle: texts.title,
          textSlug: texts.slug,
          authorName: authors.name,
          authorSlug: authors.slug,
          langCode: languages.code,
          totalChapters: texts.totalChapters,
        })
        .from(texts)
        .innerJoin(authors, eq(texts.authorId, authors.id))
        .innerJoin(languages, eq(texts.languageId, languages.id))
        .where(
          or(
            ilike(texts.title, pattern),
            ilike(authors.name, pattern)
          )
        )
        .orderBy(texts.title)
        .limit(10);

      // Second: find chapters matching by chapter title or source content
      // Exclude chapters from texts already found above to avoid duplication
      const matchedTextIds = textMatches.map((t) => t.textId);

      const chapterResults = await db
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
        .orderBy(texts.title, chapters.chapterNumber)
        .limit(input.limit);

      // Filter out chapter results from texts already shown as text-level matches
      const filteredChapterResults = chapterResults.filter(
        (ch) => !matchedTextIds.includes(ch.textId)
      );

      return {
        texts: textMatches,
        chapters: filteredChapterResults,
      };
    }),
});
