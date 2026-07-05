/**
 * tRPC procedures whose GET responses are public, user-independent, and safe
 * to cache at the CDN edge. Shared by:
 *   - src/app/api/trpc/[trpc]/route.ts — sets public cache headers + skips
 *     the auth() context for batches consisting solely of these procedures
 *   - src/middleware.ts — routes matching GET requests past the NextAuth
 *     wrapper so no CSRF/callback-url set-cookie is stamped (a response
 *     with set-cookie is uncacheable at Cloudflare regardless of headers)
 *
 * ONLY add publicProcedure routes whose output does not depend on the
 * viewer. Anything session-dependent here would be served cross-user from
 * the CDN cache.
 */
export const EDGE_CACHEABLE_QUERIES = new Set([
  "texts.list",
  "texts.getBySlug",
  "texts.getTextIdsWithTranslation",
  "chapters.getByTextAndSlug",
  "search.languages",
  "search.titles",
  "search.content",
]);
