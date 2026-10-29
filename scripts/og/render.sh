#!/bin/sh
# Renders the social preview card to website/static/og.png with headless Chrome.
# Usage: sh scripts/og/render.sh   (set CHROME to your Chrome binary if it is not the macOS default)
set -e
here="$(cd "$(dirname "$0")" && pwd)"
chrome="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
"$chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --virtual-time-budget=4000 \
  --screenshot="$here/../../website/static/og.png" "file://$here/card.html"
