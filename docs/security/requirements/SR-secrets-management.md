# Security Requirements: Secrets Management

Source: [TM-001-secrets-management](../threat-models/TM-001-secrets-management.md)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| SR-001 | Repository MUST have `.env` in `.gitignore` before any secrets exist locally | Critical | Open |
| SR-002 | GitHub Actions MUST use OIDC federation for AWS access, not long-lived keys | High | Open |
| SR-003 | CI/CD IAM role MUST be scoped to specific resources and actions, not `*` | High | Open |
| SR-004 | Pre-commit secret scanning MUST be configured (`gitleaks` or `git-secrets`) | High | Open |
| SR-005 | GitHub secret scanning MUST be enabled on the repository | High | Open |
| SR-006 | Claude Cloud Agents MUST NOT have production AWS credentials | High | Open |
| SR-007 | All merges to `main` MUST require human PR approval | High | Open |
| SR-008 | Production Lambda roles MUST follow least-privilege (no `*` resources) | High | Open |
| SR-009 | Third-party API keys MUST be stored in SSM Parameter Store (SecureString), not env vars or code | High | Open |
| SR-010 | `.env.example` MUST be maintained with placeholder values for all required config | Medium | Open |
| SR-011 | CloudTrail MUST be enabled for audit logging of AWS API calls | Medium | Open |
| SR-012 | GitHub fine-grained PATs used by agents MUST have expiration set (max 90 days) | Medium | Open |
| SR-013 | Agent IAM credentials (if used) MUST be scoped to dev resources only with explicit resource ARNs | High | Open |
