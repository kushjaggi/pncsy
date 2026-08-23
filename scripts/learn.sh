#!/usr/bin/env bash
# pncsy learn — bash-only, no Node. Default shape matches learn.mjs.
set -euo pipefail

LEVELS=(basic intermediate advanced expert)
DEPTHS=(quick standard deep)

die() { echo "pncsy learn: $*" >&2; exit 1; }

usage() {
  cat >&2 <<'EOF'
pncsy learn "<topic>" [options]

  --level <x>     basic | intermediate | advanced | expert  (default: intermediate)
  --depth <x>     quick | standard | deep  (default: standard)
  -o, --output <dir>   Output directory (default: cwd)
  --force         Overwrite existing files
  -h, --help

PDF/HTML needs Node:  pncsy node learn "<topic>" --ship
Custom config:       pncsy node learn --init-config
EOF
  exit "${1:-1}"
}

slug() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-|-$//g' | cut -c1-60
}

title_case() {
  local s="$1"
  printf '%s%s\n' "$(echo "${s:0:1}" | tr '[:lower:]' '[:upper:]')" "${s:1}"
}

contains() {
  local x="$1"; shift
  for i; do [[ "$i" == "$x" ]] && return 0; done
  return 1
}

# "${arr[*]}" joins on IFS[0] only, so ", " needs building by hand
join_comma() {
  local out="" i
  for i in "$@"; do out="${out:+$out, }$i"; done
  echo "$out"
}

level_index() {
  local i=0
  for l in "${LEVELS[@]}"; do
    [[ "$l" == "$1" ]] && { echo "$i"; return; }
    ((i++)) || true
  done
  die "bad level: $1"
}

depth_rules() {
  case "$1" in
    quick)    echo "3 2 3 8" ;;
    standard) echo "5 3 5 12" ;;
    deep)     echo "8 5 8 20" ;;
    *) die "bad depth: $1" ;;
  esac
}

# Mirrors sectionEnabled() in learn.mjs: quick vetoes, deep always wins,
# otherwise the section needs advanced or above.
wants_papers() {
  local level="$1" depth="$2"
  [[ "$depth" == "quick" ]] && return 1
  [[ "$depth" == "deep" ]] && return 0
  local idx; idx="$(level_index "$level")"
  [[ "$idx" -ge 2 ]]
}

TOPIC="" LEVEL="intermediate" DEPTH="standard" OUT="" FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage 0 ;;
    --level) LEVEL="$(echo "$2" | tr '[:upper:]' '[:lower:]')"; shift 2 ;;
    --depth) DEPTH="$(echo "$2" | tr '[:upper:]' '[:lower:]')"; shift 2 ;;
    -o|--output) OUT="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    --*) die "unknown option: $1 (custom config needs: pncsy node learn …)" ;;
    *)
      [[ -z "$TOPIC" ]] && TOPIC="$1" || TOPIC="$TOPIC $1"
      shift
      ;;
  esac
done

[[ -n "$TOPIC" ]] || usage

contains "$LEVEL" "${LEVELS[@]}" || die "bad level. Use: ${LEVELS[*]}"
contains "$DEPTH" "${DEPTHS[@]}" || die "bad depth. Use: ${DEPTHS[*]}"

read -r CONCEPTS RESOURCES TRAPS GLOSSARY <<<"$(depth_rules "$DEPTH")"

LADDER=()
idx="$(level_index "$LEVEL")"
for ((i = 0; i <= idx; i++)); do LADDER+=("${LEVELS[i]}"); done

CHIPS="Prereqs"
for l in "${LADDER[@]}"; do CHIPS+=", $(title_case "$l")"; done
CHIPS+=", Traps"

SLUG="$(slug "$TOPIC")"
DIR="${OUT:-.}"
mkdir -p "$DIR"
PATH_FILE="$DIR/${SLUG}-path.md"
PROMPT_FILE="$DIR/${SLUG}-path.prompt.md"
LEVEL_TITLE="$(title_case "$LEVEL")"
PAPERS=no
wants_papers "$LEVEL" "$DEPTH" && PAPERS=yes

DEPTH_GUIDANCE="balance explanation and links"
case "$DEPTH" in
  quick) DEPTH_GUIDANCE="shortest useful path, links over prose" ;;
  deep) DEPTH_GUIDANCE="include derivations, edge cases, and why-it-works reasoning" ;;
esac

