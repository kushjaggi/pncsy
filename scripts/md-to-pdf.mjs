#!/usr/bin/env node
/**
 * Convert Markdown → styled PDF.
 * Deps install into this package only — never the folder of the .md file.
 *
 * Usage:
 *   mdpdf <input.md> [-o out.pdf] [--subtitle "..."] [--open]
 *   node scripts/md-to-pdf.mjs <input.md> ...
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(__dirname, "..");
const THEME_PATH = path.join(__dirname, "theme.css");

const DEFAULT_CHROMES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

function usage(code = 1) {
  console.error(`Usage: node md-to-pdf.mjs <input.md> [options]

Options:
  -o, --output <path>     Output PDF path (default: <input>.pdf)
  --subtitle <text>       Cover subtitle
  --kicker <text>         Cover eyebrow (default: Document)
  --chips <a,b,c>         Cover chips (comma-separated)
  --meta <text>           Cover meta line
  --no-cover              Skip cover page
  --no-html               Delete intermediate HTML after PDF
  --open                  Open PDF when done
  --chrome <path>         Chrome/Chromium binary
`);
  process.exit(code);
}

function parseArgs(argv) {
  const opts = {
    input: null,
    output: null,
    subtitle: "",
    kicker: "Document",
    chips: [],
    meta: "",
    cover: true,
    keepHtml: true,
    open: false,
    chrome: null,
  };

  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-h" || a === "--help") usage(0);
    else if ((a === "-o" || a === "--output") && args[i + 1]) opts.output = args[++i];
    else if (a === "--subtitle" && args[i + 1]) opts.subtitle = args[++i];
    else if (a === "--kicker" && args[i + 1]) opts.kicker = args[++i];
    else if (a === "--chips" && args[i + 1])
      opts.chips = args[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--meta" && args[i + 1]) opts.meta = args[++i];
    else if (a === "--no-cover") opts.cover = false;
    else if (a === "--no-html") opts.keepHtml = false;
    else if (a === "--open") opts.open = true;
    else if (a === "--chrome" && args[i + 1]) opts.chrome = args[++i];
    else if (a.startsWith("-")) {
      console.error("Unknown option:", a);
      usage(1);
    } else if (!opts.input) opts.input = a;
    else {
      console.error("Unexpected argument:", a);
      usage(1);
    }
  }

  if (!opts.input) usage(1);
  return opts;
}

function ensureDeps() {
  const marker = path.join(SKILL_ROOT, "node_modules", "marked", "package.json");
  if (fs.existsSync(marker)) return;

  console.error("[mdpdf] Installing package deps (one-time, this repo only)…");
  const r = spawnSync("npm", ["install", "--omit=dev", "--no-fund", "--no-audit"], {
    cwd: SKILL_ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    console.error("[mdpdf] npm install failed in", SKILL_ROOT);
    process.exit(1);
  }
}

function findChrome(explicit) {
  const candidates = explicit ? [explicit, ...DEFAULT_CHROMES] : DEFAULT_CHROMES;
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return null;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractTitle(md) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "Document";
}

function wrapMermaid(html) {
  return html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (_, code) => {
      const decoded = code
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"');
      return `<div class="diagram-label">Diagram</div><div class="mermaid">${decoded}</div>`;
    }
  );
}

function wrapToc(html) {
  return html.replace(
    /<h2[^>]*>Table of contents<\/h2>\s*<ol>([\s\S]*?)<\/ol>/i,
    (_m, items) =>
      `<div class="toc-box"><h2>Table of contents</h2><ol>${items}</ol></div>`
  );
}

async function loadMarked() {
  const require = createRequire(path.join(SKILL_ROOT, "package.json"));
  const mod = require("marked");
  return mod.marked || mod;
}

async function loadPuppeteer() {
  const require = createRequire(path.join(SKILL_ROOT, "package.json"));
  return require("puppeteer-core");
}

function resolveMermaidJs() {
  const candidates = [
    path.join(SKILL_ROOT, "node_modules", "mermaid", "dist", "mermaid.min.js"),
    path.join(SKILL_ROOT, "node_modules", "mermaid", "dist", "mermaid.js"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return fs.readFileSync(c, "utf8");
  }
  return null;
}

function renderCover({ title, opts }) {
  if (!opts.cover) return "";
  const chips = opts.chips
    .map((c) => `<span class="cover-chip">${escapeHtml(c)}</span>`)
    .join("\n");
  const subtitle = opts.subtitle
    ? `<p class="subtitle">${escapeHtml(opts.subtitle)}</p>`
    : "";
  const meta = opts.meta
    ? `<p class="cover-meta">${escapeHtml(opts.meta)}</p>`
    : "";
  const chipRow = chips ? `<div class="cover-path">${chips}</div>` : "";

  return `<header class="cover">
      <div class="cover-kicker">${escapeHtml(opts.kicker)}</div>
      <h1>${escapeHtml(title)}</h1>
      ${subtitle}
      ${chipRow}
      ${meta}
    </header>`;
}

async function main() {
  const opts = parseArgs(process.argv);
  const input = path.resolve(opts.input);
  if (!fs.existsSync(input)) {
    console.error("Input not found:", input);
    process.exit(1);
  }

  ensureDeps();

  const chrome = findChrome(opts.chrome);
  if (!chrome) {
    console.error(
      "Chrome/Chromium not found. Install Chrome or pass --chrome /path/to/binary"
    );
    process.exit(1);
  }

  const marked = await loadMarked();
  if (typeof marked.setOptions === "function") {
    marked.setOptions({ gfm: true, breaks: false });
  } else if (typeof marked?.marked?.setOptions === "function") {
    marked.marked.setOptions({ gfm: true, breaks: false });
  }

  const parse =
    typeof marked.parse === "function"
      ? marked.parse.bind(marked)
      : typeof marked === "function"
        ? marked
        : marked.marked.parse.bind(marked.marked);

  const puppeteer = await loadPuppeteer();

  const md = fs.readFileSync(input, "utf8");
  const css = fs.readFileSync(THEME_PATH, "utf8");
  const title = extractTitle(md);
  const bodyMd = md.replace(/^#\s+.+\n+/, "");
  let body = parse(bodyMd);
  body = wrapMermaid(body);
  body = wrapToc(body);

  const mermaidJs = resolveMermaidJs();
  const mermaidBlock = mermaidJs
    ? `<script>${mermaidJs}</script>
  <script>
    (async function () {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            primaryColor: "#e6f3f2",
            primaryTextColor: "#1a2332",
            primaryBorderColor: "#0f6e6a",
            lineColor: "#5a6577",
            secondaryColor: "#f0f2f6",
            tertiaryColor: "#ffffff",
            fontFamily: "Avenir Next, Segoe UI, Helvetica, Arial, sans-serif"
          },
          flowchart: { curve: "basis", htmlLabels: true },
          securityLevel: "loose"
        });
        await mermaid.run({ querySelector: ".mermaid" });
      } catch (e) {
        console.error(e);
      }
      document.documentElement.setAttribute("data-mermaid-ready", "true");
    })();
  </script>`
    : `<script>document.documentElement.setAttribute("data-mermaid-ready", "true");</script>`;

  const sourceName = path.basename(input);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${css}</style>
  ${mermaidBlock}
</head>
<body>
  <article class="page">
    ${renderCover({ title, opts })}
    <div class="content">
      ${body}
    </div>
    <p class="footer-note">Generated from ${escapeHtml(sourceName)}</p>
  </article>
</body>
</html>`;

  const outPdf = path.resolve(
    opts.output || input.replace(/\.md$/i, ".pdf")
  );
  const outHtml = outPdf.replace(/\.pdf$/i, ".html");

  fs.writeFileSync(outHtml, html, "utf8");
  console.log("Wrote", outHtml);

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(outHtml).href, {
      waitUntil: "networkidle0",
      timeout: 120000,
    });

    try {
      await page.waitForFunction(
        () =>
          document.documentElement.getAttribute("data-mermaid-ready") ===
          "true",
        { timeout: 60000 }
      );
    } catch {
      console.warn("Mermaid ready timed out — printing anyway");
    }

    await new Promise((r) => setTimeout(r, 500));

    const footerTitle = escapeHtml(title).slice(0, 60);
    await page.pdf({
      path: outPdf,
      format: "A4",
      printBackground: true,
      margin: {
        top: "14mm",
        right: "12mm",
        bottom: "16mm",
        left: "12mm",
      },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="width:100%;font-size:9px;color:#5a6577;font-family:Helvetica,Arial,sans-serif;padding:0 14mm;display:flex;justify-content:space-between;">
          <span>${footerTitle}</span>
          <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
        </div>`,
    });
    console.log("Wrote", outPdf);
  } finally {
    await browser.close();
  }

  if (!opts.keepHtml) {
    fs.unlinkSync(outHtml);
  }

  if (opts.open) {
    if (process.platform === "darwin") spawnSync("open", [outPdf]);
    else if (process.platform === "win32") spawnSync("cmd", ["/c", "start", "", outPdf]);
    else spawnSync("xdg-open", [outPdf]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
