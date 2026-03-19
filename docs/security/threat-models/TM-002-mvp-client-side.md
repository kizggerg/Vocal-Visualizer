# Threat Model: MVP Client-Side Architecture

## Overview

The Vocal Visualizer MVP is a **fully client-side web application** hosted as static files on AWS S3 + CloudFront. Users upload audio files which are decoded and analyzed entirely in the browser using the Web Audio API and a JavaScript pitch detection library. Audio never leaves the user's device. There is no backend, no API, no database, and no server-side processing.

This threat model covers the real attack surface of this architecture: static hosting misconfiguration, client-side code integrity, dependency supply chain, and user privacy in the browser context.

**Governing principles applied:**
- ADR-001 Principle 1 (Simplicity First): Keep mitigations proportionate to a <10 user prototype
- ADR-001 Principle 2 (Security First): Validate inputs, protect integrity of served code
- ADR-002: AWS, S3 + CloudFront, <$100/month

**Scope exclusions:** This model does not cover backend threats (API injection, server-side file storage, Lambda exploits, CORS bypass, database attacks) because no backend exists. See the Gate 1 reconciliation document for rationale.

---

## Data Flow Diagram

```
                    TRUST BOUNDARY: User's Browser
                   +--------------------------------------------+
                   |                                            |
  User selects    |  +-----------+    +------------------+     |
  audio file ---->|  | File API  |--->| Web Audio API    |     |
                   |  | (read     |    | (decode audio    |     |
                   |  |  locally) |    |  to PCM samples) |     |
                   |  +-----------+    +--------+---------+     |
                   |                            |               |
                   |                            v               |
                   |                   +------------------+     |
                   |                   | Pitch Detection  |     |
                   |                   | Library (JS)     |     |
                   |                   +--------+---------+     |
                   |                            |               |
                   |                            v               |
                   |                   +------------------+     |
                   |                   | Chart Library    |     |
                   |                   | (render contour) |     |
                   |                   +------------------+     |
                   +--------------------------------------------+

                    TRUST BOUNDARY: AWS Static Hosting
                   +--------------------------------------------+
                   |                                            |
  Browser ------->|  CloudFront (CDN)                          |
  requests HTML,  |       |                                     |
  JS, CSS         |       v                                     |
                   |  S3 Bucket (origin, private)               |
                   |  [index.html, app.js, styles.css]          |
                   |                                            |
                   +--------------------------------------------+

                    TRUST BOUNDARY: CI/CD (Build & Deploy)
                   +--------------------------------------------+
                   |                                            |
                   |  GitHub Actions                            |
                   |    npm install -> npm audit -> build        |
                   |    -> deploy to S3 -> invalidate CloudFront|
                   |                                            |
                   +--------------------------------------------+
```

**Key observation:** Audio data flows only within the browser trust boundary. The only data crossing trust boundaries is the static application code served from CloudFront to the browser.

---

## Assets

| Asset | Sensitivity | Location |
|-------|------------|----------|
| Application source code (JS/HTML/CSS) | Low | S3 bucket, GitHub repo, served via CloudFront |
| User audio recordings | Medium (voice is biometric data in some jurisdictions) | User's browser only -- never transmitted |
| Pitch analysis results | Low | User's browser only -- ephemeral, not persisted |
| npm dependencies (build-time) | Medium (supply chain risk) | node_modules, bundled into deployed JS |
| S3 bucket configuration | Medium | AWS account, managed via IaC |
| CloudFront distribution config | Medium | AWS account, managed via IaC |

---

## Threats

