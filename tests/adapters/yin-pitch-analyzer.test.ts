import { describe, expect, it } from "vitest";
import { yinPitchAnalyzer } from "../../src/adapters/yin-pitch-analyzer";
import type { AnalysisConfig } from "../../src/domain/types";

const config: AnalysisConfig = {
	windowSize: 2048,
	hopSize: 1024,
	confidenceThreshold: 0.8,
};

describe("yinPitchAnalyzer", () => {
	it("returns empty contour for buffer smaller than window size", () => {
		const samples = new Float32Array(1024); // smaller than windowSize
		const result = yinPitchAnalyzer.analyze(samples, 44100, config);

		expect(result.points).toHaveLength(0);
		expect(result.summary.totalPoints).toBe(0);
		expect(result.summary.voicedPoints).toBe(0);
	});

	it("detects pitch from a pure sine wave", () => {
		const sampleRate = 44100;
		const frequency = 440; // A4
		const duration = 0.5; // half second
		const numSamples = Math.floor(sampleRate * duration);
		const samples = new Float32Array(numSamples);

		for (let i = 0; i < numSamples; i++) {
			samples[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
		}

		const result = yinPitchAnalyzer.analyze(samples, sampleRate, config);

		expect(result.points.length).toBeGreaterThan(0);
		expect(result.summary.voicedPoints).toBeGreaterThan(0);

		// Check that detected frequencies are close to 440 Hz
		const voicedPoints = result.points.filter((p) => p.frequency !== null);
		for (const point of voicedPoints) {
			expect(point.frequency).toBeCloseTo(440, -1); // within ~10 Hz
			expect(point.note).toBe("A4");
			expect(point.midiNote).toBeCloseTo(69, 0);
		}
	});

	it("handles silence or noise gracefully", () => {
		const sampleRate = 44100;
		const numSamples = 4096;
		const samples = new Float32Array(numSamples); // all zeros = silence

		const result = yinPitchAnalyzer.analyze(samples, sampleRate, config);

		// YIN may or may not detect pitch in silence depending on threshold.
		// The key invariant is that it returns valid data structures without crashing.
		expect(result.points.length).toBeGreaterThan(0);
		expect(result.summary.totalPoints).toBe(result.points.length);
		expect(result.summary.voicedPoints).toBeLessThanOrEqual(
			result.summary.totalPoints,
		);
	});

	it("computes correct summary statistics", () => {
		const sampleRate = 44100;
		const duration = 0.5;
		const numSamples = Math.floor(sampleRate * duration);
		const samples = new Float32Array(numSamples);

		// Generate a 440 Hz sine wave
		for (let i = 0; i < numSamples; i++) {
			samples[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
		}

		const result = yinPitchAnalyzer.analyze(samples, sampleRate, config);

		expect(result.summary.duration).toBeCloseTo(duration, 1);
		expect(result.summary.totalPoints).toBe(result.points.length);
		expect(result.summary.voicedPoints).toBeLessThanOrEqual(
			result.summary.totalPoints,
		);
		if (result.summary.voicedPoints > 0) {
			expect(result.summary.minFrequency).toBeGreaterThan(0);
			expect(result.summary.maxFrequency).toBeGreaterThanOrEqual(
				result.summary.minFrequency,
			);
			expect(result.summary.minNote).toBeTruthy();
			expect(result.summary.maxNote).toBeTruthy();
		}
	});
});
