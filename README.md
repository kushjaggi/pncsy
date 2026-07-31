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

## Learning paths

Second headache: people prompt their way to a study plan. Every run comes back a different shape, half the links are made up, and nothing is reusable.

`inkship learn` fixes the shape first, content second.

```bash
inkship learn "LangGraph" --level advanced --depth deep
```

Writes two files:

| File | What |
|------|------|
| `langgraph-path.md` | Fixed-structure scaffold, ready to fill |
| `langgraph-path.prompt.md` | The prompt that fills it — yours to edit |

Hand both to your agent (Cursor, Claude, whatever). It fills the scaffold using the prompt. No API key, no lock-in.

The prompt is the steering wheel: edit it, re-fill, get a different plan from the same structure. Re-running `learn` will not clobber an edited prompt or a filled path — existing files are kept unless you pass `--force`.

**Levels** — ladder runs from basic up to your target:

`basic` → `intermediate` → `advanced` → `expert`

**Depth** — how much per level:

| Depth | Concepts/level | Resources | Papers |
|-------|----------------|-----------|--------|
| `quick` | 3 | 2 | no |
| `standard` | 5 | 3 | advanced+ only |
| `deep` | 8 | 5 | yes |

**Every path has the same sections**, so two topics are comparable and nothing gets skipped: snapshot, prerequisites with self-checks, the level ladder (goals, concepts, resources, one hands-on task), videos and courses, research papers, common traps, glossary, next.

### Configure the structure

The sections, the level names, the depth sizing and the prompt rules all come from config. Dump an editable copy:

```bash
inkship learn --init-config      # writes inkship.learn.json
```

Loaded from `--config <file>`, else `./inkship.learn.json`, else `~/.config/inkship/learn.json`, else built-in.

```jsonc
{
  "levels": ["beginner", "working", "deep-expert"],   // rename or resize the ladder
  "depths": { "standard": { "concepts": 6 } },        // retune one depth, rest untouched
  "kicker": "Syllabus",
  "sections": [                                       // replaces the section list wholesale
    { "id": "interview", "title": "Interview questions", "body": "| Q | A |\n|---|---|\n| _q_ | _a_ |" }
  ],
  "promptRules": ["..."]                              // the rules baked into every prompt
}
```

Section keys: `title`, `note` (HTML comment, invisible in the PDF), `body`, `repeat: "levels"` to emit one block per level, and `when: { depths, minLevel, excludeDepths }` to gate it. Tokens `{{topic}} {{levelTitle}} {{n}} {{concepts}} {{resources}} {{traps}} {{glossary}} {{ladder}}` interpolate anywhere.

Partial configs merge with the defaults, except `sections`, which replaces the list so you stay in control of order.

The prompt bans invented citations — unverified rows get tagged `(verify)` instead of quietly passing as real.

Then ship it:

```bash
inkship langgraph-path.md --pack --open
```

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

### `learn` flags

| Flag | Effect |
|------|--------|
| `--level <x>` | `basic` \| `intermediate` \| `advanced` \| `expert` (default: intermediate) |
| `--depth <x>` | `quick` \| `standard` \| `deep` (default: standard) |
| `-o <dir\|file>` | Where to write both files |
| `--config <file>` | Use a specific config |
| `--init-config` | Write an editable `inkship.learn.json` |
| `--force` | Overwrite existing path/prompt/config (default: keep your edits) |
| `--ship` / `--open` | Render the scaffold right away |

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
│   ├── inkship.mjs    # render pipeline
│   ├── learn.mjs      # learning path scaffold + prompt
│   ├── check.mjs      # self-check: node scripts/check.mjs
│   └── theme.css      # visual theme — keep
├── skill/SKILL.md     # Cursor skill + terse voice
├── examples/sample.md
└── README.md
```

## License

MIT
