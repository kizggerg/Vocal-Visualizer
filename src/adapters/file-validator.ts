import type { FileValidator } from "../domain/ports";
import type { FileConstraints, ValidationResult } from "../domain/types";

function getFileExtension(fileName: string): string {
	const dotIndex = fileName.lastIndexOf(".");
	if (dotIndex === -1) return "";
	return fileName.slice(dotIndex).toLowerCase();
}

function isFormatValid(file: File, constraints: FileConstraints): boolean {
	const extension = getFileExtension(file.name);
	const extensionOk = constraints.allowedExtensions.includes(extension);
	const mimeOk =
		file.type === "" || constraints.allowedMimeTypes.includes(file.type);
	return extensionOk && mimeOk;
}

async function getAudioDuration(file: File): Promise<number> {
	const arrayBuffer = await file.arrayBuffer();
	const audioContext = new AudioContext();
	try {
		const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
		return audioBuffer.duration;
	} finally {
		await audioContext.close();
	}
}

export const fileValidator: FileValidator = {
	async validate(
		file: File,
		constraints: FileConstraints,
	): Promise<ValidationResult> {
		if (!isFormatValid(file, constraints)) {
			return {
				valid: false,
				reason: "unsupported_format",
				message:
					"Unsupported file format. Please upload a WAV, MP3, or M4A file.",
			};
		}

		if (file.size > constraints.maxSizeBytes) {
			return {
				valid: false,
				reason: "file_too_large",
				message: "This file is too large. The maximum file size is 50 MB.",
			};
		}

		const duration = await getAudioDuration(file);

		if (duration < constraints.minDurationSeconds) {
			return {
				valid: false,
				reason: "duration_too_short",
				message:
					"This recording is too short to analyze. Please upload a recording that is at least 1 second long.",
			};
		}

		if (duration > constraints.maxDurationSeconds) {
			return {
				valid: false,
				reason: "duration_too_long",
				message:
					"This recording exceeds the 10-minute maximum. Please upload a shorter recording.",
			};
		}

		return { valid: true };
	},
};
