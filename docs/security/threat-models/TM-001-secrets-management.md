# Threat Model: Secrets Management Strategy

## Overview

This document defines how secrets are stored, accessed, rotated, and scoped across four execution environments: local development, GitHub Actions CI/CD, Claude Cloud Agents, and AWS production runtime. It includes a threat assessment of the cloud agent execution model.

**Governing principles applied:**
- ADR-001 Principle 2 (Security First): Secrets never in code, least privilege everywhere
- ADR-001 Principle 1 (Simplicity First): For Medium/Low risk items, prefer the simpler approach
- ADR-001 Principle 5 (Scale-to-Zero): No always-on secrets infrastructure
- ADR-002: AWS-native, <$100/month, GitHub Actions CI/CD

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TRUST BOUNDARY: Developer Machine            │
│  ┌──────────────┐                                                   │
│  │  .env file   │──── exports ────▶ Local app process               │
│  │  (gitignored)│                                                   │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   TRUST BOUNDARY: GitHub Actions                    │
│  ┌──────────────────┐    OIDC     ┌─────────────┐                  │
│  │ GitHub Secrets    │───token───▶│  AWS STS     │                  │
│  │ (repo settings)  │            │  AssumeRole  │                  │
│  └──────────────────┘            └──────┬───────┘                  │
│  ┌──────────────────┐                   │                          │
│  │ OIDC Identity    │     short-lived   │                          │
│  │ Provider         │◀── credentials ───┘                          │
│  └──────────────────┘                                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│               TRUST BOUNDARY: Claude Cloud Agents                   │
│  ┌──────────────────┐    OIDC     ┌─────────────┐                  │
│  │ Agent env config │───token───▶│  AWS STS     │                  │
│  │ (platform-mgd)   │            │  AssumeRole  │                  │
│  └──────────────────┘            └──────┬───────┘                  │
│  Sandbox: network-restricted,           │                          │
│  read-only repo, scoped IAM             │                          │
│           short-lived credentials ◀─────┘                          │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   TRUST BOUNDARY: AWS Production                    │
│  ┌──────────────┐  IAM Role  ┌────────────────────┐                │
│  │ Lambda/ECS   │───────────▶│ AWS Services       │                │
│  │ Execution    │            │ (S3, DynamoDB, etc.)│                │
│  │ Role         │            └────────────────────┘                │
│  └──────────────┘                                                  │
│         │                                                          │
│         ▼                                                          │
│  ┌──────────────────────┐                                          │
│  │ SSM Parameter Store  │  ◀── API keys, third-party secrets       │
│  │ (SecureString)       │                                          │
│  └──────────────────────┘                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Assets

