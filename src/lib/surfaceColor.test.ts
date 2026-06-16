import { describe, it, expect } from "vitest";
import { buildSurfaceColor } from "./surfaceColor";

describe("buildSurfaceColor", () => {
  it("normalizes values to [0, 1] range with gamma correction", () => {
    const matrix = [
      [0, 100],
      [50, 100],
    ];
    const { surfaceColor } = buildSurfaceColor(matrix);
    expect(surfaceColor[1][1]).toBeCloseTo(1.0);
    expect(surfaceColor[0][0]).toBeCloseTo(0.0);
    expect(surfaceColor[1][0]).toBeGreaterThan(0);
    expect(surfaceColor[1][0]).toBeLessThan(1);
  });

  it("returns zero surface when all values are zero", () => {
    const { surfaceColor } = buildSurfaceColor([
      [0, 0],
      [0, 0],
    ]);
    expect(surfaceColor[0][0]).toBe(0);
    expect(surfaceColor[1][1]).toBe(0);
  });

  it("returns 5 tick values at 0, 0.25, 0.5, 0.75, 1", () => {
    const { tickvals } = buildSurfaceColor([[0, 100]]);
    expect(tickvals).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it("ticktext labels represent actual flux values via inverse gamma", () => {
    const matrix = [[0, 100]];
    const { ticktext } = buildSurfaceColor(matrix);
    expect(ticktext[0]).toBe("0");
    expect(ticktext[4]).not.toBe("0");
  });

  it("uses scientific notation for colorbar tick labels", () => {
    const { ticktext } = buildSurfaceColor([[0, 5e14]]);
    expect(ticktext[4]).toContain("e+");
    expect(ticktext[4]).not.toContain("T");
  });
});
