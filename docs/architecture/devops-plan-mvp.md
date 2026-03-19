# DevOps Plan: MVP Static Site

**Author:** DevOps Engineer
**Date:** 2026-03-19
**Status:** Proposed (pending HC-2 approval)
**Scope:** CI pipeline, deployment, project scaffolding spec, security in CI

---

## Context

The MVP is a fully client-side React + TypeScript application with no backend. It is hosted as static files on S3 + CloudFront. The infrastructure is two AWS resources serving fewer than 10 users. This plan follows ADR-001 (Simplicity First), ADR-002 (infrastructure constraints), ADR-003 (frontend tech stack), and ADR-004 (project structure).

What this plan deliberately excludes (and why):

- **No Docker.** The app is a static site. A Node.js dev server (`npm run dev`) is sufficient locally, and production is static files on S3. Docker adds complexity with zero value here.
- **No multi-environment (staging/prod).** Fewer than 10 prototype users do not justify environment management overhead. A single S3 + CloudFront deployment is sufficient. Environments can be added when the user base or backend complexity justifies them.
- **No Infrastructure as Code (Terraform/CDK).** The infrastructure is two AWS resources (one S3 bucket, one CloudFront distribution). Writing IaC for this is more complex than the infrastructure itself. A manual setup guide and a deploy script are simpler and sufficient. IaC becomes valuable when backend services are added.
- **No `act` for local GitHub Actions emulation.** The CI pipeline stages (lint, type-check, test, build, audit) all run as standard npm scripts. Engineers run them locally via `npm run lint`, `npm test`, `npm run build`, etc. Wrapping these in a GitHub Actions emulator adds friction without value. A Makefile target (`make ci`) provides the same sequential execution locally.

---

## 1. CI Pipeline Design

### Workflow: `.github/workflows/ci.yml`

**Triggers:** Pull requests to `main` (opened, synchronize, reopened).

**Runner:** `ubuntu-latest`

**Node version:** 20 LTS (via `actions/setup-node@v4` with `node-version: 20` and `cache: 'npm'`).

### Pipeline Stages (sequential within a single job)

```
npm ci --> lint --> type-check --> test --> build --> bundle-size-check --> npm audit
```

Each stage is a named step within a single GitHub Actions job. A single job is simpler than a multi-job matrix and sufficient for a project of this size (the entire pipeline should complete in under 2 minutes).

| Step | Command | Fails Build On | Rationale |
|------|---------|----------------|-----------|
| Install | `npm ci` | Any install failure | Deterministic installs from lockfile (SR-204) |
| Lint | `npx biome check src/ tests/` | Any lint or format error | Code quality gate |
| Type-check | `npx tsc --noEmit` | Any type error | Type safety gate (ADR-003: strict mode) |
| Test | `npx vitest run` | Any test failure | Correctness gate |
| Build | `npx vite build` | Build failure | Ensures production build works |
| Bundle size | `scripts/check-bundle-size.sh` | Gzipped output > 500 KB | NFR budget (ADR-003: ~145 KB estimated, 500 KB max) |
| Security audit | `npm audit --omit=dev --audit-level=high` | Critical or High vulnerabilities | SR-202 |

### Linter: Biome

Biome is recommended over ESLint + Prettier for the following reasons:

- **Single tool** replaces both ESLint and Prettier (linting + formatting in one binary). Fewer dependencies, fewer config files, simpler CI step. (Principle 1)
- **Zero-config defaults** are strict and sensible for TypeScript + React. No plugin installation, no `.eslintrc` inheritance chains.
- **Fast.** Written in Rust, runs in milliseconds. Not a meaningful differentiator at this project size, but it means zero wait in CI.
- **Well-supported by AI agents.** Biome's rule set is a strict subset of ESLint's most common rules. AI agents generate Biome-compatible code because they already generate ESLint-compatible code.

If the team prefers ESLint + Prettier (more established, larger ecosystem), that is also acceptable. The CI step changes from `npx biome check` to `npx eslint . && npx prettier --check .`. The trade-off is two tools and two config files instead of one.

### Bundle Size Check: `scripts/check-bundle-size.sh`

A simple shell script that:

1. Finds the built output in `dist/assets/`.
2. Calculates the total gzipped size of all `.js` and `.css` files.
3. Compares against the 500 KB threshold.
4. Exits non-zero if the threshold is exceeded.

