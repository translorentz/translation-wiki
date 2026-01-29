import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { db } from "@/server/db";
import { users, accounts, invitationTokens } from "@/server/db/schema";
import { eq, and, isNull, gt, sql } from "drizzle-orm";
import { cookies } from "next/headers";

type Role = "reader" | "editor" | "admin";

const MAX_USERS = 20;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!dbUser || !dbUser.passwordHash) {
          return null;
        }

        const isPasswordValid = await compare(password, dbUser.passwordHash);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: String(dbUser.id),
          email: dbUser.email,
          name: dbUser.username,
          role: dbUser.role as Role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") {
        return true;
      }

      // Check if this Google account is already linked
      const existingAccount = await db
        .select({ userId: accounts.userId })
        .from(accounts)
        .where(
          and(
            eq(accounts.provider, "google"),
            eq(accounts.providerAccountId, account.providerAccountId)
          )
        )
        .limit(1);

      if (existingAccount.length > 0) {
        // Returning user — allow sign-in
        return true;
      }

      // New Google user — need invite token
      const cookieStore = await cookies();
      const inviteTokenValue = cookieStore.get("invite_token")?.value;

      if (!inviteTokenValue) {
        return "/register?error=invite_required";
      }

      const googleEmail = profile?.email ?? user.email ?? "";

      // Check if email already registered — user should log in with credentials
      const existingUserByEmail = await db.query.users.findFirst({
        where: eq(users.email, googleEmail),
        columns: { id: true },
      });

      if (existingUserByEmail) {
        return "/login?error=email_exists";
      }

      // Use transaction to atomically: validate token, check cap, create user, link account, consume token
      try {
        const result = await db.transaction(async (tx) => {
          // Consume token atomically (UPDATE ... WHERE usedAt IS NULL)
          const [consumedToken] = await tx
            .update(invitationTokens)
            .set({ usedAt: new Date() })
            .where(
              and(
                eq(invitationTokens.token, inviteTokenValue),
                isNull(invitationTokens.usedAt),
                gt(invitationTokens.expiresAt, new Date())
              )
            )
            .returning({ id: invitationTokens.id });

          if (!consumedToken) {
            throw new Error("invalid_token");
          }

          // Check user cap inside transaction
          const [{ count }] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(users);

          if (count >= MAX_USERS) {
            throw new Error("user_limit");
          }

          // Generate username
          const googleName =
            (profile?.name?.replace(/\s+/g, "").toLowerCase().slice(0, 50)) ??
            googleEmail.split("@")[0] ?? "user";

          let username = googleName;
          const existingUsername = await tx.query.users.findFirst({
            where: eq(users.username, username),
            columns: { id: true },
          });
          if (existingUsername) {
            username = `${googleName}${crypto.randomUUID().slice(0, 8)}`;
          }

          // Create user
          const [newUser] = await tx
            .insert(users)
            .values({
              email: googleEmail,
              username,
              passwordHash: null,
              role: "reader",
            })
            .returning({ id: users.id });

          // Link Google account
          await tx.insert(accounts).values({
            userId: newUser!.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            refresh_token: account.refresh_token ?? null,
            access_token: account.access_token ?? null,
            expires_at: account.expires_at ?? null,
            token_type: account.token_type ?? null,
            scope: account.scope ?? null,
            id_token: account.id_token ?? null,
          });

          // Set usedByUserId on consumed token
          await tx
            .update(invitationTokens)
            .set({ usedByUserId: newUser!.id })
            .where(eq(invitationTokens.id, consumedToken.id));

          return { userId: newUser!.id, username };
        });

        // Clear the cookie
        cookieStore.delete("invite_token");

        // Set user info for jwt callback
        user.id = String(result.userId);
        user.name = result.username;
        (user as { role: Role }).role = "reader";

        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "invalid_token") {
          return "/register?error=invite_required";
        }
        if (msg === "user_limit") {
          return "/register?error=user_limit";
        }
        return "/register?error=registration_failed";
      }
    },

    async jwt({ token, user, account }) {
      if (user) {
        // Initial sign-in: set token fields from user object
        if (account?.provider === "google") {
          // Look up from DB to get canonical id/role
          const [acctRow] = await db
            .select({ userId: accounts.userId })
            .from(accounts)
            .where(
              and(
                eq(accounts.provider, "google"),
                eq(accounts.providerAccountId, account.providerAccountId)
              )
            )
            .limit(1);

          if (acctRow) {
            const [dbUser] = await db
              .select({ id: users.id, role: users.role, username: users.username })
              .from(users)
              .where(eq(users.id, acctRow.userId))
              .limit(1);

            if (dbUser) {
              token.id = String(dbUser.id);
              token.role = dbUser.role as Role;
              token.name = dbUser.username;
            }
          }
        } else {
          token.id = user.id as string;
          token.role = (user as { role: Role }).role;
        }
      } else if (token.id) {
        // Subsequent requests: refresh role from DB to pick up role changes
        const [dbUser] = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, Number(token.id)))
          .limit(1);

        if (dbUser) {
          token.role = dbUser.role as Role;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