| ID | Category (STRIDE) | Threat | Likelihood (H/M/L) | Impact (H/M/L) | Risk | Mitigation |
|----|-------------------|--------|--------------------|-----------------|---------------------------------|------------|
| T-CS-01 | Tampering | **S3 bucket misconfiguration allows unauthorized write access.** Attacker modifies served JS to inject malicious code (credential theft, crypto mining, audio exfiltration). | Low | High | **Medium** | S3 bucket policy: deny all public access. CloudFront OAC (Origin Access Control) is the only principal with read access. No public bucket policy. Validate in IaC. |
| T-CS-02 | Tampering | **Dependency supply chain attack.** A compromised or typosquatted npm package injects malicious code into the application bundle at build time. | Medium | High | **High** | Run `npm audit` in CI pipeline. Use `package-lock.json` for deterministic installs. Pin major versions. Review dependency tree periodically. Consider Subresource Integrity for any CDN-loaded scripts (though bundling is preferred over CDN loading). |
| T-CS-03 | Information Disclosure | **XSS exfiltrates user audio data.** If an XSS vulnerability exists (e.g., unsanitized data rendered to DOM), an attacker could inject script that captures audio data from the browser and sends it to an external server. | Low | High | **Medium** | Content Security Policy (CSP) header restricts script sources and disallows inline scripts. No user-generated content is rendered as HTML. Frameworks with auto-escaping (React, etc.) provide default XSS protection. |
| T-CS-04 | Denial of Service | **Malicious audio file causes browser tab crash or excessive resource consumption.** A crafted audio file exploits Web Audio API decoding or the pitch detection library to consume excessive memory or CPU, freezing the user's browser. | Low | Low | **Low** | Client-side file size limit (50 MB) and duration limit (10 min) validated before processing. Web Audio API operates in a sandboxed context. Browser process isolation limits blast radius to the tab. Accept risk for MVP -- this only affects the user who uploaded the file. |
| T-CS-05 | Information Disclosure | **CloudFront serves stale or poisoned cache.** Cache poisoning via manipulated request headers causes CloudFront to cache and serve a modified response. | Low | Medium | **Low** | Use CloudFront cache policies that ignore unrecognized headers. HTTPS-only origin protocol. CloudFront cache invalidation on deploy. This is a theoretical risk with CloudFront's built-in protections. |
| T-CS-06 | Spoofing | **S3 bucket takeover via deleted/recreated bucket.** If the S3 bucket is deleted, an attacker could recreate it with the same name and serve malicious content through the existing CloudFront distribution. | Low | High | **Medium** | Protect S3 bucket with deletion protection (DenyS3:DeleteBucket in bucket policy or SCP). Use a unique, non-guessable bucket name. CloudFront OAC binds to specific bucket -- reconfiguration requires AWS account access. |
| T-CS-07 | Information Disclosure | **Source code in browser reveals sensitive information.** Client-side JS is fully visible. If API keys, internal URLs, or debug information are included, they are exposed. | Medium | Medium | **Medium** | No secrets in client-side code (there are none for MVP -- no backend). Build process strips source maps in production. Lint rule or CI check to prevent accidental inclusion of sensitive strings. |
| T-CS-08 | Tampering | **Man-in-the-middle on HTTP (non-HTTPS) serves modified application code.** If HTTPS is not enforced, an attacker on the network can modify the served JavaScript. | Medium | High | **High** | CloudFront configured to redirect HTTP to HTTPS. HSTS header set on responses. S3 origin accessible only via CloudFront (no direct HTTP access to bucket). |
| T-CS-09 | Information Disclosure | **Browser extensions or malicious scripts on same page access audio data.** Third-party browser extensions can read page content and intercept JavaScript API calls. | Low | Medium | **Low** | Out of scope -- browser extensions operate with user-granted permissions. The application cannot defend against them. Accept risk. Document that audio processing is local-only. |
| T-CS-10 | Tampering | **CI/CD pipeline compromised, deploys malicious build to S3.** Attacker compromises GitHub Actions workflow or a build dependency to deploy tampered code. | Low | High | **Medium** | Branch protection on `main` requires human PR approval (SR-007). OIDC federation for AWS deploy (SR-002). CI pipeline includes `npm audit`. Deploy workflow runs only on `main` merge. Covered by TM-001. |

---

## Security Requirements

These replace the server-side-focused SR-100 through SR-106 from the Gate 1 review (which were rejected as moot per the reconciliation). They are specific to the client-side architecture.

