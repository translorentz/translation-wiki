import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/server/auth";

interface CreateTRPCContextOptions {
  /**
   * Whether to read the NextAuth session via cookies(). Setting this to false
   * is REQUIRED for server-side tRPC callers on cacheable pages — calling
   * auth() reaches cookies() internally, which Next.js classifies as a dynamic
   * API and refuses to statically render the route. Default true preserves
   * existing behaviour for auth-aware code paths.
   */
  withAuth?: boolean;
}

export const createTRPCContext = async (options: CreateTRPCContextOptions = {}) => {
  const session = options.withAuth === false ? null : await auth();
  return { session };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.session.user,
    },
  });
});

export const editorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "editor" && ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Editor access required",
    });
  }
  return next({ ctx });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});
