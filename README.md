# pncsy

[![release](https://img.shields.io/github/v/release/kushjaggi/pncsy?label=release)](https://github.com/kushjaggi/pncsy/releases)
[![install](https://img.shields.io/badge/install-curl%20%7C%20bash-0a7ea4)](https://github.com/kushjaggi/pncsy#install)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**Prompting nahi, coding sikho.**

A CLI that turns “teach me X” and messy agent Markdown into **structured learning paths** and **share-ready PDF/HTML** — same shape every time, nothing installed in your project.

<p align="center">
  <img src="docs/screenshots/cover-page.png" alt="PDF cover — LangGraph learning path with teal theme, title, subtitle, and topic chips" width="720">
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#learning-paths">Learning paths</a> ·
  <a href="#ship-docs">Ship docs</a> ·
  <a href="#ai-editors">AI editors</a> ·
  <a href="examples/demo/langgraph-path.md">Live example</a>
</p>

---

## The problem

| Today | With `pncsy` |
|-------|--------------|
| “Make me a Kafka roadmap” → different shape every time | Fixed ladder + sections + fill prompt — same structure, any model |
| Agent dumps 40 pages of `.md` → you forward it raw | Polish → cover → auto TOC → Mermaid → PDF/HTML |
| Doc tools want `npm install` in *your* repo | One curl install; deps live in `~/.local/share/pncsy` only |

---

## How it works

```mermaid
flowchart LR
  A["pncsy learn \"Topic\""] --> B["topic-path.md\n+ topic-path.prompt.md"]
  B --> C["Your AI agent\nfills the scaffold"]
  C --> D["pncsy check topic-path.md"]
  D --> E["pncsy node topic-path.md --pack"]
  E --> F["PDF + HTML"]
```

**Two tiers.**

| | `pncsy learn` · `pncsy check` | `pncsy node` |
|---|---|---|
| **Runtime** | bash only | Node 18+ (opt-in) |
| **You get** | Scaffold, agent prompt, contract check | PDF, HTML, rendered Mermaid |
| **Use when** | Roadmap, syllabus, “where do I start?” | Sharing docs that should look finished |

---

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/kushjaggi/pncsy/main/scripts/install.sh | bash
```

No Node. No npm. No clone. Adds `pncsy` to `~/.local/bin`.

<p align="center">
  <img src="docs/screenshots/install-demo.png" alt="Terminal: curl install then pncsy learn LangGraph" width="760">
</p>

```bash
# pin a release
PNCSY_VERSION=1.0.4 curl -fsSL https://raw.githubusercontent.com/kushjaggi/pncsy/main/scripts/install.sh | bash
```

Then try it:

```bash
pncsy learn "LangGraph" --level advanced --depth deep
# → langgraph-path.md + langgraph-path.prompt.md

# when ready to ship (one-time: pncsy setup --node)
pncsy node langgraph-path.md --pack --open
```

<p align="center">
  <img src="docs/screenshots/cli-demo.png" alt="Terminal: pncsy setup --node and pncsy node --pack" width="760">
</p>

---

## Output

<p align="center">
  <img src="docs/screenshots/content-page.png" alt="Styled learning path — goals, concepts, resource tables" width="720">
</p>

<p align="center">
  <img src="docs/screenshots/mermaid-diagram.png" alt="Mermaid flowchart rendered inline in the document" width="500">
  &nbsp;&nbsp;
  <img src="docs/screenshots/toc-and-tables.png" alt="Auto-generated table of contents and styled tables" width="400">
</p>

See a filled example: **[examples/demo/langgraph-path.md](examples/demo/langgraph-path.md)**

---

## Learning paths

Every `pncsy learn` run writes **two files**:

| File | What it is |
|------|------------|
| `<topic>-path.md` | Scaffold — fixed headings, tables, level ladder |
| `<topic>-path.prompt.md` | Instructions for your agent to fill it (edit this freely) |

```bash
pncsy learn "Kafka" --level advanced --depth deep -o ./plans
```

**Level** — ladder stops at your target: `basic` → `intermediate` → `advanced` → `expert`  
**Depth** — how much per level: `quick` · `standard` · `deep`

| Depth | Concepts | Resources | Papers |
|-------|----------|-----------|--------|
| quick | 3 | 2 | — |
| standard | 5 | 3 | at advanced+ |
| deep | 8 | 5 | yes |

**Every path includes:** Snapshot · Prerequisites (with self-checks) · Level ladder (goals, concepts, resources, hands-on task) · Videos · Papers (when depth warrants) · Common traps · Glossary · Next steps

### Agent workflow

1. Run `pncsy learn "topic" …`
2. Open `.prompt.md` — tell your agent: *fill `.md` in place; keep every heading; tag uncertain links `(verify)`*
3. Verify: `pncsy check "<slug>-path.md"`
4. Ship: `pncsy node "<slug>-path.md" --pack --open`

Re-running `learn` keeps your edits. Use `--force` only when you want a clean slate.

### Did the agent actually follow the scaffold?

Agents drift — they drop a heading, leave `_placeholder_` text, or forget to resolve a `(verify)` tag. `pncsy check` rebuilds the scaffold from the `pncsy:learn` marker in your file and diffs against it:

```bash
$ pncsy check langgraph-path.md
langgraph-path.md  (LangGraph · intermediate · standard)

  ✗ missing heading   ## Glossary
  ✗ placeholder left  _why it matters_ (line 61)
  ! unresolved        (verify) × 3

FAIL  2 problem(s), 1 warning(s)
```

Exit `0` clean, `1` contract broken, `2` uncheckable — so it drops straight into CI or a pre-commit hook. `--strict` fails on warnings too.

---

## Project docs

The same scaffold → fill → check loop, pointed at the docs an AI-assisted codebase actually needs. Each writes a `.md` and a `.prompt.md`, and each is verifiable by `pncsy check`.

| Command | Writes | The section that earns it |
|---------|--------|---------------------------|
| `pncsy adr "<decision>"` | Decision record | **Alternatives rejected** — if you can't name one, you had no choice, not a decision |
| `pncsy arch ["<system>"]` | System map | **Boundaries** — what this system deliberately does not own |
| `pncsy flow "<path>"` | Execution trace | **Failure modes** — what each hop does when it breaks |
| `pncsy constraints` | Guardrails | **Never touch**, each with a concrete consequence |
| `pncsy bug "<symptom>"` | Incident record | **Blast radius** — the other callers you checked |
| `pncsy handover ["<label>"]` | Session handoff | **Next step** — exactly one, not a wishlist |

```bash
pncsy adr "Use Postgres over DynamoDB"
# → use-postgres-over-dynamodb-adr.md + .prompt.md
```

Fill it with your agent, then `pncsy check` it like anything else.

### Docs about code rot. These say so.

`arch` and `flow` describe live code, so they stamp the commit they were written against. When HEAD moves past it, `check` tells you the doc is describing a codebase that no longer exists:

```bash
$ pncsy check billing-arch.md
billing-arch.md  (arch · billing service)

  ! stale             describes 4e7422a, HEAD is cbc0f7c (+31 commits)

OK    contract kept, 1 warning(s)
```

Shape still valid, content probably not — which is the honest answer. `adr`, `bug`, and `handover` never warn: they're historical records, and an ADR from March is *supposed* to describe March.

<details>
<summary><strong>Custom structure</strong> (needs Node)</summary>

```bash
pncsy node learn --init-config    # writes pncsy.learn.json
```

Lookup: `--config <file>` → `./pncsy.learn.json` → `~/.config/pncsy/learn.json` → built-in defaults.

```jsonc
{
  "levels": ["beginner", "working", "expert"],
  "depths": { "standard": { "concepts": 6 } },
  "sections": [
    { "id": "interview", "title": "Interview Q&A", "body": "| Q | A |\n|---|---|" }
  ],
  "promptRules": ["Your custom fill rules."]
}
```

Tokens: `{{topic}}` `{{levelTitle}}` `{{concepts}}` `{{ladder}}` — see [learn.default.mjs](scripts/learn.default.mjs).

</details>

---

## Ship docs

Any `.md` file — learning paths, READMEs, agent dumps. Requires Node once:

```bash
pncsy setup --node    # one-time
```

```bash
pncsy node README.md           # PDF (default)
pncsy node guide.md --html     # HTML only
pncsy node guide.md --pack     # both
pncsy node docs/               # every .md in a folder
```

**Transforms on ship:**

- Strips “Sure! Here’s a comprehensive guide…” openings (`--no-polish` to keep)
- Teal cover page from `#` title + subtitle + chips
- Auto table of contents when ≥3 `##` headings
- Renders Mermaid diagrams (waits for DOM, fits tall diagrams to one PDF page)
- Clickable GitHub / arXiv links (underlined in PDF)
- Repo path linkification when `repo_base` is set in frontmatter

```yaml
---
title: My Doc
subtitle: Share-ready version
chips: [API, Auth, Deploy]
format: pack
repo_base: https://github.com/org/repo/blob/main
repo_tree: https://github.com/org/repo/tree/main   # optional; for paths ending in /
repo_paths: src, docs, examples                    # optional; default common prefixes
linkify_repo: false                                # optional; disable path linkification
---
```

With `repo_base` set, `` `src/foo.py` `` and `` `docs/guide.md` `` become clickable blob links. Use `repo_paths: *` to link any backtick path that contains `/`.

Working sample: **[examples/repo-links.md](examples/repo-links.md)** — `pncsy node examples/repo-links.md --pack`

<details>
<summary><strong>All ship flags</strong></summary>

| Flag | Effect |
|------|--------|
| `--subtitle` / `--chips` / `--kicker` | Cover metadata |
| `--no-cover` / `--no-toc` / `--no-polish` | Skip cover, TOC, or fluff cleanup |
| `--no-repo-links` | Skip repo path / GitHub link enhancement |
| `--repo-base` / `--repo-tree` | Override frontmatter repo link bases |
| `--no-html-keep` | Delete intermediate HTML after PDF |
| `--meta <text>` | Cover metadata line |
| `--json` | `{ ok, results }` on stdout for agents |
| `--chrome <path>` | Override browser binary |

</details>

---

## AI editors

Works with **Cursor, Claude Code, Windsurf, Cline, Copilot** — anything that can run shell commands.

```bash
curl -fsSL https://raw.githubusercontent.com/kushjaggi/pncsy/main/scripts/install.sh | bash
ln -sfn ~/.local/share/pncsy/skill ~/.cursor/skills/pncsy
```

No skills folder? Put **[AGENTS.md](AGENTS.md)** in your project root — agents pick up when and how to call `pncsy`.

Per-editor setup: **[skill/INSTALL.md](skill/INSTALL.md)**

---

## Commands

```bash
pncsy learn "<topic>" [options]      # scaffold — no Node
pncsy check <file.md> [--strict]     # verify a filled doc — no Node
pncsy adr "<decision>"               # decision record — no Node
pncsy arch ["<system>"]              # system map — no Node
pncsy flow "<path>"                  # execution trace — no Node
pncsy constraints                    # what must never change — no Node
pncsy bug "<symptom>"                # root cause + blast radius — no Node
pncsy handover ["<label>"]           # session handoff — no Node
pncsy node <file.md|dir> [options]   # ship PDF/HTML — needs Node
pncsy setup                          # install status
pncsy setup --node                   # fetch Node deps
pncsy node learn --init-config       # custom config template
```

<details>
<summary><strong>Project layout & maintainers</strong></summary>

```
pncsy/
├── bin/pncsy           # CLI router
├── scripts/learn.sh    # learn (bash)
├── scripts/pncsy.mjs   # ship (Node)
├── skill/SKILL.md      # agent skill
└── AGENTS.md           # universal agent rules
```

```bash
node scripts/check.mjs                 # self-check (learn parity, doc kinds, ship helpers)
node scripts/capture-screenshots.mjs   # regenerate README images
```

</details>

---

## License

MIT · [kushjaggi](https://github.com/kushjaggi)
