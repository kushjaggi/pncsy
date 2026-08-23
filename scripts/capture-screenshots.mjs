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
  const slug = "omnivoice-indian-speech-finetuning-path";
  const pathFile = path.join(demoDir, `${slug}.md`);
  if (!fs.existsSync(pathFile)) {
    throw new Error("Missing checked-in demo: " + pathFile);
  }

  const ship = spawnSync("node", [path.join(ROOT, "scripts", "pncsy.mjs"), pathFile, "--pack"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (ship.status !== 0) process.exit(ship.status || 1);

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
      html: path.join(demoDir, `${slug}.html`),
      selector: ".cover",
      width: 900,
      height: 700,
    });
    await shotPage(browser, {
      name: "content-page",
      html: path.join(demoDir, `${slug}.html`),
      width: 900,
      height: 760,
      scrollTo: "#level-2-intermediate",
    });

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
<span class="g">$</span> <span class="w">pncsy learn</span> <span class="p">"OmniVoice Indian Speech Finetuning"</span> <span class="c">--level advanced --depth deep</span><br>
<span class="d">Path   omnivoice-indian-speech-finetuning-path.md  [wrote]</span><br>
<span class="d">Prompt omnivoice-indian-speech-finetuning-path.prompt.md  [wrote]</span><br>
<span class="d">… agent fills Hindi, Hinglish, Indian English, tag data, training, and evaluation …</span><br><br>
<span class="g">$</span> <span class="w">pncsy check</span> <span class="p">omnivoice-indian-speech-finetuning-path.md</span> <span class="c">--strict</span><br>
<span class="d">OK    contract kept</span><br><br>
<span class="g">$</span> <span class="w">pncsy node</span> <span class="p">omnivoice-indian-speech-finetuning-path.md</span> <span class="c">--pack</span><br>
<span class="d">HTML omnivoice-indian-speech-finetuning-path.html</span><br>
<span class="d">PDF  omnivoice-indian-speech-finetuning-path.pdf</span>
      </div></body></html>`,
      { width: 980, height: 330 }
    );

    await shotHtml(
      browser,
      "project-docs",
      `<!DOCTYPE html><html><head><style>
        body{margin:0;background:#0d1117;font-family:Menlo,Monaco,monospace;font-size:13px;padding:18px 20px;color:#e6edf3;line-height:1.65}
        .g{color:#7ee787}.c{color:#79c0ff}.w{color:#ffa657}.p{color:#a5d6ff}.d{color:#8b949e}
        .bar{height:28px;background:#161b22;border-radius:8px 8px 0 0;border:1px solid #30363d;border-bottom:none;display:flex;align-items:center;padding:0 12px;gap:6px}
        .dot{width:10px;height:10px;border-radius:50%}.r{background:#ff5f57}.y{background:#febc2e}.g2{background:#28c840}
        .term{border:1px solid #30363d;border-radius:0 0 8px 8px;padding:14px 16px}.cmd{display:inline-block;width:210px}
      </style></head><body>
      <div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g2"></span></div>
      <div class="term">
<span class="g">$</span> <span class="w">pncsy --help</span><br><br>
<span class="c">Project docs</span> <span class="d">(scaffold + fill prompt + check contract)</span><br>
<span class="p cmd">pncsy adr "&lt;decision&gt;"</span> what was chosen, and what lost<br>
<span class="p cmd">pncsy arch ["&lt;system&gt;"]</span> components, boundaries, invariants<br>
<span class="p cmd">pncsy flow "&lt;path&gt;"</span> execution trace, entry to exit<br>
<span class="p cmd">pncsy constraints</span> what must never change<br>
<span class="p cmd">pncsy bug "&lt;symptom&gt;"</span> root cause, blast radius, proof<br>
<span class="p cmd">pncsy handover ["&lt;label&gt;"]</span> done, in flight, single next step<br><br>
<span class="g">$</span> <span class="w">pncsy adr</span> <span class="p">"Use Postgres over DynamoDB"</span><br>
<span class="d">Doc    use-postgres-over-dynamodb-adr.md  [wrote]</span><br>
<span class="d">Prompt use-postgres-over-dynamodb-adr.prompt.md  [wrote]</span>
      </div></body></html>`,
      { width: 840, height: 360 }
    );
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
