#!/usr/bin/env node
/**
 * pncsy — ship Markdown as print-ready docs (PDF / HTML / pack).
 * Solves: AI/agent .md dumps look amateur when shared.
 * Theme: scripts/theme.css (do not flatten).
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
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

function log(msg) {
  console.error(msg);
}

function usage(code = 1) {
  console.error(`pncsy <file.md|dir> [options]
pncsy learn "<topic>" [--level x] [--depth y]

Ship Markdown as share-ready docs. Default: polished PDF.

Formats:
  --pdf                 PDF only (default)
  --html                Styled HTML only
  --pack                PDF + HTML together
  -f, --format <x>      pdf | html | pack

Cover / meta:
  --subtitle <text>
  --kicker <text>       default: Document
  --chips <a,b,c>
  --meta <text>
  --no-cover
  --no-toc              Skip auto table of contents
  --no-polish           Keep raw Markdown (skip AI-dump cleanup)

Output:
  -o, --output <path>   Output file or directory
  --no-html-keep        Delete intermediate HTML after PDF (pdf mode)
  --open                Open result when done
  --chrome <path>
  --json                Machine-readable summary on stdout
  -h, --help
`);
  process.exit(code);
}

function defaultOpts() {
  return {
    input: null,
    output: null,
    format: null, // resolved by normalizeFormat
    wantPdf: false,
    wantHtml: false,
    subtitle: "",
    kicker: "Document",
    chips: [],
    meta: "",
    cover: true,
    toc: true,
    polish: true,
    keepHtml: true,
    open: false,
    chrome: null,
    json: false,
  };
}

function normalizeFormat(opts) {
  if (opts.format) {
    if (!["pdf", "html", "pack"].includes(opts.format)) {
      log("Bad format. Use pdf | html | pack");
      process.exit(1);
    }
    opts.wantPdf = opts.format === "pdf" || opts.format === "pack";
    opts.wantHtml = opts.format === "html" || opts.format === "pack";
  } else if (!opts.wantPdf && !opts.wantHtml) {
    opts.wantPdf = true;
    opts.format = "pdf";
  } else if (opts.wantPdf && opts.wantHtml) {
    opts.format = "pack";
  } else if (opts.wantHtml) {
    opts.format = "html";
  } else {
    opts.format = "pdf";
  }
  return opts;
}

function parseArgs(argv) {
  const opts = defaultOpts();

  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-h" || a === "--help") usage(0);
    else if ((a === "-o" || a === "--output") && args[i + 1]) opts.output = args[++i];
    else if ((a === "-f" || a === "--format") && args[i + 1]) opts.format = args[++i].toLowerCase();
    else if (a === "--pdf") opts.wantPdf = true;
    else if (a === "--html") opts.wantHtml = true;
    else if (a === "--pack") {
      opts.wantPdf = true;
      opts.wantHtml = true;
      opts.format = "pack";
    } else if (a === "--subtitle" && args[i + 1]) opts.subtitle = args[++i];
    else if (a === "--kicker" && args[i + 1]) opts.kicker = args[++i];
    else if (a === "--chips" && args[i + 1])
      opts.chips = args[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--meta" && args[i + 1]) opts.meta = args[++i];
    else if (a === "--no-cover") opts.cover = false;
    else if (a === "--no-toc") opts.toc = false;
    else if (a === "--no-polish") opts.polish = false;
    else if (a === "--no-html" || a === "--no-html-keep") opts.keepHtml = false;
    else if (a === "--open") opts.open = true;
    else if (a === "--chrome" && args[i + 1]) opts.chrome = args[++i];
    else if (a === "--json") opts.json = true;
    else if (a.startsWith("-")) {
      log("Unknown option: " + a);
      usage(1);
    } else if (!opts.input) opts.input = a;
    else {
      log("Unexpected: " + a);
      usage(1);
    }
  }

  if (!opts.input) usage(1);
  return normalizeFormat(opts);
}

function ensureDeps() {
  const marker = path.join(ROOT, "node_modules", "marked", "package.json");
  if (fs.existsSync(marker)) return;
  log("[pncsy] installing deps (this package only)…");
  const hasNpm =
    spawnSync("npm", ["--version"], { shell: process.platform === "win32", stdio: "ignore" })
      .status === 0;
  if (hasNpm) {
    const r = spawnSync("npm", ["install", "--omit=dev", "--no-fund", "--no-audit"], {
      cwd: ROOT,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (r.status === 0 && fs.existsSync(marker)) return;
  }
  const r2 = spawnSync(process.execPath, [path.join(__dirname, "fetch-deps.mjs")], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (r2.status !== 0 || !fs.existsSync(marker)) {
    log(
      "[pncsy] deps missing. Install: curl -fsSL https://raw.githubusercontent.com/kushjaggi/prompting-nahi-coding-sikho-yojna/main/scripts/install.sh | bash"
    );
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

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Minimal YAML frontmatter for common keys (no extra deps). */
function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { meta: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: raw };
  const block = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\r?\n/, "");
  const meta = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (val.startsWith("[") && val.endsWith("]")) {
      val = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else if (val === "true") val = true;
    else if (val === "false") val = false;
    meta[key] = val;
  }
  return { meta, body };
}

