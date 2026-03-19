# Gate 2: Consolidated Architecture, Design, Security, QA & DevOps Review

**Sprint:** 1 | **Feature:** MVP Pitch Contour Visualization
**Date:** 2026-03-19 | **Coordinator:** Scrum Master
**Status:** APPROVED
**Approved By:** human
**Date:** 2026-03-19

---

## Deliverables Reviewed (All 5 Workstreams)

| # | Agent | Deliverable | Doc |
|---|-------|-------------|-----|
| 1 | Architect | ADR-003: Frontend Technology Stack | `docs/architecture/decisions/ADR-003-frontend-technology-stack.md` |
| 2 | Architect | ADR-004: Project Structure | `docs/architecture/decisions/ADR-004-project-structure.md` |
| 3 | Architect | Service Interface Contracts v1.0 | `docs/architecture/api/service-contracts.md` |
| 4 | Architect | Data Models v1.0 | `docs/architecture/design/data-models.md` |
| 5 | Designer | MVP User Flow v1.0 | `docs/design/flows/mvp-user-flow.md` |
| 6 | Designer | MVP Screen Specifications v1.0 | `docs/design/screens/mvp-screens.md` |
| 7 | Designer | Design System v1.0 | `docs/design/design-system.md` |
| 8 | Security | TM-002: Client-Side Threat Model | `docs/security/threat-models/TM-002-mvp-client-side.md` |
| 9 | Security | SR-mvp-client-side: Security Requirements | `docs/security/requirements/SR-mvp-client-side.md` |
| 10 | QA | MVP Test Plan v1.0 | `docs/qa/test-plan-mvp.md` |
| 11 | DevOps | DevOps Plan: MVP | `docs/architecture/devops-plan-mvp.md` |

---

## Consolidated Verdict: APPROVED WITH COMMENTS

All five workstreams are aligned. One conflict requires ADR-004 to be updated (linter mismatch). Three minor items carried forward from the earlier three-workstream review remain documentation-only. No blocking issues. No unresolved disagreements.

---

## Conflicts Found and Resolved

### Conflict 4 (Action Required): Biome vs ESLint/Prettier

**The issue:** ADR-004 lists `.eslintrc.cjs` and `.prettierrc` in the project structure. The DevOps plan selects **Biome** as the linter/formatter (replacing ESLint + Prettier), and the scaffolding checklist lists `biome.json` instead. The CI pipeline runs `npx biome check src/`, not eslint.

**Resolution:** Biome is the correct choice. It is simpler (one tool, one config file, zero plugin dependencies) and aligns with ADR-001 Principle 1 (Simplicity First). ADR-004 must be updated to replace `.eslintrc.cjs` and `.prettierrc` with `biome.json`.

**Action needed:** Update ADR-004 directory listing: remove `.eslintrc.cjs` and `.prettierrc`, add `biome.json`. This is a documentation fix, not an architectural change.

**Severity:** Low. Tooling alignment, no impact on architecture or interfaces.

### Conflict 1 (Carried Forward, Minor): PitchAnalyzer sync vs UI blocking

The architect's PitchAnalyzer port returns synchronously, but the designer's spinner requires a free UI thread. Resolved: the async wrapper lives in the component layer, not the port. Architect should add implementation guidance to service contracts. Documentation only.

### Conflict 2 (Carried Forward, Minor): ChartData.pitch field semantics

The service contracts omit that `pitch` values are MIDI note numbers (the data models doc clarifies this). Add JSDoc comment to the service contracts. Documentation only.

### Conflict 3 (Carried Forward, Resolved): AC-1.4 upload progress

Already resolved: client-side file read is near-instantaneous. The Processing spinner covers the meaningful wait. No action needed.

---

## Cross-Review: New Workstreams vs Existing Three

### DevOps <-> Architecture: ALIGNED (after Conflict 4 fix)

| Check | Result |
|-------|--------|
| CI test runner matches ADR-003? | Yes -- `npx vitest run` matches Vitest selection |
| CI build tool matches ADR-003? | Yes -- `npx vite build` matches Vite selection |
| CI linter matches ADR-004? | **No** -- Biome vs ESLint/Prettier (Conflict 4, resolved above) |
| Scaffolding directory structure matches ADR-004? | Yes -- `src/domain/`, `src/components/`, `src/adapters/` all present |
| Node version appropriate? | Yes -- Node 20 LTS supports all selected tools |
| Dependencies match ADR-003? | Yes -- react, react-dom, vite, vitest, typescript, biome |

### DevOps <-> Security: ALIGNED

| Security Requirement | DevOps Coverage |
|---------------------|----------------|
| SR-202: `npm audit` in CI | Step 7: `npm audit --omit=dev --audit-level=high` |
| SR-204: `npm ci` + lockfile | Step 1: `npm ci`, lockfile in scaffolding checklist |
| SR-205: No source maps in prod | Vite config in scaffolding: no source maps in prod |
| SR-200: HTTPS/HSTS | CloudFront config in deployment section |
| SR-203: CSP header | CloudFront response headers policy table |
| SR-208: Security headers | CloudFront response headers policy table |
| SR-201: S3 Block Public Access | Deployment section: "Block Public Access all ON" |

