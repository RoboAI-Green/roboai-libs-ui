import { describe, it, expect } from "vitest";
import { computeCumulative, formatNs, formatSci } from "./dynamicCalc";

describe("computeCumulative", () => {
  it("sums all rows up to and including frameIdx", () => {
    const matrix = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];
    expect(computeCumulative(matrix, 0)).toEqual([1, 2, 3]);
    expect(computeCumulative(matrix, 1)).toEqual([5, 7, 9]);
    expect(computeCumulative(matrix, 2)).toEqual([12, 15, 18]);
  });

  it("clamps frameIdx to valid range", () => {
    const matrix = [
      [1, 2],
      [3, 4],
    ];
    expect(computeCumulative(matrix, 5)).toEqual([4, 6]);
    expect(computeCumulative(matrix, -1)).toEqual([1, 2]);
  });
});

describe("formatNs", () => {
  it("converts seconds to nanoseconds with 1 decimal", () => {
    expect(formatNs(1e-9)).toBe("1.0");
    expect(formatNs(100e-9)).toBe("100.0");
  });
});

describe("formatSci", () => {
  it("formats number in scientific notation", () => {
    expect(formatSci(1e17)).toBe("1.00e+17");
    expect(formatSci(0)).toBe("0.00e+0");
  });
});
