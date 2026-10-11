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
  [ -x "$FORMAT_ROOT/backend/venv/bin/python" ] || ft_die "engine venv missing, run ./format install"
  echo "$FORMAT_ROOT/backend/venv/bin/python"
}
