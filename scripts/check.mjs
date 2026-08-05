/**
 * Self-check: run `node scripts/check.mjs`.
 * Covers the non-obvious logic — level ladder, papers gating, dump polish,
 * frontmatter parsing. Fails loud if any of it drifts.
 */

import assert from "assert";
import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import {
  buildPath,
  buildPrompt,
  ladderFor,
  loadConfig,
  mergeConfig,
  sectionEnabled,
  wantsPapers,
  writeUnlessEdited,
} from "./learn.mjs";
import { DEFAULT_CONFIG } from "./learn.default.mjs";
import { slugify, parseFrontmatter, polishMarkdown, injectAutoToc } from "./pncsy.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log("ok  " + name);
}

check("ladder stops at target level", () => {
  assert.deepStrictEqual(ladderFor("basic"), ["basic"]);
  assert.deepStrictEqual(ladderFor("advanced"), ["basic", "intermediate", "advanced"]);
  assert.strictEqual(ladderFor("expert").length, 4);
});

check("papers gate on depth or advanced target", () => {
  assert.strictEqual(wantsPapers("expert", "quick"), false, "quick never ships papers");
  assert.strictEqual(wantsPapers("basic", "deep"), true, "deep always ships papers");
  assert.strictEqual(wantsPapers("basic", "standard"), false);
  assert.strictEqual(wantsPapers("advanced", "standard"), true);
});

check("scaffold keeps required sections", () => {
  const md = buildPath({ topic: "Graph Theory", level: "advanced", depth: "standard" });
  for (const heading of [
    "## Snapshot",
    "## Prerequisites",
    "## Level 1 — Basic",
    "## Level 3 — Advanced",
    "## Videos and courses",
    "## Research papers",
    "## Common traps",
    "## Glossary",
  ]) {
    assert.ok(md.includes(heading), "missing " + heading);
  }
  assert.ok(!md.includes("## Level 4"), "ladder overshot target");
});

check("quick scaffold drops papers section", () => {
  const md = buildPath({ topic: "Rust", level: "expert", depth: "quick" });
  assert.ok(!md.includes("## Research papers"));
  assert.ok(md.includes("## Level 4 — Expert"));
});

check("prompt carries params and no-invention rule", () => {
  const p = buildPrompt({ topic: "Kafka", level: "intermediate", depth: "deep" });
  assert.ok(p.includes("| Topic | Kafka |"));
  assert.ok(p.includes("Never invent a title, author, or URL"));
  assert.ok(p.includes("kafka-path.md"), "prompt should name the file it fills");
});

check("scaffold frontmatter parses back out", () => {
  const md = buildPath({ topic: "LangGraph", level: "basic", depth: "quick" });
  const { meta } = parseFrontmatter(md);
  assert.strictEqual(meta.title, "LangGraph — Learning Path");
  assert.strictEqual(meta.kicker, "Learning Path");
  assert.ok(Array.isArray(meta.chips) && meta.chips.includes("Prereqs"));
});

check("polish strips assistant fluff but spares code", () => {
  const out = polishMarkdown(
    ["Sure! Here's a comprehensive guide", "", "# Real Title", "", "```js", "", "", "", "let x = 1;", "```"].join("\n")
  );
  assert.ok(out.startsWith("# Real Title"), "fluff survived: " + out.slice(0, 40));
  assert.ok(out.includes("\n\n\n\nlet x = 1;"), "blank lines inside fence were collapsed");
});

check("auto toc needs three h2 and links match slugs", () => {
  const two = "# T\n\n## One\n\n## Two\n";
  assert.strictEqual(injectAutoToc(two, true), two, "toc added too eagerly");

  const three = "# T\n\nBlurb.\n\n## One\n\n## Two Words\n\n## Three\n";
  const withToc = injectAutoToc(three, true);
  assert.ok(withToc.includes("## Table of contents"));
  assert.ok(withToc.includes("[Two Words](#two-words)"));
  assert.strictEqual(withToc.indexOf("## Table of contents") > withToc.indexOf("Blurb."), true);
});

check("config swaps sections, levels and depth sizing", () => {
  const custom = mergeConfig(DEFAULT_CONFIG, {
    levels: ["novice", "pro"],
    depths: { standard: { concepts: 99 } },
    sections: [
      { id: "ladder", title: "Stage {{n}} — {{levelTitle}}", repeat: "levels", body: "{{concepts}} concepts" },
      { id: "custom", title: "Interview questions", body: "_q_" },
    ],
  });

  const md = buildPath({ topic: "SQL", level: "pro", depth: "standard" }, custom);
  assert.ok(md.includes("## Stage 1 — Novice"));
  assert.ok(md.includes("## Stage 2 — Pro"));
  assert.ok(md.includes("## Interview questions"));
  assert.ok(md.includes("99 concepts"), "depth override did not reach the template");
  assert.ok(!md.includes("## Glossary"), "replaced section list still leaking defaults");

  // Untouched depths survive a partial override
  assert.strictEqual(custom.depths.deep.concepts, DEFAULT_CONFIG.depths.deep.concepts);
  assert.strictEqual(custom.depths.standard.resources, DEFAULT_CONFIG.depths.standard.resources);
});

