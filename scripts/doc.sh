#!/usr/bin/env bash
# pncsy doc kinds — bash-only, no Node. Same scaffold/fill/check contract as learn.
# Six heredocs beat a mini template language: each doc gets the shape it needs
# and nothing here has to parse a delimiter.
set -euo pipefail

KINDS="adr arch flow constraints bug handover"
# Only these describe live code, so only these can go stale when HEAD moves.
TRACKS_CODE="arch flow"

die() { echo "pncsy: $*" >&2; exit 1; }

usage() {
  cat >&2 <<'EOF'
pncsy <kind> ["<subject>"] [options]

  adr          decision record — what was chosen, and what lost
  arch         system map — components, boundaries, invariants
  flow         execution trace — entry point to exit, step by step
  constraints  what must never change, and what needs a human
  bug          symptom → root cause → blast radius → proof
  handover     session handoff — done, in flight, single next step

  -o, --output <dir>   Output directory (default: cwd)
  --force              Overwrite existing files
  -h, --help

Fill it with your agent, then verify:  pncsy check <file>
EOF
  exit "${1:-1}"
}

slug() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-|-$//g' | cut -c1-60
}

contains() {
  local x="$1"; shift
  for i; do [[ "$i" == "$x" ]] && return 0; done
  return 1
}

write_file() {
  local file="$1" force="$2"
  if [[ "$force" != "1" && -f "$file" ]]; then
    echo "kept"
    return 0
  fi
  cat > "$file"
  echo "wrote"
}

KIND="${1:-}"
[[ -n "$KIND" ]] || usage
[[ "$KIND" == "-h" || "$KIND" == "--help" ]] && usage 0
contains "$KIND" $KINDS || die "unknown kind: $KIND (have: $KINDS)"
shift

SUBJECT="" OUT="" FORCE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage 0 ;;
    -o|--output) OUT="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    -*) die "unknown option: $1" ;;
    *) SUBJECT="${SUBJECT:+$SUBJECT }$1"; shift ;;
  esac
done

DIR="${OUT:-.}"
mkdir -p "$DIR"

if [[ -n "$SUBJECT" ]]; then
  BASE="$(slug "$SUBJECT")-$KIND"
else
  BASE="$KIND"
fi
FILE="$DIR/${BASE}.md"
PROMPT_FILE="$DIR/${BASE}.prompt.md"

# Read HEAD where the doc will live, not where the command was typed — check
# resolves it the same way, and the two must agree.
COMMIT="$(git -C "$DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"
TODAY="$(date +%Y-%m-%d)"

case "$KIND" in
  adr)         LABEL="ADR";          KICKER="Decision Record" ;;
  arch)        LABEL="Architecture"; KICKER="Architecture" ;;
  flow)        LABEL="Flow";         KICKER="Execution Flow" ;;
  constraints) LABEL="Constraints";  KICKER="Constraints" ;;
  bug)         LABEL="Bug";          KICKER="Bug Record" ;;
  handover)    LABEL="Handover";     KICKER="Handover" ;;
esac
HEADING="${LABEL}${SUBJECT:+: $SUBJECT}"

# --- bodies -------------------------------------------------------------

body_adr() {
  cat <<EOF
<!-- Status is proposed until a human accepts it. Supersede with a new ADR;
     never rewrite an accepted one. The history is the point. -->

| Field | Value |
|-------|-------|
| Status | _proposed / accepted / superseded by_ |
| Date | ${TODAY} |
| Deciders | _who agreed_ |

## Context

<!-- What forced a decision NOW — the constraint, the deadline, the thing that
     broke. Not a background essay. -->

_what made this a decision instead of a default_

## Decision

<!-- State it as "We will ...". One paragraph. No hedging. -->

_we will_

## Alternatives rejected

<!-- This is the section that makes the doc worth writing. One row per option
     that was really on the table. If you cannot name a rejected alternative,
     you did not make a decision — you had no choice. Say that instead. -->

| Alternative | Why it lost |
|-------------|-------------|
| _option_ | _the reason, not "worse"_ |

## Consequences

<!-- Both directions. A decision with no downside was not a decision. -->

**Gets easier:** _what this unlocks_

**Gets harder:** _what this costs, and who pays it_

## Revisit when

<!-- The trigger that reopens this. "Never" is a valid answer — write it down. -->

_the signal that would make this decision wrong_
EOF
}

