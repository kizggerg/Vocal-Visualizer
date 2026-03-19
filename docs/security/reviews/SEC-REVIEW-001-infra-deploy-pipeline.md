# Security Review: Infrastructure-as-Code and Deployment Pipeline

**Review ID:** SEC-REVIEW-001
**Date:** 2026-03-19
**Reviewer:** Security Engineer
**Scope:** Terraform IaC (`infra/`), GitHub Actions workflows (`.github/workflows/`), deploy script (`scripts/deploy.sh`), bootstrap script (`infra/bootstrap.sh`)
**Commits reviewed:** `cbf2ff4` (Terraform IaC), `8c7f847` (README/Makefile), and associated workflow changes
**Verdict:** CHANGES REQUESTED (1 High finding)

---

## Summary

The infrastructure code is well-structured and demonstrates strong security awareness. S3 bucket configuration, CloudFront OAC, OIDC federation, and IAM scoping are all implemented correctly and aligned with the security requirements in SR-secrets-management.md and TM-001. The deploy script uses safe bash practices (`set -euo pipefail`) and avoids hardcoded secrets.

One High finding must be addressed before this passes Gate 5b. The remaining findings are Medium, Low, or Informational and do not block progression but should be tracked.

---

## Findings

### F-001: CSP `connect-src 'none'` will break future API calls [Medium]

**Category:** Security Misconfiguration (A05)
**File:** `/home/user/Vocal-Visualizer/infra/cloudfront.tf`, line 28
**Severity:** Medium (Likelihood: High, Impact: Low)

The Content Security Policy sets `connect-src 'none'`, which blocks all `fetch()`, `XMLHttpRequest`, and WebSocket connections. While this is technically the most restrictive policy and appropriate for a purely static site with zero API calls, the product roadmap calls for audio file uploads and an analysis API. When that backend work begins, this directive will silently block all API communication.

This is not a security vulnerability -- it is overly restrictive rather than overly permissive. The concern is that a developer may weaken the CSP hastily (e.g., switching to `connect-src *`) to "fix" a broken feature, introducing a real vulnerability.

**Current value:**
```
connect-src 'none'
```

**Recommendation:** This is acceptable for the current MVP (no API calls). When the backend is introduced, update `connect-src` to the specific API Gateway domain. Document this explicitly so future developers know this directive must be updated in coordination with the API work. Add a comment in the Terraform code noting this intentional restriction.

**Risk accepted for now:** Yes -- no API calls exist today.

---

### F-002: Missing `Permissions-Policy` response header [Low]

**Category:** Security Misconfiguration (A05)
**File:** `/home/user/Vocal-Visualizer/infra/cloudfront.tf`
**Severity:** Low (Likelihood: Low, Impact: Low)

The CloudFront response headers policy includes HSTS, CSP, X-Content-Type-Options, X-Frame-Options, and Referrer-Policy. However, it does not include a `Permissions-Policy` header (formerly `Feature-Policy`). This header restricts access to browser features like camera, microphone, geolocation, etc.

For a vocal analysis app that will eventually use the microphone, this header should be configured proactively to deny all features except those explicitly needed.

**Recommendation:** Add a custom response header for `Permissions-Policy`. For the current static-only MVP:
```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```
When microphone access is needed, update to `microphone=(self)`.

Per Simplicity First (Principle 1) and the Low risk rating, this is advisory. Document and add when convenient.

---

### F-003: OIDC thumbprint is hardcoded and may become stale [High]

**Category:** Identification and Authentication Failures (A07)
**File:** `/home/user/Vocal-Visualizer/infra/oidc.tf`, line 8
**Severity:** High (Likelihood: Medium, Impact: High)

The OIDC provider uses a hardcoded thumbprint:
```hcl
thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
```

GitHub has changed its TLS certificate chain multiple times (notably in 2023 and 2024). When the thumbprint changes, OIDC authentication fails silently -- GitHub Actions deployments will stop working with a cryptic `AccessDenied` error, and the team may not immediately realize the cause.

More importantly, AWS announced in 2023 that for GitHub's OIDC provider specifically, AWS no longer validates the thumbprint (it uses a different trust mechanism for well-known providers). However, the `thumbprint_list` field is still required by the Terraform resource. The risk is twofold:

1. **Operational risk:** If AWS changes this behavior or the implementation depends on the thumbprint, a stale value breaks deployments.
2. **Misleading security posture:** The hardcoded value gives a false sense of pinned trust when the actual trust chain may be different.

**Recommendation:** Use a data source to dynamically fetch the thumbprint, or use the well-known workaround of setting the thumbprint to a placeholder value with a comment documenting that AWS does not validate it for GitHub's OIDC provider. The preferred approach:

```hcl
data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com/.well-known/openid-configuration"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
}
```

This ensures the thumbprint stays current automatically on each `terraform apply`.

**This finding is High severity because a stale thumbprint can break the entire deployment pipeline (Impact: High) and GitHub has a history of rotating certificates (Likelihood: Medium).**

