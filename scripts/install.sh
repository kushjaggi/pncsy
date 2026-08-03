#!/usr/bin/env bash
# pncsy installer — Node 18+ only. npm not required.
set -euo pipefail

REPO="kushjaggi/prompting-nahi-coding-sikho-yojna"
INSTALL_DIR="${PNCSY_HOME:-${XDG_DATA_HOME:-$HOME/.local/share}/pncsy}"
BIN_DIR="${PNCSY_BIN:-$HOME/.local/bin}"

die() { echo "pncsy install: $*" >&2; exit 1; }

command -v node >/dev/null || die "Node 18+ required (https://nodejs.org)"
command -v curl >/dev/null || die "curl required"
command -v tar >/dev/null || die "tar required"

mkdir -p "$INSTALL_DIR" "$BIN_DIR"

resolve_version() {
  if [[ -n "${PNCSY_VERSION:-}" ]]; then
    echo "${PNCSY_VERSION#v}"
    return
  fi
  node -e "
    fetch('https://api.github.com/repos/${REPO}/releases/latest')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.tag_name && process.stdout.write(j.tag_name.replace(/^v/, '')));
  " 2>/dev/null || true
}

install_release_bundle() {
  local ver="$1"
  local url="https://github.com/${REPO}/releases/download/v${ver}/pncsy-${ver}.tar.gz"
  echo "→ downloading pncsy v${ver} (deps included)…"
  curl -fsSL "$url" | tar xz -C "$INSTALL_DIR"
}

install_source() {
  echo "→ downloading source from main…"
  local tmp
  tmp="$(mktemp -d)"
  curl -fsSL "https://github.com/${REPO}/archive/refs/heads/main.tar.gz" | tar xz -C "$tmp"
  local src="$tmp/prompting-nahi-coding-sikho-yojna-main"
  [[ -d "$src" ]] || die "unexpected archive layout"
  if command -v rsync >/dev/null; then
    rsync -a --delete "$src/" "$INSTALL_DIR/"
  else
    find "$INSTALL_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    cp -R "$src/." "$INSTALL_DIR/"
  fi
  rm -rf "$tmp"
}

ensure_deps() {
  [[ -f "$INSTALL_DIR/node_modules/marked/package.json" ]] && return 0
  if command -v npm >/dev/null 2>&1; then
    echo "→ npm install (one-time, in $INSTALL_DIR)…"
    (cd "$INSTALL_DIR" && npm install --omit=dev --no-fund --no-audit)
    return
  fi
  echo "→ fetching bundled deps…"
  node "$INSTALL_DIR/scripts/fetch-deps.mjs"
}

VER="$(resolve_version)"
if [[ -n "$VER" ]] && install_release_bundle "$VER" 2>/dev/null; then
  :
elif [[ -n "${PNCSY_VERSION:-}" ]]; then
  install_release_bundle "${PNCSY_VERSION#v}" || die "release v${PNCSY_VERSION} not found"
else
  install_source
  ensure_deps
fi

[[ -f "$INSTALL_DIR/bin/pncsy" ]] || die "install incomplete"

chmod +x "$INSTALL_DIR/bin/pncsy"

write_wrapper() {
  local name="$1"
  cat > "$BIN_DIR/$name" <<EOF
#!/usr/bin/env bash
export PNCSY_HOME="$INSTALL_DIR"
exec "\$PNCSY_HOME/bin/pncsy" "\$@"
EOF
  chmod +x "$BIN_DIR/$name"
}

write_wrapper pncsy
write_wrapper inkship
write_wrapper mdpdf

echo ""
echo "✓ pncsy installed → $BIN_DIR/pncsy"
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  echo "  add to PATH:  export PATH=\"$BIN_DIR:\$PATH\""
fi
echo "  try:  pncsy learn \"Kafka\" --level intermediate"
