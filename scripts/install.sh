#!/usr/bin/env bash
# pncsy installer — bash only. No Node, no npm.
set -euo pipefail

REPO="kushjaggi/pncsy"
INSTALL_DIR="${PNCSY_HOME:-${XDG_DATA_HOME:-$HOME/.local/share}/pncsy}"
BIN_DIR="${PNCSY_BIN:-$HOME/.local/bin}"

die() { echo "pncsy install: $*" >&2; exit 1; }

command -v curl >/dev/null || die "curl required"
command -v tar >/dev/null || die "tar required"

mkdir -p "$INSTALL_DIR" "$BIN_DIR"

resolve_version() {
  if [[ -n "${PNCSY_VERSION:-}" ]]; then
    echo "${PNCSY_VERSION#v}"
    return
  fi
  # BSD sed has no \? so keep every substitution POSIX-plain
  curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
    | grep -m1 '"tag_name"' \
    | sed -e 's/.*"tag_name"[: ]*"//' -e 's/".*//' -e 's/^v//'
}

install_release_bundle() {
  local ver="$1"
  local url="https://github.com/${REPO}/releases/download/v${ver}/pncsy-${ver}.tar.gz"
  local tmp
  tmp="$(mktemp -d)"
  echo "→ downloading pncsy v${ver}…"
  if ! curl -fsSL "$url" | tar xz -C "$tmp"; then
    rm -rf "$tmp"
    return 1
  fi
  install_tree "$tmp"
  rm -rf "$tmp"
}

install_tree() {
  local src="$1"
  [[ -f "$src/bin/pncsy" && -d "$src/scripts" ]] || die "unexpected archive layout"
  if command -v rsync >/dev/null; then
    # Node deps are a separate release artifact and survive core upgrades.
    rsync -a --delete --exclude node_modules "$src/" "$INSTALL_DIR/"
  else
    # These are the only roots pncsy owns. Removing them first clears files
    # deleted by a newer release without touching separately fetched deps.
    local item
    for item in bin scripts skill AGENTS.md README.md LICENSE package.json package-lock.json SKILL.md; do
      rm -rf "$INSTALL_DIR/$item"
    done
    cp -R "$src/." "$INSTALL_DIR/"
  fi
}

install_source() {
  echo "→ downloading source from main…"
  local tmp
  tmp="$(mktemp -d)"
  curl -fsSL "https://github.com/${REPO}/archive/refs/heads/main.tar.gz" | tar xz -C "$tmp"
  # GitHub names the folder after the repo, so a rename must not break this
  local src
  src="$(find "$tmp" -mindepth 1 -maxdepth 1 -type d | head -1)"
  install_tree "$src"
  rm -rf "$tmp"
}

VER="$(resolve_version || true)"
if [[ -n "$VER" ]]; then
  if ! install_release_bundle "$VER"; then
    [[ -z "${PNCSY_VERSION:-}" ]] || die "release v${PNCSY_VERSION#v} not found"
    install_source
  fi
else
  install_source
fi

chmod +x "$INSTALL_DIR/bin/pncsy" "$INSTALL_DIR"/scripts/*.sh 2>/dev/null || true
[[ -f "$INSTALL_DIR/bin/pncsy" ]] || die "install incomplete"

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

echo ""
echo "✓ pncsy installed → $BIN_DIR/pncsy  (no Node required)"
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  echo "  add to PATH:  export PATH=\"$BIN_DIR:\$PATH\""
fi
echo "  try:  pncsy learn \"Kafka\" --level intermediate"
echo "  PDF:  install Node, then  pncsy setup --node  &&  pncsy node file.md --pack"
