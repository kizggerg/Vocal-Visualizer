# MVP Test Plan: Pitch Contour Visualization

**Version:** 1.0 | **Date:** 2026-03-19 | **Status:** Draft

---

## 1. Acceptance Criteria Coverage

| AC ID | Happy Path | Edge Cases | Error Cases |
|-------|-----------|------------|-------------|
| AC-1.1 | Upload valid WAV/MP3/M4A under 50 MB; analysis starts | File exactly at 50 MB boundary | - |
| AC-1.2 | - | `.ogg`, `.flac`, `.txt`, no-extension file, `.mp3` with wrong MIME | Rejected with format error listing WAV/MP3/M4A |
| AC-1.3 | - | File at 50 MB, file at 50 MB + 1 byte | Rejected with size error message |
| AC-1.4 | Progress indicator visible during upload | Very small file (fast upload) | - |
| AC-1.5 | Drag valid file onto drop zone; upload starts | Drag multiple files (only first accepted or error); drag non-file (text/URL) | Invalid file type via drag shows format error |
| AC-1.6 | - | Recording at exactly 10 min; recording at 10:01 | Rejected with duration error |
| AC-2.1 | Analysis begins automatically after upload completes | - | - |
| AC-2.2 | "Analyzing..." status shown during processing | - | - |
| AC-2.3 | 5-min recording analyzes in < 30 s | 1-second recording; 10-min recording | - |
| AC-2.4 | Output contains Hz values mapped to note names | All-silence input yields all-null pitch series | - |
| AC-3.1 | Chart renders with note names on Y, time on X, pitch line | Single sustained note (flat line); wide pitch range (3+ octaves) | - |
| AC-3.2 | Chart >= 800 px wide on laptop | Browser at exactly 800 px viewport width | - |
| AC-3.3 | Silent regions show gaps, not false pitch | Recording with alternating voice/silence | - |
| AC-3.4 | Hover shows note name + time | Hover on gap/null region (no tooltip or "silence" label) | - |
| AC-3.5 | "Upload another" button works, resets state | Click during analysis (should not break) | - |
| AC-4.1 | - | - | Simulate network drop during upload; verify error + "Try Again" |
| AC-4.2a | - | - | Upload corrupted WAV (truncated header); verify error + upload-another option |
| AC-4.2b | - | - | Upload pure noise/silence; verify "no pitch found" message + upload-another option |
| AC-4.3 | - | Recording at exactly 1 s | Recording < 1 s rejected with message |
| AC-4.4 | - | - | Force errors at each stage (upload, decode, analysis, render); verify no blank screen |

---

## 2. NFR Tests

| NFR | Metric | Threshold | How to Measure |
|-----|--------|-----------|----------------|
| Bundle size | Gzipped JS transferred | < 500 KB | `npm run build` then check dist output size; CI gate |
| Analysis time | Wall clock for 5-min WAV | < 30 s | Performance.now() in automated test on mid-range hardware profile |
| Render time | Analysis complete to chart visible | < 2 s | Performance mark/measure in component test |
| TTI | Page load to interactive | < 3 s | Lighthouse CI audit (simulated throttling) |
| WCAG AA contrast | All text/UI elements | 4.5:1 normal, 3:1 large | axe-core automated check |
| Keyboard nav | All interactive elements | Fully operable | Manual tab-through + automated axe check |
| Screen reader | Error messages announced | ARIA live regions present | axe-core + manual NVDA/VoiceOver spot check |
| Chart text alt | Summary of pitch range/duration | Present and accurate | Unit test on Visualization port output |

---

## 3. Security Tests

| SR ID | What to Verify | Test Method |
|-------|---------------|-------------|
| SR-200 | HTTP redirects to HTTPS; HSTS header present (max-age >= 31536000) | curl against deployed URL |
| SR-201 | S3 bucket blocks public access; only CloudFront OAC can read | AWS CLI check + direct S3 URL returns 403 |
| SR-202 | `npm audit --production` fails build on CVSS >= 7.0 | CI pipeline test (introduce known vuln, verify failure) |
| SR-203 | CSP header present with `connect-src 'none'` | curl response headers; CSP evaluator tool |
| SR-204 | `package-lock.json` committed; CI uses `npm ci` | Verify CI workflow YAML; delete lock file and verify CI fails |
| SR-205 | No source maps in prod build; no console.log leakage; errors hide stack traces | Build output inspection; trigger error and inspect DOM |
| SR-206 | Client validates size, duration, extension, MIME before decode | Unit tests on FileValidator with crafted inputs |
| SR-207 | No external CDN script tags (or SRI present if used) | grep dist HTML for `<script src="http`; verify SRI attributes |
| SR-208 | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` headers present | curl response headers |

---

## 4. Test Fixtures Needed

- **Valid audio:** short WAV (3 s), MP3 (30 s), M4A (1 min) with clear vocal pitch
- **Boundary audio:** exactly 1 s recording, exactly 10 min recording, file at exactly 50 MB
- **Invalid files:** `.ogg` audio, `.txt` file renamed to `.mp3`, truncated/corrupted WAV, 0-byte file
- **Pitch-edge audio:** pure silence WAV, white noise WAV, single sustained note (A4 440 Hz sine wave)
- **Large file:** valid WAV at 50 MB + 1 byte
- **5-minute vocal recording:** for performance benchmarking (AC-2.3)

---

## 5. Testing Approach

**Unit tests (many):** Cover all four port interfaces (FileValidator, AudioDecoder, PitchAnalyzer, Visualization) with mocked dependencies. Test validation logic exhaustively (format, size, duration, boundary values). Test pitch-to-note mapping, chart data transformation, and error type handling. These run on every commit.

**Component tests (some):** React component tests using Testing Library for the upload area (file picker, drag-and-drop, progress), status display, chart rendering (mock chart data), and error states. Verify ARIA attributes and keyboard interactions.

**Integration tests (few):** End-to-end flow from file input through real adapters to chart render, using small fixture files. Verify the full pipeline produces a valid chart. Run in CI on each PR.

**Manual tests:** Lighthouse audit for TTI/bundle, cross-browser spot check (Chrome, Firefox, Safari, Edge), screen reader walkthrough, deployed security header verification, and visual review of chart readability.
