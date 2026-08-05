#!/usr/bin/env node
/**
 * Generate README screenshots from pncsy HTML output.
 * Run: node scripts/capture-screenshots.mjs
 */

import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath, pathToFileURL } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "screenshots");

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function shotPage(browser, { name, html, selector, width, height, scrollTo }) {
  if (!fs.existsSync(html)) {
    console.warn("Skip", name, "- missing", html);
    return;
  }
  const page = await browser.newPage();
  try {
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.goto(pathToFileURL(html).href, { waitUntil: "networkidle0", timeout: 120000 });
    await page
      .waitForFunction(() => document.documentElement.getAttribute("data-mermaid-ready") === "true", {
        timeout: 60000,
      })
      .catch(() => {});
    await new Promise((r) => setTimeout(r, 500));

    if (scrollTo) {
      await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "start" }), scrollTo);
      await new Promise((r) => setTimeout(r, 300));
    }

    const outPath = path.join(OUT, name + ".png");
    const el = selector ? await page.$(selector) : null;
    if (el) await el.screenshot({ path: outPath });
    else await page.screenshot({ path: outPath });
    console.log("Wrote", outPath);
  } finally {
    await page.close();
  }
}

async function shotHtml(browser, name, html, { width = 720, height = 320 } = {}) {
  const tmp = path.join(OUT, `_${name}.html`);
  fs.writeFileSync(tmp, html);
  const page = await browser.newPage();
  try {
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.goto(pathToFileURL(tmp).href);
    await page.screenshot({ path: path.join(OUT, name + ".png") });
    console.log("Wrote", path.join(OUT, name + ".png"));
  } finally {
    await page.close();
    fs.unlinkSync(tmp);
  }
}

