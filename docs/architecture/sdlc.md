# SDLC: Phases, Review Gates & Human-in-the-Loop

This document defines the software development lifecycle, the trust-but-verify review gates between phases, and the points where human approval is required.

## Overview

```
  REQUIREMENTS ──▶ GATE 1 ──▶ DESIGN & ARCHITECTURE ──▶ GATE 2 ──▶ TEST PLANNING
       │                              │                                  │
   [HUMAN ✋]                      [HUMAN ✋]                          GATE 3
       │                              │                                  │
       ▼                              ▼                                  ▼
  IMPLEMENTATION ──▶ GATE 4 ──▶ REVIEW ──▶ GATE 5 ──▶ VALIDATION ──▶ GATE 6
                                                                         │
                                                                     [HUMAN ✋]
                                                                         │
                                                                    DOCUMENTATION
                                                                         │
                                                                      DEPLOY
```

---

## Phase 1: Requirements

**Owner:** Product Owner

**Outputs:**
- User stories with acceptance criteria (Given/When/Then)
- Non-functional requirements (performance, scalability, limitations)
- MoSCoW prioritization
- Saved to `docs/product/`

### Gate 1: Requirements Review

| Reviewer | Checks |
|----------|--------|
| Architect | Technical feasibility, service boundary impact, NFR completeness |
| QA Engineer | Stories are testable, acceptance criteria are unambiguous |
| Security Engineer | Security requirements identified, data sensitivity classified |

### Gate 1 Reconciliation

After all reviewers submit their feedback, the **Scrum Master** runs a reconciliation step before presenting to the human:

1. **Collect** all reviewer outputs into a single reconciliation document
2. **Identify conflicts** — e.g., security recommends server-side validation while architect recommends client-only. Flag each conflict explicitly.
3. **Facilitate resolution** — share the conflicting positions with the relevant agents, ask each to respond to the other's concern, and attempt to converge on a unified recommendation. Reference ADR-001 foundational principles to break ties.
4. **Product Owner scope check** — the Product Owner reviews any technical recommendations that would expand scope (new infrastructure, additional stories, tech debt items) and either accepts them as necessary or rejects them as over-engineering. The Product Owner's scope decision is final unless it creates a security vulnerability.
5. **Produce a consolidated Gate 1 summary** that presents one coherent set of recommendations (not N independent reviews) with any unresolved disagreements clearly marked for human decision.
6. Save to `docs/gates/sprint-N-gate-1-requirements-consolidated.md`

### 🖐 Human Checkpoint

**Human reviews and approves:**
- Scope and priority (is this what we should build?)
- NFRs are realistic
- Any scope concerns before design begins
- Any unresolved agent disagreements flagged in the consolidated summary

---

## Phase 2: Design & Architecture (Parallel with Coordination)

**Owners:** Architect, Designer, Security Engineer (concurrent)

**Coordination Protocol:** When Architect and Designer work in parallel:
1. **Architect goes first on component boundaries** — produces a lightweight component architecture (what the major components are, how they communicate) before the Designer starts detailed screen designs
2. **Designer and Security Engineer can start immediately** on user flows, wireframes, and threat modeling respectively — these don't depend on component boundaries
3. **Reconciliation at Gate 2** — if the Architect's component architecture conflicts with the Designer's layout, both present trade-offs and the human resolves at the Gate 2 checkpoint

**Outputs:**
- Architect → ADRs, service interface contracts, data models, tech selections → `docs/architecture/`
- Designer → UI/UX specs, component specs, user flows → `docs/design/`
- Security Engineer → Threat model, security requirements → `docs/security/`

### Gate 2: Design & Architecture Review

| Output | Reviewer | Checks |
|--------|----------|--------|
| Architecture | Designer | Design is feasible within proposed architecture |
| Architecture | Security Engineer | Architecture addresses threat model mitigations |
| Design | Architect | Design is implementable, aligns with component architecture |
| Design | Product Owner | Design meets user story intent |
| Threat Model | Architect | Mitigations are architecturally viable |
| All | QA Engineer | Designs and interfaces are testable |

