#!/bin/bash
set -e
cd "$(dirname "$0")"

# Kill anything already listening on port 3002 so the dev server always gets it
existing=$(lsof -ti tcp:3002 || true)
if [ -n "$existing" ]; then
  echo "Killing existing process(es) on port 3002: $existing"
  kill $existing 2>/dev/null || true
  sleep 1
  # Force-kill anything that survived
  survivors=$(lsof -ti tcp:3002 || true)
  if [ -n "$survivors" ]; then
    kill -9 $survivors 2>/dev/null || true
    sleep 1
  fi
fi

if [ ! -d node_modules ]; then
  pnpm install
fi
tsc_bin="./node_modules/.bin/tsc"
"$tsc_bin" -b
exec ./node_modules/.bin/vite --port 3002 --strictPort