check("section gate honours depths, minLevel and the exclude veto", () => {
  const gated = { id: "x", when: { depths: ["deep"], minLevel: "advanced" } };
  assert.strictEqual(sectionEnabled(gated, "basic", "deep"), true);
  assert.strictEqual(sectionEnabled(gated, "advanced", "quick"), true);
  assert.strictEqual(sectionEnabled(gated, "basic", "quick"), false);
  assert.strictEqual(sectionEnabled({ id: "y" }, "basic", "quick"), true);

  const vetoed = { id: "z", when: { ...gated.when, excludeDepths: ["quick"] } };
  assert.strictEqual(sectionEnabled(vetoed, "expert", "quick"), false, "veto lost to minLevel");
  assert.strictEqual(sectionEnabled(vetoed, "expert", "deep"), true);

  // Renaming levels must not silently open every gated section
  const renamed = mergeConfig(DEFAULT_CONFIG, { levels: ["beginner", "working"] });
  assert.strictEqual(sectionEnabled(gated, "working", "standard", renamed), false);
});

check("prompt lists the sections it must fill", () => {
  const p = buildPrompt({ topic: "Redis", level: "basic", depth: "quick" });
  assert.ok(p.includes("## Sections to fill"));
  assert.ok(p.includes("- Snapshot"));
  assert.ok(!p.includes("- Research papers"), "gated section leaked into prompt");

  const laddered = buildPrompt({ topic: "Redis", level: "advanced", depth: "standard" });
  assert.ok(laddered.includes("- Level 1 — Basic"), "repeat section not expanded per level");
  assert.ok(laddered.includes("- Level 3 — Advanced"));
  assert.ok(!laddered.includes("Level N"), "placeholder leaked into prompt");
});

check("config file loads and falls back to built-in", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pncsy-cfg-"));
  const file = path.join(dir, "pncsy.learn.json");
  try {
    fs.writeFileSync(file, JSON.stringify({ kicker: "Syllabus" }), "utf8");
    const { config, source } = loadConfig(file);
    assert.strictEqual(config.kicker, "Syllabus");
    assert.strictEqual(source, file);
    assert.ok(config.sections.length > 0, "defaults dropped on partial config");

    const fallback = loadConfig(null);
    assert.ok(fallback.config.kicker.length > 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

check("edited prompt survives a re-run unless forced", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pncsy-check-"));
  const file = path.join(dir, "topic-path.prompt.md");
  try {
    assert.strictEqual(writeUnlessEdited(file, "generated", false), "wrote");
    fs.writeFileSync(file, "my edits", "utf8");

    assert.strictEqual(writeUnlessEdited(file, "generated", false), "kept");
    assert.strictEqual(fs.readFileSync(file, "utf8"), "my edits", "re-run clobbered edits");

    assert.strictEqual(writeUnlessEdited(file, "generated", true), "wrote");
    assert.strictEqual(fs.readFileSync(file, "utf8"), "generated", "--force did not overwrite");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

check("slugify matches heading anchors", () => {
  assert.strictEqual(slugify("Level 1 — Basic!"), "level-1-basic");
});

// learn ships twice — bash for the no-Node install, Node for config/--ship.
// Same flags must give byte-identical files or curl users get a different tool.
check("bash and node learn agree byte for byte", () => {
  const scripts = path.dirname(fileURLToPath(import.meta.url));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pncsy-parity-"));
  const combos = [
    ["basic", "quick"],
    ["intermediate", "standard"],
    ["advanced", "deep"],
    ["expert", "standard"],
  ];
  try {
    for (const [level, depth] of combos) {
      const sh = path.join(dir, `sh-${level}-${depth}`);
      const js = path.join(dir, `js-${level}-${depth}`);
      const args = ["Kafka Streams", "--level", level, "--depth", depth, "-o"];

      const a = spawnSync("bash", [path.join(scripts, "learn.sh"), ...args, sh]);
      assert.strictEqual(a.status, 0, `learn.sh failed: ${a.stderr}`);
      const b = spawnSync(process.execPath, [path.join(scripts, "pncsy.mjs"), "learn", ...args, js]);
      assert.strictEqual(b.status, 0, `learn.mjs failed: ${b.stderr}`);

      for (const name of ["kafka-streams-path.md", "kafka-streams-path.prompt.md"]) {
        assert.strictEqual(
          fs.readFileSync(path.join(sh, name), "utf8"),
          fs.readFileSync(path.join(js, name), "utf8"),
          `${name} drifted at ${level}/${depth}`
        );
      }
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

console.log(`\n${passed} checks passed`);
