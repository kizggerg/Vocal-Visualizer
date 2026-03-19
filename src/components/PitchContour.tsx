import {
	CategoryScale,
	Chart as ChartJS,
	LineElement,
	LinearScale,
	PointElement,
	Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { formatTime, midiToNoteName } from "../domain/pitch-utils";
import type { ChartData, PitchSummary } from "../domain/types";
import styles from "./PitchContour.module.css";

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Tooltip,
);

interface PitchContourProps {
	chartData: ChartData;
	summary: PitchSummary;
}

export function PitchContour({ chartData, summary }: PitchContourProps) {
	const voicedPercent =
		summary.totalPoints > 0
			? Math.round((summary.voicedPoints / summary.totalPoints) * 100)
			: 0;

	const summaryText = `Pitch range: ${summary.minNote} to ${summary.maxNote} | Duration: ${formatTime(summary.duration)} | Voiced: ${voicedPercent}%`;

	const data = {
		datasets: [
			{
				data: chartData.points.map((p) => ({
					x: p.time,
					y: p.pitch,
				})),
				borderColor: "#0066CC",
				backgroundColor: "#0066CC",
				pointRadius: 2,
				pointHoverRadius: 5,
				borderWidth: 2,
				tension: 0,
				spanGaps: false,
			},
		],
	};

	const options = {
		responsive: true,
		maintainAspectRatio: true,
		aspectRatio: 2,
		plugins: {
			legend: { display: false },
			tooltip: {
				enabled: true,
				mode: "nearest" as const,
				intersect: true,
				backgroundColor: "#1D1D1F",
				titleColor: "#FFFFFF",
				bodyColor: "#FFFFFF",
				borderWidth: 0,
				cornerRadius: 4,
				padding: 8,
				bodyFont: { size: 14 },
				callbacks: {
					title: () => "",
					label: (context: {
						parsed: { x: number | null; y: number | null };
					}) => {
						const note =
							context.parsed.y != null ? midiToNoteName(context.parsed.y) : "—";
						const time =
							context.parsed.x != null ? formatTime(context.parsed.x) : "—";
						return `Note: ${note} | Time: ${time}`;
					},
				},
			},
		},
		scales: {
			x: {
				type: "linear" as const,
				title: {
					display: true,
					text: chartData.xAxisLabel,
					color: "#6E6E73",
					font: { size: 14 },
				},
				ticks: {
					color: "#6E6E73",
					font: { size: 14 },
					callback: (value: string | number) => formatTime(Number(value)),
				},
				min: 0,
				max: chartData.duration,
				grid: { display: false },
			},
			y: {
				type: "linear" as const,
				title: {
					display: true,
					text: chartData.yAxisLabel,
					color: "#6E6E73",
					font: { size: 14 },
				},
				ticks: {
					color: "#6E6E73",
					font: { size: 14 },
					stepSize: 1,
					callback: (value: string | number) => midiToNoteName(Number(value)),
				},
				min: chartData.yRange.min,
				max: chartData.yRange.max,
				grid: {
					color: "#E5E5EA",
					lineWidth: 1,
				},
			},
		},
	};

	return (
		<div className={styles.container}>
			<div className={styles.chartWrapper}>
				<Line
					data={data}
					options={options}
					aria-label={`Pitch contour chart. ${summaryText}`}
					role="img"
				/>
			</div>
			<p className={styles.summary}>{summaryText}</p>
		</div>
	);
}
