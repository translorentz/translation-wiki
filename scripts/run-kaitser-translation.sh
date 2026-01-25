#!/bin/bash
# Translate Kaitser chapters 1-38
# Run this script from the project root directory

export DATABASE_URL='postgresql://neondb_owner:***REMOVED***@REDACTED_DB_HOST/neondb?sslmode=require&channel_binding=require'
export DEEPSEEK_API_KEY='***REMOVED***'

pnpm tsx scripts/translate-armenian.ts --text kaitser --start 1 --end 38 --delay 5000
