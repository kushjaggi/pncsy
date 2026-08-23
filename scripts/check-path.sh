#!/usr/bin/env bash
# pncsy check — did the filled docs keep the scaffold's contract?
# Rebuilds each scaffold from its pncsy marker and diffs against it.
set -euo pipefail

ROOT="${PNCSY_HOME:-$(cd -P "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)}"

die() { echo "pncsy check: $*" >&2; exit 2; }

usage() {
  cat >&2 <<'EOF'
pncsy check [<file.md|dir> ...] [--strict] [--json]

Verifies pncsy scaffolds — learn, adr, arch, flow, constraints, bug,
handover — against the shape they were generated with:
  - every expected heading still present, in order
  - no italic placeholders left unfilled
  - no unresolved (verify) tags
  - arch and flow: warns when HEAD moved past the commit they describe

With no argument it scans the current directory for every doc carrying a
pncsy marker, so one command gates a whole repo.

  --strict   treat warnings (extra headings, verify tags, staleness) as failure
  --json     machine-readable findings for agents and CI
  -h         this help

Exit: 0 clean · 1 contract broken · 2 could not check
EOF
  exit "${1:-1}"
}

STRICT=0
JSON=0
TARGETS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage 0 ;;
    --strict) STRICT=1; shift ;;
    --json) JSON=1; shift ;;
    -*) die "unknown option: $1" ;;
    *) TARGETS+=("$1"); shift ;;
  esac
