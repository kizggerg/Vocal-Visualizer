# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vocal Visualizer — a tool to help data-driven beginner vocalists track and visualize metrics around their vocal progress. Users upload vocal recordings and see visualizations (pitch contours, etc.) to measure improvement over time.

**MVP:** Upload a vocal recording → analyze pitch → render a pitch contour map (notes on Y-axis, time on X-axis).

Full product brief: `docs/product/product-brief.md`

## Key Constraints

- **Cloud:** AWS, serverless-first
- **Cost:** $100/month max in production, ~$0 when idle
- **Platform:** Web, responsive + tablet-friendly (mobile out of scope, but don't preclude it)
- **Scale:** <10 users for prototype
- **CI/CD:** GitHub Actions + local pipeline equivalents

Full infrastructure decisions: `docs/architecture/decisions/ADR-002-infrastructure-constraints.md`

## Repository

- Remote: https://github.com/kizggerg/Vocal-Visualizer.git
- Branch: main

## Foundational Principles

All agents and decisions are governed by `docs/architecture/decisions/ADR-001-foundational-principles.md`. Key principles in priority order:

1. **Simplicity First** — Simplest solution that meets requirements wins
2. **Security First** — Security is a constraint on every decision
3. **Right Tool for the Job** — Mainstream, well-documented, AI-agent friendly
4. **Scale-to-Zero** — Near-zero cost when idle, serverless-first
5. **Service-Oriented** — Interfaces designed upfront, backwards-compatible
6. **Clean Code / Clean Architecture** — Ports-and-adapters, dependencies point inward
7. **Testing Pyramid** — Many unit, some integration, few E2E
8. **NFRs Upfront** — Performance and limitations validated early
9. **Trust-But-Verify** — Every agent output reviewed by another agent before advancing
10. **Human-in-the-Loop** — Human approves requirements, architecture, and final validation

## SDLC & Review Gates

The full SDLC is defined in `docs/architecture/sdlc.md`. Three mandatory human checkpoints:
- **After Requirements** — Is this the right thing to build?
- **After Design & Architecture** — Are these the right technical choices?
- **After Validation** — Does this work? Ready to ship?

No phase advances without its review gate being satisfied.

## Agentic Development Team

This repo is configured with agents and skills that simulate a small software development team. Use the appropriate agent or skill depending on the task.

### Agents (`.claude/agents/`)

| Agent | Role | Model | When to Use |
|-------|------|-------|-------------|
| `product-owner` | Requirements, user stories, acceptance criteria, backlog | opus | Defining features, writing requirements |
| `architect` | Architecture, tech selection, ADRs, coding standards | opus | Technology decisions, system design, establishing patterns |
| `designer` | UI/UX specs, design system, wireframes, accessibility | opus | Designing interfaces, component specs, user flows |
| `frontend-engineer` | UI components, pages, state management, client-side tests | opus | Implementing frontend features |
| `backend-engineer` | APIs, services, database, server logic, server tests | opus | Implementing backend features |
| `devops-engineer` | CI/CD, infrastructure as code, Docker, monitoring | opus | Pipelines, deployments, infrastructure |
| `qa-engineer` | Test plans, test cases, requirement validation | opus | Testing strategy, validating implementations |
| `security-engineer` | Threat models, security reviews, vulnerability analysis | opus | Security assessments, code security review |
| `code-reviewer` | Code quality, correctness, standards adherence | sonnet | Reviewing code changes (use proactively after writing code) |
| `technical-writer` | README, API docs, developer guides, runbooks | sonnet | Creating or updating documentation |
| `scrum-master` | Sprint planning, progress tracking, coordination | opus | Planning sprints, coordinating work across agents |

### Skills (slash commands)

| Command | Purpose |
|---------|---------|
| `/new-feature [description]` | Full feature lifecycle: requirements → design → architecture → implementation → review → validation |
| `/sprint-plan [goal]` | Sprint planning: backlog review → prioritization → task breakdown → sprint plan |
| `/code-review [target]` | Quality + security + test coverage review of code changes |
| `/design-review [feature]` | UX, accessibility, consistency, and feasibility review |
| `/security-review [target]` | Threat model + code analysis + dependency scan |

### Documentation Conventions

Agents save their artifacts to these directories:
- `docs/product/` — Feature specs, user stories, backlog
- `docs/architecture/` — ADRs, system design, standards, API contracts
- `docs/design/` — Design system, screens, flows, component specs
- `docs/security/` — Threat models, security reviews, requirements
- `docs/qa/` — Test plans, test cases, results, defect reports
- `docs/sprints/` — Sprint plans, retrospectives, status updates
