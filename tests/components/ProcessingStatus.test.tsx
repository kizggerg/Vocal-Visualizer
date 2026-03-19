import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProcessingStatus } from "../../src/components/ProcessingStatus";

describe("ProcessingStatus", () => {
	it("displays analyzing message after mount", async () => {
		render(<ProcessingStatus fileName="test.wav" />);

		// Text is inserted via useEffect + requestAnimationFrame for aria-live
		await act(async () => {
			await new Promise((r) => requestAnimationFrame(r));
		});

		expect(
			screen.getByText("Analyzing your recording..."),
		).toBeInTheDocument();
	});

	it("displays the file name", () => {
		render(<ProcessingStatus fileName="my-vocal-take.wav" />);
		expect(screen.getByText("my-vocal-take.wav")).toBeInTheDocument();
	});

	it("has an aria-live output element", async () => {
		render(<ProcessingStatus fileName="test.wav" />);

		const status = screen.getByRole("status");
		expect(status).toHaveAttribute("aria-live", "polite");
		expect(status).toHaveAttribute("aria-atomic", "true");
		expect(status.tagName).toBe("OUTPUT");
	});
});
