---
name: code-review
description: "Comprehensive code review covering quality, security, and test coverage."
user-invocable: true
argument-hint: "[file, branch, or description of changes to review]"
---

## Code Review

Perform a comprehensive code review of: **$ARGUMENTS**

### Step 1: Quality Review
Use the **code-reviewer** agent to:
- Review code changes for correctness, readability, and maintainability
- Check adherence to project coding standards
- Identify potential bugs and suggest improvements

### Step 2: Security Review
Use the **security-engineer** agent to:
- Review changes for security vulnerabilities (OWASP Top 10)
- Check for hardcoded secrets, injection risks, auth issues
- Verify secure data handling

### Step 3: Test Coverage Assessment
Use the **qa-engineer** agent to:
- Assess whether changes have adequate test coverage
- Identify untested edge cases or error scenarios
- Suggest additional test cases if needed

Present a consolidated review with findings organized by severity (Critical, Warning, Suggestion).
