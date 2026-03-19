# ADR-005: Multi-Environment Deployment Strategy

## Status: Proposed

## Context

The project currently has a single production environment with manual Terraform operations and automated app-only deployment on merge to main. This is insufficient for agentic development where agents must validate their work against a real deployed environment, not just local checks.

The current flow is: local dev → merge to main → deploy app to prod. There is no staging gate, and Terraform changes are applied manually.

## Decision

### Three-Tier Deployment Model

```
Feature Branch (local)  →  main (staging)  →  Production (explicit promotion)
```

| Environment | Trigger | Purpose |
|-------------|---------|---------|
| Local | Feature branch, `npm run dev` | Developer/agent iteration |
| Staging | Merge to `main` (automatic) | Validation of deployed artifacts; agentic SDLC verification |
| Production | Manual workflow dispatch (explicit promotion) | End-user facing |

### Pipeline Executes Terraform

The CI/CD pipeline will run `terraform plan` and `terraform apply` — not humans locally. This ensures infrastructure changes go through the same review and automation gates as application code.

- **Staging:** `terraform apply` runs automatically on merge to main
- **Production:** `terraform apply` runs on explicit manual promotion via `workflow_dispatch`
- **Plan on PR:** `terraform plan` runs on PRs that modify `infra/` files (informational, posted as PR comment)

### Environment Isolation via Terraform Variable Files

Each environment gets:
- Its own `.tfvars` file (`infra/envs/staging.tfvars`, `infra/envs/prod.tfvars`)
- Its own Terraform state key (`staging/terraform.tfstate`, `prod/terraform.tfstate`)
- Its own set of AWS resources (separate S3 buckets, CloudFront distributions)
- Shared OIDC provider and IAM role (scoped to main branch)

Resources are namespaced with the environment: `vocal-visualizer-staging-site-*`, `vocal-visualizer-prod-site-*`.

### IAM Role Expansion

The GitHub Actions OIDC role will be expanded from deploy-only permissions (S3 sync + CloudFront invalidation) to include Terraform operational permissions:
- S3 bucket management (create, configure)
- CloudFront distribution management (create, update)
- IAM role/policy management (for self-managing the deploy role)
- Terraform state access (S3 + DynamoDB)

The role remains scoped to `refs/heads/main` only — no feature branch can assume it.

### SDLC Integration

The deployment model maps to the SDLC phases:
- **Phase 4 (Implementation):** Local development and testing on feature branches
- **Phase 5-6 (Review/Validation):** PR review includes `terraform plan` output for infra changes
- **Phase 8 (Deploy):** Merge to main auto-deploys to staging; explicit promotion to production after HC-3 approval

## Consequences

- Infrastructure changes are version-controlled and peer-reviewed like application code
- Agents can validate against a real staging deployment, not just local builds
- Production deployments require explicit human action (workflow_dispatch)
- AWS costs roughly double for infrastructure (two S3 buckets, two CloudFront distributions) — still well under $100/month ceiling as both are pay-per-request/near-zero idle
- The OIDC role has broader permissions than before, but remains scoped to the main branch
- Bootstrap script must be run once to ensure the shared state backend exists (unchanged)
- Existing production resources will need to be imported or recreated under the new naming convention

## Alternatives Considered

### Terraform Workspaces
Rejected: workspaces share the same backend config and are implicit state. Separate state keys with tfvars are more explicit and harder to accidentally mix up.

### Separate Terraform Roots Per Environment
Rejected: too much duplication for a project this size. A single root with variable files is simpler.

### Keep Manual Terraform
Rejected: the user explicitly requires pipeline-driven infrastructure. Manual apply doesn't scale to agentic development.
