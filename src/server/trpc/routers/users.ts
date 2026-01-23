import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, adminProcedure } from "../init";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { hash } from "bcryptjs";
import { eq, asc } from "drizzle-orm";

export const usersRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        username: z.string().min(3).max(50),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      const existingEmail = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (existingEmail) {
        throw new Error("Email already in use");
      }

      const existingUsername = await db.query.users.findFirst({
        where: eq(users.username, input.username),
      });
      if (existingUsername) {
        throw new Error("Username already taken");
      }

      const passwordHash = await hash(input.password, 12);

      const [user] = await db
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
});
