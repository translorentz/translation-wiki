#!/bin/bash
# Run all Spanish pilots sequentially: audit-first (skip if passes), else translate + audit.
# Failures collected in /tmp/es-pilot-failures.txt.
set -u

SEL=/tmp/es-pilot-selection.json
FAILS=/tmp/es-pilot-failures.txt
: > "$FAILS"

COUNT=$(node -e "console.log(require('$SEL').length)")
echo "Running $COUNT pilots sequentially..."

for i in $(seq 0 $((COUNT - 1))); do
  SLUG=$(node -e "console.log(require('$SEL')[$i].slug)")
  CH=$(node -e "console.log(require('$SEL')[$i].chapterNumber)")
  KEY=$(node -e "console.log(require('$SEL')[$i].key)")
  echo ""
  echo "=============================="
  echo "[$((i+1))/$COUNT] $KEY  ->  $SLUG ch$CH"
  echo "=============================="

  # Step 0: pre-audit — if already passing, skip translation
  pnpm tsx scripts/_audit-spanish-pilot.ts "$SLUG" "$CH" > /tmp/es-preaudit.json 2>&1
  PREAUDIT_EXIT=$?
  if [ "$PREAUDIT_EXIT" -eq 0 ]; then
    echo "[pre-audit PASS — skipping translation]"
    continue
  fi

  # Step 1: translate
  pnpm tsx scripts/translate-batch.ts --text "$SLUG" --target-language es --start "$CH" --end "$CH" 2>&1 | tail -6
  TRANS_EXIT=${PIPESTATUS[0]}
  echo "[translate exit=$TRANS_EXIT]"

  # Step 2: audit
  pnpm tsx scripts/_audit-spanish-pilot.ts "$SLUG" "$CH" 2>&1 | tail -30
  AUDIT_EXIT=${PIPESTATUS[0]}

  if [ "$AUDIT_EXIT" -ne 0 ]; then
    echo "FAIL $KEY $SLUG $CH" >> "$FAILS"
    echo "[audit FAIL exit=$AUDIT_EXIT]"
  else
    echo "[audit PASS]"
  fi
done

echo ""
echo "=============================="
echo "Summary"
echo "=============================="
if [ -s "$FAILS" ]; then
  echo "Failures:"
  cat "$FAILS"
  exit 1
else
  echo "All $COUNT pilots passed."
  exit 0
fi
