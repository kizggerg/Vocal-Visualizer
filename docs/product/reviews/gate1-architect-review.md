# Gate 1: Architect Review of MVP Requirements

**Document Reviewed:** `docs/product/mvp-requirements.md` v1.0
**Reviewer:** Architect
**Date:** 2026-03-19
**Verdict:** APPROVED WITH COMMENTS

---

## Summary

The MVP requirements are well-structured, appropriately scoped, and technically feasible within the AWS serverless and $100/month cost constraints. The stateless, single-capability design (upload, analyze, visualize) is an excellent fit for a serverless architecture with scale-to-zero economics.

I have no critical findings that would block approval. There are several warnings and informational items below, plus answers to the four open questions flagged for architecture review.

---

## Findings

### Critical

None.

### Warning

**W-1: The 30-second analysis target (AC-2.3) needs to account for cold starts.**
The 30-second budget for analyzing a 5-minute recording is achievable, but the requirement does not mention Lambda cold start time. A Python Lambda with audio processing libraries (numpy, scipy, or similar) can have cold starts of 3-8 seconds. The 30-second target should be defined as wall-clock time inclusive of cold start, or the requirement should state that cold start time is excluded and measured separately. My recommendation: keep the 30-second wall-clock target as-is (inclusive of cold start) -- it is still achievable with provisioned concurrency disabled, as long as we use a lightweight pitch detection approach. If we go client-side (see Open Question 4 below), this concern disappears entirely.

**W-2: The 10-minute maximum recording length (Should Have) needs a cost guard.**
A 10-minute WAV file at CD quality (44.1 kHz, 16-bit, mono) is approximately 50 MB, which coincidentally hits the file size limit. However, if analysis runs server-side, processing 10 minutes of audio on Lambda at 1024 MB memory could cost roughly $0.01-0.02 per invocation. With fewer than 10 users this is negligible, but the requirement should acknowledge that extending to 10 minutes has cost implications if the system scales. For MVP with <10 users, this is fine as-is.

**W-3: M4A format support adds decoding complexity.**
WAV is trivially parseable. MP3 has well-supported decoders everywhere. M4A (AAC in an MP4 container) requires a more capable decoder. If analysis is client-side, the Web Audio API handles all three formats natively via `AudioContext.decodeAudioData()`, so this is a non-issue. If analysis is server-side, we need ffmpeg or a similar library in the Lambda environment, which increases deployment package size. Recommendation: keep M4A in scope -- the Web Audio API handles it transparently if we go client-side, and ffmpeg Lambda layers exist for server-side.

**W-4: No rate limiting or abuse prevention is specified.**
NFR 3.6 covers input validation and HTTPS but does not mention rate limiting. Without authentication, the API is open to the internet. Even for an MVP with <10 users, a basic rate limit (e.g., 10 uploads per minute per IP) should be a Must Have to prevent abuse and cost overruns. API Gateway provides built-in throttling that is trivial to configure.

### Info

**I-1: "Transient" file storage (NFR 3.6) needs a defined retention period.**
The requirement says uploaded files are "not stored beyond the duration of the analysis session." If analysis is client-side, no server storage is needed at all. If server-side, we should define a TTL (e.g., files are deleted within 5 minutes of analysis completion, or immediately after). S3 lifecycle rules or simply not persisting to S3 at all would satisfy this.

**I-2: The accessibility text alternative for the chart (NFR 3.4, Should Have) is well-placed.**
Providing a summary like "Your pitch ranged from C3 to G4 over 2 minutes 30 seconds" is straightforward to generate from the pitch data and is a good accessibility practice. Confirmed feasible.

**I-3: The MoSCoW prioritization is well-calibrated.**
Moving drag-and-drop and hover/tap detail to Should Have is the right call -- they add polish but are not essential to the core value proposition. The Could Have items (animations, tablet optimization) are appropriately deferred.

**I-4: Browser support scope is appropriate.**
Targeting the latest 2 major versions of Chrome, Firefox, Safari, and Edge is standard practice. The Web Audio API and modern charting libraries support all of these. No concerns.

**I-5: The stateless design is an architectural strength.**
No user accounts, no persistence, no session management -- this dramatically simplifies the architecture and aligns perfectly with Principles 1 (Simplicity First) and 5 (Scale-to-Zero). The entire backend could be a single Lambda function behind API Gateway, or potentially no backend at all if analysis runs client-side.

---

## Open Questions: Architect Recommendations

### OQ-1: Pitch Detection Algorithm

**Recommendation: YIN algorithm via the `pitchfinder` JavaScript library (client-side).**

