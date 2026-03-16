---
name: security-review
description: "Security-focused review including threat modeling, code analysis, and dependency scanning."
user-invocable: true
argument-hint: "[feature, component, or area to review]"
---

## Security Review

Perform a comprehensive security review of: **$ARGUMENTS**

### Step 1: Threat Model
Use the **security-engineer** agent to:
- Create or update the threat model for the target area
- Identify assets, trust boundaries, and data flows
- Enumerate threats using STRIDE methodology
- Assess risk (likelihood x impact)

### Step 2: Code Analysis
Use the **security-engineer** agent to:
- Review code for OWASP Top 10 vulnerabilities
- Check authentication and authorization logic
- Review input validation and output encoding
- Check for hardcoded secrets or sensitive data exposure
- Analyze error handling for information leakage

### Step 3: Dependency Scan
Use the **security-engineer** agent to:
- Run dependency vulnerability scans (`npm audit` or equivalent)
- Check for outdated packages with known CVEs
- Review third-party library usage for security concerns

### Step 4: Recommendations
Compile all findings into a prioritized list of:
- **Critical** — Must fix before release
- **High** — Fix in current sprint
- **Medium** — Fix in next sprint
- **Low** — Track for future improvement

Save the review to `docs/security/reviews/`.
