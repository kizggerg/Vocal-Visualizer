#!/usr/bin/env bash
set -euo pipefail

MAX_KB=500
DIST_DIR="dist"

if [ ! -d "$DIST_DIR" ]; then
  echo "ERROR: $DIST_DIR directory not found. Run 'npm run build' first."
  exit 1
fi

# Calculate total gzipped size of JS and CSS files
total_bytes=0
for file in $(find "$DIST_DIR" \( -name "*.js" -o -name "*.css" \)); do
  gzipped_size=$(gzip -c "$file" | wc -c)
  total_bytes=$((total_bytes + gzipped_size))
  echo "  $(basename "$file"): $((gzipped_size / 1024)) KB gzipped"
done

total_kb=$((total_bytes / 1024))
echo ""
echo "Total gzipped JS+CSS: ${total_kb} KB (limit: ${MAX_KB} KB)"

if [ "$total_kb" -gt "$MAX_KB" ]; then
  echo "FAIL: Bundle size exceeds ${MAX_KB} KB limit"
  exit 1
fi

echo "PASS: Bundle size within limit"
