import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NumberField } from "./number-field";

describe("NumberField", () => {
  it("does not commit while typing; commits the parsed value on blur", async () => {
    const onCommit = vi.fn();
    render(<NumberField value={500} onCommit={onCommit} aria-label="x" />);
    const input = screen.getByLabelText("x");
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, "300");
    expect(onCommit).not.toHaveBeenCalled(); // the bug was: committed every keystroke
    await userEvent.tab();
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(300);
  });

  it("commits on Enter", async () => {
    const onCommit = vi.fn();
    render(<NumberField value={500} onCommit={onCommit} aria-label="x" />);
    const input = screen.getByLabelText("x");
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, "320{Enter}");
    expect(onCommit).toHaveBeenCalledWith(320);
  });

  it("reverts to the committed value when left empty/invalid, without committing", async () => {
    const onCommit = vi.fn();
    render(<NumberField value={500} onCommit={onCommit} aria-label="x" />);
    const input = screen.getByLabelText("x");
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.tab();
    expect(onCommit).not.toHaveBeenCalled();
    expect(input).toHaveValue(500);
  });

  it("shows the committed value when not being edited", () => {
    render(<NumberField value={500} onCommit={vi.fn()} aria-label="x" />);
    expect(screen.getByLabelText("x")).toHaveValue(500);
  });

  it("applies the format function to the displayed value when not editing", () => {
    render(
      <NumberField value={1} format={(v) => v.toFixed(2)} onCommit={vi.fn()} aria-label="x" />,
    );
    expect((screen.getByLabelText("x") as HTMLInputElement).value).toBe("1.00");
  });
});
