# Infrastructure

Terraform configuration for the Vocal Visualizer MVP frontend hosting on AWS.

## Architecture

```
User --> CloudFront (HTTPS, security headers) --> S3 (private, OAC-only)
```

- **S3 bucket**: Private static site storage with Block Public Access enabled on all four settings
- **CloudFront distribution**: CDN with OAC to S3, HTTP-to-HTTPS redirect, security headers
- **CloudFront function**: SPA routing (rewrites non-file paths to `/index.html`)
- **IAM OIDC provider**: GitHub Actions authentication without long-lived AWS keys
- **IAM role**: Scoped to S3 deploy and CloudFront invalidation only

## Cost

All resources are pay-per-request with no idle cost:

| Resource | Idle Cost | Usage Cost |
|----------|-----------|------------|
| S3 | $0 | ~$0.023/GB stored + $0.0004/1K requests |
| CloudFront | $0 | ~$0.085/GB transferred (PriceClass_100) |
| IAM/OIDC | $0 | Free |
| DynamoDB (state lock) | $0 | Pay-per-request, negligible |
| S3 (state bucket) | $0 | ~$0.023/GB, negligible for state files |

For a prototype with <10 users, monthly cost is effectively $0.

## Prerequisites

- AWS CLI configured with credentials (either `~/.aws/credentials` profile or environment variables)
- Terraform >= 1.5.0
- Sufficient IAM permissions to create S3 buckets, CloudFront distributions, IAM roles, and DynamoDB tables

## Bootstrap (One-Time Setup)

Before the first `terraform init`, you must create the S3 bucket and DynamoDB table for Terraform remote state.

```bash
cd infra
bash bootstrap.sh
```

This creates:
- S3 bucket `vocal-visualizer-tfstate` with versioning and encryption
- DynamoDB table `vocal-visualizer-tfstate-lock` with pay-per-request billing

## Usage

### Initialize

```bash
cd infra
terraform init
```

### Plan (review changes before applying)

```bash
terraform plan
```

### Apply

```bash
terraform apply
```

After apply, Terraform outputs the values needed for deployment:

| Output | Description |
|--------|-------------|
| `s3_bucket_name` | S3 bucket name for uploading built files |
| `cloudfront_distribution_id` | Distribution ID for cache invalidation |
| `cloudfront_domain_name` | The site URL (e.g., `https://d1234567890.cloudfront.net`) |
| `github_actions_role_arn` | IAM role ARN to configure in GitHub repository secrets |

### Deploying the Site

After `terraform apply`, deploy the built frontend:

```bash
# From the project root
npm run build
bash scripts/deploy.sh
```

The deploy script automatically reads the S3 bucket name and CloudFront distribution ID from Terraform outputs. You can also set them as environment variables:

```bash
export VOCAL_VISUALIZER_S3_BUCKET="<bucket-name>"
export VOCAL_VISUALIZER_CF_DISTRIBUTION_ID="<distribution-id>"
bash scripts/deploy.sh
```

### CI/CD Deployment

The GitHub Actions deploy workflow (`.github/workflows/deploy.yml`) handles deployment automatically on merges to `main`. It requires these GitHub repository secrets:

| Secret | Value | Source |
|--------|-------|--------|
| `AWS_DEPLOY_ROLE_ARN` | IAM role ARN for OIDC auth | `terraform output github_actions_role_arn` |
| `S3_BUCKET_NAME` | S3 bucket name | `terraform output s3_bucket_name` |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID | `terraform output cloudfront_distribution_id` |
| `CLOUDFRONT_DOMAIN` | CloudFront domain (without `https://`) | `terraform output cloudfront_domain_name` (strip prefix) |

## Security Controls

This infrastructure implements the following security requirements:

- **SR-200**: HTTPS redirect + HSTS (max-age=31536000, includeSubDomains)
- **SR-201**: S3 Block Public Access (all four settings) + CloudFront OAC
- **SR-002**: GitHub Actions OIDC federation (no long-lived AWS keys)
- **SR-003**: IAM role scoped to specific S3 bucket and CloudFront distribution
- **SR-203**: Content Security Policy header via CloudFront response headers policy
- **SR-208**: X-Content-Type-Options, X-Frame-Options, Referrer-Policy headers

## File Structure

```
infra/
  bootstrap.sh       # One-time state backend setup
  versions.tf        # Terraform and provider versions, backend config
  variables.tf       # Input variables
  s3.tf              # S3 bucket with public access block and OAC policy
  cloudfront.tf      # CloudFront distribution, OAC, security headers, SPA function
  oidc.tf            # GitHub Actions OIDC provider and IAM role
  outputs.tf         # Terraform outputs (bucket name, distribution ID, etc.)
  functions/
    spa-rewrite.js   # CloudFront function for SPA client-side routing
```

## Destroying Infrastructure

To tear down all resources:

```bash
cd infra
terraform destroy
```

Note: The S3 bucket must be emptied before Terraform can delete it. Terraform will prompt for confirmation.

The state backend (S3 bucket and DynamoDB table created by `bootstrap.sh`) is not managed by Terraform and must be deleted manually if desired:

```bash
aws s3 rb s3://vocal-visualizer-tfstate --force
aws dynamodb delete-table --table-name vocal-visualizer-tfstate-lock --region us-east-1
```
