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

async function main() {
  if (!fs.existsSync(CHROME)) {
    console.error("Chrome required for screenshots:", CHROME);
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });

  // 1. Generate demo learning path scaffold
  const demoDir = path.join(ROOT, "examples", "demo");
  fs.mkdirSync(demoDir, { recursive: true });

  const learn = spawnSync(
    "node",
    [path.join(ROOT, "scripts", "pncsy.mjs"), "learn", "LangGraph", "--level", "intermediate", "--depth", "standard", "-o", demoDir, "--force"],
    { cwd: ROOT, stdio: "inherit" }
  );
  if (learn.status !== 0) process.exit(learn.status || 1);

  // 2. Fill demo path with realistic content (so screenshots look real)
  const pathFile = path.join(demoDir, "langgraph-path.md");
  fs.writeFileSync(
    pathFile,
    DEMO_PATH,
    "utf8"
  );

  // 3. Ship to HTML + PDF
  const ship = spawnSync(
    "node",
    [path.join(ROOT, "scripts", "pncsy.mjs"), pathFile, "--pack"],
    { cwd: ROOT, stdio: "inherit" }
  );
  if (ship.status !== 0) process.exit(ship.status || 1);

  const sampleShip = spawnSync(
    "node",
    [path.join(ROOT, "scripts", "pncsy.mjs"), path.join(ROOT, "examples", "sample.md"), "--pack"],
    { cwd: ROOT, stdio: "inherit" }
  );
  if (sampleShip.status !== 0) process.exit(sampleShip.status || 1);

  const require = createRequire(path.join(ROOT, "package.json"));
  const puppeteer = require("puppeteer-core");

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const shots = [
    {
      name: "cover-page",
      html: path.join(demoDir, "langgraph-path.html"),
      selector: ".cover",
      width: 900,
      height: 700,
    },
    {
      name: "content-page",
      html: path.join(demoDir, "langgraph-path.html"),
      selector: ".content",
      width: 900,
      height: 900,
      clip: true,
    },
    {
      name: "mermaid-diagram",
      html: path.join(ROOT, "examples", "sample.html"),
      selector: ".mermaid",
      width: 800,
      height: 400,
    },
    {
      name: "toc-and-tables",
      html: path.join(demoDir, "langgraph-path.html"),
      selector: ".toc-box, table",
      width: 900,
      height: 600,
      fullPage: false,
      scrollTo: ".toc-box",
    },
  ];

  try {
    const page = await browser.newPage();
    for (const shot of shots) {
      if (!fs.existsSync(shot.html)) {
        console.warn("Skip", shot.name, "- missing", shot.html);
        continue;
      }
      await page.setViewport({ width: shot.width, height: shot.height, deviceScaleFactor: 2 });
      await page.goto(pathToFileURL(shot.html).href, {
        waitUntil: "networkidle0",
        timeout: 120000,
      });
      await page.waitForFunction(
        () => document.documentElement.getAttribute("data-mermaid-ready") === "true",
        { timeout: 60000 }
      ).catch(() => {});
      await new Promise((r) => setTimeout(r, 500));

      const outPath = path.join(OUT, shot.name + ".png");

      if (shot.scrollTo) {
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) el.scrollIntoView({ block: "start" });
        }, shot.scrollTo);
        await new Promise((r) => setTimeout(r, 300));
      }

      const el = shot.selector ? await page.$(shot.selector) : null;
      if (el) {
        await el.screenshot({ path: outPath });
      } else {
        await page.screenshot({ path: outPath, fullPage: shot.fullPage ?? false });
      }
      console.log("Wrote", outPath);
    }
  } finally {
    await browser.close();
  }

  // CLI terminal-style screenshot (text image via simple HTML)
  const cliHtml = `<!DOCTYPE html><html><head><style>
    body{margin:0;background:#1e1e1e;font-family:Menlo,Monaco,monospace;font-size:13px;padding:20px;color:#d4d4d4;line-height:1.5}
    .g{color:#6a9955}.c{color:#9cdcfe}.w{color:#dcdcaa}.p{color:#ce9178}
  </style></head><body>
<span class="g">$</span> <span class="w">pncsy learn</span> <span class="p">"LangGraph"</span> <span class="c">--level advanced --depth deep</span><br>
Path   langgraph-path.md  [wrote]<br>
Prompt langgraph-path.prompt.md  [wrote]<br><br>
<span class="g">$</span> <span class="w">pncsy</span> langgraph-path.md <span class="c">--pack --open</span><br>
HTML langgraph-path.html<br>
PDF  langgraph-path.pdf<br>
Done langgraph-path.pdf
</body></html>`;
  const cliPath = path.join(OUT, "_cli.html");
  fs.writeFileSync(cliPath, cliHtml);
  const page = await puppeteer.launch({ executablePath: CHROME, headless: true }).then((b) => b.newPage());
  await page.setViewport({ width: 720, height: 200, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(cliPath).href);
  await page.screenshot({ path: path.join(OUT, "cli-demo.png") });
  await page.browser().close();
  fs.unlinkSync(cliPath);
  console.log("Wrote", path.join(OUT, "cli-demo.png"));
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
