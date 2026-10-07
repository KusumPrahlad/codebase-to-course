#!/bin/bash
# Thin wrapper kept for backward compatibility.
# The real build is build.mjs (Node; works on Windows, macOS and Linux) and it
# VALIDATES the course before assembling index.html.
# Run from the course directory: bash build.sh   (or: node build.mjs)
set -e
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  exec node build.mjs "$@"
fi
echo "Node.js not found - assembling WITHOUT validation (install Node to enable the checks)." >&2
cat _base.html modules/*.html _footer.html > index.html
echo "Built index.html (unvalidated) — open it in your browser."
