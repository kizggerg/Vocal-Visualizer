# Data Models

**Version:** 1.0
**Date:** 2026-03-19
**Status:** Proposed (awaiting HC-2 approval)
**Location in code:** `src/domain/types.ts`
**Related:** [Service Contracts](../api/service-contracts.md), ADR-004 (project structure)

---

## Overview

These are the core data types used across the application. All types are defined in `src/domain/types.ts` and have no dependencies on external libraries. They are the shared vocabulary of the domain layer.

---

## Core Data Types

### PitchDataPoint

A single pitch measurement at a specific point in time.

```typescript
/**
 * A single pitch detection result at a point in time.
 * Null frequency indicates silence or an unvoiced region.
 */
interface PitchDataPoint {
  /** Time offset from the start of the recording, in seconds. */
  time: number;

  /** Detected fundamental frequency in Hz, or null if no pitch was detected. */
  frequency: number | null;

  /** Musical note name (e.g., "C4", "F#3"), or null if no pitch was detected. */
  note: string | null;

  /** MIDI note number (0-127), or null if no pitch was detected. */
  midiNote: number | null;
}
```

**Design notes:**
- `frequency`, `note`, and `midiNote` are all nullable together. When one is null, all are null (silence/unvoiced). This is a deliberate denormalization -- storing all three representations avoids repeated conversions during rendering.
- `note` uses scientific pitch notation (e.g., "C4" is middle C, "A4" is 440 Hz). Sharps are represented as "#" (e.g., "F#3"), flats are not used (enharmonic preference for sharps simplifies display).
- `midiNote` is included because Chart.js needs a numeric Y-axis value. MIDI note numbers provide an evenly spaced numeric scale that maps directly to musical notes.

### PitchContour

The complete time-series of pitch data extracted from a recording.

```typescript
/**
 * The complete pitch analysis result: a time-series of pitch measurements
 * spanning the entire recording.
 */
interface PitchContour {
  /** Ordered array of pitch measurements, one per analysis window. */
  points: PitchDataPoint[];

  /** Summary statistics for the contour. */
  summary: PitchSummary;
}
```

### PitchSummary

Aggregate statistics derived from the pitch contour. Used for the accessibility text alternative and for setting chart axis ranges.

```typescript
/**
 * Summary statistics for a pitch contour.
 * Computed from the non-null (voiced) points only.
 */
interface PitchSummary {
  /** Lowest detected pitch in Hz. */
  minFrequency: number;

  /** Highest detected pitch in Hz. */
  maxFrequency: number;

  /** Lowest detected note name (e.g., "C3"). */
  minNote: string;

  /** Highest detected note name (e.g., "G4"). */
  maxNote: string;

  /** Total number of analysis windows (voiced + unvoiced). */
  totalPoints: number;

  /** Number of windows where pitch was detected (voiced). */
  voicedPoints: number;

  /** Duration of the recording in seconds. */
  duration: number;
}
```

**Design notes:**
- `PitchSummary` supports the accessibility text alternative (AC-3.4, NFR 3.4): "Your pitch ranged from C3 to G4 over 2 minutes 30 seconds."
- `voicedPoints / totalPoints` gives a "voiced percentage" that could help users understand how much of their recording contained detectable pitch.

### AudioMetadata

Metadata about the decoded audio file.

```typescript
/**
 * Metadata extracted during audio decoding.
 */
interface AudioMetadata {
  /** Sample rate in Hz (e.g., 44100, 48000). */
  sampleRate: number;

  /** Duration of the recording in seconds. */
  duration: number;

  /** Number of audio channels in the original file (before downmix to mono). */
  channelCount: number;

  /** Total number of samples in the mono PCM data. */
  sampleCount: number;
}
```

### AnalysisResult

The top-level result returned to the UI after the full analysis pipeline completes.

```typescript
/**
 * The complete result of the analysis pipeline: metadata + pitch contour.
 * This is the data structure that the UI consumes to render the visualization.
 */
interface AnalysisResult {
  /** Metadata about the audio file. */
  metadata: AudioMetadata;

  /** The extracted pitch contour. */
  contour: PitchContour;
}
```

---

## Configuration Types

### FileConstraints

Validation rules for uploaded files. Passed to the `FileValidator` port.

```typescript
/**
 * Constraints for file validation.
 * Defined as a data type so validation rules are explicit and testable.
 */
interface FileConstraints {
  /** Allowed MIME types (e.g., ["audio/wav", "audio/mpeg", "audio/mp4"]). */
  allowedMimeTypes: string[];

  /** Allowed file extensions (e.g., [".wav", ".mp3", ".m4a"]). */
  allowedExtensions: string[];

  /** Maximum file size in bytes. */
  maxSizeBytes: number;

  /** Minimum recording duration in seconds. */
  minDurationSeconds: number;

  /** Maximum recording duration in seconds. */
  maxDurationSeconds: number;
}
```

**MVP default values:**

```typescript
const MVP_FILE_CONSTRAINTS: FileConstraints = {
  allowedMimeTypes: ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac'],
  allowedExtensions: ['.wav', '.mp3', '.m4a'],
  maxSizeBytes: 50 * 1024 * 1024, // 50 MB
  minDurationSeconds: 1,
  maxDurationSeconds: 600, // 10 minutes
};
```

