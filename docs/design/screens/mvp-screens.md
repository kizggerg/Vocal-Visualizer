# MVP Screen Specifications

**Version:** 1.0
**Date:** 2026-03-19
**Author:** Designer
**Status:** Draft -- Awaiting Phase 2 review

---

## Overview

The MVP is a single HTML page with three visual states: Upload, Processing, and Results. State transitions happen by showing/hiding sections within the page. There is no routing or page navigation.

The minimum supported width is 800px (AC-3.2). The layout should not break on tablet-sized screens (roughly 800px-1024px). Mobile widths below 800px are out of scope but should degrade gracefully (no horizontal overflow).

---

## Screen 1: Upload Page

### Layout

```
+------------------------------------------------------------------+
|  [Logo/Title Area]                                                |
|  Vocal Visualizer                                                 |
|  Visualize your pitch. See your progress.                         |
+------------------------------------------------------------------+
|                                                                    |
|  +--------------------------------------------------------------+ |
|  |                                                              | |
|  |              +------------------------+                      | |
|  |              |   Upload icon (SVG)    |                      | |
|  |              +------------------------+                      | |
|  |                                                              | |
|  |         Drag and drop your audio file here                   | |
|  |                       or                                     | |
|  |              [ Choose File ]  (button)                       | |
|  |                                                              | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  Supported formats: WAV, MP3, M4A                                  |
|  Max file size: 50 MB  |  Max duration: 10 minutes                 |
|                                                                    |
|  [Inline error message area - hidden by default]                   |
|                                                                    |
+------------------------------------------------------------------+
|  Footer: minimal - no content needed for MVP                       |
+------------------------------------------------------------------+
```

### Key UI Elements

**Header area:**
- Application name "Vocal Visualizer" as an h1 heading
- Tagline as a subtitle paragraph
- No navigation (single-page, single-feature MVP)

**Drop zone:**
- A rectangular area with a dashed border (2px dashed, using the secondary/muted color)
- Vertically and horizontally centered content
- Upload icon: a simple SVG arrow-up-from-tray or similar. Purely decorative (aria-hidden).
- Instructional text: "Drag and drop your audio file here"
- Divider text: "or"
- Primary button: "Choose File"
- The entire drop zone is a valid drop target

**Hint text:**
- Below the drop zone, smaller text listing supported formats, max size, and max duration
- Uses the muted/secondary text color

**Inline error area:**
- Hidden by default
- When a pre-processing validation error occurs (wrong format or too large), the error message appears here
- Red/error-colored text with an error icon prefix
- Announced to screen readers via `aria-live="assertive"`

### States

- **Default:** Drop zone with dashed border, hint text visible, no error
- **Drag hover:** When a file is dragged over the drop zone, the border becomes solid and the background gets a subtle highlight (primary color at 10% opacity). This provides visual feedback that the zone is an active drop target.
- **Validation error:** The drop zone remains visible. The error message appears below the drop zone in the error area. The hint text remains visible. The user can immediately try again.

### Responsive Behavior

- **800px-1024px (tablet):** Drop zone fills available width with 24px horizontal padding. All text remains single-line or wraps naturally. Button remains full touch-target size (minimum 44x44px).
- **1024px+ (desktop):** Drop zone has a max-width of 600px, centered horizontally. Generous vertical padding in the drop zone.
- **Below 800px (not a target, graceful degradation):** Drop zone stacks vertically, text may wrap. No horizontal scrollbar. The file picker button remains usable.

### Accessibility

- The "Choose File" button is a native `<button>` wrapping a hidden `<input type="file" accept=".wav,.mp3,.m4a">`. Keyboard accessible by default.
- The drop zone has `role="region"` and `aria-label="File upload area"`.
- Drag-and-drop is an enhancement; the file picker button is the primary accessible path.
- Error messages use `role="alert"` and `aria-live="assertive"`.
- All text meets WCAG AA contrast (see design system for exact colors).

---

## Screen 2: Processing State

### Layout

```
+------------------------------------------------------------------+
|  [Logo/Title Area]                                                |
|  Vocal Visualizer                                                 |
+------------------------------------------------------------------+
|                                                                    |
|                                                                    |
|                   [ Spinner animation ]                            |
|                                                                    |
|                Analyzing your recording...                          |
|                                                                    |
|                File: my-vocal-take.wav                              |
|                                                                    |
|                                                                    |
+------------------------------------------------------------------+
```