async function main() {
  if (!fs.existsSync(CHROME)) {
    console.error("Chrome required for screenshots:", CHROME);
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });

  const demoDir = path.join(ROOT, "examples", "demo");
  fs.mkdirSync(demoDir, { recursive: true });

  const learn = spawnSync("bash", [path.join(ROOT, "scripts", "learn.sh"), "LangGraph", "--level", "intermediate", "--depth", "standard", "-o", demoDir, "--force"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (learn.status !== 0) process.exit(learn.status || 1);

  const pathFile = path.join(demoDir, "langgraph-path.md");
  fs.writeFileSync(pathFile, DEMO_PATH, "utf8");

  for (const args of [[pathFile, "--pack"], [path.join(ROOT, "examples", "sample.md"), "--pack"]]) {
    const ship = spawnSync("node", [path.join(ROOT, "scripts", "pncsy.mjs"), ...args], { cwd: ROOT, stdio: "inherit" });
    if (ship.status !== 0) process.exit(ship.status || 1);
  }

  const require = createRequire(path.join(ROOT, "package.json"));
  const puppeteer = require("puppeteer-core");
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  try {
    await shotPage(browser, {
      name: "cover-page",
      html: path.join(demoDir, "langgraph-path.html"),
      selector: ".cover",
      width: 900,
      height: 700,
    });
    await shotPage(browser, {
      name: "content-page",
      html: path.join(demoDir, "langgraph-path.html"),
      selector: ".content",
      width: 900,
      height: 900,
    });
    await shotPage(browser, {
      name: "mermaid-diagram",
      html: path.join(ROOT, "examples", "sample.html"),
      selector: ".mermaid",
      width: 800,
      height: 400,
    });
    await shotPage(browser, {
      name: "toc-and-tables",
      html: path.join(demoDir, "langgraph-path.html"),
      selector: ".toc-box",
      width: 900,
      height: 600,
      scrollTo: ".toc-box",
    });

    await shotHtml(
      browser,
      "install-demo",
      `<!DOCTYPE html><html><head><style>
        body{margin:0;background:#0d1117;font-family:Menlo,Monaco,monospace;font-size:12.5px;padding:18px 20px;color:#e6edf3;line-height:1.55}
        .g{color:#7ee787}.c{color:#79c0ff}.w{color:#ffa657}.p{color:#a5d6ff}.d{color:#8b949e}
        .bar{height:28px;background:#161b22;border-radius:8px 8px 0 0;border:1px solid #30363d;border-bottom:none;display:flex;align-items:center;padding:0 12px;gap:6px}
        .dot{width:10px;height:10px;border-radius:50%}.r{background:#ff5f57}.y{background:#febc2e}.g2{background:#28c840}
        .term{border:1px solid #30363d;border-radius:0 0 8px 8px;padding:14px 16px}
      </style></head><body>
      <div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g2"></span></div>
      <div class="term">
<span class="g">$</span> <span class="w">curl -fsSL</span> <span class="p">https://raw.githubusercontent.com/kushjaggi/pncsy/main/scripts/install.sh</span> <span class="c">| bash</span><br>
<span class="d">→ downloading pncsy v1.0.4…</span><br>
<span class="d">✓ pncsy installed → ~/.local/bin/pncsy  (no Node required)</span><br><br>
<span class="g">$</span> <span class="w">pncsy learn</span> <span class="p">"LangGraph"</span> <span class="c">--level advanced --depth deep</span><br>
<span class="d">Path   langgraph-path.md  [wrote]</span><br>
<span class="d">Prompt langgraph-path.prompt.md  [wrote]</span>
      </div></body></html>`,
      { width: 760, height: 210 }
    );

    await shotHtml(
      browser,
      "cli-demo",
      `<!DOCTYPE html><html><head><style>
        body{margin:0;background:#0d1117;font-family:Menlo,Monaco,monospace;font-size:12.5px;padding:18px 20px;color:#e6edf3;line-height:1.55}
        .g{color:#7ee787}.c{color:#79c0ff}.w{color:#ffa657}.p{color:#a5d6ff}.d{color:#8b949e}
        .bar{height:28px;background:#161b22;border-radius:8px 8px 0 0;border:1px solid #30363d;border-bottom:none;display:flex;align-items:center;padding:0 12px;gap:6px}
        .dot{width:10px;height:10px;border-radius:50%}.r{background:#ff5f57}.y{background:#febc2e}.g2{background:#28c840}
        .term{border:1px solid #30363d;border-radius:0 0 8px 8px;padding:14px 16px}
      </style></head><body>
      <div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g2"></span></div>
      <div class="term">
<span class="g">$</span> <span class="w">pncsy setup --node</span><br>
<span class="d">✓ node stack ready — try: pncsy node file.md --pack</span><br><br>
<span class="g">$</span> <span class="w">pncsy node</span> <span class="p">langgraph-path.md</span> <span class="c">--pack --open</span><br>
<span class="d">HTML langgraph-path.html</span><br>
<span class="d">PDF  langgraph-path.pdf</span>
      </div></body></html>`,
      { width: 760, height: 200 }
    );
  } finally {
    await browser.close();
  }
}

const DEMO_PATH = `---
title: LangGraph — Learning Path
subtitle: Intermediate track, standard depth
kicker: Learning Path
chips: [Prereqs, Basic, Intermediate, Traps]
format: pdf
---

# LangGraph — Learning Path

Build stateful agent workflows as graphs: nodes, edges, shared state, tool loops, memory, and human approval. This path takes you from first graph to production-shaped patterns.

## Snapshot

| Field | Value |
|-------|-------|
| Topic | LangGraph |
| Target level | Intermediate |
| Depth | standard |
| Time to target | 2–4 weeks (5–8 hrs/week) |
| Assumes you know | Python basics, what an LLM API call is |

## Prerequisites

| Prerequisite | Self-check |
|--------------|------------|
| Python 3.10+ | Can you run \`pip install\` and import a package? |
| Basic LLM calls | Have you called ChatGPT/OpenAI API once? |
| JSON & dicts | Can you explain what a TypedDict is for? |

## Level 1 — Basic

### Goals

- Explain State, Node, Edge in one sentence each
- Run a one-node graph START → chatbot → END
- Read \`invoke()\` output and find messages in state

### Core concepts

- **State** — shared bag of data every node reads/writes
- **Node** — one function: state in, partial update out
- **Edge** — who runs next (fixed or conditional)
- **Reducer** — how list fields merge (e.g. \`add_messages\`)
- **compile()** — turn graph definition into runnable app

### Resources

| Type | Resource | Why | Time |
|------|----------|-----|------|
| Doc | LangGraph quickstart | Official minimal graph | 1h |
| Video | LangChain LangGraph intro (verify) | Visual walkthrough | 45m |

### Do this

Build a 1-node chatbot graph. User says hi, model replies. Print final message.

## Level 2 — Intermediate

### Goals

- Wire two nodes with a fixed edge (pipeline)
- Add a conditional edge (branch on state)
- Run a tool-calling loop with ToolNode

### Core concepts

- **Fixed edges** — assembly-line steps
- **Conditional edges** — router function picks next node
- **ToolNode** — executes model tool calls
- **tools_condition** — route to tools or END
- **recursion_limit** — cap agent loops

### Resources

| Type | Resource | Why | Time |
|------|----------|-----|------|
| Doc | LangGraph agents tutorial | Tool loop pattern | 2h |
| Doc | Conditional edges guide | Branching graphs | 1h |

### Do this

Agent that can multiply two numbers via a tool. Max 5 tool rounds.

## Videos and courses

| Resource | Creator | Watch for | Skip |
|----------|---------|-----------|------|
| LangGraph 101 playlist (verify) | LangChain | graph mental model | marketing intros |
| ReAct agent deep dive (verify) | community | tool loop debugging | outdated API bits |

## Common traps

| Trap | What actually breaks | Fix |
|------|----------------------|-----|
| History vanishes | No \`add_messages\` reducer | Annotate messages with reducer |
| Infinite tool loop | Router always → tools | Check tool_calls on last message |
| "Memory broken" | New thread_id each turn | Reuse \`configurable.thread_id\` |

## Glossary

| Term | Meaning |
|------|---------|
| State | Shared data for one run |
| Node | One step in the graph |
| Edge | Transition to next step |
| Checkpointer | Persists state between steps |
| Thread ID | Which conversation to load |
| Interrupt | Pause for human input |

## Next

- Checkpointer + multi-turn memory
- Human-in-the-loop before risky actions
- Subgraphs for multi-agent systems
`;

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
