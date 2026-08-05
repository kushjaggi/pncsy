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
  echo "→ downloading pncsy v${ver}…"
  curl -fsSL "$url" | tar xz -C "$INSTALL_DIR"
}

install_source() {
  echo "→ downloading source from main…"
  local tmp
  tmp="$(mktemp -d)"
  curl -fsSL "https://github.com/${REPO}/archive/refs/heads/main.tar.gz" | tar xz -C "$tmp"
  # GitHub names the folder after the repo, so a rename must not break this
  local src
  src="$(find "$tmp" -mindepth 1 -maxdepth 1 -type d | head -1)"
  [[ -n "$src" && -d "$src/bin" ]] || die "unexpected archive layout"
  if command -v rsync >/dev/null; then
    rsync -a --delete "$src/" "$INSTALL_DIR/"
  else
    find "$INSTALL_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    cp -R "$src/." "$INSTALL_DIR/"
  fi
  rm -rf "$tmp"
}

VER="$(resolve_version)"
if [[ -n "$VER" ]] && install_release_bundle "$VER" 2>/dev/null; then
  :
elif [[ -n "${PNCSY_VERSION:-}" ]]; then
  install_release_bundle "${PNCSY_VERSION#v}" || die "release v${PNCSY_VERSION} not found"
else
  install_source
fi

chmod +x "$INSTALL_DIR/bin/pncsy" "$INSTALL_DIR/scripts/learn.sh" 2>/dev/null || true
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