---

### F-004: Terraform state bucket lacks lifecycle policy for noncurrent versions [Low]

**Category:** Security Misconfiguration (A05)
**File:** `/home/user/Vocal-Visualizer/infra/bootstrap.sh`
**Severity:** Low (Likelihood: Low, Impact: Low)

The bootstrap script enables versioning on the Terraform state bucket (good), but does not configure a lifecycle policy to expire old versions. Over time, this will accumulate noncurrent state file versions. While the cost is negligible for a prototype, old state files could contain sensitive information (resource ARNs, output values) and should be cleaned up.

**Recommendation:** Add a lifecycle policy to expire noncurrent versions after 90 days. This is advisory for the prototype.

---

### F-005: Deploy verification step does not fail the workflow on non-200 [Low]

**Category:** Security Logging and Monitoring Failures (A09)
**File:** `/home/user/Vocal-Visualizer/.github/workflows/deploy.yml`, lines 57-65
**Severity:** Low (Likelihood: Medium, Impact: Low)

The deployment verification step logs a `WARNING` on non-200 responses but does not fail the workflow:
```yaml
echo "WARNING: Received HTTP $STATUS (may need more propagation time)"
```

This means a deployment could silently fail (S3 sync error, CloudFront misconfiguration) and the workflow would still report success. An attacker who tampers with S3 contents or CloudFront configuration would not trigger an alert.

**Recommendation:** Consider making this step fail on non-200 after a reasonable retry period, or at minimum ensure monitoring/alerting is in place. For the prototype, the current behavior is understandable (CloudFront propagation can take time), but it should be improved before serving real users.

---

### F-006: SPA rewrite function does not validate URI path [Informational]

**Category:** Injection (A03) -- tangential
**File:** `/home/user/Vocal-Visualizer/infra/functions/spa-rewrite.js`
**Severity:** Informational

The CloudFront function checks `uri.includes(".")` to determine whether to serve a file or rewrite to `index.html`. This is a simple and common pattern. There is no direct vulnerability here because:
- CloudFront functions cannot access origin servers or make outbound requests
- The S3 origin will 403/404 on non-existent paths regardless
- The custom error responses handle 403/404 by serving index.html

However, the dot-check could be tricked by paths like `/api/v1.0/users` (contains a dot, would not rewrite). This is only relevant when backend routes are added behind the same CloudFront distribution.

**Recommendation:** No action needed for MVP. When API routes are added, ensure they use a separate CloudFront origin/behavior rather than relying on this function.

---

### F-007: `deploy.yml` builds artifacts twice (CI job + deploy job) [Informational]

**Category:** Software and Data Integrity Failures (A08)
**File:** `/home/user/Vocal-Visualizer/.github/workflows/deploy.yml`
**Severity:** Informational

The deploy workflow first runs the CI workflow (which includes `npx vite build`), then the deploy job runs `npx vite build` again. While not a security vulnerability per se, building twice means the artifact that was tested in CI is not the same artifact that gets deployed. If a dependency is compromised between the two builds (supply chain attack) or if the build is non-deterministic, the deployed artifact could differ from what was tested.

**Recommendation:** Consider using GitHub Actions artifacts to pass the build output from the CI job to the deploy job, ensuring the tested artifact is the deployed artifact. For a prototype, the risk is extremely low.

---

### F-008: CSP does not include `base-uri` or `form-action` directives [Low]

**Category:** Security Misconfiguration (A05)
**File:** `/home/user/Vocal-Visualizer/infra/cloudfront.tf`, line 28
**Severity:** Low (Likelihood: Low, Impact: Medium)

