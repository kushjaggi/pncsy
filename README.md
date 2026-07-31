# prompting-nahi-coding-sikho-yojna

**Prompting nahi, coding sikho.** Short name: `pncsy`.

Two problems, one tool:

1. **You prompt your way to a study plan.** Every run comes back a different shape, half the links are invented, nothing is reusable.
2. **Your agent dumps a long `.md`.** You forward it raw. Looks amateur, diagrams stay as code, no cover, no contents page.

```bash
pncsy learn "LangGraph" --level advanced --depth deep   # structured path
pncsy tutorial.md --pack --open                          # share-ready PDF + HTML
```

---

## Learning paths

```bash
pncsy learn "LangGraph" --level advanced --depth deep
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

The prompt bans invented citations — unverified rows get tagged `(verify)` instead of quietly passing as real.

Then ship it:

```bash
pncsy langgraph-path.md --pack --open
```

### Configure the structure

The sections, the level names, the depth sizing and the prompt rules all come from config. Dump an editable copy:

```bash
pncsy learn --init-config      # writes pncsy.learn.json
```

Loaded from `--config <file>`, else `./pncsy.learn.json`, else `~/.config/pncsy/learn.json`, else built-in.

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

## Shipping Markdown

| Pain | Out of the box |
|------|----------------|
| Chatty AI openings in the file | Stripped (`--no-polish` to keep) |
| No structure for sharing | Cover from `#` title + optional chips |
| Long docs, no TOC | Auto TOC when ≥3 `##` headings |
| Mermaid stays code | Rendered into PDF/HTML |
| “I need PDF *and* a web copy” | `--pack` |
| Folder of notes | Pass a directory — ships every `.md` |

Formats: **PDF** (default) · **HTML** · **pack** (both). Theme: `scripts/theme.css`.

```bash
pncsy notes.md                 # PDF
pncsy notes.md --html          # styled HTML
pncsy notes.md --pack          # PDF + HTML
pncsy docs/                    # every .md in folder

pncsy guide.md \
  --subtitle "Share-ready walkthrough" \
  --chips "Setup,Usage,Ship" \
  --kicker "Tutorial" \
  --open
```

### Frontmatter (optional)

```markdown
---
title: LangGraph from Zero
subtitle: Beginner walkthrough
kicker: Tutorial
chips: [State, Edges, Tools]
format: pack
---
```

CLI flags win over frontmatter when both set.

## Install

```bash
git clone https://github.com/kushjaggi/prompting-nahi-coding-sikho-yojna.git
cd prompting-nahi-coding-sikho-yojna
npm install
npm link          # installs both `pncsy` and the full name
```

Or symlink just the short command:

```bash
ln -sf "$(pwd)/bin/pncsy" ~/.local/bin/pncsy
```

### Requirements

- Node 18+
- Chrome / Chromium / Edge (auto-detected; override with `--chrome` or `CHROME_PATH`)

## Flags

### Shipping

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

### `learn`

| Flag | Effect |
|------|--------|
| `--level <x>` | `basic` \| `intermediate` \| `advanced` \| `expert` (default: intermediate) |
| `--depth <x>` | `quick` \| `standard` \| `deep` (default: standard) |
| `-o <dir\|file>` | Where to write both files |
| `--config <file>` | Use a specific config |
| `--init-config` | Write an editable `pncsy.learn.json` |
| `--force` | Overwrite existing path/prompt/config (default: keep your edits) |
| `--ship` / `--open` | Render the scaffold right away |

## Cursor agents

```bash
ln -s "$(pwd)" ~/.cursor/skills/pncsy
```

Then: *make me a learning path for Kafka* · *ship this md* · *export as pdf*.

## Layout

```
prompting-nahi-coding-sikho-yojna/
├── bin/pncsy
├── scripts/
│   ├── pncsy.mjs          # render pipeline
│   ├── learn.mjs          # learning path scaffold + prompt
│   ├── learn.default.mjs  # default structure config
│   ├── check.mjs          # self-check: npm run check
│   └── theme.css          # visual theme
├── skill/SKILL.md         # Cursor skill
├── examples/sample.md
└── README.md
```

## License

MIT
