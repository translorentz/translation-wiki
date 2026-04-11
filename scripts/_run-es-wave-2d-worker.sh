#!/bin/bash
# Wave 2D worker runner.
# Usage: _run-es-wave-2d-worker.sh W1
# Reads /tmp/es-wave-2d-partition.json, finds the worker's slug list,
# and runs translate-batch.ts --target-language es for each slug sequentially.
# Logs per-slug output to /tmp/es-wave-2d-<worker>.log

set -u
WORKER="${1:-}"
if [ -z "$WORKER" ]; then
  echo "Usage: $0 W1|W2|W3|W4|W5" >&2
  exit 2
fi

PARTITION_JSON="/tmp/es-wave-2d-partition.json"
if [ ! -f "$PARTITION_JSON" ]; then
  echo "Missing $PARTITION_JSON — run _partition-es-wave-2d.ts first" >&2
  exit 2
fi

LOG="/tmp/es-wave-2d-${WORKER}.log"
STATUS="/tmp/es-wave-2d-${WORKER}.status"

# Extract slugs for this worker via node (jq availability not guaranteed in this env)
SLUGS=$(node -e "
  const j = JSON.parse(require('fs').readFileSync('$PARTITION_JSON','utf-8'));
  const w = j.find(x => x.workerId === '$WORKER');
  if (!w) { console.error('Worker not found'); process.exit(2); }
  console.log(w.slugs.join(' '));
")

if [ -z "$SLUGS" ]; then
  echo "No slugs for worker $WORKER" >&2
  exit 2
fi

echo "[${WORKER}] Start: $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "$LOG"
echo "[${WORKER}] Slugs: $SLUGS" | tee -a "$LOG"
echo "RUNNING" > "$STATUS"

count=0
total=$(echo "$SLUGS" | wc -w | tr -d ' ')
failed_slugs=""

for slug in $SLUGS; do
  count=$((count + 1))
  echo "" | tee -a "$LOG"
  echo "[${WORKER}] [${count}/${total}] $(date -u +%H:%M:%SZ) Starting slug: $slug" | tee -a "$LOG"
  if pnpm tsx scripts/translate-batch.ts --text "$slug" --target-language es >> "$LOG" 2>&1; then
    echo "[${WORKER}] [${count}/${total}] $(date -u +%H:%M:%SZ) OK: $slug" | tee -a "$LOG"
  else
    rc=$?
    echo "[${WORKER}] [${count}/${total}] $(date -u +%H:%M:%SZ) FAIL (rc=$rc): $slug" | tee -a "$LOG"
    failed_slugs="$failed_slugs $slug"
  fi
done

echo "" | tee -a "$LOG"
echo "[${WORKER}] Done: $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "$LOG"
if [ -n "$failed_slugs" ]; then
  echo "[${WORKER}] Failed slugs:$failed_slugs" | tee -a "$LOG"
  echo "COMPLETE_WITH_FAILURES" > "$STATUS"
else
  echo "[${WORKER}] All slugs processed successfully." | tee -a "$LOG"
  echo "COMPLETE" > "$STATUS"
fi
