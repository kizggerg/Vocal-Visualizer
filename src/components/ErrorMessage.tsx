import { forwardRef } from "react";
import styles from "./ErrorMessage.module.css";

interface ErrorMessageProps {
	heading: string;
	description: string;
	onReset: () => void;
}

export const ErrorMessage = forwardRef<HTMLDivElement, ErrorMessageProps>(
	function ErrorMessage({ heading, description, onReset }, ref) {
		return (
			<div
				className={styles.container}
				ref={ref}
				tabIndex={-1}
				role="alert"
				aria-live="assertive"
			>
				<svg
					className={styles.icon}
					viewBox="0 0 24 24"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						fillRule="evenodd"
						d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
						clipRule="evenodd"
					/>
				</svg>
				<h2 className={styles.heading}>{heading}</h2>
				<p className={styles.description}>{description}</p>
				<button type="button" className={styles.resetButton} onClick={onReset}>
					Upload Another File
				</button>
			</div>
		);
	},
);
