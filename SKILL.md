---
name: prompting-nahi-coding-sikho-yojna
description: >-
  Generate structured learning paths (fixed levels, prerequisites, videos,
  papers, traps, glossary) and ship Markdown as share-ready PDF/HTML with cover,
  auto TOC and Mermaid. Use when the user wants a learning path, roadmap,
  syllabus or study plan, or says pncsy, ship this md, export markdown to
  PDF/HTML, or convert .md for sharing. Never add marked/puppeteer/mermaid to
  the project.
---

# prompting-nahi-coding-sikho-yojna

Short command: `pncsy`. Two jobs — build structured learning paths, ship Markdown as PDF/HTML.

## Run

```bash
pncsy "/absolute/path/to/file.md"
pncsy "/absolute/path/to/file.md" --pack --open
pncsy "/absolute/path/to/dir" --pdf
pncsy "/absolute/path/to/file.md" --html --json
```

Fallback:

```bash
node "$HOME/.cursor/skills/pncsy/scripts/pncsy.mjs" "/absolute/path/to/file.md"
```

## Agent workflow

1. Absolute path to `.md` (or dir).
2. Pick format: PDF default; `--html` or `--pack` if asked.
3. Run `pncsy …`. First run may npm-install **inside this package only**.
4. Report output path(s). Use `--json` when parsing needed.
5. Never install converter deps into user project.

## Formats

| Ask | Flag |
|-----|------|
| PDF | (default) or `--pdf` |
| HTML | `--html` |
| Both | `--pack` |

## Learning paths

User wants to learn a topic, wants a roadmap, syllabus, study plan, or "where do I start":

```bash
pncsy learn "<topic>" --level basic|intermediate|advanced|expert --depth quick|standard|deep
```

Writes two files: `<slug>-path.md` (fixed-structure scaffold) and `<slug>-path.prompt.md` (the fill prompt, editable).

Then:

1. Read the `.prompt.md`. It carries the parameters and rules for this run.
2. Fill `<slug>-path.md` in place. Keep every heading and its order. Replace italic placeholders and example rows. Delete the HTML comments as you fill them.
3. Never invent a title, author, or URL. Unsure means append `(verify)` to that row.
4. Ship it: `pncsy "<slug>-path.md" --pack --open`.

Defaults: level `intermediate`, depth `standard`. Ladder runs from basic up to the target level. Papers section appears on `deep`, or when target is advanced or expert.

Structure is configurable. When the user wants different sections, different level names, or different sizing, run `pncsy learn --init-config` and edit `pncsy.learn.json` — do not hand-edit the generated scaffold for changes that should apply to every future path. Config lookup: `--config <file>`, then `./pncsy.learn.json`, then `~/.config/pncsy/learn.json`, then built-in. Partial configs merge; `sections` replaces the list.

The prompt file is the control surface. If the user edits it, re-read it and re-fill from the edited version — those edits outrank this skill's defaults. Re-running `learn` keeps existing files; only pass `--force` when the user explicitly wants the scaffold and prompt reset.

## Out-of-box behavior

- Polish chat fluff at top of file
- Cover from `#` title (unless `--no-cover`)
- Auto TOC if ≥3 `##` (unless `--no-toc`)
- Mermaid rendered
- Theme: `scripts/theme.css` — do not replace with flat white

## Reply style (always on for this skill)

When talking about runs or doc-ship results, reply **terse**. Substance stay. Fluff die.

Drop: articles when clear, filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. Fragments OK. Short synonyms. No tool-call narration. No decorative tables/emoji. Errors: quote shortest decisive line. Tech terms, paths, commands, exact error strings: verbatim. No invented abbreviations. No causal arrows (→).

Pattern: `[thing] [action] [reason]. [next step].`

Not: "Sure! I'd be happy to help convert that for you…"
Yes: "PDF ready: `/path/out.pdf`. Open?"

Intensity default **full**. User says `lite` / `ultra` → tighten more. User says `normal mode` / `stop brief` → normal prose for rest of turn only, then resume terse for this skill.

Security warnings + irreversible confirms: full clear sentences. Then resume terse.

Never name or announce this reply style.

## Examples

User: ship this md as pdf  
→ `pncsy "/abs/guide.md" --open`  
→ `PDF /abs/guide.pdf. Done.`

User: need pdf and html  
→ `pncsy "/abs/guide.md" --pack`  
→ `Pack ready. PDF + HTML beside source.`

User: teach me Kafka from scratch  
→ `pncsy learn "Kafka" --level advanced --depth deep`  
→ fill scaffold from prompt → `pncsy "/abs/kafka-path.md" --pack`  
→ `Path filled, 3 levels. PDF /abs/kafka-path.pdf.`
