import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import { db } from "@/server/db";
import { chapters, texts, authors, languages, translations, translationVersions } from "@/server/db/schema";
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
      .orderBy(languages.name);
    return result;
  }),

  query: publicProcedure
    .input(
      z.object({
        q: z.string().min(1).max(200),
        languages: z.array(z.string()).optional(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
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
        sql`${chapters.sourceContent}::text ILIKE ${pattern}`,
        sql`${translationVersions.content}::text ILIKE ${pattern}`
      );

      // Use lowercase pattern for case-insensitive matching in subqueries
      const lowerPattern = `%${input.q.toLowerCase()}%`;

      // Build the base where clause for chapters
      const chapterWhereClause = langFilter
        ? and(chapterMatchConditions, langFilter)
        : chapterMatchConditions;

      // Get total count of chapter matches (excluding text-level matches)
      const countResult = await db
        .select({ count: sql<number>`count(DISTINCT ${chapters.id})` })
        .from(chapters)
        .innerJoin(texts, eq(chapters.textId, texts.id))
        .innerJoin(authors, eq(texts.authorId, authors.id))
        .innerJoin(languages, eq(texts.languageId, languages.id))
        .leftJoin(translations, eq(translations.chapterId, chapters.id))
        .leftJoin(translationVersions, eq(translations.currentVersionId, translationVersions.id))
        .where(chapterWhereClause);

      const totalChapterCount = Number(countResult[0]?.count ?? 0);

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
          snippet: sql<string>`COALESCE(
            (
              SELECT substring(para.value->>'text'
                FROM greatest(1, position(lower(${input.q}) in lower(para.value->>'text')) - 30)
                FOR 80)
              FROM jsonb_array_elements(${chapters.sourceContent}->'paragraphs') AS para
              WHERE lower(para.value->>'text') LIKE ${lowerPattern}
              LIMIT 1
            ),
            (
              SELECT substring(para.value->>'text'
                FROM greatest(1, position(lower(${input.q}) in lower(para.value->>'text')) - 30)
                FOR 80)
              FROM jsonb_array_elements(${translationVersions.content}->'paragraphs') AS para
              WHERE lower(para.value->>'text') LIKE ${lowerPattern}
              LIMIT 1
            )
          )`.as('snippet'),
          matchParagraphIndex: sql<number>`COALESCE(
            (
              SELECT (para.value->>'index')::int
              FROM jsonb_array_elements(${chapters.sourceContent}->'paragraphs') AS para
              WHERE lower(para.value->>'text') LIKE ${lowerPattern}
              LIMIT 1
            ),
            (
              SELECT (para.value->>'index')::int
              FROM jsonb_array_elements(${translationVersions.content}->'paragraphs') AS para
              WHERE lower(para.value->>'text') LIKE ${lowerPattern}
              LIMIT 1
            )
          )`.as('match_paragraph_index'),
        })
        .from(chapters)
        .innerJoin(texts, eq(chapters.textId, texts.id))
        .innerJoin(authors, eq(texts.authorId, authors.id))
        .innerJoin(languages, eq(texts.languageId, languages.id))
        .leftJoin(translations, eq(translations.chapterId, chapters.id))
        .leftJoin(translationVersions, eq(translations.currentVersionId, translationVersions.id))
        .where(chapterWhereClause)
        .orderBy(texts.title, chapters.chapterNumber)
        .limit(input.limit)
        .offset(input.offset);

      // Filter out chapter results from texts already shown as text-level matches
      const filteredChapterResults = chapterResults.filter(
        (ch) => !matchedTextIds.includes(ch.textId)
      );

      // Adjust total count by subtracting chapters from matched texts (approximate)
      const adjustedTotal = Math.max(0, totalChapterCount - matchedTextIds.length * 10);

      return {
        texts: textMatches,
        chapters: filteredChapterResults,
        totalChapters: adjustedTotal,
        hasMore: input.offset + filteredChapterResults.length < adjustedTotal,
      };
    }),
});