### Gate 2 Reconciliation

After all reviewers submit their feedback, the **Scrum Master** runs a reconciliation step:

1. **Collect** all reviewer outputs (architecture decisions, design specs, threat model, cross-reviews)
2. **Identify conflicts** — e.g., architect proposes client-side processing but security engineer requires server-side validation; designer proposes a flow that doesn't fit the component architecture. Flag each conflict explicitly.
3. **Facilitate resolution** — share conflicting positions between the relevant agents. Each agent must respond to the other's concern with a concrete proposal (not just "I disagree"). The Scrum Master drives toward a single unified recommendation per conflict. Reference ADR-001 to break ties.
4. **Product Owner scope check** — the Product Owner reviews any technical proposals that would expand scope beyond what the approved requirements call for. Examples of scope creep to reject: unnecessary infrastructure, "nice to have" abstractions, premature scalability work, tech debt stories not tied to a current user story. The Product Owner's scope decision is final unless it creates a security vulnerability.
5. **Produce a consolidated Gate 2 summary** with unified architecture + design + security posture. Unresolved disagreements are clearly marked for human decision with both positions and trade-offs.
6. Save to `docs/gates/sprint-N-gate-2-architecture-consolidated.md`

### 🖐 Human Checkpoint

**Human reviews and approves:**
- Technology selections (are these the right tools?)
- Architecture patterns (right level of complexity?)
- Service interface contracts (these are expensive to change later)
- Design direction (does this feel right?)
- Threat model risk acceptance (acceptable residual risks?)
- Any unresolved agent disagreements flagged in the consolidated summary

---

## Phase 3: Test Planning

**Owner:** QA Engineer

**Outputs:**
- Test plan mapped to acceptance criteria
- Test cases (happy path, edge cases, error scenarios, NFR validation)
- Performance benchmarks and thresholds
- Saved to `docs/qa/`

### Gate 3: Test Plan Review

| Reviewer | Checks |
|----------|--------|
| Product Owner | All acceptance criteria have corresponding test cases |
| Architect | Integration and contract tests cover service boundaries |
| Security Engineer | Security test cases are included |

*No human checkpoint — test plans are low-risk and validated by acceptance criteria coverage.*

---

## Phase 4: Implementation (Parallel)

**Owners:** Frontend Engineer, Backend Engineer, DevOps Engineer (concurrent)

**Outputs:**
- Working code with unit tests passing
- Service interfaces implemented per contracts
- CI/CD pipeline and infrastructure (if applicable)
- NFR benchmarks collected

### Gate 4: Implementation Self-Check

Before requesting review, each engineer verifies:
- [ ] Linter passes
- [ ] Type checker passes
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Code follows clean code / clean architecture principles
- [ ] No hardcoded secrets
- [ ] NFR benchmarks meet defined thresholds
- [ ] Proof of passing tests and pipeline results attached to the PR description (see PR Evidence Requirements)

---

## Phase 5: Review (Parallel)

**Owners:** Code Reviewer, Security Engineer (concurrent)

### Gate 5a: Code Review

| Reviewer | Checks |
|----------|--------|
| Code Reviewer | Correctness, readability, maintainability, standards adherence, test quality |
| Code Reviewer | Clean architecture — dependencies point inward, no infrastructure in domain logic |
| Code Reviewer | Simplicity — no over-engineering, no unnecessary abstractions |
| Code Reviewer | PR includes evidence of working functionality (test results, pipeline logs, screenshots, benchmark results as applicable) — request changes if missing |

### Gate 5b: Security Review

| Reviewer | Checks |
|----------|--------|
| Security Engineer | OWASP Top 10 vulnerabilities |
| Security Engineer | Threat model mitigations are implemented |
| Security Engineer | Dependency vulnerability scan |
| Security Engineer | Auth/authz correctness |

