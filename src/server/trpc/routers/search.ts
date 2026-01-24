import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import { db } from "@/server/db";
import { chapters, texts, authors, languages } from "@/server/db/schema";
import { sql, eq, ilike, or, and, inArray } from "drizzle-orm";

export const searchRouter = createTRPCRouter({
  languages: publicProcedure.query(async () => {
    const result = await db
      .selectDistinct({
        code: languages.code,
        name: languages.name,
        displayName: languages.displayName,
      })
      .from(languages)
      .innerJoin(texts, eq(texts.languageId, languages.id))
      .orderBy(languages.displayName);
    return result;
  }),

  query: publicProcedure
    .input(
      z.object({
        q: z.string().min(1).max(200),
        languages: z.array(z.string()).optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      const pattern = `%${input.q}%`;

      // Build language filter condition if languages are specified
      const langFilter =
        input.languages && input.languages.length > 0
          ? inArray(languages.code, input.languages)
          : undefined;

      // First: find texts matching by title or author name (text-level results)
      const textMatchConditions = or(
        ilike(texts.title, pattern),
        ilike(authors.name, pattern)
      );

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
          langFilter
            ? and(textMatchConditions, langFilter)
            : textMatchConditions
        )
        .orderBy(texts.title)
        .limit(10);

      // Second: find chapters matching by chapter title or source content
      // Exclude chapters from texts already found above to avoid duplication
      const matchedTextIds = textMatches.map((t) => t.textId);

      const chapterMatchConditions = or(
        ilike(chapters.title, pattern),
        sql`${chapters.sourceContent}::text ILIKE ${pattern}`
      );

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
          langFilter
            ? and(chapterMatchConditions, langFilter)
            : chapterMatchConditions
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
