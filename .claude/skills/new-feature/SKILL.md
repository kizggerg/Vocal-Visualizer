---
name: new-feature
description: "End-to-end feature development workflow with review gates and human-in-the-loop checkpoints. Orchestrates all agents through the full SDLC."
user-invocable: true
argument-hint: "[feature description]"
---

## New Feature Workflow

You are orchestrating an end-to-end feature development process for: **$ARGUMENTS**

First, read the governing documents:
- `docs/architecture/decisions/ADR-001-foundational-principles.md`
- `docs/architecture/sdlc.md`

Execute the following phases in order. **Do not skip review gates or human checkpoints.**

---

### Phase 1: Requirements

Use the **product-owner** agent to:
- Write user stories with acceptance criteria (Given/When/Then)
- Define non-functional requirements (performance targets, limitations)
- Prioritize using MoSCoW
- Save artifacts to `docs/product/`

#### Gate 1: Requirements Review

Run these reviews concurrently:
- **architect** agent: Review technical feasibility and NFR completeness
- **qa-engineer** agent: Review testability and acceptance criteria clarity
- **security-engineer** agent: Review for security requirements and data sensitivity

Each reviewer saves feedback. If there are critical issues, cycle back to the product owner to revise.

#### Human Checkpoint 1

**STOP and present to the human:**
- Summary of user stories and acceptance criteria
- NFRs and performance targets
- Any reviewer concerns or open questions
- Ask: "Do you approve these requirements to proceed to design & architecture?"

**Do not proceed until the human approves.**

---

### Phase 2: Design & Architecture (parallel)

Run these concurrently:

**Architecture** — Use the **architect** agent to:
- Evaluate technical approach, select technologies (per foundational principles)
- Design service interfaces upfront (backwards-compatible contracts)
- Define data models and API contracts
- Document all decisions as ADRs
- Save artifacts to `docs/architecture/`

**Design** — Use the **designer** agent to:
- Create UI/UX specs for the feature
- Define component specifications, states, and responsive behavior
- Document accessibility requirements
- Save artifacts to `docs/design/`

**Threat Model** — Use the **security-engineer** agent to:
- Create a STRIDE threat model for the feature
- Define security requirements and controls
- Save artifacts to `docs/security/`

#### Gate 2: Design & Architecture Review

Run these reviews concurrently:
- **designer** reviews architecture for design feasibility
- **architect** reviews design for implementability
- **product-owner** reviews design for user story intent
- **security-engineer** reviews architecture for threat model alignment
- **qa-engineer** reviews all artifacts for testability

Each reviewer saves feedback. Cycle back to resolve critical issues.

#### Human Checkpoint 2

**STOP and present to the human:**
- Technology selections with trade-offs
- Service interface contracts
- Architecture diagrams/decisions
- Design direction and key screens
- Threat model and residual risks
- Ask: "Do you approve these technical choices to proceed to implementation?"

**Do not proceed until the human approves.**

---

### Phase 3: Test Planning

Use the **qa-engineer** agent to:
- Create test plan mapped to acceptance criteria
- Write test cases: happy path, edge cases, error scenarios
- Define NFR benchmarks and performance thresholds
- Save artifacts to `docs/qa/`

#### Gate 3: Test Plan Review

Run these reviews concurrently:
- **product-owner** agent: Verify all acceptance criteria have test cases
- **architect** agent: Verify integration and contract tests cover service boundaries
- **security-engineer** agent: Verify security test cases are included

Cycle back to resolve gaps.

---

### Phase 4: Implementation (parallel)

Run these concurrently as applicable:

**Frontend** — Use the **frontend-engineer** agent to:
- Implement UI components per design specs
- Follow clean architecture (ports-and-adapters)
- Write unit and integration tests per testing pyramid
- Collect NFR benchmarks (bundle size, render performance)

**Backend** — Use the **backend-engineer** agent to:
- Implement APIs and services per architecture contracts
- Follow clean architecture (ports-and-adapters)
- Write unit and integration tests per testing pyramid
- Collect NFR benchmarks (response time, throughput)

**Infrastructure** (if needed) — Use the **devops-engineer** agent to:
- Set up CI/CD pipeline, Docker configs, infrastructure as code
- Ensure scale-to-zero deployment configuration

#### Gate 4: Implementation Self-Check

Each engineer verifies before requesting review:
- [ ] Linter and type checker pass
- [ ] All unit and integration tests pass
- [ ] Clean architecture respected
- [ ] No hardcoded secrets
- [ ] NFR benchmarks meet defined thresholds

---

### Phase 5: Review (parallel)

Run these concurrently:

**Code Review** — Use the **code-reviewer** agent to:
- Review all code changes for correctness, simplicity, clean architecture
- Verify coding standards adherence
- Check test quality and coverage

**Security Review** — Use the **security-engineer** agent to:
- Review code for OWASP Top 10 vulnerabilities
- Verify threat model mitigations are implemented
- Run dependency vulnerability scan

#### Gate 5: Review Resolution

If critical or warning findings exist:
1. Engineers fix the findings
2. Re-run the relevant review
3. Repeat until both reviewers approve

---

### Phase 6: Validation

Use the **qa-engineer** agent to:
- Execute test cases against the implementation
- Validate all acceptance criteria are met
- Run NFR benchmarks and compare to thresholds
- Document results and any defects
- Save results to `docs/qa/results/`

#### Gate 6: Validation Review

- **product-owner** agent: Verify acceptance criteria met, feature behaves as intended
- **architect** agent: Verify NFR benchmarks meet thresholds

#### Human Checkpoint 3

**STOP and present to the human:**
- Feature demo or walkthrough of what was built
- Test results summary (pass/fail)
- NFR benchmark results vs. targets
- Any open defects or known limitations
- Ask: "Do you approve this feature as complete?"

**Do not proceed until the human approves.**

---

### Phase 7: Documentation

Use the **technical-writer** agent to:
- Update README, API docs, and developer guides
- Document any new runbooks or operational procedures
- Update CLAUDE.md if project structure changed significantly

#### Gate 7: Documentation Review

- **architect** agent: Verify technical accuracy
- **product-owner** agent: Verify user-facing docs match feature intent

---

### Summary

Present a final summary:
- What was built (feature overview)
- Key decisions made (link to ADRs)
- Test results
- NFR benchmarks
- Known limitations
- What to deploy (files changed, infrastructure changes)
