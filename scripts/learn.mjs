/**
 * inkship learn — generate a fixed-structure learning path scaffold + its prompt.
 * No API keys: the scaffold is deterministic, the agent fills it using the prompt.
 */

import fs from "fs";
import path from "path";

export const LEVELS = ["basic", "intermediate", "advanced", "expert"];
export const DEPTHS = ["quick", "standard", "deep"];

const LEVEL_TITLES = {
  basic: "Basic",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

const DEPTH_RULES = {
  quick: { concepts: 3, resources: 2, traps: 3, glossary: 8, papers: false },
  standard: { concepts: 5, resources: 3, traps: 5, glossary: 12, papers: null },
  deep: { concepts: 8, resources: 5, traps: 8, glossary: 20, papers: true },
};

function slug(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function usage(code = 1) {
  console.error(`inkship learn "<topic>" [options]

Generate a fixed-structure learning path scaffold plus the prompt that fills it.

Options:
  --level <x>     basic | intermediate | advanced | expert   (default: intermediate)
  --depth <x>     quick | standard | deep                    (default: standard)
  -o, --output <dir|file>   Where to write (default: cwd)
  --ship          Render PDF right after scaffolding
  --open          Open result (implies --ship)
  -h, --help
`);
  process.exit(code);
}

export function parseLearnArgs(args) {
  const opts = {
    topic: null,
    level: "intermediate",
    depth: "standard",
    output: null,
    ship: false,
    open: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-h" || a === "--help") usage(0);
    else if (a === "--level" && args[i + 1]) opts.level = args[++i].toLowerCase();
    else if (a === "--depth" && args[i + 1]) opts.depth = args[++i].toLowerCase();
    else if ((a === "-o" || a === "--output") && args[i + 1]) opts.output = args[++i];
    else if (a === "--ship") opts.ship = true;
    else if (a === "--open") {
      opts.open = true;
      opts.ship = true;
    } else if (a.startsWith("-")) {
      console.error("Unknown option: " + a);
      usage(1);
    } else if (!opts.topic) opts.topic = a;
    else opts.topic += " " + a;
  }

  if (!opts.topic) usage(1);
  if (!LEVELS.includes(opts.level)) {
    console.error("Bad level. Use: " + LEVELS.join(" | "));
    process.exit(1);
  }
  if (!DEPTHS.includes(opts.depth)) {
    console.error("Bad depth. Use: " + DEPTHS.join(" | "));
    process.exit(1);
  }
  return opts;
}

/** Ladder runs from basic up to the requested level. */
export function ladderFor(level) {
  return LEVELS.slice(0, LEVELS.indexOf(level) + 1);
}

/** Papers ride along on deep runs, or once the target reaches advanced. */
export function wantsPapers(level, depth) {
  const rule = DEPTH_RULES[depth].papers;
  if (rule !== null) return rule;
  return LEVELS.indexOf(level) >= LEVELS.indexOf("advanced");
}

export function buildPath({ topic, level, depth }) {
  const ladder = ladderFor(level);
  const rules = DEPTH_RULES[depth];
  const papers = wantsPapers(level, depth);

  const chips = ["Prereqs", ...ladder.map((l) => LEVEL_TITLES[l]), "Traps"];

  const levelSections = ladder
    .map((l, i) => {
      const name = LEVEL_TITLES[l];
      return `## Level ${i + 1} — ${name}

<!-- Goals: what the learner can do after this level. 2-4 bullets, each verifiable. -->

### Goals

- _goal_
- _goal_

<!-- Concepts: ${rules.concepts} items. One line each: term, then why it matters. -->

### Core concepts

- **_concept_** — _why it matters_

<!-- Resources: ${rules.resources} items. Name + author/channel + what to skip. Mark unverified links (verify). -->

### Resources

| Type | Resource | Why | Time |
|------|----------|-----|------|
| Doc | _name_ | _reason_ | _hrs_ |

### Do this

- _one hands-on task that proves the goals_
`;
    })
    .join("\n");

  const papersSection = papers
    ? `## Research papers

<!-- Canonical papers only. Format: Title (Authors, Year) — one-line takeaway. Add (verify) if unsure. -->

| Paper | Year | Read for |
|-------|------|----------|
| _title_ | _year_ | _takeaway_ |

`
    : "";

  return `---
title: ${topic} — Learning Path
subtitle: ${LEVEL_TITLES[level]} track, ${depth} depth
kicker: Learning Path
chips: [${chips.join(", ")}]
format: pdf
---

<!-- inkship:learn topic="${topic}" level="${level}" depth="${depth}" -->
<!-- Fill with the sibling .prompt.md file. Keep every heading and its order. -->

# ${topic} — Learning Path

<!-- One paragraph: what this is, who it is for, honest time to competence. -->

_Snapshot paragraph._

## Snapshot

| Field | Value |
|-------|-------|
| Topic | ${topic} |
| Target level | ${LEVEL_TITLES[level]} |
| Depth | ${depth} |
| Time to target | _fill_ |
| Assumes you know | _fill_ |

## Prerequisites

<!-- What must already be true. Add a self-check question per prerequisite. -->

| Prerequisite | Self-check |
|--------------|------------|
| _skill_ | _question that proves it_ |

${levelSections}
## Videos and courses

<!-- ${rules.resources} entries. Say what to watch and what to skip. Mark unverified (verify). -->

| Resource | Creator | Watch for | Skip |
|----------|---------|-----------|------|
| _title_ | _who_ | _what_ | _what_ |

${papersSection}## Common traps

<!-- ${rules.traps} entries. Symptom the learner sees, then the real cause. -->

| Trap | What actually breaks | Fix |
|------|----------------------|-----|
| _trap_ | _cause_ | _fix_ |

## Glossary

<!-- ${rules.glossary} terms. Plain-language definition, no circular wording. -->

| Term | Meaning |
|------|---------|
| _term_ | _meaning_ |

## Next

- _what to learn after this path_
`;
}

export function buildPrompt({ topic, level, depth }) {
  const ladder = ladderFor(level);
  const rules = DEPTH_RULES[depth];
  const papers = wantsPapers(level, depth);

  return `# Fill prompt — ${topic} learning path

Edit this file to change the plan, then re-run the fill. Structure is fixed on purpose: same topic, same shape, every time, any model.

## Task

Fill \`${slug(topic)}-path.md\` in place. Keep every heading and its order. Replace italic placeholders and the example table rows. Delete the HTML comments as you go.

## Parameters

| Setting | Value |
|---------|-------|
| Topic | ${topic} |
| Target level | ${level} |
| Depth | ${depth} |
| Levels to cover | ${ladder.join(", ")} |
| Concepts per level | ${rules.concepts} |
| Resources per level | ${rules.resources} |
| Traps | ${rules.traps} |
| Glossary terms | ${rules.glossary} |
| Research papers section | ${papers ? "yes" : "no"} |

## Rules

1. Ladder runs ${ladder[0]} to ${ladder[ladder.length - 1]}. Each level must be usable on its own.
2. Every level goal is verifiable — the learner can prove it with a task, not a feeling.
3. Resources: canonical and well known. Give author or channel, and say what to skip.
4. Never invent a title, author, or URL. Unsure means append \`(verify)\` to that row.
${papers ? "5. Papers: title, authors, year, one-line takeaway. Classics over recent unless the field moved.\n" : ""}${papers ? "6" : "5"}. Traps name the symptom the learner sees, then the real cause underneath.
${papers ? "7" : "6"}. Glossary definitions are plain language and non-circular.
${papers ? "8" : "7"}. Depth \`${depth}\`: ${depth === "quick" ? "shortest useful path, links over prose" : depth === "deep" ? "include derivations, edge cases, and why-it-works reasoning" : "balance explanation and links"}.
${papers ? "9" : "8"}. No filler openings, no motivational padding. Substance only.

## Ship it

\`\`\`bash
inkship "${slug(topic)}-path.md" --pack --open
\`\`\`
`;
}

function resolveTargets(opts) {
  const base = `${slug(opts.topic)}-path`;
  let dir = process.cwd();
  let name = base;

  if (opts.output) {
    const out = path.resolve(opts.output);
    if (fs.existsSync(out) && fs.statSync(out).isDirectory()) {
      dir = out;
    } else if (/\.md$/i.test(out)) {
      dir = path.dirname(out);
      name = path.basename(out).replace(/\.md$/i, "");
    } else {
      dir = out;
    }
  }

  fs.mkdirSync(dir, { recursive: true });
  return {
    pathFile: path.join(dir, name + ".md"),
    promptFile: path.join(dir, name + ".prompt.md"),
  };
}

export async function runLearn(args) {
  const opts = parseLearnArgs(args);
  const { pathFile, promptFile } = resolveTargets(opts);

  fs.writeFileSync(pathFile, buildPath(opts), "utf8");
  fs.writeFileSync(promptFile, buildPrompt(opts), "utf8");

  console.error("Path   " + pathFile);
  console.error("Prompt " + promptFile);
  console.error("Next   fill path using prompt, then: inkship \"" + pathFile + "\" --pack");

  if (opts.ship) {
    const { shipFiles } = await import("./inkship.mjs");
    await shipFiles(pathFile, { format: "pdf", open: opts.open });
  }
}
