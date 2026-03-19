# Gate 2: Consolidated Architecture & Design Review

**Sprint:** 1
**Feature:** MVP Audio Visualization (Pitch Contour)
**Date:** 2026-03-19
**Coordinator:** Scrum Master
**Status:** PENDING (awaiting human approval at HC-2)
**Approved By:** --

---

## Deliverables Reviewed

| Agent | Deliverable | Status |
|-------|-------------|--------|
| Architect | ADR-003: Frontend Technology Stack | Proposed |
| Architect | ADR-004: Project Structure | Proposed |
| Architect | Service Interface Contracts v1.0 | Proposed |
| Architect | Data Models v1.0 | Proposed |
| Designer | MVP User Flow v1.0 | Draft |
| Designer | MVP Screen Specifications v1.0 | Draft |
| Designer | Design System v1.0 | Draft |
| Security Engineer | TM-002: MVP Client-Side Threat Model | Complete |
| Security Engineer | SR-mvp-client-side: Security Requirements | Complete |

---

## Consolidated Verdict: APPROVED WITH COMMENTS

All deliverables are well-aligned, internally consistent, and appropriate for the MVP scope. No blocking conflicts were found. Three minor issues and one item for human awareness are documented below.

---

## Cross-Review Findings

### Architecture <-> Design: ALIGNED

The architect's component architecture and the designer's screen specs are fully compatible:

- **Components match.** The architect defines five React components (App, UploadArea, ProcessingStatus, PitchContour, ErrorMessage) in ADR-004. The designer's four screens (Upload, Processing, Results, Error) map directly to these components with a clean 1:1 correspondence. No component is missing; no extra component is assumed by the design.

- **State machine alignment.** The designer's user flow describes three primary states (Upload, Processing, Results) plus error states. The architect's App.tsx is designated as the state machine orchestrator. The flow diagram's state transitions (file selected -> validation -> processing -> results/error) map cleanly to the port invocation sequence in the service contracts (FileValidator -> AudioDecoder -> PitchAnalyzer -> Visualization).

- **Chart library alignment.** The designer specifies Chart.js configuration details (aspect ratio 2:1, line weight 2px, point radius 2-3px, tooltip format "Note: A4 | Time: 12.3s", spanGaps: false). These are all features natively supported by Chart.js 4.x as selected in ADR-003. The designer did not assume any charting capability that Chart.js lacks.

- **CSS approach alignment.** The designer defines CSS custom properties (tokens) for the design system. The architect selects CSS Modules in ADR-003. These are compatible -- CSS custom properties on `:root` work with CSS Modules without conflict.

### Architecture <-> Security: ALIGNED

- **Client-side architecture consistency.** The threat model (TM-002) is correctly scoped to the client-side architecture established at Gate 1. It covers static hosting (S3 + CloudFront), supply chain, and browser-context threats. No server-side assumptions.

- **Security requirements are implementable.** All nine security requirements (SR-200 through SR-208, plus SR-104) are architecturally viable:
  - SR-200 (HTTPS/HSTS), SR-201 (S3 lockdown), SR-203 (CSP), SR-208 (security headers): CloudFront configuration. No code changes needed.
  - SR-202 (npm audit in CI), SR-204 (npm ci + lockfile): CI pipeline configuration. Standard practice.
  - SR-205 (strip source maps): Vite build configuration. Default behavior for production builds.
  - SR-206 (client-side validation): Already specified in the FileValidator port contract. The architect's service contract and the security requirement are in direct agreement.
  - SR-207 (bundle dependencies): ADR-003 already selects Vite bundling. All dependencies are bundled, not CDN-loaded.

- **CSP compatibility with CSS Modules.** SR-203 includes `style-src 'self' 'unsafe-inline'`. The `'unsafe-inline'` is needed because CSS Modules in Vite can inject style tags during development. In production builds, Vite extracts CSS to files, so `style-src 'self'` alone would suffice. The security engineer's policy is slightly permissive but correct for covering both environments. **No conflict.**

### Design <-> Security: ALIGNED

- **Error message hygiene.** The designer's error messages (E1-E6) are all plain-language, user-friendly, and expose no implementation details. This satisfies SR-205 and NFR 3.6.

