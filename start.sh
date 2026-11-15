#!/usr/bin/env sh
set -eu
cd -- "$(dirname -- "$0")"
if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' '请先安装 Node.js 24：https://nodejs.org/' >&2
  exit 1
fi
exec node scripts/launch.mjs "$@"
