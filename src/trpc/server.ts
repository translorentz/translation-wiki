import "server-only";
import { createCaller } from "@/server/trpc/router";
import { createTRPCContext } from "@/server/trpc/init";

/**
 * Auth-aware server-side tRPC caller. Use for pages and route handlers that
 * legitimately need the user session (edit/profile/admin, mutations that gate
 * on role). Calls auth() internally, which reads cookies() and therefore
 * forces dynamic rendering of any page that invokes this.
 */
export async function getServerTRPC() {
  const context = await createTRPCContext();
  return createCaller(context);
}

/**
 * Public (auth-free) server-side tRPC caller. Use for cacheable read-only
 * pages — front page, browse, text/chapter shells. Does NOT call auth(), so
 * pages using this can be statically/ISR-rendered (combined with no other
 * dynamic-API calls). The tRPC procedures invoked through this caller see
 * ctx.session === null; protected/editor/admin procedures throw UNAUTHORIZED,
 * so only publicProcedure-based routes can be called this way.
 */
export async function getPublicServerTRPC() {
  const context = await createTRPCContext({ withAuth: false });
  return createCaller(context);
}
