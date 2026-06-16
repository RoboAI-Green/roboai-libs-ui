import { useEffect, useRef } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { spectrumQuery, infoQuery, jobStatsQuery } from "@/lib/queries";
import { downloadJobResultHdf5 } from "@/lib/api";
import { computeRequest } from "@/lib/computeRequest";
import { useExposureJob } from "@/hooks/useExposureJob";
import type { SimulatorParams } from "@/lib/simulatorParams";
import { StaticChart } from "@/components/charts/StaticChart";
import { DynamicPanel, type ExposureResult } from "@/components/charts/DynamicPanel";
import { Surface3D } from "@/components/charts/Surface3D";
import { StreamingState } from "@/components/simulator/StreamingState";
import { ProvenancePanel } from "@/components/simulator/ProvenancePanel";

/** Human-readable copy for each structured cancel reason (ADR-0016 D9). */
const REASON_COPY: Record<string, string> = {
  client_requested: "You cancelled the simulation.",
  policy_limit: "The simulation hit the server compute limit (policy).",
  admin: "An administrator cancelled the simulation.",
  disconnected: "The connection dropped and the simulation was auto-cancelled.",
  abandoned: "The simulation was abandoned (no live client) and stopped.",
};

interface Props {
  params: SimulatorParams;
  grid?: number[];
  /** Called when an exposure ends cancelled, to return to the empty state. */
  onCancelled?: () => void;
}

/**
 * Renders the computed spectrum for a committed configuration. Static spectra use
 * the synchronous Suspense query; exposures run as an async streaming Job
 * (ADR-0015) via useExposureJob and render once complete. The route's
 * Suspense/error boundary still wraps both — static suspends; exposure throws on
 * failure into the same boundary.
 */
export function SpectrumResult({ params, grid, onCancelled }: Props) {
  if (params.mode === "static") {
    return <StaticSpectrum params={params} grid={grid} />;
  }
  return (
    <ExposureSpectrum params={params} grid={grid} mode={params.mode} onCancelled={onCancelled} />
  );
}

function StaticSpectrum({ params, grid }: Props) {
  const { data } = useSuspenseQuery(spectrumQuery(params, grid));
  const { data: info } = useQuery(infoQuery());
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 flex flex-col">
        <StaticChart data={data as Parameters<typeof StaticChart>[0]["data"]} />
      </div>
      <ProvenancePanel
        info={info}
        fwhmNm={params.fwhm_nm}
        instrumentProfile={params.instrument_profile}
      />
    </div>
  );
}

function ExposureSpectrum({
  params,
  grid,
  mode,
  onCancelled,
}: Props & { mode: SimulatorParams["mode"] }) {
  const { payload } = computeRequest(params, grid);
  const { status, result, error, progress, preview, cancelReason, cancel, jobId } =
    useExposureJob(payload);
  const { data: info } = useQuery(infoQuery());
  // Live queue counts for the waiting view; polled only while streaming (#97).
  const { data: jobStats } = useQuery({ ...jobStatsQuery(), enabled: status === "streaming" });

  // On cancellation, toast the reason and hand back to the empty state (instead
  // of a dedicated terminal panel) so the user can adjust params and re-run.
  const handledCancel = useRef(false);
  useEffect(() => {
    if (status !== "cancelled" || handledCancel.current) return;
    handledCancel.current = true;
    const reasonCopy =
      (cancelReason && REASON_COPY[cancelReason]) ?? `Reason: ${cancelReason ?? "unknown"}.`;
    toast("Simulation cancelled", { description: reasonCopy });
    onCancelled?.();
  }, [status, cancelReason, onCancelled]);

  // Surface exposure failures through the same error boundary as static.
  if (error) throw error;

  // Cancelled: nothing to render here — the toast fired and we're returning to
  // the empty state as `committed` clears.
  if (status === "cancelled") return null;

  // While streaming: the LoadingState animation with a live slice counter (the
  // partial surface is final-only, shown in the full panel on completion).
  if (status !== "completed" || result === null) {
    return (
      <StreamingState progress={progress} onCancel={cancel} preview={preview} stats={jobStats} />
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 flex flex-col">
        {mode === "dynamic" ? (
          <DynamicPanel
            data={result as ExposureResult}
            onDownloadHdf5={jobId ? () => void downloadJobResultHdf5(jobId) : undefined}
          />
        ) : (
          <Surface3D data={result as ExposureResult} />
        )}
      </div>
      <ProvenancePanel
        info={info}
        fwhmNm={params.fwhm_nm}
        instrumentProfile={params.instrument_profile}
      />
    </div>
  );
}