### Key UI Elements

**Spinner:**
- A CSS-only spinner (no image dependency). A simple rotating ring/circle.
- Size: 48px diameter
- Color: primary color
- Centered horizontally and vertically in the main content area

**Status text:**
- "Analyzing your recording..." in body text size
- Below the spinner, centered
- This is the ARIA live region content

**File name:**
- The name of the uploaded file displayed in muted text below the status
- Provides reassurance that the correct file is being processed
- Truncated with ellipsis if longer than the available width

### States

- **Processing (only state):** Spinner animates, status text visible. No user interaction is available except browser back/refresh (which resets the page).

### Responsive Behavior

- **All widths:** Content is centered. No layout changes needed. The spinner and text stack vertically and are inherently responsive.

### Accessibility

- The status text is in an `aria-live="polite"` region so screen readers announce "Analyzing your recording..." when this state appears.
- The spinner is decorative (`aria-hidden="true"`).
- Since there are no interactive elements in this state, keyboard focus management is not critical, but focus should be moved to the status text region when this state appears (so screen reader users are oriented).

---

## Screen 3: Results Page

### Layout

```
+------------------------------------------------------------------+
|  [Logo/Title Area]                                                |
|  Vocal Visualizer                                                 |
+------------------------------------------------------------------+
|                                                                    |
|  +--------------------------------------------------------------+ |
|  |                                                              | |
|  |                    PITCH CONTOUR CHART                       | |
|  |                                                              | |
|  |  C5 |                                                        | |
|  |  B4 |          *  *                                          | |
|  |  A4 |       *       *    *                                   | |
|  |  G4 |     *           * * *                                  | |
|  |  F4 |   *                   *                                | |
|  |  E4 | *                      *  *                            | |
|  |  D4 |                          *                             | |
|  |  C4 |                                                        | |
|  |     +---+---+---+---+---+---+---+---+---+---+---+--->       | |
|  |     0s  5s  10s 15s 20s 25s 30s 35s 40s 45s 50s 55s        | |
|  |                                                              | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  +--------------------------------------------------------------+ |
|  | Summary: Pitch range C4 to B4 | Duration: 55s | Voiced: 72% | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  [ Upload Another Recording ]  (button)                            |
|                                                                    |
+------------------------------------------------------------------+
```

### Key UI Elements

**Chart (Chart.js line/scatter chart):**
- The chart is the primary content and occupies the majority of the viewport
- Chart container: 100% width of the content area, with a fixed aspect ratio (roughly 2:1 width:height on desktop, adjusting on narrower screens)
- Minimum chart rendering width: 800px (AC-3.2)

**Chart axes:**
- Y-axis: Musical note names (e.g., C3, D3, E3, ... C5). Only notes within the detected range are shown, with one note of padding above and below for context.
- X-axis: Time labels. For recordings under 60 seconds, show seconds (0s, 5s, 10s...). For longer recordings, show mm:ss (0:00, 0:30, 1:00...).
- Grid lines: subtle, low-contrast horizontal lines at each note to aid reading

**Chart data:**
- A single line/scatter series using the chart accent color
- Line segments connect consecutive pitched frames
- Gaps (no data points) where silence or unvoiced regions occur (AC-3.3)
- Point size: small (radius 2-3px) to avoid clutter on dense data. Line weight: 2px.

**Tooltip (hover/tap detail, AC-3.4):**
- On hover (desktop) or tap (tablet), Chart.js displays a tooltip
- Tooltip content: note name (e.g., "A4") and time (e.g., "12.3s")
- Tooltip styling: dark background, white text, follows the design system

**Text summary (accessibility + informational):**
- A single line or short block below the chart
- Content: "Pitch range: [lowest note] to [highest note] | Duration: [total duration] | Voiced: [percentage of frames with detected pitch]%"
- Serves as the text alternative for the chart (NFR 3.4)
- Visible to all users, not hidden or screen-reader-only

**Upload Another button:**
- Primary button style
- Placed below the summary text
- Label: "Upload Another Recording"
- On click: clears the chart, releases audio data, returns to Upload state

### States

- **Default:** Chart rendered, summary visible, button enabled
- **Hover on chart point:** Tooltip appears with note and time detail
- **Button hover:** Standard primary button hover style (see design system)

### Responsive Behavior

