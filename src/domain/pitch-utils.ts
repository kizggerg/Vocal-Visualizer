const NOTE_NAMES = [
	"C",
	"C#",
	"D",
	"D#",
	"E",
	"F",
	"F#",
	"G",
	"G#",
	"A",
	"A#",
	"B",
] as const;

/** Convert a frequency in Hz to a MIDI note number. */
export function frequencyToMidi(frequency: number): number {
	return 69 + 12 * Math.log2(frequency / 440);
}

/** Convert a MIDI note number to a frequency in Hz. */
export function midiToFrequency(midi: number): number {
	return 440 * 2 ** ((midi - 69) / 12);
}

/** Convert a MIDI note number to a note name (e.g., 60 -> "C4"). */
export function midiToNoteName(midi: number): string {
	const rounded = Math.round(midi);
	const octave = Math.floor(rounded / 12) - 1;
	const noteIndex = ((rounded % 12) + 12) % 12;
	return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/** Convert a frequency in Hz to a note name (e.g., 440 -> "A4"). */
export function frequencyToNoteName(frequency: number): string {
	return midiToNoteName(frequencyToMidi(frequency));
}

/** Format seconds as a time string. Under 60s: "12.3s". Over 60s: "1:30". */
export function formatTime(seconds: number): string {
	if (seconds < 60) {
		return `${seconds.toFixed(1)}s`;
	}
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}
