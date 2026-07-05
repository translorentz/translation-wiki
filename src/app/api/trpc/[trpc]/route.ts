import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/router";
import { createTRPCContext } from "@/server/trpc/init";

// Public, user-independent, read-only procedures whose GET responses are safe
// to cache at the CDN edge. Everything else — anything session-dependent,
// any mutation, anything not explicitly listed — gets no-store. The
// Cloudflare Cache Rule includes /api/trpc/ but runs in respect-origin mode,
// so ONLY responses carrying the public headers below are ever cached; the
// no-store default makes accidental cross-user caching impossible.
const EDGE_CACHEABLE_QUERIES = new Set([
  "texts.list",
  "texts.getBySlug",
  "texts.getTextIdsWithTranslation",
  "chapters.getByTextAndSlug",
  "search.languages",
  "search.titles",
  "search.content",
]);

// Matches the pages' ISR revalidate (1h). The chapters unstable_cache is also
// 1h, so a CDN-cached tRPC response is never staler than the SSR page.
//
// Two headers because Vercel's CDN consumes and STRIPS s-maxage/swr from
// Cache-Control (it caches at its own edge — x-vercel-cache: HIT — but
// forwards only `public` downstream, leaving Cloudflare nothing to cache
// against). CDN-Cache-Control passes through Vercel untouched and Cloudflare
// honours it with precedence over Cache-Control.
const PUBLIC_CACHE_HEADER = "public, s-maxage=3600, stale-while-revalidate=86400";
const PUBLIC_CDN_CACHE_HEADER = "public, s-maxage=3600, stale-while-revalidate=86400";

function isPublicCacheableBatch(req: Request, paths: readonly string[] | undefined): boolean {
  return (
    req.method === "GET" &&
    paths !== undefined &&
    paths.length > 0 &&
    paths.every((p) => EDGE_CACHEABLE_QUERIES.has(p))
  );
}

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    // Skip the auth()/cookies() lookup for whitelisted public GET batches.
    // Besides saving the session read, this stops NextAuth from stamping
    // CSRF/callback-url set-cookie headers on these responses — a response
    // with set-cookie is uncacheable at Cloudflare no matter what
    // cache-control says. Protected procedures see ctx.session === null on
    // this path and throw UNAUTHORIZED, but by construction the whitelist
    // contains only publicProcedure routes.
    createContext: ({ info }) => {
      const paths = info?.calls?.map((c) => c.path);
      return createTRPCContext({
        withAuth: !isPublicCacheableBatch(req, paths),
      });
    },
    responseMeta({ paths, type, errors }) {
      if (
        type === "query" &&
        errors.length === 0 &&
        isPublicCacheableBatch(req, paths)
      ) {
        return {
          headers: {
            "cache-control": PUBLIC_CACHE_HEADER,
            "cdn-cache-control": PUBLIC_CDN_CACHE_HEADER,
          },
        };
      }
      return { headers: { "cache-control": "no-store" } };
    },
  });

export { handler as GET, handler as POST };
