# Gate 1 Security Review: MVP Requirements (Pitch Contour Visualization)

**Reviewer:** Security Engineer
**Date:** 2026-03-19
**Document Reviewed:** `docs/product/mvp-requirements.md` (v1.0)
**Verdict:** APPROVED WITH COMMENTS

---

## Summary

The MVP requirements document includes a reasonable security section (NFR 3.6) that covers the basics: server-side validation, transient file storage, HTTPS, and input validation. For a prototype with fewer than 10 users and no authentication, the security posture is proportionate to the risk.

However, file upload is one of the most common and well-understood attack vectors on the web. The current requirements are directionally correct but lack specificity in several areas that will matter during implementation. The findings below should be incorporated as clarifications to the requirements before architecture and implementation begin.

No Critical or High findings were identified. All findings are Medium or Low, consistent with the threat surface of an unauthenticated prototype serving fewer than 10 users.

---

## Findings

### Medium Severity

**M-1: File content validation is underspecified**

NFR 3.6 states "Uploaded files must be validated server-side (format, size, content-type)" but does not specify *how* format validation should work. File extension checks alone are insufficient -- an attacker can rename any file to `.mp3`. The requirements should specify that server-side validation MUST verify the actual file content (magic bytes / file signature) rather than relying solely on the file extension or the client-supplied `Content-Type` header.

- **Likelihood:** Medium -- trivially exploitable if only extension-checked
- **Impact:** Medium -- could lead to processing of unexpected file types by the pitch analysis engine, potentially triggering crashes, excessive resource consumption, or unexpected behavior
- **Recommendation:** Add an acceptance criterion or NFR clarifying: "Server-side validation MUST verify file content by inspecting file headers/magic bytes, not relying solely on file extension or client-supplied Content-Type."

**M-2: No explicit requirement for upload rate limiting or abuse prevention**

The system has no authentication, which means any user (or bot) can upload files repeatedly. Without rate limiting, an attacker could exhaust compute resources (Lambda invocations, processing time) or drive up AWS costs beyond the $100/month ceiling.

- **Likelihood:** Medium -- the endpoint is publicly accessible with no authentication
- **Impact:** Medium -- could breach the cost ceiling or cause denial of service for legitimate users
- **Recommendation:** Add an NFR: "The upload/analysis API MUST enforce rate limiting (e.g., N requests per IP per minute) to prevent abuse and cost overruns." The specific limits can be determined during architecture, but the requirement should exist. For an MVP, a simple per-IP throttle at the API Gateway level is sufficient.

**M-3: Transient file storage lacks explicit cleanup and isolation requirements**

NFR 3.6 states files are "transient -- not stored beyond the duration of the analysis session" but does not define:
- Maximum retention duration (what if analysis fails and cleanup does not run?)
- Isolation between concurrent uploads (can one user's request access another's file?)
- Cleanup mechanism (explicit deletion vs. reliance on ephemeral storage like Lambda `/tmp`)

- **Likelihood:** Medium -- cleanup failures are common in error paths
- **Impact:** Medium -- residual user audio data on disk or in S3 after the session ends
- **Recommendation:** Add clarification: "Uploaded files MUST be deleted immediately after analysis completes or fails. If stored in S3 or similar, a lifecycle policy MUST ensure deletion within 1 hour regardless of application behavior. Uploaded files MUST be stored with unique, non-guessable identifiers to prevent cross-session access."

### Low Severity

**L-1: No data classification for audio recordings**

