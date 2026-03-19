import { frequencyToMidi } from "../domain/pitch-utils";
import type { Visualization } from "../domain/ports";
import type { ChartData, PitchContour } from "../domain/types";

export const chartjsVisualization: Visualization = {
	prepareChartData(contour: PitchContour): ChartData {
		const points = contour.points.map((p) => ({
			time: p.time,
			pitch: p.midiNote,
		}));

		// Compute Y-axis range with 2-semitone padding
		let yMin: number;
		let yMax: number;

		if (contour.summary.voicedPoints > 0) {
			const minMidi = frequencyToMidi(contour.summary.minFrequency);
			const maxMidi = frequencyToMidi(contour.summary.maxFrequency);
			yMin = Math.floor(minMidi) - 2;
			yMax = Math.ceil(maxMidi) + 2;
		} else {
			// Default range if no pitch detected (C3 to C5)
			yMin = 48;
			yMax = 72;
		}

		return {
			points,
			xAxisLabel: "Time",
			yAxisLabel: "Note",
			yRange: { min: yMin, max: yMax },
			duration: contour.summary.duration,
		};
	},
};
