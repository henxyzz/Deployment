#!/usr/bin/env bash
set -e

echo "==> Starting Deploy Panel..."
# Start Node.js panel
nohup node /app/panel-server.js &

# Keep container alive
wait
