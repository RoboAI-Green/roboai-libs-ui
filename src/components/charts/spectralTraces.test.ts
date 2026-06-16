import { describe, it, expect } from "vitest";
import { lineTraces, CHARGE_COLOR } from "./spectralTraces";

describe("lineTraces", () => {
  it("groups lines sharing a label into one trace", () => {
    const traces = lineTraces(
      [
        { wl: 400, label: "O II", charge: 2 },
        { wl: 405, label: "O II", charge: 2 },
        { wl: 500, label: "N III", charge: 3 },
      ],
      10,
    );

    expect(traces).toHaveLength(2);
    const oII = traces.find((t) => t.name === "O II");
    expect(oII?.x).toEqual([400, 405]);
    expect(traces.find((t) => t.name === "N III")?.x).toEqual([500]);
  });

  it("colors a trace by its charge, falling back to gray for unknown charges", () => {
    const [known, unknown] = lineTraces(
      [
        { wl: 400, label: "O II", charge: 2 },
        { wl: 600, label: "Fe XII", charge: 12 },
      ],
      10,
    );

    expect(known.marker.color).toBe(CHARGE_COLOR[2]);
    expect(unknown.marker.color).toBe("gray");
  });

  it("pins every point's y to yTop", () => {
    const [trace] = lineTraces(
      [
        { wl: 400, label: "O II", charge: 2 },
        { wl: 405, label: "O II", charge: 2 },
      ],
      42,
    );

    expect(trace.y).toEqual([42, 42]);
  });
});