Audio recordings are user-generated content that may contain personally identifiable information (a person's voice is biometric data in some jurisdictions). The requirements do not classify the sensitivity of this data. For an MVP with fewer than 10 users (primarily the product owner), this is low risk, but it should be documented.

- **Likelihood:** Low -- fewer than 10 known users, no account system
- **Impact:** Low -- no persistent storage, no user identification
- **Recommendation:** Add a note to NFR 3.6: "Audio recordings are classified as *user-generated content, medium sensitivity*. For the MVP, the transient processing model (no persistent storage) is the primary data protection control. If persistent storage is added in a future iteration, a privacy impact assessment will be required."

**L-2: No requirement for server-side recording duration validation**

AC-4.3 specifies rejection of recordings shorter than 1 second, and NFR 3.2 sets a maximum of 10 minutes. However, the 50 MB file size limit alone does not prevent a very long, low-bitrate recording from consuming excessive processing time. Server-side duration validation should be mentioned.

- **Likelihood:** Low -- requires intentionally crafted files
- **Impact:** Low -- could cause analysis to exceed the 30-second processing budget, but Lambda timeout would terminate it
- **Recommendation:** Add to NFR 3.6 or AC-4.3: "Server-side validation SHOULD verify recording duration falls within the 1-second to 10-minute range after upload, rejecting out-of-range files before analysis begins."

**L-3: Error messages should not leak implementation details**

AC-4.1 and AC-4.2 specify user-friendly error messages, which is good. The requirements should explicitly state that error responses MUST NOT include stack traces, internal paths, library names, or other implementation details.

- **Likelihood:** Low -- requires an error condition to trigger
- **Impact:** Low -- information disclosure that could aid further attacks
- **Recommendation:** Add to NFR 3.6: "Error responses MUST NOT expose internal implementation details (stack traces, file paths, library versions, or infrastructure identifiers)."

**L-4: No mention of CORS policy**

The frontend will make API calls to the backend. Without a CORS policy, the API could be called from any origin. For an MVP this is low risk, but it should be noted.

- **Likelihood:** Low -- no sensitive data or authentication to exploit
- **Impact:** Low -- unauthorized origins could submit files for processing (cost impact only)
- **Recommendation:** Add to NFR 3.6: "API endpoints SHOULD restrict CORS to the application's own origin." This can be deferred to architecture but should be on the radar.

---

## Proposed Security Requirements to Add to MVP Requirements

The following should be added to Section 3.6 (Security) of the MVP requirements:

| ID | Requirement | Priority |
|----|-------------|----------|
| SR-100 | Server-side file validation MUST verify file content via magic bytes/file signatures, not solely file extension or Content-Type header | Medium |
| SR-101 | Upload/analysis API MUST enforce per-IP rate limiting to prevent abuse and cost overruns | Medium |
| SR-102 | Uploaded files MUST be deleted immediately after analysis completes or fails; a fallback cleanup mechanism (e.g., lifecycle policy) MUST ensure deletion within 1 hour | Medium |
| SR-103 | Uploaded files MUST be stored with unique, non-guessable identifiers to prevent cross-session access | Medium |
| SR-104 | Audio recordings are classified as user-generated content, medium sensitivity; transient processing is the primary data protection control for MVP | Low |
| SR-105 | Error responses MUST NOT expose internal implementation details | Low |
| SR-106 | API endpoints SHOULD restrict CORS to the application's own origin | Low |

---

## Positive Observations

The requirements get several things right from a security perspective:

1. **Transient storage model** -- not persisting audio files is the single most effective data protection control for the MVP. It eliminates an entire class of data breach risks.
2. **Server-side validation is called out** -- even though it needs more specificity, the requirement exists and is in the "Must Have" list.
3. **HTTPS everywhere** -- listed as a Must Have.
4. **No authentication is an explicit, conscious decision** -- it is listed in "Won't Have" and "Out of Scope," not an oversight. For fewer than 10 users on a prototype, this is an acceptable risk.
5. **File size limits are defined** -- 50 MB maximum prevents the most obvious resource exhaustion via large uploads.

---

## Accepted Risks (MVP Scope)

The following risks are accepted for the MVP given the prototype context (fewer than 10 users, no authentication, no persistent storage):

| Risk | Rationale for Acceptance |
|------|-------------------------|
| No authentication -- any user can upload and analyze | Acceptable for fewer than 10 users. Cost ceiling and rate limiting provide guardrails. |
| No audit logging of user actions | No user identity to log. AWS-level logging (CloudTrail, Lambda logs) provides operational visibility. |
| Voice data is biometric in some jurisdictions | No persistent storage, no user accounts, no way to link recordings to identity. Revisit if storage is added. |
| No WAF | API Gateway throttling and rate limiting are sufficient for the scale. |

---

## Verdict: APPROVED WITH COMMENTS

No Critical or High findings. The MVP requirements are appropriate for the threat surface of an unauthenticated prototype serving fewer than 10 users. The six Medium and Low findings above should be incorporated into the requirements as clarifications -- they will guide the architecture and implementation toward secure defaults without adding unnecessary complexity.

The Security Engineer does not block Gate 1 progression. The proposed security requirements (SR-100 through SR-106) should be added to the requirements document before or during the architecture phase.

---

*Reviewed against: ADR-001 (Foundational Principles), TM-001 (Secrets Management), SDLC Gate 1 criteria*
