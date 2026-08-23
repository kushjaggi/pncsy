#!/usr/bin/env bash
# pncsy check — did the filled path keep the scaffold's contract?
# Rebuilds the scaffold from the pncsy:learn marker and diffs against it.
set -euo pipefail

ROOT="${PNCSY_HOME:-$(cd -P "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)}"

die() { echo "pncsy check: $*" >&2; exit 2; }

usage() {
  cat >&2 <<'EOF'
pncsy check <file.md> [--strict]

Verifies any pncsy scaffold — learn, adr, arch, flow, constraints, bug,
handover — against the shape it was generated with:
  - every expected heading still present, in order
  - no italic placeholders left unfilled
  - no unresolved (verify) tags
  - arch and flow: warns when HEAD moved past the commit they describe

  --strict   treat warnings (extra headings, verify tags, staleness) as failure
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

marker="$(grep -m1 'pncsy:[a-z]' "$FILE" || true)"
[[ -n "$marker" ]] || die "no pncsy marker in $FILE
  The fill step must keep that line. Without it there is no contract to check against."

KIND="$(printf '%s\n' "$marker" | sed -n 's/.*pncsy:\([a-z][a-z]*\).*/\1/p')"
[[ -n "$KIND" ]] || die "marker names no kind"

attr() { printf '%s\n' "$marker" | sed -n "s/.*$1=\"\([^\"]*\)\".*/\1/p"; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Rebuild the scaffold from the marker rather than hardcoding what it should
# contain, so the expected shape can never drift from the generator.
if [[ "$KIND" == "learn" ]]; then
  TOPIC="$(attr topic)"; LEVEL="$(attr level)"; DEPTH="$(attr depth)"
  [[ -n "$TOPIC" && -n "$LEVEL" && -n "$DEPTH" ]] || die "marker is missing topic/level/depth"
  LABEL="$TOPIC · $LEVEL · $DEPTH"
  bash "$ROOT/scripts/learn.sh" "$TOPIC" --level "$LEVEL" --depth "$DEPTH" -o "$tmp" --force >/dev/null 2>&1 \
    || die "could not rebuild the scaffold for level=$LEVEL depth=$DEPTH"
else
  SUBJECT="$(attr subject)"
  LABEL="$KIND${SUBJECT:+ · $SUBJECT}"
  if [[ -n "$SUBJECT" ]]; then
    bash "$ROOT/scripts/doc.sh" "$KIND" "$SUBJECT" -o "$tmp" --force >/dev/null 2>&1 \
      || die "could not rebuild a '$KIND' scaffold"
  else
    bash "$ROOT/scripts/doc.sh" "$KIND" -o "$tmp" --force >/dev/null 2>&1 \
      || die "could not rebuild a '$KIND' scaffold"
  fi
fi

EXPECTED="$(find "$tmp" -name '*.md' ! -name '*.prompt.md' | head -1)"
[[ -n "$EXPECTED" ]] || die "scaffold rebuild produced no file"

headings() { grep -E '^#{2,3} ' "$1" | sed 's/[[:space:]]*$//' || true; }
headings "$EXPECTED" > "$tmp/exp"
headings "$FILE" > "$tmp/got"
sort "$tmp/exp" > "$tmp/exp.s"
sort "$tmp/got" > "$tmp/got.s"

errors=0
warnings=0
echo "$FILE  ($LABEL)"
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

# A doc that describes live code is only true at the commit it was written
# against. Shape stays valid while the content silently rots, so say so.
if printf '%s\n' arch flow | grep -qx "$KIND"; then
  was="$(attr commit)"
  now="$(git -C "$(dirname "$FILE")" rev-parse --short HEAD 2>/dev/null || true)"
  if [[ -n "$was" && "$was" != "unknown" && -n "$now" && "$was" != "$now" ]]; then
    behind="$(git -C "$(dirname "$FILE")" rev-list --count "$was..HEAD" 2>/dev/null || true)"
    echo "  ! stale             describes $was, HEAD is $now${behind:+ (+$behind commits)}"
    warnings=$((warnings + 1))
  fi
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