**Design notes:**
- Multiple MIME types for M4A because browsers report different MIME types (`audio/mp4`, `audio/x-m4a`, `audio/aac`) depending on platform. The validator accepts all common variants.
- Both MIME types and extensions are checked because MIME type detection is unreliable in some browsers. Extension is a fallback.

### AnalysisConfig

Configuration for the pitch analysis algorithm. Passed to the `PitchAnalyzer` port.

```typescript
/**
 * Configuration for pitch analysis.
 * Sensible defaults are provided; advanced users or future features
 * can tune these values.
 */
interface AnalysisConfig {
  /** Size of the analysis window in samples (e.g., 2048). Larger = more frequency resolution, less time resolution. */
  windowSize: number;

  /** Hop size in samples (e.g., 1024). Controls overlap between analysis windows. Smaller = more data points. */
  hopSize: number;

  /** Minimum confidence threshold (0-1) for a pitch detection to be considered valid. Below this, the point is treated as unvoiced. */
  confidenceThreshold: number;
}
```

**MVP default values:**

```typescript
const MVP_ANALYSIS_CONFIG: AnalysisConfig = {
  windowSize: 2048,
  hopSize: 1024,
  confidenceThreshold: 0.8,
};
```

**Design notes:**
- `windowSize: 2048` at 44.1 kHz gives ~46 ms windows, which provides good frequency resolution for vocal pitch (82 Hz / E2 to 1047 Hz / C6).
- `hopSize: 1024` (50% overlap) gives ~23 ms between data points, yielding ~43 points per second -- sufficient resolution for a smooth contour.
- `confidenceThreshold: 0.8` filters out low-confidence detections (noise, breath sounds). Tunable per the service contract.

---

## Validation Result Types

### ValidationResult

A discriminated union returned by the `FileValidator` port.

```typescript
/**
 * Result of file validation. Either success or a specific failure.
 */
type ValidationResult =
  | { valid: true }
  | { valid: false; reason: ValidationFailureReason; message: string };

/**
 * Specific reasons a file validation can fail.
 * Used to render targeted error messages in the UI.
 */
type ValidationFailureReason =
  | 'unsupported_format'
  | 'file_too_large'
  | 'duration_too_short'
  | 'duration_too_long';
```

**Design notes:**
- Using a discriminated union (`valid: true | false`) rather than exceptions because validation failures are expected, not exceptional. The caller needs to distinguish between failure reasons to show appropriate error messages.
- The `message` field contains a human-readable error string ready for display (e.g., "File must be WAV, MP3, or M4A format"). This keeps message generation in the validator, not scattered across UI components.

---

## Chart Data Types

### ChartData

Chart-library-agnostic data structure consumed by the visualization component. Defined here in the domain layer; the Chart.js adapter maps it to Chart.js-specific types.

```typescript
/**
 * Chart-ready data for rendering a pitch contour.
 * Agnostic to the charting library -- uses plain numbers and strings.
 */
interface ChartData {
  /** Data points for the chart. Null pitch represents silence/unvoiced gaps. */
  points: Array<{ time: number; pitch: number | null }>;

  /** Human-readable label for the X-axis (e.g., "Time"). */
  xAxisLabel: string;

  /** Human-readable label for the Y-axis (e.g., "Note"). */
  yAxisLabel: string;

  /** Suggested Y-axis range in MIDI note numbers, padded for readability. */
  yRange: { min: number; max: number };

  /** Total duration of the recording in seconds. */
  duration: number;
}
```

**Design notes:**
- `pitch` values in the `points` array are MIDI note numbers (numeric), not note names (strings). This gives the chart a linear numeric scale. The Chart.js adapter converts MIDI numbers to note name labels for the Y-axis ticks.
- `yRange` is padded (e.g., 2 semitones above and below the detected range) to give the chart visual breathing room. The padding logic lives in the `Visualization` adapter, not in this type definition.

---

## Error Types

### DecodingError

Thrown by the `AudioDecoder` when a file cannot be decoded.

```typescript
/**
 * Error thrown when an audio file cannot be decoded.
 * Wraps the underlying browser decoding error with a user-friendly message.
 */
class DecodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecodingError';
  }
}
```

---

## Type Relationships

```
File (browser native)
  |
  v
FileValidator.validate(file, FileConstraints) --> ValidationResult
  |
  v (if valid)
AudioDecoder.decode(file) --> { AudioMetadata, Float32Array }
  |
  v
PitchAnalyzer.analyze(samples, sampleRate, AnalysisConfig) --> PitchContour
  |                                                              |
  |                                                              +-- PitchDataPoint[]
  |                                                              +-- PitchSummary
  v
AnalysisResult { AudioMetadata, PitchContour }
  |
  v
Visualization.prepareChartData(contour) --> ChartData
  |
  v
React PitchContour component renders Chart.js chart
```

This is the complete data flow. Each arrow represents a function call at a port boundary. The types at each boundary are defined above. No type depends on an external library.
