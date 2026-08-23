#!/usr/bin/env node
/** npm-free deps fetch — pulls bundled node_modules from GitHub releases. */
import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPO = "kushjaggi/pncsy";
const REQUIRED = ["marked", "mermaid", "puppeteer-core", "@viz-js/viz"];
const ready = () =>
  REQUIRED.every((name) => fs.existsSync(path.join(ROOT, "node_modules", name, "package.json")));

if (ready()) process.exit(0);

function extract(url) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pncsy-deps-"));
  const archive = path.join(dir, "deps.tar.gz");
  try {
    if (spawnSync("curl", ["-fsSL", url, "-o", archive], { stdio: "inherit" }).status !== 0) {
      return false;
    }
    return spawnSync("tar", ["xzf", archive, "-C", ROOT], { stdio: "inherit" }).status === 0;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// A pinned pncsy install must use dependencies from the same release. Pulling
// "latest" here can silently pair old code with a newer, incompatible stack.
const local = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;
const ver = process.argv[2] || local;
const depsUrl = `https://github.com/${REPO}/releases/download/v${ver}/pncsy-${ver}-deps.tar.gz`;

if (extract(depsUrl) && ready()) process.exit(0);

console.error(
  `pncsy: could not fetch deps. Run:\n  curl -fsSL https://raw.githubusercontent.com/${REPO}/main/scripts/install.sh | bash`
);
process.exit(1);