| Asset | Sensitivity | Location |
|-------|------------|----------|
| AWS account credentials | Critical | Never stored — obtained via OIDC/IAM roles |
| Third-party API keys (future) | High | SSM Parameter Store (prod), .env (local), GitHub Secrets (CI) |
| GitHub personal access tokens | High | Developer machine only, never shared |
| AWS account ID | Low | Can be in code/IaC (not a secret, but don't advertise) |
| OIDC trust configuration | Medium | IaC (CloudFormation/CDK), version-controlled |
| Audio recordings (user data) | Medium | S3 bucket, encrypted at rest |

---

## Environment-by-Environment Strategy

### 1. Local Development

| Aspect | Decision |
|--------|----------|
| **Where secrets are stored** | `.env` file in project root, listed in `.gitignore` |
| **How they are accessed** | Loaded via `dotenv` or shell `export`; app reads `process.env` |
| **What secrets are needed** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (or use `aws configure` profiles — preferred) |
| **Blast radius if compromised** | Limited to developer's IAM permissions. If using scoped dev IAM user, blast radius is dev resources only. |
| **Mitigations** | `.env` in `.gitignore`; use named AWS CLI profiles with `--profile dev`; IAM user scoped to dev resources only; enable MFA on AWS console; never use root credentials |

**Recommended approach:** Use AWS CLI named profiles (`~/.aws/credentials` with profile `vocalvisualizer-dev`). The `.env` file holds only non-AWS config (feature flags, local URLs). AWS credentials stay in the standard AWS credentials file, which developers already manage.

Provide a `.env.example` file in the repo with placeholder values (no real secrets) so developers know what's needed.

### 2. GitHub Actions CI/CD

| Aspect | Decision |
|--------|----------|
| **Where secrets are stored** | GitHub repository secrets (Settings > Secrets and variables > Actions) |
| **How they are accessed** | OIDC federation — no long-lived AWS keys |
| **What secrets are needed** | Only the AWS IAM Role ARN for OIDC (not a secret per se). Any third-party API keys go in GitHub Secrets. |
| **Blast radius if compromised** | Attacker can deploy to the environment the role permits. Mitigated by scoping the role. |
| **Mitigations** | OIDC federation (no long-lived keys); role scoped to specific actions; branch protection on `main`; require PR approval before deploy workflows run |

**OIDC Federation setup (recommended over long-lived keys):**

```yaml
# .github/workflows/deploy.yml (relevant section)
permissions:
  id-token: write
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::ACCOUNT_ID:role/GitHubActions-VocalVisualizer
      aws-region: us-east-1
```

**IAM OIDC Provider setup (IaC):**

```
AWS::IAM::OIDCProvider
  Url: https://token.actions.githubusercontent.com
  ClientIdList: ["sts.amazonaws.com"]
  ThumbprintList: [GitHub's thumbprint]

AWS::IAM::Role (GitHubActions-VocalVisualizer)
  AssumeRolePolicyDocument:
    Condition:
      StringEquals:
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      StringLike:
        "token.actions.githubusercontent.com:sub": "repo:ggzik/VocalVisualizer:ref:refs/heads/main"
  Policies:
    - Deploy to S3, update Lambda, manage CloudFront, read SSM params
```

**Why OIDC over long-lived keys:**
- No secrets to rotate — tokens are ephemeral (valid ~1 hour)
- Scoped to specific repo + branch
- No risk of leaked AWS keys in GitHub breach
- AWS-recommended approach
- Simplicity First: fewer secrets to manage

### 3. Claude Cloud Agents / Remote Execution

| Aspect | Decision |
|--------|----------|
| **Where secrets are stored** | Platform-managed environment variables (Claude Code's built-in secrets), or GitHub Secrets if agents trigger workflows |
| **How they are accessed** | Agents trigger GitHub Actions workflows (preferred) rather than holding AWS credentials directly |
| **What secrets are needed** | GitHub token (to trigger workflows, push branches), limited AWS credentials for running tests against dev resources only |
| **Blast radius if compromised** | Code execution in sandbox. If agent credentials leak: access to dev resources only. No production access. |
| **Mitigations** | See detailed threat assessment below |

**Recommended architecture for agent access:**

```
Agent wants to deploy
        │
        ▼
Pushes branch ──▶ GitHub Actions workflow triggers ──▶ AWS (via OIDC)
        │
        └── Agent never holds AWS credentials directly
```

Agents should work through GitHub Actions as the deployment mechanism, not hold AWS credentials themselves. This gives us:
- Audit trail (GitHub Actions logs)
- Same deployment path as humans
- No direct AWS credentials in agent environments
- Branch protection still applies

For running tests that need AWS resources (e.g., integration tests against a dev DynamoDB table), agents can either:
- **Option A (simpler):** Use a dedicated IAM user with minimal permissions, credentials stored in Claude's platform secrets. Scoped to dev resources only.
- **Option B (more secure):** Always run tests via GitHub Actions. Agent pushes code, CI runs tests, agent reads results.

**Recommendation:** Start with Option B (agents trigger CI). If the feedback loop is too slow, fall back to Option A with tightly scoped credentials.

### 4. AWS Production Runtime

| Aspect | Decision |
|--------|----------|
| **Where secrets are stored** | AWS SSM Parameter Store (SecureString type) for third-party API keys. AWS-to-AWS auth uses IAM roles — no stored credentials. |
| **How they are accessed** | Lambda/ECS execution roles grant access to SSM parameters and AWS services. No credentials in environment variables. |
| **What secrets are needed** | IAM execution role (auto-assigned), SSM parameters for any third-party API keys (none needed for MVP) |
| **Blast radius if compromised** | Attacker has access to what the Lambda role permits: read/write to specific S3 bucket and DynamoDB table. No access to other AWS accounts or services. |
| **Mitigations** | Least-privilege IAM roles; SSM SecureString encrypted with KMS (default key is fine for prototype); VPC not required for prototype but add if handling PII later; CloudWatch logging for all Lambda invocations |

**Why SSM Parameter Store over Secrets Manager:**
- SSM Parameter Store is free for standard parameters (Secrets Manager costs $0.40/secret/month)
- SecureString type provides KMS encryption
- Sufficient for a prototype with <10 users
- Simplicity First: one fewer service to manage
- If we later need automatic rotation, we can migrate to Secrets Manager

**Example SSM parameter layout:**
```
/vocalvisualizer/prod/api-key-xyz    (SecureString)
/vocalvisualizer/dev/api-key-xyz     (SecureString)
```

**Lambda execution role policy (example):**
```json
{
  "Effect": "Allow",
  "Action": ["ssm:GetParameter", "ssm:GetParameters"],
  "Resource": "arn:aws:ssm:us-east-1:ACCOUNT_ID:parameter/vocalvisualizer/prod/*"
}
```

---

## Threats (STRIDE Analysis)

| ID | Category | Threat | Likelihood | Impact | Risk | Mitigation |
|----|----------|--------|-----------|--------|------|------------|
| T1 | Information Disclosure | Secrets committed to public repo | Medium | High | High | `.gitignore` for `.env`; pre-commit hook with `git-secrets` or `gitleaks`; GitHub secret scanning enabled |
| T2 | Spoofing | Attacker assumes OIDC role by forking repo | Low | High | Medium | OIDC condition restricts to exact repo owner + branch (`repo:ggzik/VocalVisualizer:ref:refs/heads/main`) |
| T3 | Elevation of Privilege | CI role has overly broad permissions | Medium | High | High | Scope IAM role to specific resources; separate roles for deploy vs. read-only; review role policy quarterly |
| T4 | Information Disclosure | Agent sandbox escape exposes secrets | Low | High | Medium | Agents do not hold production credentials; dev-only scoped credentials; monitor for anomalous API calls |
| T5 | Tampering | Agent pushes malicious code that deploys | Medium | High | High | Branch protection on `main`; require human PR approval for production deploys; agents cannot merge to `main` without review |
| T6 | Information Disclosure | SSM parameters accessed by unauthorized role | Low | Medium | Low | IAM policy restricts SSM access to specific parameter paths; CloudTrail logs all SSM access |
| T7 | Spoofing | Compromised GitHub token allows repo impersonation | Low | Medium | Medium | Use fine-grained GitHub PATs with minimal scopes; set token expiration; rotate quarterly |
| T8 | Repudiation | Agent actions lack audit trail | Medium | Medium | Medium | All deploys go through GitHub Actions (logged); CloudTrail for AWS API calls; agent sessions are logged by platform |
| T9 | Information Disclosure | `.env` file shared between developers insecurely | Medium | Medium | Medium | Document that `.env` must never be shared via Slack/email; each developer creates their own from `.env.example` |

---

## Cloud Agent Threat Assessment

### Execution Model

Claude Cloud Agents operate in sandboxed environments with access to the repository. They can read code, write code, run tests, run builds, and potentially trigger deployments. They may run asynchronously (overnight, unattended).

### Specific Risks

**Risk 1: Agent pushes malicious or flawed code that reaches production**
- Likelihood: Medium (agents can make mistakes; prompt injection is a known attack vector)
- Impact: High (code runs in production with Lambda role privileges)
- Risk: **High**
- Mitigation:
  - Agents CANNOT merge to `main` — human approval required on all PRs
  - Branch protection rules enforce this at the GitHub level
  - CI pipeline runs security scans (lint, SAST, dependency audit) before merge is possible
  - Production deploy workflow only triggers on `main` branch merges

**Risk 2: Agent credentials are stolen from sandbox environment**
- Likelihood: Low (sandboxes are managed by Claude's platform)
- Impact: Medium (if scoped to dev-only, limited blast radius)
- Risk: **Medium**
- Mitigation:
  - Agents never hold production AWS credentials
  - Any AWS credentials are scoped to dev resources only
  - Prefer agents working through GitHub Actions (no direct AWS credentials)
  - Monitor CloudTrail for unusual API calls from agent IAM identity

**Risk 3: Agent exfiltrates secrets from repo or environment**
- Likelihood: Low (requires sandbox escape or prompt injection)
- Impact: High (could leak any secret the agent can access)
- Risk: **Medium**
- Mitigation:
  - Agents do not have access to production secrets
  - Network egress from agent sandbox is controlled by platform
  - Secrets are never stored in the repository
  - Agent has read access to repo code only — not to GitHub Secrets or SSM parameters directly

**Risk 4: Unattended overnight execution without monitoring**
- Likelihood: Medium (agents run asynchronously by design)
- Impact: Medium (delayed detection of issues)
- Risk: **Medium**
- Mitigation:
  - Set up GitHub Actions notifications for failed workflows
  - Agent actions are bounded by their task scope
  - Rate limiting on AWS API calls via IAM policy conditions
  - Review agent PRs and activity each morning

### Agent Permission Scoping

**Agents SHOULD have:**
- Push branches to the repository
- Create pull requests
- Trigger CI workflows (lint, test, build)
- Read CI/CD results
- Run tests locally in their sandbox
- Access to dev/staging AWS resources (if Option A is used)

**Agents SHOULD NOT have:**
- Merge access to `main` branch
- Production AWS credentials
- Access to SSM Parameter Store production path
- Ability to modify GitHub repository settings
- Ability to modify IAM roles or policies
- Ability to create/delete AWS resources (only use existing ones)

**Agents and production deployment:**
- **Recommendation: Agents should NOT have production deployment access.**
- Agents can prepare deployments (code, IaC changes, PR descriptions), but a human must approve and merge to `main`, which triggers the production deploy.
- This is consistent with ADR-001 Principle 14 (Human-in-the-Loop) — deployment to production is an expensive-to-reverse decision.

---

## Secret Rotation Strategy

| Secret Type | Rotation Frequency | Method | Owner |
|-------------|-------------------|--------|-------|
| AWS OIDC tokens (CI/CD) | Automatic — ephemeral per job | No action needed | GitHub/AWS |
| Local dev AWS credentials | Quarterly or on suspicion of compromise | Regenerate IAM access keys, update `~/.aws/credentials` | Developer |
| GitHub fine-grained PATs | 90-day expiration | Regenerate in GitHub settings | Developer |
| SSM Parameter Store values | When compromised or vendor requires | Update via AWS CLI/Console, redeploy Lambdas | Human (Ops) |
| Agent platform secrets | When compromised or quarterly | Update in Claude platform settings | Human (Ops) |

For the prototype, manual rotation is acceptable. Automated rotation (via Secrets Manager) is over-engineering at <10 users.

---

## Security Requirements

- [SR-001]: Repository MUST have `.env` in `.gitignore` before any secrets exist locally — Priority: **Critical**
- [SR-002]: GitHub Actions MUST use OIDC federation for AWS access, not long-lived keys — Priority: **High**
- [SR-003]: CI/CD IAM role MUST be scoped to specific resources and actions, not `*` — Priority: **High**
- [SR-004]: Pre-commit secret scanning MUST be configured (`gitleaks` or `git-secrets`) — Priority: **High**
- [SR-005]: GitHub secret scanning MUST be enabled on the repository — Priority: **High**
- [SR-006]: Claude Cloud Agents MUST NOT have production AWS credentials — Priority: **High**
- [SR-007]: All merges to `main` MUST require human PR approval — Priority: **High**
- [SR-008]: Production Lambda roles MUST follow least-privilege (no `*` resources) — Priority: **High**
- [SR-009]: Third-party API keys MUST be stored in SSM Parameter Store (SecureString), not environment variables or code — Priority: **High**
- [SR-010]: `.env.example` MUST be maintained with placeholder values for all required config — Priority: **Medium**
- [SR-011]: CloudTrail MUST be enabled for audit logging of AWS API calls — Priority: **Medium**
- [SR-012]: GitHub fine-grained PATs used by agents MUST have expiration set (max 90 days) — Priority: **Medium**
- [SR-013]: Agent IAM credentials (if Option A) MUST be scoped to dev resources only with explicit resource ARNs — Priority: **High**

---

## Recommendations (Priority Order)

1. **Set up `.gitignore` and `.env.example` now** — Zero cost, prevents the most common leak vector (T1). Do this before any secrets exist.

2. **Enable GitHub secret scanning** — Free for public repos. Catches accidental commits of AWS keys, API tokens, etc.

3. **Configure pre-commit secret scanning** — Add `gitleaks` to pre-commit hooks. Catches secrets before they reach GitHub.

4. **Set up OIDC federation for GitHub Actions** — Do this when creating the first CI/CD workflow. No long-lived keys to manage.

5. **Define branch protection rules** — Require PR approval for `main`. This is the critical control that prevents agents (and anyone) from deploying unchecked code.

6. **Scope all IAM roles tightly** — Every role gets only the permissions it needs, with explicit resource ARNs. No `"Resource": "*"`.

7. **Start agents with CI-only access (Option B)** — Agents trigger GitHub Actions, never hold AWS credentials directly. Reassess if feedback loop is too slow.

8. **Enable CloudTrail** — Basic CloudTrail is free for management events. Provides audit trail for all AWS API calls.

9. **Use SSM Parameter Store for production secrets** — When third-party API keys are needed (not yet for MVP), store them as SecureString parameters.

10. **Document accepted risks** — The following are accepted risks for the prototype phase:
    - Manual secret rotation (no automated rotation)
    - No VPC isolation for Lambda (not needed without PII)
    - No WAF (API Gateway throttling is sufficient for <10 users)
    - No dedicated AWS account per environment (single account with resource-level isolation is fine for prototype)

---

## Summary Matrix

| Environment | Secret Storage | AWS Auth Method | Blast Radius | Key Mitigation |
|-------------|---------------|-----------------|-------------|----------------|
| Local Dev | `~/.aws/credentials` profile | IAM user (scoped to dev) | Dev resources only | MFA, scoped IAM, .gitignore |
| GitHub Actions | GitHub Secrets (role ARN only) | OIDC federation | Deploy scope of role | OIDC conditions, branch protection |
| Cloud Agents | Platform-managed / none | Via GitHub Actions (preferred) | Dev resources only (if any) | No prod credentials, human gate on merge |
| AWS Production | SSM Parameter Store | IAM execution roles | Specific S3/DynamoDB resources | Least-privilege roles, CloudTrail |
