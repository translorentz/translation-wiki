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
import { texts, chapters, authors, languages } from "@/server/db/schema";
import { eq } from "drizzle-orm";
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
  const lastmod = new Date().toISOString();

  if (shardId === 0) {
    const urls: UrlEntry[] = [];

    for (const locale of LOCALES) {
      urls.push(
        {
          loc: `${BASE_URL}${locale || "/"}`,
          lastmod,
          changefreq: "weekly",
          priority: "1.0",
        },
        {
          loc: `${BASE_URL}${locale}/texts`,
          lastmod,
          changefreq: "weekly",
          priority: "0.9",
        },
        {
          loc: `${BASE_URL}${locale}/search`,
          lastmod,
          changefreq: "monthly",
          priority: "0.5",
        },
        {
          loc: `${BASE_URL}${locale}/about`,
          lastmod,
          changefreq: "yearly",
          priority: "0.4",
        }
      );
    }

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
        urls.push({
          loc: `${BASE_URL}${locale}${textPath}`,
          lastmod,
          changefreq: "monthly",
          priority: "0.7",
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

  // Chapter shards: shardId 1 → first 10k, etc.
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

  if (allChapters.length === 0) {
    return new NextResponse("not found", { status: 404 });
  }

  const urls: UrlEntry[] = [];
  for (const c of allChapters) {
    const chapterPath = `/${c.langCode}/${c.authorSlug}/${c.textSlug}/${c.chapterSlug}`;
    for (const locale of LOCALES) {
      urls.push({
        loc: `${BASE_URL}${locale}${chapterPath}`,
        lastmod,
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
