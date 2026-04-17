#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-$(git branch --show-current)}"
PROJECT="cyclone-26"

echo "==> Building..."
rm -f .wrangler/deploy/config.json
bun run build

if [ "$BRANCH" = "main" ]; then
  echo "⚠️  This will deploy directly to PRODUCTION (cyclone.tw), bypassing CI/CD."
  echo "   Prefer merging a PR and letting GitHub Actions deploy."
  read -rp "   Type 'deploy' to confirm: " confirm
  [ "$confirm" = "deploy" ] || { echo "Aborted."; exit 1; }
fi

echo "==> Deploying to Cloudflare Pages (branch: $BRANCH)..."
wrangler pages deploy dist --project-name "$PROJECT" --branch "$BRANCH" --commit-dirty=true

echo "==> Done!"
echo "    Preview: https://$PROJECT.pages.dev"
if [ "$BRANCH" = "main" ]; then
  echo "    Production: https://cyclone.tw"
fi
