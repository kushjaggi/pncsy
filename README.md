# mdpdf

**Markdown → visually styled PDF** in one command.

Cover page, Mermaid diagrams, dark code blocks, tables, callouts, page numbers. Uses your local Chrome — no project bloat if you install globally.

```bash
mdpdf README.md --open
```

---

## Features

- Styled A4 PDF (teal cover, serif body, print-ready CSS)
- GFM Markdown (tables, task lists, fenced code)
- Mermaid diagrams rendered into the PDF
- Optional cover chips / subtitle / kicker
- Intermediate HTML kept next to the PDF (or drop with `--no-html`)
- Works from any directory — deps stay with this package

## Requirements

| Need | Notes |
|------|--------|
| **Node.js 18+** | Runtime |
| **Chrome / Chromium / Edge** | Headless print engine (`puppeteer-core`) |

macOS Google Chrome path is detected automatically. Override with `--chrome` or `CHROME_PATH`.

## Install

### Option A — clone + global link (recommended)

```bash
git clone https://github.com/kushjaggi/md-to-pdf.git
cd md-to-pdf
npm install
npm link          # puts `mdpdf` on your PATH
```

### Option B — run without linking

```bash
git clone https://github.com/kushjaggi/md-to-pdf.git
cd md-to-pdf
npm install
node ./scripts/md-to-pdf.mjs ./README.md --open
# or:
./bin/mdpdf ./README.md --open
```

### Option C — Cursor agents (personal skill)

Copy or symlink this repo to your Cursor skills folder so any agent can convert docs:

```bash
ln -s "$(pwd)" ~/.cursor/skills/md-to-pdf
# or: cp -R . ~/.cursor/skills/md-to-pdf
```

Then tell any agent: *convert this md to pdf* — or run `mdpdf` yourself.

Also symlink the CLI if you want the short command everywhere:

```bash
ln -sf "$(pwd)/bin/mdpdf" ~/.local/bin/mdpdf
```

(`~/.local/bin` should already be on your PATH.)

## Usage

```bash
mdpdf <file.md> [options]
```

| Flag | Effect |
|------|--------|
| `-o`, `--output <path>` | Output PDF path (default: `<file>.pdf`) |
| `--subtitle "..."` | Cover subtitle |
| `--kicker "..."` | Cover eyebrow (default: `Document`) |
| `--chips "A,B,C"` | Cover chips (comma-separated) |
| `--meta "..."` | Cover meta line |
| `--no-cover` | Skip cover page |
| `--no-html` | Delete intermediate `.html` after PDF |
| `--open` | Open PDF when done |
| `--chrome <path>` | Chrome/Chromium binary |
| `-h`, `--help` | Show help |

### Examples

```bash
# Basic
mdpdf README.md

# Custom cover + open
mdpdf docs/guide.md \
  --subtitle "Quick start for beginners" \
  --chips "Setup,Usage,Tips" \
  --kicker "Tutorial" \
  --open

# Explicit output, no cover
mdpdf notes.md -o /tmp/notes.pdf --no-cover
```

## How it works

1. Parse Markdown with [`marked`](https://github.com/markedjs/marked)
2. Wrap Mermaid fences and inject theme CSS
3. Open the HTML in headless Chrome via [`puppeteer-core`](https://pptr.dev/)
4. Print to PDF (backgrounds + footer page numbers)

First run may install npm deps if you skipped `npm install` — it installs **in this package directory only**, never in the folder of the `.md` file you convert.

## Project layout

```
md-to-pdf/
├── bin/mdpdf              # CLI entry
├── scripts/
│   ├── md-to-pdf.mjs      # Converter
│   └── theme.css          # Print / PDF theme
├── package.json
├── LICENSE
└── README.md
```

Edit `scripts/theme.css` to change colors, fonts, or cover style.

## Cursor user rule (optional)

Add this to **Cursor Settings → Rules** so every agent uses the same command:

```text
When converting Markdown to PDF, run:
  mdpdf "/absolute/path/to/file.md"
Never install marked/puppeteer/mermaid into the current project for this.
```

## License

MIT
