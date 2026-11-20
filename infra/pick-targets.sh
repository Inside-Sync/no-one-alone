#!/usr/bin/env bash
# Usage: bash infra/pick-targets.sh <base> <head>; prints list=<targets> and advance=true|false.
set -euo pipefail
base=${1:-}
head=$2

if [ -z "$base" ] || ! git rev-parse -q --verify "$base^{commit}" >/dev/null; then
  echo "list=all"; echo "advance=true"; exit 0
fi
if git merge-base --is-ancestor "$head" "$base"; then
  echo "list="; echo "advance=false"; exit 0
fi

changed=$(git diff --name-only "$base" "$head")
list=()
grep -q '^agents/respond/' <<<"$changed" && list+=(respond)
grep -q '^agents/hospital/' <<<"$changed" && list+=(hospital)
grep -q '^core-api/' <<<"$changed" && list+=(core-api)
if [ -f web/package.json ] && grep -qE '^(web/|firebase\.json$|firestore\.rules$|storage\.rules$)' <<<"$changed"; then
  list+=(web)
fi
echo "list=${list[*]:-}"
echo "advance=true"
