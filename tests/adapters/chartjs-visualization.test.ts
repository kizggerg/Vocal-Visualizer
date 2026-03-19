import { describe, expect, it } from "vitest";
import { chartjsVisualization } from "../../src/adapters/chartjs-visualization";
import type { PitchContour } from "../../src/domain/types";

describe("chartjsVisualization", () => {
	it("transforms pitch contour into chart data", () => {
		const contour: PitchContour = {
			points: [
				{ time: 0, frequency: 440, note: "A4", midiNote: 69 },
				{ time: 0.023, frequency: null, note: null, midiNote: null },
				{ time: 0.046, frequency: 493.88, note: "B4", midiNote: 71 },
			],
			summary: {
				minFrequency: 440,
				maxFrequency: 493.88,
				minNote: "A4",
				maxNote: "B4",
				totalPoints: 3,
				voicedPoints: 2,
				duration: 0.069,
			},
		};

		const chartData = chartjsVisualization.prepareChartData(contour);

		expect(chartData.points).toHaveLength(3);
		expect(chartData.points[0]).toEqual({ time: 0, pitch: 69 });
		expect(chartData.points[1]).toEqual({ time: 0.023, pitch: null });
		expect(chartData.points[2]).toEqual({ time: 0.046, pitch: 71 });
		expect(chartData.xAxisLabel).toBe("Time");
		expect(chartData.yAxisLabel).toBe("Note");
		expect(chartData.duration).toBe(0.069);
	});

	it("pads Y-axis range by 2 semitones", () => {
		const contour: PitchContour = {
			points: [{ time: 0, frequency: 440, note: "A4", midiNote: 69 }],
			summary: {
				minFrequency: 440,
				maxFrequency: 440,
				minNote: "A4",
				maxNote: "A4",
				totalPoints: 1,
				voicedPoints: 1,
				duration: 0.023,
			},
		};

		const chartData = chartjsVisualization.prepareChartData(contour);

		expect(chartData.yRange.min).toBe(67); // 69 - 2
		expect(chartData.yRange.max).toBe(71); // 69 + 2
	});

	it("uses default range when no voiced points", () => {
		const contour: PitchContour = {
			points: [{ time: 0, frequency: null, note: null, midiNote: null }],
			summary: {
				minFrequency: 0,
				maxFrequency: 0,
				minNote: "",
				maxNote: "",
				totalPoints: 1,
				voicedPoints: 0,
				duration: 0.023,
			},
		};

		const chartData = chartjsVisualization.prepareChartData(contour);

		expect(chartData.yRange.min).toBe(48); // C3
		expect(chartData.yRange.max).toBe(72); // C5
	});
});
