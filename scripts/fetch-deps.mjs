#!/usr/bin/env node
/** npm-free deps fetch — pulls bundled node_modules from GitHub releases. */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPO = "kushjaggi/prompting-nahi-coding-sikho-yojna";
const MARKER = path.join(ROOT, "node_modules", "marked", "package.json");

if (fs.existsSync(MARKER)) process.exit(0);

async function releaseVersion() {
  const local = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
    if (!r.ok) return local;
    const j = await r.json();
    return j.tag_name?.replace(/^v/, "") || local;
  } catch {
    return local;
  }
}

function extract(url) {
  const cmd = `curl -fsSL "${url}" | tar xz -C "${ROOT}"`;
  return spawnSync("bash", ["-c", cmd], { stdio: "inherit" }).status === 0;
}

const ver = process.argv[2] || (await releaseVersion());
const depsUrl = `https://github.com/${REPO}/releases/download/v${ver}/pncsy-${ver}-deps.tar.gz`;
const fullUrl = `https://github.com/${REPO}/releases/download/v${ver}/pncsy-${ver}.tar.gz`;

if (extract(depsUrl) && fs.existsSync(MARKER)) process.exit(0);
if (extract(fullUrl) && fs.existsSync(MARKER)) process.exit(0);

console.error(
  `pncsy: could not fetch deps. Run:\n  curl -fsSL https://raw.githubusercontent.com/${REPO}/main/scripts/install.sh | bash`
);
process.exit(1);
