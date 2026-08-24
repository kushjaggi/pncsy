#!/usr/bin/env bash
# pncsy setup --skill — put pncsy's skill in every agent already on this machine.
# Detects, never creates a vendor directory, never overwrites a hand-written skill.
set -euo pipefail

ROOT="${PNCSY_HOME:-$(cd -P "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)}"

die() { echo "pncsy skill: $*" >&2; exit 1; }

usage() {
  cat >&2 <<'EOF'
pncsy setup --skill [--here] [--copy] [--dry-run] [--remove]

Installs pncsy's skill into the agent directories that already exist,
through the shared store at ~/.agents/skills.

  --here      this repository instead of the home directory (copies)
  --copy      copy instead of symlink (sandboxes, Windows without dev mode)
  --dry-run   print the plan, write nothing
  --remove    delete only what pncsy installed

Config (all fields optional): ./pncsy.skill.json, else ~/.config/pncsy/skill.json
  {"agents":["*"],"exclude":[],"mode":"symlink","extraSkills":[]}

extraSkills are local folders you already have — pncsy links them alongside
its own. It never fetches or versions them; use `npx skills add` for that.
EOF
  exit "${1:-1}"
}

HERE=0
DRY=0
REMOVE=0
STATUS=0
MODE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage 0 ;;
    --here) HERE=1; shift ;;
    --copy) MODE="copy"; shift ;;
    --dry-run) DRY=1; shift ;;
    --remove) REMOVE=1; shift ;;
    --status) STATUS=1; shift ;;
    *) die "unknown option: $1 (use --here, --copy, --dry-run, --remove)" ;;
  esac
done

if [[ $HERE -eq 1 ]]; then
  BASE="$PWD"
  # A symlink into ~/.local/share committed to git is broken for everyone else.
  [[ -n "$MODE" ]] || MODE="copy"
else
  BASE="$HOME"
fi
STORE="$BASE/.agents/skills"

# --- config -----------------------------------------------------------------

CONFIG=""
for candidate in "$PWD/pncsy.skill.json" "$HOME/.config/pncsy/skill.json"; do
  [[ -f "$candidate" ]] && { CONFIG="$candidate"; break; }
done

# ponytail: naive JSON reader — breaks on quotes or commas inside a value, and
# reads the last match of a key. Upgrade path: parse with node when it exists.
cfg_get() {
  local raw
  [[ -n "$CONFIG" ]] || return 0
  raw="$(tr -d '\n' < "$CONFIG" | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*//p")"
  case "$raw" in
    '['*) raw="${raw#\[}"; raw="${raw%%]*}" ;;
    '"'*) raw="${raw#\"}"; printf '%s\n' "${raw%%\"*}"; return 0 ;;
    *) return 0 ;;
  esac
  printf '%s' "$raw" \
    | tr ',' '\n' \
    | sed -e 's/^[[:space:]]*"*//' -e 's/"*[[:space:]]*$//' \
    | grep -v '^$' || true
}

CFG_MODE="$(cfg_get mode)"
[[ -n "$MODE" ]] || MODE="${CFG_MODE:-symlink}"
[[ "$MODE" == symlink || "$MODE" == copy ]] || die "mode must be symlink or copy (got: $MODE)"

