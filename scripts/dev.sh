#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

npm run clean
mkdir -p dev
cp -f plugin.json dev/
cp -f icon.png dev/
cp -f preview.png dev/
cp -f README*.md dev/
rm -rf dev/i18n
cp -r i18n dev/i18n

npm run dev
