import { useCallback, useRef, useState } from "react";
import { chartjsVisualization } from "../adapters/chartjs-visualization";
import { fileValidator } from "../adapters/file-validator";
import { webAudioDecoder } from "../adapters/web-audio-decoder";
import { yinPitchAnalyzer } from "../adapters/yin-pitch-analyzer";
import {
	DecodingError,
	MVP_ANALYSIS_CONFIG,
	MVP_FILE_CONSTRAINTS,
} from "../domain/types";
import type { AnalysisResult, ChartData } from "../domain/types";
import styles from "./App.module.css";
import { ErrorMessage } from "./ErrorMessage";
import { PitchContour } from "./PitchContour";
import { ProcessingStatus } from "./ProcessingStatus";
import { UploadArea } from "./UploadArea";

type AppState =
	| { screen: "upload"; error: string | null }
	| { screen: "processing"; fileName: string }
	| { screen: "results"; result: AnalysisResult; chartData: ChartData }
	| {
			screen: "error";
			heading: string;
			description: string;
	  };

export function App() {
	const [state, setState] = useState<AppState>({
		screen: "upload",
		error: null,
	});
	const resultsRef = useRef<HTMLDivElement>(null);
	const errorRef = useRef<HTMLDivElement>(null);

	const handleFile = useCallback(async (file: File) => {
		// Validate format and size (no AudioContext needed)
		const validation = await fileValidator.validate(file, MVP_FILE_CONSTRAINTS);
		if (!validation.valid) {
			setState({ screen: "upload", error: validation.message });
			return;
		}

		const displayName =
			file.name.length > 200 ? `${file.name.slice(0, 200)}...` : file.name;
		setState({ screen: "processing", fileName: displayName });

		try {
			// Decode
			const { metadata, samples } = await webAudioDecoder.decode(file);

			// Duration checks (post-decode to avoid duplicate AudioContext)
			if (metadata.duration < MVP_FILE_CONSTRAINTS.minDurationSeconds) {
				setState({
					screen: "error",
					heading: "Recording Too Short",
					description:
						"This recording is too short to analyze. Please upload a recording that is at least 1 second long.",
				});
				requestAnimationFrame(() => errorRef.current?.focus());
				return;
			}
			if (metadata.duration > MVP_FILE_CONSTRAINTS.maxDurationSeconds) {
				setState({
					screen: "error",
					heading: "Recording Too Long",
					description:
						"This recording exceeds the 10-minute maximum. Please upload a shorter recording.",
				});
				requestAnimationFrame(() => errorRef.current?.focus());
				return;
			}

			// Analyze (run async to keep UI responsive)
			const contour = await new Promise<
				ReturnType<typeof yinPitchAnalyzer.analyze>
			>((resolve) => {
				requestAnimationFrame(() => {
					resolve(
						yinPitchAnalyzer.analyze(
							samples,
							metadata.sampleRate,
							MVP_ANALYSIS_CONFIG,
						),
					);
				});
			});

			// Check if any pitch was detected
			if (contour.summary.voicedPoints === 0) {
				setState({
					screen: "error",
					heading: "No Pitch Detected",
					description:
						"We could not detect any pitch in this recording. Try uploading a clearer vocal recording without background music.",
				});
				requestAnimationFrame(() => errorRef.current?.focus());
				return;
			}

			// Prepare chart data
			const chartData = chartjsVisualization.prepareChartData(contour);

			setState({
				screen: "results",
				result: { metadata, contour },
				chartData,
			});
			requestAnimationFrame(() => resultsRef.current?.focus());
		} catch (err) {
			if (err instanceof DecodingError) {
				setState({
					screen: "error",
					heading: "Unable to Read File",
					description: err.message,
				});
			} else {
				setState({
					screen: "error",
					heading: "Something Went Wrong",
					description:
						"An unexpected error occurred. Please try uploading a different file.",
				});
			}
			requestAnimationFrame(() => errorRef.current?.focus());
		}
	}, []);

	const handleReset = useCallback(() => {
		setState({ screen: "upload", error: null });
	}, []);

	return (
		<div className={styles.page}>
			<header className={styles.header}>
				<h1 className={styles.title}>Vocal Visualizer</h1>
				{state.screen === "upload" && (
					<p className={styles.subtitle}>
						Visualize your pitch. See your progress.
					</p>
				)}
			</header>

			<main className={styles.main}>
				{state.screen === "upload" && (
					<UploadArea onFile={handleFile} error={state.error} />
				)}

				{state.screen === "processing" && (
					<ProcessingStatus fileName={state.fileName} />
				)}

				{state.screen === "results" && (
					<div ref={resultsRef} tabIndex={-1}>
						<PitchContour
							chartData={state.chartData}
							summary={state.result.contour.summary}
						/>
						<div className={styles.resetContainer}>
							<button
								type="button"
								className={styles.primaryButton}
								onClick={handleReset}
							>
								Upload Another Recording
							</button>
						</div>
					</div>
				)}

				{state.screen === "error" && (
					<ErrorMessage
						ref={errorRef}
						heading={state.heading}
						description={state.description}
						onReset={handleReset}
					/>
				)}
			</main>
		</div>
	);
}
