import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Surface3D } from "./Surface3D";
import type { ExposureResult } from "./DynamicPanel";

const plotSpy = vi.hoisted(() => vi.fn());

vi.mock("react-plotly.js", () => ({
  default: (props: unknown) => {
    plotSpy(props);
    return <div data-testid="plot" />;
  },
}));

const data: ExposureResult = {
  wls: [400, 401],
  time_vector: [1e-9, 2e-9, 3e-9],
  te_vector: [1.0, 1.1, 1.2],
  ne_vector: [1e17, 1.1e17, 1.2e17],
  snapshot_matrix: [
    [0.1, 0.2],
    [0.3, 0.4],
    [0.5, 0.6],
  ],
  total_exposure: [0.9, 1.0],
};

describe("Surface3D", () => {
  it("renders the surface and total-spectrum plots", () => {
    render(<Surface3D data={data} />);
    expect(screen.getAllByTestId("plot").length).toBe(2);
  });

  it("uses scientific notation for z and total-exposure axes", () => {
    render(<Surface3D data={data} />);
    const plots = plotSpy.mock.calls.map(([props]) => props as { layout: Record<string, unknown> });
    const scene = plots[0].layout.scene as {
      zaxis: { tickformat: string; title: { text: string } };
    };
    const totalAxis = plots[1].layout.yaxis as { tickformat: string; title: { text: string } };

    expect(scene.zaxis.title.text).toBe("Time-bin integrated intensity (a.u.·s)");
    expect(scene.zaxis.tickformat).toBe(".1e");
    expect(totalAxis.title.text).toBe("Time-integrated intensity (a.u.·s)");
    expect(totalAxis.tickformat).toBe(".1e");
  });
});
