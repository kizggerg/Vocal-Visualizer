import { useEffect, useState } from "react";
import styles from "./ProcessingStatus.module.css";

interface ProcessingStatusProps {
	fileName: string;
}

export function ProcessingStatus({ fileName }: ProcessingStatusProps) {
	const [announced, setAnnounced] = useState(false);

	useEffect(() => {
		// Delay text insertion so aria-live region triggers screen reader announcement
		const id = requestAnimationFrame(() => setAnnounced(true));
		return () => cancelAnimationFrame(id);
	}, []);

	return (
		<div className={styles.container}>
			<div className={styles.spinner} aria-hidden="true" />
			<output className={styles.status} aria-live="polite" aria-atomic="true">
				{announced ? "Analyzing your recording..." : ""}
			</output>
			<p className={styles.fileName}>{fileName}</p>
		</div>
	);
}