/**
 * Out-of-box fix: AI dumps often start with chat fluff + sparse structure.
 * Strip assistant-y openings, collapse blank runs. Keep code fences intact.
 */
function polishMarkdown(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0;
  const fluff =
    /^(sure[!.,]?|certainly[!.,]?|of course[!.,]?|absolutely[!.,]?|happy to help[!.,]?|here('s| is) (a |an |the )?(comprehensive |detailed |complete )?(guide|overview|summary|explanation|answer)|i('d| would) be happy|let me (help|explain|walk)|great question[!.,]?)\b/i;

  while (i < lines.length && (lines[i].trim() === "" || fluff.test(lines[i].trim()))) {
    i++;
  }

  let inFence = false;
  let blankRun = 0;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line.trim())) inFence = !inFence;
    if (!inFence && line.trim() === "") {
      blankRun++;
      if (blankRun > 2) continue;
    } else {
      blankRun = 0;
    }
    out.push(line);
  }
  return out.join("\n").trim() + "\n";
}

function extractTitle(md, fmTitle) {
  if (fmTitle) return String(fmTitle);
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "Document";
}

function collectHeadings(md) {
  const heads = [];
  let inFence = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (m) {
      const text = m[2].replace(/#+\s*$/, "").trim();
      heads.push({ level: m[1].length, text, id: slugify(text) });
    }
  }
  return heads;
}

