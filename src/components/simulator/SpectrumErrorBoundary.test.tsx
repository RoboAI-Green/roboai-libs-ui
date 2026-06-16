import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpectrumErrorBoundary } from "./SpectrumErrorBoundary";

function Boom(): never {
  throw new Error("compute exploded");
}

describe("SpectrumErrorBoundary", () => {
  it("shows the error message and a retry control when a child throws", () => {
    render(
      <SpectrumErrorBoundary onReset={vi.fn()}>
        <Boom />
      </SpectrumErrorBoundary>,
    );
    expect(screen.getByText(/compute exploded/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("calls onReset when retry is clicked", async () => {
    const onReset = vi.fn();
    render(
      <SpectrumErrorBoundary onReset={onReset}>
        <Boom />
      </SpectrumErrorBoundary>,
    );
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("shows a neutral no-data state (not a retry) for an empty-line result", () => {
    function NoLines(): never {
      throw new Error("torch.cat(): expected a non-empty list of Tensors");
    }
    render(
      <SpectrumErrorBoundary onReset={vi.fn()}>
        <NoLines />
      </SpectrumErrorBoundary>,
    );
    expect(screen.getByRole("heading", { name: /no spectral lines/i })).toBeInTheDocument();
    expect(screen.queryByText(/computation failed/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("renders children when there is no error", () => {
    render(
      <SpectrumErrorBoundary onReset={vi.fn()}>
        <div data-testid="ok" />
      </SpectrumErrorBoundary>,
    );
    expect(screen.getByTestId("ok")).toBeInTheDocument();
  });

  it("clears a caught error and re-renders children when resetKeys change", () => {
    function NoLines(): never {
      throw new Error("torch.cat(): expected a non-empty list of Tensors");
    }
    const onReset = vi.fn();
    const { rerender } = render(
      <SpectrumErrorBoundary onReset={onReset} resetKeys={[1]}>
        <NoLines />
      </SpectrumErrorBoundary>,
    );
    expect(screen.getByRole("heading", { name: /no spectral lines/i })).toBeInTheDocument();

    // A new run committed (resetKeys changed) -> the boundary recovers without Reset.
    rerender(
      <SpectrumErrorBoundary onReset={onReset} resetKeys={[2]}>
        <div data-testid="ok" />
      </SpectrumErrorBoundary>,
    );
    expect(screen.getByTestId("ok")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /no spectral lines/i })).not.toBeInTheDocument();
    expect(onReset).toHaveBeenCalled();
  });
});
