# AGENTS.md — pncsy

Instructions for **any AI coding agent** (Cursor, Claude Code, Windsurf, Cline, Copilot, etc.).

## Tool

**`pncsy`** — checkable learning and engineering records, plus share-ready PDF/HTML from Markdown.

```bash
curl -fsSL https://raw.githubusercontent.com/kushjaggi/pncsy/main/scripts/install.sh | bash
# PDF/HTML (opt-in): pncsy setup --node && pncsy node file.md --pack
```

## When user asks

| Intent | Command |
|--------|---------|
| Learning path / roadmap / syllabus / "where do I start" | `pncsy learn "<topic>" --level intermediate --depth standard` |
| Confirm a filled path is complete | `pncsy check "<file.md>"` |
| Record why a choice was made | `pncsy adr "<decision>"` |
| Map a system / trace a code path | `pncsy arch "<system>"` · `pncsy flow "<path>"` |
| Write down what agents must not touch | `pncsy constraints` |
| Log a bug start to finish | `pncsy bug "<symptom>"` |
| Hand off at end of session | `pncsy handover` |
| Ship md as PDF | `pncsy node "<file.md>"` |
| PDF + HTML | `pncsy node "<file.md>" --pack` |
| Custom structure | `pncsy node learn --init-config` → edit `pncsy.learn.json` |

## When to offer a record without being asked

Do not interrupt for small edits. Stop and propose one of these when the work
has produced reasoning that will be invisible in the diff:

| You are about to… | Offer | Because the diff will not show |
|---|---|---|
| Add a dependency, pick between libraries, or introduce a new pattern | `pncsy adr` | what else was on the table and why it lost |
| Fix a bug in a shared function | `pncsy bug` | the other callers you checked, and how |
| Finish tracing a code path the user asked about | `pncsy flow` | the hops, and which ones you could not confirm |
| Discover a rule the hard way (a path that must not be touched, an ordering that must hold) | `pncsy constraints` | that the rule exists at all |
| End a session with work in flight | `pncsy handover` | how far you got and the single next step |

Ask once, in one line. If the user declines, leave a code comment with the
reason and move on — do not ask again for the same decision.

## Scaffold → fill → check → ship

1. Choose the matching learning or project-record command → it writes `.md` + `.prompt.md`
2. Read `.prompt.md`, fill `.md` in place (keep every heading; `(verify)` on uncertain links)
3. `pncsy check "<file.md>" --strict` → fix anything it reports, then re-run until clean
4. When sharing is needed, `pncsy node "<file.md>" --pack --open`

Keep the `<!-- pncsy:learn … -->` line when filling. Deleting it makes step 3 impossible.

## Project docs

`adr` · `arch` · `flow` · `constraints` · `bug` · `handover` — same loop: scaffold → fill from `.prompt.md` → `pncsy check`. Keep the `<!-- pncsy:<kind> … -->` line.

- Never invent a path, function, or line number you have not read. Tag unconfirmed claims `(verify)`.
- Never delete a heading you had nothing for — say what is missing and why.
- `arch` and `flow` stamp the commit they describe; `check` warns once HEAD moves past it. Regenerate rather than patching a stale trace.

## Checking your own work

`pncsy check` with no argument scans the whole repo, so verify everything at once
rather than a file at a time:

```bash
pncsy check --json     # every pncsy doc; {"ok":…, "files":[{"findings":[…]}]}
```

Read the `findings` array and fix each `detail`, then re-run until `ok` is true.
Exit `0` clean, `1` contract broken, `2` uncheckable. Severity `error` fails the
run; `warning` only fails under `--strict`.

Re-running `learn` keeps existing files. `--force` only when user wants reset.

## Rules

- Never add `marked` / `puppeteer` / `mermaid` to the **user's project** — they ship with `pncsy`
- Report output paths briefly after runs
- User edits to `.prompt.md` outrank defaults — re-fill from edited prompt
- For repo-aware docs: set `repo_base` in frontmatter so `` `src/path.py` `` ships as clickable PDF links

## Install skill in your editor

See [skill/INSTALL.md](skill/INSTALL.md) for Cursor, Claude Code, Windsurf, Cline, and generic setup.
