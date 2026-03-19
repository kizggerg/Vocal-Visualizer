# Foundation Readiness Assessment

**Reviewer:** Architect
**Date:** 2026-03-19
**Purpose:** Determine whether the development foundations are in place to begin implementation after HC-2 approval.

---

## Current State

The repository is **greenfield with documentation only**. There is no application code, no build tooling, no package.json, no framework scaffolding, and no source directories. The repo contains:

- Governance documents (ADR-001, ADR-002, SDLC, product brief)
- Branching standards and a branch-name validation script
- GitHub Actions workflows (branch naming CI, agent dispatch)
- A `.gitignore` and `.env.example`
- Empty placeholder directories (`docs/architecture/design/`, `docs/architecture/api/`, etc.)

The SDLC current state shows `NOT_STARTED` at Sprint 0.

---

## Assessment

### 1. Project Scaffolding

**Status: NOT READY**

There is no `package.json`, no source directory, no entry point, and no build configuration. This is the most critical prerequisite -- engineers cannot write code without a project skeleton.

**What is needed before implementation:**

- Initialize a `package.json` with project metadata
- Select and configure a frontend framework/bundler (see item 4 below)
- Create the source directory structure following ports-and-adapters conventions
- Configure TypeScript (recommended for type safety and AI-agent friendliness)
- Add an `index.html` entry point

**Estimated effort:** 1-2 hours of scaffolding work. This should be done as part of Phase 2 (Design and Architecture) deliverables, or as the first task in Phase 4 (Implementation) on a `chore/project-scaffolding` branch.

### 2. CI/CD Pipeline

**Status: NOT READY (partial)**

What exists:
- Branch naming validation workflow (`.github/workflows/branch-naming.yml`) -- functional
- Agent dispatch workflow (`.github/workflows/agent-run.yml`) -- functional for agentic runs

What is missing:
- A CI workflow that runs on PRs: lint, type-check, test, build
- Linting configuration (ESLint or Biome)
- Formatter configuration (Prettier or Biome)
- Test runner configuration

**What is needed before implementation:**

- A `.github/workflows/ci.yml` that runs: lint, type-check, test, build (per ADR-002)
- Linter and formatter configuration files
- These depend on the framework/tooling selection (item 4), so that decision comes first

**Note:** A security scan step (dependency audit) can be deferred to the first PR that adds third-party dependencies. It does not need to exist on day one.

### 3. Local Dev Environment

**Status: NOT READY**

There is no way to run the project locally. There is no dev server, no build command, and no `README` section explaining how to start the application.

**What is needed before implementation:**

- `npm run dev` (or equivalent) starts a local dev server with hot reload
- `npm run build` produces a production-ready static bundle
- `npm test` runs the test suite
- README updated with local setup instructions

These all come naturally from the framework scaffolding in item 1.

**What is NOT needed for MVP:**
- Docker or docker-compose. The MVP is a static client-side application. A Node.js dev server is sufficient for local development, and the production build is a set of static files. Docker adds complexity with no value here. If backend services are added later, Docker becomes relevant.
- Local AWS emulation (LocalStack, SAM local). The MVP has no AWS service dependencies at runtime -- it is purely static files served from S3/CloudFront. Local development uses a standard dev server.

### 4. Technology Decisions

**Status: NOT READY (partially decided, not formalized)**

Decisions that **have been made** (in Gate 1 architect review, not yet formalized as ADRs):
- Client-side architecture for MVP (no backend)
- YIN pitch detection via `pitchfinder` library
- Chart.js for visualization
- Web Audio API for audio decoding
- S3 + CloudFront for hosting

Decisions that **have NOT been made:**
- **Frontend framework** -- React, Preact, Vue, Svelte, or vanilla JS/TS with no framework? This is the single most important outstanding decision. It determines the project scaffolding, build tooling, testing approach, and component structure.
- **Build tool** -- Vite, esbuild, webpack, or another bundler? Closely tied to framework choice.
- **Testing framework** -- Vitest, Jest, or another runner? Tied to build tool choice.
- **TypeScript vs. JavaScript** -- Strongly recommend TypeScript for type safety, IDE support, and AI-agent code generation quality.
- **CSS approach** -- Plain CSS, CSS modules, Tailwind, or a component library?

