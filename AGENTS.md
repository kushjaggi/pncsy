# AGENTS.md — pncsy

Instructions for **any AI coding agent** (Cursor, Claude Code, Windsurf, Cline, Copilot, etc.).

## Tool

**`pncsy`** — structured learning paths + share-ready PDF/HTML from Markdown.

```bash
curl -fsSL https://raw.githubusercontent.com/kushjaggi/pncsy/main/scripts/install.sh | bash
# PDF/HTML (opt-in): pncsy setup --node && pncsy node file.md --pack
```

## When user asks

| Intent | Command |
|--------|---------|
| Learning path / roadmap / syllabus / "where do I start" | `pncsy learn "<topic>" --level intermediate --depth standard` |
| Confirm a filled path is complete | `pncsy check "<slug>-path.md"` |
| Ship md as PDF | `pncsy node "<file.md>"` |
| PDF + HTML | `pncsy node "<file.md>" --pack` |
| Custom structure | `pncsy node learn --init-config` → edit `pncsy.learn.json` |

## Learning path workflow

1. `pncsy learn "<topic>" …` → writes `<slug>-path.md` + `<slug>-path.prompt.md`
2. Read `.prompt.md`, fill `.md` in place (keep every heading; `(verify)` on uncertain links)
3. `pncsy check "<slug>-path.md"` → fix anything it reports, then re-run until clean
4. `pncsy node "<slug>-path.md" --pack --open`

Keep the `<!-- pncsy:learn … -->` line when filling. Deleting it makes step 3 impossible.

Re-running `learn` keeps existing files. `--force` only when user wants reset.

## Rules

- Never add `marked` / `puppeteer` / `mermaid` to the **user's project** — they ship with `pncsy`
- Report output paths briefly after runs
- User edits to `.prompt.md` outrank defaults — re-fill from edited prompt

## Install skill in your editor

See [skill/INSTALL.md](skill/INSTALL.md) for Cursor, Claude Code, Windsurf, Cline, and generic setup.
