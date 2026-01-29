// WARNING: Password is passed as CLI argument and may be visible in process listings.

/**
 * Create the initial admin user.
 *
 * Usage:
 *   pnpm tsx scripts/create-admin.ts <email> <username> <password>
 *
 * This script is idempotent — if the email or username already exists,
 * it will update that user's role to "admin" instead of creating a new one.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import * as schema from "../src/server/db/schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^DATABASE_URL=(.+)$/);
    if (match) {
      process.env.DATABASE_URL = match[1].replace(/^['"]|['"]$/g, "");
    }
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is required.");
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql, { schema });

async function main() {
  const [email, username, password] = process.argv.slice(2);

  if (!email || !username || !password) {
    console.error("Usage: pnpm tsx scripts/create-admin.ts <email> <username> <password>");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  // Check if user already exists by email or username
  const existing = await db.query.users.findFirst({
    where: (u, { or }) => or(eq(u.email, email), eq(u.username, username)),
  });

  if (existing) {
    await db
      .update(schema.users)
      .set({ role: "admin" })
      .where(eq(schema.users.id, existing.id));
    console.log(`User "${existing.username}" (id=${existing.id}) promoted to admin.`);
  } else {
    const passwordHash = await hash(password, 12);
    const [created] = await db
      .insert(schema.users)
      .values({ email, username, passwordHash, role: "admin" })
      .returning({ id: schema.users.id });
    console.log(`Admin user "${username}" created (id=${created.id}).`);
  }

  await sql.end();
  process.exit(0);
}

main();
