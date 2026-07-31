/**
 * Default learning path config.
 * `inkship learn --init-config` dumps this as JSON for editing.
 *
 * Tokens usable in any string: {{topic}} {{level}} {{levelTitle}} {{depth}}
 * {{n}} {{concepts}} {{resources}} {{traps}} {{glossary}} {{ladder}}
 *
 * Section keys:
 *   id      required, unique
 *   title   heading text (omit for a section that renders body only)
 *   note    guidance emitted as an HTML comment — invisible in the PDF
 *   body    markdown
 *   repeat  "levels" to emit one block per level in the ladder
 *   when    { depths: [...], minLevel: "advanced", excludeDepths: [...] }
 *           include if depth or level matches; excludeDepths vetoes either way
 */

export const DEFAULT_CONFIG = {
  levels: ["basic", "intermediate", "advanced", "expert"],

  depths: {
    quick: { concepts: 3, resources: 2, traps: 3, glossary: 8 },
    standard: { concepts: 5, resources: 3, traps: 5, glossary: 12 },
    deep: { concepts: 8, resources: 5, traps: 8, glossary: 20 },
  },

  depthGuidance: {
    quick: "shortest useful path, links over prose",
    standard: "balance explanation and links",
    deep: "include derivations, edge cases, and why-it-works reasoning",
  },

  kicker: "Learning Path",
  chips: ["Prereqs", "{{levels}}", "Traps"],

  intro: {
    note: "One paragraph: what this is, who it is for, honest time to competence.",
    body: "_Snapshot paragraph._",
  },

  sections: [
    {
      id: "snapshot",
      title: "Snapshot",
      body: `| Field | Value |
|-------|-------|
| Topic | {{topic}} |
| Target level | {{levelTitle}} |
| Depth | {{depth}} |
| Time to target | _fill_ |
| Assumes you know | _fill_ |`,
    },
    {
      id: "prerequisites",
      title: "Prerequisites",
      note: "What must already be true. Add a self-check question per prerequisite.",
      body: `| Prerequisite | Self-check |
|--------------|------------|
| _skill_ | _question that proves it_ |`,
    },
    {
      id: "ladder",
      title: "Level {{n}} — {{levelTitle}}",
      repeat: "levels",
      note: "Goals: what the learner can do after this level. 2-4 bullets, each verifiable.",
      body: `### Goals

- _goal_
- _goal_

<!-- Concepts: {{concepts}} items. One line each: term, then why it matters. -->

### Core concepts

- **_concept_** — _why it matters_

<!-- Resources: {{resources}} items. Name + author/channel + what to skip. Mark unverified links (verify). -->

### Resources

| Type | Resource | Why | Time |
|------|----------|-----|------|
| Doc | _name_ | _reason_ | _hrs_ |

### Do this

- _one hands-on task that proves the goals_`,
    },
    {
      id: "videos",
      title: "Videos and courses",
      note: "{{resources}} entries. Say what to watch and what to skip. Mark unverified (verify).",
      body: `| Resource | Creator | Watch for | Skip |
|----------|---------|-----------|------|
| _title_ | _who_ | _what_ | _what_ |`,
    },
    {
      id: "papers",
      title: "Research papers",
      when: { depths: ["deep"], minLevel: "advanced", excludeDepths: ["quick"] },
      note: "Canonical papers only. Format: Title (Authors, Year) — one-line takeaway. Add (verify) if unsure.",
      body: `| Paper | Year | Read for |
|-------|------|----------|
| _title_ | _year_ | _takeaway_ |`,
    },
    {
      id: "traps",
      title: "Common traps",
      note: "{{traps}} entries. Symptom the learner sees, then the real cause.",
      body: `| Trap | What actually breaks | Fix |
|------|----------------------|-----|
| _trap_ | _cause_ | _fix_ |`,
    },
    {
      id: "glossary",
      title: "Glossary",
      note: "{{glossary}} terms. Plain-language definition, no circular wording.",
      body: `| Term | Meaning |
|------|---------|
| _term_ | _meaning_ |`,
    },
    {
      id: "next",
      title: "Next",
      body: "- _what to learn after this path_",
    },
  ],

  promptRules: [
    "Ladder runs {{ladder}}. Each level must be usable on its own.",
    "Every level goal is verifiable — the learner can prove it with a task, not a feeling.",
    "Resources: canonical and well known. Give author or channel, and say what to skip.",
    "Never invent a title, author, or URL. Unsure means append `(verify)` to that row.",
    "Traps name the symptom the learner sees, then the real cause underneath.",
    "Glossary definitions are plain language and non-circular.",
    "Depth `{{depth}}`: {{depthGuidance}}.",
    "No filler openings, no motivational padding. Substance only.",
  ],

  promptRulesWhenPapers: [
    "Papers: title, authors, year, one-line takeaway. Classics over recent unless the field moved.",
  ],
};
