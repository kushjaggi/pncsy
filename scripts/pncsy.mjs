#!/usr/bin/env node
/**
 * pncsy renderer — ship any Markdown artifact as PDF / HTML / pack.
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

Ship learning paths, engineering records, or any Markdown as share-ready docs.
Default: polished PDF.

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
  --no-repo-links       Skip repo path / GitHub link enhancement
  --repo-base <url>     GitHub blob base (overrides frontmatter repo_base)
  --repo-tree <url>     GitHub tree base for directory paths ending in /
  --allow-html          Render raw Markdown HTML (trusted files only)
  --no-sandbox          Disable Chrome sandbox (root-only containers)

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
    repoLinks: true,
    repoBase: null,
    repoTree: null,
    allowHtml: false,
    noSandbox: false,
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
  const value = (name, i) => {
    if (args[i + 1] == null || args[i + 1].startsWith("-")) {
      log(name + " needs a value");
      usage(1);
    }
    return args[i + 1];
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-h" || a === "--help") usage(0);
    else if (a === "-o" || a === "--output") {
      opts.output = value(a, i);
      i++;
    } else if (a === "-f" || a === "--format") {
      opts.format = value(a, i).toLowerCase();
      i++;
    }
    else if (a === "--pdf") opts.wantPdf = true;
    else if (a === "--html") opts.wantHtml = true;
    else if (a === "--pack") {
      opts.wantPdf = true;
      opts.wantHtml = true;
      opts.format = "pack";
    } else if (a === "--subtitle") {
      opts.subtitle = value(a, i);
      i++;
    } else if (a === "--kicker") {
      opts.kicker = value(a, i);
      i++;
    } else if (a === "--chips") {
      opts.chips = value(a, i).split(",").map((s) => s.trim()).filter(Boolean);
      i++;
    } else if (a === "--meta") {
      opts.meta = value(a, i);
      i++;
    }
    else if (a === "--no-cover") opts.cover = false;
    else if (a === "--no-toc") opts.toc = false;
    else if (a === "--no-polish") opts.polish = false;
    else if (a === "--no-repo-links") opts.repoLinks = false;
    else if (a === "--allow-html") opts.allowHtml = true;
    else if (a === "--no-sandbox") opts.noSandbox = true;
    else if (a === "--repo-base") {
      opts.repoBase = value(a, i);
      i++;
    } else if (a === "--repo-tree") {
      opts.repoTree = value(a, i);
      i++;
    }
    else if (a === "--no-html-keep") opts.keepHtml = false;
    else if (a === "--open") opts.open = true;
    else if (a === "--chrome") {
      opts.chrome = value(a, i);
      i++;
    }
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
  const required = ["marked", "mermaid", "puppeteer-core", "@viz-js/viz"];
  const ready = () =>
    required.every((name) => fs.existsSync(path.join(ROOT, "node_modules", name, "package.json")));
  if (ready()) return;
  log("[pncsy] installing deps (this package only)…");
  const r2 = spawnSync(process.execPath, [path.join(__dirname, "fetch-deps.mjs")], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (r2.status === 0 && ready()) return;
  const hasNpm =
    spawnSync("npm", ["--version"], { shell: process.platform === "win32", stdio: "ignore" })
      .status === 0;
  if (hasNpm) {
    const r = spawnSync("npm", ["install", "--omit=dev", "--no-fund", "--no-audit"], {
      cwd: ROOT,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (r.status === 0 && ready()) return;
  }
  log("[pncsy] deps missing. Run: pncsy setup --node");
  process.exit(1);
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

function escapeRawHtml(token) {
  return escapeHtml(token.text);
}

function stripContractMarkers(md) {
  let inFence = false;
  return String(md)
    .split("\n")
    .filter((line) => {
      if (/^```/.test(line.trim())) inFence = !inFence;
      return inFence || !/^<!--\s*pncsy:[a-z].*-->\s*$/.test(line);
    })
    .join("\n");
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

const DEFAULT_REPO_PATH_PREFIXES = ["src", "lib", "docs", "examples", "scripts", "pkg"];

function parseRepoPathPrefixes(fm) {
  if (fm.repo_paths === "*") return null;
  if (fm.repo_paths == null || fm.repo_paths === "") {
    return DEFAULT_REPO_PATH_PREFIXES;
  }
  const raw = Array.isArray(fm.repo_paths)
    ? fm.repo_paths
    : String(fm.repo_paths).split(",");
  return raw.map((s) => s.trim()).filter(Boolean);
}

/** `omnivoice.utils.audio` → `omnivoice/utils/audio.py` when it looks like a module path. */
function dotPathToSlash(path) {
  if (!path.includes(".") || path.includes(" ") || path.includes("/")) return null;
  if (/^[\d().,\s×\-+]+$/.test(path)) return null;
  if (/^[A-Z][a-zA-Z0-9]*$/.test(path)) return null; // class names like OmniVoiceConfig
  const parts = path.split(".");
  const root = parts[0];
  if (!/^[a-z][a-z0-9_-]*$/i.test(root)) return null;
  const exts = new Set(["py", "js", "ts", "md", "json", "yaml", "yml", "sh", "txt", "toml"]);
  if (parts.length >= 2 && exts.has(parts[parts.length - 1].toLowerCase())) {
    const ext = parts.pop();
    parts[parts.length - 1] = `${parts[parts.length - 1]}.${ext}`;
  }
  let slash = parts.join("/");
  if (!/\.\w{1,6}$/.test(slash) && parts.length >= 2) slash += ".py";
  return slash;
}

