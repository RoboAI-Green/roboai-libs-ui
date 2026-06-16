import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ExposureResult } from "@/components/charts/DynamicPanel";
import { StreamingState } from "./StreamingState";

const preview = { wls: [400, 401, 402], total_exposure: [1, 9, 3] } as ExposureResult;

describe("StreamingState", () => {
  it("shows the coarse preview (badged) when one is available", () => {
    render(<StreamingState progress={{ done: 1, total: 5 }} preview={preview} />);
    expect(screen.getByTestId("preview-spectrum")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
    // the placeholder animation is not shown alongside the real preview
    expect(screen.queryByText("Initializing")).not.toBeInTheDocument();
  });

  it("falls back to the Initializing placeholder when there is no preview", () => {
    render(<StreamingState progress={{ done: 0, total: null }} preview={null} />);
    expect(screen.getByText("Initializing")).toBeInTheDocument();
    expect(screen.queryByTestId("preview-spectrum")).not.toBeInTheDocument();
    expect(screen.queryByText("Preview")).not.toBeInTheDocument();
  });

  it("reports progress as a done/total counter", () => {
    const { container } = render(<StreamingState progress={{ done: 3, total: 8 }} />);
    expect(container.textContent).toMatch(/calculating\s*3\s*\/\s*8/);
  });

  it("shows 'calculating 1/?' before the slice total is known", () => {
    const { container } = render(<StreamingState progress={{ done: 0, total: null }} />);
    // Before the total lands we're on slice 1 with the total resolving — never 0/?.
    expect(container.querySelector(".tabular-nums")?.textContent).toBe("calculating 1/?");
  });

  it("renders a Cancel button that calls onCancel", () => {
    const onCancel = vi.fn();
    render(<StreamingState progress={{ done: 1, total: 3 }} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("omits the Cancel button when no onCancel is given", () => {
    render(<StreamingState progress={{ done: 1, total: 3 }} />);
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });
});
