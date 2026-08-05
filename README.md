# prompting-nahi-coding-sikho-yojna

[![release](https://img.shields.io/github/v/release/kushjaggi/prompting-nahi-coding-sikho-yojna?label=release)](https://github.com/kushjaggi/prompting-nahi-coding-sikho-yojna/releases)
[![install](https://img.shields.io/badge/install-curl%20%7C%20bash-0a7ea4)](https://github.com/kushjaggi/prompting-nahi-coding-sikho-yojna#quick-start)

**Prompting nahi, coding sikho.**  
Short command: **`pncsy`**

Turn messy agent Markdown and vague “teach me X” prompts into **structured learning paths** and **share-ready PDF/HTML** — same shape every time, teal print theme, zero project bloat.

<p align="center">
  <img src="docs/screenshots/cover-page.png" alt="PDF cover page with title, subtitle, and topic chips" width="720">
</p>

---

## Why this exists

| Problem | What happens today | What `pncsy` does |
|---------|-------------------|-------------------|
| **Prompt lottery** | Every “make me a roadmap” returns a different shape; links get invented | Fixed ladder + sections + editable fill prompt |
| **Ugly AI dumps** | Long `.md` forwarded raw — no cover, broken diagrams, no TOC | Polish fluff → cover → auto TOC → Mermaid → PDF/HTML |
| **Project pollution** | Tools want `npm install` in *your* repo | All deps live inside this package only |

---

## Quick start

```bash
# install — bash only, no Node, no npm
curl -fsSL https://raw.githubusercontent.com/kushjaggi/prompting-nahi-coding-sikho-yojna/main/scripts/install.sh | bash

# learning paths (works immediately)
pncsy learn "LangGraph" --level advanced --depth deep

# PDF/HTML (opt-in Node stack)
pncsy setup --node
pncsy node langgraph-path.md --pack --open
```

| What | Needs Node? |
|------|-------------|
| `pncsy learn` | No — pure bash |
| `pncsy node file.md --pack` | Yes — PDF, HTML, Mermaid |
| `pncsy node learn --init-config` | Yes — custom `pncsy.learn.json` |

### Install options

```bash
# curl installer (recommended) — no Node, no npm
curl -fsSL https://raw.githubusercontent.com/kushjaggi/prompting-nahi-coding-sikho-yojna/main/scripts/install.sh | bash

# pin a version
PNCSY_VERSION=1.0.2 curl -fsSL https://raw.githubusercontent.com/kushjaggi/prompting-nahi-coding-sikho-yojna/main/scripts/install.sh | bash
```

Installs to `~/.local/share/pncsy`. Override with `PNCSY_HOME` / `PNCSY_BIN`.

<details>
<summary>Optional: npm / GitHub Packages (only if you already use npm)</summary>

```bash
npm install -g pncsy
# or GitHub Packages:
npm install -g @kushjaggi/pncsy --registry=https://npm.pkg.github.com
```

</details>

<p align="center">
  <img src="docs/screenshots/cli-demo.png" alt="Terminal showing pncsy learn and pncsy ship commands" width="640">
</p>

---

## Features at a glance

### Learning paths (`pncsy learn`)

- **Fixed levels:** `basic` → `intermediate` → `advanced` → `expert` (ladder stops at your target)
- **Depth modes:** `quick` | `standard` | `deep` (controls concepts, resources, traps, glossary per level)
- **Two files every run:**
  - `<topic>-path.md` — scaffold with every section in the same order
  - `<topic>-path.prompt.md` — the prompt your agent uses to fill it (editable)
- **No API keys** — your AI agent fills content; prompt bans invented citations (`(verify)` tag)
- **Configurable structure** — `pncsy node learn --init-config` → edit `pncsy.learn.json`
- **Safe re-runs** — existing path/prompt kept unless `--force`

**Sections in every path:** Snapshot · Prerequisites (with self-checks) · Level ladder (goals, concepts, resources, hands-on task) · Videos & courses · Research papers (when depth/level warrants) · Common traps · Glossary · Next

### Document shipping (`pncsy node <file.md>`)

- **Formats:** PDF (default) · HTML · `--pack` (both)
- **AI-dump polish** — strips chatty openings (`--no-polish` to keep raw)
- **Cover page** — from `#` title + optional subtitle, chips, kicker (`--no-cover` to skip)
- **Auto table of contents** — when ≥3 `##` headings (`--no-toc` to skip)
- **Mermaid diagrams** — rendered in PDF/HTML, not left as code fences
- **YAML frontmatter** — title, subtitle, chips, `format: pack`, etc.
- **Batch** — pass a directory; ships every `.md`
- **Agent-friendly** — `--json` for machine-readable output

<p align="center">
  <img src="docs/screenshots/content-page.png" alt="Styled document body with headings and callouts" width="720">
</p>

<p align="center">
  <img src="docs/screenshots/mermaid-diagram.png" alt="Rendered Mermaid flowchart in the document" width="560">
  &nbsp;&nbsp;
  <img src="docs/screenshots/toc-and-tables.png" alt="Table of contents box and styled tables" width="360">
</p>

---

## How to: learning path (step by step)

### Step 1 — Generate scaffold + prompt

```bash
pncsy learn "Kafka" --level advanced --depth deep -o ./plans
```

| Flag | Meaning |
|------|---------|
| `--level` | Target rung: `basic` \| `intermediate` \| `advanced` \| `expert` |
| `--depth` | How much per level: `quick` \| `standard` \| `deep` |
| `-o` | Output directory or file base |
| `--init-config` | Write `pncsy.learn.json` (`pncsy node learn --init-config`) |
| `--force` | Overwrite existing path/prompt files |
| `--ship` / `--open` | Render PDF (`pncsy node learn … --ship`) |

**Depth sizing:**

| Depth | Concepts/level | Resources | Papers section |
|-------|----------------|-----------|----------------|
| `quick` | 3 | 2 | No |
| `standard` | 5 | 3 | Advanced+ only |
| `deep` | 8 | 5 | Yes |

### Step 2 — Fill with your AI agent

1. Open `kafka-path.prompt.md` — rules, parameters, section checklist
2. Tell your agent: *fill `kafka-path.md` using the prompt file; keep every heading; tag uncertain links `(verify)`*
3. **Edit the prompt** anytime — re-fill from your edited prompt (your edits win)

### Step 3 — Ship

```bash
pncsy node plans/kafka-path.md --pack --open
```

Gets styled **PDF + HTML** beside the source file.

---

## How to: ship any Markdown

Requires Node stack: `pncsy setup --node` once, then:

```bash
# PDF only
pncsy node README.md

# HTML only
pncsy node guide.md --html

# Both
pncsy node guide.md --pack

# Custom cover
pncsy node guide.md \
  --subtitle "Team onboarding" \
  --chips "Setup,API,Deploy" \
  --kicker "Internal doc" \
  --open

# Whole folder
pncsy node docs/

# Frontmatter in the .md (CLI flags override)
```

```yaml
---
title: My Doc
subtitle: Share-ready version
chips: [API, Auth, Deploy]
format: pack
---
```

| Flag | Effect |
|------|--------|
| `--no-polish` | Keep AI chat fluff at top |
| `--no-cover` | Skip cover page |
| `--no-toc` | Skip auto TOC |
| `--no-html-keep` | Delete intermediate HTML after PDF |
| `--json` | Print `{ ok, results }` on stdout |
| `--chrome <path>` | Override browser binary |

---

## Configure the learning path structure

```bash
pncsy node learn --init-config    # creates pncsy.learn.json
```

Lookup order: `--config <file>` → `./pncsy.learn.json` → `~/.config/pncsy/learn.json` → built-in defaults.

```jsonc
{
  "levels": ["beginner", "working", "expert"],
  "depths": { "standard": { "concepts": 6 } },
  "kicker": "Syllabus",
  "sections": [
    {
      "id": "interview",
      "title": "Interview questions",
      "body": "| Q | A |\n|---|---|\n| _q_ | _a_ |"
    }
  ],
  "promptRules": ["Your custom fill rules here."]
}
```

Section options: `title`, `note`, `body`, `repeat: "levels"`, `when: { depths, minLevel, excludeDepths }`.  
Tokens: `{{topic}}`, `{{levelTitle}}`, `{{n}}`, `{{concepts}}`, `{{resources}}`, `{{traps}}`, `{{glossary}}`, `{{ladder}}`.

---

## AI editor setup

`pncsy` is **editor-agnostic**. Install once, wire into whatever agent you use:

```bash
curl -fsSL https://raw.githubusercontent.com/kushjaggi/prompting-nahi-coding-sikho-yojna/main/scripts/install.sh | bash
```

**Wire skill into your editor:**

```bash
ln -sfn ~/.local/share/pncsy/skill ~/.cursor/skills/pncsy   # Cursor
ln -sfn ~/.local/share/pncsy/skill ~/.claude/skills/pncsy   # Claude Code
```

Full per-editor steps: **[skill/INSTALL.md](skill/INSTALL.md)**

No skills folder? Just install the CLI and point your agent at **`AGENTS.md`** in this repo — it tells any agent when and how to run `pncsy`.

Compat aliases: `inkship`, `mdpdf` → both call `pncsy`.

---

## Project layout

```
prompting-nahi-coding-sikho-yojna/
├── bin/pncsy                 # CLI entry
├── scripts/
│   ├── pncsy.mjs             # Markdown → PDF/HTML renderer
│   ├── learn.mjs             # Learning path generator
│   ├── learn.default.mjs     # Default structure config
│   ├── capture-screenshots.mjs
│   ├── check.mjs             # npm run check
│   └── theme.css             # Print theme (teal cover, serif body)
├── docs/screenshots/         # README images
├── examples/
│   ├── sample.md
│   └── demo/                 # Generated LangGraph demo path
├── AGENTS.md                 # Universal agent instructions (any editor)
├── skill/
│   ├── SKILL.md              # Agent skill (Cursor, Claude, etc.)
│   └── INSTALL.md            # Per-editor install steps
└── README.md
```

---

## Commands reference

```bash
pncsy learn "<topic>" [options]        # learning path (no Node)
pncsy node <file.md|dir> [options]     # ship PDF/HTML (Node)
pncsy node learn --init-config         # custom config template
pncsy setup                            # status
pncsy setup --node                     # fetch Node deps once
```

---

## Regenerate screenshots (maintainers)

```bash
npm install
node scripts/capture-screenshots.mjs
```

Writes PNGs to `docs/screenshots/` from live HTML output.

---

## License

MIT · [kushjaggi](https://github.com/kushjaggi)