# Arrays, not a space-joined string: unquoted word-splitting would also glob,
# and the documented default "agents":["*"] would expand to the working
# directory's file names and quietly match nothing.
WANTED=()
EXCLUDED=()
while IFS= read -r line; do WANTED[${#WANTED[@]}]="$line"; done < <(cfg_get agents)
while IFS= read -r line; do EXCLUDED[${#EXCLUDED[@]}]="$line"; done < <(cfg_get exclude)

# --- helpers ----------------------------------------------------------------

pretty() { case "$1" in "$HOME"/*) printf '~%s\n' "${1#$HOME}" ;; *) printf '%s\n' "$1" ;; esac; }

abs_of() { printf '%s/%s\n' "$(cd -P "$(dirname "$1")" 2>/dev/null && pwd)" "$(basename "$1")"; }

# Ownership is proved, not recorded: a link is ours only if it resolves where we
# put it, and a copy only if its SKILL.md is still byte-identical to the source.
owned() {
  local p="$1" expect="$2" src="$3" target
  if [[ -L "$p" ]]; then
    target="$(readlink "$p")"
    [[ "$target" = /* ]] || target="$(dirname "$p")/$target"
    [[ "$(abs_of "$target")" == "$expect" ]]
    return
  fi
  [[ -d "$p" ]] || return 1
  cmp -s "$p/SKILL.md" "$src/SKILL.md"
}

# Skip anything another tool owns. A manifest or lock file in the directory is
# the general marker; the two named paths are Cursor's, confirmed re-fetched.
managed() {
  case "$1" in *"/plugins/cache/"*|*"/skills-cursor"*) return 0 ;; esac
  ls "$1"/*manifest*.json "$1"/*lock*.json >/dev/null 2>&1
}

selected() {
  local label="$1" i=0
  while [[ $i -lt ${#EXCLUDED[@]} ]]; do
    [[ "$label" == "${EXCLUDED[$i]}" || "$label" == "${EXCLUDED[$i]}"/* ]] && return 1
    i=$((i + 1))
  done
  [[ ${#WANTED[@]} -gt 0 ]] || return 0
  i=0
  while [[ $i -lt ${#WANTED[@]} ]]; do
    [[ "${WANTED[$i]}" == "*" || "$label" == "${WANTED[$i]}" || "$label" == "${WANTED[$i]}"/* ]] && return 0
    i=$((i + 1))
  done
  return 1
}

# Every agent skills directory that already exists, one or two levels deep.
agent_dirs() {
  local dir
  for dir in "$BASE"/.*/skills "$BASE"/.*/*/skills; do
    [[ -d "$dir" ]] || continue
    # ".*" also matches "." and "..", which would walk out of BASE
    case "$dir" in *"/./"*|*"/../"*) continue ;; esac
    [[ "$dir" == "$STORE" ]] && continue
    printf '%s\n' "$dir"
  done
}

label_of() { local rel="${1#$BASE/}"; rel="${rel%/skills}"; printf '%s\n' "${rel#.}"; }

# One ".." per component between BASE and the agent directory.
rel_to_store() {
  local rel="${1#$BASE/}" up="" part
  local IFS=/
  for part in $rel; do up="../$up"; done
  printf '%s\n' "${up}.agents/skills"
}

LINKED=0
SKIPPED=0
REMOVED=0

place() { # $1 target, $2 link text (empty = copy), $3 source
  [[ $DRY -eq 1 ]] && return 0
  rm -rf "$1"
  if [[ -n "$2" ]] && ln -sfn "$2" "$1" 2>/dev/null; then return 0; fi
  [[ -n "$2" ]] && echo "  ! symlink failed, copying: $(pretty "$1")" >&2
  mkdir -p "$1"
  cp -R "$3/." "$1/"
}

# --- status -----------------------------------------------------------------

if [[ $STATUS -eq 1 ]]; then
  total=0
  have=0
  while IFS= read -r dir; do
    [[ -n "$dir" ]] || continue
    managed "$dir" && continue
    total=$((total + 1))
    [[ -e "$dir/pncsy" || -L "$dir/pncsy" ]] && have=$((have + 1))
  done < <(agent_dirs)
  [[ $total -eq 0 ]] && exit 0
  if [[ $have -eq $total ]]; then
    echo "  skill:        $have of $total detected agents"
  else
    echo "  skill:        $have of $total detected agents — run: pncsy setup --skill"
  fi
  exit 0
fi

# --- run --------------------------------------------------------------------

if [[ $REMOVE -eq 1 ]]; then
  echo "pncsy skill — removing from $(pretty "$BASE")"
else
  echo "pncsy skill → $(pretty "$BASE")  ($MODE)"
fi

# --- sources ----------------------------------------------------------------

# extraSkills are a trust boundary: a bad entry is reported and skipped, never
# fatal, so one stale path in a config cannot block pncsy's own skill.
NAMES=()
SRCS=()
add_source() {
  local src="$1"
  [[ -d "$src" ]] || { echo "  ! skip  $src (not a directory)"; return 0; }
  [[ -f "$src/SKILL.md" ]] || { echo "  ! skip  $src (no SKILL.md)"; return 0; }
  NAMES[${#NAMES[@]}]="$(basename "$src")"
  SRCS[${#SRCS[@]}]="$(cd -P "$src" && pwd)"
}

[[ -d "$ROOT/skill" ]] || die "no skill folder at $ROOT/skill"
NAMES[0]="pncsy"
SRCS[0]="$(cd -P "$ROOT/skill" && pwd)"
while IFS= read -r extra; do
  [[ -n "$extra" ]] || continue
  case "$extra" in "~/"*) extra="$HOME/${extra#\~/}" ;; esac
  add_source "$extra"
done < <(cfg_get extraSkills)

# --- run --------------------------------------------------------------------

i=0
while [[ $i -lt ${#NAMES[@]} ]]; do
  name="${NAMES[$i]}"
  src="${SRCS[$i]}"
  i=$((i + 1))
  store_entry="$STORE/$name"

  if [[ $REMOVE -eq 0 ]]; then
    if [[ -e "$store_entry" || -L "$store_entry" ]] && ! owned "$store_entry" "$src" "$src"; then
      echo "  ~ skip  $(pretty "$store_entry") (not installed by pncsy)"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi
    echo "  + store $(pretty "$store_entry")"
    [[ $DRY -eq 1 ]] || mkdir -p "$STORE"
    if [[ "$MODE" == copy ]]; then place "$store_entry" "" "$src"; else place "$store_entry" "$src" "$src"; fi
  fi
  if [[ -d "$STORE" ]]; then
    store_real="$(cd -P "$STORE" && pwd)"
  else
    store_real="$STORE"
  fi

  while IFS= read -r dir; do
    [[ -n "$dir" ]] || continue
    label="$(label_of "$dir")"
    selected "$label" || continue
    if managed "$dir"; then
      [[ $REMOVE -eq 1 ]] || echo "  ! skip  $(pretty "$dir") (managed by another tool)"
      continue
    fi
    target="$dir/$name"
    link=""
    [[ "$MODE" == copy ]] || link="$(rel_to_store "$dir")/$name"

    # A user who wrote their own skill here outranks the installer.
    if [[ -e "$target" || -L "$target" ]] && ! owned "$target" "$store_real/$name" "$src"; then
      echo "  ~ skip  $(pretty "$target") (hand-written)"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi

    if [[ $REMOVE -eq 1 ]]; then
      [[ -e "$target" || -L "$target" ]] || continue
      echo "  - rm    $(pretty "$target")"
      [[ $DRY -eq 1 ]] || rm -rf "$target"
      REMOVED=$((REMOVED + 1))
      continue
    fi

    if [[ -n "$link" ]]; then echo "  + link  $(pretty "$target")"; else echo "  + copy  $(pretty "$target")"; fi
    place "$target" "$link" "$src"
    LINKED=$((LINKED + 1))
  done < <(agent_dirs)

  if [[ $REMOVE -eq 1 && ( -e "$store_entry" || -L "$store_entry" ) ]]; then
    if owned "$store_entry" "$src" "$src"; then
      echo "  - rm    $(pretty "$store_entry")"
      [[ $DRY -eq 1 ]] || rm -rf "$store_entry"
      REMOVED=$((REMOVED + 1))
    else
      echo "  ~ skip  $(pretty "$store_entry") (not installed by pncsy)"
      SKIPPED=$((SKIPPED + 1))
    fi
  fi
done

if [[ $HERE -eq 1 && $REMOVE -eq 0 && ! -f "$BASE/AGENTS.md" ]]; then
  echo "  · no AGENTS.md here — most agents read it: cp $(pretty "$ROOT/AGENTS.md") ./AGENTS.md"
fi

if [[ $REMOVE -eq 1 ]]; then
  echo "✓ removed $REMOVED · skipped $SKIPPED"
else
  echo "✓ installed in $LINKED · skipped $SKIPPED"
fi
[[ $DRY -eq 1 ]] && echo "  (dry run — nothing written)"
exit 0
