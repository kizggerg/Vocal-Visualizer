# Security Requirements: MVP Client-Side Architecture

Source: [TM-002-mvp-client-side](../threat-models/TM-002-mvp-client-side.md)

**Context:** The MVP is a fully client-side web application. Audio files are processed entirely in the browser and never transmitted to a server. Infrastructure is limited to S3 + CloudFront for static file hosting. There is no backend, no API, no database, and no authentication.

This document replaces the server-side-focused requirements SR-100 through SR-103 and SR-106 from the Gate 1 security review, which were rejected as moot per the [Gate 1 reconciliation](../../gates/sprint-1-gate-1-requirements-consolidated.md). SR-105 (error message hygiene) was accepted and incorporated into NFR 3.6. SR-104 (data classification) is carried forward here.

---

## Requirements

| ID | Requirement | Priority | Status | Mitigates | Notes |
|----|-------------|----------|--------|-----------|-------|
| SR-200 | CloudFront MUST redirect all HTTP to HTTPS. HSTS header MUST be set (max-age >= 31536000). | High | Open | T-CS-08 | CloudFront viewer protocol policy + response headers policy |
| SR-201 | S3 bucket MUST block all public access (all four Block Public Access settings enabled). CloudFront MUST use Origin Access Control (OAC) as the sole read path to the bucket. | High | Open | T-CS-01, T-CS-06 | Validate in IaC; no bucket policy grants to `*` |
| SR-202 | CI pipeline MUST run `npm audit --production` and fail the build on Critical or High severity vulnerabilities (CVSS >= 7.0). | High | Open | T-CS-02 | Add as a step in GitHub Actions workflow |
| SR-203 | Content Security Policy header MUST be set via CloudFront response headers policy. Minimum policy: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'none'; frame-ancestors 'none'` | Medium | Open | T-CS-03 | `connect-src 'none'` prevents audio exfiltration even if XSS occurs. Adjust `style-src` if CSS-in-JS framework requires it. |
| SR-204 | `package-lock.json` MUST be committed to the repository. CI MUST use `npm ci` (not `npm install`) for deterministic, reproducible builds. | Medium | Open | T-CS-02 | Standard npm best practice |
| SR-205 | Production builds MUST NOT include source maps, API keys, internal URLs, debug flags, or verbose console logging. Error messages shown to users MUST NOT expose stack traces or implementation details. | Medium | Open | T-CS-07, NFR 3.6 | Build config strips source maps; lint rule or build check enforces |
| SR-206 | Client-side validation MUST check file size (<= 50 MB), recording duration (1 sec - 10 min), and file type (WAV, MP3, M4A by extension and MIME type) before passing files to Web Audio API for decoding. | Medium | Open | T-CS-04 | Aligns with AC-1.2, AC-1.3, AC-1.6, AC-4.3 |
| SR-207 | All JavaScript dependencies SHOULD be bundled into the application rather than loaded from external CDNs. If external CDN loading is used, Subresource Integrity (SRI) attributes MUST be present. | Low | Open | T-CS-02 | Bundling is simpler and more reliable |
| SR-208 | CloudFront response headers MUST include: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` | Low | Open | T-CS-03, T-CS-05 | Configure via CloudFront response headers policy alongside CSP |
| SR-104 | Audio recordings are classified as user-generated content, medium sensitivity. The client-only processing model (no transmission, no persistence) is the primary data protection control. A privacy impact assessment MUST be conducted before any future feature that adds server-side processing or persistent storage of audio. | Low | Open | T-CS-03, T-CS-09 | Deferred from Gate 1; documented here for tracking |

---

## Relationship to Other Security Requirements

- **SR-secrets-management.md** (from TM-001) remains fully applicable. Requirements SR-001 through SR-013 cover CI/CD secrets, GitHub Actions OIDC, agent access controls, and secret scanning. These are relevant to the MVP since the CI/CD pipeline deploys the static site.
- **SR-008** (Lambda least-privilege) and **SR-009** (SSM Parameter Store) from TM-001 are not applicable to the MVP since there is no backend. They become relevant if server-side processing is added later.

---

## Superseded Requirements

The following requirements from the Gate 1 security review are formally superseded by this document:

| Old ID | Original Requirement | Disposition |
|--------|---------------------|-------------|
| SR-100 | Server-side magic-byte file validation | **Superseded by SR-206** (client-side validation) |
| SR-101 | API rate limiting | **Rejected** -- no API exists |
| SR-102 | Server-side file cleanup within 1 hour | **Rejected** -- no server-side storage |
| SR-103 | Non-guessable file identifiers | **Rejected** -- no server-side storage |
| SR-105 | Error messages must not expose implementation details | **Accepted** -- incorporated into NFR 3.6 and SR-205 |
| SR-106 | CORS policy on API endpoints | **Rejected** -- no API endpoints |

---

## Implementation Checklist

For engineers implementing these requirements:

- [ ] **SR-200**: CloudFront `ViewerProtocolPolicy: redirect-to-https` + response headers policy with HSTS
- [ ] **SR-201**: S3 `BlockPublicAccess` all four flags true + CloudFront OAC configured
- [ ] **SR-202**: GitHub Actions step: `npm audit --production --audit-level=high`
- [ ] **SR-203**: CloudFront response headers policy with CSP header
- [ ] **SR-204**: `package-lock.json` committed; CI workflow uses `npm ci`
- [ ] **SR-205**: Build config: `devtool: false` (or equivalent); no `.map` files deployed; lint rule for console.log
- [ ] **SR-206**: Validation logic in upload handler checks size, duration, extension/MIME before Web Audio decode
- [ ] **SR-207**: Verify all JS is bundled; no external `<script>` tags without SRI
- [ ] **SR-208**: CloudFront response headers policy includes security headers
- [ ] **SR-104**: Documented -- no action required unless architecture changes

---

*Derived from TM-002-mvp-client-side. Reviewed against ADR-001, ADR-002, MVP Requirements v1.1, Gate 1 Reconciliation.*
