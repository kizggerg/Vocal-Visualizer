# ADR-001: Foundational Principles

## Status: Accepted

## Context

This project is developed by a team of AI agents with human oversight. We need a set of guiding principles that inform every technology choice, architectural decision, and process decision. These principles resolve conflicts when trade-offs arise — agents should reference them when making decisions.

## Decision

All agents and decisions in this project are governed by the following principles, listed in priority order for conflict resolution.

---

### 1. Simplicity First

> The simplest solution that meets the requirements wins.

- Minimize the complexity of written code and architectural decisions
- Don't add abstractions until you need them (Rule of Three)
- Prefer boring, proven technology over novel approaches
- If two solutions are equivalent, pick the one with fewer moving parts
- Every layer, service, or abstraction must justify its existence

### 2. Security First

> Security is not a phase — it is a constraint on every decision.

- Validate all input at system boundaries
- Principle of least privilege for all access
- Secrets never in code, always in environment or secrets manager
- Dependencies are a liability — minimize and audit them
- Threat model before building, not after
- Encrypt in transit and at rest by default

### 3. Right Tool for the Job

> Choose technologies based on fit, not familiarity or hype.

- Evaluate against the actual problem, not hypothetical future problems
- Prefer mainstream, well-documented technologies that AI agents can reliably generate
- Avoid niche frameworks, obscure libraries, or anything with sparse documentation
- The "right tool" must also be the "simple tool" — don't pick a powerful tool when a simple one suffices

### 4. AI-Agent Friendly

> Code and architecture should be easy for AI agents to read, write, and reason about.

- Use widely-adopted languages, frameworks, and patterns
- Prefer explicit over implicit (no magic, no convention-over-configuration that requires tribal knowledge)
- Clear file organization with predictable naming
- Well-defined interfaces between modules
- Small, focused files over large monolithic ones

### 5. Scale-to-Zero Economics

> The application should cost near-zero when idle.

- Serverless-first: prefer managed services that scale to zero (Lambda, Cloud Run, Serverless Containers)
- If containers are needed, use scale-to-zero container platforms (Cloud Run, Azure Container Apps, Fargate with scaling to 0)
- No always-on infrastructure unless absolutely required
- Database choices should support serverless or usage-based pricing
- Monitor and optimize cost as a first-class metric

### 6. Service-Oriented Design

> Modules communicate through well-defined, versioned service interfaces.

- Design service interfaces upfront before implementation
- All interfaces must be backwards compatible — additive changes only
- Services are loosely coupled: each owns its data and logic
- Communication through contracts (API specs, event schemas), not shared internals
- Changes to interfaces require an ADR documenting the rationale

### 7. Clean Code, Clean Architecture

> Code should be easy to read and easy to change.

- Follow ports-and-adapters (hexagonal) architecture: business logic has no infrastructure dependencies
- Dependencies point inward — domain logic never imports from infrastructure
- Name things for what they do, not how they do it
- Functions do one thing. Files have one reason to change
- Prefer composition over inheritance
- No dead code, no commented-out code, no TODOs without tracking

### 8. Testing Pyramid

> Test at the right level — most tests are fast and focused, few are slow and broad.

```
        ╱╲
       ╱ E2E ╲        Few: Critical user journeys only
      ╱────────╲
     ╱Integration╲    Some: Service boundaries, API contracts
    ╱──────────────╲
   ╱   Unit Tests   ╲  Many: Business logic, pure functions
  ╱──────────────────╲
```

- Unit tests cover business logic and pure functions (fast, no I/O)
- Integration tests cover service boundaries and API contracts
- E2E tests cover critical user journeys only (expensive, run less often)
- Test behavior, not implementation
- Every bug fix includes a regression test

### 9. Non-Functional Requirements Upfront

> Performance, scalability, and limitations are validated early, not discovered late.

- Define NFRs (response time, throughput, bundle size, etc.) during requirements
- Benchmark and validate NFRs during implementation, not after
- Document known limitations explicitly
- Load test critical paths before declaring a feature complete
- Performance budgets are requirements, not aspirations

### 10. Well-Architected (Simplicity-Weighted)

> Apply well-architected principles, but never at the cost of unnecessary complexity.

In priority order:
1. **Security** — Non-negotiable baseline
2. **Cost Optimization** — Scale-to-zero, pay-per-use
3. **Reliability** — Graceful degradation, retries, idempotency
4. **Operational Excellence** — Observable, debuggable, deployable
5. **Performance** — Meet defined NFRs
6. **Sustainability** — Efficient resource usage

Each pillar is subject to the Simplicity First principle — don't add reliability patterns you don't need yet.

### 11. Local and Cloud Parity

> Everything must work locally and in the cloud with minimal friction.

- Local dev environment mirrors cloud as closely as possible
- Use Docker/docker-compose for local services
- Environment-specific config via environment variables only
- No cloud-only development workflows — every feature is testable locally
- Document local setup in the README

### 12. Git Best Practices & Multi-Agent Branching

> Branching and CI/CD are designed for parallel agent development.

- **Trunk-based development** with short-lived feature branches
- Branch naming: `<type>/<short-description>` (e.g., `feat/user-auth`, `fix/api-validation`)
- All branches require CI to pass before merge
- Squash merge to main for clean history
- Conventional Commits format: `type(scope): description`
- CI pipeline: lint → type-check → test → security scan → build
- Agents work on separate branches to avoid conflicts
- No long-lived branches — merge within one sprint

### 13. Trust-But-Verify

> Every agent's output is reviewed by at least one other agent before advancing.

- No phase of the SDLC advances without cross-agent review
- See the SDLC gates document (`docs/architecture/sdlc.md`) for specific review assignments
- Reviews check for adherence to these foundational principles
- Disagreements between agents are escalated to the human for resolution

### 14. Human-in-the-Loop

> The human approves key decisions and transition points.

- Human approval is required at defined SDLC gates (see `docs/architecture/sdlc.md`)
- Agents must present options with trade-offs, not just conclusions
- Any decision that is expensive to reverse requires human approval
- The human can override any agent decision at any time

## Consequences

- Agents have clear guidance for resolving trade-offs
- Technology choices are constrained to mainstream, serverless-friendly options
- Architecture will be simple but well-structured from day one
- The review overhead is higher but catches issues earlier
- The human remains in control of irreversible decisions
