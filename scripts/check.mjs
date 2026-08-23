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
import { slugify, parseFrontmatter, polishMarkdown, injectAutoToc, linkifyRepoPaths, linkifyCodeInHtml, tagExternalLinks, wrapMermaid, wrapFigureSections, wrapPartHeadings, buildTocGroups, compactTocGroups, dotPathToSlash, listMarkdownFiles, escapeRawHtml, stripContractMarkers, prepareDirectoryOutput, resolveOutputBase } from "./pncsy.mjs";

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
  const md = buildPath({ topic: "OmniVoice", level: "basic", depth: "quick" });
  const { meta } = parseFrontmatter(md);
  assert.strictEqual(meta.title, "OmniVoice — Learning Path");
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

check("raw Markdown HTML is escaped unless explicitly allowed", () => {
  const escaped = escapeRawHtml({ text: '<script>globalThis.pwned = true</script>' });
  assert.ok(!escaped.includes("<script>"), "executable tag survived");
  assert.ok(escaped.includes("&lt;script&gt;"), "raw HTML was dropped instead of shown safely");
});

check("contract markers stay out of output but survive code examples", () => {
  const marker = '<!-- pncsy:learn topic="Kafka" -->';
  const md = `${marker}\n# Path\n\n\`\`\`html\n${marker}\n\`\`\``;
  const stripped = stripContractMarkers(md);
  assert.ok(stripped.startsWith("# Path"), "top-level marker survived");
  assert.ok(stripped.includes(`\`\`\`html\n${marker}`), "marker inside code fence was deleted");
});

