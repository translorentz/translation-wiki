import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Test DB connection
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role,
        hasPassword: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, "translorentz@gmail.com"))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found in DB" });
    }

    const passwordValid = user.hasPassword
      ? await compare("aglioolio2026!run", user.hasPassword)
      : false;

    return NextResponse.json({
      found: true,
      id: user.id,
      username: user.username,
      role: user.role,
      hasPasswordHash: !!user.hasPassword,
      passwordHashLength: user.hasPassword?.length,
      passwordValid,
      dbUrlSet: !!process.env.DATABASE_URL,
      authSecretSet: !!process.env.AUTH_SECRET,
    });
  } catch (err) {
    return NextResponse.json({
      error: String(err),
      dbUrlSet: !!process.env.DATABASE_URL,
    });
  }
}
