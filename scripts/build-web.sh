#!/usr/bin/env bash
# Builds the web version of the app into the docs/ folder, ready to deploy.
# Run it from anywhere:  ./scripts/build-web.sh
set -euo pipefail

# Move to the project root (one level up from this script).
cd "$(dirname "$0")/.."

echo "1/3  Exporting the web build into docs/ ..."
npx expo export --platform web --output-dir docs

echo "2/3  Creating the home-screen icon ..."
sips -z 180 180 assets/icon.png --out docs/apple-touch-icon.png >/dev/null
touch docs/.nojekyll  # harmless; tells GitHub Pages not to run Jekyll

echo "3/3  Adding full-screen + no-text-select settings to index.html ..."
node scripts/patch-web.js

echo ""
echo "✅ Web build ready in docs/."
echo "   To publish it:  git add -A && git commit -m \"update app\" && git push"
