import { describe, it, expect } from "vitest";
import {
  DEFAULTS,
  addElement,
  removeElement,
  setProportion,
  setMode,
  setRange,
  setPlasmaPreset,
  isCompositionValid,
} from "./simulatorParams";
import type { SimulatorParams } from "./simulatorParams";

describe("addElement", () => {
  it("distributes proportions equally when adding to existing elements", () => {
    const p = { ...DEFAULTS, elements: ["Ni"], proportions: { Ni: 1.0 } };
    const next = addElement(p, "Fe");
    expect(next.elements).toEqual(["Ni", "Fe"]);
    expect(next.proportions["Ni"]).toBeCloseTo(0.5);
    expect(next.proportions["Fe"]).toBeCloseTo(0.5);
  });

  it("sets the first element to 1.0", () => {
    const next = addElement(DEFAULTS, "Ni");
    expect(next.elements).toEqual(["Ni"]);
    expect(next.proportions["Ni"]).toBeCloseTo(1.0);
  });

  it("adds a third element at 0.0 and leaves existing values untouched", () => {
    const p = { ...DEFAULTS, elements: ["Fe", "Cu"], proportions: { Fe: 0.7, Cu: 0.3 } };
    const next = addElement(p, "Ni");
    expect(next.elements).toEqual(["Fe", "Cu", "Ni"]);
    expect(next.proportions["Fe"]).toBeCloseTo(0.7);
    expect(next.proportions["Cu"]).toBeCloseTo(0.3);
    expect(next.proportions["Ni"]).toBeCloseTo(0.0);
  });

  it("is a no-op when element already present", () => {
    const p = { ...DEFAULTS, elements: ["Ni"], proportions: { Ni: 1.0 } };
    expect(addElement(p, "Ni")).toBe(p);
  });
});

describe("removeElement", () => {
  it("preserves remaining values when two or more elements remain", () => {
    const p = {
      ...DEFAULTS,
      elements: ["Ni", "Fe", "Cu"],
      proportions: { Ni: 0.5, Fe: 0.3, Cu: 0.2 },
    };
    const next = removeElement(p, "Fe");
    expect(next.elements).toEqual(["Ni", "Cu"]);
    expect(next.proportions["Ni"]).toBeCloseTo(0.5);
    expect(next.proportions["Cu"]).toBeCloseTo(0.2);
    expect(next.proportions["Fe"]).toBeUndefined();
  });

  it("sets the survivor to 1.0 when reduced to a single element", () => {
    const p = { ...DEFAULTS, elements: ["Ni", "Fe"], proportions: { Ni: 0.3, Fe: 0.7 } };
    const next = removeElement(p, "Fe");
    expect(next.elements).toEqual(["Ni"]);
    expect(next.proportions["Ni"]).toBeCloseTo(1.0);
    expect(next.proportions["Fe"]).toBeUndefined();
  });

  it("produces empty proportions when removing the last element", () => {
    const p = { ...DEFAULTS, elements: ["Ni"], proportions: { Ni: 1.0 } };
    const next = removeElement(p, "Ni");
    expect(next.elements).toEqual([]);
    expect(next.proportions).toEqual({});
  });
});

describe("setProportion", () => {
  it("mirrors to the other element when exactly two are present", () => {
    const p = { ...DEFAULTS, elements: ["Ni", "Fe"], proportions: { Ni: 0.5, Fe: 0.5 } };
    const next = setProportion(p, "Ni", 0.8);
    expect(next.proportions["Ni"]).toBeCloseTo(0.8);
    expect(next.proportions["Fe"]).toBeCloseTo(0.2);
  });

  it("sets only the edited element when three or more are present", () => {
    const p = {
      ...DEFAULTS,
      elements: ["Fe", "Cu", "Ni"],
      proportions: { Fe: 0.5, Cu: 0.3, Ni: 0.2 },
    };
    const next = setProportion(p, "Cu", 0.6);
    expect(next.proportions["Cu"]).toBeCloseTo(0.6);
    expect(next.proportions["Fe"]).toBeCloseTo(0.5);
    expect(next.proportions["Ni"]).toBeCloseTo(0.2);
  });

  it("sets the lone element clamped when only one is present", () => {
    const p = { ...DEFAULTS, elements: ["Ni"], proportions: { Ni: 1.0 } };
    expect(setProportion(p, "Ni", 0.4).proportions["Ni"]).toBeCloseTo(0.4);
    expect(setProportion(p, "Ni", 1.5).proportions["Ni"]).toBeCloseTo(1.0);
    expect(setProportion(p, "Ni", -0.5).proportions["Ni"]).toBeCloseTo(0.0);
  });

  it("clamps value to 0–1", () => {
    const p = { ...DEFAULTS, elements: ["Ni", "Fe"], proportions: { Ni: 0.5, Fe: 0.5 } };
    expect(setProportion(p, "Ni", 1.5).proportions["Ni"]).toBeCloseTo(1.0);
    expect(setProportion(p, "Ni", -0.5).proportions["Ni"]).toBeCloseTo(0.0);
  });

  it("keeps a three-element composition stable across successive edits", () => {
    let p: SimulatorParams = {
      ...DEFAULTS,
      elements: ["Fe", "Cu", "Ni"],
      proportions: { Fe: 0, Cu: 0, Ni: 0 },
    };
    p = setProportion(p, "Fe", 0.5);
    p = setProportion(p, "Cu", 0.3);
    p = setProportion(p, "Ni", 0.2);
    expect(p.proportions["Fe"]).toBeCloseTo(0.5);
    expect(p.proportions["Cu"]).toBeCloseTo(0.3);
    expect(p.proportions["Ni"]).toBeCloseTo(0.2);
  });
});

