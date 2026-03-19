#!/usr/bin/env bash
set -euo pipefail

if [ -z "${VOCAL_VISUALIZER_S3_BUCKET:-}" ]; then
  echo "ERROR: VOCAL_VISUALIZER_S3_BUCKET environment variable is not set."
  exit 1
fi

if [ -z "${VOCAL_VISUALIZER_CF_DISTRIBUTION_ID:-}" ]; then
  echo "ERROR: VOCAL_VISUALIZER_CF_DISTRIBUTION_ID environment variable is not set."
  exit 1
fi

DIST_DIR="dist"
if [ ! -d "$DIST_DIR" ]; then
  echo "ERROR: $DIST_DIR directory not found. Run 'npm run build' first."
  exit 1
fi

BUCKET="$VOCAL_VISUALIZER_S3_BUCKET"
CF_ID="$VOCAL_VISUALIZER_CF_DISTRIBUTION_ID"

echo "Deploying to s3://${BUCKET}..."

# Upload hashed assets with long cache
aws s3 sync "$DIST_DIR/assets/" "s3://${BUCKET}/assets/" \
  --delete \
  --cache-control "public, max-age=31536000, immutable"

# Upload HTML with no-cache
aws s3 cp "$DIST_DIR/index.html" "s3://${BUCKET}/index.html" \
  --cache-control "no-cache"

# Upload other root files (favicon, etc.)
aws s3 sync "$DIST_DIR/" "s3://${BUCKET}/" \
  --exclude "assets/*" \
  --exclude "index.html" \
  --delete

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$CF_ID" \
  --paths "/*" \
  --output text

echo "Deploy complete."
