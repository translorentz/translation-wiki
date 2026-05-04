// Manual sitemap index. Next 16's generateSitemaps in `app/sitemap.ts`
// exposes the per-shard XML files at /sitemap/0.xml, /sitemap/1.xml, etc.
// but does NOT auto-generate the top-level <sitemapindex>. This route
// emits one. robots.txt points crawlers at this URL.
//
// Path is /sitemap-index.xml (not /sitemap.xml) because a `sitemap.xml/`
// folder collides with `app/sitemap.ts`'s dynamic shard route at build time.
import { db } from "@/server/db";
import { chapters } from "@/server/db/schema";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const BASE_URL = "https://deltoi.com";
const CHAPTERS_PER_SHARD = 10000;

export async function GET() {
  const rows = await db.select({ id: chapters.id }).from(chapters);
  const chapterShardCount = Math.max(1, Math.ceil(rows.length / CHAPTERS_PER_SHARD));
  const lastmod = new Date().toISOString();

  const ids = [0];
  for (let i = 1; i <= chapterShardCount; i++) ids.push(i);

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    ids
      .map(
        (id) =>
          `  <sitemap>\n    <loc>${BASE_URL}/sitemap/${id}.xml</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`
      )
      .join("\n") +
    `\n</sitemapindex>\n`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