| ID | Requirement | Priority | Mitigates |
|----|-------------|----------|-----------|
| SR-200 | CloudFront distribution MUST redirect all HTTP requests to HTTPS. HSTS header MUST be set with max-age >= 31536000. | **High** | T-CS-08 |
| SR-201 | S3 bucket MUST block all public access (S3 Block Public Access enabled on all four settings). CloudFront MUST use Origin Access Control (OAC) as the sole access path. | **High** | T-CS-01, T-CS-06 |
| SR-202 | CI pipeline MUST run `npm audit --production` and fail the build on Critical or High severity vulnerabilities. | **High** | T-CS-02 |
| SR-203 | Content Security Policy (CSP) header MUST be set via CloudFront response headers policy. At minimum: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'none'; frame-ancestors 'none'`. | **Medium** | T-CS-03 |
| SR-204 | `package-lock.json` MUST be committed and CI MUST use `npm ci` (not `npm install`) for deterministic builds. | **Medium** | T-CS-02 |
| SR-205 | Production builds MUST NOT include source maps, API keys, internal URLs, debug flags, or console.log statements that expose implementation details. | **Medium** | T-CS-07, NFR 3.6 |
| SR-206 | Client-side file validation MUST check file size, duration, and MIME type/file extension before passing to Web Audio API for decoding. | **Medium** | T-CS-04 |
| SR-207 | If any third-party scripts are loaded from external CDNs (not bundled), they MUST use Subresource Integrity (SRI) attributes. Bundling all dependencies is preferred over CDN loading. | **Low** | T-CS-02 |
| SR-208 | CloudFront response headers MUST include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin`. | **Low** | T-CS-03, T-CS-05 |
| SR-104 | Audio recordings are classified as user-generated content, medium sensitivity (voice is biometric data in some jurisdictions). The client-side-only processing model is the primary data protection control. If server-side processing or persistence is added in a future iteration, a privacy impact assessment MUST be conducted. | **Low** | T-CS-03, T-CS-09 |

---

## Accepted Risks (MVP Scope)

These risks are accepted for the prototype given the context: <10 users, no authentication, no persistent data, no backend.

| Risk | Rating | Rationale for Acceptance |
|------|--------|-------------------------|
| Browser extensions can access audio data in the page | Low | Cannot be mitigated by the application. User controls their own browser environment. |
| Malicious audio file could crash the browser tab | Low | Only affects the user who uploaded the file. Browser sandboxing limits blast radius. File size/duration limits reduce likelihood. |
| CloudFront cache poisoning | Low | Theoretical with CloudFront's built-in protections. HTTPS + standard cache policy is sufficient. |
| No Web Application Firewall (WAF) | Low | No dynamic content to protect. Static file serving does not benefit meaningfully from WAF at this scale. |
| No Content Security Policy reporting endpoint | Low | CSP is set in enforce mode. A reporting endpoint adds infrastructure for minimal value at <10 users. Revisit if user base grows. |

---

## Recommendations (Priority Order)

1. **Enforce HTTPS with HSTS** (SR-200) -- Configure CloudFront viewer protocol policy to redirect-to-https. Add HSTS via CloudFront response headers policy. Zero-cost, high-impact control against T-CS-08.

2. **Lock down S3 bucket** (SR-201) -- Enable S3 Block Public Access on all four settings. Use CloudFront OAC. This is the most important infrastructure control -- a misconfigured bucket is the primary hosting threat.

3. **Add `npm audit` to CI** (SR-202) -- A single line in the GitHub Actions workflow. Catches known vulnerabilities in dependencies before they reach production. Addresses the highest-rated threat (T-CS-02).

4. **Use `npm ci` with committed lockfile** (SR-204) -- Ensures deterministic builds and prevents dependency confusion attacks. Standard practice, zero overhead.

5. **Set Content Security Policy** (SR-203) -- Configure via CloudFront response headers policy. Restricts script execution sources, providing defense-in-depth against XSS. For the MVP, `connect-src 'none'` is particularly valuable: it prevents any JavaScript from making network requests, which means even if XSS occurs, audio data cannot be exfiltrated via fetch/XHR.

6. **Strip source maps and debug artifacts from production builds** (SR-205) -- Standard build configuration. Prevents information disclosure.

7. **Add security response headers** (SR-208) -- Configure via CloudFront response headers policy alongside CSP. Low effort, standard practice.

8. **Bundle dependencies rather than loading from CDNs** (SR-207) -- Avoids reliance on third-party CDN availability and integrity. If CDN loading is used, require SRI.

---

## Relationship to Other Threat Models

- **TM-001 (Secrets Management)** remains fully applicable for CI/CD pipeline security, GitHub Actions OIDC, and agent access controls.
- Several TM-001 threats (T5: agent pushes malicious code, T1: secrets in repo) are relevant to the static hosting model since a compromised build pipeline can inject malicious code into the deployed static site.
- The Lambda/SSM/DynamoDB sections of TM-001 are **not applicable** to the MVP since there is no backend. They become relevant if/when server-side processing is added.

---

*Reviewed against: ADR-001 (Foundational Principles), ADR-002 (Infrastructure Constraints), MVP Requirements v1.1, Gate 1 Reconciliation*