**What is needed before implementation:**

An ADR (ADR-003 or similar) that formalizes the frontend technology stack. My recommendation, consistent with ADR-001 principles:

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Language | TypeScript | Type safety, better AI code generation, mainstream (Principles 3, 4) |
| Framework | React 18+ | Most widely documented, largest ecosystem, best AI-agent support (Principle 4). Alternatives: Preact (smaller but less documented), Vue (viable but smaller AI training corpus), vanilla TS (simpler but requires building component patterns from scratch). |
| Build tool | Vite | Fast, zero-config for React+TS, built-in dev server with HMR, optimized production builds (Principle 1) |
| Test runner | Vitest | Native Vite integration, Jest-compatible API, fast (Principle 1) |
| CSS | CSS Modules or plain CSS | Simplest approach, no additional dependencies. Tailwind is viable but adds a build step and learning curve for AI agents. |
| Charting | Chart.js 4.x | Already decided in Gate 1 review |
| Pitch detection | pitchfinder (YIN) | Already decided in Gate 1 review |

This ADR should be produced during Phase 2 and approved at HC-2.

### 5. Infrastructure as Code

**Status: NOT NEEDED FOR MVP**

The Gate 1 architect review established that the MVP is a static client-side application hosted on S3 + CloudFront. For a prototype with fewer than 10 users:

- S3 bucket and CloudFront distribution can be created manually via the AWS Console or a simple CLI script in under 30 minutes
- The "infrastructure" is two AWS resources with near-zero configuration
- Writing Terraform or CDK for two resources adds more complexity than it saves at this scale

IaC becomes valuable when:
- The infrastructure grows beyond trivial (adding Lambda, API Gateway, DynamoDB)
- Multiple environments are needed (staging, production)
- Infrastructure changes need to be reviewed in PRs

**Recommendation:** Defer IaC to the first sprint that introduces backend services. For MVP, a deployment script (`scripts/deploy.sh`) that runs `aws s3 sync` and optionally creates a CloudFront invalidation is sufficient and aligns with Principle 1 (Simplicity First).

---

## Summary

| Item | Status | Blocking Implementation? |
|------|--------|-------------------------|
| Project scaffolding | NOT READY | Yes |
| CI/CD pipeline | NOT READY | Yes (can run first PR without it, but should exist before merge) |
| Local dev environment | NOT READY | Yes (comes with scaffolding) |
| Technology decisions | NOT READY | Yes (must decide framework before scaffolding) |
| Infrastructure as Code | NOT NEEDED FOR MVP | No |

---

## Recommended Sequence

The following work should be completed as part of Phase 2 (Design and Architecture) deliverables, before HC-2:

1. **ADR-003: Frontend Technology Stack** -- Formalize framework, build tool, test runner, and language decisions. Present options with trade-offs for human approval at HC-2.

2. **ADR-004: Project Structure** -- Define the directory layout, module boundaries, and file naming conventions following ports-and-adapters architecture. This gives engineers a clear map to follow.

After HC-2 approval, the first implementation task (before any feature work) should be:

3. **Project scaffolding** (`chore/project-scaffolding` branch) -- Initialize the project with the approved tech stack. This produces:
   - `package.json` with dependencies and scripts
   - `tsconfig.json`
   - Vite configuration
   - Vitest configuration
   - ESLint/Biome + Prettier configuration
   - Source directory structure with placeholder files
   - CI workflow (`.github/workflows/ci.yml`)
   - Updated README with local setup instructions

4. **Deployment script** (`chore/deploy-script` branch) -- A minimal `scripts/deploy.sh` for S3 deployment. Can run in parallel with feature work.

Items 3 and 4 are small, well-defined tasks that unblock all subsequent feature implementation. They should be the first work items in Sprint 1.

---

## Conclusion

The project is not yet ready for implementation. The foundations are documentation-only, with no code skeleton, build tooling, or formalized technology stack. However, the gap is small and well-understood. Two ADRs (tech stack and project structure) plus one scaffolding task will establish all necessary foundations. These should be the immediate next deliverables in the SDLC pipeline.

The good news: because the MVP is a client-side-only static application, the foundation work is minimal. There is no backend to scaffold, no database to provision, no IaC to write. The entire foundation is a single frontend project with a handful of configuration files.
