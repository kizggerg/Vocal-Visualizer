#!/usr/bin/env bash
set -euo pipefail

# Resolve S3 bucket and CloudFront distribution ID.
# Priority: environment variables > Terraform outputs.

INFRA_DIR="$(cd "$(dirname "$0")/../infra" 2>/dev/null && pwd)" || true

if [ -z "${VOCAL_VISUALIZER_S3_BUCKET:-}" ]; then
  if [ -d "$INFRA_DIR" ] && command -v terraform &>/dev/null; then
    echo "Reading S3 bucket from Terraform outputs..."
    VOCAL_VISUALIZER_S3_BUCKET=$(terraform -chdir="$INFRA_DIR" output -raw s3_bucket_name 2>/dev/null) || true
  fi
  if [ -z "${VOCAL_VISUALIZER_S3_BUCKET:-}" ]; then
    echo "ERROR: VOCAL_VISUALIZER_S3_BUCKET is not set and could not be read from Terraform outputs."
    echo "Set the environment variable or run 'terraform apply' in infra/."
    exit 1
  fi
fi

if [ -z "${VOCAL_VISUALIZER_CF_DISTRIBUTION_ID:-}" ]; then
  if [ -d "$INFRA_DIR" ] && command -v terraform &>/dev/null; then
    echo "Reading CloudFront distribution ID from Terraform outputs..."
    VOCAL_VISUALIZER_CF_DISTRIBUTION_ID=$(terraform -chdir="$INFRA_DIR" output -raw cloudfront_distribution_id 2>/dev/null) || true
  fi
  if [ -z "${VOCAL_VISUALIZER_CF_DISTRIBUTION_ID:-}" ]; then
    echo "ERROR: VOCAL_VISUALIZER_CF_DISTRIBUTION_ID is not set and could not be read from Terraform outputs."
    echo "Set the environment variable or run 'terraform apply' in infra/."
    exit 1
  fi
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
