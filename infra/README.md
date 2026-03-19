# Infrastructure

Terraform configuration for the Vocal Visualizer frontend hosting on AWS. Supports staging and production environments (ADR-005).

## Architecture

```
User --> CloudFront (HTTPS, security headers) --> S3 (private, OAC-only)
```

Each environment (staging, prod) gets its own S3 bucket and CloudFront distribution. The OIDC provider and IAM role are shared.

- **S3 bucket**: Private static site storage with Block Public Access enabled on all four settings
- **CloudFront distribution**: CDN with OAC to S3, HTTP-to-HTTPS redirect, security headers
- **CloudFront function**: SPA routing (rewrites non-file paths to `/index.html`)
- **IAM OIDC provider**: GitHub Actions authentication without long-lived AWS keys
- **IAM role**: Scoped to S3 deploy, CloudFront invalidation, and Terraform operations

## Environments

| Environment | State Key | Trigger | Terraform Var File |
|-------------|-----------|---------|-------------------|
| Staging | `staging/terraform.tfstate` | Merge to `main` (automatic) | `envs/staging.tfvars` |
| Production | `prod/terraform.tfstate` | Manual workflow dispatch | `envs/prod.tfvars` |

## Cost

All resources are pay-per-request with no idle cost:

| Resource | Idle Cost | Usage Cost |
|----------|-----------|------------|
| S3 | $0 | ~$0.023/GB stored + $0.0004/1K requests |
| CloudFront | $0 | ~$0.085/GB transferred (PriceClass_100) |
| IAM/OIDC | $0 | Free |
| DynamoDB (state lock) | $0 | Pay-per-request, negligible |
| S3 (state bucket) | $0 | ~$0.023/GB, negligible for state files |

Two environments roughly double the cost, but for a prototype with <10 users, monthly cost is still effectively $0.

## Prerequisites

- AWS CLI configured with credentials (either `~/.aws/credentials` profile or environment variables)
- Terraform >= 1.5.0
- Sufficient IAM permissions to create S3 buckets, CloudFront distributions, IAM roles, and DynamoDB tables

## Bootstrap (One-Time Setup)

Before the first `terraform init`, create the S3 bucket and DynamoDB table for Terraform remote state.

```bash
cd infra
bash bootstrap.sh
```

This creates:
- S3 bucket `vocal-visualizer-tfstate` with versioning and encryption
- DynamoDB table `vocal-visualizer-tfstate-lock` with pay-per-request billing

## Usage

### Initialize (per-environment)

You must specify the state key at init time since each environment has its own state:

```bash
cd infra

# Staging
terraform init -backend-config="key=staging/terraform.tfstate"

# Production (re-init required when switching environments)
terraform init -reconfigure -backend-config="key=prod/terraform.tfstate"
```

Or use the Makefile shortcuts:

```bash
make infra-init-staging
make infra-init-prod
```

### Plan

```bash
# Staging
terraform plan -var-file=envs/staging.tfvars

# Production
terraform plan -var-file=envs/prod.tfvars
```

### Apply

```bash
# Staging
terraform apply -var-file=envs/staging.tfvars

# Production
terraform apply -var-file=envs/prod.tfvars
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

The deploy script reads `VOCAL_VISUALIZER_S3_BUCKET` and `VOCAL_VISUALIZER_CF_DISTRIBUTION_ID` from environment variables or Terraform outputs.

### CI/CD Deployment

Two workflows handle deployment:

1. **`deploy-staging.yml`** — Runs automatically on merge to `main`. Runs `terraform apply` for staging, then deploys the app.
2. **`promote-production.yml`** — Triggered manually via `workflow_dispatch`. Runs `terraform apply` for prod, then deploys the app.

Both workflows read Terraform outputs directly — no manual secrets needed for bucket names or distribution IDs. The only required GitHub repository secret is:

| Secret | Value | Source |
|--------|-------|--------|
| `AWS_DEPLOY_ROLE_ARN` | IAM role ARN for OIDC auth | `terraform output github_actions_role_arn` |

Configure this secret in both the `staging` and `production` GitHub environments.

## Security Controls

This infrastructure implements the following security requirements:

- **SR-200**: HTTPS redirect + HSTS (max-age=31536000, includeSubDomains)
- **SR-201**: S3 Block Public Access (all four settings) + CloudFront OAC
- **SR-002**: GitHub Actions OIDC federation (no long-lived AWS keys)
- **SR-003**: IAM role scoped to specific resources and Terraform operational permissions
- **SR-203**: Content Security Policy header via CloudFront response headers policy
- **SR-208**: X-Content-Type-Options, X-Frame-Options, Referrer-Policy headers

## File Structure

```
infra/
  bootstrap.sh       # One-time state backend setup
  versions.tf        # Terraform and provider versions, backend config (partial)
  variables.tf       # Input variables (including environment)
  s3.tf              # S3 bucket with public access block and OAC policy
  cloudfront.tf      # CloudFront distribution, OAC, security headers, SPA function
  oidc.tf            # GitHub Actions OIDC provider, IAM role, and Terraform permissions
  outputs.tf         # Terraform outputs (bucket name, distribution ID, etc.)
  envs/
    staging.tfvars   # Staging environment variables
    prod.tfvars      # Production environment variables
  functions/
    spa-rewrite.js   # CloudFront function for SPA client-side routing
```

## Destroying Infrastructure

To tear down a specific environment:

```bash
cd infra

# Init for the target environment first
terraform init -reconfigure -backend-config="key=staging/terraform.tfstate"
terraform destroy -var-file=envs/staging.tfvars
```

Note: The S3 bucket must be emptied before Terraform can delete it. Terraform will prompt for confirmation.

The state backend (S3 bucket and DynamoDB table created by `bootstrap.sh`) is not managed by Terraform and must be deleted manually if desired:

```bash
aws s3 rb s3://vocal-visualizer-tfstate --force
aws dynamodb delete-table --table-name vocal-visualizer-tfstate-lock --region us-east-1
```