The CSP header is missing `base-uri` and `form-action` directives:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'none'; frame-ancestors 'none'
```

Without `base-uri 'self'`, an attacker who achieves HTML injection could insert a `<base>` tag to redirect relative URLs. Without `form-action 'self'`, forms could submit to external domains. The `frame-ancestors 'none'` is good and duplicates the X-Frame-Options DENY.

**Recommendation:** Add `base-uri 'self'; form-action 'self'` to the CSP. Low effort, low risk.

---

### F-009: `style-src 'unsafe-inline'` weakens CSP [Low]

**Category:** Security Misconfiguration (A05)
**File:** `/home/user/Vocal-Visualizer/infra/cloudfront.tf`, line 28
**Severity:** Low (Likelihood: Low, Impact: Medium)

The CSP includes `style-src 'self' 'unsafe-inline'`, which permits inline styles. This weakens the CSP against CSS injection attacks. Many modern frameworks (including the likely use of inline styles for dynamic visualizations) require this, so it may be a necessary trade-off.

**Recommendation:** Acceptable for now, especially if the frontend framework requires it. If possible in the future, use nonce-based or hash-based CSP for styles instead. Document as an accepted risk.

---

## Security Requirements Compliance Check

| Requirement | Status | Evidence |
|-------------|--------|----------|
| SR-001: `.env` in `.gitignore` | COMPLIANT | `.gitignore` lines 16-18 include `.env`, `.env.local`, `.env.*.local` |
| SR-002: OIDC federation for GitHub Actions | COMPLIANT | `oidc.tf` creates OIDC provider; `deploy.yml` uses `aws-actions/configure-aws-credentials@v4` with `role-to-assume` |
| SR-003: IAM role scoped to specific resources | COMPLIANT | `oidc.tf` policy scopes S3 actions to specific bucket ARN and CloudFront actions to specific distribution ARN. No `"Resource": "*"` |
| SR-005: GitHub secret scanning enabled | NOT VERIFIED | Cannot verify from code review alone; this is a repository setting. Must be confirmed via GitHub UI. |
| SR-007: Merges to `main` require PR approval | PARTIALLY VERIFIED | `deploy.yml` uses `environment: production` which can enforce approval gates. Branch protection rules must be verified in GitHub settings. |
| SR-010: `.env.example` maintained | NOT VERIFIED | Did not find a `.env.example` file in the repository. Should be created. |

---

## Positive Security Observations

The following security controls are correctly implemented and deserve recognition:

1. **S3 Block Public Access**: All four settings enabled (`block_public_acls`, `block_public_policy`, `ignore_public_acls`, `restrict_public_buckets`). The bucket policy only permits CloudFront OAC access with `AWS:SourceArn` condition.

2. **OIDC federation scoping**: The trust policy correctly uses `StringLike` on the `sub` claim to restrict to `repo:kizggerg/Vocal-Visualizer:ref:refs/heads/main`. This prevents forks and other branches from assuming the role.

3. **IAM least privilege**: The deploy role has exactly four S3 actions and two CloudFront actions, scoped to specific resource ARNs. No wildcards on resources.

4. **HTTPS enforcement**: CloudFront `viewer_protocol_policy = "redirect-to-https"` with HSTS `max-age=31536000` and `includeSubDomains`.

5. **Terraform state security**: Remote state in S3 with encryption, versioning, and DynamoDB locking. State bucket has public access blocked. `.tfstate` and `.tfvars` are in `.gitignore`.

6. **Deploy script safety**: Uses `set -euo pipefail`, reads config from environment variables or Terraform outputs (no hardcoded values), validates that the dist directory exists before uploading.

7. **Concurrency control**: `deploy.yml` uses `concurrency` with `cancel-in-progress: false` to prevent concurrent deployments.

8. **Dependency audit in CI**: `npm audit --omit=dev --audit-level=high` runs on every CI execution.

9. **S3 bucket versioning**: Enabled on both the site bucket and the state bucket, providing rollback capability.

---

## Threat Model Reference Note

The threat model document (`TM-001-secrets-management.md`) references the GitHub repository as `ggzik/VocalVisualizer` (line 135 and line 219), while the actual repository is `kizggerg/Vocal-Visualizer`. The Terraform code (`variables.tf`) correctly uses `kizggerg` and `Vocal-Visualizer`. The threat model document has a stale/incorrect reference. This is a documentation issue only -- the deployed infrastructure uses the correct values.

---

## Findings Summary

| ID | Severity | Finding | Blocks Gate 5b? |
|----|----------|---------|-----------------|
| F-003 | **High** | OIDC thumbprint is hardcoded and may become stale | **Yes** |
| F-001 | Medium | CSP `connect-src 'none'` will break future API calls | No |
| F-002 | Low | Missing `Permissions-Policy` response header | No |
| F-004 | Low | Terraform state bucket lacks lifecycle policy | No |
| F-005 | Low | Deploy verification does not fail on non-200 | No |
| F-008 | Low | CSP missing `base-uri` and `form-action` directives | No |
| F-009 | Low | `style-src 'unsafe-inline'` weakens CSP | No |
| F-006 | Informational | SPA rewrite function dot-check limitation | No |
| F-007 | Informational | Build artifacts not shared between CI and deploy jobs | No |

---

## Verdict: CHANGES REQUESTED

**Blocking finding:** F-003 (High) -- OIDC thumbprint hardcoded. Must switch to dynamic thumbprint resolution or document the AWS exemption with an explicit comment explaining that the value is a placeholder.

**After F-003 is resolved:** Re-submit for review. All other findings are Medium/Low/Informational and are documented but do not block.

---

## Recommended Priority for Non-Blocking Items

1. **F-008** (Low) -- Add `base-uri 'self'; form-action 'self'` to CSP. Minimal effort, immediate improvement.
2. **F-001** (Medium) -- Add a code comment to `connect-src 'none'` explaining it must be updated when API work begins. Track as a task.
3. **F-002** (Low) -- Add `Permissions-Policy` header. Low effort.
4. **F-005** (Low) -- Improve deploy verification to fail on persistent non-200.
5. **F-007** (Informational) -- Consider artifact sharing between CI and deploy jobs.
6. **F-004** (Low) -- Add lifecycle policy to state bucket.
7. **F-009** (Low) -- Accepted risk for now; revisit when CSP nonce support is feasible.
