# AGENTS.md — pncsy

Instructions for **any AI coding agent** (Cursor, Claude Code, Windsurf, Cline, Copilot, etc.).

## Tool

**`pncsy`** — structured learning paths + share-ready PDF/HTML from Markdown.

```bash
curl -fsSL https://raw.githubusercontent.com/kushjaggi/prompting-nahi-coding-sikho-yojna/main/scripts/install.sh | bash
# or: npm install -g pncsy    # or: npx pncsy …
```

## When user asks

| Intent | Command |
|--------|---------|
| Learning path / roadmap / syllabus / "where do I start" | `pncsy learn "<topic>" --level intermediate --depth standard` |
| Ship md as PDF | `pncsy "<file.md>"` |
| PDF + HTML | `pncsy "<file.md>" --pack` |
| Custom structure | `pncsy learn --init-config` → edit `pncsy.learn.json` |

## Learning path workflow

1. `pncsy learn "<topic>" …` → writes `<slug>-path.md` + `<slug>-path.prompt.md`
2. Read `.prompt.md`, fill `.md` in place (keep every heading; `(verify)` on uncertain links)
3. `pncsy "<slug>-path.md" --pack --open`

Re-running `learn` keeps existing files. `--force` only when user wants reset.

## Rules

- Never add `marked` / `puppeteer` / `mermaid` to the **user's project** — they ship with `pncsy`
- Report output paths briefly after runs
- User edits to `.prompt.md` outrank defaults — re-fill from edited prompt

## Install skill in your editor

See [skill/INSTALL.md](skill/INSTALL.md) for Cursor, Claude Code, Windsurf, Cline, and generic setup.
