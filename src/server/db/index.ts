import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// max: 1 — on Vercel serverless each function instance gets its own pool, so
// the postgres-js default of 10 connections per instance multiplies against
// Neon's connection ceiling under concurrency for no benefit (an instance
// handles one request at a time). One connection per instance, released
// after 20s idle so Neon's autosuspend can engage during quiet periods.
const client = postgres(connectionString, { max: 1, idle_timeout: 20 });
export const db = drizzle(client, { schema });