```bash
#!/usr/bin/env bash
set -euo pipefail

MAX_SIZE_KB=500
DIST_DIR="dist/assets"

if [ ! -d "$DIST_DIR" ]; then
  echo "ERROR: $DIST_DIR not found. Run 'vite build' first."
  exit 1
fi

# Calculate total gzipped size of JS and CSS assets
TOTAL_BYTES=0
for file in "$DIST_DIR"/*.js "$DIST_DIR"/*.css; do
  [ -f "$file" ] || continue
  GZIP_SIZE=$(gzip -c "$file" | wc -c)
  TOTAL_BYTES=$((TOTAL_BYTES + GZIP_SIZE))
done

TOTAL_KB=$((TOTAL_BYTES / 1024))
echo "Bundle size (gzipped): ${TOTAL_KB} KB / ${MAX_SIZE_KB} KB"

if [ "$TOTAL_KB" -gt "$MAX_SIZE_KB" ]; then
  echo "FAIL: Bundle size exceeds ${MAX_SIZE_KB} KB limit."
  exit 1
fi

echo "PASS: Bundle size is within budget."
```

### Local CI Equivalent

Engineers run the same pipeline locally without GitHub Actions:

```bash
# Run all CI steps sequentially (same order as GitHub Actions)
make ci
```

The `Makefile` target:

```makefile
.PHONY: ci lint typecheck test build bundle-check audit

ci: lint typecheck test build bundle-check audit

lint:
	npx biome check src/ tests/

typecheck:
	npx tsc --noEmit

test:
	npx vitest run

build:
	npx vite build

bundle-check:
	./scripts/check-bundle-size.sh

audit:
	npm audit --omit=dev --audit-level=high
```

Individual steps can also be run standalone: `make lint`, `make test`, etc. The `package.json` scripts section mirrors these for engineers who prefer `npm run`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "biome check src/ tests/",
    "lint:fix": "biome check --write src/ tests/",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

---

## 2. Deployment Plan

### Architecture

```
Developer laptop                    AWS
  |                                  |
  |  npm run build                   |
  |  --> dist/ (static files)        |
  |                                  |
  |  scripts/deploy.sh               |
  |  --> aws s3 sync dist/ s3://     |------> S3 Bucket (private)
  |  --> CloudFront invalidation     |------> CloudFront Distribution
  |                                  |           |
  |                                  |           v
  |                                  |        End Users (HTTPS)
```

### S3 + CloudFront Setup (Manual, One-Time)

This is a one-time manual setup, documented here as a runbook. It takes approximately 30 minutes.

**S3 Bucket:**

1. Create bucket (e.g., `vocal-visualizer-prod`).
2. Enable all four Block Public Access settings (SR-201).
3. Enable default encryption (AES-256 / SSE-S3).
4. No static website hosting enabled (CloudFront serves directly via OAC).

**CloudFront Distribution:**

1. Origin: S3 bucket via Origin Access Control (OAC) -- not the legacy OAI (SR-201).
2. Viewer protocol policy: **Redirect HTTP to HTTPS** (SR-200).
3. Default root object: `index.html`.
4. Custom error responses: 403 and 404 return `/index.html` with status 200 (for client-side routing if added later).
5. Price class: `PriceClass_100` (US, Canada, Europe) to minimize cost.
6. Response headers policy (see Section 4 below for details).

**Cost estimate (idle):** $0.00/month. CloudFront and S3 are pay-per-request. With zero traffic, cost is zero. With <10 users, cost is under $1/month.

### Deploy Script: `scripts/deploy.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configuration -- override via environment variables
S3_BUCKET="${VOCAL_VISUALIZER_S3_BUCKET:?Set VOCAL_VISUALIZER_S3_BUCKET}"
CF_DISTRIBUTION_ID="${VOCAL_VISUALIZER_CF_DISTRIBUTION_ID:?Set VOCAL_VISUALIZER_CF_DISTRIBUTION_ID}"
DIST_DIR="dist"

# Verify dist/ exists
if [ ! -d "$DIST_DIR" ]; then
  echo "ERROR: $DIST_DIR not found. Run 'npm run build' first."
  exit 1
fi

echo "Deploying to s3://${S3_BUCKET}..."

# Sync static assets with cache headers
# HTML files: no-cache (always revalidate)
aws s3 sync "$DIST_DIR" "s3://${S3_BUCKET}" \
  --delete \
  --exclude "*.html" \
  --cache-control "public, max-age=31536000, immutable"

# HTML files get no-cache so users always get the latest version
aws s3 sync "$DIST_DIR" "s3://${S3_BUCKET}" \
  --exclude "*" \
  --include "*.html" \
  --cache-control "no-cache, no-store, must-revalidate"

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "${CF_DISTRIBUTION_ID}" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text

