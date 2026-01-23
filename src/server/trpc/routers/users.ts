import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";

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
});