# --- path.md ---
if [[ "$FORCE" == "1" || ! -f "$PATH_FILE" ]]; then
  {
    cat <<EOF
---
title: ${TOPIC} — Learning Path
subtitle: ${LEVEL_TITLE} track, ${DEPTH} depth
kicker: Learning Path
chips: [${CHIPS}]
format: pdf
---

<!-- pncsy:learn topic="${TOPIC}" level="${LEVEL}" depth="${DEPTH}" -->
<!-- Fill with the sibling .prompt.md file. Keep every heading and its order. -->

# ${TOPIC} — Learning Path

<!-- One paragraph: what this is, who it is for, honest time to competence. -->

_Snapshot paragraph._

## Snapshot

| Field | Value |
|-------|-------|
| Topic | ${TOPIC} |
| Target level | ${LEVEL_TITLE} |
| Depth | ${DEPTH} |
| Time to target | _fill_ |
| Assumes you know | _fill_ |

## Prerequisites

<!-- What must already be true. Add a self-check question per prerequisite. -->

| Prerequisite | Self-check |
|--------------|------------|
| _skill_ | _question that proves it_ |
EOF
    for n in "${!LADDER[@]}"; do
      lvl="${LADDER[n]}"
      lt="$(title_case "$lvl")"
      cat <<EOF

## Level $((n + 1)) — ${lt}

<!-- Goals: what the learner can do after this level. 2-4 bullets, each verifiable. -->

### Goals

- _goal_
- _goal_

<!-- Concepts: ${CONCEPTS} items. One line each: term, then why it matters. -->

### Core concepts

- **_concept_** — _why it matters_

<!-- Resources: ${RESOURCES} items. Name + author/channel + what to skip. Mark unverified links (verify). -->

### Resources

| Type | Resource | Why | Time |
|------|----------|-----|------|
| Doc | _name_ | _reason_ | _hrs_ |

### Do this

- _one hands-on task that proves the goals_
EOF
    done
    cat <<EOF

## Videos and courses

<!-- ${RESOURCES} entries. Say what to watch and what to skip. Mark unverified (verify). -->

| Resource | Creator | Watch for | Skip |
|----------|---------|-----------|------|
| _title_ | _who_ | _what_ | _what_ |
EOF
    if wants_papers "$LEVEL" "$DEPTH"; then
      cat <<'EOF'

## Research papers

<!-- Canonical papers only. Format: Title (Authors, Year) — one-line takeaway. Add (verify) if unsure. -->

| Paper | Year | Read for |
|-------|------|----------|
| _title_ | _year_ | _takeaway_ |
EOF
    fi
    cat <<EOF

## Common traps

<!-- ${TRAPS} entries. Symptom the learner sees, then the real cause. -->

| Trap | What actually breaks | Fix |
|------|----------------------|-----|
| _trap_ | _cause_ | _fix_ |

## Glossary

<!-- ${GLOSSARY} terms. Plain-language definition, no circular wording. -->

| Term | Meaning |
|------|---------|
| _term_ | _meaning_ |

## Next

- _what to learn after this path_
EOF
  } > "$PATH_FILE"
  PATH_STATE=wrote
else
  PATH_STATE=kept
fi

# --- prompt.md ---
SECTIONS="- Snapshot
- Prerequisites"
for n in "${!LADDER[@]}"; do
  SECTIONS+="
- Level $((n + 1)) — $(title_case "${LADDER[n]}")"
done
SECTIONS+="
- Videos and courses"
[[ "$PAPERS" == yes ]] && SECTIONS+="
- Research papers"
SECTIONS+="
- Common traps
- Glossary
- Next"

PAPER_RULE=""
[[ "$PAPERS" == yes ]] && PAPER_RULE="
9. Papers: title, authors, year, one-line takeaway. Classics over recent unless the field moved."

if [[ "$FORCE" == "1" || ! -f "$PROMPT_FILE" ]]; then
  cat > "$PROMPT_FILE" <<EOF
# Fill prompt — ${TOPIC} learning path

Edit this file to change the plan, then re-run the fill. Structure is fixed on purpose: same topic, same shape, every time, any model.

## Task

Fill \`${SLUG}-path.md\` in place. Keep every heading and its order. Replace italic placeholders and the example table rows. Delete the guidance comments as you go, but keep the \`pncsy:learn\` line — \`pncsy check\` needs it to verify the result.

## Parameters

| Setting | Value |
|---------|-------|
| Topic | ${TOPIC} |
| Target level | ${LEVEL} |
| Depth | ${DEPTH} |
| Levels to cover | $(join_comma "${LADDER[@]}") |
| Concepts per level | ${CONCEPTS} |
| Resources per level | ${RESOURCES} |
| Traps | ${TRAPS} |
| Glossary terms | ${GLOSSARY} |
| Research papers section | ${PAPERS} |

## Sections to fill

${SECTIONS}

## Rules

1. Ladder runs $(join_comma "${LADDER[@]}"). Each level must be usable on its own.
2. Every level goal is verifiable — the learner can prove it with a task, not a feeling.
3. Resources: canonical and well known. Give author or channel, and say what to skip.
4. Never invent a title, author, or URL. Unsure means append \`(verify)\` to that row.
5. Traps name the symptom the learner sees, then the real cause underneath.
6. Glossary definitions are plain language and non-circular.
7. Depth \`${DEPTH}\`: ${DEPTH_GUIDANCE}.
8. No filler openings, no motivational padding. Substance only.${PAPER_RULE}

## Ship it

\`\`\`bash
pncsy node "${SLUG}-path.md" --pack --open
\`\`\`
EOF
  PROMPT_STATE=wrote
else
  PROMPT_STATE=kept
fi

echo "Path   $PATH_FILE  [$PATH_STATE]" >&2
echo "Prompt $PROMPT_FILE  [$PROMPT_STATE]" >&2
echo "Config built-in (bash)" >&2
if [[ "$PATH_STATE" == kept || "$PROMPT_STATE" == kept ]]; then
  echo "Note   existing files left alone. --force to regenerate." >&2
fi
echo "Next   fill path using prompt, then: pncsy node \"$PATH_FILE\" --pack" >&2