check("HTML shipping does not execute raw Markdown scripts by default", () => {
  const scripts = path.dirname(fileURLToPath(import.meta.url));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pncsy-html-"));
  try {
    const input = path.join(dir, "unsafe.md");
    const output = path.join(dir, "safe.html");
    fs.writeFileSync(input, "# Safe\n\n<script>globalThis.PNCSY_PWNED = true</script>\n");
    const shipped = spawnSync(process.execPath, [
      path.join(scripts, "pncsy.mjs"),
      input,
      "--html",
      "-o",
      output,
    ]);
    assert.strictEqual(shipped.status, 0, shipped.stderr.toString());
    const html = fs.readFileSync(output, "utf8");
    assert.ok(!html.includes("<script>globalThis.PNCSY_PWNED"), "attacker script stayed executable");
    assert.ok(html.includes("&lt;script&gt;"), "unsafe HTML was not shown safely");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
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

check("linkify repo paths only when repo_base is set", () => {
  const md = "See `src/foo.py` and `vendor/b.py`";
  assert.strictEqual(linkifyRepoPaths(md, {}), md);
  const linked = linkifyRepoPaths(md, {
    repo_base: "https://github.com/o/r/blob/main",
  });
  assert.ok(linked.includes("[`src/foo.py`](https://github.com/o/r/blob/main/src/foo.py)"));
  assert.ok(!linked.includes("blob/main/vendor/b.py"), "outside default prefixes should stay plain");
});

check("linkify respects repo_paths and directory tree urls", () => {
  const md = "`src/a.py` `docs/guide.md` `examples/`";
  const fm = {
    repo_base: "https://github.com/o/r/blob/main",
    repo_tree: "https://github.com/o/r/tree/main",
    repo_paths: "src, examples",
  };
  const out = linkifyRepoPaths(md, fm);
  assert.ok(out.includes("blob/main/src/a.py"));
  assert.ok(!out.includes("blob/main/docs/guide.md"));
  assert.ok(out.includes("tree/main/examples/"));
});

check("linkify skips fenced code blocks", () => {
  const md = "Use `src/a.py`\n\n```py\n# `src/secret.py`\n```\n";
  const out = linkifyRepoPaths(md, { repo_base: "https://github.com/o/r/blob/main" });
  assert.ok(out.includes("[`src/a.py`]"));
  assert.ok(out.includes("`src/secret.py`") && !out.includes("blob/main/src/secret.py"));
});

check("tagExternalLinks adds repo and paper classes", () => {
  const html =
    '<a href="https://github.com/x/y">x</a> <a href="https://arxiv.org/abs/1234.5678">p</a>';
  const out = tagExternalLinks(html);
  assert.ok(out.includes('class="repo-link"'));
  assert.ok(out.includes('class="paper-link"'));
});

check("wrapMermaid uses diagram-block wrapper", () => {
  const html = '<pre><code class="language-mermaid">flowchart TD\nA-->B</code></pre>';
  const out = wrapMermaid(html);
  assert.ok(out.includes('class="diagram-block"'));
  assert.ok(out.includes('class="mermaid"'));
  assert.ok(out.includes("flowchart LR"), "simple chains should flip to LR");
});

check("dot paths become slash repo links", () => {
  assert.strictEqual(dotPathToSlash("omnivoice.utils.audio"), "omnivoice/utils/audio.py");
  assert.strictEqual(
    dotPathToSlash("omnivoice.models.omnivoice.py"),
    "omnivoice/models/omnivoice.py"
  );
  const html = "<p>See <code>omnivoice.utils.audio</code> for details.</p>";
  const out = linkifyCodeInHtml(html, {
    repo_base: "https://github.com/o/r/blob/main",
    repo_paths: "omnivoice",
  });
  assert.ok(out.includes('class="repo-link"'));
  assert.ok(out.includes("blob/main/omnivoice/utils/audio.py"));
});

check("figure sections wrap heading and diagram", () => {
  const html =
    '<h3 id="x">Pipeline</h3><div class="diagram-block"><div class="mermaid">flowchart LR\nA-->B</div></div>';
  const out = wrapFigureSections(html);
  assert.ok(out.includes('class="figure-section"'));
  assert.ok(out.includes('diagram-label">Pipeline'));
  const withIntro =
    '<h3 id="y">Intro</h3><p>Lead-in text.</p><div class="diagram-block"><div class="mermaid">flowchart LR\nA-->B</div></div>';
  const ordered = wrapFigureSections(withIntro);
  assert.ok(ordered.indexOf("Lead-in text") < ordered.indexOf("figure-section"));
});

check("toc groups long lists into phased grid", () => {
  const items =
    "<li><a href=\"#a\">0. Orientation</a></li>" +
    "<li><a href=\"#b\">PART A — Foundations</a></li>" +
    "<li><a href=\"#c\">7. Codebooks</a></li>" +
    "<li><a href=\"#d\">35. Reference</a></li>" +
    "<li><a href=\"#e\">36. More</a></li>";
  const groups = buildTocGroups(items);
  assert.ok(groups.some((g) => g.badge === "A" && g.items.length === 1), "PART title is the group header");
  const ref = groups.find((g) => g.badge === "REF");
  assert.ok(ref && ref.items.length <= 2, "appendix collapses to a summary");
});

// The collapsed summary used to hardcode an anchor from an unrelated project,
// so every long TOC shipped a link to a section that did not exist.
check("collapsed toc links only to sections that exist", () => {
  const items = Array.from(
    { length: 9 },
    (_, i) => `<li><a href="#sec-${i}">Section ${i}</a></li>`
  );
  const [group] = compactTocGroups([{ badge: "REF", title: "Appendix", items }]);
  assert.strictEqual(group.items.length, 2, "long REF group should collapse");
  for (const href of group.items.join("").match(/href="[^"]+"/g) || []) {
    assert.ok(items.join("").includes(href), `collapsed toc invented a target: ${href}`);
  }
  assert.ok(group.items[1].includes("8 more sections"), "should say how many are hidden");
});

check("directory shipping skips agent fill prompts", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pncsy-list-"));
  try {
    for (const name of ["guide.md", "guide.prompt.md", "README.MD", "notes.txt"]) {
      fs.writeFileSync(path.join(dir, name), "");
    }
    assert.deepStrictEqual(
      listMarkdownFiles(dir).map((file) => path.basename(file)),
      ["README.MD", "guide.md"]
    );
    assert.deepStrictEqual(
      listMarkdownFiles(path.join(dir, "guide.prompt.md")),
      [path.join(dir, "guide.prompt.md")],
      "an explicitly named prompt should remain shippable"
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

check("directory shipping gives each input a distinct output base", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pncsy-output-"));
  try {
    const input = path.join(dir, "docs");
    const output = path.join(dir, "built");
    fs.mkdirSync(input);
    const opts = prepareDirectoryOutput(input, { output });
    assert.ok(fs.statSync(output).isDirectory(), "output directory was not created");
    assert.strictEqual(resolveOutputBase(path.join(input, "one.md"), opts), path.join(output, "one"));
    assert.strictEqual(resolveOutputBase(path.join(input, "two.md"), opts), path.join(output, "two"));
    assert.throws(
      () => prepareDirectoryOutput(input, { output: path.join(dir, "all.pdf") }),
      /output directory/
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

check("part headings wrap with next section", () => {
  const html =
    '<h2 id="part-a-x">PART A — X</h2><h2 id="sec-1">1. First</h2><p>text</p>';
  const out = wrapPartHeadings(html);
  assert.ok(out.includes('class="part-lead"'));
});

check("print layout and cover structure live in pncsy.mjs", () => {
  const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "pncsy.mjs"), "utf8");
  assert.ok(src.includes("preparePrintLayout"), "missing preparePrintLayout");
  assert.ok(src.includes("cover-brand"), "missing editorial cover brand");
  assert.ok(src.includes("</article>\n  ${scriptsBlock"), "scripts should load after body content");
  assert.ok(src.includes("figure-section"), "missing figure-section wrapper");
  assert.ok(src.includes("toc-map"), "missing grouped toc");
});

// learn ships twice — bash for the no-Node install, Node for custom config.
// Same flags must give byte-identical files or curl users get a different tool.
check("bash and node learn agree byte for byte", () => {
  const scripts = path.dirname(fileURLToPath(import.meta.url));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pncsy-parity-"));
  const combos = [
    ["Kafka Streams", "kafka-streams", "basic", "quick"],
    ["foo_bar", "foo-bar", "intermediate", "standard"],
    ["🔥", "u-f09f94a5", "advanced", "deep"],
    ["C++ templates", "c-templates", "expert", "standard"],
  ];
  try {
    for (const [topic, slug, level, depth] of combos) {
      const sh = path.join(dir, `sh-${level}-${depth}`);
      const js = path.join(dir, `js-${level}-${depth}`);
      const args = [topic, "--level", level, "--depth", depth, "-o"];

      const a = spawnSync("bash", [path.join(scripts, "learn.sh"), ...args, sh]);
      assert.strictEqual(a.status, 0, `learn.sh failed: ${a.stderr}`);
      const b = spawnSync(process.execPath, [path.join(scripts, "pncsy.mjs"), "learn", ...args, js]);
      assert.strictEqual(b.status, 0, `learn.mjs failed: ${b.stderr}`);

      for (const name of [`${slug}-path.md`, `${slug}-path.prompt.md`]) {
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

// The scaffold is only a contract if breaking it is detectable.
check("check-path catches a broken contract", () => {
  const scripts = path.dirname(fileURLToPath(import.meta.url));
  const checker = path.join(scripts, "check-path.sh");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pncsy-check-path-"));
  const run = (file, ...flags) => spawnSync("bash", [checker, path.join(dir, file), ...flags]);
  try {
    const built = spawnSync("bash", [
      path.join(scripts, "learn.sh"), "Kafka Streams",
      "--level", "advanced", "--depth", "standard", "-o", dir,
    ]);
    assert.strictEqual(built.status, 0, `learn.sh failed: ${built.stderr}`);

    const scaffold = fs.readFileSync(path.join(dir, "kafka-streams-path.md"), "utf8");
    assert.strictEqual(run("kafka-streams-path.md").status, 1, "unfilled scaffold passed");

    const filled = scaffold.replace(/_[^_\n]+_/g, "filled").replace(/ \(verify\)/g, "");
    fs.writeFileSync(path.join(dir, "ok.md"), filled, "utf8");
    assert.strictEqual(run("ok.md").status, 0, "a correctly filled path was rejected");

    const noHeading = filled.split("\n").filter((l) => l !== "## Glossary").join("\n");
    fs.writeFileSync(path.join(dir, "no-heading.md"), noHeading, "utf8");
    assert.strictEqual(run("no-heading.md").status, 1, "deleted heading went unnoticed");

    // Dropping the marker is the failure mode the fill prompt used to cause.
    const noMarker = filled.split("\n").filter((l) => !l.includes("pncsy:learn")).join("\n");
    fs.writeFileSync(path.join(dir, "no-marker.md"), noMarker, "utf8");
    assert.strictEqual(run("no-marker.md").status, 2, "missing marker should be uncheckable");

    fs.writeFileSync(path.join(dir, "tagged.md"), filled.replace("## Next", "(verify)\n\n## Next"), "utf8");
    assert.strictEqual(run("tagged.md").status, 0, "verify tags are a warning, not a failure");
    assert.strictEqual(run("tagged.md", "--strict").status, 1, "--strict ignored the warning");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

check("check-path honors the custom config that generated a path", () => {
  const scripts = path.dirname(fileURLToPath(import.meta.url));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pncsy-custom-check-"));
  try {
    const configFile = path.join(dir, "custom.json");
    fs.writeFileSync(
      configFile,
      JSON.stringify({
        sections: [
          ...DEFAULT_CONFIG.sections,
          { id: "review", title: "Review gate", body: "_review proof_" },
        ],
      })
    );
    const built = spawnSync(process.execPath, [
      path.join(scripts, "pncsy.mjs"),
      "learn",
      "Kafka",
      "--config",
      configFile,
      "-o",
      dir,
    ]);
    assert.strictEqual(built.status, 0, built.stderr.toString());

    const file = path.join(dir, "kafka-path.md");
    const filled = fs.readFileSync(file, "utf8").replace(/_[^_\n]+_/g, "filled");
    assert.match(filled, /## Review gate/, "custom section was not generated");
    fs.writeFileSync(file, filled);
    const clean = spawnSync("bash", [path.join(scripts, "check-path.sh"), file]);
    assert.strictEqual(clean.status, 0, clean.stdout.toString() + clean.stderr.toString());

    fs.writeFileSync(file, filled.replace("## Review gate\n", ""));
    const broken = spawnSync("bash", [path.join(scripts, "check-path.sh"), file]);
    assert.strictEqual(broken.status, 1, "custom heading deletion went unnoticed");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Every doc kind rides the same scaffold/fill/check contract as learn. If a new
// kind lands without placeholders, or check cannot rebuild it, this catches it.
check("every doc kind scaffolds and is checkable", () => {
  const scripts = path.dirname(fileURLToPath(import.meta.url));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pncsy-doc-"));
  const kinds = {
    adr: "Use Postgres over DynamoDB",
    arch: "billing service",
    flow: "login request",
    constraints: "",
    bug: "marker deleted on fill",
    handover: "",
  };
  try {
    for (const [kind, subject] of Object.entries(kinds)) {
      const args = subject ? [kind, subject] : [kind];
      const built = spawnSync("bash", [path.join(scripts, "doc.sh"), ...args, "-o", dir]);
      assert.strictEqual(built.status, 0, `${kind} failed: ${built.stderr}`);

      const match = built.stderr.toString().match(/^Doc\s+(.+\.md)\s+\[wrote\]$/m);
      assert.ok(match, `${kind} did not report its output`);
      const file = match[1];
      const base = path.basename(file, ".md");
      assert.ok(fs.existsSync(file), `${kind} wrote no doc`);
      assert.ok(fs.existsSync(path.join(dir, `${base}.prompt.md`)), `${kind} wrote no prompt`);

      const raw = fs.readFileSync(file, "utf8");
      assert.match(raw, new RegExp(`pncsy:${kind}`), `${kind} scaffold has no marker`);
      assert.match(raw, /_[^_\n]+_/, `${kind} scaffold has nothing to fill`);

      const run = (f) => spawnSync("bash", [path.join(scripts, "check-path.sh"), f]).status;
      assert.strictEqual(run(file), 1, `${kind} passed while still unfilled`);

      const filled = path.join(dir, `ok-${base}.md`);
      fs.writeFileSync(filled, raw.replace(/_[^_\n]+_/g, "filled"), "utf8");
      assert.strictEqual(run(filled), 0, `${kind} rejected a complete fill`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// A doc about live code is only true at the commit it described. Docs that
// record history (adr, bug, handover) must not nag when HEAD moves.
check("only code-tracking docs go stale", () => {
  const scripts = path.dirname(fileURLToPath(import.meta.url));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pncsy-rot-"));
  const git = (...a) =>
    spawnSync("git", ["-C", dir, "-c", "user.email=t@t", "-c", "user.name=t", ...a]);
  try {
    git("init", "-q");
    fs.writeFileSync(path.join(dir, "a.txt"), "one", "utf8");
    git("add", "-A");
    git("commit", "-qm", "one");
    const first = spawnSync("git", ["-C", dir, "rev-parse", "--short", "HEAD"]).stdout.toString().trim();
    fs.writeFileSync(path.join(dir, "a.txt"), "two", "utf8");
    git("add", "-A");
    git("commit", "-qm", "two");

    for (const [kind, shouldWarn] of [["arch", true], ["adr", false]]) {
      assert.strictEqual(
        spawnSync("bash", [path.join(scripts, "doc.sh"), kind, "-o", dir]).status, 0);
      const file = path.join(dir, `${kind}.md`);
      const filled = fs
        .readFileSync(file, "utf8")
        .replace(/_[^_\n]+_/g, "filled")
        .replace(/commit="[^"]*"/, `commit="${first}"`);
      fs.writeFileSync(file, filled, "utf8");

      const out = spawnSync("bash", [path.join(scripts, "check-path.sh"), file]);
      assert.strictEqual(out.status, 0, `${kind} should still pass: ${out.stdout}`);
      // Anchor on the report line, not the word — the temp path contains it too.
      assert.strictEqual(
        /^\s*! stale\b/m.test(out.stdout.toString()),
        shouldWarn,
        `${kind} staleness warning should be ${shouldWarn}`
      );
      // Rotted content is a warning by default, a failure when asked.
      const strict = spawnSync("bash", [path.join(scripts, "check-path.sh"), file, "--strict"]);
      assert.strictEqual(strict.status, shouldWarn ? 1 : 0, `${kind} --strict disagreed`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

check("marker metadata round-trips safely and H1 is contractual", () => {
  const scripts = path.dirname(fileURLToPath(import.meta.url));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pncsy-marker-"));
  try {
    const subject = 'Use "strict" --> mode';
    const built = spawnSync("bash", [path.join(scripts, "doc.sh"), "adr", subject, "-o", dir]);
    assert.strictEqual(built.status, 0, built.stderr.toString());
    const file = path.join(dir, "use-strict-mode-adr.md");
    const raw = fs.readFileSync(file, "utf8");
    const marker = raw.split("\n").find((line) => line.includes("pncsy:adr"));
    assert.ok(marker.includes("%22") && marker.includes("%3E"), "unsafe marker metadata was not encoded");
    assert.ok(!marker.includes("--> mode"), "subject terminated the metadata comment");

    const filled = raw.replace(/_[^_\n]+_/g, "filled");
    fs.writeFileSync(file, filled, "utf8");
    const clean = spawnSync("bash", [path.join(scripts, "check-path.sh"), file]);
    assert.strictEqual(clean.status, 0, clean.stdout.toString());
    assert.match(clean.stdout.toString(), /Use "strict" --> mode/, "metadata did not round-trip");

    fs.writeFileSync(file, filled.replace(/^# ADR:.*\n/m, ""), "utf8");
    const missing = spawnSync("bash", [path.join(scripts, "check-path.sh"), file]);
    assert.strictEqual(missing.status, 1, "deleted H1 went unnoticed");
    assert.match(missing.stdout.toString(), /missing heading\s+# ADR:/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

check("unlabelled handovers do not reuse a stale session file", () => {
  const scripts = path.dirname(fileURLToPath(import.meta.url));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pncsy-handover-"));
  try {
    const first = spawnSync("bash", [path.join(scripts, "doc.sh"), "handover", "-o", dir]);
    assert.strictEqual(first.status, 0, first.stderr.toString());
    const firstFile = first.stderr.toString().match(/^Doc\s+(.+\.md)\s+/m)?.[1];
    assert.ok(firstFile && /handover-\d{4}-\d{2}-\d{2}-\d{6}-\d+\.md$/.test(firstFile));

    const second = spawnSync("bash", [path.join(scripts, "doc.sh"), "handover", "-o", dir]);
    const secondFile = second.stderr.toString().match(/^Doc\s+(.+\.md)\s+/m)?.[1];
    assert.notStrictEqual(secondFile, firstFile, "new session kept an old handover");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

check("bash commands reject missing values and unknown setup flags cleanly", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const cli = path.join(root, "bin", "pncsy");
  for (const args of [
    ["learn", "Kafka", "--level"],
    ["adr", "Choose Postgres", "--output"],
    ["setup", "--unknown"],
  ]) {
    const out = spawnSync("bash", [cli, ...args]);
    assert.strictEqual(out.status, 1, `${args.join(" ")} unexpectedly passed`);
    assert.ok(!/unbound variable/.test(out.stderr.toString()), `${args.join(" ")} crashed in bash`);
  }
});

check("dependency fetch stays on the installed release", () => {
  const scripts = path.dirname(fileURLToPath(import.meta.url));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pncsy-fetch-"));
  try {
    fs.mkdirSync(path.join(dir, "scripts"));
    fs.copyFileSync(path.join(scripts, "fetch-deps.mjs"), path.join(dir, "scripts", "fetch-deps.mjs"));
    fs.writeFileSync(path.join(dir, "package.json"), '{"version":"9.8.7"}\n');

    const payload = path.join(dir, "payload");
    for (const name of ["marked", "mermaid", "puppeteer-core", "@viz-js/viz"]) {
      fs.mkdirSync(path.join(payload, "node_modules", name), { recursive: true });
      fs.writeFileSync(path.join(payload, "node_modules", name, "package.json"), "{}\n");
    }
    const archive = path.join(dir, "deps.tar.gz");
    assert.strictEqual(
      spawnSync("tar", ["czf", archive, "-C", payload, "node_modules"]).status,
      0
    );

    const bin = path.join(dir, "bin");
    fs.mkdirSync(bin);
    const log = path.join(dir, "curl.log");
    fs.writeFileSync(
      path.join(bin, "curl"),
      `#!/usr/bin/env bash\nprintf '%s\\n' "$2" > "${log}"\ncp "${archive}" "$4"\n`
    );
    fs.chmodSync(path.join(bin, "curl"), 0o755);
    const out = spawnSync(process.execPath, [path.join(dir, "scripts", "fetch-deps.mjs")], {
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
    });
    assert.strictEqual(out.status, 0, out.stderr.toString());
    assert.match(fs.readFileSync(log, "utf8"), /v9\.8\.7\/pncsy-9\.8\.7-deps\.tar\.gz/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

check("installer upgrades cleanly without deleting fetched dependencies", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pncsy-install-"));
  try {
    const payload = path.join(dir, "payload");
    fs.mkdirSync(path.join(payload, "bin"), { recursive: true });
    fs.mkdirSync(path.join(payload, "scripts"));
    fs.copyFileSync(path.join(root, "bin", "pncsy"), path.join(payload, "bin", "pncsy"));
    fs.writeFileSync(path.join(payload, "package.json"), '{"version":"9.8.7"}\n');
    const archive = path.join(dir, "release.tar.gz");
    assert.strictEqual(spawnSync("tar", ["czf", archive, "-C", payload, "."]).status, 0);

    const home = path.join(dir, "home");
    const installed = path.join(home, ".local", "share", "pncsy");
    fs.mkdirSync(path.join(installed, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(installed, "node_modules", "marked"), { recursive: true });
    fs.writeFileSync(path.join(installed, "scripts", "removed.sh"), "stale\n");
    fs.writeFileSync(path.join(installed, "node_modules", "marked", "package.json"), "{}\n");

    const bin = path.join(dir, "fake-bin");
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, "curl"), "#!/usr/bin/env bash\ncat \"$FIXTURE\"\n");
    fs.chmodSync(path.join(bin, "curl"), 0o755);
    const out = spawnSync("bash", [path.join(root, "scripts", "install.sh")], {
      env: {
        ...process.env,
        HOME: home,
        PATH: `${bin}:${process.env.PATH}`,
        FIXTURE: archive,
        PNCSY_VERSION: "9.8.7",
      },
    });
    assert.strictEqual(out.status, 0, out.stderr.toString());
    assert.ok(!fs.existsSync(path.join(installed, "scripts", "removed.sh")), "stale file survived");
    assert.ok(
      fs.existsSync(path.join(installed, "node_modules", "marked", "package.json")),
      "upgrade deleted separately fetched dependencies"
    );
    assert.ok(fs.existsSync(path.join(home, ".local", "bin", "pncsy")), "wrapper missing");

    const sourceRoot = path.join(dir, "source");
    fs.mkdirSync(path.join(sourceRoot, "pncsy-main"), { recursive: true });
    fs.cpSync(payload, path.join(sourceRoot, "pncsy-main"), { recursive: true });
    const sourceArchive = path.join(dir, "source.tar.gz");
    assert.strictEqual(
      spawnSync("tar", ["czf", sourceArchive, "-C", sourceRoot, "pncsy-main"]).status,
      0
    );
    fs.writeFileSync(
      path.join(bin, "curl"),
      '#!/usr/bin/env bash\n[[ "$*" == *api.github.com* ]] && exit 22\ncat "$SOURCE_FIXTURE"\n'
    );
    const fallbackHome = path.join(dir, "fallback-home");
    const fallback = spawnSync("bash", [path.join(root, "scripts", "install.sh")], {
      env: {
        ...process.env,
        HOME: fallbackHome,
        PATH: `${bin}:${process.env.PATH}`,
        SOURCE_FIXTURE: sourceArchive,
      },
    });
    assert.strictEqual(fallback.status, 0, fallback.stderr.toString());
    assert.ok(
      fs.existsSync(path.join(fallbackHome, ".local", "share", "pncsy", "bin", "pncsy")),
      "source fallback did not install the extracted repository root"
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// The fill instructions must not tell the agent to delete what check-path reads.
check("fill prompt protects the marker", () => {
  const prompt = buildPrompt({ topic: "Kafka Streams", level: "advanced", depth: "standard" });
  assert.match(prompt, /pncsy:learn/, "prompt never mentions keeping the marker");
});

console.log(`\n${passed} checks passed`);
