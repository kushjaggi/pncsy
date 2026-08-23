---
title: Repo links sample
subtitle: Clickable GitHub paths in PDF
repo_base: https://github.com/kushjaggi/pncsy/blob/main
repo_tree: https://github.com/kushjaggi/pncsy/tree/main
repo_paths: scripts, examples, bin
format: pack
---

# Repo links sample

When `repo_base` is set in frontmatter, backtick repo paths become clickable links in PDF and HTML.

## Source map

| Area | File |
|------|------|
| Ship CLI | `scripts/pncsy.mjs` |
| Theme | `scripts/theme.css` |
| Examples | `examples/` |

## Appendix URLs

- Official repository: https://github.com/kushjaggi/pncsy
- Paper example: https://arxiv.org/abs/2604.00688

```mermaid
flowchart LR
  A["Markdown paths"] --> B["linkifyRepoPaths"]
  B --> C["Clickable PDF links"]
```
