import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RunButton } from "./RunButton";

describe("RunButton", () => {
  it("shows ▶ Run when not pending", () => {
    render(<RunButton onRun={vi.fn()} onReset={vi.fn()} isPending={false} disabled={false} />);
    expect(screen.getByRole("button", { name: "▶ Run" })).toBeInTheDocument();
  });

  it("shows Calculating… when pending", () => {
    render(<RunButton onRun={vi.fn()} onReset={vi.fn()} isPending={true} disabled={false} />);
    expect(screen.getByRole("button", { name: "Calculating…" })).toBeInTheDocument();
  });

  it("is disabled when disabled prop is true", () => {
    render(<RunButton onRun={vi.fn()} onReset={vi.fn()} isPending={false} disabled={true} />);
    expect(screen.getByRole("button", { name: "▶ Run" })).toBeDisabled();
  });

  it("is disabled when pending", () => {
    render(<RunButton onRun={vi.fn()} onReset={vi.fn()} isPending={true} disabled={false} />);
    expect(screen.getByRole("button", { name: "Calculating…" })).toBeDisabled();
  });

  it("calls onRun when clicked and not disabled", async () => {
    const onRun = vi.fn();
    render(<RunButton onRun={onRun} onReset={vi.fn()} isPending={false} disabled={false} />);
    await userEvent.click(screen.getByRole("button", { name: "▶ Run" }));
    expect(onRun).toHaveBeenCalledOnce();
  });

  it("calls onReset when the reset button is clicked", async () => {
    const onReset = vi.fn();
    render(<RunButton onRun={vi.fn()} onReset={onReset} isPending={false} disabled={false} />);
    await userEvent.click(screen.getByRole("button", { name: /reset to defaults/i }));
    expect(onReset).toHaveBeenCalledOnce();
  });
});
