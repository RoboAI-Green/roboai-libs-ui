import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InfoButton } from "./info-button";

describe("InfoButton", () => {
  it("renders accessible tooltip content for parameter help", () => {
    render(<InfoButton info="Electron density at the reference time." />);

    const button = screen.getByRole("button", { name: "More information" });
    const tooltip = screen.getByRole("tooltip");

    expect(button).toHaveAttribute("aria-describedby", tooltip.id);
    expect(tooltip).toHaveTextContent("Electron density at the reference time.");
  });

  it("does not render an empty info icon when no help text is provided", () => {
    render(<InfoButton />);

    expect(screen.queryByRole("button", { name: "More information" })).not.toBeInTheDocument();
  });
});
