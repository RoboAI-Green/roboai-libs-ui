import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ElementCombobox } from "./ElementCombobox";

const baseProps = {
  selected: ["Fe"],
  available: ["Fe", "Co", "Ni", "Cu", "Zn"],
  onAdd: vi.fn(),
  onOpenPicker: vi.fn(),
};

describe("ElementCombobox", () => {
  it("adds the clicked element, then clears and refocuses the input", async () => {
    const onAdd = vi.fn();
    render(<ElementCombobox {...baseProps} onAdd={onAdd} />);

    const input = screen.getByRole("combobox");
    await userEvent.type(input, "cu");
    await userEvent.click(screen.getByRole("option", { name: /Cu - Copper/i }));

    expect(onAdd).toHaveBeenCalledWith("Cu");
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });

  it("adds the active option on Enter", async () => {
    const onAdd = vi.fn();
    render(<ElementCombobox {...baseProps} onAdd={onAdd} />);

    await userEvent.type(screen.getByRole("combobox"), "cu{Enter}");
    expect(onAdd).toHaveBeenCalledWith("Cu");
  });

  it("moves the active option with ArrowDown before committing", async () => {
    const onAdd = vi.fn();
    render(<ElementCombobox {...baseProps} onAdd={onAdd} />);

    // Empty query lists addable elements alphabetically by symbol: Co, Cu, Ni, Zn.
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.keyboard("{ArrowDown}{Enter}"); // first move -> second option (Cu)
    expect(onAdd).toHaveBeenCalledWith("Cu");
  });

  it("matches by element name", async () => {
    render(<ElementCombobox {...baseProps} />);
    await userEvent.type(screen.getByRole("combobox"), "copper");
    expect(screen.getByRole("option", { name: /Cu - Copper/i })).toBeInTheDocument();
  });

  it("closes the list on Escape", async () => {
    render(<ElementCombobox {...baseProps} />);
    const input = screen.getByRole("combobox");
    await userEvent.type(input, "cu");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens the periodic-table picker from the table icon", async () => {
    const onOpenPicker = vi.fn();
    render(<ElementCombobox {...baseProps} onOpenPicker={onOpenPicker} />);
    await userEvent.click(screen.getByRole("button", { name: /open periodic table/i }));
    expect(onOpenPicker).toHaveBeenCalledOnce();
  });

  it("renders API-unsupported matches as disabled and ignores clicks on them", async () => {
    const onAdd = vi.fn();
    // Only Cu is available; Ca/Cd/etc. that match 'c' are unavailable.
    render(<ElementCombobox {...baseProps} available={["Cu"]} onAdd={onAdd} />);

    await userEvent.type(screen.getByRole("combobox"), "c");
    const calcium = screen.getByRole("option", { name: /Ca - Calcium/i });
    expect(calcium).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(calcium);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("keyboard navigation skips unavailable options", async () => {
    const onAdd = vi.fn();
    render(<ElementCombobox {...baseProps} available={["Cu"]} onAdd={onAdd} />);

    // 'c' lists many C-prefix elements alphabetically; only Cu is available.
    await userEvent.type(screen.getByRole("combobox"), "c");
    await userEvent.keyboard("{Enter}"); // active lands on the only addable option
    expect(onAdd).toHaveBeenCalledWith("Cu");
  });
});
