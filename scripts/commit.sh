#!/usr/bin/env bash
set -euo pipefail

git add .

git commit -m "$(cat <<'EOF'
Initial site build

Set up Next.js app with public pages, admin tools, and audio library.

EOF
)"

git status -sb
