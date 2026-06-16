import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { LoadingState } from "./LoadingState";

describe("LoadingState", () => {
  it("shows the right-hand estimate slot when one is given (exposure slice counter)", () => {
    const { container } = render(<LoadingState estimate="progress 2/5" />);
    expect(container.querySelector(".tabular-nums")?.textContent).toBe("progress 2/5");
  });

  it("omits the estimate slot when none is given (near-instant static path)", () => {
    // Static suspends into this fallback with no estimate — it's near-instant, so
    // the right-hand "est." hint must not render at all (#80).
    const { container } = render(<LoadingState />);
    expect(container.querySelector(".tabular-nums")).toBeNull();
  });
});
