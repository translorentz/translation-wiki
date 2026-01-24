#!/bin/bash
# Translate the 4 Shisan Jing texts
set -e
cd "$(dirname "$0")/.."

# Load env from .env.local (take last DATABASE_URL which is Neon)
export $(grep -v '^#' .env.local | grep 'DEEPSEEK_API_KEY' | xargs)
export DATABASE_URL=$(grep 'DATABASE_URL' .env.local | tail -1 | cut -d"'" -f2)

TEXT=$1
START=$2
END=$3

if [ -z "$TEXT" ]; then
  echo "Usage: $0 <text-slug> <start> <end>"
  exit 1
fi

echo "=== Translating $TEXT (chapters $START-$END) ==="
pnpm tsx scripts/translate-batch.ts --text "$TEXT" --start "$START" --end "$END" --delay 2000