body_arch() {
  cat <<EOF
## Purpose

<!-- One sentence. What this system is for, not how it works. -->

_what it is for_

## Components

| Component | Responsibility | Lives in |
|-----------|----------------|----------|
| _name_ | _one job, stated in one line_ | _path_ |

## How a request moves

<!-- Entry to exit. Numbered. Name real files. -->

1. _step_

## Boundaries

<!-- What is deliberately NOT here, and who owns it instead. A system map
     without edges is a wish. -->

_out of scope, and where it lives instead_

## Invariants

<!-- Break one of these and the system is wrong, not merely different. -->

- _what must stay true_

## Known weak points

<!-- Write these down while they are still choices. -->

| Weak point | What it costs | Upgrade path |
|------------|---------------|--------------|
| _what_ | _when it bites_ | _the fix, if it comes to that_ |
EOF
}

body_flow() {
  cat <<EOF
## Entry point

<!-- The one file:function where this starts. -->

_file:function_

## Trace

<!-- One row per hop. Only rows you have actually read — a confident wrong
     trace is worse than no trace. -->

| # | Where | What happens |
|---|-------|--------------|
| 1 | _file:function_ | _what it does_ |

## Branch points

| Condition | Then | Else |
|-----------|------|------|
| _the test_ | _path taken_ | _path taken_ |

## Where state lives

<!-- What gets mutated, and where it is read back. Most flow bugs are here. -->

_the state, and its owner_

## Failure modes

| When this fails | Caller sees | Recovery |
|-----------------|-------------|----------|
| _step_ | _the symptom_ | _what happens next_ |
EOF
}

body_constraints() {
  cat <<EOF
<!-- Agents load AGENTS.md and .cursor/rules on their own; this file does not
     load itself. Link it from there, or paste "Never touch" straight in. -->

## Never touch

| Path | Why |
|------|-----|
| _path_ | _what breaks, concretely_ |

## Always true

<!-- Invariants every change must preserve. -->

- _what must survive every edit_

## Needs a human

<!-- Change classes that must never be auto-approved. -->

- _the change class, and the reason_

## Dependencies

<!-- What may be added, what may never be, and who decides. -->

_the policy_

## Landmines

| Looks safe | Actually |
|------------|----------|
| _the tempting change_ | _why it bites_ |
EOF
}

body_bug() {
  cat <<EOF
| Field | Value |
|-------|-------|
| Status | _open / fixed / wontfix_ |
| Found | ${TODAY} |
| Costs while open | _who is blocked, how badly_ |

## Symptom

<!-- What was observed. Exact error text. Not your theory yet. -->

_observed behaviour_

## Reproduction

1. _step_

**Expected:** _what should happen_
**Actual:** _what happens_

## Root cause

<!-- The shared function, not the caller that happened to report it. If you
     cannot name a file and a line, you are still describing the symptom. -->

_why it actually happens_

## Blast radius

<!-- Every other caller of the thing you fixed. This is where "fixed" goes
     wrong: one guard at the reporting call site leaves the siblings broken. -->

| Caller | Affected | How you checked |
|--------|----------|-----------------|
| _path_ | _yes / no_ | _the search you ran_ |

## Fix

_what changed, and why there rather than at the call site_

## Proof

<!-- The check that fails without the fix. Name it so someone can run it. -->

_test or command_

## Prevention

_what stops the next one of these_
EOF
}

body_handover() {
  cat <<EOF
| Field | Value |
|-------|-------|
| Date | ${TODAY} |
| Branch | _name_ |
| Agent / model | _which one made these calls_ |

## Done

<!-- What landed, and how you know it landed. -->

- _what shipped, and the proof_

## In flight

<!-- Half-finished work. Be specific about the state it is in — "started X"
     tells the next session nothing. -->

- _what is started, and exactly how far_

## Next step

<!-- Exactly one. The next action someone should take, not a wishlist. -->

_the single next action_

## Open questions

| Question | Blocks | Who can answer |
|----------|--------|----------------|
| _the question_ | _what it blocks_ | _who_ |

## Landmines

<!-- What you learned the hard way, so the next session does not pay twice. -->

- _what wasted time, and the shortcut past it_

## Verify where I left off

<!-- A command whose output shows current state. -->

_command_
EOF
}

