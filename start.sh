#!/usr/bin/env bash
echo "========================================================"
echo "   Starting Cambit Canteen Smart Pre-Order System...   "
echo "========================================================"
cd "$(dirname "$0")"

if command -v open > /dev/null; then
  open http://localhost:3000 &
elif command -v xdg-open > /dev/null; then
  xdg-open http://localhost:3000 &
fi

node server.js
