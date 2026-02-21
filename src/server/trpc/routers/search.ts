import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import { db } from "@/server/db";
import { chapters, texts, authors, languages, translations, translationVersions } from "@/server/db/schema";
import { sql, eq, ilike, or, and, inArray, notInArray } from "drizzle-orm";

// Shared input schema for search queries
const searchInputSchema = z.object({
  q: z.string().min(1).max(200),
  languages: z.array(z.string()).optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

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

  // Fast query: text titles, author names, and chapter titles only
  // No JSONB content search - should be very fast
  titles: publicProcedure
    .input(searchInputSchema)
    .query(async ({ input }) => {
      const pattern = `%${input.q}%`;

      // Build language filter condition if languages are specified
      const langFilter =
        input.languages && input.languages.length > 0
          ? inArray(languages.code, input.languages)
          : undefined;

      // Find texts matching by title or author name
      const textMatchConditions = or(
        ilike(texts.title, pattern),
        ilike(authors.name, pattern)
      );

      const textMatches = await db
        .select({
          textId: texts.id,
          textTitle: texts.title,
          textTitleZh: texts.titleZh,
          textTitleOriginalScript: texts.titleOriginalScript,
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

      // Find chapters matching by chapter title only (fast - no JSONB search)
      const matchedTextIds = textMatches.map((t) => t.textId);

      const chapterTitleCondition = ilike(chapters.title, pattern);

      // Build WHERE clause, only adding conditions that exist
      const chapterConditions = [
        chapterTitleCondition,
        langFilter,
        matchedTextIds.length > 0 ? notInArray(texts.id, matchedTextIds) : undefined
      ].filter(Boolean);

      const chapterWhereClause = chapterConditions.length > 1
        ? and(...chapterConditions)
        : chapterConditions[0];

      const chapterResults = await db
        .select({
          chapterId: chapters.id,
          chapterNumber: chapters.chapterNumber,
          chapterTitle: chapters.title,
          chapterTitleZh: chapters.titleZh,
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
        .where(chapterWhereClause)
        .orderBy(texts.title, chapters.chapterNumber)
        .limit(input.limit + 1)
        .offset(input.offset);

      const hasMore = chapterResults.length > input.limit;
      const paginatedResults = hasMore
        ? chapterResults.slice(0, input.limit)
        : chapterResults;

      return {
        texts: textMatches,
        chapters: paginatedResults,
        hasMore,
      };
    }),

  // Slow query: JSONB content search with snippet extraction
  // Called separately so title results can appear first
  content: publicProcedure
    .input(
      searchInputSchema.extend({
        excludeTextIds: z.array(z.number()).optional(),
        excludeChapterIds: z.array(z.number()).optional(),
      })
    )
    .query(async ({ input }) => {
      const pattern = `%${input.q}%`;
      const lowerPattern = `%${input.q.toLowerCase()}%`;

      // Build language filter condition if languages are specified
      const langFilter =
        input.languages && input.languages.length > 0
          ? inArray(languages.code, input.languages)
          : undefined;

      // Content search: tsvector full-text search (GIN-indexed)
      const tsQuery = sql`plainto_tsquery('simple', ${input.q})`;
      const contentMatchConditions = or(
        sql`"chapters"."source_tsv" @@ ${tsQuery}`,
        sql`"translation_versions"."content_tsv" @@ ${tsQuery}`
      );

      // Build exclusions for texts/chapters already shown
      const exclusions: ReturnType<typeof notInArray>[] = [];
      if (input.excludeTextIds && input.excludeTextIds.length > 0) {
        exclusions.push(notInArray(texts.id, input.excludeTextIds));
      }
      if (input.excludeChapterIds && input.excludeChapterIds.length > 0) {
        exclusions.push(notInArray(chapters.id, input.excludeChapterIds));
      }

      // Build WHERE clause, only adding conditions that exist
      const conditions = [contentMatchConditions, langFilter, ...exclusions].filter(Boolean);
      const chapterWhereClause = conditions.length > 1
        ? and(...conditions)
        : conditions[0];

      const chapterResults = await db
        .select({
          chapterId: chapters.id,
          chapterNumber: chapters.chapterNumber,
          chapterTitle: chapters.title,
          chapterTitleZh: chapters.titleZh,
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
        .limit((input.limit + 1) * 2)
        .offset(input.offset);

      // Deduplicate by chapter ID (LEFT JOINs can produce multiple rows per chapter)
      const seenChapterIds = new Set<number>();
      const deduplicatedResults = chapterResults.filter((ch) => {
        if (seenChapterIds.has(ch.chapterId)) {
          return false;
        }
        seenChapterIds.add(ch.chapterId);
        return true;
      });

      const hasMore = deduplicatedResults.length > input.limit;
      const paginatedResults = hasMore
        ? deduplicatedResults.slice(0, input.limit)
        : deduplicatedResults;

      return {
        chapters: paginatedResults,
        hasMore,
      };
    }),

  // Legacy combined query - kept for backward compatibility
  // Prefer using titles + content separately for better UX
  query: publicProcedure
    .input(searchInputSchema)
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
          textTitleZh: texts.titleZh,
          textTitleOriginalScript: texts.titleOriginalScript,
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

      const tsQuery = sql`plainto_tsquery('simple', ${input.q})`;
      const chapterMatchConditions = or(
        ilike(chapters.title, pattern),
        sql`"chapters"."source_tsv" @@ ${tsQuery}`,
        sql`"translation_versions"."content_tsv" @@ ${tsQuery}`
      );

      // Use lowercase pattern for case-insensitive matching in subqueries
      const lowerPattern = `%${input.q.toLowerCase()}%`;

      // Build the base where clause for chapters
      const chapterWhereClause = langFilter
        ? and(chapterMatchConditions, langFilter)
        : chapterMatchConditions;

      // Fetch more results to account for potential duplicates from LEFT JOINs
      // and text-level filtering. We'll deduplicate in JavaScript.
      const chapterResults = await db
        .select({
          chapterId: chapters.id,
          chapterNumber: chapters.chapterNumber,
          chapterTitle: chapters.title,
          chapterTitleZh: chapters.titleZh,
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
        // Fetch extra rows to account for duplicates and text-level filtering
        .limit((input.limit + 1) * 2)
        .offset(input.offset);

      // Deduplicate by chapter ID (LEFT JOINs can produce multiple rows per chapter)
      const seenChapterIds = new Set<number>();
      const deduplicatedResults = chapterResults.filter((ch) => {
        if (seenChapterIds.has(ch.chapterId)) {
          return false;
        }
        seenChapterIds.add(ch.chapterId);
        return true;
      });

      // Filter out chapter results from texts already shown as text-level matches
      const filteredChapterResults = deduplicatedResults.filter(
        (ch) => !matchedTextIds.includes(ch.textId)
      );

      // Check if there are more results beyond the current page
      const hasMore = filteredChapterResults.length > input.limit;

      // Slice to limit if we have more
      const paginatedResults = hasMore
        ? filteredChapterResults.slice(0, input.limit)
        : filteredChapterResults;

      return {
        texts: textMatches,
        chapters: paginatedResults,
        hasMore,
      };
    }),
});
