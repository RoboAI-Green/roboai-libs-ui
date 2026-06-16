import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DynamicPanel, type ExposureResult } from "./DynamicPanel";

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
  length_vector: [1e-3, 1.1e-3, 1.2e-3],
  snapshot_matrix: [
    [0.1, 0.2],
    [0.3, 0.4],
    [0.5, 0.6],
  ],
  total_exposure: [0.9, 1.0],
  lines: [{ wl: 400.5, label: "Ni I", charge: 1 }],
};

const referenceTimeData: ExposureResult = {
  ...data,
  time_vector: [20e-9, 100e-9, 180e-9],
  te_vector: [0.8, 1.0, 0.9],
  ne_vector: [0.8e17, 1e17, 0.9e17],
  length_vector: [0.8e-3, 1e-3, 1.1e-3],
};

describe("DynamicPanel", () => {
  it("renders the slider, metrics, and all plots", () => {
    render(<DynamicPanel data={data} />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
    expect(screen.getAllByTestId("plot").length).toBe(3);
  });

  it("defaults the frame slider to the time point nearest 100 ns", () => {
    render(<DynamicPanel data={referenceTimeData} />);
    expect(screen.getByRole("slider")).toHaveValue("1");
    expect(screen.getAllByText("100.0 ns").length).toBeGreaterThan(0);
  });

  it("uses scientific notation for flux axes", () => {
    render(<DynamicPanel data={data} />);
    const plots = plotSpy.mock.calls.map(([props]) => props as { layout: Record<string, unknown> });
    const accumulatedAxis = plots[0].layout.yaxis as {
      tickformat: string;
      title: { text: string };
    };
    const snapshotAxis = plots[1].layout.yaxis as { tickformat: string; title: { text: string } };
    const neAxis = plots[2].layout.yaxis as { tickformat: string };

    expect(accumulatedAxis.title.text).toBe("Time-integrated intensity (a.u.·s)");
    expect(accumulatedAxis.tickformat).toBe(".1e");
    expect(snapshotAxis.title.text).toBe("Time-bin integrated intensity (a.u.·s)");
    expect(snapshotAxis.tickformat).toBe(".1e");
    expect(neAxis.tickformat).toBe(".1e");
  });

  it("shows a current-frame marker for plasma length", () => {
    render(<DynamicPanel data={data} />);
    const plots = plotSpy.mock.calls.map(
      ([props]) => props as { data: Array<Record<string, unknown>> },
    );
    const evolutionTraces = plots[2].data;

    expect(evolutionTraces).toContainEqual(
      expect.objectContaining({
        name: "length (mm)",
        mode: "lines",
        yaxis: "y2",
      }),
    );
    expect(evolutionTraces).toContainEqual(
      expect.objectContaining({
        mode: "markers",
        y: [data.length_vector![2] * 1000],
        yaxis: "y2",
        showlegend: false,
      }),
    );
  });

  it("shows the HDF5 download button and calls the handler", () => {
    const onDownloadHdf5 = vi.fn();
    render(<DynamicPanel data={data} onDownloadHdf5={onDownloadHdf5} />);
    fireEvent.click(screen.getByRole("button", { name: /HDF5/i }));
    expect(onDownloadHdf5).toHaveBeenCalledTimes(1);
  });

  it("omits the HDF5 button when no handler is given", () => {
    render(<DynamicPanel data={data} />);
    expect(screen.queryByRole("button", { name: /HDF5/i })).not.toBeInTheDocument();
  });
});
