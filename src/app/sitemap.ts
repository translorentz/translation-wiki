import { db } from "@/server/db";
import { texts, chapters, authors, languages } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const BASE_URL = "https://deltoi.com";
const LOCALES = ["", "/cn", "/es"] as const;
const CHAPTERS_PER_SHARD = 10000;

// Shard 0: static + all text-index pages (small).
// Shards 1..N: chapters, paginated.
export async function generateSitemaps(): Promise<{ id: number }[]> {
  const rows = await db.select({ id: chapters.id }).from(chapters);
  const chapterShards = Math.max(1, Math.ceil(rows.length / CHAPTERS_PER_SHARD));
  const ids: { id: number }[] = [{ id: 0 }];
  for (let i = 1; i <= chapterShards; i++) ids.push({ id: i });
  return ids;
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  // The framework passes `id` as the URL path segment (e.g. "0", "1", or in
  // some Next 16 builds the literal "0.xml" with extension), not the typed
  // number — silent string/number mismatch here corrupted shard 0 on the
  // first deploy. parseInt strips trailing ".xml" if present.
  const shardId = parseInt(String(id), 10);
  const lastModified = new Date();

  if (shardId === 0) {
    const entries: MetadataRoute.Sitemap = [];

    // Static pages — all three locales.
    for (const locale of LOCALES) {
      entries.push(
        {
          url: `${BASE_URL}${locale || "/"}`,
          lastModified,
          changeFrequency: "weekly",
          priority: 1.0,
        },
        {
          url: `${BASE_URL}${locale}/texts`,
          lastModified,
          changeFrequency: "weekly",
          priority: 0.9,
        },
        {
          url: `${BASE_URL}${locale}/search`,
          lastModified,
          changeFrequency: "monthly",
          priority: 0.5,
        },
        {
          url: `${BASE_URL}${locale}/about`,
          lastModified,
          changeFrequency: "yearly",
          priority: 0.4,
        }
      );
    }

    // Text-index pages — all three locales.
    const allTexts = await db
      .select({
        textSlug: texts.slug,
        authorSlug: authors.slug,
        langCode: languages.code,
      })
      .from(texts)
      .innerJoin(authors, eq(texts.authorId, authors.id))
      .innerJoin(languages, eq(texts.languageId, languages.id));

    for (const t of allTexts) {
      const textPath = `/${t.langCode}/${t.authorSlug}/${t.textSlug}`;
      for (const locale of LOCALES) {
        entries.push({
          url: `${BASE_URL}${locale}${textPath}`,
          lastModified,
          changeFrequency: "monthly",
          priority: 0.7,
        });
      }
    }

    return entries;
  }

  // Chapter shards. shardId === 1 is the first chapter shard.
  const offset = (shardId - 1) * CHAPTERS_PER_SHARD;
  const allChapters = await db
    .select({
      chapterSlug: chapters.slug,
      textSlug: texts.slug,
      authorSlug: authors.slug,
      langCode: languages.code,
    })
    .from(chapters)
    .innerJoin(texts, eq(chapters.textId, texts.id))
    .innerJoin(authors, eq(texts.authorId, authors.id))
    .innerJoin(languages, eq(texts.languageId, languages.id))
    .orderBy(chapters.id)
    .limit(CHAPTERS_PER_SHARD)
    .offset(offset);

  const entries: MetadataRoute.Sitemap = [];
  for (const c of allChapters) {
    const chapterPath = `/${c.langCode}/${c.authorSlug}/${c.textSlug}/${c.chapterSlug}`;
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}${locale}${chapterPath}`,
        lastModified,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
