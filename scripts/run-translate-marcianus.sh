#!/bin/bash
# Load environment variables from .env.local
set -a
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ -z "$key" || "$key" == \#* ]] && continue
  # Strip surrounding quotes from value
  value="${value#\'}"
  value="${value%\'}"
  value="${value#\"}"
  value="${value%\"}"
  export "$key=$value"
done < .env.local
set +a

echo "=== Translating periplus-maris-exteri (31 chapters) ==="
pnpm tsx scripts/translate-batch.ts --text periplus-maris-exteri --start 1 --end 31 --delay 500

echo ""
echo "=== Translating periplus-maris-interni (6 chapters) ==="
pnpm tsx scripts/translate-batch.ts --text periplus-maris-interni --start 1 --end 6 --delay 500

echo ""
echo "=== Translating artemidori-geographia (3 chapters) ==="
pnpm tsx scripts/translate-batch.ts --text artemidori-geographia --start 1 --end 3 --delay 500

echo ""
echo "=== All Marcianus translations complete ==="
