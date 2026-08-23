# Install pncsy skill in your AI editor

Works with any agent that can run shell commands and read project instructions.

**Prerequisite:** bash + curl. Node 18+ only if you want PDF/HTML export.

```bash
curl -fsSL https://raw.githubusercontent.com/kushjaggi/pncsy/main/scripts/install.sh | bash
```

After install, symlink this repo's `skill/` folder into your editor's skills directory.

---

## Cursor

```bash
curl -fsSL https://raw.githubusercontent.com/kushjaggi/pncsy/main/scripts/install.sh | bash
ln -sfn ~/.local/share/pncsy/skill ~/.cursor/skills/pncsy
# or from a clone:
ln -sfn ~/Projects/pncsy/skill ~/.cursor/skills/pncsy
```

Optional user rule (Cursor Settings → Rules):

```text
Tool: pncsy. Scaffold learning and project records, verify with pncsy check, ship with pncsy node file.md --pack.
Never install marked/puppeteer/mermaid into the project. See AGENTS.md.
```

---

## Claude Code

```bash
curl -fsSL https://raw.githubusercontent.com/kushjaggi/pncsy/main/scripts/install.sh | bash
mkdir -p ~/.claude/skills
ln -sfn ~/.local/share/pncsy/skill ~/.claude/skills/pncsy
```

Or add to project `CLAUDE.md`:

```markdown
## pncsy
Use `pncsy learn`, `adr`, `arch`, `flow`, `constraints`, `bug`, or `handover`; verify with `pncsy check`; ship with `pncsy node file.md --pack`.
See AGENTS.md in this repo.
```

---

## Windsurf

```bash
curl -fsSL https://raw.githubusercontent.com/kushjaggi/pncsy/main/scripts/install.sh | bash
mkdir -p ~/.codeium/windsurf/skills
ln -sfn ~/.local/share/pncsy/skill ~/.codeium/windsurf/skills/pncsy
```

Or paste `AGENTS.md` / `skill/SKILL.md` into Windsurf **Memories** or workspace rules.

---

## Cline / Roo Code / Continue

1. `curl -fsSL https://raw.githubusercontent.com/kushjaggi/pncsy/main/scripts/install.sh | bash`
2. Add to workspace `.clinerules`, `.roorules`, or Continue system prompt:

```text
Use pncsy for checkable learning/project records and md→PDF/HTML. Run pncsy --help for commands.
Full instructions: AGENTS.md in repo root.
```

---

## GitHub Copilot (VS Code / JetBrains)

Add to `.github/copilot-instructions.md` in your project:

```markdown
# pncsy
- Learning path: `pncsy learn "<topic>" --level intermediate --depth standard`
- Project records: `pncsy adr|arch|flow|constraints|bug|handover`
- Verify: `pncsy check path/to/doc.md --strict`
- Ship markdown: `pncsy node path/to/doc.md --pack`
- Do not add marked/puppeteer/mermaid to this project for doc export.
```

---

## Generic / any editor

1. Install CLI: `curl -fsSL https://raw.githubusercontent.com/kushjaggi/pncsy/main/scripts/install.sh | bash`
2. Put `AGENTS.md` in your project root (many agents auto-read it)
3. Or copy `skill/SKILL.md` content into your editor's custom instructions / rules file

Verify:

```bash
pncsy learn "Test" --depth quick     # no Node needed
pncsy setup                          # shows what's ready
pncsy node test-path.md --html       # needs Node
```

---

## CLI only (no skill file)

If your editor has no skills folder, **installing the CLI is enough** — tell the agent:

> Use the `pncsy` CLI. Run `pncsy --help` and `pncsy learn --help`. Follow `AGENTS.md`.

The CLI is editor-agnostic; skills just teach the agent when and how to call it.
