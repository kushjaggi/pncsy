/**
 * pncsy learn — generate a fixed-structure learning path scaffold + its prompt.
 * No API keys: the scaffold is deterministic, the agent fills it using the prompt.
 * Structure comes from config — see learn.default.mjs and `--init-config`.
 */

import fs from "fs";
import os from "os";
import path from "path";
import { DEFAULT_CONFIG } from "./learn.default.mjs";

export const CONFIG_NAME = "pncsy.learn.json";

const CONFIG_LOOKUP = [
  path.join(process.cwd(), CONFIG_NAME),
  path.join(os.homedir(), ".config", "pncsy", "learn.json"),
];

function titleCase(s) {
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

function slug(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function pathSlug(text) {
  return slug(text) || `u-${Buffer.from(String(text)).toString("hex").slice(0, 12)}`;
}

function markerEscape(text) {
  return String(text)
    .replace(/%/g, "%25")
    .replace(/"/g, "%22")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E");
}

/** Top-level keys replace; `depths` merges per depth so you can retune one. */
export function mergeConfig(base, override) {
  if (!override) return base;
  const out = { ...base, ...override };
  if (override.depths) {
    out.depths = { ...base.depths };
    for (const [k, v] of Object.entries(override.depths)) {
      out.depths[k] = { ...(base.depths[k] || {}), ...v };
    }
  }
  if (override.depthGuidance) {
    out.depthGuidance = { ...base.depthGuidance, ...override.depthGuidance };
  }
  return out;
}

export function loadConfig(explicitPath) {
  const candidates = explicitPath ? [path.resolve(explicitPath)] : CONFIG_LOOKUP;
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (err) {
      console.error("Bad config " + file + ": " + err.message);
      process.exit(1);
    }
    return { config: mergeConfig(DEFAULT_CONFIG, parsed), source: file };
  }
  if (explicitPath) {
    console.error("Config not found: " + path.resolve(explicitPath));
    process.exit(1);
  }
  return { config: DEFAULT_CONFIG, source: "built-in" };
}

function fill(str, vars) {
  return String(str).replace(/\{\{(\w+)\}\}/g, (m, key) =>
    key in vars ? String(vars[key]) : m
  );
}

export function ladderFor(level, config = DEFAULT_CONFIG) {
  return config.levels.slice(0, config.levels.indexOf(level) + 1);
}

function depthRules(depth, config) {
  return config.depths[depth] || {};
}

/** A section rides along when it has no gate, or when depth or level clears it. */
export function sectionEnabled(section, level, depth, config = DEFAULT_CONFIG) {
  const gate = section.when;
  if (!gate) return true;
  if (Array.isArray(gate.excludeDepths) && gate.excludeDepths.includes(depth)) return false;
  if (Array.isArray(gate.depths) && gate.depths.includes(depth)) return true;
  if (gate.minLevel) {
    const floor = config.levels.indexOf(gate.minLevel);
    // A minLevel that no longer exists (renamed levels) must not open the gate
    if (floor === -1) return false;
    return config.levels.indexOf(level) >= floor;
  }
  return false;
}

export function wantsPapers(level, depth, config = DEFAULT_CONFIG) {
  const papers = config.sections.find((s) => s.id === "papers");
  if (!papers) return false;
  return sectionEnabled(papers, level, depth, config);
}

function baseVars({ topic, level, depth }, config) {
  const rules = depthRules(depth, config);
  return {
    topic,
    level,
    levelTitle: titleCase(level),
    depth,
    depthGuidance: (config.depthGuidance || {})[depth] || "",
    ladder: ladderFor(level, config).join(", "),
    concepts: rules.concepts ?? "",
    resources: rules.resources ?? "",
    traps: rules.traps ?? "",
    glossary: rules.glossary ?? "",
  };
}

function renderSection(section, vars) {
  const parts = [];
  if (section.title) parts.push("## " + fill(section.title, vars) + "\n");
  if (section.note) parts.push("<!-- " + fill(section.note, vars) + " -->\n");
  if (section.body) parts.push(fill(section.body, vars) + "\n");
  return parts.join("\n");
}

function renderChips(config, ladder) {
  const out = [];
  for (const chip of config.chips || []) {
    if (chip === "{{levels}}") out.push(...ladder.map(titleCase));
    else out.push(chip);
  }
  return out;
}

export function buildPath(opts, config = DEFAULT_CONFIG) {
  const { topic, level, depth, configSource = "" } = opts;
  const ladder = ladderFor(level, config);
  const vars = baseVars(opts, config);

  const blocks = [];
  for (const section of config.sections) {
    if (!sectionEnabled(section, level, depth, config)) continue;
    if (section.repeat === "levels") {
      ladder.forEach((lvl, i) => {
        blocks.push(
          renderSection(section, { ...vars, n: i + 1, levelTitle: titleCase(lvl), level: lvl })
        );
      });
    } else {
      blocks.push(renderSection(section, vars));
    }
  }

  const intro = config.intro || {};
  const introBlock = [
    intro.note ? "<!-- " + fill(intro.note, vars) + " -->\n" : "",
    intro.body ? fill(intro.body, vars) + "\n" : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `---
title: ${topic} — Learning Path
subtitle: ${titleCase(level)} track, ${depth} depth
kicker: ${config.kicker}
chips: [${renderChips(config, ladder).join(", ")}]
format: pdf
---

<!-- pncsy:learn topic="${markerEscape(topic)}" level="${level}" depth="${depth}" config="${markerEscape(configSource)}" encoding="percent" -->
<!-- Fill with the sibling .prompt.md file. Keep every heading and its order. -->

# ${topic} — Learning Path

${introBlock}
${blocks.join("\n")}`;
}

export function buildPrompt(opts, config = DEFAULT_CONFIG) {
  const { topic, level, depth } = opts;
  const ladder = ladderFor(level, config);
  const rules = depthRules(depth, config);
  const papers = wantsPapers(level, depth, config);
  const vars = baseVars(opts, config);

  const ruleList = [
    ...(config.promptRules || []),
    ...(papers ? config.promptRulesWhenPapers || [] : []),
  ].map((r, i) => `${i + 1}. ${fill(r, vars)}`);

  const sectionList = config.sections
    .filter((s) => sectionEnabled(s, level, depth, config))
    .flatMap((s) => {
      if (!s.title) return [s.id];
      if (s.repeat === "levels") {
        return ladder.map((lvl, i) =>
          fill(s.title, { ...vars, n: i + 1, levelTitle: titleCase(lvl), level: lvl })
        );
      }
      return [fill(s.title, vars)];
    })
    .map((t) => "- " + t)
    .join("\n");

  return `# Fill prompt — ${topic} learning path

Edit this file to change the plan, then re-run the fill. Structure is fixed on purpose: same topic, same shape, every time, any model.

## Task

Fill \`${pathSlug(topic)}-path.md\` in place. Keep every heading and its order. Replace italic placeholders and the example table rows. Delete the guidance comments as you go, but keep the \`pncsy:learn\` line — \`pncsy check\` needs it to verify the result.

## Parameters

| Setting | Value |
|---------|-------|
| Topic | ${topic} |
| Target level | ${level} |
| Depth | ${depth} |
| Levels to cover | ${ladder.join(", ")} |
| Concepts per level | ${rules.concepts ?? "-"} |
| Resources per level | ${rules.resources ?? "-"} |
| Traps | ${rules.traps ?? "-"} |
| Glossary terms | ${rules.glossary ?? "-"} |
| Research papers section | ${papers ? "yes" : "no"} |

## Sections to fill

${sectionList}

## Rules

${ruleList.join("\n")}

## Ship it

\`\`\`bash
pncsy node "${pathSlug(topic)}-path.md" --pack --open
\`\`\`
`;
}

function usage(code = 1) {
  console.error(`pncsy learn "<topic>" [options]

Generate a fixed-structure learning path scaffold plus the prompt that fills it.

Options:
  --level <x>     ${DEFAULT_CONFIG.levels.join(" | ")}   (default: intermediate)
  --depth <x>     ${Object.keys(DEFAULT_CONFIG.depths).join(" | ")}   (default: standard)
  -o, --output <dir|file>   Where to write (default: cwd)
  --config <file> Use a specific config (default: ./${CONFIG_NAME}, then ~/.config/pncsy/learn.json)
  --init-config   Write an editable ${CONFIG_NAME} and exit
  --force         Overwrite existing files (default: keep them)
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
    config: null,
    initConfig: false,
    force: false,
  };
  const value = (name, i) => {
    if (!args[i + 1] || args[i + 1].startsWith("-")) {
      console.error(name + " needs a value");
      usage(1);
    }
    return args[i + 1];
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-h" || a === "--help") usage(0);
    else if (a === "--level") {
      opts.level = value(a, i).toLowerCase();
      i++;
    } else if (a === "--depth") {
      opts.depth = value(a, i).toLowerCase();
      i++;
    } else if (a === "-o" || a === "--output") {
      opts.output = value(a, i);
      i++;
    } else if (a === "--config") {
      opts.config = value(a, i);
      i++;
    } else if (a === "--init-config") opts.initConfig = true;
    else if (a === "--force") opts.force = true;
    else if (a.startsWith("-")) {
      console.error("Unknown option: " + a);
      usage(1);
    } else if (!opts.topic) opts.topic = a;
    else opts.topic += " " + a;
  }

  return opts;
}

function validate(opts, config) {
  if (!opts.topic) usage(1);
  if (/[\r\n]/.test(opts.topic)) {
    console.error("Topic must be one line");
    process.exit(1);
  }
  if (!config.levels.includes(opts.level)) {
    console.error("Bad level. Use: " + config.levels.join(" | "));
    process.exit(1);
  }
  if (!config.depths[opts.depth]) {
    console.error("Bad depth. Use: " + Object.keys(config.depths).join(" | "));
    process.exit(1);
  }
}

function resolveTargets(opts) {
  const base = `${pathSlug(opts.topic)}-path`;
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

/** Existing files hold edits — a filled path or a tuned prompt. Keep unless forced. */
export function writeUnlessEdited(file, contents, force) {
  if (!force && fs.existsSync(file)) return "kept";
  fs.writeFileSync(file, contents, "utf8");
  return "wrote";
}

function initConfig(opts) {
  const target = path.resolve(
    opts.output && !/\.md$/i.test(opts.output) ? opts.output : process.cwd(),
    CONFIG_NAME
  );
  const state = writeUnlessEdited(
    target,
    JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n",
    opts.force
  );
  console.error("Config " + target + "  [" + state + "]");
  if (state === "kept") console.error("Note   existing config left alone. --force to reset.");
  else console.error("Next   edit sections/levels/depths, then run: pncsy learn \"<topic>\"");
}

export async function runLearn(args) {
  const opts = parseLearnArgs(args);

  if (opts.initConfig) return initConfig(opts);

  const { config, source } = loadConfig(opts.config);
  validate(opts, config);

  const generated = { ...opts, configSource: source === "built-in" ? "" : source };
  const { pathFile, promptFile } = resolveTargets(opts);
  const pathState = writeUnlessEdited(pathFile, buildPath(generated, config), opts.force);
  const promptState = writeUnlessEdited(promptFile, buildPrompt(opts, config), opts.force);

  console.error("Path   " + pathFile + "  [" + pathState + "]");
  console.error("Prompt " + promptFile + "  [" + promptState + "]");
  console.error("Config " + source);
  if (pathState === "kept" || promptState === "kept") {
    console.error("Note   existing files left alone. --force to regenerate.");
  }
  console.error("Next   fill path using prompt, then: pncsy node \"" + pathFile + "\" --pack");
}
