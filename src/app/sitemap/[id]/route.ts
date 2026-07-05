// Manual sitemap shard route. Replaces the previous `app/sitemap.ts` +
// `generateSitemaps` approach because Next 16's auto-generated dispatch
// silently passed the `id` param such that our `if (id === 0)` branch never
// fired (string-vs-number, then prerender-cache after `dynamic = "force-dynamic"`),
// causing /sitemap/0.xml to emit chapter URLs instead of static + text-index.
// A direct route handler reads the param explicitly with parseInt and uses
// no Next-managed metadata machinery — what's emitted is what the function
// returns, every request.
//
// URL shape: /sitemap/0.xml ... /sitemap/N.xml.
// /sitemap-index.xml is a separate route that emits the <sitemapindex>.

import { db } from "@/server/db";
import { texts, chapters, authors, languages, translations } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE_URL = "https://deltoi.com";
const LOCALES = ["", "/cn", "/es"] as const;
const CHAPTERS_PER_SHARD = 10000;

interface UrlEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

function urlsetXml(urls: UrlEntry[]): string {
  const body = urls
    .map(
      (u) =>
        `<url>\n  <loc>${u.loc}</loc>\n  <lastmod>${u.lastmod}</lastmod>\n  <changefreq>${u.changefreq}</changefreq>\n  <priority>${u.priority}</priority>\n</url>`
    )
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    body +
    `\n</urlset>\n`
  );
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: rawId } = await ctx.params;
  const shardId = parseInt(String(rawId), 10);
  if (Number.isNaN(shardId) || shardId < 0) {
    return new NextResponse("not found", { status: 404 });
  }
  // Real modification dates. The previous implementation stamped every URL
  // with `new Date()` on every fetch, telling crawlers all ~115K URLs
  // changed today, every day — inviting a permanent full recrawl of the
  // corpus at origin cost. Chapters/texts have no updated_at columns, so
  // the honest signal is max(translations.updated_at): a page's visible
  // content changes when a translation is added or edited. Fallback:
  // texts.created_at for texts/chapters with no translations yet.

  if (shardId === 0) {
    const urls: UrlEntry[] = [];

    const allTexts = await db
      .select({
        textSlug: texts.slug,
        authorSlug: authors.slug,
        langCode: languages.code,
        lastmod: sql<string>`to_char(coalesce(max(${translations.updatedAt}), ${texts.createdAt}), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
      })
      .from(texts)
      .innerJoin(authors, eq(texts.authorId, authors.id))
      .innerJoin(languages, eq(texts.languageId, languages.id))
      .leftJoin(chapters, eq(chapters.textId, texts.id))
      .leftJoin(translations, eq(translations.chapterId, chapters.id))
      .groupBy(texts.id, texts.slug, texts.createdAt, authors.slug, languages.code);

    // Static pages: lastmod = the most recent change anywhere in the corpus.
    const siteLastmod =
      allTexts.reduce(
        (max, t) => (t.lastmod > max ? t.lastmod : max),
        "1970-01-01T00:00:00Z"
      ) || new Date().toISOString();

    for (const locale of LOCALES) {
      urls.push(
        {
          loc: `${BASE_URL}${locale || "/"}`,
          lastmod: siteLastmod,
          changefreq: "weekly",
          priority: "1.0",
        },
        {
          loc: `${BASE_URL}${locale}/texts`,
          lastmod: siteLastmod,
          changefreq: "weekly",
          priority: "0.9",
        },
        {
          loc: `${BASE_URL}${locale}/search`,
          lastmod: siteLastmod,
          changefreq: "monthly",
          priority: "0.5",
        },
        {
          loc: `${BASE_URL}${locale}/about`,
          lastmod: siteLastmod,
          changefreq: "yearly",
          priority: "0.4",
        }
      );
    }

    for (const t of allTexts) {
      const textPath = `/${t.langCode}/${t.authorSlug}/${t.textSlug}`;
      for (const locale of LOCALES) {
        urls.push({
          loc: `${BASE_URL}${locale}${textPath}`,
          lastmod: t.lastmod,
          changefreq: "monthly",
          priority: "0.7",
        });
      }
    }

    return new NextResponse(urlsetXml(urls), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        // 24h edge cache — sitemap content changes only when texts/chapters
        // are seeded. force-dynamic stays (see header comment); caching
        // happens at the CDN via this header, not in Next's prerender cache.
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  }

  // Chapter shards: shardId 1 → first 10k, etc.
  const offset = (shardId - 1) * CHAPTERS_PER_SHARD;
  const allChapters = await db
    .select({
      chapterSlug: chapters.slug,
      textSlug: texts.slug,
      authorSlug: authors.slug,
      langCode: languages.code,
      lastmod: sql<string>`to_char(coalesce(max(${translations.updatedAt}), ${texts.createdAt}), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
    })
    .from(chapters)
    .innerJoin(texts, eq(chapters.textId, texts.id))
    .innerJoin(authors, eq(texts.authorId, authors.id))
    .innerJoin(languages, eq(texts.languageId, languages.id))
    .leftJoin(translations, eq(translations.chapterId, chapters.id))
    .groupBy(chapters.id, chapters.slug, texts.slug, texts.createdAt, authors.slug, languages.code)
    .orderBy(chapters.id)
    .limit(CHAPTERS_PER_SHARD)
    .offset(offset);

  if (allChapters.length === 0) {
    return new NextResponse("not found", { status: 404 });
  }

  const urls: UrlEntry[] = [];
  for (const c of allChapters) {
    const chapterPath = `/${c.langCode}/${c.authorSlug}/${c.textSlug}/${c.chapterSlug}`;
    for (const locale of LOCALES) {
      urls.push({
        loc: `${BASE_URL}${locale}${chapterPath}`,
        lastmod: c.lastmod,
        changefreq: "monthly",
        priority: "0.6",
      });
    }
  }

  return new NextResponse(urlsetXml(urls), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
