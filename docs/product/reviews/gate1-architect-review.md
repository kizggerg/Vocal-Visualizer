# Gate 1: Architect Review of MVP Requirements

**Document Reviewed:** `docs/product/mvp-requirements.md` v1.0
**Reviewer:** Architect
**Date:** 2026-03-19
**Verdict:** APPROVED WITH COMMENTS

---

## Summary

The MVP requirements are well-structured, appropriately scoped, and technically feasible within the AWS serverless and $100/month cost constraints. The stateless, single-capability design (upload, analyze, visualize) is an excellent fit for a serverless architecture with scale-to-zero economics.

The most significant architectural insight is that **the entire MVP can run client-side** -- audio never needs to leave the user's browser. This eliminates the backend for the analysis path, reduces cost to near-zero, and simplifies the system dramatically. The only infrastructure needed is S3 + CloudFront for static file hosting.

I have no critical findings that would block approval. There are several warnings and informational items below, plus answers to the four open questions flagged for architecture review.

---

## Findings

### Critical

None.

### Warning

**W-1: The 30-second analysis target (AC-2.3) needs to account for execution environment.**
The 30-second budget for analyzing a 5-minute recording is achievable, but the requirement does not specify where analysis runs. If client-side (recommended -- see OQ-4), the 30-second target depends on the user's hardware, not our servers. If server-side on Lambda, cold starts of 3-8 seconds for a Python Lambda with audio libraries eat into the budget. Recommendation: keep the 30-second wall-clock target but reframe it as "analysis completes within 30 seconds on representative mid-range hardware (validated during QA with a defined reference device)." This makes the NFR testable regardless of where processing runs.

**W-2: The 10-minute maximum recording length (Should Have) needs a cost guard.**
A 10-minute WAV file at CD quality (44.1 kHz, 16-bit, mono) is approximately 50 MB, which coincidentally hits the file size limit. For client-side analysis this has no cost impact, but processing time scales linearly. The requirement should acknowledge that 10-minute recordings may take longer to analyze on lower-end hardware. For MVP with <10 users, this is fine as-is.

**W-3: M4A format support has a browser compatibility caveat.**
WAV and MP3 are decoded natively by `decodeAudioData()` in all target browsers. M4A (AAC in an MP4 container) is natively supported in Chrome, Safari, and Edge but **depends on the host operating system in Firefox**. On Windows and macOS, Firefox generally handles M4A through OS-provided decoders. On Linux, the user may need additional codec packages installed. For an MVP targeting <10 users, this is an acceptable risk -- but the application should detect decode failures gracefully and suggest the user convert to WAV or MP3. This is already partially covered by AC-4.2 (analysis failure messaging) but should explicitly mention format-specific guidance.

**W-4: No rate limiting or abuse prevention is specified.**
NFR 3.6 covers input validation and HTTPS but does not mention rate limiting. Even with a purely client-side architecture, if a backend is added later (or for any API endpoints), rate limiting is essential. For the static-site MVP, CloudFront provides basic DDoS protection via AWS Shield Standard (included at no cost). If API endpoints are introduced, API Gateway throttling should be configured. Suggest adding to NFR 3.6: "API endpoints (if any) must enforce rate limiting of no more than 10 requests per minute per source IP."

### Info

**I-1: "Transient" file storage (NFR 3.6) is a non-issue with client-side analysis.**
The requirement says uploaded files are "not stored beyond the duration of the analysis session." With client-side analysis, the audio file never leaves the user's browser -- it exists only in browser memory during processing. This satisfies the requirement automatically and provides a stronger privacy guarantee than any server-side approach. If a server-side path is added in the future, define a TTL (e.g., files deleted immediately after analysis, with S3 lifecycle rules as a safety net).

**I-2: The accessibility text alternative for the chart (NFR 3.4, Should Have) is feasible.**
Generating a summary like "Your pitch ranged from C3 to G4 over 2 minutes 30 seconds" is straightforward from the extracted pitch data. This is computationally trivial and adds meaningful accessibility value.

**I-3: The MoSCoW prioritization is well-calibrated.**
Moving drag-and-drop and hover/tap detail to Should Have is the right call -- they add polish but are not essential to the core value proposition. The Could Have items (animations, tablet optimization) are appropriately deferred.

