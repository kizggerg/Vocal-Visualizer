# MVP Requirements: Pitch Contour Visualization

**Version:** 1.1
**Date:** 2026-03-19
**Status:** Draft -- Awaiting HC-1 Approval (updated per Gate 1 reconciliation)

---

## 1. Feature Overview

The MVP delivers a single capability: a user uploads a vocal recording and receives a pitch contour visualization showing musical notes (Y-axis) over time (X-axis). This gives beginner vocalists objective, visual feedback on their pitch accuracy during a singing session.

There are no user accounts, no saved history, and no reference track comparison. The user uploads, views the result, and can upload again. The system is stateless from the user's perspective.

---

## 2. User Stories

### US-1: Upload a Vocal Recording

**As a** beginner vocalist,
**I want** to upload an audio recording of my singing,
**So that** I can have it analyzed for pitch.

#### Acceptance Criteria

**AC-1.1: Successful upload**
Given the user is on the upload page,
When they select a valid audio file (WAV, MP3, or M4A) under 50 MB,
Then the file is uploaded and the system begins pitch analysis automatically.

**AC-1.2: File format validation**
Given the user selects a file that is not WAV, MP3, or M4A,
When they attempt to upload,
Then the system rejects the file before upload and displays a message listing the supported formats.

**AC-1.3: File size validation**
Given the user selects a valid audio file larger than 50 MB,
When they attempt to upload,
Then the system rejects the file before upload and displays a message stating the maximum file size.

**AC-1.4: Upload progress indication**
Given the user has selected a valid file and upload has started,
When the upload is in progress,
Then the system displays a progress indicator (e.g., progress bar or spinner with percentage).

**AC-1.5: Drag-and-drop upload**
Given the user is on the upload page,
When they drag a valid audio file onto the upload area,
Then the file is accepted and upload begins, behaving identically to file selection.

**AC-1.6: Recording duration validation**
Given the user uploads a recording longer than 10 minutes,
When validation runs,
Then the system rejects it with a message stating the maximum recording duration.

---

### US-2: Pitch Analysis Processing

**As a** beginner vocalist,
**I want** the system to automatically analyze the pitch in my recording after upload,
**So that** I do not have to take any additional steps to get my results.

#### Acceptance Criteria

**AC-2.1: Automatic analysis trigger**
Given a recording has been successfully uploaded,
When the upload completes,
Then pitch analysis begins automatically without further user action.

**AC-2.2: Processing status feedback**
Given pitch analysis is in progress,
When the user is waiting,
Then the system displays a clear indication that analysis is underway (e.g., "Analyzing your recording...").

**AC-2.3: Analysis completes within time budget**
Given a recording of 5 minutes or less,
When pitch analysis runs,
Then it completes within 30 seconds.

**AC-2.4: Pitch data extraction**
Given a vocal recording is analyzed,
When analysis completes,
Then the system produces a time-series of pitch values (frequency in Hz, mapped to musical notes) suitable for rendering a contour.

---

### US-3: View Pitch Contour Visualization

**As a** beginner vocalist,
**I want** to see a pitch contour map of my recording,
**So that** I can understand how my pitch varied over time and identify areas to improve.

#### Acceptance Criteria

**AC-3.1: Contour display**
Given pitch analysis has completed successfully,
When the results are ready,
Then the system renders a pitch contour chart with:
- Y-axis labeled with musical note names (e.g., C3, D3, E3...)
- X-axis labeled with time (seconds or minutes:seconds)
- A continuous or near-continuous line/scatter showing detected pitch over time

**AC-3.2: Readable at a glance**
Given the contour is displayed,
When the user views it,
Then the chart is large enough to read without zooming on a standard laptop screen (minimum 800px wide rendering area).

**AC-3.3: Silence and unvoiced regions**
Given portions of the recording contain silence or non-pitched sound,
When the contour is rendered,
Then those regions show gaps (no data points) rather than misleading pitch values.

**AC-3.4: Hover/tap detail**
Given the contour is displayed,
When the user hovers over (or taps on tablet) a point on the contour,
Then the system shows the specific note name and time at that point.

**AC-3.5: New upload option**
Given the user is viewing a contour,
When they want to analyze another recording,
Then there is a clear way to start a new upload without refreshing the page.

---

### US-4: Error Handling

**As a** beginner vocalist,
**I want** clear feedback when something goes wrong,
**So that** I know what happened and what I can do about it.

#### Acceptance Criteria

**AC-4.1: Upload failure**
Given the network connection drops or the server returns an error during upload,
When the upload fails,
Then the system displays a user-friendly error message and offers a "Try Again" action.

**AC-4.2a: Corrupted or undecodable audio**
Given the uploaded file cannot be decoded (e.g., corrupted file, truncated data),
When decoding fails,
Then the system displays a message explaining the file could not be read (e.g., "This file appears to be corrupted. Please try a different file.") and offers a way to upload a different file.

**AC-4.2b: No detectable pitch**
Given the audio decodes successfully but contains no detectable pitched content (e.g., applause, noise, silence),
When pitch analysis completes with no results,
Then the system displays a message explaining no pitch was found (e.g., "We couldn't detect pitch in this recording. Try a clearer vocal recording without background music.") and offers a way to upload a different file.

**AC-4.3: Empty or very short recording**
Given the user uploads a recording shorter than 1 second,
When validation runs,
Then the system rejects it with a message suggesting a longer recording.

