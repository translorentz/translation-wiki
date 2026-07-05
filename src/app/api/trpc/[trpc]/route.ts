import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/router";
import { createTRPCContext } from "@/server/trpc/init";

// Public, user-independent, read-only procedures whose GET responses are safe
// to cache at the CDN edge. Everything else — anything session-dependent,
// any mutation, anything not explicitly listed — gets no-store. The
// Cloudflare Cache Rule includes /api/trpc/ but runs in respect-origin mode,
// so ONLY responses carrying the public header below are ever cached; the
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
const PUBLIC_CACHE_HEADER = "public, s-maxage=3600, stale-while-revalidate=86400";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext(),
    responseMeta({ paths, type, errors }) {
      const allCacheable =
        paths !== undefined &&
        paths.length > 0 &&
        paths.every((p) => EDGE_CACHEABLE_QUERIES.has(p));
      if (type === "query" && errors.length === 0 && allCacheable) {
        return { headers: { "cache-control": PUBLIC_CACHE_HEADER } };
      }
      return { headers: { "cache-control": "no-store" } };
    },
  });

export { handler as GET, handler as POST };
