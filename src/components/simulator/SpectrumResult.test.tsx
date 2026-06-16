import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SpectrumResult } from "./SpectrumResult";
import { spectrumQuery } from "@/lib/queries";
import { DEFAULTS, type SimulatorParams } from "@/lib/simulatorParams";

vi.mock("@/components/charts/StaticChart", () => ({
  StaticChart: () => <div data-testid="static" />,
}));
vi.mock("@/components/charts/DynamicPanel", () => ({
  DynamicPanel: () => <div data-testid="dynamic" />,
}));
vi.mock("@/components/charts/Surface3D", () => ({
  Surface3D: () => <div data-testid="surface" />,
}));
vi.mock("@/components/simulator/StreamingState", () => ({
  StreamingState: () => <div data-testid="streaming" />,
}));
vi.mock("@/components/simulator/ProvenancePanel", () => ({
  ProvenancePanel: () => <div data-testid="provenance" />,
}));

const toastFn = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast: toastFn }));

// Exposure modes run as an async streaming Job; stub the hook as completed so the
// branch renders its panel synchronously. (The hook's own behaviour is tested in
// src/hooks/useExposureJob.test.ts.)
const completed = {
  status: "completed",
  result: { wls: [], total_exposure: [] },
  error: null,
  surface: null,
  progress: { done: 0, total: null },
  cancelReason: null,
  cancel: () => {},
};
const exposureState = vi.hoisted(() => ({
  current: {
    status: "completed",
    result: { wls: [], total_exposure: [] },
    error: null,
    surface: null,
    progress: { done: 0, total: null },
    cancelReason: null,
    cancel: () => {},
  },
}));
vi.mock("@/hooks/useExposureJob", () => ({
  useExposureJob: () => exposureState.current,
}));

function renderStatic(params: SimulatorParams) {
  const qc = new QueryClient();
  qc.setQueryData(spectrumQuery(params).queryKey, { wls: [], intensity: [], lines: [] });
  return render(
    <QueryClientProvider client={qc}>
      <SpectrumResult params={params} />
    </QueryClientProvider>,
  );
}

function renderExposure(params: SimulatorParams) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SpectrumResult params={params} />
    </QueryClientProvider>,
  );
}

describe("SpectrumResult", () => {
  it("renders the static chart for static mode", () => {
    renderStatic({ ...DEFAULTS, mode: "static" });
    expect(screen.getByTestId("static")).toBeInTheDocument();
  });

  it("renders the dynamic panel + provenance when the Job completes", () => {
    renderExposure({ ...DEFAULTS, mode: "dynamic" });
    expect(screen.getByTestId("dynamic")).toBeInTheDocument();
    expect(screen.getByTestId("provenance")).toBeInTheDocument();
  });

  it("renders the 3d surface for 3d mode when the Job completes", () => {
    renderExposure({ ...DEFAULTS, mode: "3d" });
    expect(screen.getByTestId("surface")).toBeInTheDocument();
  });

  it("shows the streaming state while an exposure Job is still streaming", () => {
    exposureState.current = {
      ...completed,
      status: "streaming",
      result: null,
      progress: { done: 1, total: 3 },
    } as never;
    renderExposure({ ...DEFAULTS, mode: "dynamic" });
    expect(screen.getByTestId("streaming")).toBeInTheDocument();
    expect(screen.queryByTestId("dynamic")).not.toBeInTheDocument();
    exposureState.current = { ...completed };
  });

  it("toasts and returns to the empty state when the Job is cancelled", () => {
    toastFn.mockClear();
    exposureState.current = {
      ...completed,
      status: "cancelled",
      result: null,
      cancelReason: "client_requested",
    } as never;
    const onCancelled = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SpectrumResult params={{ ...DEFAULTS, mode: "dynamic" }} onCancelled={onCancelled} />
      </QueryClientProvider>,
    );
    expect(onCancelled).toHaveBeenCalledTimes(1);
    expect(toastFn).toHaveBeenCalledWith("Simulation cancelled", expect.anything());
    expect(screen.queryByTestId("dynamic")).not.toBeInTheDocument();
    exposureState.current = { ...completed };
  });
});