- **800px-1024px (tablet):** Chart fills the full content width. The aspect ratio may shift taller (closer to 3:2) to maintain readability. Axis labels may use abbreviated note names if space is tight. The summary text may wrap to two lines.
- **1024px+ (desktop):** Chart has a max-width of 1000px, centered. Comfortable padding around the chart. Summary stays on one line.
- **Below 800px (graceful degradation):** The chart will render at its minimum 800px width. A horizontal scrollbar may appear on the chart container only (not the whole page). The button and summary remain visible without scrolling.

### Accessibility

- The chart `<canvas>` element has `role="img"` and an `aria-label` that matches the text summary content (e.g., "Pitch contour chart. Pitch range C4 to B4. Duration 55 seconds. 72 percent voiced.").
- The text summary below the chart provides the same information in visible, readable form.
- The "Upload Another Recording" button is a standard `<button>` element, keyboard accessible.
- Focus is moved to the chart region (or the summary) when results appear, so screen reader users are oriented to the new content.
- Chart colors meet WCAG AA contrast against the chart background (see design system).

---

## Screen 4: Error States

### Layout (Post-Processing Errors)

```
+------------------------------------------------------------------+
|  [Logo/Title Area]                                                |
|  Vocal Visualizer                                                 |
+------------------------------------------------------------------+
|                                                                    |
|                                                                    |
|                   [ Error icon (SVG) ]                             |
|                                                                    |
|                   [Error heading]                                   |
|                                                                    |
|                   [Error description / suggestion]                  |
|                                                                    |
|                   [ Upload Another File ]  (button)                |
|                                                                    |
|                                                                    |
+------------------------------------------------------------------+
```

### Layout (Pre-Processing Inline Errors)

Pre-processing errors (E1: wrong format, E2: too large) appear inline on the Upload screen. The drop zone remains visible. The error appears between the drop zone and the hint text.

```
+--------------------------------------------------------------+
|  [Drop zone remains visible and active]                      |
+--------------------------------------------------------------+

  [!] Unsupported file format. Please upload a WAV, MP3,
      or M4A file.

  Supported formats: WAV, MP3, M4A
  Max file size: 50 MB  |  Max duration: 10 minutes
```

### Error Messages (Full Specification)

| Error ID | Heading | Description | Trigger | Display Mode |
|----------|---------|-------------|---------|--------------|
| E1 | (no heading, inline) | "Unsupported file format. Please upload a WAV, MP3, or M4A file." | File extension check fails | Inline on Upload screen |
| E2 | (no heading, inline) | "This file is too large. The maximum file size is 50 MB." | File size check fails | Inline on Upload screen |
| E3 | Recording Too Short | "This recording is too short to analyze. Please upload a recording that is at least 1 second long." | Duration check after decode | Full error state |
| E4 | Recording Too Long | "This recording exceeds the 10-minute maximum. Please upload a shorter recording." | Duration check after decode | Full error state |
| E5 | Unable to Read File | "This file could not be read. It may be corrupted or in an unsupported encoding. Please try a different file." | Audio decode failure | Full error state |
| E6 | No Pitch Detected | "We could not detect any pitch in this recording. Try uploading a clearer vocal recording without background music." | Pitch analysis returns empty | Full error state |

### Key UI Elements (Full Error State)

**Error icon:**
- A simple SVG circle-exclamation or triangle-exclamation icon
- Size: 48px
- Color: error color from design system
- Decorative (`aria-hidden="true"`)

**Error heading:**
- Bold, larger than body text (h2 equivalent)
- Short, descriptive (see table above)

**Error description:**
- Body text size, normal weight
- Explains what happened and what to do
- No technical jargon, no stack traces (NFR 3.6)

**Upload Another File button:**
- Primary button style
- Returns user to Upload state

### Key UI Elements (Inline Error)

**Error text:**
- Preceded by an error icon (small, inline, 16px)
- Error color text
- Appears in the error area below the drop zone

### States

- **Error visible:** Icon, message, and button displayed. No other states for error screens.

### Responsive Behavior

- **All widths:** Error content is centered text, stacks vertically. Inherently responsive. No layout changes needed.

### Accessibility

- Full error states: the error heading has `role="alert"` and `aria-live="assertive"` so it is announced immediately.
- Inline errors: the error text container has `role="alert"` and `aria-live="assertive"`.
- The "Upload Another File" button receives focus when a full error state appears (so keyboard users can act immediately).
- Error messages are plain text, readable by screen readers without issue.
- Error color meets WCAG AA contrast against the page background (see design system).