All nine security requirements (SR-200 through SR-208 plus SR-104) are covered by either the CI pipeline or the CloudFront/S3 deployment configuration.

### QA <-> Service Contracts: ALIGNED

| Check | Result |
|-------|--------|
| Test plan references correct ports? | Yes -- FileValidator, AudioDecoder, PitchAnalyzer, Visualization |
| AC coverage complete? | Yes -- all 16 ACs (AC-1.1 through AC-4.4) have test cases |
| NFR tests match requirements? | Yes -- bundle size, analysis time, render time, TTI, WCAG AA |
| Security tests match SRs? | Yes -- SR-200 through SR-208 each have a test method |
| Test approach follows testing pyramid? | Yes -- many unit, some component, few integration, manual for cross-browser |

### QA <-> Design: ALIGNED

The test plan's error case coverage (E1-E6) maps exactly to the designer's six error variants. Test fixtures (valid audio, boundary files, invalid files, silence, noise) cover all user flow paths.

### QA <-> DevOps: ALIGNED

The test plan assumes `npx vitest run` for unit/component tests and CI for automated checks. The DevOps CI pipeline runs Vitest at step 4 and bundle size check at step 6. The QA plan's Lighthouse audit and cross-browser checks are manual, which is appropriate for a prototype.

---

## Scope Check (Product Owner Perspective)

### QA Deliverable

| Check | Verdict |
|-------|---------|
| Test plan proportionate to prototype? | **ACCEPT** -- No E2E test framework (Playwright/Cypress) added. Integration tests use small fixtures. Manual testing for cross-browser and accessibility. |
| Over-testing risk? | **None** -- Unit tests cover port logic (high value). Component tests verify ARIA/a11y (necessary). No unnecessary test infrastructure. |
| Test fixtures reasonable? | **ACCEPT** -- Small set of audio fixtures. No test data generation framework. |

### DevOps Deliverable

| Check | Verdict |
|-------|---------|
| No Docker? | **ACCEPT** -- Static site, no containers needed |
| No Terraform/IaC? | **ACCEPT** -- Two AWS resources (S3 + CloudFront), manual one-time setup is simpler |
| No multi-environment? | **ACCEPT** -- Single production environment for <10 users |
| No automated deploy-on-merge? | **ACCEPT** -- Manual deploy via script is sufficient; automated deploy deferred |
| Makefile for local dev? | **ACCEPT** -- Mirrors CI steps, zero infrastructure |
| Biome over ESLint+Prettier? | **ACCEPT** -- Fewer dependencies, one config file, same strictness |

**No scope creep detected in QA or DevOps deliverables.** Both are minimal and proportionate.

---

## Technology Summary

| Category | Selection | Notes |
|----------|-----------|-------|
| Language | TypeScript (strict) | Type safety + AI-agent productivity |
| Framework | React 18 | ~42 KB gzipped, largest AI corpus |
| Build | Vite | Zero-config |
| Test runner | Vitest | Native Vite integration |
| Linter/formatter | **Biome** | Replaces ESLint + Prettier (Conflict 4) |
| CSS | CSS Modules | Zero deps, native Vite support |
| Charting | Chart.js 4.x + react-chartjs-2 | ~65 KB gzipped |
| Pitch detection | pitchfinder (YIN) | ~15 KB gzipped |
| Hosting | S3 + CloudFront | Static, scale-to-zero |
| CI | GitHub Actions | 7-step pipeline |
| Deploy | Manual script (`deploy.sh`) | S3 sync + CloudFront invalidation |
| **JS bundle** | **~145 KB gzipped** | **355 KB under 500 KB budget** |

**Architecture:** Ports-and-adapters. 4 ports, 4 adapters. Domain has zero external deps.
**Structure:** `src/domain/`, `src/adapters/`, `src/components/` -- ~10 source files. Tests in `tests/`.

---

## Unresolved Issues for Human Decision

**None.** All five workstreams are aligned. Conflict 4 (Biome vs ESLint) has a clear resolution (update ADR-004). No agent disagreements require human arbitration.

---

## Recommendation to Human

**Approve HC-2.** All five workstreams produced consistent, proportionate deliverables:

- **Architecture:** Mainstream stack, simple structure, well-defined port interfaces.
- **Design:** Maps cleanly to components. Accessible. No feature creep.
- **Security:** 10 threats identified, 9 requirements, all implementable via CI + CloudFront config.
- **QA:** Test plan covers all 16 ACs and 9 SRs. Follows testing pyramid. No over-testing.
- **DevOps:** Minimal CI (7 steps), manual deploy, no Docker/IaC/multi-env. Biome simplifies tooling.

One action item before implementation: update ADR-004 to replace `.eslintrc.cjs`/`.prettierrc` with `biome.json`.

Implementation can start immediately after approval.
