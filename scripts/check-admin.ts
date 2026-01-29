import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";
import { compare } from "bcryptjs";

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
  if (!email) {
    console.error("Usage: pnpm tsx scripts/check-admin.ts <email> [password]");
    process.exit(1);
  }
  const password = process.argv[3];
  const sql = postgres(dbUrl);
  const rows = await sql`SELECT id, email, username, role, password_hash FROM users WHERE email = ${email}`;
  console.log("User row:", JSON.stringify(rows[0], null, 2));
  if (rows[0]?.password_hash && password) {
    const ok = await compare(password, rows[0].password_hash);
    console.log("Password valid:", ok);
  } else if (!rows[0]) {
    console.log("No user found with email:", email);
  } else if (!password) {
    console.log("No password provided — skipping password check");
  }
  await sql.end();
}
main();
