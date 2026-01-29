// WARNING: Password is passed as CLI argument and may be visible in process listings.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";
import { hash } from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");
let dbUrl = process.env.DATABASE_URL || "";
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^DATABASE_URL=(.+)$/);
    if (m) dbUrl = m[1].replace(/^['"]|['"]$/g, "");
  }
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error("Usage: pnpm tsx scripts/reset-admin-password.ts <email> <new-password>");
    process.exit(1);
  }
  const sql = postgres(dbUrl);
  const passwordHash = await hash(password, 12);
  const rows = await sql`UPDATE users SET password_hash = ${passwordHash} WHERE email = ${email} RETURNING id, username`;
  if (rows.length === 0) {
    console.error("No user found with email:", email);
    process.exit(1);
  }
  console.log("Updated:", JSON.stringify(rows[0]));
  await sql.end();
}
main();