**Resolution:** Engineers fix findings and re-submit. Critical findings block progression. The review cycle repeats until both reviewers approve.

---

## Phase 6: Validation

**Owner:** QA Engineer

**Outputs:**
- Test execution results (pass/fail with evidence)
- NFR benchmark results vs. defined thresholds
- Defect reports for failures
- Acceptance criteria sign-off
- Validation evidence attached to the PR (see PR Evidence Requirements below)
- Saved to `docs/qa/results/`

The QA engineer attaches validation evidence directly to the PR as comments or in the PR description, so that reviewers and the human checkpoint have proof of working functionality without leaving the PR.

### Gate 6: Validation Review

| Reviewer | Checks |
|----------|--------|
| Product Owner | Acceptance criteria met, feature behaves as intended |
| Architect | NFR benchmarks meet thresholds, no architectural regressions |

### Gate 6 Reconciliation

After all validation reviews are complete, the **Scrum Master** runs a reconciliation step:

1. **Collect** QA results, Product Owner acceptance verdict, and Architect NFR assessment
2. **Identify conflicts** — e.g., QA passes all tests but Architect flags an NFR regression; Product Owner accepts behavior but QA found edge-case defects
3. **Facilitate resolution** — drive toward a unified ship/no-ship recommendation with clear rationale
4. **Product Owner scope check** — reject any late-stage "while we're at it" additions. The feature ships what was scoped, period. Follow-up work goes to the backlog.
5. **Produce a consolidated Gate 6 summary** with unified recommendation
6. Save to `docs/gates/sprint-N-gate-6-validation-consolidated.md`

### 🖐 Human Checkpoint

**Human reviews and approves:**
- Feature is working as expected (demo or walkthrough)
- Test results and any open defects
- NFR benchmark results
- Consolidated recommendation from all agents
- Ready for documentation and deploy?

---

## Phase 7: Documentation

**Owner:** Technical Writer

**Outputs:**
- Updated README, API docs, developer guides
- Runbooks for operational tasks (if applicable)

### Gate 7: Documentation Review

| Reviewer | Checks |
|----------|--------|
| Architect | Technical accuracy |
| Product Owner | User-facing docs match feature intent |

*No human checkpoint — documentation is low-risk and verified by other agents.*

---

## Phase 8: Deploy

**Owner:** DevOps Engineer

**Outputs:**
- Deployed to target environment
- Post-deployment health checks pass
- Monitoring and alerting confirmed

*Human is notified of deployment. Rollback plan is documented.*

---

## Review Assignment Summary

| Agent | Reviews Output From | Additional Roles |
|-------|-------------------|-----------------|
| Scrum Master | All gate outputs | **Gate Coordinator** — runs reconciliation before every human checkpoint |
| Product Owner | Designer (intent), QA Engineer (AC coverage), QA results (acceptance) | **Scope Guard** — rejects scope creep at every gate |
| Architect | Product Owner (feasibility), Designer (implementability), Security (viability), QA (NFRs), Technical Writer (accuracy) | |
| Designer | Architect (design feasibility) | |
| Security Engineer | Product Owner (security reqs), Architect (security posture), Engineers (vulnerabilities) | |
| QA Engineer | Product Owner (testability), Architect (testability), Designer (testability) | |
| Code Reviewer | Frontend Engineer, Backend Engineer, DevOps Engineer (code quality) | |

## Human-in-the-Loop Summary

| Checkpoint | When | What You Decide |
|------------|------|-----------------|
| After Requirements | Gate 1 | Is this the right thing to build? |
| After Design & Architecture | Gate 2 | Are these the right technical choices? |
| After Validation | Gate 6 | Does this work? Ready to ship? |
| Anytime | Any phase | Override any agent decision |

## Definition of Done