**I-4: Browser support scope is appropriate.**
Targeting the latest 2 major versions of Chrome, Firefox, Safari, and Edge is standard practice. The Web Audio API and modern charting libraries support all of these. No concerns beyond the M4A/Firefox caveat noted in W-3.

**I-5: The stateless design is an architectural strength.**
No user accounts, no persistence, no session management -- this dramatically simplifies the architecture and aligns perfectly with Principles 1 (Simplicity First) and 5 (Scale-to-Zero). The entire application can be a static site with zero backend components.

---

## Open Questions: Architect Recommendations

### OQ-1: Pitch Detection Algorithm

**Recommendation: YIN algorithm, implemented client-side in JavaScript.**

Library options (in order of preference):

1. **`pitchfinder`** ([GitHub](https://github.com/peterkhayes/pitchfinder)) -- A pure JavaScript compilation of pitch detection algorithms (YIN, AMDF, Dynamic Wavelet, McLeod/MPM) ported from the TarsosDSP Java library. Works directly with `Float32Array` data from the Web Audio API. However, this library has a maintenance concern: the last release was over a year ago and it has a single maintainer. For MVP this is acceptable since the algorithms themselves are stable and well-understood, and the library has no external dependencies. If the library becomes unmaintained, the YIN algorithm is simple enough (~200 lines) to vendor or reimplement.

2. **`@dipscope/pitch-detector`** ([npm](https://www.npmjs.com/package/@dipscope/pitch-detector)) -- A newer TypeScript-native alternative with a more recent release cadence (last published ~6 months ago). Provides similar algorithms. Worth evaluating if `pitchfinder` causes issues.

**Why YIN:** YIN is the standard algorithm for monophonic vocal pitch detection, used in academic research and commercial pitch trackers. It offers the best balance of accuracy and speed for single-voice recordings, which is exactly our use case.

**Performance estimate:** A 5-minute recording at 44.1 kHz mono produces ~13.2 million samples. Processing in chunks of 2048 samples with YIN yields ~6,450 pitch estimates. On modern hardware, this completes in 2-5 seconds. Well within the 30-second budget.

**Future path:** If accuracy needs improve, we can swap to a WASM-based implementation (e.g., Rust `pitch-detection` crate compiled to WASM) without changing the architecture, since pitch detection sits behind a port/adapter boundary.

Alternatives considered and rejected:
- **Server-side Python (`crepe`, `librosa`)**: More accurate (especially `crepe`, which uses a neural network), but adds Lambda complexity, cold start latency, deployment package size, and cost. Overkill for MVP.
- **WASM from day one**: Higher performance but adds build complexity (Rust/C++ toolchain, WASM compilation). Not justified for <10 users.

### OQ-2: File Storage During Analysis

**Recommendation: No server-side file storage. Process entirely in the browser.**

Rationale:
- With client-side pitch analysis (see OQ-4), the audio file never leaves the user's browser. The file is read into an `AudioBuffer` via the Web Audio API, pitch data is extracted, and the visualization is rendered -- all locally.
- This eliminates S3 storage costs, Lambda processing costs, file upload bandwidth costs, and the transient-file-deletion concern entirely.
- This is the simplest architecture that meets the requirements (Principle 1) and the cheapest (Principle 5).
- Privacy is maximized -- audio data stays on the user's device.

Fallback (if server-side analysis is needed in the future):
- Upload to S3 with a presigned URL, process in Lambda, delete immediately after analysis. Use S3 lifecycle rules as a safety net (1-day expiration on the upload bucket). This is an additive change that does not break the existing client-side path.

### OQ-3: Chart Library Selection

**Recommendation: Chart.js (v4.x) for MVP, with a clean adapter boundary allowing future replacement.**

[Chart.js](https://www.chartjs.org/) (v4.5.1, MIT license, ~65k GitHub stars):
- Most widely used JavaScript charting library with massive community and excellent documentation. The epitome of "mainstream, well-documented, AI-agent friendly" (Principle 4).
- Supports line/scatter charts (which is what a pitch contour is), hover tooltips (AC-3.4), responsive sizing (AC-3.2), and has built-in accessibility support.
- Renders on Canvas, which handles thousands of data points efficiently.
- Y-axis can use custom tick callbacks to display note names (C3, D3, E3...). X-axis supports time-based formatting.
- Gaps in data (for silence/unvoiced regions, AC-3.3) are supported via `null` values in datasets with `spanGaps: false`.
- Small footprint: ~60 KB gzipped, well within any reasonable bundle budget.

Alternatives considered:
- **Plotly.js**: More powerful for scientific visualization but ~3.5 MB minified. Overkill for a single line chart. Violates Principle 1.
- **D3.js**: Maximum flexibility but steep learning curve, requires building charts from scratch. Not justified for MVP.
- **ECharts**: Good performance and accessibility, but larger bundle and less mainstream in the Western JavaScript ecosystem.

The charting library must sit behind an adapter interface so it can be swapped without touching business logic (Principle 7, ports-and-adapters).

### OQ-4: Client-Side vs. Server-Side Analysis

**Recommendation: Client-side analysis for MVP.** This is the most impactful architectural decision.

| Factor | Client-Side | Server-Side (Lambda) |
|--------|-------------|---------------------|
| **Cost** | Near $0 (static hosting only) | Lambda + API Gateway + S3 costs |
| **Latency** | No upload wait, no network round-trip | Upload time + cold start + processing |
| **Complexity** | Frontend only, no backend needed | Full backend: API Gateway, Lambda, S3, IAM |
| **Privacy** | Audio never leaves user's device | Audio uploaded to AWS |
| **Accuracy** | Limited to JS algorithms (YIN is sufficient for MVP) | Access to Python ML libraries (crepe) |
| **Browser compat** | Depends on Web Audio API (well-supported) | Universal (processing is server-side) |
| **Offline capable** | Possible in the future | Not possible |
| **Infrastructure** | S3 + CloudFront only | S3 + CloudFront + API Gateway + Lambda + IAM |

**For an MVP serving <10 users, client-side analysis is the clear winner:**
- Eliminates the entire backend for the analysis path.
- Monthly cost approaches $0 (CloudFront free tier covers 1 TB/month of transfer, S3 costs pennies for static files).
- The Web Audio API's `decodeAudioData()` handles WAV, MP3, and M4A decoding natively in all target browsers (with the Firefox/Linux M4A caveat noted in W-3).
- The YIN algorithm via `pitchfinder` processes a 5-minute recording in seconds on modern hardware.
- Architecture remains clean: pitch analysis is defined as a port, with the client-side implementation as an adapter. If we need server-side analysis later (for ML-based algorithms like CREPE), we swap the adapter without breaking changes.

**Risk mitigation:**
- If client-side performance is too slow on low-end hardware, we can add a server-side fallback behind the same interface. This is an additive, non-breaking change.
- The 30-second NFR target (AC-2.3) should be validated with a spike/benchmark early in implementation using a 5-minute recording on mid-range hardware.
- The M4A/Firefox/Linux caveat should be handled with graceful error messaging, not by dropping M4A support.

---

## Missing Requirements / Recommendations

**MR-1: Add rate-limiting language to NFR 3.6 (Security).**
Even with a purely static site for MVP, this sets the expectation for when API endpoints are added. Suggest adding: "API endpoints (if any) must enforce rate limiting of no more than 10 requests per minute per source IP."

**MR-2: Add a maximum recording duration validation.**
AC-4.3 validates recordings shorter than 1 second, but there is no corresponding validation for recordings exceeding the 10-minute maximum (Section 3.2). Suggest adding an acceptance criterion under US-4: "Given the user uploads a recording longer than 10 minutes, the system rejects it with a message stating the maximum duration." Note: duration validation requires decoding the file header or a brief decode pass, which is feasible client-side.

**MR-3: Add a JavaScript bundle size NFR.**
Since we are recommending client-side analysis, the JavaScript bundle size directly impacts initial page load (NFR 3.1, TTI < 3 seconds). Suggest adding to NFR 3.1: "Total JavaScript bundle size (gzipped) must not exceed 500 KB." This is easily achievable: Chart.js (~60 KB gzipped) + pitchfinder (~15 KB gzipped) + framework overhead leaves ample room.

**MR-4: Clarify the 30-second analysis target for client-side context.**
If analysis runs in the browser, the 30-second target depends on user hardware. Suggest rewording AC-2.3 to: "Given a recording of 5 minutes or less, when pitch analysis runs, then it completes within 30 seconds on representative mid-range hardware (defined as a device with at least a 2 GHz dual-core processor and 4 GB RAM, validated during QA)."

**MR-5: Add graceful handling for M4A decode failures.**
Per W-3, M4A decoding may fail on Firefox/Linux without OS codecs. Suggest adding guidance to AC-4.2: when a supported format fails to decode, the error message should suggest converting to WAV or MP3 as a workaround.

---

## Service Boundary Impact Assessment

The stateless, client-side-first architecture maps cleanly to service boundaries:

```
[Browser]
  |
  +-- FileValidation (port)      -- validates format, size, duration
  +-- AudioDecoder (port)        -- decodes audio to PCM samples (Web Audio API adapter)
  +-- PitchAnalyzer (port)       -- extracts pitch time-series (pitchfinder/YIN adapter)
  +-- Visualization (port)       -- renders pitch contour chart (Chart.js adapter)
```

All four services are client-side for MVP. Each is behind a port interface, so any can be moved server-side later without changing the others. This satisfies Principle 6 (Service-Oriented Design) and Principle 7 (Clean Architecture, dependencies point inward).

No backend services are required for MVP. Infrastructure is limited to:
- **S3 bucket** for static site hosting
- **CloudFront distribution** for HTTPS, caching, and basic DDoS protection (AWS Shield Standard)
- **Route 53** for DNS (optional for MVP -- CloudFront provides a default domain)

This is the simplest possible architecture that meets all Must Have requirements.

---

## NFR Completeness Assessment

| NFR Category | Status | Notes |
|-------------|--------|-------|
| Performance (3.1) | Adequate | Add bundle size budget (MR-3). Clarify 30-second target for client-side (MR-4). |
| File Constraints (3.2) | Adequate | Add max-duration validation (MR-2). |
| Browser Support (3.3) | Adequate | M4A/Firefox/Linux caveat is minor (W-3). |
| Accessibility (3.4) | Adequate | Well-specified. Chart text alternative is feasible. |
| Cost (3.5) | Adequate | Client-side architecture easily meets $0 idle and <$100/month. |
| Security (3.6) | Adequate | Add rate limiting language (MR-1). Add M4A fallback guidance (MR-5). |
| **Reliability** | **Missing** | No availability target or error recovery NFR. For MVP with <10 users, suggest: "The application should be available 99% of the time, excluding planned maintenance. CloudFront + S3 provides this by default." |
| **Observability** | **Missing** | No logging or monitoring NFR. For MVP, suggest: "Client-side errors should be logged to the browser console. No server-side logging required for MVP." Minimal -- but sets expectations. |

---

## Conclusion

The requirements are technically sound, well-prioritized, and feasible within constraints. The four open questions all point toward a **client-side-first architecture** that dramatically simplifies the system: static site on S3 + CloudFront, audio processing in the browser via Web Audio API + YIN pitch detection, visualization via Chart.js. Monthly cost will be pennies, not dollars.

I recommend the Product Owner incorporate the following before HC-1 approval:
1. **MR-2** (max duration validation) -- a gap in input validation
2. **MR-4** (clarify 30-second target) -- makes the NFR testable
3. **W-4 / MR-1** (rate limiting language) -- sets security expectations

The remaining items (MR-3, MR-5, missing reliability/observability NFRs) are informational and can be addressed during the design phase without blocking requirements approval.

---

## References

- [pitchfinder - JavaScript pitch detection algorithms](https://github.com/peterkhayes/pitchfinder)
- [@dipscope/pitch-detector - TypeScript pitch detection](https://www.npmjs.com/package/@dipscope/pitch-detector)
- [Chart.js - Simple yet flexible JavaScript charting (v4.5.1)](https://www.chartjs.org/)
- [Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Web Audio API browser support - Can I Use](https://caniuse.com/audio-api)
- [HTML5 Audio format support - Wikipedia](https://en.wikipedia.org/wiki/HTML5_audio)
- [AWS CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/)
- [AWS S3 pricing](https://aws.amazon.com/s3/pricing/)