- **No external network requests.** The designer's flow confirms no network activity after page load. This is consistent with the security engineer's CSP of `connect-src 'none'`, which blocks all fetch/XHR requests.

### Service Contracts <-> Data Models: CONSISTENT

- All types referenced in the service contracts (FileConstraints, ValidationResult, AudioMetadata, PitchContour, AnalysisConfig, ChartData, DecodingError) are defined in the data models document.
- The data flow diagram in the data models document matches the port invocation sequence in the service contracts.
- Return types are consistent: FileValidator returns ValidationResult (discriminated union), AudioDecoder returns metadata + samples, PitchAnalyzer returns PitchContour, Visualization returns ChartData.

### PO Scope Check <-> Design: ALIGNED

- The designer's screens implement exactly the four user stories (US-1 through US-4) and do not introduce features beyond the approved requirements.
- The "Could Have" items from the requirements (smooth transitions, responsive tablet optimization) are explicitly deferred in the design system (section 10: "No animated transitions... deferred").
- The secondary button style defined in the design system (section 4) is marked as "Not used in the MVP currently, but defined for future use." This is a minor forward-looking definition, not scope creep -- it adds zero implementation work.

### QA <-> All: TESTABLE

- **Port interfaces are testable.** Each port has clear inputs and outputs with explicit types. Pure functions in domain/ can be unit tested. Adapters can be tested against their port contracts.
- **Error states are enumerable.** The designer's six error variants (E1-E6) map to specific validation/processing failures, each with a clear trigger condition. These are testable acceptance criteria.
- **Data models support test fixtures.** All types are plain TypeScript interfaces with no hidden dependencies. Test data can be constructed trivially.

---

## Conflicts Identified and Resolved

### Conflict 1 (Minor): PitchAnalyzer synchronous vs. UI blocking

**The issue:** The architect's PitchAnalyzer port returns synchronously (`PitchContour`, not `Promise<PitchContour>`). The service contract notes say "the adapter may internally use chunked processing or requestAnimationFrame to avoid blocking the UI thread." However, the designer's Processing state shows a spinner animation that requires the UI thread to be free. If pitch analysis blocks the main thread for up to 30 seconds (the NFR target for a 5-minute recording), the spinner will freeze.

**Resolution:** This is an implementation concern, not an interface conflict. The architect explicitly notes that a Web Worker can be used without changing the port interface. The recommended implementation approach is:
1. The App component calls the adapter asynchronously (wrapping the synchronous port in a Promise that runs in a Web Worker or uses chunked processing with requestAnimationFrame).
2. The port interface stays synchronous -- the async wrapper lives in the component layer, not the port.

**Action needed:** The architect should add a brief note to the service contracts clarifying the recommended async wrapping pattern, so the frontend engineer does not block the UI thread with a synchronous 30-second call. This is a documentation clarification, not a contract change.

**Severity:** Low. No deliverable change required. Implementation guidance only.

### Conflict 2 (Minor): ChartData.pitch field semantics

**The issue:** In the service contracts, the `ChartData` interface defines `points: Array<{ time: number; pitch: number | null }>`. The data models document clarifies that `pitch` values are MIDI note numbers. However, the service contracts document defines `ChartData` inline without stating that `pitch` is in MIDI note numbers. A frontend engineer reading only the service contracts could misinterpret `pitch` as Hz values.

**Resolution:** Add a JSDoc comment to the `pitch` field in the ChartData definition in the service contracts, clarifying it is a MIDI note number. The data models document already has this information; the service contracts should be consistent.

**Action needed:** Add comment `/** MIDI note number (0-127), or null for silence/unvoiced. */` to the pitch field in the ChartData interface in the service contracts document.

**Severity:** Low. Documentation clarification only.

### Conflict 3 (Minor): Upload progress indicator (AC-1.4) vs. processing spinner

**The issue:** AC-1.4 requires an "upload progress indicator (e.g., progress bar or spinner with percentage)." In a fully client-side architecture, there is no network upload -- the file is read locally. The designer's Processing screen shows an indeterminate spinner with "Analyzing your recording..." which covers the processing phase, but there is no explicit progress indication for the file read/decode step. The designer's flow collapses "upload" (local file read) and "processing" (decode + analysis) into a single Processing state.

