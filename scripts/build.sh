#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

npm run clean
npm run build

cp -f plugin.json dist/
cp -f icon.png dist/
cp -f preview.png dist/
cp -f README*.md dist/
rm -rf dist/i18n
cp -r i18n dist/i18n

rm -f package.zip
(cd dist && zip -r ../package.zip .)
echo "Built package.zip"
