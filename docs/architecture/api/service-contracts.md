# Service Interface Contracts

**Version:** 1.0
**Date:** 2026-03-19
**Status:** Proposed (awaiting HC-2 approval)
**Related ADRs:** ADR-003 (technology stack), ADR-004 (project structure)

---

## Overview

These are the four port interfaces that define the service boundaries of the application. They live in `src/domain/ports.ts`. Each port is implemented by exactly one adapter for MVP. The port interfaces depend only on types from `src/domain/types.ts` -- they have no knowledge of Web Audio API, pitchfinder, Chart.js, or any other library.

All types referenced below (`AudioMetadata`, `PitchContour`, `ValidationResult`, `FileConstraints`, `AnalysisConfig`) are defined in the [Data Models](../design/data-models.md) document.

---

## Port 1: FileValidator

Validates an uploaded file against format, size, and duration constraints before processing.

```typescript
/**
 * Validates an audio file against the application's constraints.
 *
 * Validation is synchronous for format and size checks (which inspect
 * the File object metadata). Duration validation requires reading
 * file headers and is therefore asynchronous.
 */
interface FileValidator {
  /**
   * Validates the file's MIME type/extension against supported formats,
   * its size against the maximum, and its duration against min/max limits.
   *
   * @param file - The File object from the browser's file input or drag-and-drop.
   * @param constraints - The validation rules (max size, allowed formats, min/max duration).
   * @returns A ValidationResult indicating success or a specific failure reason.
   */
  validate(file: File, constraints: FileConstraints): Promise<ValidationResult>;
}
```

**Design notes:**
- Returns a `ValidationResult` (a discriminated union) rather than throwing, so the caller can render specific error messages for each failure mode (wrong format, too large, too long, too short).
- The `constraints` parameter makes the validation rules explicit and testable -- tests can pass different constraints without modifying the validator.
- `Promise` return type because duration validation requires decoding the file header, which is asynchronous in the browser.

---

## Port 2: AudioDecoder

Decodes an audio file (WAV, MP3, M4A) into raw PCM sample data for analysis.

```typescript
/**
 * Decodes an audio file into PCM sample data.
 *
 * The MVP adapter uses the Web Audio API's decodeAudioData().
 */
interface AudioDecoder {
  /**
   * Decodes the audio file and returns metadata plus raw PCM samples.
   *
   * @param file - The File object to decode.
   * @returns AudioMetadata (sample rate, duration, channel count) and
   *          a Float32Array of mono PCM samples (normalized to [-1, 1]).
   * @throws DecodingError if the file cannot be decoded (corrupted, unsupported codec).
   */
  decode(file: File): Promise<{ metadata: AudioMetadata; samples: Float32Array }>;
}
```

**Design notes:**
- Returns mono samples as a `Float32Array`. If the input is stereo, the adapter is responsible for downmixing to mono (averaging channels). Pitch detection operates on mono audio.
- Throws a `DecodingError` (defined in `types.ts`) rather than returning a result type, because a decode failure is exceptional and unrecoverable -- there is nothing the caller can do except show an error.
- The `AudioMetadata` is returned alongside samples because the caller needs the sample rate for pitch analysis and the duration for display.

---

## Port 3: PitchAnalyzer

Extracts a time-series of pitch values from PCM audio samples.

```typescript
/**
 * Analyzes PCM audio samples and extracts pitch data over time.
 *
 * The MVP adapter uses the pitchfinder library with the YIN algorithm.
 */
interface PitchAnalyzer {
  /**
   * Analyzes the given PCM samples and returns a pitch contour.
   *
   * @param samples - Mono PCM samples as a Float32Array (normalized to [-1, 1]).
   * @param sampleRate - The sample rate of the audio (e.g., 44100).
   * @param config - Analysis configuration (window size, confidence threshold).
   * @returns A PitchContour containing the time-series of detected pitches,
   *          with null entries for unvoiced/silent regions.
   */
  analyze(
    samples: Float32Array,
    sampleRate: number,
    config: AnalysisConfig,
  ): PitchContour;
}
```

**Design notes:**
- Synchronous return (`PitchContour`, not `Promise<PitchContour>`). Pitch analysis is CPU-bound, not I/O-bound. The adapter may internally use chunked processing or `requestAnimationFrame` to avoid blocking the UI thread, but the port interface is synchronous from the caller's perspective. If we later need to move analysis to a Web Worker, the adapter handles that internally and the port interface does not change.
- The `config` parameter exposes tunable analysis settings (window size, confidence threshold) without coupling to any specific algorithm. Defaults are defined in the adapter, not the port.
- Unvoiced/silent regions are represented as `null` pitch values in the returned `PitchContour`, which maps directly to Chart.js's gap handling (`spanGaps: false`).

---

## Port 4: Visualization

Prepares pitch contour data for chart rendering. This port is intentionally thin -- it transforms domain data into the format needed by the charting library, but does not own the rendering itself (React components handle rendering).

```typescript
/**
 * Transforms a PitchContour into chart-ready data.
 *
 * The MVP adapter formats data for Chart.js, but the port interface
 * is chart-library-agnostic.
 */
interface Visualization {
  /**
   * Transforms pitch contour data into a format suitable for chart rendering.
   *
   * @param contour - The pitch contour from analysis.
   * @returns An object containing formatted datasets (x/y points), axis labels,
   *          and configuration hints (axis ranges, tick values).
   */
  prepareChartData(contour: PitchContour): ChartData;
}
```

**Where `ChartData` is:**

```typescript
/**
 * Chart-library-agnostic data structure for rendering a pitch contour.
 * Defined in domain/types.ts alongside other data models.
 */
interface ChartData {
  /** Data points for the chart. Each point has a time (seconds) and an optional pitch. */
  points: Array<{ time: number; pitch: number | null }>;
  /** Human-readable label for the X-axis. */
  xAxisLabel: string;
  /** Human-readable label for the Y-axis. */
  yAxisLabel: string;
  /** Suggested Y-axis range based on the detected pitch range. */
  yRange: { min: number; max: number };
  /** Total duration in seconds (for X-axis range). */
  duration: number;
}
```

**Design notes:**
- The `Visualization` port does NOT render anything. It transforms data. The React `PitchContour` component consumes `ChartData` and renders it using Chart.js. This keeps the domain logic (data transformation) separate from the UI framework (React + Chart.js).
- `ChartData` is intentionally chart-library-agnostic. It uses plain numbers and strings, not Chart.js-specific types. The `PitchContour` React component maps `ChartData` to Chart.js dataset format.
- The `points` array uses `null` for pitch to represent silence/unvoiced gaps, which aligns with the domain model and maps naturally to Chart.js's gap handling.

---

## Error Types

```typescript
/**
 * Thrown by AudioDecoder when a file cannot be decoded.
 */
class DecodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecodingError';
  }
}
```

No other custom error types are needed for MVP. The `FileValidator` communicates failures through `ValidationResult` (a discriminated union, not exceptions). The `PitchAnalyzer` returns `null` values for undetectable pitch rather than throwing. The `Visualization` port operates on validated data and has no failure mode.

---

## Contract Stability

Per ADR-001 Principle 6 (Service-Oriented Design), these interfaces are designed to be stable:

- **Additive changes only.** New optional parameters or new fields on return types are non-breaking. Removing or renaming parameters/fields requires a new ADR.
- **No breaking changes without an ADR.** If a port interface must change in a backwards-incompatible way, an ADR must document the rationale and migration plan.
- **Adapters are swappable.** Any adapter can be replaced without changing the port interface. This is the core benefit of ports-and-adapters architecture.