**Resolution:** This is correct behavior for the client-side architecture. The "upload" in AC-1.4 was written before the client-side decision. Reading a local file via the File API is near-instantaneous (even for 50 MB files), so a progress indicator for file reading adds no value. The meaningful wait is the decode + analysis phase, which the designer covers with the Processing spinner. AC-1.4 is satisfied in spirit -- the user sees feedback during the waiting period.

**Action needed:** None. The designer's interpretation is correct for the client-side architecture.

**Severity:** None. Already resolved by design.

---

## Scope Check Results

**Reviewed by:** Product Owner perspective (Scrum Master acting as scope guard per reconciliation protocol)

| Item | Verdict | Rationale |
|------|---------|-----------|
| React 18 framework | ACCEPT | Justified by AI-agent productivity and 500 KB budget headroom |
| Vite + Vitest toolchain | ACCEPT | Zero-config, simplest option per Principle 1 |
| CSS Modules (no Tailwind) | ACCEPT | Zero additional dependencies, simplest approach |
| Four port interfaces | ACCEPT | Maps directly to the four identified processing steps. Not over-abstracted. |
| Flat project structure | ACCEPT | Appropriate for ~10 source files |
| Secondary button style in design system | ACCEPT | Zero implementation cost, does not expand scope |
| `prefers-reduced-motion` support | ACCEPT | One CSS rule, satisfies accessibility best practice |
| Design system tokens (colors, spacing, typography) | ACCEPT | Necessary for consistent implementation |
| Threat model with 10 threats | ACCEPT | Proportionate to the architecture. No unnecessary mitigations proposed. |
| Nine security requirements (SR-200 to SR-208) | ACCEPT | All are standard practices for static hosting. None require new infrastructure beyond CloudFront configuration. |
| SR-104 audio data classification | ACCEPT | Documentation only, no action required |

**No scope creep detected.** All deliverables are tightly scoped to the four user stories. The architect did not introduce unnecessary abstractions or premature infrastructure. The designer did not introduce features beyond the approved requirements. The security engineer scoped the threat model to the actual architecture (no hypothetical server-side threats).

---

## Unresolved Issues for Human Decision

**None.** All agents are aligned. The three minor issues identified above are documentation clarifications, not disagreements requiring human arbitration.

---

## Technology Selections Summary

For quick human review -- these are the choices that will be expensive to change later:

| Decision | Selection | Bundle Impact | Rationale |
|----------|-----------|---------------|-----------|
| Language | TypeScript (strict) | -- | Type safety, AI-agent productivity |
| Framework | React 18 | ~42 KB gzipped | Largest AI training corpus, best ecosystem |
| Build tool | Vite | -- | Zero-config for React + TS |
| Test runner | Vitest | -- | Native Vite integration, Jest-compatible API |
| CSS | CSS Modules | 0 KB (native Vite) | Scoped styles, zero dependencies |
| Charting | Chart.js 4.x + react-chartjs-2 | ~65 KB gzipped | Supports all chart requirements (line/scatter, tooltips, null gaps, custom Y-axis) |
| Pitch detection | pitchfinder (YIN) | ~15 KB gzipped | Pure JS, no native deps, known maintenance risk (mitigated by port boundary) |
| Hosting | S3 + CloudFront | -- | Static files, scale-to-zero, HTTPS |
| **Total estimated JS bundle** | **~145 KB gzipped** | **Under 500 KB budget by 355 KB** | |

**Architecture pattern:** Ports-and-adapters (hexagonal). Four ports (FileValidator, AudioDecoder, PitchAnalyzer, Visualization) with one adapter each. Domain layer has zero external dependencies. Adapters are swappable at the port boundary.

**Project structure:** Flat three-directory layout under `src/` (domain/, adapters/, components/) with ~10 source files. Tests in parallel `tests/` directory.

---

## Recommendation to Human

**Approve HC-2.** All three workstreams (architecture, design, security) produced consistent, well-scoped deliverables. The technology stack is mainstream, the architecture is appropriately simple for a ~10-file MVP, the design maps cleanly to the component architecture, and the security posture is proportionate to the threat surface.

No conflicts require human resolution. Two minor documentation clarifications (async wrapping guidance and ChartData pitch field comment) will be addressed during implementation.

The deliverables are ready for Phase 3 (Test Planning).
