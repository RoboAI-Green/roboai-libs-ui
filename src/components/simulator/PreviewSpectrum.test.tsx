import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ExposureResult } from "@/components/charts/DynamicPanel";
import { PreviewSpectrum } from "./PreviewSpectrum";

const makePreview = (total_exposure: number[]) =>
  ({ wls: total_exposure.map((_, i) => 400 + i), total_exposure }) as ExposureResult;

/** The y of each vertex in an SVG `d` of the form "M x,y L x,y L x,y …". */
function vertexYs(d: string): number[] {
  return d
    .split(/[ML]\s*/)
    .filter(Boolean)
    .map((pt) => Number(pt.split(",")[1]));
}

describe("PreviewSpectrum", () => {
  it("labels the coarse preview as provisional", () => {
    render(<PreviewSpectrum preview={makePreview([1, 2, 3])} />);
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("draws the total-exposure spectrum: one vertex per sample, peak toward the top", () => {
    const { container } = render(<PreviewSpectrum preview={makePreview([0, 10, 0])} />);
    const ys = vertexYs(container.querySelector("path")?.getAttribute("d") ?? "");
    expect(ys).toHaveLength(3); // one vertex per total-exposure sample
    // smaller y = higher on screen: the peak sample sits above the two zero samples
    expect(ys[1]).toBeLessThan(ys[0]);
    expect(ys[1]).toBeLessThan(ys[2]);
    expect(ys[0]).toBeCloseTo(ys[2]); // equal-valued samples share a baseline
  });

  it("draws nothing for a missing/short total_exposure (degenerate preview)", () => {
    const { container } = render(<PreviewSpectrum preview={makePreview([])} />);
    expect(container.querySelector("path")?.getAttribute("d")).toBe("");
  });
});
