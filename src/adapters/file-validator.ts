import type { FileValidator } from "../domain/ports";
import type { FileConstraints, ValidationResult } from "../domain/types";

export function getFileExtension(fileName: string): string {
	const dotIndex = fileName.lastIndexOf(".");
	if (dotIndex === -1) return "";
	return fileName.slice(dotIndex).toLowerCase();
}

export function isFormatValid(
	file: File,
	constraints: FileConstraints,
): boolean {
	const extension = getFileExtension(file.name);
	const extensionOk = constraints.allowedExtensions.includes(extension);
	const mimeOk =
		file.type === "" || constraints.allowedMimeTypes.includes(file.type);
	return extensionOk && mimeOk;
}

/**
 * Validates format and size only. Duration is checked after decode in App.tsx
 * to avoid creating a duplicate AudioContext.
 */
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

		return { valid: true };
	},
};
