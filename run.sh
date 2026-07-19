#!/bin/bash
# Artie's Rocket Lab — start script.
# Type-checks first (the project must be clean), then starts the dev server on :3003.
set -e
cd "$(dirname "$0")"
pnpm exec tsc -b
pnpm exec vite --port 3003