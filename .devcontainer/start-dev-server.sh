#!/usr/bin/env bash
set -e

# Start the Vite dev server in the app folder on port 5173.
# Run this in the background so the devcontainer startup step can complete.

cd "$(dirname "$0")/../app"

# Kill any stale Vite process on the same port before starting.
pkill -f 'vite --host 0.0.0.0 --port 5173' || true

nohup npm run dev -- --host 0.0.0.0 --port 5173 > /tmp/vite-start.log 2>&1 &

echo "Vite dev server started in background on port 5173"
echo "Logs: /tmp/vite-start.log"