function repoPathCandidates(path) {
  const out = [path];
  const dotted = dotPathToSlash(path);
  if (dotted && dotted !== path) out.push(dotted);
  return out;
}

function pathMatchesPrefixes(p, prefixes) {
  if (prefixes === null) return p.includes("/");
  return prefixes.some(
    (pref) => p === pref || p.startsWith(`${pref}/`) || (pref.endsWith("/") && p.startsWith(pref))
  );
}

function bestRepoPath(path, prefixes) {
  for (const p of repoPathCandidates(path)) {
    if (pathMatchesPrefixes(p, prefixes)) return p;
  }
  return null;
}

function repoUrlForPath(path, blobBase, treeBase) {
  if (path.endsWith("/")) {
    return `${treeBase}/${path}`;
  }
  return `${blobBase}/${path}`;
}

/**
 * When frontmatter sets repo_base, turn backtick repo paths into markdown links
 * and label bare GitHub/arXiv appendix URLs. Skips fenced code blocks.
 */
function linkifyRepoPaths(md, fm = {}) {
  const blobBase = fm.repo_base ? String(fm.repo_base).replace(/\/$/, "") : null;
  if (!blobBase) return md;

  const treeBase = String(
    fm.repo_tree || blobBase.replace("/blob/", "/tree/")
  ).replace(/\/$/, "");
  const prefixes = parseRepoPathPrefixes(fm);

  const parts = md.split(/(```[\s\S]*?```)/g);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part;
      let out = part.replace(/`([^`\n]+)`/g, (m, path) => {
        const linkPath = bestRepoPath(path, prefixes);
        if (!linkPath) return m;
        return `[\`${path}\`](${repoUrlForPath(linkPath, blobBase, treeBase)})`;
      });
      out = out.replace(
        /^- ([^:\n]+): (https:\/\/github\.com\/\S+)/gm,
        (_, label, url) =>
          `- ${label}: [${url.replace(/^https:\/\//, "")}](${url})`
      );
      out = out.replace(
        /^- ([^:\n]+): (https:\/\/arxiv\.org\/\S+)/gm,
        (_, label, url) => {
          const short = url.includes("/abs/")
            ? `arXiv:${url.split("/abs/")[1]}`
            : url.replace(/^https:\/\//, "");
          return `- ${label}: [${short}](${url})`;
        }
      );
      return out;
    })
    .join("");
}

