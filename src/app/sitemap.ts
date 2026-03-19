import { db } from "@/server/db";
import { texts, chapters, authors, languages } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import type { MetadataRoute } from "next";

// Force dynamic generation so new texts appear without rebuild
export const dynamic = "force-dynamic";
export const revalidate = 3600; // Revalidate every hour

const BASE_URL = "https://deltoi.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Static pages — both locales
  for (const locale of ["", "/cn"]) {
    entries.push(
      { url: `${BASE_URL}${locale}`, changeFrequency: "weekly", priority: 1.0 },
      { url: `${BASE_URL}${locale}/texts`, changeFrequency: "weekly", priority: 0.9 },
      { url: `${BASE_URL}${locale}/search`, changeFrequency: "monthly", priority: 0.5 },
    );
  }

  // All texts with their chapters
  const allTexts = await db
    .select({
      textSlug: texts.slug,
      authorSlug: authors.slug,
      langCode: languages.code,
    })
    .from(texts)
    .innerJoin(authors, eq(texts.authorId, authors.id))
    .innerJoin(languages, eq(texts.languageId, languages.id));

  // Text index pages — both locales
  for (const t of allTexts) {
    const textPath = `/${t.langCode}/${t.authorSlug}/${t.textSlug}`;
    entries.push(
      { url: `${BASE_URL}${textPath}`, changeFrequency: "monthly", priority: 0.7 },
      { url: `${BASE_URL}/cn${textPath}`, changeFrequency: "monthly", priority: 0.7 },
    );
  }

  // All chapters — both locales
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
    .innerJoin(languages, eq(texts.languageId, languages.id));

  for (const c of allChapters) {
    const chapterPath = `/${c.langCode}/${c.authorSlug}/${c.textSlug}/${c.chapterSlug}`;
    entries.push(
      { url: `${BASE_URL}${chapterPath}`, changeFrequency: "monthly", priority: 0.6 },
      { url: `${BASE_URL}/cn${chapterPath}`, changeFrequency: "monthly", priority: 0.6 },
    );
  }

  return entries;
}
