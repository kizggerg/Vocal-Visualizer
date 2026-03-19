# DevOps Plan: MVP (Client-Side Static App)

**Author:** DevOps Engineer | **Date:** 2026-03-19 | **Status:** Proposed

Covers CI, deployment, and scaffolding for the static React + Vite + TypeScript MVP on S3 + CloudFront. Multi-environment (staging + production) with pipeline-driven Terraform — see ADR-005.

---

## 1. CI Pipeline (`.github/workflows/ci.yml`)

**Trigger:** PRs to `main` | **Runner:** `ubuntu-latest` | **Node:** 20 LTS

| # | Step | Command | Fails on |
|---|------|---------|----------|
| 1 | Install | `npm ci` | Lockfile mismatch (SR-204) |
| 2 | Lint + format | `npx biome check src/` | Any error or format diff |
| 3 | Type-check | `npx tsc --noEmit` | Any type error |
| 4 | Test | `npx vitest run` | Test failure |
| 5 | Build | `npx vite build` | Build error |
| 6 | Bundle size | `scripts/check-bundle-size.sh` | Gzipped JS+CSS > 500 KB |
| 7 | Dep audit | `npm audit --omit=dev --audit-level=high` | High/Critical CVE (SR-202) |

**Local equivalent:** `make ci` runs steps 2-7 sequentially. Individual targets: `make lint`, `make test`, etc. Same commands also available as `npm run lint`, `npm test`, `npm run build`.

---

## 2. Deployment

### Environments (ADR-005)

| Environment | Trigger | Pipeline |
|-------------|---------|----------|
| **Local** | Feature branch, `npm run dev` | Developer/agent iteration |
| **Staging** | Merge to `main` (automatic) | `deploy-staging.yml` — terraform apply + app deploy |
| **Production** | Manual `workflow_dispatch` | `promote-production.yml` — terraform apply + app deploy |

### Infrastructure (Terraform, pipeline-driven)

Each environment has its own S3 bucket, CloudFront distribution, and Terraform state. The pipeline runs `terraform init`, `plan`, and `apply` — no manual infrastructure changes.

- S3: Block Public Access all ON (SR-201), no static hosting, OAC access only
- CloudFront: HTTPS redirect (SR-200), OAC origin, default root `index.html`, `PriceClass_100`
- Response headers policy (SR-200, SR-203, SR-208):

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'none'; frame-ancestors 'none'` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

### `scripts/deploy.sh`

- Reads `VOCAL_VISUALIZER_S3_BUCKET` and `VOCAL_VISUALIZER_CF_DISTRIBUTION_ID` from env vars or Terraform outputs
- Runs `aws s3 sync dist/ s3://$BUCKET --delete` with cache-control: `immutable` for hashed assets, `no-cache` for HTML
- Creates CloudFront invalidation (`/*`)
- No hardcoded secrets; AWS creds from caller's environment

**Local deploy:** `make deploy-staging` or `make deploy-prod` (requires `make infra-init-<env>` + `make infra-apply-<env>` first).

---

## 3. Scaffolding Checklist (`chore/project-scaffolding`)

### Files to create

| File | Purpose |
|------|---------|
| `package.json` | Deps, scripts: `dev`, `build`, `test`, `lint`, `typecheck`, `preview` |
| `package-lock.json` | Deterministic installs (SR-204) |
| `tsconfig.json` | Strict mode, ES2020 target, `react-jsx` |
| `tsconfig.node.json` | Node context for Vite config |
| `vite.config.ts` | React plugin, no source maps in prod (SR-205) |
| `vitest.config.ts` | jsdom env, coverage thresholds |
| `biome.json` | Linter + formatter config |
| `index.html` | Vite entry point |
| `Makefile` | `ci`, `lint`, `typecheck`, `test`, `build`, `bundle-check`, `audit` |
| `src/main.tsx` | React root mount |
| `src/vite-env.d.ts` | Vite type declarations |
| `src/components/App.tsx` | Placeholder component |
| `src/components/App.module.css` | Placeholder styles |
| `src/domain/types.ts` | Domain types placeholder |
| `src/domain/ports.ts` | Port interfaces placeholder |
| `tests/domain/placeholder.test.ts` | One passing test to validate Vitest |
| `scripts/check-bundle-size.sh` | Gzipped bundle < 500 KB gate |
| `scripts/deploy.sh` | S3 + CloudFront deploy |
| `.github/workflows/ci.yml` | CI pipeline |

### Dependencies

**Production:** `react`, `react-dom` (^18.3). Feature deps (chart.js, pitchfinder) added with their features.

**Dev:** `typescript`, `vite`, `@vitejs/plugin-react`, `vitest`, `jsdom`, `@biomejs/biome`, `@types/react`, `@types/react-dom`, `@testing-library/react`, `@testing-library/jest-dom`

### Acceptance criteria

1. `npm ci && npm run dev` starts dev server
2. `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` all pass
3. `make ci` runs full pipeline and passes
4. CI workflow passes on the PR
5. No source maps in `dist/`, `dist/` in `.gitignore`

---

## 4. Linter: Biome

**Pick: Biome.** It replaces both ESLint and Prettier in a single zero-config binary, eliminating the ESLint + Prettier + eslint-config-prettier dependency chain -- fewer deps, one config file, same strictness (Principle 1: Simplicity First).

---

*Governed by ADR-001, ADR-002, ADR-003. Security refs: SR-mvp-client-side.*
