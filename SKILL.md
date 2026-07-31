---
name: inkship
description: >-
  Ship Markdown as share-ready PDF and/or HTML with cover, auto TOC, Mermaid,
  and AI-dump polish. Use when user says inkship, ship this md, export markdown
  to PDF/HTML, convert .md for sharing, or pack docs for handoff. Prefer `inkship`
  CLI; never add marked/puppeteer/mermaid to the project.
---

# inkship

Ship Markdown → share-ready **PDF / HTML / pack**. Fix ugly AI `.md` dumps.

## Run

```bash
inkship "/absolute/path/to/file.md"
inkship "/absolute/path/to/file.md" --pack --open
inkship "/absolute/path/to/dir" --pdf
inkship "/absolute/path/to/file.md" --html --json
```

Fallback:

```bash
node "$HOME/.cursor/skills/inkship/scripts/inkship.mjs" "/absolute/path/to/file.md"
# or repo: node /path/to/inkship/scripts/inkship.mjs ...
```

## Agent workflow

1. Absolute path to `.md` (or dir).
2. Pick format: PDF default; `--html` or `--pack` if asked.
3. Run `inkship …`. First run may npm-install **inside inkship package only**.
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
inkship learn "<topic>" --level basic|intermediate|advanced|expert --depth quick|standard|deep
```

Writes two files: `<slug>-path.md` (fixed-structure scaffold) and `<slug>-path.prompt.md` (the fill prompt, editable).

Then:

1. Read the `.prompt.md`. It carries the parameters and rules for this run.
2. Fill `<slug>-path.md` in place. Keep every heading and its order. Replace italic placeholders and example rows. Delete the HTML comments as you fill them.
3. Never invent a title, author, or URL. Unsure means append `(verify)` to that row.
4. Ship it: `inkship "<slug>-path.md" --pack --open`.

Defaults: level `intermediate`, depth `standard`. Ladder runs from basic up to the target level. Papers section appears on `deep`, or when target is advanced or expert.

If the user edits the prompt file, re-fill from the edited prompt — do not regenerate the scaffold unless level or depth changed.

## Out-of-box behavior

- Polish chat fluff at top of file
- Cover from `#` title (unless `--no-cover`)
- Auto TOC if ≥3 `##` (unless `--no-toc`)
- Mermaid rendered
- Theme: `scripts/theme.css` — do not replace with flat white

## Reply style (always on for this skill)

When talking about inkship runs or doc-ship results, reply **terse**. Substance stay. Fluff die.

Drop: articles when clear, filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. Fragments OK. Short synonyms. No tool-call narration. No decorative tables/emoji. Errors: quote shortest decisive line. Tech terms, paths, commands, exact error strings: verbatim. No invented abbreviations. No causal arrows (→).

Pattern: `[thing] [action] [reason]. [next step].`

Not: "Sure! I'd be happy to help convert that for you…"
Yes: "PDF ready: `/path/out.pdf`. Open?"

Intensity default **full**. User says `lite` / `ultra` → tighten more. User says `normal mode` / `stop brief` → normal prose for rest of turn only, then resume terse for this skill.

Security warnings + irreversible confirms: full clear sentences. Then resume terse.

Never name or announce this reply style.

## Examples

User: ship this md as pdf  
→ `inkship "/abs/guide.md" --open`  
→ `PDF /abs/guide.pdf. Done.`

User: need pdf and html  
→ `inkship "/abs/guide.md" --pack`  
→ `Pack ready. PDF + HTML beside source.`

User: teach me Kafka from scratch  
→ `inkship learn "Kafka" --level advanced --depth deep`  
→ fill scaffold from prompt → `inkship "/abs/kafka-path.md" --pack`  
→ `Path filled, 3 levels. PDF /abs/kafka-path.pdf.`
