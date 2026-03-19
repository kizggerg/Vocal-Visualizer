import { describe, expect, it } from "vitest";
import {
	getFileExtension,
	isFormatValid,
} from "../../src/adapters/file-validator";
import type { FileConstraints } from "../../src/domain/types";

const constraints: FileConstraints = {
	allowedMimeTypes: ["audio/wav", "audio/mpeg", "audio/mp4"],
	allowedExtensions: [".wav", ".mp3", ".m4a"],
	maxSizeBytes: 50 * 1024 * 1024,
	minDurationSeconds: 1,
	maxDurationSeconds: 600,
};

function makeFile(name: string, type: string, size = 1024): File {
	return new File(["x".repeat(size)], name, { type });
}

describe("getFileExtension", () => {
	it("extracts .wav", () => {
		expect(getFileExtension("song.wav")).toBe(".wav");
	});

	it("handles uppercase extensions", () => {
		expect(getFileExtension("song.WAV")).toBe(".wav");
	});

	it("handles multiple dots", () => {
		expect(getFileExtension("my.song.mp3")).toBe(".mp3");
	});

	it("returns empty for no extension", () => {
		expect(getFileExtension("noextension")).toBe("");
	});
});

describe("isFormatValid", () => {
	it("accepts WAV files", () => {
		expect(isFormatValid(makeFile("test.wav", "audio/wav"), constraints)).toBe(
			true,
		);
	});

	it("accepts MP3 files", () => {
		expect(
			isFormatValid(makeFile("test.mp3", "audio/mpeg"), constraints),
		).toBe(true);
	});

	it("accepts M4A files", () => {
		expect(
			isFormatValid(makeFile("test.m4a", "audio/mp4"), constraints),
		).toBe(true);
	});

	it("rejects unsupported extensions", () => {
		expect(
			isFormatValid(makeFile("test.ogg", "audio/ogg"), constraints),
		).toBe(false);
	});

	it("rejects .txt files", () => {
		expect(
			isFormatValid(makeFile("test.txt", "text/plain"), constraints),
		).toBe(false);
	});

	it("accepts files with empty mime type if extension is valid", () => {
		expect(isFormatValid(makeFile("test.wav", ""), constraints)).toBe(true);
	});

	it("rejects files with valid mime but wrong extension", () => {
		expect(
			isFormatValid(makeFile("test.ogg", "audio/wav"), constraints),
		).toBe(false);
	});

	it("rejects files with no extension", () => {
		expect(
			isFormatValid(makeFile("testfile", "audio/wav"), constraints),
		).toBe(false);
	});
});

describe("fileValidator.validate", () => {
	// Import the actual validator for integration-style tests
	// (format + size checks only; duration is checked post-decode in App.tsx)
	it("rejects files over max size", async () => {
		const { fileValidator } = await import(
			"../../src/adapters/file-validator"
		);
		const bigFile = makeFile("test.wav", "audio/wav", 50 * 1024 * 1024 + 1);

		const result = await fileValidator.validate(bigFile, constraints);

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe("file_too_large");
			expect(result.message).toContain("50 MB");
		}
	});

	it("accepts valid files under max size", async () => {
		const { fileValidator } = await import(
			"../../src/adapters/file-validator"
		);
		const file = makeFile("test.wav", "audio/wav", 1024);

		const result = await fileValidator.validate(file, constraints);

		expect(result.valid).toBe(true);
	});

	it("rejects unsupported format before checking size", async () => {
		const { fileValidator } = await import(
			"../../src/adapters/file-validator"
		);
		const file = makeFile("test.ogg", "audio/ogg", 100);

		const result = await fileValidator.validate(file, constraints);

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toBe("unsupported_format");
		}
	});
});