describe("setMode", () => {
  it("removes temporal fields when switching to static", () => {
    const p = {
      ...DEFAULTS,
      mode: "dynamic" as const,
      integration_time_s: 10e-6,
      time_resolution_s: 20e-9,
    };
    const next = setMode(p, "static");
    expect(next.mode).toBe("static");
    expect(next.integration_time_s).toBeUndefined();
    expect(next.time_resolution_s).toBeUndefined();
  });

  it("adds default temporal fields when switching to dynamic", () => {
    const next = setMode(DEFAULTS, "dynamic");
    expect(next.mode).toBe("dynamic");
    expect(next.integration_time_s).toBeDefined();
    expect(next.time_resolution_s).toBeDefined();
  });
});

describe("setRange", () => {
  it("accepts valid min < max", () => {
    const next = setRange(DEFAULTS, 300, 600);
    expect(next.range_min_nm).toBe(300);
    expect(next.range_max_nm).toBe(600);
  });

  it("auto-adjusts when min >= max", () => {
    const next = setRange(DEFAULTS, 500, 500);
    expect(next.range_min_nm).toBeLessThan(next.range_max_nm);
  });

  it("clamps to 100–2000 nm bounds", () => {
    const next = setRange(DEFAULTS, 50, 9999);
    expect(next.range_min_nm).toBeGreaterThanOrEqual(100);
    expect(next.range_max_nm).toBeLessThanOrEqual(2000);
  });
});

describe("setPlasmaPreset", () => {
  it("clears custom plasma fields but keeps temporal fields when switching away from custom", () => {
    const p = {
      ...setPlasmaPreset(DEFAULTS, "custom"),
      temporal_beta_temp: 0.01,
    };
    const next = setPlasmaPreset(p, "uniform");
    expect(next.plasma_preset).toBe("uniform");
    expect(next.plasma_layers).toBeUndefined();
    expect(next.temporal_beta_temp).toBe(0.01);
  });

  it("populates default custom fields when switching to custom", () => {
    const next = setPlasmaPreset(DEFAULTS, "custom");
    expect(next.plasma_preset).toBe("custom");
    expect(next.plasma_layers).toBeDefined();
  });
});

describe("DEFAULTS", () => {
  it("produces static mode with an empty sample", () => {
    expect(DEFAULTS.mode).toBe("static");
    expect(DEFAULTS.elements).toEqual([]);
    expect(DEFAULTS.proportions).toEqual({});
  });
});

describe("isCompositionValid", () => {
  it("is false when no elements are selected", () => {
    expect(isCompositionValid([], {})).toBe(false);
  });

  it("is true when proportions sum to 1", () => {
    expect(isCompositionValid(["Fe", "Ni"], { Fe: 0.6, Ni: 0.4 })).toBe(true);
  });

  it("is false when proportions do not sum to 1", () => {
    expect(isCompositionValid(["Fe", "Ni"], { Fe: 0.6, Ni: 0.3 })).toBe(false);
  });

  it("tolerates rounding drift within ±0.005", () => {
    expect(isCompositionValid(["Fe", "Ni", "Cu"], { Fe: 0.33, Ni: 0.33, Cu: 0.34 })).toBe(true);
    expect(isCompositionValid(["Fe", "Ni"], { Fe: 0.5, Ni: 0.49 })).toBe(false);
  });
});
