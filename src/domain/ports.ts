import type {
	AnalysisConfig,
	AudioMetadata,
	ChartData,
	FileConstraints,
	PitchContour,
	ValidationResult,
} from "./types";

/** Validates an audio file against format, size, and duration constraints. */
export interface FileValidator {
	validate(file: File, constraints: FileConstraints): Promise<ValidationResult>;
}

/** Decodes an audio file into PCM sample data. */
export interface AudioDecoder {
	decode(
		file: File,
	): Promise<{ metadata: AudioMetadata; samples: Float32Array }>;
}

/** Extracts a time-series of pitch values from PCM audio samples. */
export interface PitchAnalyzer {
	analyze(
		samples: Float32Array,
		sampleRate: number,
		config: AnalysisConfig,
	): PitchContour;
}

/** Transforms a PitchContour into chart-ready data. */
export interface Visualization {
	prepareChartData(contour: PitchContour): ChartData;
}
