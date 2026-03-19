import type { AudioDecoder } from "../domain/ports";
import { DecodingError } from "../domain/types";
import type { AudioMetadata } from "../domain/types";

export const webAudioDecoder: AudioDecoder = {
	async decode(
		file: File,
	): Promise<{ metadata: AudioMetadata; samples: Float32Array }> {
		let arrayBuffer: ArrayBuffer;
		try {
			arrayBuffer = await file.arrayBuffer();
		} catch {
			throw new DecodingError(
				"This file could not be read. It may be corrupted or in an unsupported encoding. Please try a different file.",
			);
		}

		const audioContext = new AudioContext();
		let audioBuffer: AudioBuffer;
		try {
			audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
		} catch {
			throw new DecodingError(
				"This file could not be read. It may be corrupted or in an unsupported encoding. Please try a different file.",
			);
		} finally {
			await audioContext.close();
		}

		// Downmix to mono by averaging channels
		let monoSamples: Float32Array;
		if (audioBuffer.numberOfChannels === 1) {
			monoSamples = audioBuffer.getChannelData(0);
		} else {
			const length = audioBuffer.length;
			monoSamples = new Float32Array(length);
			const channelCount = audioBuffer.numberOfChannels;
			for (let ch = 0; ch < channelCount; ch++) {
				const channelData = audioBuffer.getChannelData(ch);
				for (let i = 0; i < length; i++) {
					monoSamples[i] += channelData[i] / channelCount;
				}
			}
		}

		const metadata: AudioMetadata = {
			sampleRate: audioBuffer.sampleRate,
			duration: audioBuffer.duration,
			channelCount: audioBuffer.numberOfChannels,
			sampleCount: monoSamples.length,
		};

		return { metadata, samples: monoSamples };
	},
};
