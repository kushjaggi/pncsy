---
name: pncsy
description: >-
  Create and verify structured learning paths and durable project records
  (ADR, architecture, flow, constraints, bug, handover), then ship Markdown as
  share-ready PDF/HTML with cover, auto TOC and diagrams. Works in any AI
  coding editor. Use for roadmaps, engineering decisions, system maps, code
  traces, guardrails, bug investigations, session handoffs, pncsy check, or
  Markdown export. Never add marked/puppeteer/mermaid to the user's project.
---

# pncsy

**prompting-nahi-coding-sikho-yojna** — short command: `pncsy`.

Editor-agnostic. Same workflow in Cursor, Claude Code, Windsurf, Cline, Copilot, or any agent with shell access.

Install: `curl -fsSL https://raw.githubusercontent.com/kushjaggi/pncsy/main/scripts/install.sh | bash` · Editor setup: [INSTALL.md](INSTALL.md) · Repo rules: [AGENTS.md](../AGENTS.md)

## Two tiers — pick the right one

| Command | Needs Node |
|---------|------------|
| `pncsy learn "<topic>"` | No — pure bash, always works |
| `pncsy check <file.md>` | No — verifies any filled scaffold |
| `pncsy adr` `arch` `flow` `constraints` `bug` `handover` | No — project doc scaffolds |
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

## Shipping workflow

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
2. Fill `<slug>-path.md` in place. Keep every heading and the `<!-- pncsy:learn … -->` line. `(verify)` on uncertain links.
3. `pncsy check "<slug>-path.md"` — fix what it reports, re-run until clean. Exit 0 clean, 1 broken, 2 uncheckable.
4. `pncsy node "<slug>-path.md" --pack --open`.

Config: `pncsy node learn --init-config` → `pncsy.learn.json` (or `~/.config/pncsy/learn.json`).

## Project docs

| User asks | Command |
|-----------|---------|
| Why did we choose X / log this decision | `pncsy adr "<decision>"` |
| How does this system fit together | `pncsy arch "<system>"` |
| Trace how X actually runs | `pncsy flow "<path>"` |
| What should AI never touch here | `pncsy constraints` |
| Write up this bug properly | `pncsy bug "<symptom>"` |
| Hand off / end of session notes | `pncsy handover` |

Same loop as learn: scaffold + `.prompt.md` → fill → `pncsy check`. Keep the `<!-- pncsy:<kind> … -->` line.

Never invent a path, function, or line you have not read — tag unconfirmed claims `(verify)`. `arch` and `flow` record the commit they describe and go stale when HEAD moves; regenerate instead of patching.

Edited prompt outranks defaults. Re-run `learn` keeps files; `--force` only on explicit reset.

## Ship behavior

- Polish AI chat fluff (`--no-polish` to skip)
- Cover from `#` title (`--no-cover` to skip)
- Auto TOC when ≥3 `##` (`--no-toc` to skip)
- Mermaid rendered after DOM ready; tall diagrams resized to fit one PDF page (`scripts/theme.css`)
- Clickable underlined GitHub/arXiv links in PDF
- With frontmatter `repo_base`, backtick repo paths (`src/foo.py`, `docs/guide.md`) link to GitHub (`--no-repo-links` to skip)

```yaml
repo_base: https://github.com/org/repo/blob/main
repo_paths: src, docs, examples   # or * for any path/with/slash
```

## Reply style (always on for this skill)

Terse replies about pncsy runs. Substance stay, fluff die. No tool narration. Errors: shortest decisive line. Never name this style.

## Examples

User: ship this md as pdf  
→ `pncsy node "/abs/guide.md" --open`  
→ `PDF /abs/guide.pdf. Done.`

User: teach me Kafka  
→ `pncsy learn "Kafka" --level advanced --depth deep` → fill → `pncsy node "/abs/kafka-path.md" --pack`