/** Mark external links for PDF styling and clickability. */
function tagExternalLinks(html) {
  return html
    .replace(
      /<a href="(https:\/\/github\.com\/[^"]+)"/g,
      '<a class="repo-link" href="$1"'
    )
    .replace(
      /<a href="(https:\/\/arxiv\.org\/[^"]+)"/g,
      '<a class="paper-link" href="$1"'
    );
}

/** Turn leftover <code>repo/path</code> (and dot paths) into clickable repo links. */
function linkifyCodeInHtml(html, fm = {}) {
  const blobBase = fm.repo_base ? String(fm.repo_base).replace(/\/$/, "") : null;
  if (!blobBase) return html;

  const treeBase = String(
    fm.repo_tree || blobBase.replace("/blob/", "/tree/")
  ).replace(/\/$/, "");
  const prefixes = parseRepoPathPrefixes(fm);

  const chunks = html.split(/(<a\b[^>]*>[\s\S]*?<\/a>)/g);
  return chunks
    .map((chunk, i) => {
      if (i % 2 === 1) return chunk;
      return chunk.replace(/<code>([^<]+)<\/code>/g, (m, text) => {
        const linkPath = bestRepoPath(text.trim(), prefixes);
        if (!linkPath) return m;
        const url = repoUrlForPath(linkPath, blobBase, treeBase);
        return `<a class="repo-link" href="${url}"><code>${text}</code></a>`;
      });
    })
    .join("");
}