echo "Deploy complete."
```

Key behaviors:

- **Cache strategy:** Vite produces hashed filenames for JS/CSS assets (e.g., `index-a1b2c3d4.js`), so they can be cached forever (`immutable`). HTML files are never cached so users always get the latest asset references.
- **`--delete` flag:** Removes old files from S3 that no longer exist in the build output. Prevents stale asset accumulation.
- **CloudFront invalidation:** Clears the CDN cache so users get the new version immediately. Invalidation of `/*` is a single invalidation path (free for the first 1,000/month).
- **No secrets in the script.** AWS credentials come from the caller's environment (e.g., `~/.aws/credentials`, `AWS_PROFILE`, or CI environment variables). The S3 bucket name and CloudFront distribution ID are passed as environment variables, not hardcoded.

### Deployment Process

For the MVP, deployment is manual and intentional:

1. Ensure `main` branch is clean and CI passes.
2. `npm run build` to produce `dist/`.
3. `./scripts/deploy.sh` to push to S3 and invalidate CloudFront.

Automated deployment (CI/CD push-to-main triggers deploy) can be added later. For <10 users, a manual deploy is simpler, safer, and provides a human checkpoint before changes go live.

---

## 3. Project Scaffolding Spec

The `chore/project-scaffolding` task must produce the following files. This is the exact checklist for the engineer implementing the scaffolding branch.

### Files to Create

| File | Purpose | Source/Notes |
|------|---------|-------------|
| `package.json` | Project metadata, dependencies, npm scripts | See scripts list in Section 1 |
| `package-lock.json` | Lockfile for deterministic installs (SR-204) | Generated by `npm install` |
| `tsconfig.json` | TypeScript config, `strict: true` (ADR-003) | Target: `ES2020`, JSX: `react-jsx`, module: `ESNext` |
| `tsconfig.node.json` | TypeScript config for Vite config file | Separate config for Node.js context |
| `vite.config.ts` | Vite build configuration | Minimal: React plugin, build target |
| `vitest.config.ts` | Vitest test runner config | Or vitest block in `vite.config.ts`. Environment: `jsdom` or `happy-dom` |
| `biome.json` | Biome linter/formatter config | Recommended rules for TypeScript + React. If ESLint chosen instead: `.eslintrc.cjs` + `.prettierrc` |
| `index.html` | Vite entry HTML | Standard Vite React template. Root div + script tag to `src/main.tsx` |
| `Makefile` | Local CI pipeline (`make ci`) | Targets from Section 1 |
| `src/main.tsx` | Application entry point | Renders `<App />` into root div |
| `src/vite-env.d.ts` | Vite type declarations | `/// <reference types="vite/client" />` |
| `src/domain/types.ts` | Core domain types (placeholder) | Empty or minimal placeholder with a comment |
| `src/domain/ports.ts` | Port interfaces (placeholder) | Empty or minimal placeholder with a comment |
| `src/domain/pitch-utils.ts` | Pure functions (placeholder) | Empty or minimal placeholder |
| `src/adapters/` | Adapter directory (empty or `.gitkeep`) | Per ADR-004 |
| `src/components/App.tsx` | Root component (minimal) | "Hello World" or minimal rendering to prove build works |
| `src/components/App.module.css` | Root component styles (minimal) | Basic styles to prove CSS Modules work |
| `tests/domain/pitch-utils.test.ts` | Placeholder test for pitch-utils | A single passing test to prove Vitest works |
| `scripts/check-bundle-size.sh` | Bundle size check script | From Section 1. Must be executable (`chmod +x`). |
| `scripts/deploy.sh` | Deployment script | From Section 2. Must be executable. Can be deferred to a `chore/deploy-script` branch if preferred. |
| `.github/workflows/ci.yml` | CI pipeline workflow | From Section 1 |
| `README.md` | Updated with local setup instructions | Prerequisites, install, dev server, test, build, deploy |

### Files That Already Exist (do not overwrite)

| File | Notes |
|------|-------|
| `.gitignore` | Already exists. May need additions for `dist/`, `node_modules/`, `coverage/` -- verify and extend if necessary. |
| `.github/workflows/branch-naming.yml` | Already exists. Do not modify. |
| `.github/workflows/agent-run.yml` | Already exists. Do not modify. |
| `.env.example` | Already exists. May need additions for `VOCAL_VISUALIZER_S3_BUCKET` and `VOCAL_VISUALIZER_CF_DISTRIBUTION_ID`. |
| `scripts/validate-branch-name.sh` | Already exists. Do not modify. |

### Dependencies

**Production dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | `^18.3.0` | UI framework (ADR-003) |
| `react-dom` | `^18.3.0` | React DOM renderer |

Chart.js, react-chartjs-2, and pitchfinder are feature dependencies. They are NOT part of scaffolding. They are added when the features that use them are implemented.

**Development dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | `^5.5.0` | TypeScript compiler (ADR-003) |
| `vite` | `^6.0.0` | Build tool (ADR-003) |
| `@vitejs/plugin-react` | `^4.3.0` | Vite React plugin |
| `vitest` | `^3.0.0` | Test runner (ADR-003) |
| `jsdom` | `^25.0.0` | DOM environment for tests |
| `@biomejs/biome` | `^1.9.0` | Linter and formatter |
| `@types/react` | `^18.3.0` | React type definitions |
| `@types/react-dom` | `^18.3.0` | React DOM type definitions |
| `@testing-library/react` | `^16.0.0` | React component testing utilities |
| `@testing-library/jest-dom` | `^6.5.0` | Custom DOM matchers for tests |

Version numbers are approximate minimums. Use the latest stable versions at the time of scaffolding.

### Acceptance Criteria for Scaffolding

The scaffolding PR is complete when:

1. `npm ci` installs without errors.
2. `npm run dev` starts a local dev server showing the placeholder App component.
3. `npm run lint` passes with zero errors.
4. `npx tsc --noEmit` passes with zero type errors.
5. `npm test` runs the placeholder test and passes.
6. `npm run build` produces a `dist/` directory with `index.html` and hashed assets.
7. `make ci` runs all pipeline stages sequentially and passes.
8. The GitHub Actions CI workflow passes on the scaffolding PR.
9. `dist/` is in `.gitignore`.
10. No source maps in production build output (SR-205).

---

## 4. Security in CI and Hosting

### CI Security: `npm audit` (SR-202)

The final CI step runs:

```bash
npm audit --omit=dev --audit-level=high
```

- `--omit=dev` audits only production dependencies. Dev dependency vulnerabilities do not affect end users (the production artifact is a static bundle).
- `--audit-level=high` fails the build on High or Critical severity (CVSS >= 7.0).
- This satisfies SR-202.

**Handling audit failures:** If `npm audit` finds a vulnerability with no fix available, the team has two options:

1. Pin a patched version if available upstream.
2. If no fix exists, document the vulnerability in a `SECURITY.md` or PR comment, assess whether it affects the client-side use case, and override with `npm audit --omit=dev --audit-level=critical` (raising the threshold to Critical only) as a temporary measure. This decision requires explicit team acknowledgment.

### CloudFront Response Headers Policy (SR-200, SR-203, SR-208)

Configure a CloudFront response headers policy with the following headers. This is a one-time manual configuration done alongside the CloudFront distribution setup.

| Header | Value | Requirement |
|--------|-------|-------------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | SR-200 |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'none'; frame-ancestors 'none'` | SR-203 |
| `X-Content-Type-Options` | `nosniff` | SR-208 |
| `X-Frame-Options` | `DENY` | SR-208 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | SR-208 |

Notes on the CSP:

- `connect-src 'none'` prevents any network requests from the application, which blocks audio data exfiltration even if XSS occurs. This is a strong security control that is viable only because the MVP has no backend API calls.
- `media-src 'self' blob:` is added to support audio playback via the Web Audio API (which may create blob URLs).
- `style-src 'unsafe-inline'` is required because Vite injects CSS at build time. CSS Modules do not require runtime style injection, but the Vite development build may. This can be tightened later with nonce-based CSP if needed.
- When backend API calls are added in future phases, `connect-src` must be updated to allow the API origin.

### HTTPS Redirect (SR-200)

CloudFront viewer protocol policy is set to `redirect-to-https`. This is a CloudFront distribution setting, not a response header. Combined with the HSTS header above, this ensures all traffic is encrypted in transit.

### Source Map Exclusion (SR-205)

Vite does not produce source maps in production by default (`build.sourcemap` defaults to `false`). The scaffolding must verify this is not overridden in `vite.config.ts`. The bundle size check script implicitly validates this (source maps would inflate the bundle size).

---

## 5. Summary of Deliverables

The following items are produced by DevOps work after HC-2 approval:

| Deliverable | Branch | Priority | Depends On |
|-------------|--------|----------|------------|
| Project scaffolding (all files from Section 3) | `chore/project-scaffolding` | P0 (blocks all feature work) | HC-2 approval |
| CI workflow (`.github/workflows/ci.yml`) | `chore/project-scaffolding` | P0 (included in scaffolding) | HC-2 approval |
| Bundle size check script | `chore/project-scaffolding` | P0 (included in scaffolding) | HC-2 approval |
| Deploy script (`scripts/deploy.sh`) | `chore/project-scaffolding` | P1 (included in scaffolding or separate `chore/deploy-script` branch) | HC-2 approval |
| S3 + CloudFront setup (manual) | N/A (AWS Console) | P1 (needed before first deploy, not before feature work) | HC-2 approval |
| CloudFront response headers policy | N/A (AWS Console) | P1 (configured during CloudFront setup) | S3 + CloudFront setup |

---

*This plan is governed by ADR-001, ADR-002, ADR-003, and ADR-004. Security requirements reference SR-mvp-client-side.md.*
