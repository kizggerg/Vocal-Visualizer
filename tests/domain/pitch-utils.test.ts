import { describe, expect, it } from "vitest";
import {
	formatTime,
	frequencyToMidi,
	frequencyToNoteName,
	midiToFrequency,
	midiToNoteName,
} from "../../src/domain/pitch-utils";

describe("frequencyToMidi", () => {
	it("converts A4 (440 Hz) to MIDI 69", () => {
		expect(frequencyToMidi(440)).toBe(69);
	});

	it("converts C4 (261.63 Hz) to approximately MIDI 60", () => {
		expect(frequencyToMidi(261.63)).toBeCloseTo(60, 0);
	});

	it("converts E2 (82.41 Hz) to approximately MIDI 40", () => {
		expect(frequencyToMidi(82.41)).toBeCloseTo(40, 0);
	});
});

describe("midiToFrequency", () => {
	it("converts MIDI 69 to 440 Hz", () => {
		expect(midiToFrequency(69)).toBe(440);
	});

	it("converts MIDI 60 to approximately 261.63 Hz", () => {
		expect(midiToFrequency(60)).toBeCloseTo(261.63, 1);
	});
});

describe("midiToNoteName", () => {
	it("converts MIDI 60 to C4", () => {
		expect(midiToNoteName(60)).toBe("C4");
	});

	it("converts MIDI 69 to A4", () => {
		expect(midiToNoteName(69)).toBe("A4");
	});

	it("converts MIDI 61 to C#4", () => {
		expect(midiToNoteName(61)).toBe("C#4");
	});

	it("converts MIDI 48 to C3", () => {
		expect(midiToNoteName(48)).toBe("C3");
	});

	it("converts MIDI 72 to C5", () => {
		expect(midiToNoteName(72)).toBe("C5");
	});

	it("handles MIDI 0 (C-1)", () => {
		expect(midiToNoteName(0)).toBe("C-1");
	});
});

describe("frequencyToNoteName", () => {
	it("converts 440 Hz to A4", () => {
		expect(frequencyToNoteName(440)).toBe("A4");
	});

	it("converts 261.63 Hz to C4", () => {
		expect(frequencyToNoteName(261.63)).toBe("C4");
	});
});

describe("formatTime", () => {
	it("formats seconds under 60 with one decimal", () => {
		expect(formatTime(12.345)).toBe("12.3s");
	});

	it("formats 0 seconds", () => {
		expect(formatTime(0)).toBe("0.0s");
	});

	it("formats exactly 60 seconds as 1:00", () => {
		expect(formatTime(60)).toBe("1:00");
	});

	it("formats 90 seconds as 1:30", () => {
		expect(formatTime(90)).toBe("1:30");
	});

	it("formats 125 seconds as 2:05", () => {
		expect(formatTime(125)).toBe("2:05");
	});
});
