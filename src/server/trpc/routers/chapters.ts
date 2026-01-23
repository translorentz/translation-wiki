import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import { db } from "@/server/db";
import { chapters, translations, translationVersions } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export const chaptersRouter = createTRPCRouter({
  getByTextAndNumber: publicProcedure
    .input(
      z.object({
        textId: z.number(),
        chapterNumber: z.number(),
      })
    )
    .query(async ({ input }) => {
      const chapter = await db.query.chapters.findFirst({
        where: and(
          eq(chapters.textId, input.textId),
          eq(chapters.chapterNumber, input.chapterNumber)
        ),
        with: {
          translations: {
            with: {
              currentVersion: {
                with: {
                  author: {
                    columns: { id: true, username: true },
                  },
                },
              },
            },
          },
        },
      });
      return chapter ?? null;
    }),
});
