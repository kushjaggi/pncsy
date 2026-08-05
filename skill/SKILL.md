---
name: pncsy
description: >-
  Generate structured learning paths (fixed levels, prerequisites, videos,
  papers, traps, glossary) and ship Markdown as share-ready PDF/HTML with cover,
  auto TOC and Mermaid. Works in any AI coding editor (Cursor, Claude Code,
  Windsurf, Cline, Copilot, etc.). Use when the user wants a learning path,
  roadmap, syllabus, study plan, or says pncsy, ship this md, export markdown
  to PDF/HTML. Never add marked/puppeteer/mermaid to the user's project.
---

# pncsy

**prompting-nahi-coding-sikho-yojna** — short command: `pncsy`.

Editor-agnostic. Same workflow in Cursor, Claude Code, Windsurf, Cline, Copilot, or any agent with shell access.

Install: `curl -fsSL https://raw.githubusercontent.com/kushjaggi/pncsy/main/scripts/install.sh | bash` · Editor setup: [INSTALL.md](INSTALL.md) · Repo rules: [AGENTS.md](../AGENTS.md)

## Two tiers — pick the right one

| Command | Needs Node |
|---------|------------|
| `pncsy learn "<topic>"` | No — pure bash, always works |
| `pncsy node <file.md>` | Yes — PDF, HTML, Mermaid |
| `pncsy node learn --init-config` | Yes — custom config |

Plain `pncsy file.md` is **not** valid. Shipping always goes through `pncsy node`.

If `pncsy node …` reports missing deps, run `pncsy setup --node` once, then retry.

## Run

```bash
pncsy learn "<topic>" --level advanced --depth deep
pncsy node "/absolute/path/to/file.md"
pncsy node "/absolute/path/to/file.md" --pack --open
```

## Agent workflow

1. Absolute path to `.md` (or dir).
2. Pick format: PDF default; `--html` or `--pack` if asked.
3. Run `pncsy node …`. Deps ship with the tool — **never** `npm install marked/puppeteer/mermaid` in the user's project.
4. Report output path(s). Use `--json` when parsing needed.

## Formats

| Ask | Flag |
|-----|------|
| PDF | (default) or `--pdf` |
| HTML | `--html` |
| Both | `--pack` |

## Learning paths

User wants roadmap, syllabus, study plan, or "where do I start":

```bash
pncsy learn "<topic>" --level basic|intermediate|advanced|expert --depth quick|standard|deep
```

Writes `<slug>-path.md` (scaffold) + `<slug>-path.prompt.md` (fill prompt).

1. Read `.prompt.md` — parameters and rules for this run.
2. Fill `<slug>-path.md` in place. Keep every heading. `(verify)` on uncertain links.
3. `pncsy node "<slug>-path.md" --pack --open`.

Config: `pncsy node learn --init-config` → `pncsy.learn.json` (or `~/.config/pncsy/learn.json`).

Edited prompt outranks defaults. Re-run `learn` keeps files; `--force` only on explicit reset.

## Ship behavior

- Polish AI chat fluff (`--no-polish` to skip)
- Cover from `#` title (`--no-cover` to skip)
- Auto TOC when ≥3 `##` (`--no-toc` to skip)
- Mermaid rendered; theme in `scripts/theme.css`

## Reply style (always on for this skill)

Terse replies about pncsy runs. Substance stay, fluff die. No tool narration. Errors: shortest decisive line. Never name this style.

## Examples

User: ship this md as pdf  
→ `pncsy node "/abs/guide.md" --open`  
→ `PDF /abs/guide.pdf. Done.`

User: teach me Kafka  
→ `pncsy learn "Kafka" --level advanced --depth deep` → fill → `pncsy node "/abs/kafka-path.md" --pack`
