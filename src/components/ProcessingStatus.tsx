import styles from "./ProcessingStatus.module.css";

interface ProcessingStatusProps {
	fileName: string;
}

export function ProcessingStatus({ fileName }: ProcessingStatusProps) {
	return (
		<div className={styles.container}>
			<div className={styles.spinner} aria-hidden="true" />
			<p className={styles.status} aria-live="polite">
				Analyzing your recording...
			</p>
			<p className={styles.fileName}>{fileName}</p>
		</div>
	);
}
