#!/usr/bin/env bash
# Bootstrap Terraform remote state backend.
# Run this ONCE before the first `terraform init`.
#
# Prerequisites:
#   - AWS CLI configured with credentials that can create S3 buckets and DynamoDB tables
#   - The AWS_REGION environment variable or default profile region set to us-east-1
#
# Usage:
#   cd infra && bash bootstrap.sh

set -euo pipefail

BUCKET_NAME="vocal-visualizer-tfstate"
TABLE_NAME="vocal-visualizer-tfstate-lock"
REGION="${AWS_REGION:-us-east-1}"

echo "Creating Terraform state bucket: ${BUCKET_NAME}"
if aws s3api head-bucket --bucket "${BUCKET_NAME}" 2>/dev/null; then
  echo "Bucket already exists, skipping creation."
else
  aws s3api create-bucket \
    --bucket "${BUCKET_NAME}" \
    --region "${REGION}"

  aws s3api put-bucket-versioning \
    --bucket "${BUCKET_NAME}" \
    --versioning-configuration Status=Enabled

  aws s3api put-bucket-encryption \
    --bucket "${BUCKET_NAME}" \
    --server-side-encryption-configuration '{
      "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
    }'

  aws s3api put-public-access-block \
    --bucket "${BUCKET_NAME}" \
    --public-access-block-configuration \
      BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

  echo "State bucket created."
fi

echo "Creating DynamoDB lock table: ${TABLE_NAME}"
if aws dynamodb describe-table --table-name "${TABLE_NAME}" --region "${REGION}" 2>/dev/null; then
  echo "Table already exists, skipping creation."
else
  aws dynamodb create-table \
    --table-name "${TABLE_NAME}" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "${REGION}"

  echo "Lock table created."
fi

echo ""
echo "Bootstrap complete. You can now run:"
echo "  cd infra && terraform init"
