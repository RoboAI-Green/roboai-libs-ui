import { describe, it, expect } from "vitest";
import { simulatorSearchSchema } from "./searchSchema";
import { DEFAULTS } from "./simulatorParams";

describe("simulatorSearchSchema", () => {
  it("is the single source of defaults — DEFAULTS equals an empty parse", () => {
    expect(DEFAULTS).toEqual(simulatorSearchSchema.parse({}));
  });

  it("applies defaults when given empty input", () => {
    const result = simulatorSearchSchema.parse({});
    expect(result.mode).toBe("static");
    expect(result.elements).toEqual([]);
    expect(result.te_ev).toBe(1.0);
    expect(result.plasma_preset).toBe("uniform");
  });

  it("coerces numeric strings from URL", () => {
    const result = simulatorSearchSchema.parse({ te_ev: "2.5", ne_cm3: "1e17" });
    expect(result.te_ev).toBe(2.5);
    expect(result.ne_cm3).toBe(1e17);
  });

  it("rejects invalid mode", () => {
    expect(() => simulatorSearchSchema.parse({ mode: "bogus" })).toThrow();
  });
});
