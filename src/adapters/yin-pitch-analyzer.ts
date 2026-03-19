import { YIN } from "pitchfinder";
import { frequencyToMidi, frequencyToNoteName } from "../domain/pitch-utils";
import type { PitchAnalyzer } from "../domain/ports";
import type {
	AnalysisConfig,
	PitchContour,
	PitchDataPoint,
	PitchSummary,
} from "../domain/types";

export const yinPitchAnalyzer: PitchAnalyzer = {
	analyze(
		samples: Float32Array,
		sampleRate: number,
		config: AnalysisConfig,
	): PitchContour {
		const detectPitch = YIN({
			sampleRate,
			threshold: config.confidenceThreshold,
		});

		const points: PitchDataPoint[] = [];
		const totalSamples = samples.length;

		for (
			let offset = 0;
			offset + config.windowSize <= totalSamples;
			offset += config.hopSize
		) {
			const time = offset / sampleRate;
			const window = samples.slice(offset, offset + config.windowSize);
			const frequency = detectPitch(window);

			if (frequency != null && frequency > 0) {
				const midiNote = frequencyToMidi(frequency);
				const note = frequencyToNoteName(frequency);
				points.push({ time, frequency, note, midiNote });
			} else {
				points.push({ time, frequency: null, note: null, midiNote: null });
			}
		}

		const summary = computeSummary(points, totalSamples / sampleRate);
		return { points, summary };
	},
};

function computeSummary(
	points: PitchDataPoint[],
	duration: number,
): PitchSummary {
	const voiced = points.filter(
		(p): p is PitchDataPoint & { frequency: number; note: string } =>
			p.frequency !== null,
	);

	if (voiced.length === 0) {
		return {
			minFrequency: 0,
			maxFrequency: 0,
			minNote: "",
			maxNote: "",
			totalPoints: points.length,
			voicedPoints: 0,
			duration,
		};
	}

	const frequencies = voiced.map((p) => p.frequency);
	const minFrequency = Math.min(...frequencies);
	const maxFrequency = Math.max(...frequencies);

	return {
		minFrequency,
		maxFrequency,
		minNote: frequencyToNoteName(minFrequency),
		maxNote: frequencyToNoteName(maxFrequency),
		totalPoints: points.length,
		voicedPoints: voiced.length,
		duration,
	};
}
