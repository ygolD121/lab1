#!/bin/sh
# Bumps the ?v=N cache-busting version on every script and sound so browsers fetch the new build.
# Run from the repo root before committing a change: sh tools/bump-version.sh
cd "$(dirname "$0")/.." || exit 1
cur=$(sed -n 's/.*src="src\/main\.js?v=\([0-9]*\)".*/\1/p' index.html)
next=$((cur + 1))
sed -i "s/\.js?v=$cur'/.js?v=$next'/g" src/*.js
sed -i "s/src=\"src\/main\.js?v=$cur\"/src=\"src\/main.js?v=$next\"/" index.html
echo "version $cur -> $next"