# --- per-kind fill rules ------------------------------------------------

rules_for() {
  case "$1" in
    adr) cat <<'EOF'
- Name at least one rejected alternative with a real reason. "It was worse" is not a reason.
- Consequences must include something that got harder. If nothing did, you are describing a default, not a decision.
- Do not edit an accepted ADR later. Write a new one and mark this superseded.
EOF
      ;;
    arch) cat <<'EOF'
- Only list components you have actually opened. Do not infer a module from its name.
- Boundaries matter as much as contents: say what this system does not own.
- Every path in the table must exist. Check before writing it.
EOF
      ;;
    flow) cat <<'EOF'
- Every row in the trace must come from a file you read in this session.
- If you cannot follow a hop, write the row and tag it `(verify)` — do not guess the callee.
- Prefer fewer, correct rows over a complete-looking trace that is partly invented.
EOF
      ;;
    constraints) cat <<'EOF'
- Every "never touch" needs a concrete consequence. A rule without a reason gets ignored.
- Only write constraints you can point at evidence for — this file becomes law for future agents.
- Link this file from AGENTS.md or .cursor/rules, or nothing will read it.
EOF
      ;;
    bug) cat <<'EOF'
- Root cause names a file and a line. Anything vaguer is still the symptom.
- Fill blast radius by actually searching for other callers, and record the search you ran.
- Proof is a command someone else can run. "Tested manually" is not proof.
EOF
      ;;
    handover) cat <<'EOF'
- Exactly one next step. If you list five, the next session picks wrong.
- "In flight" must say how far, not just what. Name the file and the state it is in.
- Landmines are the highest-value section — write what cost you time.
EOF
      ;;
  esac
}

# --- write --------------------------------------------------------------

STATE_DOC="$(
  {
    cat <<EOF
---
title: ${HEADING}
kicker: ${KICKER}
format: pdf
---

<!-- pncsy:${KIND} subject="${SUBJECT}" commit="${COMMIT}" -->
<!-- Fill with the sibling .prompt.md file. Keep every heading and its order. -->

# ${HEADING}

EOF
    "body_${KIND}"
  } | write_file "$FILE" "$FORCE"
)"

STATE_PROMPT="$(
  {
    cat <<EOF
# Fill: ${BASE}.md

| Field | Value |
|-------|-------|
| Kind | ${KIND} |
| Subject | ${SUBJECT:-(none)} |
| Scaffold | \`${BASE}.md\` |

## How

Fill \`${BASE}.md\` in place. Keep every heading and its order. Replace italic placeholders and the example table rows. Delete the guidance comments as you go, but keep the \`pncsy:${KIND}\` line — \`pncsy check\` needs it to verify the result.

## Rules for a ${KIND}

EOF
    rules_for "$KIND"
    cat <<EOF

## Never

- Never invent a file path, function name, or line number you have not read.
- Never state a fact you cannot point at. Tag anything unconfirmed \`(verify)\`.
- Never delete a heading because you had nothing to put under it. Say what is missing and why.

## Then

\`\`\`bash
pncsy check "${BASE}.md"
\`\`\`

Fix what it reports and re-run until clean. Unresolved \`(verify)\` tags are a warning; \`--strict\` makes them a failure.
EOF
  } | write_file "$PROMPT_FILE" "$FORCE"
)"

echo "Doc    $FILE  [$STATE_DOC]" >&2
echo "Prompt $PROMPT_FILE  [$STATE_PROMPT]" >&2
if contains "$KIND" $TRACKS_CODE; then
  echo "Note   describes code at ${COMMIT} — pncsy check warns when HEAD moves past it" >&2
fi
echo "Next   fill the doc using the prompt, then: pncsy check \"$FILE\"" >&2