function injectAutoToc(md, enabled) {
  if (!enabled) return md;
  if (/^##\s+table of contents\s*$/im.test(md)) return md;
  const heads = collectHeadings(md).filter((h) => h.level === 2);
  if (heads.length < 3) return md;

  const tocLines = [
    "## Table of contents",
    "",
    ...heads.map((h, i) => `${i + 1}. [${h.text}](#${h.id})`),
    "",
  ];

  // Land the TOC after the title and its intro paragraph, before the first section
  const lines = md.split(/\r?\n/);
  let insertAt = 0;
  if (/^#\s+/.test(lines[0] || "")) {
    insertAt = 1;
    while (insertAt < lines.length && lines[insertAt].trim() === "") insertAt++;
    if (insertAt < lines.length && !/^#{1,6}\s/.test(lines[insertAt])) {
      while (insertAt < lines.length && lines[insertAt].trim() !== "") insertAt++;
      while (insertAt < lines.length && lines[insertAt].trim() === "") insertAt++;
    }
  }
  lines.splice(insertAt, 0, ...tocLines);
  return lines.join("\n");
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

function addHeadingIds(html) {
  return html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, level, inner) => {
    const text = inner.replace(/<[^>]+>/g, "");
    const id = slugify(text);
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
}

async function loadMarked() {
  const require = createRequire(path.join(ROOT, "package.json"));
  const mod = require("marked");
  return mod.marked || mod;
}

async function loadPuppeteer() {
  const require = createRequire(path.join(ROOT, "package.json"));
  return require("puppeteer-core");
}

function resolveMermaidJs() {
  const candidates = [
    path.join(ROOT, "node_modules", "mermaid", "dist", "mermaid.min.js"),
    path.join(ROOT, "node_modules", "mermaid", "dist", "mermaid.js"),
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

function applyFrontmatter(opts, fm) {
  const o = { ...opts };
  if (fm.title && !process.argv.includes("--subtitle")) {
    /* title used separately */
  }
  if (fm.subtitle != null && !hadFlag("--subtitle")) o.subtitle = String(fm.subtitle);
  if (fm.kicker != null && !hadFlag("--kicker")) o.kicker = String(fm.kicker);
  if (fm.meta != null && !hadFlag("--meta")) o.meta = String(fm.meta);
  if (fm.chips != null && !hadFlag("--chips")) {
    o.chips = Array.isArray(fm.chips) ? fm.chips : String(fm.chips).split(",");
  }
  if (fm.cover === false) o.cover = false;
  if (fm.toc === false) o.toc = false;
  if (fm.polish === false) o.polish = false;
  if (fm.format && !hadFlag("--format") && !hadFlag("-f") && !hadFlag("--pdf") && !hadFlag("--html") && !hadFlag("--pack")) {
    const f = String(fm.format).toLowerCase();
    if (["pdf", "html", "pack"].includes(f)) {
      o.format = f;
      o.wantPdf = f === "pdf" || f === "pack";
      o.wantHtml = f === "html" || f === "pack";
    }
  }
  return o;
}

function hadFlag(flag) {
  return process.argv.includes(flag);
}

function buildDocumentHtml({ title, bodyHtml, css, mermaidBlock, opts, sourceName }) {
  return `<!DOCTYPE html>
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
      ${bodyHtml}
    </div>
    <p class="footer-note">prompting-nahi-coding-sikho-yojna · ${escapeHtml(sourceName)}</p>
  </article>
</body>
</html>`;
}

function listMarkdownFiles(inputPath) {
  const st = fs.statSync(inputPath);
  if (st.isFile()) return [inputPath];
  if (!st.isDirectory()) return [];
  return fs
    .readdirSync(inputPath)
    .filter((f) => /\.md$/i.test(f))
    .map((f) => path.join(inputPath, f))
    .sort();
}

function openPath(p) {
  if (process.platform === "darwin") spawnSync("open", [p]);
  else if (process.platform === "win32") spawnSync("cmd", ["/c", "start", "", p]);
  else spawnSync("xdg-open", [p]);
}

async function renderOne(filePath, opts, tools) {
  const { markedParse, puppeteer, chrome, css, mermaidJs } = tools;
  let raw = fs.readFileSync(filePath, "utf8");
  const { meta: fm, body: afterFm } = parseFrontmatter(raw);
  let localOpts = applyFrontmatter(opts, fm);

  let md = afterFm;
  if (localOpts.polish) md = polishMarkdown(md);
  const title = extractTitle(md, fm.title);
  md = injectAutoToc(md, localOpts.toc);

  // Drop duplicate H1 from body when cover shows it
  const bodyMd = localOpts.cover ? md.replace(/^#\s+.+\n+/, "") : md;
  let bodyHtml = markedParse(bodyMd);
  bodyHtml = wrapMermaid(bodyHtml);
  bodyHtml = wrapToc(bodyHtml);
  bodyHtml = addHeadingIds(bodyHtml);

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
      } catch (e) { console.error(e); }
      document.documentElement.setAttribute("data-mermaid-ready", "true");
    })();
  </script>`
    : `<script>document.documentElement.setAttribute("data-mermaid-ready", "true");</script>`;

  const sourceName = path.basename(filePath);
  const html = buildDocumentHtml({
    title,
    bodyHtml,
    css,
    mermaidBlock,
    opts: localOpts,
    sourceName,
  });

  const baseOut = resolveOutputBase(filePath, localOpts);
  const outHtml = baseOut + ".html";
  const outPdf = baseOut + ".pdf";
  const written = [];

  fs.writeFileSync(outHtml, html, "utf8");
  if (localOpts.wantHtml || localOpts.wantPdf) {
    if (localOpts.wantHtml || localOpts.keepHtml || localOpts.wantPdf) {
      log("HTML " + outHtml);
      if (localOpts.wantHtml) written.push(outHtml);
    }
  }

  if (localOpts.wantPdf) {
    if (!chrome) {
      log("Chrome missing. Install Chrome or pass --chrome");
      process.exit(1);
    }
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
        log("Mermaid wait timeout — print anyway");
      }
      await new Promise((r) => setTimeout(r, 400));
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
      log("PDF  " + outPdf);
      written.push(outPdf);
    } finally {
      await browser.close();
    }

    if (!localOpts.wantHtml && !localOpts.keepHtml && fs.existsSync(outHtml)) {
      fs.unlinkSync(outHtml);
    } else if (!localOpts.wantHtml && localOpts.keepHtml) {
      // intermediate kept for debug; not listed as primary html product
    }
  }

  return { title, files: written, format: localOpts.format, html: outHtml, pdf: outPdf };
}

function resolveOutputBase(filePath, opts) {
  if (!opts.output) {
    return filePath.replace(/\.md$/i, "");
  }
  const out = path.resolve(opts.output);
  if (fs.existsSync(out) && fs.statSync(out).isDirectory()) {
    return path.join(out, path.basename(filePath).replace(/\.md$/i, ""));
  }
  if (out.endsWith(".pdf") || out.endsWith(".html")) {
    return out.replace(/\.(pdf|html)$/i, "");
  }
  // treat as base path without extension
  return out;
}

async function ship(opts) {
  const input = path.resolve(opts.input);
  if (!fs.existsSync(input)) {
    log("Missing: " + input);
    process.exit(1);
  }

  ensureDeps();
  const chrome = findChrome(opts.chrome);
  const marked = await loadMarked();
  if (typeof marked.setOptions === "function") {
    marked.setOptions({ gfm: true, breaks: false });
  }
  const markedParse =
    typeof marked.parse === "function"
      ? marked.parse.bind(marked)
      : typeof marked === "function"
        ? marked
        : marked.marked.parse.bind(marked.marked);

  const puppeteer = await loadPuppeteer();
  const css = fs.readFileSync(THEME_PATH, "utf8");
  const mermaidJs = resolveMermaidJs();

  const files = listMarkdownFiles(input);
  if (!files.length) {
    log("No .md files");
    process.exit(1);
  }

  const tools = { markedParse, puppeteer, chrome, css, mermaidJs };
  const results = [];
  for (const f of files) {
    log("Ship " + path.basename(f));
    results.push(await renderOne(f, opts, tools));
  }

  if (opts.json) {
    console.log(JSON.stringify({ ok: true, results }, null, 2));
  } else {
    const last = results[results.length - 1];
    const primary =
      last.files.find((f) => f.endsWith(".pdf")) ||
      last.files.find((f) => f.endsWith(".html")) ||
      last.files[0];
    if (primary) log("Done " + primary);
  }

  if (opts.open && results.length) {
    const last = results[results.length - 1];
    const openTarget =
      last.files.find((f) => f.endsWith(".pdf")) ||
      last.files.find((f) => f.endsWith(".html"));
    if (openTarget) openPath(openTarget);
  }

  return results;
}

/** Programmatic entry, used by `pncsy learn --ship`. */
export async function shipFiles(input, overrides = {}) {
  return ship(normalizeFormat({ ...defaultOpts(), ...overrides, input }));
}

async function main() {
  if (process.argv[2] === "learn") {
    const { runLearn } = await import("./learn.mjs");
    return runLearn(process.argv.slice(3));
  }
  return ship(parseArgs(process.argv));
}

export { slugify, parseFrontmatter, polishMarkdown, injectAutoToc };

const invokedDirectly =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  main().catch((err) => {
    log(String(err && err.stack ? err.stack.split("\n")[0] : err));
    process.exit(1);
  });
}