/** Prefer horizontal layout for simple pipelines — fewer pages, clearer flow. */
function optimizeMermaid(src) {
  let s = src.trim();
  if (!/^flowchart\s+(TD|TB)/im.test(s)) return s;

  const body = s
    .split("\n")
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => l && !/^%%/.test(l));
  const hasSubgraph = /subgraph/i.test(s);
  const hasBranch = /-->\s*\|/.test(s) || /\s--\s/.test(s);
  const edges = (s.match(/-->/g) || []).length;
  const nodeIds = new Set();
  for (const m of s.matchAll(/\b([A-Za-z][\w]*)\s*(?:[\[\(\{"]|-->|---)/g)) nodeIds.add(m[1]);
  for (const m of s.matchAll(/(?:-->|---)\s*([A-Za-z][\w]*)/g)) nodeIds.add(m[1]);
  const nodes = nodeIds.size;
  const simpleChain =
    body.length > 0 &&
    body.every((l) => /^[A-Za-z]\w*\s*(-->|---)/.test(l) || /^[A-Za-z]\w*\s*[\[\(\{"']/.test(l));

  if (!hasSubgraph && !hasBranch && nodes >= 2 && nodes <= 8 && edges <= nodes && simpleChain) {
    s = s.replace(/^flowchart\s+(TD|TB)/im, "flowchart LR");
  }
  return s;
}

function decodeHtmlEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}

/** Print layout: resize tall diagrams; figure-section CSS keeps headings with diagrams. */
const PRINT_LAYOUT_SCRIPT = `
    function pageContentHeightPx() {
      return Math.floor(((297 - 26) * 96) / 25.4) - 32;
    }

    function fitDiagramsForPrint() {
      const PAGE = pageContentHeightPx();
      const MAX_BLOCK = Math.min(520, PAGE - 36);
      document.querySelectorAll(".diagram-block").forEach((block) => {
        const canvas = block.querySelector(".mermaid, .graphviz-svg");
        const svg = canvas?.querySelector("svg") || (canvas?.tagName === "svg" ? canvas : null);
        if (!canvas || !svg) return;

        canvas.style.transform = "";
        canvas.style.height = "";
        block.style.minHeight = "";
        block.style.height = "";

        const labelH = block.querySelector(".diagram-label")?.offsetHeight || 0;
        const pad = 12;
        const avail = MAX_BLOCK - labelH - pad;
        const h = canvas.scrollHeight || svg.getBoundingClientRect().height;
        if (!h || h <= avail) return;

        const scale = avail / h;
        const w = canvas.scrollWidth || svg.getBoundingClientRect().width;
        const newH = Math.round(h * scale);
        const newW = Math.round(w * scale);
        svg.setAttribute("height", String(newH));
        svg.setAttribute("width", String(newW));
        svg.style.height = newH + "px";
        svg.style.width = newW + "px";
        svg.style.display = "block";
        svg.style.margin = "0 auto";
        svg.style.maxWidth = "100%";
        canvas.style.height = newH + "px";
        canvas.style.overflow = "hidden";
        block.style.height = labelH + newH + pad + "px";
      });
    }

    function preparePrintLayout() {
      fitDiagramsForPrint();
      document.querySelectorAll("table").forEach((table) => {
        const rows = table.querySelectorAll("tbody tr").length;
        if (rows > 12) table.classList.add("table-breakable");
      });
    }

    window.fitDiagramsForPrint = fitDiagramsForPrint;
    window.preparePrintLayout = preparePrintLayout;
`;

const MERMAID_BOOTSTRAP = `
    ${PRINT_LAYOUT_SCRIPT}
    (async function () {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            primaryColor: "#e8f4f3",
            primaryTextColor: "#1a2332",
            primaryBorderColor: "#0f6e6a",
            lineColor: "#4a5568",
            secondaryColor: "#f4f6f9",
            tertiaryColor: "#ffffff",
            fontSize: "13px",
            fontFamily: "Avenir Next, Segoe UI, Helvetica, Arial, sans-serif"
          },
          flowchart: {
            curve: "basis",
            htmlLabels: true,
            padding: 14,
            nodeSpacing: 42,
            rankSpacing: 48,
            diagramPadding: 10,
            useMaxWidth: true
          },
          securityLevel: "loose"
        });
        await mermaid.run({ querySelector: ".mermaid" });
        preparePrintLayout();
      } catch (e) { console.error(e); }
      document.documentElement.setAttribute("data-mermaid-ready", "true");
    })();
`;

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
      if (blankRun > 1) continue;
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
      const decoded = optimizeMermaid(decodeHtmlEntities(code));
      return `<div class="diagram-block"><div class="mermaid">${decoded}</div></div>`;
    }
  );
}

/** Graphviz DOT blocks render server-side — cleaner layouts than Mermaid for pipelines. */
async function renderDotDiagrams(html) {
  let viz;
  try {
    const mod = await import("@viz-js/viz");
    viz = await mod.instance();
  } catch {
    return html;
  }

  return html.replace(
    /<pre><code class="language-(?:dot|graphviz)">([\s\S]*?)<\/code><\/pre>/g,
    (_, code) => {
      const src = decodeHtmlEntities(code).trim();
      try {
        const svg = viz.renderString(src, { engine: "dot", format: "svg" });
        return `<div class="diagram-block diagram-graphviz"><div class="graphviz-svg">${svg}</div></div>`;
      } catch {
        return `<pre><code class="language-dot">${code}</code></pre>`;
      }
    }
  );
}

function buildTocGroups(itemsHtml) {
  const items = [...itemsHtml.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
  const groups = [];
  let current = null;

  const flush = () => {
    if (current?.items.length) groups.push(current);
    current = null;
  };

  for (const item of items) {
    const text = item
      .replace(/<a[^>]*>([\s\S]*?)<\/a>/, "$1")
      .replace(/<[^>]+>/g, "")
      .trim();

    if (/^PART\s+([A-Z0-9]+)/i.test(text)) {
      flush();
      const badge = text.match(/PART\s+([A-Z0-9]+)/i)[1];
      const title =
        text.replace(/^PART\s+[A-Z0-9]+\s*[—–-]\s*/i, "").slice(0, 52) || text;
      current = { badge, title, items: [] };
      continue;
    }

    if (/^(\d+)\./.test(text) && Number(RegExp.$1) >= 35) {
      if (!current || current.badge !== "REF") {
        flush();
        current = { badge: "REF", title: "Appendix", items: [] };
      }
    } else if (/^0\.\s|orientation/i.test(text) && !current) {
      current = { badge: "0", title: "Start here", items: [] };
    } else if (!current) {
      current = { badge: "★", title: "Topics", items: [] };
    }

    current.items.push(`<li>${item}</li>`);
  }
  flush();
  return compactTocGroups(mergeTocGroups(groups));
}

function mergeTocGroups(groups) {
  const out = [];
  for (const g of groups) {
    const prev = out[out.length - 1];
    if (prev && prev.badge === g.badge && g.badge === "0") {
      prev.items.push(...g.items);
      continue;
    }
    out.push(g);
  }
  return out;
}

/** Appendix alone is 90+ entries — collapse so the TOC fits one page. */
function compactTocGroups(groups) {
  return groups.map((g) => {
    if (g.badge !== "REF" || g.items.length <= 5) return g;
    const [first, second] = g.items;
    const href = (second.match(/href="([^"]+)"/) || [])[1];
    const more = `${g.items.length - 1} more sections in order`;
    return {
      ...g,
      items: [
        first,
        `<li class="toc-appendix-note">${
          href ? `<a href="${href}">continues</a> ` : ""
        }<span class="toc-muted">(${more})</span></li>`,
      ],
    };
  });
}

function peelDiagramBlock(token) {
  const m = token.match(/^(<div class="diagram-block">[\s\S]*?<\/div>\s*<\/div>)([\s\S]*)$/);
  if (!m) return { block: token, rest: "" };
  return { block: m[1], rest: m[2] };
}

function wrapToc(html) {
  return html.replace(
    /<h2[^>]*>Table of contents<\/h2>\s*<ol>([\s\S]*?)<\/ol>/i,
    (_m, items) => {
      const groups = buildTocGroups(items);
      const grid = groups
        .map(
          (g) => `<section class="toc-part">
          <h3 class="toc-part-title"><span class="toc-badge">${escapeHtml(g.badge)}</span>${escapeHtml(g.title)}</h3>
          <ol class="toc-part-list">${g.items.join("")}</ol>
        </section>`
        )
        .join("");
      return `<div class="toc-box toc-map">
        <h2>Table of contents</h2>
        <p class="toc-lead">Phases at a glance — appendix collapsed; jump via section numbers.</p>
        <div class="toc-grid">${grid}</div>
      </div>`;
    }
  );
}

/** Keep PART banner glued to the first section under it. */
function wrapPartHeadings(html) {
  return html.replace(
    /(<h2[^>]*>PART\s+[^<]+<\/h2>)\s*(<h2\b[^>]*>[\s\S]*?<\/h2>)/gi,
    '<div class="part-lead">$1$2</div>'
  );
}

/** Keep section headings glued to the diagram that follows them. */
function wrapFigureSections(html) {
  const tokens = html.split(/(?=<h[234]\b|<p\b|<div class="diagram-block">)/);
  let out = "";
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!/^<h[234]/.test(t)) {
      out += t;
      continue;
    }
    let j = i + 1;
    let middle = "";
    while (j < tokens.length && /^<p\b/.test(tokens[j])) {
      middle += tokens[j++];
    }
    if (tokens[j]?.startsWith('<div class="diagram-block">')) {
      const headingText = t.replace(/<[^>]+>/g, "").trim();
      const peeled = peelDiagramBlock(tokens[j]);
      let diagram = peeled.block;
      if (headingText && !diagram.includes("diagram-label")) {
        diagram = diagram.replace(
          '<div class="diagram-block">',
          `<div class="diagram-block"><div class="diagram-label">${escapeHtml(headingText)}</div>`
        );
      }
      if (middle) {
        out += `<div class="figure-group">${t}${middle}<section class="figure-section">${diagram}</section></div>${peeled.rest}`;
      } else {
        out += `<section class="figure-section">${t}${diagram}</section>${peeled.rest}`;
      }
      i = j;
    } else {
      out += t;
    }
  }
  return out;
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
    .join("");
  const subtitle = opts.subtitle
    ? `<p class="subtitle">${escapeHtml(opts.subtitle)}</p>`
    : "";
  const meta = opts.meta
    ? `<p class="cover-meta">${escapeHtml(opts.meta)}</p>`
    : "<span></span>";
  const chipRow = chips ? `<div class="cover-path">${chips}</div>` : "";

  return `<header class="cover">
      <div class="cover-top">
        <div class="cover-rule"></div>
        <p class="cover-kicker">${escapeHtml(opts.kicker)}</p>
      </div>
      <div class="cover-main">
        <h1>${escapeHtml(title)}</h1>
        ${subtitle}
        ${chipRow}
      </div>
      <div class="cover-bottom">
        ${meta}
        <span class="cover-brand">pncsy</span>
      </div>
    </header>`;
}

function applyFrontmatter(opts, fm) {
  const o = { ...opts };
  if (fm.subtitle != null && !hadFlag("--subtitle")) o.subtitle = String(fm.subtitle);
  if (fm.kicker != null && !hadFlag("--kicker")) o.kicker = String(fm.kicker);
  if (fm.meta != null && !hadFlag("--meta")) o.meta = String(fm.meta);
  if (fm.chips != null && !hadFlag("--chips")) {
    o.chips = Array.isArray(fm.chips) ? fm.chips : String(fm.chips).split(",");
  }
  if (fm.cover === false) o.cover = false;
  if (fm.toc === false) o.toc = false;
  if (fm.polish === false) o.polish = false;
  if (fm.linkify_repo === false) o.repoLinks = false;
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

function buildDocumentHtml({ title, bodyHtml, css, scriptsBlock, opts, sourceName }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${css}</style>
</head>
<body>
  <article class="page">
    ${renderCover({ title, opts })}
    <div class="content">
      ${bodyHtml}
    </div>
    <p class="footer-note">prompting-nahi-coding-sikho-yojna · ${escapeHtml(sourceName)}</p>
  </article>
  ${scriptsBlock || ""}
</body>
</html>`;
}

function listMarkdownFiles(inputPath) {
  const st = fs.statSync(inputPath);
  if (st.isFile()) return [inputPath];
  if (!st.isDirectory()) return [];
  return fs
    .readdirSync(inputPath)
    // Fill prompts are instructions for an agent, not documents to publish.
    // They remain shippable when named explicitly.
    .filter((f) => /\.md$/i.test(f) && !/\.prompt\.md$/i.test(f))
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

  let md = stripContractMarkers(afterFm);
  if (localOpts.polish) md = polishMarkdown(md);
  const repoFm = {
    ...fm,
    repo_base: localOpts.repoBase || fm.repo_base,
    repo_tree: localOpts.repoTree || fm.repo_tree,
  };
  if (localOpts.repoLinks && repoFm.repo_base) {
    md = linkifyRepoPaths(md, repoFm);
  }
  const title = extractTitle(md, fm.title);
  md = injectAutoToc(md, localOpts.toc);

  // Drop duplicate H1 from body when cover shows it
  const bodyMd = localOpts.cover ? md.replace(/^#\s+.+\n+/, "") : md;
  let bodyHtml = markedParse(bodyMd, localOpts.allowHtml);
  bodyHtml = tagExternalLinks(bodyHtml);
  if (localOpts.repoLinks && repoFm.repo_base) {
    bodyHtml = linkifyCodeInHtml(bodyHtml, repoFm);
  }
  bodyHtml = await renderDotDiagrams(bodyHtml);
  bodyHtml = wrapMermaid(bodyHtml);
  bodyHtml = wrapFigureSections(bodyHtml);
  bodyHtml = wrapToc(bodyHtml);
  bodyHtml = addHeadingIds(bodyHtml);
  bodyHtml = wrapPartHeadings(bodyHtml);

  const scriptsBlock = mermaidJs
    ? `<script>${mermaidJs}</script>
<script>${MERMAID_BOOTSTRAP}</script>`
    : `<script>${PRINT_LAYOUT_SCRIPT}
document.documentElement.setAttribute("data-mermaid-ready", "true");
preparePrintLayout();</script>`;

  const sourceName = path.basename(filePath);
  const html = buildDocumentHtml({
    title,
    bodyHtml,
    css,
    scriptsBlock,
    opts: localOpts,
    sourceName,
  });

  const baseOut = resolveOutputBase(filePath, localOpts);
  const outHtml = baseOut + ".html";
  const outPdf = baseOut + ".pdf";
  const written = [];

  fs.writeFileSync(outHtml, html, "utf8");
  log("HTML " + outHtml);
  if (localOpts.wantHtml) written.push(outHtml);

  if (localOpts.wantPdf) {
    if (!chrome) {
      log("Chrome missing. Install Chrome or pass --chrome");
      process.exit(1);
    }
    const browser = await puppeteer.launch({
      executablePath: chrome,
      headless: true,
      args: [...(localOpts.noSandbox ? ["--no-sandbox"] : []), "--disable-gpu"],
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
      await page.evaluate(() => {
        if (typeof window.preparePrintLayout === "function") {
          window.preparePrintLayout();
        }
      });
      await new Promise((r) => setTimeout(r, 400));
      const footerTitle = escapeHtml(title).slice(0, 60);
      await page.pdf({
        path: outPdf,
        format: "A4",
        printBackground: true,
        margin: {
          top: "12mm",
          right: "10mm",
          bottom: "14mm",
          left: "10mm",
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

function prepareDirectoryOutput(input, opts) {
  if (!fs.statSync(input).isDirectory() || !opts.output) return opts;
  const out = path.resolve(opts.output);
  if (/\.(pdf|html)$/i.test(out) || (fs.existsSync(out) && !fs.statSync(out).isDirectory())) {
    throw new Error("Directory input needs an output directory, not one output file");
  }
  fs.mkdirSync(out, { recursive: true });
  return { ...opts, output: out };
}

async function ship(opts) {
  const input = path.resolve(opts.input);
  if (!fs.existsSync(input)) {
    log("Missing: " + input);
    process.exit(1);
  }
  opts = prepareDirectoryOutput(input, opts);

  ensureDeps();
  const chrome = findChrome(opts.chrome);
  const marked = await loadMarked();
  if (typeof marked.setOptions === "function") {
    marked.setOptions({ gfm: true, breaks: false });
  }
  const parseMarked =
    typeof marked.parse === "function"
      ? marked.parse.bind(marked)
      : typeof marked === "function"
        ? marked
        : marked.marked.parse.bind(marked.marked);
  const safeRenderer = new marked.Renderer();
  safeRenderer.html = escapeRawHtml;
  const markedParse = (md, allowHtml) =>
    parseMarked(md, allowHtml ? undefined : { renderer: safeRenderer });

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

async function main() {
  if (process.argv[2] === "learn") {
    const { runLearn } = await import("./learn.mjs");
    return runLearn(process.argv.slice(3));
  }
  return ship(parseArgs(process.argv));
}

export {
  slugify,
  parseFrontmatter,
  polishMarkdown,
  injectAutoToc,
  linkifyRepoPaths,
  linkifyCodeInHtml,
  tagExternalLinks,
  optimizeMermaid,
  wrapMermaid,
  wrapFigureSections,
  wrapPartHeadings,
  buildTocGroups,
  compactTocGroups,
  dotPathToSlash,
  listMarkdownFiles,
  escapeRawHtml,
  stripContractMarkers,
  prepareDirectoryOutput,
  resolveOutputBase,
};

const invokedDirectly = (() => {
  if (!process.argv[1]) return false;
  try {
    return (
      fs.realpathSync.native(process.argv[1]) ===
      fs.realpathSync.native(fileURLToPath(import.meta.url))
    );
  } catch {
    return path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
  }
})();

if (invokedDirectly) {
  main().catch((err) => {
    log(String(err && err.stack ? err.stack.split("\n")[0] : err));
    process.exit(1);
  });
}
