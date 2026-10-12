#!/usr/bin/env bash
FORMAT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export FORMAT_ROOT
FORMAT_ENGINE_PORT="${FORMAT_PORT:-8490}"
FORMAT_FRONTEND_PORT=5490
export FORMAT_ENGINE_PORT FORMAT_FRONTEND_PORT
ft_say() { printf '[format] %s\n' "$*"; }
ft_die() { printf '[format] error: %s\n' "$*" >&2; exit 1; }
ft_os() {
  case "$(uname -s 2>/dev/null)" in
    Darwin) echo macos ;;
    Linux) echo linux ;;
    MINGW*|MSYS*|CYGWIN*) echo windows ;;
    *) echo unknown ;;
  esac
}
ft_python() {
  local c
  for c in python3.14 python3.13 python3.12 python3; do
    if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 12) else 1)' 2>/dev/null; then
      echo "$c"
      return 0
    fi
  done
  return 1
}
ft_venv_python() {
  [ -x "$FORMAT_ROOT/backend/venv/bin/python" ] || ft_die "the engine venv is missing; from the Format folder run ./format install (or ./build_app for the desktop app)"
  echo "$FORMAT_ROOT/backend/venv/bin/python"
}
ft_target_triple() {
  if [ -n "${FORMAT_TARGET:-}" ]; then echo "$FORMAT_TARGET"; return 0; fi
  command -v rustc >/dev/null 2>&1 || return 1
  rustc -vV | awk '/^host:/ {print $2}'
}
ft_has() { "$(ft_venv_python)" -c "import importlib.util, sys; sys.exit(0 if importlib.util.find_spec(sys.argv[1]) else 1)" "$1" 2>/dev/null; }
ft_rust_env() {
  [ -d "$HOME/.cargo/bin" ] && PATH="$HOME/.cargo/bin:$PATH"
  export PATH
  unset RUSTC RUSTC_WORKSPACE_WRAPPER RUSTFLAGS CARGO_ENCODED_RUSTFLAGS CARGO_BUILD_RUSTFLAGS CARGO_BUILD_TARGET CARGO_TARGET_DIR CARGO_BUILD_TARGET_DIR CARGO_BUILD_RUSTC
  export RUSTC_WRAPPER="" CARGO_BUILD_RUSTC_WRAPPER=""
  if command -v rustup >/dev/null 2>&1 && rustup toolchain list 2>/dev/null | grep -q '^stable'; then
    export RUSTUP_TOOLCHAIN="${FORMAT_RUST_TOOLCHAIN:-stable}"
  fi
}
ft_rust_fresh() {
  local target="$FORMAT_ROOT/src-tauri/target" now
  now="$(rustc -vV 2>/dev/null | tr '\n' ' ')"
  if [ -d "$target/release" ] && [ "$(cat "$target/.format-rustc" 2>/dev/null)" != "$now" ]; then
    ft_say "the Rust compiler differs from the one that built src-tauri/target; cleaning it"
    ( cd "$FORMAT_ROOT/src-tauri" && cargo clean )
  fi
  mkdir -p "$target"
  printf '%s' "$now" > "$target/.format-rustc"
}
