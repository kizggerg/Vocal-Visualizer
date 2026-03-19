# Gate 1: Consolidated Requirements Review

**Sprint:** 1
**Feature:** MVP Audio Visualization (Pitch Contour)
**Date:** 2026-03-19
**Coordinator:** Scrum Master
**Status:** PENDING (awaiting human approval at HC-1)

---

## Reviewer Verdicts

| Reviewer | Individual Verdict |
|----------|-------------------|
| Architect | APPROVED WITH COMMENTS |
| QA Engineer | APPROVED WITH COMMENTS |
| Security Engineer | APPROVED WITH COMMENTS |

## Consolidated Verdict: APPROVED WITH COMMENTS

All three reviewers approve. Six minor clarifications to the requirements are recommended before HC-1 sign-off. No critical or high-severity findings.

---

## Key Conflict Identified and Resolved

### Conflict: Server-Side vs. Client-Side Architecture

**The problem:** The Security Engineer's review assumes a server-side architecture (server-side file validation, upload API rate limiting, transient server-side file storage, CORS policy on API endpoints). The Architect recommends a **fully client-side architecture** where audio never leaves the browser — no backend, no API, no server-side storage.

**Resolution:** The Architect's client-side recommendation wins per ADR-001 (Simplicity First is Principle 1; Security First is Principle 2, but security concerns are moot when there is no server). Specifically:

- **No server-side file validation needed** — files are validated and processed entirely in the browser. There is no upload endpoint to attack.
- **No API rate limiting needed** — there is no API. The static site is served from CloudFront with AWS Shield Standard (free DDoS protection).
- **No transient file storage concern** — audio files never leave the user's device. This is a *stronger* privacy guarantee than any server-side approach.
- **No CORS policy needed** — there are no API endpoints.
- **No server acceptance time metric** — analysis runs client-side. Performance depends on user hardware, not our servers.

The Security Engineer's concerns about file content validation (magic bytes) and error message hygiene remain valid in spirit — they just apply client-side, not server-side. The accepted changes below reflect this.

---

## Product Owner Scope Check

The PO reviewed all 18 recommendations from the three reviewers:

| Decision | Count | Details |
|----------|-------|---------|
| **ACCEPT** | 6 | Clarifications that close gaps in existing requirements |
| **REJECT** | 8 | Scope creep — server-side assumptions, premature infrastructure, hypothetical requirements |
| **DEFER** | 4 | Valid but belong to Phase 2, not requirements |

### Rejected (scope creep)

| Item | Why Rejected |
|------|-------------|
| MR-1: Rate-limiting language for hypothetical APIs | No API exists. Add when needed. |
| MR-5: M4A-specific decode failure guidance | AC-4.2 already covers decode failures generically. Implementation detail. |
| MR-6: Reliability NFR (99% available) | Static site on CloudFront. Availability is inherited, not engineered. |
| MR-7: Observability NFR (console logging) | Browsers already log errors. Codifying this adds no value. |
| SR-100: Magic-byte file validation | Implementation detail, not a requirement. AC-1.2 covers format validation. |
| SR-101: API rate limiting | No API. Moot. |
| SR-102: Server-side file cleanup | No server storage. Moot. |
| SR-103: Non-guessable file IDs | No server storage. Moot. |
| SR-106: CORS policy | No API endpoints. Moot. |

### Deferred to Phase 2

| Item | When |
|------|------|
| SR-104: Audio data classification | Threat model during Phase 2 |
| W-2: 10-minute recording performance target | Architecture sizing during Phase 2 |
| ADR-003/004: Tech stack and project structure | Phase 2 deliverables |
| Project scaffolding | First implementation task after HC-2 |

---

## Accepted Changes to Requirements (6 items)

These are clarifications to `docs/product/mvp-requirements.md` that should be applied before HC-1:

1. **Add AC for max recording duration validation** — US-1 needs an AC: "Given the user uploads a recording longer than 10 minutes, the system rejects it with a message stating the maximum duration."

2. **Add bundle size NFR** — NFR 3.1 should include: "Total JavaScript bundle size (gzipped) must not exceed 500 KB."

3. **Reword NFR 3.1 for client-side context** — Replace "server-side processing wall clock" and "server acceptance time" language with "client-side processing" and reference mid-range hardware.

4. **Split AC-4.2 into two ACs** — Separate "corrupted/undecodable audio" from "valid audio with no detectable pitch" since they are different failure modes with different user guidance.

5. **Add error hygiene to NFR 3.6** — "Error messages shown to users must not expose stack traces or implementation details."

6. **Update NFR 3.6 file validation language** — Remove "server-side" qualifier from file validation requirement (validation happens client-side).

---

## Foundation Readiness (Informational)

The Architect assessed development readiness separately. Key finding: the repo is docs-only with no project scaffolding, CI, or formalized tech stack. This is expected at this stage — these are Phase 2 and early Phase 4 deliverables. No action needed before HC-1.

---

## Recommendation to Human

**Approve HC-1** with the 6 accepted changes applied to the requirements. All agent reviews pass. The single significant conflict (server-side vs. client-side) is resolved in favor of client-side, which is simpler, cheaper, and more private. The Product Owner has rejected 8 items as scope creep and deferred 4 to Phase 2.

The requirements are ready for design and architecture.