done
[[ ${#TARGETS[@]} -gt 0 ]] || TARGETS=(".")

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# A directory scan finds the docs by their marker rather than by filename, so
# renaming a doc never quietly drops it out of the CI gate.
# The first real marker: an HTML comment at line start, outside a code fence.
# Docs that merely mention the marker in prose or show it in an example are not
# generated docs, and a repo gate that flags its own README is a broken gate.
first_marker() {
  awk '
    /^[ \t]*```/ { fence = !fence; next }
    !fence && /^[ \t]*<!--[ \t]*pncsy:[a-z]+[ \t]/ { print; exit }
  ' "$1"
}

discover() {
  # Every branch must end truthy: under `pipefail` a single marker-less file
  # (any plain README) would otherwise fail the pipeline and abort the scan.
  { find "$1" -type f -name '*.md' ! -name '*.prompt.md' \
      ! -path '*/node_modules/*' ! -path '*/.git/*' 2>/dev/null || true; } \
    | while IFS= read -r f; do
        if [[ -n "$(first_marker "$f")" ]]; then printf '%s\n' "$f"; fi
      done | LC_ALL=C sort
}

: > "$tmp/files"
for t in "${TARGETS[@]}"; do
  if [[ -d "$t" ]]; then
    discover "$t" >> "$tmp/files"
  elif [[ -f "$t" ]]; then
    printf '%s\n' "$t" >> "$tmp/files"
  else
    die "no such file or directory: $t"
  fi
done
LC_ALL=C sort -u "$tmp/files" -o "$tmp/files"

if [[ ! -s "$tmp/files" ]]; then
  if [[ "$JSON" -eq 1 ]]; then
    echo '{"ok":true,"checked":0,"files":[]}'
  else
    echo "pncsy check: no pncsy docs found in ${TARGETS[*]}" >&2
  fi
  exit 0
fi

json_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e $'s/\t/\\\\t/g'
}

marker_unescape() {
  sed -e 's/%3E/>/g' -e 's/%3C/</g' -e 's/%22/"/g' -e 's/%25/%/g'
}

attr() {
  value="$(printf '%s\n' "$marker" | sed -n "s/.*$1=\"\([^\"]*\)\".*/\1/p")"
  if [[ "$marker" == *'encoding="percent"'* ]]; then
    printf '%s\n' "$value" | marker_unescape
  else
    printf '%s\n' "$value"
  fi
}

CUR=""
add() { printf '%s\t%s\t%s\n' "$1" "$2" "$3" >> "$CUR"; }

# Findings land in a TSV so one file's problems never abort the whole scan —
# a repo gate that stops at the first bad doc hides the rest of them.
check_one() {
  FILE="$1"
  CUR="$tmp/findings"
  : > "$CUR"
  KIND=""
  LABEL=""

  marker="$(first_marker "$FILE")"
  if [[ -z "$marker" ]]; then
    add fatal no-marker "no pncsy marker — the fill step must keep that line"
    return
  fi

  KIND="$(printf '%s\n' "$marker" | sed -n 's/.*pncsy:\([a-z][a-z]*\).*/\1/p')"
  if [[ -z "$KIND" ]]; then
    add fatal no-marker "marker names no kind"
    return
  fi

  local rebuild="$tmp/rebuild"
  rm -rf "$rebuild"
  mkdir -p "$rebuild"

  # Rebuild the scaffold from the marker rather than hardcoding what it should
  # contain, so the expected shape can never drift from the generator.
  if [[ "$KIND" == "learn" ]]; then
    local TOPIC LEVEL DEPTH CONFIG NODE
    TOPIC="$(attr topic)"; LEVEL="$(attr level)"; DEPTH="$(attr depth)"
    CONFIG="$(attr config)"
    if [[ -z "$TOPIC" || -z "$LEVEL" || -z "$DEPTH" ]]; then
      add fatal bad-marker "marker is missing topic/level/depth"
      return
    fi
    LABEL="$TOPIC · $LEVEL · $DEPTH"
    if [[ -n "$CONFIG" ]]; then
      if [[ ! -f "$CONFIG" ]]; then
        add fatal missing-config "custom config no longer exists: $CONFIG"
        return
      fi
      NODE="${PNCSY_NODE:-node}"
      if ! command -v "$NODE" >/dev/null 2>&1 && [[ ! -x "$NODE" ]]; then
        add fatal needs-node "custom learning paths need Node to check their config"
        return
      fi
      if ! "$NODE" "$ROOT/scripts/pncsy.mjs" learn "$TOPIC" --level "$LEVEL" --depth "$DEPTH" \
        --config "$CONFIG" -o "$rebuild" --force >/dev/null 2>&1 </dev/null; then
        add fatal rebuild-failed "could not rebuild the custom scaffold"
        return
      fi
    elif ! bash "$ROOT/scripts/learn.sh" "$TOPIC" --level "$LEVEL" --depth "$DEPTH" \
      -o "$rebuild" --force >/dev/null 2>&1 </dev/null; then
      add fatal rebuild-failed "could not rebuild the scaffold for level=$LEVEL depth=$DEPTH"
      return
    fi
  else
    local SUBJECT
    SUBJECT="$(attr subject)"
    LABEL="$KIND${SUBJECT:+ · $SUBJECT}"
    if [[ -n "$SUBJECT" ]]; then
      if ! bash "$ROOT/scripts/doc.sh" "$KIND" "$SUBJECT" -o "$rebuild" --force >/dev/null 2>&1 </dev/null; then
        add fatal rebuild-failed "could not rebuild a '$KIND' scaffold"
        return
      fi
    elif ! bash "$ROOT/scripts/doc.sh" "$KIND" -o "$rebuild" --force >/dev/null 2>&1 </dev/null; then
      add fatal rebuild-failed "could not rebuild a '$KIND' scaffold"
      return
    fi
  fi

  local EXPECTED
  EXPECTED="$(find "$rebuild" -name '*.md' ! -name '*.prompt.md' | head -1)"
  if [[ -z "$EXPECTED" ]]; then
    add fatal rebuild-failed "scaffold rebuild produced no file"
    return
  fi

  headings() { grep -E '^#{1,3} ' "$1" | sed 's/[[:space:]]*$//' || true; }
  headings "$EXPECTED" > "$tmp/exp"
  headings "$FILE" > "$tmp/got"
  LC_ALL=C sort "$tmp/exp" > "$tmp/exp.s"
  LC_ALL=C sort "$tmp/got" > "$tmp/got.s"

  while IFS= read -r h; do
    [[ -z "$h" ]] && continue
    add error missing-heading "$h"
  done < <(comm -23 "$tmp/exp.s" "$tmp/got.s")

  while IFS= read -r h; do
    [[ -z "$h" ]] && continue
    add warning extra-heading "$h"
  done < <(comm -13 "$tmp/exp.s" "$tmp/got.s")

  # Order only means something for headings both files actually have
  grep -Fxf "$tmp/got" "$tmp/exp" > "$tmp/exp.c" 2>/dev/null || true
  grep -Fxf "$tmp/exp" "$tmp/got" > "$tmp/got.c" 2>/dev/null || true
  if ! diff -q "$tmp/exp.c" "$tmp/got.c" >/dev/null 2>&1; then
    local moved
    moved="$(diff "$tmp/exp.c" "$tmp/got.c" | grep -m1 '^>' | sed 's/^> //' || true)"
    add error out-of-order "${moved:-headings do not match the scaffold order}"
  fi

  # Placeholders come from the rebuilt scaffold, so this list never goes stale
  grep -oE '_[^_]+_' "$EXPECTED" | LC_ALL=C sort -u > "$tmp/ph" || true
  grep -noFf "$tmp/ph" "$FILE" 2>/dev/null \
    | awk -F: '!seen[$2]++ { printf "error\tplaceholder\t%s (line %s)\n", $2, $1 }' \
    >> "$CUR" || true

  local vcount
  vcount="$(grep -c '(verify)' "$FILE" || true)"
  vcount="${vcount:-0}"
  [[ "$vcount" -gt 0 ]] && add warning unresolved "(verify) × $vcount"

  # A doc that describes live code is only true at the commit it was written
  # against. Shape stays valid while the content silently rots, so say so.
  if printf '%s\n' arch flow | grep -qx "$KIND"; then
    local was now behind
    was="$(attr commit)"
    now="$(git -C "$(dirname "$FILE")" rev-parse --short HEAD 2>/dev/null || true)"
    if [[ -n "$was" && "$was" != "unknown" && -n "$now" && "$was" != "$now" ]]; then
      behind="$(git -C "$(dirname "$FILE")" rev-list --count "$was..HEAD" 2>/dev/null || true)"
      add warning stale "describes $was, HEAD is $now${behind:+ (+$behind commits)}"
    fi
  fi
}

total_errors=0
total_warnings=0
total_fatal=0
files_checked=0
first=1
[[ "$JSON" -eq 1 ]] && printf '{"files":['

while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  check_one "$f"
  files_checked=$((files_checked + 1))

  errors="$(grep -c $'^error\t' "$CUR" || true)"; errors="${errors:-0}"
  warnings="$(grep -c $'^warning\t' "$CUR" || true)"; warnings="${warnings:-0}"
  fatal="$(grep -c $'^fatal\t' "$CUR" || true)"; fatal="${fatal:-0}"
  total_errors=$((total_errors + errors))
  total_warnings=$((total_warnings + warnings))
  total_fatal=$((total_fatal + fatal))

  if [[ "$JSON" -eq 1 ]]; then
    [[ "$first" -eq 1 ]] || printf ','
    first=0
    file_ok=true
    [[ "$errors" -gt 0 || "$fatal" -gt 0 ]] && file_ok=false
    [[ "$STRICT" -eq 1 && "$warnings" -gt 0 ]] && file_ok=false
    printf '{"file":"%s","kind":"%s","label":"%s","ok":%s,"findings":[' \
      "$(json_escape "$f")" "$(json_escape "$KIND")" "$(json_escape "$LABEL")" "$file_ok"
    fsep=""
    while IFS="$(printf '\t')" read -r sev type detail; do
      [[ -z "$sev" ]] && continue
      printf '%s{"severity":"%s","type":"%s","detail":"%s"}' \
        "$fsep" "$sev" "$type" "$(json_escape "$detail")"
      fsep=","
    done < "$CUR"
    printf ']}'
  else
    echo "$f${LABEL:+  ($LABEL)}"
    echo ""
    while IFS="$(printf '\t')" read -r sev type detail; do
      [[ -z "$sev" ]] && continue
      # Machine types are hyphenated; humans get prose for the same finding.
      case "$type" in
        missing-heading) label="missing heading" ;;
        extra-heading)   label="extra heading" ;;
        out-of-order)    label="out of order" ;;
        placeholder)     label="placeholder left" ;;
        *)               label="$type" ;;
      esac
      case "$sev" in
        fatal)   printf '  ? %-17s %s\n' "$label" "$detail" ;;
        error)   printf '  ✗ %-17s %s\n' "$label" "$detail" ;;
        warning) printf '  ! %-17s %s\n' "$label" "$detail" ;;
      esac
    done < "$CUR"
    echo ""
  fi
done < "$tmp/files"

status=0
[[ "$total_errors" -gt 0 ]] && status=1
[[ "$STRICT" -eq 1 && "$total_warnings" -gt 0 ]] && status=1
[[ "$total_fatal" -gt 0 ]] && status=2

if [[ "$JSON" -eq 1 ]]; then
  ok=true
  [[ "$status" -eq 0 ]] || ok=false
  printf '],"ok":%s,"checked":%d,"errors":%d,"warnings":%d,"uncheckable":%d}\n' \
    "$ok" "$files_checked" "$total_errors" "$total_warnings" "$total_fatal"
  exit "$status"
fi

summary="$files_checked file(s)"
case "$status" in
  0) if [[ "$total_warnings" -gt 0 ]]; then
       echo "OK    contract kept — $summary, $total_warnings warning(s)"
     else
       echo "OK    contract kept — $summary"
     fi ;;
  1) echo "FAIL  $total_errors problem(s), $total_warnings warning(s) — $summary" ;;
  2) echo "ERROR $total_fatal uncheckable, $total_errors problem(s) — $summary" ;;
esac
exit "$status"
