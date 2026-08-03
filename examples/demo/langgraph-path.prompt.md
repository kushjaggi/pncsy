# Fill prompt — LangGraph learning path

Edit this file to change the plan, then re-run the fill. Structure is fixed on purpose: same topic, same shape, every time, any model.

## Task

Fill `langgraph-path.md` in place. Keep every heading and its order. Replace italic placeholders and the example table rows. Delete the HTML comments as you go.

## Parameters

| Setting | Value |
|---------|-------|
| Topic | LangGraph |
| Target level | intermediate |
| Depth | standard |
| Levels to cover | basic, intermediate |
| Concepts per level | 5 |
| Resources per level | 3 |
| Traps | 5 |
| Glossary terms | 12 |
| Research papers section | no |

## Sections to fill

- Snapshot
- Prerequisites
- Level 1 — Basic
- Level 2 — Intermediate
- Videos and courses
- Common traps
- Glossary
- Next

## Rules

1. Ladder runs basic, intermediate. Each level must be usable on its own.
2. Every level goal is verifiable — the learner can prove it with a task, not a feeling.
3. Resources: canonical and well known. Give author or channel, and say what to skip.
4. Never invent a title, author, or URL. Unsure means append `(verify)` to that row.
5. Traps name the symptom the learner sees, then the real cause underneath.
6. Glossary definitions are plain language and non-circular.
7. Depth `standard`: balance explanation and links.
8. No filler openings, no motivational padding. Substance only.

## Ship it

```bash
pncsy "langgraph-path.md" --pack --open
```
