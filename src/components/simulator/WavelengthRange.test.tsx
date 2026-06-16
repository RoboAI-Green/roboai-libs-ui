import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WavelengthRange } from "./WavelengthRange";

function setup(overrides = {}) {
  const onChange = vi.fn();
  render(
    <WavelengthRange
      min={200}
      max={500}
      resolution={0.05}
      disabled={false}
      onChange={onChange}
      onResolutionChange={vi.fn()}
      {...overrides}
    />,
  );
  return { onChange };
}

describe("WavelengthRange", () => {
  it("edits max without firing onChange per keystroke, committing once on blur", async () => {
    // Regression: typing into max used to commit+clamp every keystroke, so
    // editing 500 -> 300 jumped to the 2000 clamp ceiling.
    const { onChange } = setup();
    const maxInput = screen.getByLabelText("wavelength max");
    await userEvent.click(maxInput);
    await userEvent.clear(maxInput);
    await userEvent.type(maxInput, "300");
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(200, 300); // min preserved, max as typed
  });

  it("commits the typed min against the current max", async () => {
    const { onChange } = setup();
    const minInput = screen.getByLabelText("wavelength min");
    await userEvent.click(minInput);
    await userEvent.clear(minInput);
    await userEvent.type(minInput, "250");
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledWith(250, 500);
  });
});
