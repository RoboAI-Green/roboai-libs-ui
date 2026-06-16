import { describe, it, expect } from "vitest";
import { EMPTY_STATE_PRESETS } from "./emptyStatePresets";

describe("EMPTY_STATE_PRESETS", () => {
  it("exposes three presets with stable, unique ids", () => {
    expect(EMPTY_STATE_PRESETS).toHaveLength(3);
    expect(new Set(EMPTY_STATE_PRESETS.map((p) => p.id)).size).toBe(3);
  });

  it("each preset populates elements, wavelength range and plasma model", () => {
    for (const preset of EMPTY_STATE_PRESETS) {
      const params = preset.apply();
      expect(params.elements.length).toBeGreaterThan(0);
      expect(params.range_max_nm).toBeGreaterThan(params.range_min_nm);
      expect(params.plasma_preset).toBeTruthy();
    }
  });

  it("each preset gives a positive proportion to every selected element", () => {
    for (const preset of EMPTY_STATE_PRESETS) {
      const { elements, proportions } = preset.apply();
      for (const el of elements) {
        expect(proportions[el]).toBeGreaterThan(0);
      }
    }
  });

  it("preset proportions sum to 1", () => {
    for (const preset of EMPTY_STATE_PRESETS) {
      const { proportions } = preset.apply();
      const sum = Object.values(proportions).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 5);
    }
  });
});
