#!/bin/bash
# Load env and run seed
set -e
cd "$(dirname "$0")/.."
export DATABASE_URL='postgresql://neondb_owner:***REMOVED***@REDACTED_DB_HOST/neondb?sslmode=require&channel_binding=require'
pnpm tsx scripts/seed-db.ts
