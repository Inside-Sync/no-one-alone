#!/usr/bin/env bash
# Run from the repo root with full history: bash infra/test-pick-targets.sh
set -uo pipefail
fail=0

check() {
  local base=$1 head=$2 want=$3 got
  got=$(bash infra/pick-targets.sh "$base" "$head" | tr '\n' ';')
  if [ "$got" = "$want" ]; then
    echo "ok   '$base' '$head' -> $got"
  else
    echo "FAIL '$base' '$head' want $want got $got"; fail=1
  fi
}

check ""       HEAD    "list=all;advance=true;"
check deadbeef HEAD    "list=all;advance=true;"
check e4c1bf1  e4c1bf1 "list=;advance=false;"
check 4e53101  f711d52 "list=;advance=false;"
check f711d52  e4c1bf1 "list=web;advance=true;"
check f711d52  4e53101 "list=respond web;advance=true;"
# 6926776 (dev) and 1fef950 (feat/claude-api-key) diverged before merge f711d52.
check 6926776  1fef950 "list=respond web;advance=true;"

exit $fail
