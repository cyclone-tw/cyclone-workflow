#!/bin/bash
set -e
echo "Bumping version..."
bun run bump:version
echo "Building..."
bun run build
echo "Deploying to Cloudflare Pages..."
bunx wrangler pages deploy dist --project-name=cyclone-26
echo "Done!"
