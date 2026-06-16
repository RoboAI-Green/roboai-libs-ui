import { describe, expect, it } from "vitest";
import { DEFAULTS } from "./simulatorParams";
import {
  MAX_INTERACTIVE_TIME_STEPS,
  MAX_EXPOSURE_WAVELENGTH_POINTS,
  evaluateRunGuard,
  timeStepCount,
  wavelengthPointCount,
} from "./runGuards";

describe("run guards", () => {
  it("keeps the default wavelength grid within the interactive dynamic limit", () => {
    const params = {
      ...DEFAULTS,
      mode: "dynamic" as const,
      elements: ["Ni"],
      proportions: { Ni: 1 },
    };
    expect(wavelengthPointCount(params)).toBeLessThanOrEqual(MAX_EXPOSURE_WAVELENGTH_POINTS);
    expect(evaluateRunGuard(params).canRun).toBe(true);
  });

  it("blocks dynamic and 3D runs with too many wavelength points", () => {
    for (const mode of ["dynamic", "3d"] as const) {
      const params = {
        ...DEFAULTS,
        mode,
        elements: ["Ni"],
        proportions: { Ni: 1 },
        resolution_nm: 0.05,
      };
      const guard = evaluateRunGuard(params);
      expect(wavelengthPointCount(params)).toBeGreaterThan(MAX_EXPOSURE_WAVELENGTH_POINTS);
      expect(guard.canRun).toBe(false);
      const message = guard.blockers.join(" ");
      expect(message).toContain("wavelength points");
      // Names the active mode by its UI label — not both, not the internal id.
      expect(message).toContain(mode === "3d" ? "3D surface" : "Time slider");
      expect(message).not.toContain("Time slider and 3D");
    }
  });

  it("allows static runs with fine wavelength grids", () => {
    const params = {
      ...DEFAULTS,
      mode: "static" as const,
      elements: ["Ni"],
      proportions: { Ni: 1 },
      resolution_nm: 0.05,
    };
    expect(wavelengthPointCount(params)).toBeGreaterThan(MAX_EXPOSURE_WAVELENGTH_POINTS);
    expect(evaluateRunGuard(params).canRun).toBe(true);
  });

  it("blocks oversized uploaded grids in exposure modes", () => {
    const params = {
      ...DEFAULTS,
      mode: "dynamic" as const,
      elements: ["Ni"],
      proportions: { Ni: 1 },
    };
    const grid = Array.from({ length: MAX_EXPOSURE_WAVELENGTH_POINTS + 1 }, (_, i) => i);
    const guard = evaluateRunGuard(params, grid);
    expect(guard.canRun).toBe(false);
    expect(guard.wavelengthPoints).toBe(MAX_EXPOSURE_WAVELENGTH_POINTS + 1);
  });

  it("blocks exposure runs with too many time steps", () => {
    const params = {
      ...DEFAULTS,
      mode: "dynamic" as const,
      elements: ["Ni"],
      proportions: { Ni: 1 },
      integration_time_s: 10e-6,
      time_resolution_s: 10e-9,
    };
    const guard = evaluateRunGuard(params);
    expect(timeStepCount(params)).toBeGreaterThan(MAX_INTERACTIVE_TIME_STEPS);
    expect(guard.canRun).toBe(false);
    expect(guard.blockers.join(" ")).toContain("time steps");
    expect(guard.blockers.join(" ")).toContain("Time slider"); // names the active mode
  });
});
