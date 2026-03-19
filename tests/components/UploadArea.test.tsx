import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UploadArea } from "../../src/components/UploadArea";

describe("UploadArea", () => {
	it("renders the drop zone with instructions", () => {
		render(<UploadArea onFile={vi.fn()} error={null} />);

		expect(
			screen.getByText("Drag and drop your audio file here"),
		).toBeInTheDocument();
		expect(screen.getByText("Choose File")).toBeInTheDocument();
		expect(screen.getByText(/Supported formats/)).toBeInTheDocument();
	});

	it("renders the Choose File button", () => {
		render(<UploadArea onFile={vi.fn()} error={null} />);

		const button = screen.getByText("Choose File");
		expect(button.tagName).toBe("BUTTON");
	});

	it("displays an error message when error prop is set", () => {
		render(
			<UploadArea
				onFile={vi.fn()}
				error="Unsupported file format. Please upload a WAV, MP3, or M4A file."
			/>,
		);

		expect(screen.getByText(/Unsupported file format/)).toBeInTheDocument();
		expect(screen.getByRole("alert")).toBeInTheDocument();
	});

	it("does not display error area when error is null", () => {
		render(<UploadArea onFile={vi.fn()} error={null} />);

		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("calls onFile when a file is selected via input", () => {
		const onFile = vi.fn();
		render(<UploadArea onFile={onFile} error={null} />);

		const input = screen.getByLabelText("Select audio file");
		const file = new File(["audio data"], "test.wav", { type: "audio/wav" });

		fireEvent.change(input, { target: { files: [file] } });

		expect(onFile).toHaveBeenCalledWith(file);
	});

	it("has accessible file upload region", () => {
		render(<UploadArea onFile={vi.fn()} error={null} />);

		expect(
			screen.getByLabelText("File upload area"),
		).toBeInTheDocument();
	});

	it("accepts only audio file types in the file input", () => {
		render(<UploadArea onFile={vi.fn()} error={null} />);

		const input = screen.getByLabelText("Select audio file") as HTMLInputElement;
		expect(input.accept).toBe(".wav,.mp3,.m4a");
	});
});
