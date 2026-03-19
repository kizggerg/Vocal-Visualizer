# MVP User Flow: Pitch Contour Visualization

**Version:** 1.0
**Date:** 2026-03-19
**Author:** Designer
**Status:** Draft -- Awaiting Phase 2 review

---

## Overview

The MVP is a single-page application with three primary states: Upload, Processing, and Results. The user never navigates away from the page. State transitions happen in-place. All processing is client-side -- no network requests after the initial page load.

---

## Flow Diagram

```
                         +------------------+
                         |   Page Load      |
                         |  (Static site)   |
                         +--------+---------+
                                  |
                                  v
                    +-------------------------+
                    |     UPLOAD STATE        |
                    |                         |
                    |  - Drag-and-drop zone   |
                    |  - File picker button   |
                    |  - Format/size hints    |
                    +--------+----------------+
                             |
                   User selects or drops a file
                             |
                             v
                    +-------------------------+
                    |  CLIENT-SIDE VALIDATION |
                    |                         |
                    |  1. File extension      |
                    |  2. File size (<=50MB)  |
                    +--------+----------------+
                             |
                +------------+------------+
                |                         |
           Validation PASS           Validation FAIL
                |                         |
                v                         v
    +---------------------+    +---------------------+
    |  PROCESSING STATE   |    |  INLINE ERROR       |
    |                     |    |  (on upload screen)  |
    |  "Analyzing your    |    |                     |
    |   recording..."     |    |  - Wrong format     |
    |                     |    |    (AC-1.2)         |
    |  Progress indicator |    |  - Too large        |
    +--------+------------+    |    (AC-1.3)         |
             |                 +----------+----------+
             |                            |
     +-------+-------+            User picks new file
     |               |                    |
  Decode OK     Decode FAIL        (returns to Upload)
     |               |
     v               v
+-----------+  +---------------------+
| Duration  |  | ERROR: CORRUPT FILE |
| check     |  | (AC-4.2a)           |
+-----+-----+  | "This file appears  |
      |         |  to be corrupted."  |
  +---+---+     | [Upload Another]    |
  |       |     +---------------------+
 OK      FAIL
  |       |
  |       v
  |  +---------------------+
  |  | ERROR: DURATION     |
  |  | Too short (AC-4.3)  |
  |  | Too long (AC-1.6)   |
  |  | [Upload Another]    |
  |  +---------------------+
  |
  v
+--------------------------+
|  PITCH ANALYSIS          |
|  (runs in browser)       |
+--------+-----------------+
         |
    +----+----+
    |         |
 Pitch     No pitch
 found     detected
    |         |
    v         v
+------------------+  +------------------------+
|  RESULTS STATE   |  | ERROR: NO PITCH        |
|                  |  | (AC-4.2b)              |
|  - Pitch contour |  | "We couldn't detect    |
|    chart         |  |  pitch in this          |
|  - Hover detail  |  |  recording."            |
|  - Text summary  |  | [Upload Another]        |
|  - [Upload       |  +------------------------+
|    Another]      |
+--------+---------+
         |
   User clicks
  "Upload Another"
         |
         v
   (returns to UPLOAD STATE --
    chart is cleared, page
    resets to initial state)
```

---

## State Descriptions

### State 1: Upload

**Entry condition:** Page load, or user clicks "Upload Another" from any subsequent state.

**What the user sees:**
- Application title and brief tagline
- A prominent drop zone area with dashed border
- A "Choose File" button inside the drop zone
- Hint text below: supported formats (WAV, MP3, M4A), max size (50 MB), max duration (10 minutes)

**User actions:**
- Click the file picker button to open the OS file dialog
- Drag a file onto the drop zone
- (Keyboard: Tab to the file picker button, press Enter/Space)

**Exit conditions:**
- File selected or dropped -> validation runs immediately
- If validation passes -> transition to Processing state
- If validation fails -> inline error on Upload screen (user stays here)

### State 2: Processing

**Entry condition:** A valid file has been selected and passed format/size validation.

