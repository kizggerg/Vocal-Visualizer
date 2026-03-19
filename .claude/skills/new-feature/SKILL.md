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

#### Gate 1 Reconciliation

After all reviews complete, run reconciliation before presenting to the human:

1. **Collect** all reviewer outputs
2. **Identify conflicts** between agents (e.g., architect says feasible as-is, security says additional requirements needed)
3. **Cross-pollinate** — share conflicting positions with the relevant agents, ask each to respond to the other's concern
4. **Converge** on a unified recommendation using ADR-001 principles as tiebreaker
5. **Product Owner scope check** — ask the **product-owner** agent to review for scope creep and reject unnecessary additions
6. **Produce a consolidated Gate 1 summary** saved to `docs/gates/sprint-N-gate-1-requirements-consolidated.md`

#### Human Checkpoint 1

**STOP and present to the human:**
- The consolidated summary (one coherent recommendation, not separate reviews)
- Any unresolved agent disagreements with both positions and trade-offs
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

#### Gate 2 Reconciliation

After all reviews complete, run reconciliation:

1. **Collect** all reviewer outputs (architecture, design, threat model, cross-reviews)
2. **Identify conflicts** (e.g., architect recommends client-side only but security requires server-side validation)
3. **Cross-pollinate** — share conflicts between agents, require concrete counter-proposals
4. **Converge** on unified architecture + design + security posture using ADR-001 as tiebreaker
5. **Product Owner scope check** — ask the **product-owner** agent to reject scope creep (premature infrastructure, unnecessary abstractions, tech debt not tied to user stories)
6. **Produce a consolidated Gate 2 summary** saved to `docs/gates/sprint-N-gate-2-architecture-consolidated.md`

#### Human Checkpoint 2

**STOP and present to the human:**
- The consolidated summary (unified recommendation, not separate reviews)
- Any unresolved disagreements with both positions and trade-offs
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

#### Gate 6 Reconciliation

After validation reviews complete, run reconciliation:

1. **Collect** QA results, Product Owner acceptance, Architect NFR assessment
2. **Identify conflicts** (e.g., tests pass but NFR regression flagged)
3. **Converge** on a unified ship/no-ship recommendation
4. **Product Owner scope check** — reject late-stage "while we're at it" additions; follow-up work goes to backlog
5. **Produce a consolidated Gate 6 summary** saved to `docs/gates/sprint-N-gate-6-validation-consolidated.md`

#### Human Checkpoint 3

**STOP and present to the human:**
- The consolidated summary with unified ship/no-ship recommendation
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
