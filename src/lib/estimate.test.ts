import { describe, it, expect } from "vitest";
import { estimateComputeSeconds, formatEstimate } from "./estimate";
import { DEFAULTS } from "./simulatorParams";

describe("estimateComputeSeconds", () => {
  it("lands near the measured ~76 s for the calibrated Fe+Cu dynamic run", () => {
    const p = {
      ...DEFAULTS,
      mode: "dynamic" as const,
      elements: ["Fe", "Cu"],
      proportions: { Fe: 0.86, Cu: 0.14 },
      range_min_nm: 200,
      range_max_nm: 500,
      resolution_nm: 0.0661,
      integration_time_s: 1e-5,
      time_resolution_s: 2e-8,
    };
    expect(estimateComputeSeconds(p)).toBeGreaterThan(50);
    expect(estimateComputeSeconds(p)).toBeLessThan(110);
  });

  it("estimates static far below the equivalent time-resolved run (1 step vs many)", () => {
    const base = {
      ...DEFAULTS,
      elements: ["Fe"],
      range_min_nm: 200,
      range_max_nm: 500,
      resolution_nm: 0.05,
    };
    const stat = estimateComputeSeconds({ ...base, mode: "static" });
    const dyn = estimateComputeSeconds({
      ...base,
      mode: "dynamic",
      integration_time_s: 1e-5,
      time_resolution_s: 2e-8,
    });
    expect(stat).toBeLessThan(dyn);
  });

  it("grows with element count and wavelength resolution", () => {
    const one = estimateComputeSeconds({ ...DEFAULTS, elements: ["Fe"] });
    const two = estimateComputeSeconds({ ...DEFAULTS, elements: ["Fe", "Cu"] });
    expect(two).toBeGreaterThan(one);
    const coarse = estimateComputeSeconds({ ...DEFAULTS, elements: ["Fe"], resolution_nm: 0.1 });
    const fine = estimateComputeSeconds({ ...DEFAULTS, elements: ["Fe"], resolution_nm: 0.01 });
    expect(fine).toBeGreaterThan(coarse);
  });
});

describe("formatEstimate", () => {
  it("renders sub-second, seconds, and minutes", () => {
    expect(formatEstimate(0.3)).toBe("est. <1s");
    expect(formatEstimate(12)).toBe("est. 12s");
    expect(formatEstimate(76)).toBe("est. 76s");
    expect(formatEstimate(180)).toBe("est. ~3 min");
  });
});
