import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProcessingStatus } from "../../src/components/ProcessingStatus";

describe("ProcessingStatus", () => {
	it("displays analyzing message", () => {
		render(<ProcessingStatus fileName="test.wav" />);
		expect(
			screen.getByText("Analyzing your recording..."),
		).toBeInTheDocument();
	});

	it("displays the file name", () => {
		render(<ProcessingStatus fileName="my-vocal-take.wav" />);
		expect(screen.getByText("my-vocal-take.wav")).toBeInTheDocument();
	});

	it("has an aria-live region for screen readers", () => {
		render(<ProcessingStatus fileName="test.wav" />);
		const status = screen.getByText("Analyzing your recording...");
		expect(status).toHaveAttribute("aria-live", "polite");
	});
});
