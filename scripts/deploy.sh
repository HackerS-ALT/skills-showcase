#!/usr/bin/env bash
# Incremental deploy: rebuild skills.json from assets/*/meta.json and push.
# Usage: bash scripts/deploy.sh "batch of 10: <names>" — the message becomes the commit message.
set -euo pipefail
PROJ="$HOME/workspace/showcase-skills"
cd "$PROJ"
python3 scripts/build-page.py
git add -A
if git diff --cached --quiet; then
  echo "nothing new to deploy"
  exit 0
fi
MSG="${1:-deploy: rebuild skills.json + assets}"
git commit -qm "$MSG"
git push origin main
echo "deployed: $MSG"
echo "live: https://hackers-alt.github.io/skills-showcase/"
