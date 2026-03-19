import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorMessage } from "../../src/components/ErrorMessage";

describe("ErrorMessage", () => {
	it("displays heading and description", () => {
		render(
			<ErrorMessage
				heading="Unable to Read File"
				description="This file could not be read."
				onReset={vi.fn()}
			/>,
		);

		expect(screen.getByText("Unable to Read File")).toBeInTheDocument();
		expect(
			screen.getByText("This file could not be read."),
		).toBeInTheDocument();
	});

	it("renders Upload Another File button", () => {
		render(
			<ErrorMessage
				heading="Error"
				description="Something went wrong."
				onReset={vi.fn()}
			/>,
		);

		expect(screen.getByText("Upload Another File")).toBeInTheDocument();
	});

	it("calls onReset when button is clicked", () => {
		const onReset = vi.fn();
		render(
			<ErrorMessage
				heading="Error"
				description="Something went wrong."
				onReset={onReset}
			/>,
		);

		fireEvent.click(screen.getByText("Upload Another File"));
		expect(onReset).toHaveBeenCalledOnce();
	});

	it("has role alert for accessibility", () => {
		render(
			<ErrorMessage
				heading="Error"
				description="Something went wrong."
				onReset={vi.fn()}
			/>,
		);

		expect(screen.getByRole("alert")).toBeInTheDocument();
	});
});