Rationale:
- The [pitchfinder](https://github.com/peterkhayes/pitchfinder) library is a pure JavaScript compilation of pitch detection algorithms ported from the well-regarded TarsosDSP Java library. It includes YIN, AMDF, and Dynamic Wavelet algorithms.
- **YIN** offers the best balance of accuracy and speed for vocal pitch detection. It is the standard algorithm used in academic and commercial pitch trackers.
- `pitchfinder` works directly with `Float32Array` data from the Web Audio API's `AudioBuffer`, making integration straightforward.
- For MVP with <10 users, pure JavaScript performance is sufficient -- we do not need WebAssembly. A 5-minute recording at 44.1 kHz mono produces ~13.2 million samples. Processing in chunks of 2048 samples with YIN yields ~6,450 pitch estimates. On modern hardware, this completes in seconds.
- If performance becomes a concern in the future, we can swap to a WASM-based implementation (e.g., [pitchlite](https://github.com/sevagh/pitchlite)) without changing the architecture, since the pitch detection is behind a port/adapter boundary.

Alternative considered:
- **Server-side with Python `crepe` or `librosa`**: More accurate (especially `crepe`, which uses a neural network), but adds Lambda complexity, cold start latency, and server cost. Overkill for MVP.
- **WASM-based (pitchlite, Rust pitch-detection)**: Higher performance but adds build complexity (Rust/C++ toolchain, WASM compilation). Not justified for <10 users and offline file analysis.

### OQ-2: File Storage During Analysis

**Recommendation: No server-side file storage. Process entirely in the browser.**

Rationale:
- If pitch analysis runs client-side (see OQ-4), the audio file never leaves the user's browser. The file is read into an `AudioBuffer` via the Web Audio API, pitch data is extracted, and the visualization is rendered -- all locally.
- This eliminates S3 storage, Lambda processing, file upload bandwidth costs, and the transient-file-deletion concern entirely.
- This is the simplest architecture that meets the requirements (Principle 1) and the cheapest (Principle 5).

Fallback (if server-side analysis is needed in the future):
- Upload to S3 with a presigned URL, process in Lambda, delete immediately after analysis. Use S3 lifecycle rules as a safety net (1-day expiration on the upload bucket).

### OQ-3: Chart Library Selection

**Recommendation: Chart.js for MVP, with a clean adapter boundary allowing future replacement.**

Rationale:
- [Chart.js](https://www.chartjs.org/) is the most widely used JavaScript charting library (~65k GitHub stars, massive community, excellent documentation). It is the epitome of "mainstream, well-documented, AI-agent friendly" (Principle 4).
- It supports line charts (which is what a pitch contour is -- a line/scatter plot), hover tooltips (AC-3.4), responsive sizing (AC-3.2), and has built-in ARIA support for accessibility (NFR 3.4).
- It renders on Canvas, which handles thousands of data points efficiently.
- The Y-axis can be configured with custom tick labels (note names), and the X-axis with time formatting.
- Gaps in data (for silence/unvoiced regions, AC-3.3) are supported via `null` values in datasets with `spanGaps: false`.

Alternatives considered:
- **Plotly.js**: More powerful for scientific visualization but significantly larger bundle size (~3.5 MB minified vs ~200 KB for Chart.js). Overkill for a single line chart. Violates Principle 1.
- **D3.js**: Maximum flexibility but steep learning curve and requires building everything from scratch. Not justified for MVP.
- **ECharts**: Strong accessibility features and good performance, but less mainstream in the Western JS ecosystem and larger bundle. A reasonable alternative if Chart.js proves limiting.
- **Victory (React)**: Locks us into React before we have made a frontend framework decision. Premature.

The charting library should sit behind an adapter interface so it can be swapped without touching business logic (Principle 7, ports-and-adapters).

### OQ-4: Client-Side vs. Server-Side Analysis

**Recommendation: Client-side analysis for MVP.**

This is the most impactful architectural decision for the MVP. Here is the trade-off analysis:

| Factor | Client-Side | Server-Side (Lambda) |
|--------|-------------|---------------------|
| **Cost** | Near $0 (static hosting only) | Lambda + API Gateway + S3 costs |
| **Latency** | No upload wait, no network round-trip | Upload time + cold start + processing |
| **Complexity** | Frontend only, no backend | Full backend: API Gateway, Lambda, S3, IAM |
| **Privacy** | Audio never leaves user's device | Audio uploaded to AWS |
| **Scalability** | Scales with user count at zero cost | Scales with Lambda concurrency |
| **Accuracy** | Limited to JS/WASM algorithms | Access to Python ML libraries (crepe, etc.) |
| **Browser compat** | Depends on Web Audio API (well-supported) | Universal (processing is server-side) |
| **Offline support** | Possible in the future | Not possible |

**For an MVP serving <10 users, client-side analysis is the clear winner:**
- It eliminates the entire backend for the analysis path. The only infrastructure needed is S3 + CloudFront for hosting the static frontend.
- Monthly cost approaches $0 (CloudFront free tier covers 1 TB/month of transfer).
- The Web Audio API's `decodeAudioData()` handles WAV, MP3, and M4A decoding natively in all target browsers.
- The `pitchfinder` library with YIN processes a 5-minute recording in seconds on modern hardware.
- Privacy is maximized -- audio data never leaves the user's device.
- Architecture remains clean: the pitch analysis service is defined as a port, with the client-side implementation as an adapter. If we need server-side analysis later (for ML-based algorithms), we swap the adapter.

**Risk mitigation:**
- If client-side performance is too slow on low-end hardware, we can add a server-side fallback path behind the same interface. This is an additive change, not a breaking one.
- The 30-second NFR target (AC-2.3) should be validated with a spike/benchmark early in implementation using a 5-minute recording on mid-range hardware.

---

## Missing Requirements / Recommendations

**MR-1: Add a rate-limiting requirement to NFR 3.6 (Security).**
Even without a backend for analysis, the static site could be fronted by CloudFront. If a backend is added later, API Gateway throttling should be specified. Suggest adding: "API endpoints (if any) must enforce rate limiting of no more than 10 requests per minute per source IP."

**MR-2: Add a maximum recording duration validation (client-side).**
AC-4.3 validates recordings shorter than 1 second, but there is no corresponding validation for recordings exceeding the 10-minute maximum (Section 3.2). Suggest adding an acceptance criterion: "Given the user uploads a recording longer than 10 minutes, the system rejects it with a message stating the maximum duration."

**MR-3: Consider adding a brief NFR for bundle size.**
Since we are recommending client-side analysis, the JavaScript bundle size directly impacts initial page load (NFR 3.1, TTI < 3 seconds). Suggest adding: "Total JavaScript bundle size (gzipped) must not exceed 500 KB." This is achievable with Chart.js (~60 KB gzipped) + pitchfinder (~15 KB gzipped) + framework overhead.

**MR-4: Clarify what "analysis completes within 30 seconds" means in a client-side context.**
If analysis runs in the browser, the 30-second target depends on the user's hardware, not our servers. The requirement should state the reference hardware (e.g., "on a device with at least a 2 GHz dual-core processor and 4 GB RAM") or reframe as "analysis completes within 30 seconds on representative mid-range hardware (validated during QA)."

---

## Service Boundary Impact Assessment

The stateless, client-side-first architecture maps cleanly to service boundaries:

```
[Browser]
  |
  +-- Upload Service (port)        -- reads file, validates format/size/duration
  +-- Audio Decoder Service (port) -- decodes audio to PCM samples (Web Audio API adapter)
  +-- Pitch Analysis Service (port)-- extracts pitch time-series (pitchfinder/YIN adapter)
  +-- Visualization Service (port) -- renders pitch contour chart (Chart.js adapter)
```

All four services are client-side for MVP. Each is behind a port interface, so any can be moved server-side later without changing the others. This satisfies Principle 6 (Service-Oriented Design) and Principle 7 (Clean Architecture, dependencies point inward).

No backend services are required for MVP. Infrastructure is limited to:
- S3 bucket for static hosting
- CloudFront distribution for HTTPS and caching
- Route 53 for DNS (optional for MVP)

This is the simplest possible architecture that meets all Must Have requirements.

---

## Conclusion

The requirements are technically sound, well-prioritized, and feasible within constraints. The four open questions all point toward a client-side-first architecture that dramatically simplifies the system while meeting every Must Have requirement. The warnings above are minor and can be addressed with small additions to the requirements document before HC-1 approval.

I recommend the Product Owner incorporate findings W-4, MR-2, and MR-4 before the human checkpoint, as they address gaps in validation and security that are quick to fix now.

---

## References

- [pitchfinder - JavaScript pitch detection algorithms](https://github.com/peterkhayes/pitchfinder)
- [pitchlite - WASM pitch detection with AudioWorklet](https://github.com/sevagh/pitchlite)
- [WASM vs JS pitch detection performance comparison](https://github.com/bojan88/WASM-vs-JS-Pitch-detector)
- [Chart.js - Simple yet flexible JavaScript charting](https://www.chartjs.org/)
- [AWS Lambda quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- [Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Rust/WASM pitch detection tutorial (Toptal)](https://www.toptal.com/developers/webassembly/webassembly-rust-tutorial-web-audio)
