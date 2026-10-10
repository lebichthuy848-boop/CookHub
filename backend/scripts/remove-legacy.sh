#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)"
test -f "$project_root/backend/app/main.py" && test -f "$project_root/frontend/package.json" || {
  echo "Not a FastAPI + React project" >&2
  exit 1
}
for name in application assets index.php application.php smoke.php compat.py build_assets.py refine_assets.py; do
  target="$project_root/$name"
  case "$target" in "$project_root/"*) ;; *) exit 1 ;; esac
  if [ -e "$target" ] || [ -L "$target" ]; then
    rm -rf -- "$target"
    printf 'Deleted: %s\n' "$name"
  fi
done
printf 'Legacy cleanup complete. Database and backend/frontend preserved.\n'

