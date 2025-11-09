#!/usr/bin/env bash
set -e

echo "==> Starting Pro Panel..."
nohup node /app/panel-server.js &

# Keep container alive
wait
