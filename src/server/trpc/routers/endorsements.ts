import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../init";
import { db } from "@/server/db";
import { endorsements } from "@/server/db/schema";
import { eq, and, count } from "drizzle-orm";

export const endorsementsRouter = createTRPCRouter({
  toggle: protectedProcedure
    .input(z.object({ translationVersionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const userId = Number(ctx.user.id);

      const existing = await db.query.endorsements.findFirst({
        where: and(
          eq(endorsements.userId, userId),
          eq(endorsements.translationVersionId, input.translationVersionId)
        ),
      });

      if (existing) {
        await db.delete(endorsements).where(eq(endorsements.id, existing.id));
      } else {
        await db.insert(endorsements).values({
          userId,
          translationVersionId: input.translationVersionId,
        });
      }

      const [result] = await db
        .select({ count: count() })
        .from(endorsements)
        .where(
          eq(endorsements.translationVersionId, input.translationVersionId)
        );

      return {
        endorsed: !existing,
        count: result.count,
      };
    }),

  getCount: publicProcedure
    .input(z.object({ translationVersionId: z.number() }))
    .query(async ({ input }) => {
      const [result] = await db
        .select({ count: count() })
        .from(endorsements)
        .where(
          eq(endorsements.translationVersionId, input.translationVersionId)
        );
      return result.count;
    }),
});