**AC-4.4: No silent failure**
Given any error occurs during upload, analysis, or rendering,
When the error happens,
Then the user is never left on a screen with no feedback -- there is always a message and a next action.

---

## 3. Non-Functional Requirements

### 3.1 Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Pitch analysis time (5-minute recording) | < 30 seconds | Client-side processing on representative mid-range hardware (2 GHz dual-core, 4 GB RAM) |
| Visualization render time | < 2 seconds | Time from analysis completion to chart visible in browser |
| Page initial load (Time to Interactive) | < 3 seconds | On a broadband connection |
| JavaScript bundle size (gzipped) | < 500 KB | Total transferred JS including dependencies |

### 3.2 File Constraints

| Constraint | Value |
|------------|-------|
| Maximum file size | 50 MB |
| Supported formats | WAV, MP3, M4A |
| Minimum recording length | 1 second |
| Maximum recording length | 10 minutes |

### 3.3 Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | Latest 2 major versions |
| Firefox | Latest 2 major versions |
| Safari | Latest 2 major versions |
| Edge | Latest 2 major versions |

Mobile browsers are not a target but should not be actively broken.

### 3.4 Accessibility

- All interactive elements must be keyboard-navigable
- Color choices must meet WCAG 2.1 AA contrast ratios
- Chart must have a text alternative (e.g., summary of pitch range and duration)
- Error messages must be announced to screen readers (ARIA live regions)

### 3.5 Cost

- Monthly AWS cost must not exceed $100 in production usage
- When idle (no uploads), cost must approach $0
- No always-on compute (serverless or scale-to-zero only)

### 3.6 Security

- Uploaded files must be validated (format, size, content-type) before processing
- Uploaded files are transient -- processed in the browser and not persisted or transmitted to a server
- No user authentication required for MVP
- All traffic over HTTPS
- Error messages shown to users must not expose stack traces or implementation details

---

## 4. MoSCoW Prioritization

### Must Have

- Upload a single audio file (WAV, MP3, M4A) via file picker (AC-1.1)
- File format, size, and duration validation (AC-1.2, AC-1.3, AC-1.6, NFR 3.6)
- Automatic pitch analysis after upload (AC-2.1)
- Processing status feedback (AC-2.2)
- Pitch contour chart with note names on Y-axis and time on X-axis (AC-3.1)
- Silence/unvoiced gap handling (AC-3.3)
- Error messages for upload failures, analysis failures, and invalid files (AC-4.1, AC-4.2a, AC-4.2b, AC-4.3, AC-4.4)
- Analysis completes within 30 seconds for recordings up to 5 minutes (AC-2.3)
- HTTPS everywhere (NFR 3.6)
- Keyboard navigability and WCAG AA contrast (NFR 3.4)
- Cost within $100/month ceiling, near-$0 idle (NFR 3.5)

### Should Have

- Upload progress indicator (AC-1.4)
- Hover/tap detail on contour points (AC-3.4)
- Drag-and-drop upload (AC-1.5)
- "Upload another" action from the results view (AC-3.5)
- Text alternative for the chart (NFR 3.4)
- Recordings up to 10 minutes (extended from 5-minute baseline)

### Could Have

- Visual styling that is "visually pleasing" beyond functional (referenced in product brief)
- Smooth animated transition from upload to analysis to results
- Responsive layout optimized for tablet screen sizes

### Won't Have (for MVP)

- Saved recordings or recording history
- Additional visualizations (onset, sustain, tone, vibrato)
- Reference track comparison or overlay
- User accounts or authentication
- Mobile-specific design
- Multi-user features or sharing
- Real-time recording (microphone capture)
- Export or download of visualization
- Playback of the uploaded recording synced to the contour

---

## 5. Explicitly Out of Scope

Per the product brief, the following are out of scope for the MVP:

1. **Saved recordings / recording history** -- no persistence between sessions
2. **Additional visualizations** -- only pitch contour; no onset, sustain, tone, vibrato, etc.
3. **Reference track comparison** -- no overlay of intended pitch or backing track
4. **User accounts / authentication** -- the application is open-access for the prototype
5. **Mobile-specific design** -- responsive web only; no native apps or mobile-optimized layouts
6. **Multi-user features** -- no sharing, collaboration, or social features
7. **Real-time recording** -- users must upload a pre-recorded file; no in-browser microphone capture

---

## 6. Open Questions for Architecture / Design Review

1. **Pitch detection algorithm** -- Which library or service should perform pitch extraction? (Flag for Architect)
2. **File storage during analysis** -- Should uploaded files be held in memory, written to temp disk, or stored in S3 transiently? (Flag for Architect)
3. **Chart library selection** -- Which charting library best supports the contour visualization with hover interaction and accessibility? (Flag for Architect/Designer)
4. **Client-side vs. server-side analysis** -- Could pitch analysis run entirely in the browser (e.g., via WebAssembly) to reduce backend cost and latency? (Flag for Architect)

---

## Review Checklist (Gate 1: Trust-But-Verify)

- [ ] **Architect** -- Confirm NFR targets are technically feasible within cost constraints
- [ ] **QA Engineer** -- Confirm acceptance criteria are testable and unambiguous
- [ ] **Security Engineer** -- Confirm security requirements are sufficient for the threat surface
- [ ] **Human** -- Approve requirements before proceeding to design/architecture
