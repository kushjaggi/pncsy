# inkship

**Ship Markdown as share-ready docs.** PDF, HTML, or both — one command.

The headache: AI/agents dump long `.md` files. You forward them raw. Looks amateur. Diagrams break. No cover. No TOC.

**inkship** fixes that out of the box: polish chat fluff, build cover, auto TOC, render Mermaid, keep the teal print theme, spit PDF/HTML you can actually send.

```bash
inkship tutorial.md --open
```

---

## What it does

| Pain | Out of the box |
|------|----------------|
| Chatty AI openings in the file | Stripped (`--no-polish` to keep) |
| No structure for sharing | Cover from `#` title + optional chips |
| Long docs, no TOC | Auto TOC when ≥3 `##` headings |
| Mermaid stays code | Rendered into PDF/HTML |
| “I need PDF *and* a web copy” | `--pack` |
| Folder of notes | Pass a directory — ships every `.md` |

Formats: **PDF** (default) · **HTML** · **pack** (both). Theme: `scripts/theme.css` (kept).

## Install

```bash
git clone https://github.com/kushjaggi/inkship.git
cd inkship
npm install
npm link          # `inkship` on PATH
```

Or symlink:

```bash
ln -sf "$(pwd)/bin/inkship" ~/.local/bin/inkship
```

### Requirements

- Node 18+
- Chrome / Chromium / Edge (auto-detected; override with `--chrome` or `CHROME_PATH`)

## Usage

```bash
inkship <file.md|dir> [options]
```

### Formats

```bash
inkship notes.md                 # PDF
inkship notes.md --html          # styled HTML
inkship notes.md --pack          # PDF + HTML
inkship notes.md -f pack -o dist/
inkship docs/                    # every .md in folder
```

### Cover / polish

```bash
inkship guide.md \
  --subtitle "Share-ready walkthrough" \
  --chips "Setup,Usage,Ship" \
  --kicker "Tutorial" \
  --open

inkship raw-dump.md --no-polish  # keep file exactly
inkship guide.md --no-cover --no-toc
```

### Flags

| Flag | Effect |
|------|--------|
| `--pdf` / `--html` / `--pack` | Output type(s) |
| `-f, --format pdf\|html\|pack` | Same |
| `-o, --output <path>` | File base or directory |
| `--subtitle` `--kicker` `--chips` `--meta` | Cover |
| `--no-cover` `--no-toc` `--no-polish` | Turn off defaults |
| `--no-html-keep` | Drop intermediate HTML after PDF |
| `--open` | Open result |
| `--json` | Summary on stdout (agents/CI) |
| `--chrome <path>` | Browser binary |

### Frontmatter (optional)

```markdown
---
title: LangGraph from Zero
subtitle: Beginner walkthrough
kicker: Tutorial
chips: [State, Edges, Tools]
format: pack
cover: true
toc: true
---

# LangGraph from Zero
...
```

CLI flags win over frontmatter when both set.

## Cursor agents

```bash
ln -s "$(pwd)" ~/.cursor/skills/inkship
# or: cp -R skill ~/.cursor/skills/inkship
```

Tell any agent: *ship this md* / *inkship this* / *export as pdf*.

Skill embeds a **terse reply style** (no fluff) for status lines — never announces the style by name.

## Layout

```
inkship/
├── bin/inkship
├── scripts/
│   ├── inkship.mjs
│   └── theme.css      # visual theme — keep
├── skill/SKILL.md     # Cursor skill + terse voice
├── examples/sample.md
└── README.md
```

## License

MIT
