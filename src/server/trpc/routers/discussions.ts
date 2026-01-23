import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "../init";
import { db } from "@/server/db";
import { discussionThreads, discussionPosts } from "@/server/db/schema";
import { eq, and, desc, asc, count, sql } from "drizzle-orm";

export const discussionsRouter = createTRPCRouter({
  listByChapter: publicProcedure
    .input(z.object({ chapterId: z.number() }))
    .query(async ({ input }) => {
      const threads = await db.query.discussionThreads.findMany({
        where: eq(discussionThreads.chapterId, input.chapterId),
        with: {
          author: { columns: { id: true, username: true } },
          posts: { columns: { id: true } },
        },
        orderBy: [desc(discussionThreads.isPinned), desc(discussionThreads.updatedAt)],
      });

      return threads.map((t) => ({
        id: t.id,
        title: t.title,
        author: t.author,
        isPinned: t.isPinned,
        isResolved: t.isResolved,
        replyCount: Math.max(0, t.posts.length - 1),
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));
    }),

  getThread: publicProcedure
    .input(z.object({ threadId: z.number() }))
    .query(async ({ input }) => {
      const thread = await db.query.discussionThreads.findFirst({
        where: eq(discussionThreads.id, input.threadId),
        with: {
          author: { columns: { id: true, username: true } },
          posts: {
            with: {
              author: { columns: { id: true, username: true } },
            },
            orderBy: asc(discussionPosts.createdAt),
          },
        },
      });

      if (!thread) return null;
      return thread;
    }),

  threadCount: publicProcedure
    .input(z.object({ chapterId: z.number() }))
    .query(async ({ input }) => {
      const [result] = await db
        .select({ count: count() })
        .from(discussionThreads)
        .where(eq(discussionThreads.chapterId, input.chapterId));
      return result.count;
    }),

  createThread: protectedProcedure
    .input(
      z.object({
        chapterId: z.number(),
        title: z.string().min(1).max(300),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = Number(ctx.user.id);

      const [thread] = await db
        .insert(discussionThreads)
        .values({
          chapterId: input.chapterId,
          title: input.title,
          authorId: userId,
        })
        .returning();

      await db.insert(discussionPosts).values({
        threadId: thread.id,
        authorId: userId,
        content: input.content,
      });

      return thread;
    }),

  createPost: protectedProcedure
    .input(
      z.object({
        threadId: z.number(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = Number(ctx.user.id);

      const [post] = await db
        .insert(discussionPosts)
        .values({
          threadId: input.threadId,
          authorId: userId,
          content: input.content,
        })
        .returning();

      // Update thread's updatedAt
      await db
        .update(discussionThreads)
        .set({ updatedAt: new Date() })
        .where(eq(discussionThreads.id, input.threadId));

      return post;
    }),

  toggleResolved: protectedProcedure
    .input(z.object({ threadId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const userId = Number(ctx.user.id);

      const thread = await db.query.discussionThreads.findFirst({
        where: eq(discussionThreads.id, input.threadId),
      });

      if (!thread) {
        throw new Error("Thread not found");
      }

      // Only thread author or admin can toggle resolved
      if (thread.authorId !== userId && ctx.user.role !== "admin") {
        throw new Error("Not authorized");
      }

      await db
        .update(discussionThreads)
        .set({ isResolved: !thread.isResolved })
        .where(eq(discussionThreads.id, input.threadId));

      return { isResolved: !thread.isResolved };
    }),

  togglePinned: adminProcedure
    .input(z.object({ threadId: z.number() }))
    .mutation(async ({ input }) => {
      const thread = await db.query.discussionThreads.findFirst({
        where: eq(discussionThreads.id, input.threadId),
      });

      if (!thread) {
        throw new Error("Thread not found");
      }

      await db
        .update(discussionThreads)
        .set({ isPinned: !thread.isPinned })
        .where(eq(discussionThreads.id, input.threadId));

      return { isPinned: !thread.isPinned };
    }),
});
