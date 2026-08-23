# Fill prompt — OmniVoice Indian Speech Finetuning learning path

Edit this file to change the plan, then re-run the fill. Structure is fixed on purpose: same topic, same shape, every time, any model.

## Task

Fill `omnivoice-indian-speech-finetuning-path.md` in place. Keep every heading and its order. Replace italic placeholders and example table rows. Delete instructional HTML comments, but keep the `pncsy:learn` contract marker.

## Parameters

| Setting | Value |
|---------|-------|
| Topic | OmniVoice Indian Speech Finetuning |
| Target level | advanced |
| Depth | deep |
| Levels to cover | basic, intermediate, advanced |
| Concepts per level | 8 |
| Resources per level | 5 |
| Traps | 8 |
| Glossary terms | 20 |
| Research papers section | yes |

## Sections to fill

- Snapshot
- Prerequisites
- Level 1 — Basic
- Level 2 — Intermediate
- Level 3 — Advanced
- Videos and courses
- Research papers
- Common traps
- Glossary
- Next

## Research boundary

Use the official `k2-fsa/OmniVoice` repository, model card, documentation, examples, and paper as primary sources. Hindi is listed upstream as language ID `hi`. Do not describe Hinglish as an official OmniVoice language or promise Indian-English accent behavior without a cited upstream source. Treat both as adaptation and evaluation targets. The upstream collaborator guidance in issue #53 supports adding tags by fine-tuning on reliably annotated data; it does not guarantee a specific result.

## Rules

1. Ladder runs basic, intermediate, advanced. Each level must be usable on its own.
2. Every level goal is verifiable through a dataset artifact, run, metric, or listening test.
3. Resources must use verified titles and URLs. Prefer official upstream material.
4. Never invent an API, config field, path, model capability, paper title, author, or URL.
5. Distinguish documented upstream behavior from proposed experiment design.
6. Traps name the visible symptom and the underlying data or evaluation failure.
7. Glossary definitions are plain language and non-circular.
8. Depth `deep`: include edge cases, evaluation slices, and why each control exists.
9. Papers include title, year, link, and one concrete reason to read.
10. No filler openings or motivational padding.

## Ship it

```bash
pncsy check "omnivoice-indian-speech-finetuning-path.md" --strict
pncsy node "omnivoice-indian-speech-finetuning-path.md" --pack --open
```