**What the user sees:**
- The upload zone is replaced by a processing indicator
- Text: "Analyzing your recording..."
- An indeterminate progress spinner (we cannot reliably estimate percentage for client-side audio decoding + pitch analysis)
- The file name is displayed so the user knows which file is being processed

**User actions:**
- Wait. There is no cancel action in the MVP (Could Have, deferred).

**Exit conditions:**
- Decode failure -> Error state (AC-4.2a)
- Duration out of range (after decode reveals actual duration) -> Error state (AC-4.3 or AC-1.6)
- Pitch analysis returns no data -> Error state (AC-4.2b)
- Pitch analysis succeeds -> Results state

**Performance target:** Less than 30 seconds for recordings up to 5 minutes (AC-2.3).

### State 3: Results

**Entry condition:** Pitch analysis completed successfully with detected pitch data.

**What the user sees:**
- A pitch contour chart filling the main content area
  - Y-axis: musical note names (e.g., C3, D3, E3)
  - X-axis: time in seconds or mm:ss
  - Line/scatter plot of detected pitch over time
  - Gaps where silence or unvoiced regions occur (AC-3.3)
- On hover (desktop) or tap (tablet): tooltip showing exact note name and timestamp (AC-3.4)
- A text summary below the chart: detected pitch range, recording duration, percentage of voiced frames (NFR 3.4 text alternative)
- An "Upload Another" button prominently placed

**User actions:**
- Hover over chart points to see details
- Click "Upload Another" to reset to Upload state
- (Keyboard: Tab to "Upload Another" button)

**Exit conditions:**
- User clicks "Upload Another" -> return to Upload state (chart is cleared from memory)

### State 4: Error States

All error states share a common layout:
- An error icon (distinct from the processing spinner)
- A plain-language error message (no technical details per NFR 3.6)
- A specific suggestion for what to do next
- An "Upload Another File" button to return to Upload state

**Error variants:**

| ID | Trigger | Message | AC |
|----|---------|---------|-----|
| E1 | File extension not WAV/MP3/M4A | "Unsupported file format. Please upload a WAV, MP3, or M4A file." | AC-1.2 |
| E2 | File size exceeds 50 MB | "This file is too large. The maximum file size is 50 MB." | AC-1.3 |
| E3 | Recording shorter than 1 second | "This recording is too short. Please upload a recording that is at least 1 second long." | AC-4.3 |
| E4 | Recording longer than 10 minutes | "This recording is too long. The maximum duration is 10 minutes." | AC-1.6 |
| E5 | File cannot be decoded | "This file could not be read. It may be corrupted or in an unsupported encoding. Please try a different file." | AC-4.2a |
| E6 | No pitch detected | "We could not detect any pitch in this recording. Try a clearer vocal recording without background music." | AC-4.2b |

**Error display behavior:**
- E1 and E2 appear inline on the Upload screen (validation happens before processing starts)
- E3, E4, E5, and E6 appear as a full-state replacement of the Processing screen (these are discovered during or after decode/analysis)
- All errors are announced to screen readers via ARIA live regions (NFR 3.4)

---

## "Upload Another" Flow

From any post-upload state (Results or any error state after processing), the user can click "Upload Another" to return to the Upload state. This:

1. Clears the current chart (if any) from the DOM
2. Releases the audio data from memory (the file was never persisted anywhere)
3. Resets the UI to the initial Upload state
4. Does NOT reload the page (SPA state transition)

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| User drops multiple files | Accept only the first file. Ignore others. |
| User drops a folder | Treat as invalid file (E1 error). |
| User selects a file then selects another before processing finishes | Not handled in MVP. The processing spinner blocks interaction. Defer cancel functionality. |
| Browser tab loses focus during processing | Processing continues in background. Results display when user returns. |
| JavaScript disabled | The page will not function. No special handling for MVP. |

---

## Accessibility Flow Notes

- The entire flow is navigable by keyboard: Tab moves between the file picker button and "Upload Another" button. Enter/Space activates buttons.
- State transitions are announced via ARIA live regions so screen reader users know when processing starts, ends, or fails.
- The chart includes a text alternative summary (pitch range, duration, voiced percentage) visible below the chart for all users and readable by screen readers.
- Error messages use `role="alert"` to be announced immediately.
