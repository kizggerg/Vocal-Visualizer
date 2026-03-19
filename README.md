# Vocal Visualizer

A tool to help data-driven beginner vocalists track and visualize metrics around their vocal progress. Upload vocal recordings and see visualizations — pitch contours, note accuracy, and more — to measure improvement over time.

## MVP

Upload a vocal recording → analyze pitch → render a pitch contour map (notes on Y-axis, time on X-axis).

See the full product brief in [`docs/product/product-brief.md`](docs/product/product-brief.md).

## Project Status

**Phase:** Project setup — no features implemented yet. The foundational architecture, SDLC process, and security posture are in place.

## Key Constraints

| Constraint | Detail |
|------------|--------|
| Cloud | AWS, serverless-first (Lambda, API Gateway, S3, DynamoDB) |
| Cost | $100/month max in production, ~$0 when idle |
| Platform | Web, responsive + tablet-friendly |
| Scale | <10 users (prototype) |
| CI/CD | GitHub Actions + local script equivalents |

## Repository Structure

```
.claude/
  agents/         # 11 AI agent definitions (product-owner, architect, etc.)
  skills/         # Slash command skills (/new-feature, /sprint-plan, etc.)
.github/
  workflows/      # CI — branch naming validation
docs/
  architecture/   # ADRs, system design, standards, SDLC definition
  design/         # Design system, screens, flows, component specs
  gates/          # SDLC gate artifacts and state tracking
  product/        # Product brief, feature specs, user stories
  qa/             # Test plans, test cases, results
  security/       # Threat models, security requirements
  sprints/        # Sprint plans, status updates
scripts/          # Local automation (branch name validation)
```

## Architecture Decisions

All decisions are governed by foundational principles defined in [`ADR-001`](docs/architecture/decisions/ADR-001-foundational-principles.md). The top priorities:

1. **Simplicity First** — simplest solution that meets requirements wins
2. **Security First** — security is a constraint on every decision
3. **Right Tool for the Job** — mainstream, well-documented, AI-agent friendly
4. **Scale-to-Zero** — near-zero cost when idle, serverless-first
5. **Clean Architecture** — ports-and-adapters, dependencies point inward

Infrastructure constraints are captured in [`ADR-002`](docs/architecture/decisions/ADR-002-infrastructure-constraints.md).

## Development Workflow

This project uses an **agentic SDLC** with 11 specialized AI agents coordinated through [Claude Code](https://claude.ai/code). The full process is defined in [`docs/architecture/sdlc.md`](docs/architecture/sdlc.md).

### SDLC Phases & Human Checkpoints

```
Requirements ──→ [HC-1: Right thing to build?]
     ↓
Design & Architecture ──→ [HC-2: Right technical choices?]
     ↓
Test Planning → Implementation → Review → Validation ──→ [HC-3: Ready to ship?]
     ↓
Documentation → Deploy
```

No phase advances without its review gate being satisfied. Between human checkpoints, agents work autonomously (see [`async-execution-model.md`](docs/architecture/async-execution-model.md)).

### Agents

| Agent | Role |
|-------|------|
| `product-owner` | Requirements, user stories, acceptance criteria |
| `architect` | Architecture, tech selection, ADRs, coding standards |
| `designer` | UI/UX specs, design system, wireframes, accessibility |
| `frontend-engineer` | UI components, pages, state management, client tests |
| `backend-engineer` | APIs, services, database, server logic, server tests |
| `devops-engineer` | CI/CD, infrastructure as code, Docker, monitoring |
| `qa-engineer` | Test plans, test cases, requirement validation |
| `security-engineer` | Threat models, security reviews, vulnerability analysis |
| `code-reviewer` | Code quality, correctness, standards adherence |
| `technical-writer` | Documentation |
| `scrum-master` | Sprint planning, progress tracking, coordination |

### Slash Commands

| Command | Purpose |
|---------|---------|
| `/new-feature [description]` | Full feature lifecycle through all SDLC phases |
| `/sprint-plan [goal]` | Sprint planning and task breakdown |
| `/code-review [target]` | Quality + security + test coverage review |
| `/design-review [feature]` | UX, accessibility, and feasibility review |
| `/security-review [target]` | Threat model + code analysis + dependency scan |
| `/approve-gate [gate] [approve/reject]` | Approve or reject an SDLC checkpoint |

## Getting Started

### Prerequisites

- An AWS account with a named profile configured in `~/.aws/credentials`
- Node.js (version TBD during implementation)

### Local Setup

```bash
git clone https://github.com/kizggerg/Vocal-Visualizer.git
cd Vocal-Visualizer
cp .env.example .env
# Edit .env with your configuration
```

> Implementation is not yet started. Setup steps will be expanded as the project progresses.

## Branching & Contributing

**Convention:** `<type>/<short-description>`

| Prefix | Use |
|--------|-----|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `chore/` | Maintenance tasks |
| `docs/` | Documentation changes |
| `infra/` | Infrastructure changes |
| `test/` | Test additions/changes |
| `spike/` | Exploratory work |

- All merges to `main` use **squash merge** and require **PR approval**
- Branch names are validated by CI ([`branch-naming.yml`](.github/workflows/branch-naming.yml))
- Branches are auto-deleted after merge

See [`docs/architecture/standards/branching.md`](docs/architecture/standards/branching.md) for details.

## Security

- **No long-lived AWS keys** — OIDC federation for CI/CD, IAM execution roles in production
- **Secret scanning** — `gitleaks` pre-commit hook + GitHub secret scanning enabled
- **Agent restrictions** — AI agents have no production credentials
- **Branch protection** — all merges to `main` require PR approval

See [`docs/security/`](docs/security/) for threat models and security requirements.

## Documentation

| Area | Location |
|------|----------|
| Product brief & specs | [`docs/product/`](docs/product/) |
| Architecture & ADRs | [`docs/architecture/`](docs/architecture/) |
| Design system & UX | [`docs/design/`](docs/design/) |
| Security | [`docs/security/`](docs/security/) |
| QA & test plans | [`docs/qa/`](docs/qa/) |
| Sprint tracking | [`docs/sprints/`](docs/sprints/) |

## License

TBD
