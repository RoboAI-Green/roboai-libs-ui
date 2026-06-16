import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StaticChart } from "./StaticChart";

const plotSpy = vi.hoisted(() => vi.fn());

vi.mock("react-plotly.js", () => ({
  default: (props: unknown) => {
    plotSpy(props);
    return <div data-testid="plot" />;
  },
}));

describe("StaticChart", () => {
  beforeEach(() => {
    plotSpy.mockClear();
  });

  it("uses scientific notation for the intensity axis", () => {
    render(<StaticChart data={{ wls: [200, 201], intensity: [1e17, 2e17] }} />);
    expect(screen.getByTestId("plot")).toBeInTheDocument();

    const props = plotSpy.mock.calls[0][0] as { layout: Record<string, unknown> };
    const yaxis = props.layout.yaxis as { tickformat: string; title: { text: string } };
    expect(yaxis.title.text).toBe("Simulated intensity (a.u.)");
    expect(yaxis.tickformat).toBe(".1e");
  });

  it("zooms to the overlap range when a comparison spectrum is pasted", async () => {
    render(<StaticChart data={{ wls: [200, 201, 202, 203], intensity: [0, 10, 5, 0] }} />);

    expect(screen.getByText("Compare spectrum")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Paste$/i }));
    expect(
      screen.getByText(/Accepted formats include CSV, TSV, ASCII tables/i),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/wavelength and intensity data/i), {
      target: { value: "wavelength_nm,intensity\n201,100\n202,50\n" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await screen.findByText("Pasted");
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
    await waitFor(() => {
      const call = plotSpy.mock.calls.findLast((args) => {
        const props = args[0] as { layout: Record<string, unknown> };
        const xaxis = props.layout.xaxis as { range?: [number, number] };
        return Boolean(xaxis.range);
      });
      expect(call).toBeTruthy();
      const props = call?.[0] as { layout: Record<string, unknown> };
      const xaxis = props.layout.xaxis as { range: [number, number] };
      expect(xaxis.range[0]).toBeCloseTo(200.98);
      expect(xaxis.range[1]).toBeCloseTo(202.02);
    });
  });

  it("allows exact comparison scale entry", async () => {
    render(<StaticChart data={{ wls: [200, 201, 202, 203], intensity: [0, 10, 5, 0] }} />);

    fireEvent.click(screen.getByRole("button", { name: /^Paste$/i }));
    fireEvent.change(screen.getByPlaceholderText(/wavelength and intensity data/i), {
      target: { value: "wavelength_nm,intensity\n201,100\n202,50\n" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await screen.findByText("Pasted");

    const scaleInput = screen.getByLabelText("Comparison scale");
    fireEvent.change(scaleInput, { target: { value: "0.5" } });
    fireEvent.blur(scaleInput);

    await waitFor(() => {
      const call = plotSpy.mock.calls.findLast((args) => {
        const props = args[0] as { data: { name?: string; y?: number[] }[] };
        return props.data.some((trace) => trace.name === "Compare: Pasted");
      });
      expect(call).toBeTruthy();
      const props = call?.[0] as { data: { name?: string; y?: number[] }[] };
      const compareTrace = props.data.find((trace) => trace.name === "Compare: Pasted");
      expect(compareTrace?.y).toEqual([50, 25]);
    });
  });

  it("nudges comparison scale with arrow controls", async () => {
    render(<StaticChart data={{ wls: [200, 201, 202, 203], intensity: [0, 10, 5, 0] }} />);

    fireEvent.click(screen.getByRole("button", { name: /^Paste$/i }));
    fireEvent.change(screen.getByPlaceholderText(/wavelength and intensity data/i), {
      target: { value: "wavelength_nm,intensity\n201,100\n202,50\n" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await screen.findByText("Pasted");

    const scaleInput = screen.getByLabelText("Comparison scale");
    fireEvent.change(scaleInput, { target: { value: "0.5" } });
    fireEvent.blur(scaleInput);
    fireEvent.click(screen.getByRole("button", { name: "Increase comparison scale" }));

    await waitFor(() => {
      const call = plotSpy.mock.calls.findLast((args) => {
        const props = args[0] as { data: { name?: string; y?: number[] }[] };
        return props.data.some((trace) => trace.name === "Compare: Pasted");
      });
      expect(call).toBeTruthy();
      const props = call?.[0] as { data: { name?: string; y?: number[] }[] };
      const compareTrace = props.data.find((trace) => trace.name === "Compare: Pasted");
      expect(compareTrace?.y?.[0]).toBeCloseTo(55);
      expect(compareTrace?.y?.[1]).toBeCloseTo(27.5);
    });
  });

  it("recomputes comparison scale when the simulated spectrum changes", async () => {
    const { rerender } = render(
      <StaticChart data={{ wls: [200, 201, 202, 203], intensity: [0, 10, 5, 0] }} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Paste$/i }));
    fireEvent.change(screen.getByPlaceholderText(/wavelength and intensity data/i), {
      target: { value: "wavelength_nm,intensity\n201,100\n202,50\n" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await screen.findByText("Pasted");

    const scaleInput = screen.getByLabelText("Comparison scale");
    fireEvent.change(scaleInput, { target: { value: "0.5" } });
    fireEvent.blur(scaleInput);

    rerender(<StaticChart data={{ wls: [200, 201, 202, 203], intensity: [0, 20, 10, 0] }} />);

    await waitFor(() => {
      const call = plotSpy.mock.calls.findLast((args) => {
        const props = args[0] as { data: { name?: string; y?: number[] }[] };
        return props.data.some((trace) => trace.name === "Compare: Pasted");
      });
      expect(call).toBeTruthy();
      const props = call?.[0] as { data: { name?: string; y?: number[] }[] };
      const compareTrace = props.data.find((trace) => trace.name === "Compare: Pasted");
      expect(compareTrace?.y?.[0]).toBeCloseTo(20);
      expect(compareTrace?.y?.[1]).toBeCloseTo(10);
    });
  });
});
