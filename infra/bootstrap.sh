#!/usr/bin/env bash
# Bootstrap Terraform remote state backend and GitHub Actions OIDC provider.
# Run this ONCE before the first `terraform init`.
#
# Prerequisites:
#   - AWS CLI configured with credentials that can create S3 buckets, DynamoDB tables, and IAM OIDC providers
#   - The AWS_REGION environment variable or default profile region set to us-east-1
#
# Usage:
#   cd infra && bash bootstrap.sh

set -euo pipefail

BUCKET_NAME="vocal-visualizer-tfstate"
TABLE_NAME="vocal-visualizer-tfstate-lock"
OIDC_URL="https://token.actions.githubusercontent.com"
REGION="${AWS_REGION:-us-east-1}"

echo "=== Step 1/3: Terraform state bucket ==="
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

echo ""
echo "=== Step 2/3: DynamoDB lock table ==="
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
echo "=== Step 3/3: GitHub Actions OIDC provider ==="
# The OIDC identity provider is an account-wide singleton.
# Per-environment Terraform configs reference it via data source.
EXISTING_OIDC=$(aws iam list-open-id-connect-providers --query "OpenIDConnectProviderList[?ends_with(Arn, '/token.actions.githubusercontent.com')].Arn" --output text 2>/dev/null || true)
if [ -n "${EXISTING_OIDC}" ]; then
  echo "OIDC provider already exists: ${EXISTING_OIDC}"
  echo "Skipping creation."
else
  # Fetch the TLS thumbprint for GitHub's OIDC endpoint
  THUMBPRINT=$(openssl s_client -servername token.actions.githubusercontent.com \
    -connect token.actions.githubusercontent.com:443 < /dev/null 2>/dev/null \
    | openssl x509 -fingerprint -sha1 -noout 2>/dev/null \
    | sed 's/sha1 Fingerprint=//;s/://g' \
    | tr '[:upper:]' '[:lower:]')

  if [ -z "${THUMBPRINT}" ]; then
    echo "WARNING: Could not fetch TLS thumbprint. Using placeholder."
    echo "You may need to update the OIDC provider thumbprint manually."
    THUMBPRINT="0000000000000000000000000000000000000000"
  fi

  aws iam create-open-id-connect-provider \
    --url "${OIDC_URL}" \
    --client-id-list "sts.amazonaws.com" \
    --thumbprint-list "${THUMBPRINT}"

  echo "OIDC provider created."
fi

echo ""
echo "Bootstrap complete. Next steps:"
echo "  1. Initialize Terraform for staging:"
echo "     cd infra && terraform init -backend-config=\"key=staging/terraform.tfstate\""
echo "  2. Apply staging infrastructure:"
echo "     terraform apply -var-file=envs/staging.tfvars"
echo "  3. Note the role ARN from the output:"
echo "     terraform output github_actions_role_arn"
echo "  4. Set the role ARN as AWS_DEPLOY_ROLE_ARN in the GitHub 'staging' environment"
echo "  5. Repeat steps 1-4 for prod (use -reconfigure on init)"
