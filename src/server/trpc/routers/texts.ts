import { z } from "zod";
import { unstable_cache } from "next/cache";
import { createTRPCRouter, publicProcedure } from "../init";
import { db } from "@/server/db";
import { texts, chapters, translations } from "@/server/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";

// Cache tags. revalidateTag(...) is called from mutations in chapters.ts and
// translations.ts to invalidate these on edits.
const TEXTS_LIST_TAG = "texts-list";
const TEXT_TAG = "text";
const TEXT_IDS_TAG = "text-ids";

// 10-min TTL for global lists (front + browse pages).
// 5-min TTL for per-text reads (chapter + text pages).
// Editors get fresh content immediately via revalidateTag() from mutations;
// TTL is just a fallback in case a mutation path forgets to invalidate.
const cachedTextsList = unstable_cache(
  async () => {
    return await db.query.texts.findMany({
      with: {
        author: true,
        language: true,
      },
      orderBy: (texts, { asc }) => [asc(texts.title)],
    });
  },
  ["texts.list.v1"],
  { revalidate: 600, tags: [TEXTS_LIST_TAG] }
);

const cachedTextIdsWithTranslation = unstable_cache(
  async (targetLanguage: string) => {
    const result = await db
      .selectDistinct({ textId: chapters.textId })
      .from(chapters)
      .innerJoin(translations, eq(translations.chapterId, chapters.id))
      .where(
        and(
          eq(translations.targetLanguage, targetLanguage),
          isNotNull(translations.currentVersionId)
        )
      );
    return result.map((r) => r.textId);
  },
  ["texts.getTextIdsWithTranslation.v1"],
  { revalidate: 600, tags: [TEXT_IDS_TAG] }
);

const cachedTextBySlug = unstable_cache(
  async (textSlug: string) => {
    const result = await db.query.texts.findFirst({
      where: eq(texts.slug, textSlug),
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
            titleEs: true,
            ordering: true,
          },
        },
      },
    });
    return result ?? null;
  },
  ["texts.getBySlug.v1"],
  { revalidate: 300, tags: [TEXT_TAG] }
);

export const textsRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ languageCode: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const result = await cachedTextsList();
      if (input?.languageCode) {
        return result.filter((t) => t.language.code === input.languageCode);
      }
      return result;
    }),

  getTextIdsWithTranslation: publicProcedure
    .input(z.object({ targetLanguage: z.string() }))
    .query(async ({ input }) => {
      return cachedTextIdsWithTranslation(input.targetLanguage);
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
      return cachedTextBySlug(input.textSlug);
    }),
});