A story is **done** when ALL of the following are true:

- [ ] Code is written and follows clean architecture principles
- [ ] All tests pass (unit, integration, e2e as applicable per testing pyramid)
- [ ] Code review verdict: **APPROVED** (Gate 5a)
- [ ] Security review verdict: **APPROVED** (Gate 5b)
- [ ] QA validation: All acceptance criteria verified (Gate 6)
- [ ] Human has approved the feature (Human Checkpoint 3)
- [ ] Documentation is updated (Gate 7)
- [ ] Code is merged to main
- [ ] Feature is deployed and verified (Phase 8)

A feature is not done until it is deployed and validated in production.

## PR Evidence Requirements

Every PR must include proof that the changes work. Evidence is a collaborative effort: the implementing engineer provides initial proof at Gate 4, and the QA engineer adds validation evidence during Phase 6.

**Required evidence (as applicable):**

| Evidence Type | When Required | Provided By |
|---------------|---------------|-------------|
| Test results (unit, integration, e2e) | Always — include pass/fail summary | Engineer (Gate 4), QA Engineer (Phase 6) |
| CI pipeline passing (lint, type-check, build) | Always — include pipeline logs or status | Engineer (Gate 4) |
| Screenshots or screen recordings | UI changes — before/after or key states | Engineer (Gate 4), QA Engineer (Phase 6) |
| NFR benchmark results vs. thresholds | When NFR thresholds are defined | Engineer (Gate 4), QA Engineer (Phase 6) |
| Security scan results | When security-relevant changes are made | Security Engineer (Gate 5b) |
| QA validation summary | Always — after Phase 6 validation | QA Engineer (Phase 6) |

**Where to attach:** Evidence should be included in the PR description or as PR comments. Use collapsible sections (`<details>`) for verbose output like logs.

**Missing evidence blocks merge:** Code Reviewer must request changes if the PR lacks required evidence.

## Reconciliation Protocol

Cross-agent coordination happens at every gate with a human checkpoint. The Scrum Master is responsible for driving reconciliation.

### How Reconciliation Works

1. **Collect** — Gather all agent outputs for the gate into one view
2. **Detect conflicts** — Identify where agents contradict each other (e.g., architecture says "client-only" but security says "server-side validation required")
3. **Cross-pollinate** — Share each agent's position with the conflicting agent. Each must respond to the other's concern with a concrete counter-proposal or accommodation, not just restate their position.
4. **Converge** — The Scrum Master synthesizes responses into a unified recommendation. Use ADR-001 foundational principles as the tiebreaker (Simplicity First > Security First > Right Tool > Scale-to-Zero > ...).
5. **Scope-check** — The Product Owner reviews the unified recommendation and rejects anything that expands scope beyond what is necessary to deliver the approved requirements. Technical agents may not introduce new stories, infrastructure, or abstractions without Product Owner approval.
6. **Document** — Produce a single consolidated summary for the human. Unresolved conflicts (rare — most should resolve in step 3-4) are presented with both positions and a recommended resolution.

### Product Owner as Scope Guard

The Product Owner has **veto power over scope expansion** at every gate. Specifically:

- **Reject** tech debt stories not tied to a current user story
- **Reject** premature infrastructure (build it when you need it, not before)
- **Reject** "nice to have" abstractions, extra configurability, or defensive architecture for hypothetical future requirements
- **Accept** scope additions only when they are necessary to meet an approved requirement or close a security vulnerability
- The Product Owner's scope decision is **final** unless it would create a security vulnerability (Security Engineer can override on security grounds only)

### Escalation (Last Resort)

If reconciliation fails to resolve a conflict:
1. The Scrum Master documents both positions with trade-offs in the consolidated gate summary
2. The Scrum Master adds a clear recommendation based on ADR-001 principles
3. The conflict is escalated to the human at the checkpoint, who decides
4. The human's decision is recorded as an ADR
