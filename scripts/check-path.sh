#!/usr/bin/env bash
# pncsy check — did the filled path keep the scaffold's contract?
# Rebuilds the scaffold from the pncsy:learn marker and diffs against it.
set -euo pipefail

ROOT="${PNCSY_HOME:-$(cd -P "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)}"

die() { echo "pncsy check: $*" >&2; exit 2; }

usage() {
  cat >&2 <<'EOF'
pncsy check <path.md> [--strict]

Verifies a filled learning path against the scaffold it came from:
  - every expected heading still present, in order
  - no italic placeholders left unfilled
  - no unresolved (verify) tags

  --strict   treat warnings (extra headings, verify tags) as failure
  -h         this help

Exit: 0 clean · 1 contract broken · 2 could not check
EOF
  exit "${1:-1}"
}

STRICT=0
FILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage 0 ;;
    --strict) STRICT=1; shift ;;
    -*) die "unknown option: $1" ;;
    *) [[ -z "$FILE" ]] && FILE="$1" || die "one file at a time"; shift ;;
  esac
done

[[ -n "$FILE" ]] || usage
[[ -f "$FILE" ]] || die "no such file: $FILE"

marker="$(grep -m1 'pncsy:learn' "$FILE" || true)"
[[ -n "$marker" ]] || die "no pncsy:learn marker in $FILE
  The fill step must keep that line. Without it there is no contract to check against."

attr() { printf '%s\n' "$marker" | sed -n "s/.*$1=\"\([^\"]*\)\".*/\1/p"; }
TOPIC="$(attr topic)"
LEVEL="$(attr level)"
DEPTH="$(attr depth)"
[[ -n "$TOPIC" && -n "$LEVEL" && -n "$DEPTH" ]] || die "marker is missing topic/level/depth"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

bash "$ROOT/scripts/learn.sh" "$TOPIC" --level "$LEVEL" --depth "$DEPTH" -o "$tmp" --force >/dev/null 2>&1 \
  || die "could not rebuild the scaffold for level=$LEVEL depth=$DEPTH"
EXPECTED="$(find "$tmp" -name '*-path.md' | head -1)"
[[ -n "$EXPECTED" ]] || die "scaffold rebuild produced no file"

headings() { grep -E '^#{2,3} ' "$1" | sed 's/[[:space:]]*$//' || true; }
headings "$EXPECTED" > "$tmp/exp"
headings "$FILE" > "$tmp/got"
sort "$tmp/exp" > "$tmp/exp.s"
sort "$tmp/got" > "$tmp/got.s"

errors=0
warnings=0
echo "$FILE  ($TOPIC · $LEVEL · $DEPTH)"
echo ""

while IFS= read -r h; do
  [[ -z "$h" ]] && continue
  echo "  ✗ missing heading   $h"
  errors=$((errors + 1))
done < <(comm -23 "$tmp/exp.s" "$tmp/got.s")

while IFS= read -r h; do
  [[ -z "$h" ]] && continue
  echo "  ! extra heading     $h"
  warnings=$((warnings + 1))
done < <(comm -13 "$tmp/exp.s" "$tmp/got.s")

# Order only means something for headings both files actually have
grep -Fxf "$tmp/got" "$tmp/exp" > "$tmp/exp.c" 2>/dev/null || true
grep -Fxf "$tmp/exp" "$tmp/got" > "$tmp/got.c" 2>/dev/null || true
if ! diff -q "$tmp/exp.c" "$tmp/got.c" >/dev/null 2>&1; then
  moved="$(diff "$tmp/exp.c" "$tmp/got.c" | grep -m1 '^>' | sed 's/^> //' || true)"
  echo "  ✗ out of order      ${moved:-headings do not match the scaffold order}"
  errors=$((errors + 1))
fi

# Placeholders come from the rebuilt scaffold, so this list never goes stale
grep -oE '_[^_]+_' "$EXPECTED" | sort -u > "$tmp/ph" || true
grep -noFf "$tmp/ph" "$FILE" 2>/dev/null \
  | awk -F: '!seen[$2]++ { printf "  ✗ placeholder left  %s (line %s)\n", $2, $1 }' \
  > "$tmp/hits" || true
cat "$tmp/hits"
errors=$((errors + $(wc -l < "$tmp/hits")))

vcount="$(grep -c '(verify)' "$FILE" || true)"
vcount="${vcount:-0}"
if [[ "$vcount" -gt 0 ]]; then
  echo "  ! unresolved        (verify) × $vcount"
  warnings=$((warnings + 1))
fi

echo ""
if [[ "$errors" -gt 0 ]]; then
  echo "FAIL  $errors problem(s), $warnings warning(s)"
  exit 1
fi
if [[ "$warnings" -gt 0 && "$STRICT" -eq 1 ]]; then
  echo "FAIL  $warnings warning(s) under --strict"
  exit 1
fi
if [[ "$warnings" -gt 0 ]]; then
  echo "OK    contract kept, $warnings warning(s)"
else
  echo "OK    contract kept"
fi
