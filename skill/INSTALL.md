# Install pncsy skill in your AI editor

Works with any agent that can run shell commands and read project instructions.

**Prerequisite:** Node 18+. Install CLI (pick one):

```bash
curl -fsSL https://raw.githubusercontent.com/kushjaggi/prompting-nahi-coding-sikho-yojna/main/scripts/install.sh | bash
# or: npm install -g pncsy
# or: npx pncsy …
```

After install, symlink or copy this repo's `skill/` folder (or just `SKILL.md`) into your editor's skills directory.

---

## Cursor

```bash
curl -fsSL https://raw.githubusercontent.com/kushjaggi/prompting-nahi-coding-sikho-yojna/main/scripts/install.sh | bash
ln -sfn ~/.local/share/pncsy/skill ~/.cursor/skills/pncsy
# npm alternative:
# ln -sfn "$(npm root -g)/pncsy/skill" ~/.cursor/skills/pncsy
# or from a clone:
ln -sfn ~/Projects/prompting-nahi-coding-sikho-yojna ~/.cursor/skills/pncsy
```

Optional user rule (Cursor Settings → Rules):

```text
Tool: pncsy. Learning paths: pncsy learn "<topic>". Ship docs: pncsy file.md --pack.
Never install marked/puppeteer/mermaid into the project. See AGENTS.md.
```

---

## Claude Code

```bash
curl -fsSL https://raw.githubusercontent.com/kushjaggi/prompting-nahi-coding-sikho-yojna/main/scripts/install.sh | bash
mkdir -p ~/.claude/skills
ln -sfn ~/.local/share/pncsy/skill ~/.claude/skills/pncsy
```

Or add to project `CLAUDE.md`:

```markdown
## pncsy
Run `pncsy learn "<topic>"` for learning paths, `pncsy file.md --pack` to ship PDF/HTML.
See AGENTS.md in this repo.
```

---

## Windsurf

```bash
curl -fsSL https://raw.githubusercontent.com/kushjaggi/prompting-nahi-coding-sikho-yojna/main/scripts/install.sh | bash
mkdir -p ~/.codeium/windsurf/skills
ln -sfn ~/.local/share/pncsy/skill ~/.codeium/windsurf/skills/pncsy
```

Or paste `AGENTS.md` / `skill/SKILL.md` into Windsurf **Memories** or workspace rules.

---

## Cline / Roo Code / Continue

1. `curl -fsSL https://raw.githubusercontent.com/kushjaggi/prompting-nahi-coding-sikho-yojna/main/scripts/install.sh | bash`
2. Add to workspace `.clinerules`, `.roorules`, or Continue system prompt:

```text
Use pncsy for learning paths (pncsy learn) and md→PDF/HTML (pncsy file.md --pack).
Full instructions: AGENTS.md in repo root.
```

---

## GitHub Copilot (VS Code / JetBrains)

Add to `.github/copilot-instructions.md` in your project:

```markdown
# pncsy
- Learning path: `pncsy learn "<topic>" --level intermediate --depth standard`
- Ship markdown: `pncsy path/to/doc.md --pack`
- Do not add marked/puppeteer/mermaid to this project for doc export.
```

---

## Generic / any editor

1. Install CLI: `curl -fsSL …/scripts/install.sh | bash` or `npm install -g pncsy`
2. Put `AGENTS.md` in your project root (many agents auto-read it)
3. Or copy `skill/SKILL.md` content into your editor's custom instructions / rules file

Verify:

```bash
pncsy learn "Test" --depth quick
pncsy test-path.md --html
```

---

## CLI only (no skill file)

If your editor has no skills folder, **installing the CLI is enough** — tell the agent:

> Use the `pncsy` CLI. Run `pncsy --help` and `pncsy learn --help`. Follow `AGENTS.md`.

The CLI is editor-agnostic; skills just teach the agent when and how to call it.
