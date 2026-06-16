import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ElementSelector } from "./ElementSelector";
import { DEFAULTS, addElement } from "@/lib/simulatorParams";

const defaultProps = {
  elements: ["Ni", "Fe"],
  proportions: { Ni: 0.6, Fe: 0.4 },
  elementOptions: ["Ni", "Fe", "Cu", "Al"],
  onAdd: vi.fn(),
  onRemove: vi.fn(),
  onProportionChange: vi.fn(),
};

describe("ElementSelector", () => {
  it("renders each selected element as a tag", () => {
    render(<ElementSelector {...defaultProps} />);
    expect(screen.getByRole("button", { name: /remove Ni/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove Fe/i })).toBeInTheDocument();
  });

  it("calls onRemove with element name when × is clicked", async () => {
    const onRemove = vi.fn();
    render(<ElementSelector {...defaultProps} onRemove={onRemove} />);
    const buttons = screen.getAllByRole("button", { name: /remove/i });
    await userEvent.click(buttons[0]);
    expect(onRemove).toHaveBeenCalledWith("Ni");
  });

  it("renders a proportion input for each selected element", () => {
    render(<ElementSelector {...defaultProps} />);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(2);
  });

  it("renders a single proportion input when only one element is selected", () => {
    render(<ElementSelector {...defaultProps} elements={["Ni"]} proportions={{ Ni: 1 }} />);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(1);
  });

  it("calls onAdd when an element is picked from the periodic table", async () => {
    const onAdd = vi.fn();
    render(<ElementSelector {...defaultProps} onAdd={onAdd} />);
    await userEvent.click(screen.getByRole("button", { name: /open periodic table/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Cu - Copper$/i }));
    expect(onAdd).toHaveBeenCalledWith("Cu");
  });

  it("calls onAdd when an element is typed into the combobox", async () => {
    const onAdd = vi.fn();
    render(<ElementSelector {...defaultProps} onAdd={onAdd} />);
    await userEvent.type(screen.getByRole("combobox"), "cu");
    await userEvent.click(screen.getByRole("option", { name: /Cu - Copper/i }));
    expect(onAdd).toHaveBeenCalledWith("Cu");
  });

  it("shows a valid status indicator when proportions sum to 1", () => {
    render(<ElementSelector {...defaultProps} proportions={{ Ni: 0.6, Fe: 0.4 }} />);
    expect(screen.getByLabelText(/composition is valid/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/composition must sum to 1/i)).not.toBeInTheDocument();
  });

  it("shows an invalid status indicator when proportions do not sum to 1", () => {
    render(<ElementSelector {...defaultProps} proportions={{ Ni: 0.6, Fe: 0.2 }} />);
    expect(screen.getByLabelText(/composition must sum to 1/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/composition is valid/i)).not.toBeInTheDocument();
  });

  it("flags a three-element composition that does not sum to 1 as invalid", () => {
    render(
      <ElementSelector
        {...defaultProps}
        elements={["Fe", "Cu", "Ni"]}
        proportions={{ Fe: 0.5, Cu: 0.3, Ni: 0.3 }}
      />,
    );
    expect(screen.getByLabelText(/composition must sum to 1/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/composition is valid/i)).not.toBeInTheDocument();
  });

  it("marks a three-element composition that sums to 1 as valid", () => {
    render(
      <ElementSelector
        {...defaultProps}
        elements={["Fe", "Cu", "Ni"]}
        proportions={{ Fe: 0.5, Cu: 0.3, Ni: 0.2 }}
      />,
    );
    expect(screen.getByLabelText(/composition is valid/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/composition must sum to 1/i)).not.toBeInTheDocument();
  });

  it("keeps displayed proportion inputs consistent with the Σ total (regression)", () => {
    // Build the three-element composition through the params API — the path
    // that previously produced 1/3 values rendering as 0.33 each (visually
    // 0.99) while Σ computed 1.00 from full-precision stored values.
    let p = addElement(DEFAULTS, "Fe");
    p = addElement(p, "Cu");
    p = addElement(p, "Ni");
    render(<ElementSelector {...defaultProps} elements={p.elements} proportions={p.proportions} />);

    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    const shownSum = inputs.reduce((acc, input) => acc + parseFloat(input.value), 0);
    const sigma = parseFloat(screen.getByLabelText(/Proportion sum/).textContent ?? "");
    expect(shownSum.toFixed(2)).toBe(sigma.toFixed(2));
  });
});
