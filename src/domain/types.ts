/** A single pitch detection result at a point in time. */
export interface PitchDataPoint {
	/** Time offset from the start of the recording, in seconds. */
	time: number;
	/** Detected fundamental frequency in Hz, or null if no pitch was detected. */
	frequency: number | null;
	/** Musical note name (e.g., "C4", "F#3"), or null if no pitch was detected. */
	note: string | null;
	/** MIDI note number (0-127), or null if no pitch was detected. */
	midiNote: number | null;
}

/** The complete pitch analysis result. */
export interface PitchContour {
	points: PitchDataPoint[];
	summary: PitchSummary;
}

/** Summary statistics for a pitch contour. Computed from voiced points only. */
export interface PitchSummary {
	minFrequency: number;
	maxFrequency: number;
	minNote: string;
	maxNote: string;
	totalPoints: number;
	voicedPoints: number;
	duration: number;
}

/** Metadata extracted during audio decoding. */
export interface AudioMetadata {
	sampleRate: number;
	duration: number;
	channelCount: number;
	sampleCount: number;
}

/** The complete result of the analysis pipeline. */
export interface AnalysisResult {
	metadata: AudioMetadata;
	contour: PitchContour;
}

/** Constraints for file validation. */
export interface FileConstraints {
	allowedMimeTypes: string[];
	allowedExtensions: string[];
	maxSizeBytes: number;
	minDurationSeconds: number;
	maxDurationSeconds: number;
}

/** Result of file validation. */
export type ValidationResult =
	| { valid: true }
	| { valid: false; reason: ValidationFailureReason; message: string };

export type ValidationFailureReason =
	| "unsupported_format"
	| "file_too_large"
	| "duration_too_short"
	| "duration_too_long";

/** Configuration for pitch analysis. */
export interface AnalysisConfig {
	windowSize: number;
	hopSize: number;
	confidenceThreshold: number;
}

/** Chart-ready data for rendering a pitch contour. */
export interface ChartData {
	points: Array<{ time: number; pitch: number | null }>;
	xAxisLabel: string;
	yAxisLabel: string;
	yRange: { min: number; max: number };
	duration: number;
}

/** Error thrown when an audio file cannot be decoded. */
export class DecodingError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DecodingError";
	}
}

/** MVP default file constraints. */
export const MVP_FILE_CONSTRAINTS: FileConstraints = {
	allowedMimeTypes: [
		"audio/wav",
		"audio/x-wav",
		"audio/mpeg",
		"audio/mp4",
		"audio/x-m4a",
		"audio/aac",
	],
	allowedExtensions: [".wav", ".mp3", ".m4a"],
	maxSizeBytes: 50 * 1024 * 1024,
	minDurationSeconds: 1,
	maxDurationSeconds: 600,
};

/** MVP default analysis configuration. */
export const MVP_ANALYSIS_CONFIG: AnalysisConfig = {
	windowSize: 2048,
	hopSize: 1024,
	confidenceThreshold: 0.8,
};
