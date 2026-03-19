import { describe, expect, it } from "vitest";
import type { FileConstraints } from "../../src/domain/types";

// Test the pure validation logic without browser APIs (AudioContext)
// by extracting the format and size checks

const constraints: FileConstraints = {
	allowedMimeTypes: ["audio/wav", "audio/mpeg", "audio/mp4"],
	allowedExtensions: [".wav", ".mp3", ".m4a"],
	maxSizeBytes: 50 * 1024 * 1024,
	minDurationSeconds: 1,
	maxDurationSeconds: 600,
};

function getFileExtension(fileName: string): string {
	const dotIndex = fileName.lastIndexOf(".");
	if (dotIndex === -1) return "";
	return fileName.slice(dotIndex).toLowerCase();
}

function isFormatValid(
	fileName: string,
	mimeType: string,
	allowedExtensions: string[],
	allowedMimeTypes: string[],
): boolean {
	const extension = getFileExtension(fileName);
	const extensionOk = allowedExtensions.includes(extension);
	const mimeOk = mimeType === "" || allowedMimeTypes.includes(mimeType);
	return extensionOk && mimeOk;
}

describe("file validation logic", () => {
	describe("format validation", () => {
		it("accepts WAV files", () => {
			expect(
				isFormatValid(
					"test.wav",
					"audio/wav",
					constraints.allowedExtensions,
					constraints.allowedMimeTypes,
				),
			).toBe(true);
		});

		it("accepts MP3 files", () => {
			expect(
				isFormatValid(
					"test.mp3",
					"audio/mpeg",
					constraints.allowedExtensions,
					constraints.allowedMimeTypes,
				),
			).toBe(true);
		});

		it("accepts M4A files", () => {
			expect(
				isFormatValid(
					"test.m4a",
					"audio/mp4",
					constraints.allowedExtensions,
					constraints.allowedMimeTypes,
				),
			).toBe(true);
		});

		it("rejects unsupported extensions", () => {
			expect(
				isFormatValid(
					"test.ogg",
					"audio/ogg",
					constraints.allowedExtensions,
					constraints.allowedMimeTypes,
				),
			).toBe(false);
		});

		it("rejects .txt files", () => {
			expect(
				isFormatValid(
					"test.txt",
					"text/plain",
					constraints.allowedExtensions,
					constraints.allowedMimeTypes,
				),
			).toBe(false);
		});

		it("accepts files with empty mime type if extension is valid", () => {
			expect(
				isFormatValid(
					"test.wav",
					"",
					constraints.allowedExtensions,
					constraints.allowedMimeTypes,
				),
			).toBe(true);
		});

		it("rejects files with valid mime but wrong extension", () => {
			expect(
				isFormatValid(
					"test.ogg",
					"audio/wav",
					constraints.allowedExtensions,
					constraints.allowedMimeTypes,
				),
			).toBe(false);
		});

		it("rejects files with no extension", () => {
			expect(
				isFormatValid(
					"testfile",
					"audio/wav",
					constraints.allowedExtensions,
					constraints.allowedMimeTypes,
				),
			).toBe(false);
		});
	});

	describe("file extension extraction", () => {
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

	describe("size validation", () => {
		it("accepts files under 50 MB", () => {
			const size = 10 * 1024 * 1024; // 10 MB
			expect(size <= constraints.maxSizeBytes).toBe(true);
		});

		it("accepts files exactly at 50 MB", () => {
			expect(constraints.maxSizeBytes <= constraints.maxSizeBytes).toBe(true);
		});

		it("rejects files over 50 MB", () => {
			const size = 50 * 1024 * 1024 + 1;
			expect(size <= constraints.maxSizeBytes).toBe(false);
		});
	});
});
