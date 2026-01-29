import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from "../init";
import { db } from "@/server/db";
import { users, invitationTokens, accounts, translationVersions, discussionThreads, discussionPosts, endorsements } from "@/server/db/schema";
import { hash, compare } from "bcryptjs";
import { eq, asc, and, isNull, gt, sql, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

const MAX_USERS = 20;

export const usersRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        username: z.string().min(3).max(50),
        password: z.string().min(8),
        inviteToken: z.string().min(1, "Invitation token is required"),
      })
    )
    .mutation(async ({ input }) => {
      const passwordHash = await hash(input.password, 12);

      // Use a transaction to atomically consume token, check cap, and create user
      const user = await db.transaction(async (tx) => {
        // Consume token atomically (UPDATE ... WHERE usedAt IS NULL)
        const [consumedToken] = await tx
          .update(invitationTokens)
          .set({ usedAt: new Date() })
          .where(
            and(
              eq(invitationTokens.token, input.inviteToken),
              isNull(invitationTokens.usedAt),
              gt(invitationTokens.expiresAt, new Date())
            )
          )
          .returning({ id: invitationTokens.id });

        if (!consumedToken) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid or expired invitation token",
          });
        }

        // Enforce user cap inside transaction
        const [{ count }] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(users);

        if (count >= MAX_USERS) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "User limit reached. No more registrations are accepted.",
          });
        }

        // Check uniqueness
        const existingEmail = await tx.query.users.findFirst({
          where: eq(users.email, input.email),
          columns: { id: true },
        });
        if (existingEmail) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already in use",
          });
        }

        const existingUsername = await tx.query.users.findFirst({
          where: eq(users.username, input.username),
          columns: { id: true },
        });
        if (existingUsername) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Username already taken",
          });
        }

        // Create user
        const [newUser] = await tx
          .insert(users)
          .values({
            email: input.email,
            username: input.username,
            passwordHash,
          })
          .returning({
            id: users.id,
            email: users.email,
            username: users.username,
          });

        // Set usedByUserId on consumed token
        await tx
          .update(invitationTokens)
          .set({ usedByUserId: newUser!.id })
          .where(eq(invitationTokens.id, consumedToken.id));

        return newUser!;
      });

      return user;
    }),

  getProfile: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.username, input.username),
        columns: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
        },
      });
      return user ?? null;
    }),

  listAll: adminProcedure.query(async () => {
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.createdAt));
    return allUsers;
  }),

  setRole: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["reader", "editor", "admin"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.userId === Number(ctx.user.id)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change your own role",
        });
      }

      const [updated] = await db
        .update(users)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(users.id, input.userId))
        .returning({
          id: users.id,
          username: users.username,
          role: users.role,
        });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return updated;
    }),

  // ---- Admin: Invitation Token Management ----

  createInviteToken: adminProcedure.mutation(async ({ ctx }) => {
    const token = randomBytes(32).toString("hex"); // 64-char hex
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [row] = await db
      .insert(invitationTokens)
      .values({
        token,
        createdByUserId: Number(ctx.user.id),
        expiresAt,
      })
      .returning({
        id: invitationTokens.id,
        token: invitationTokens.token,
        expiresAt: invitationTokens.expiresAt,
        createdAt: invitationTokens.createdAt,
      });

    return row!;
  }),

  listInviteTokens: adminProcedure.query(async () => {
    const tokens = await db
      .select({
        id: invitationTokens.id,
        token: invitationTokens.token,
        expiresAt: invitationTokens.expiresAt,
        usedAt: invitationTokens.usedAt,
        createdAt: invitationTokens.createdAt,
        usedByUserId: invitationTokens.usedByUserId,
      })
      .from(invitationTokens)
      .orderBy(desc(invitationTokens.createdAt));

    // Truncate tokens — only show prefix for display, not the full value
    return tokens.map((t) => ({
      ...t,
      token: `${t.token.slice(0, 8)}...${t.token.slice(-4)}`,
    }));
  }),

  revokeInviteToken: adminProcedure
    .input(z.object({ tokenId: z.number() }))
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .delete(invitationTokens)
        .where(
          and(
            eq(invitationTokens.id, input.tokenId),
            isNull(invitationTokens.usedAt)
          )
        )
        .returning({ id: invitationTokens.id });

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Token not found or already used",
        });
      }

      return { success: true };
    }),

  // ---- Admin: Delete User ----

  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === Number(ctx.user.id)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete your own account from the admin panel",
        });
      }

      const [target] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      await db.transaction(async (tx) => {
        // Nullify FKs that don't cascade (preserve content, remove author link)
        await tx.update(translationVersions).set({ authorId: 1 }).where(eq(translationVersions.authorId, input.userId));
        await tx.update(discussionThreads).set({ authorId: 1 }).where(eq(discussionThreads.authorId, input.userId));
        await tx.update(discussionPosts).set({ authorId: 1 }).where(eq(discussionPosts.authorId, input.userId));
        await tx.update(invitationTokens).set({ createdByUserId: 1 }).where(eq(invitationTokens.createdByUserId, input.userId));
        await tx.update(invitationTokens).set({ usedByUserId: null }).where(eq(invitationTokens.usedByUserId, input.userId));
        // accounts and endorsements cascade on delete
        await tx.delete(users).where(eq(users.id, input.userId));
      });

      return { success: true };
    }),

  // ---- User: Profile & Self-Management ----

  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const userId = Number(ctx.user.id);
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        hasPassword: sql<boolean>`password_hash IS NOT NULL`,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Check if user has linked Google account
    const [googleAccount] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")))
      .limit(1);

    return { ...user, hasGoogle: !!googleAccount };
  }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = Number(ctx.user.id);
      const [user] = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user?.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Account uses Google sign-in only. No password to change.",
        });
      }

      const valid = await compare(input.currentPassword, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Current password is incorrect",
        });
      }

      const newHash = await hash(input.newPassword, 12);
      await db
        .update(users)
        .set({ passwordHash: newHash, updatedAt: new Date() })
        .where(eq(users.id, userId));

      return { success: true };
    }),

  deleteMyAccount: protectedProcedure
    .input(z.object({ confirmUsername: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = Number(ctx.user.id);
      const [user] = await db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user || user.username !== input.confirmUsername) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Username confirmation does not match",
        });
      }

      await db.transaction(async (tx) => {
        // Reassign content to system user (id=1) to preserve content
        await tx.update(translationVersions).set({ authorId: 1 }).where(eq(translationVersions.authorId, userId));
        await tx.update(discussionThreads).set({ authorId: 1 }).where(eq(discussionThreads.authorId, userId));
        await tx.update(discussionPosts).set({ authorId: 1 }).where(eq(discussionPosts.authorId, userId));
        await tx.update(invitationTokens).set({ createdByUserId: 1 }).where(eq(invitationTokens.createdByUserId, userId));
        await tx.update(invitationTokens).set({ usedByUserId: null }).where(eq(invitationTokens.usedByUserId, userId));
        await tx.delete(users).where(eq(users.id, userId));
      });

      return { success: true };
    }),
});
