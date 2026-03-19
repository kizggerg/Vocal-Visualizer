import { type DragEvent, useCallback, useRef, useState } from "react";
import styles from "./UploadArea.module.css";

interface UploadAreaProps {
	onFile: (file: File) => void;
	error: string | null;
}

export function UploadArea({ onFile, error }: UploadAreaProps) {
	const [isDragOver, setIsDragOver] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleDragOver = useCallback((e: DragEvent) => {
		e.preventDefault();
		setIsDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
	}, []);

	const handleDrop = useCallback(
		(e: DragEvent) => {
			e.preventDefault();
			setIsDragOver(false);
			const file = e.dataTransfer.files[0];
			if (file) {
				onFile(file);
			}
		},
		[onFile],
	);

	const handleButtonClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) {
				onFile(file);
			}
			// Reset so the same file can be re-selected
			e.target.value = "";
		},
		[onFile],
	);

	return (
		<div className={styles.container}>
			<div
				className={`${styles.dropZone} ${isDragOver ? styles.dragOver : ""} ${error ? styles.hasError : ""}`}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				<svg
					className={styles.icon}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
					/>
				</svg>
				<p className={styles.instruction}>Drag and drop your audio file here</p>
				<p className={styles.divider}>or</p>
				<button
					type="button"
					className={styles.chooseButton}
					onClick={handleButtonClick}
				>
					Choose File
				</button>
				<input
					ref={fileInputRef}
					type="file"
					accept=".wav,.mp3,.m4a"
					className={styles.hiddenInput}
					onChange={handleFileChange}
					aria-label="Select audio file"
				/>
			</div>

			{error && (
				<div
					className={styles.errorContainer}
					role="alert"
					aria-live="assertive"
				>
					<svg
						className={styles.errorIcon}
						viewBox="0 0 16 16"
						fill="currentColor"
						aria-hidden="true"
					>
						<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14ZM8 4a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0v-3.5A.75.75 0 0 0 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
					</svg>
					<span>{error}</span>
				</div>
			)}

			<p className={styles.hint}>
				Supported formats: WAV, MP3, M4A
				<br />
				Max file size: 50 MB &nbsp;|&nbsp; Max duration: 10 minutes
			</p>
		</div>
	);
}
